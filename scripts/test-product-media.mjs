import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createAdminProductMediaUploadUrl,
  getProductMediaFolder,
  parseStorageObjectUrl,
  removeDeletedProductMedia,
  updateAdminProductMedia
} from "../app/lib/maris-database/product-media.js";
import {
  VIDEO_POSITION_AFTER_COVER,
  VIDEO_POSITION_FIRST,
  buildProductMediaSlides,
  normalizeVideoPosition
} from "../app/lib/product-media.js";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const gallery = [
  { src: "https://x.supabase.co/a.jpg", alt: "A" },
  { src: "https://x.supabase.co/b.jpg", alt: "B" },
  { src: "https://x.supabase.co/c.jpg", alt: "C" }
];
const video = { src: "https://x.supabase.co/turntable.mp4", poster: "https://x.supabase.co/poster.jpg" };
const shape = (slides) => slides.map((slide) => (slide.type === "video" ? "video" : slide.src.split("/").pop()));

assert.equal(normalizeVideoPosition(0), VIDEO_POSITION_FIRST);
assert.equal(normalizeVideoPosition("0"), VIDEO_POSITION_FIRST);
assert.equal(normalizeVideoPosition(undefined), VIDEO_POSITION_AFTER_COVER);
assert.equal(normalizeVideoPosition(7), VIDEO_POSITION_AFTER_COVER);

// No video: the gallery as it was, with no gap where a video would sit.
assert.deepEqual(shape(buildProductMediaSlides({ images: gallery })), ["a.jpg", "b.jpg", "c.jpg"]);

// The cover leads and is not repeated when it is also a gallery image.
assert.deepEqual(
  shape(buildProductMediaSlides({ images: gallery, coverImageUrl: "https://x.supabase.co/b.jpg" })),
  ["b.jpg", "a.jpg", "c.jpg"]
);
assert.deepEqual(
  shape(buildProductMediaSlides({ images: gallery, coverImageUrl: "https://x.supabase.co/cover.jpg" })),
  ["cover.jpg", "a.jpg", "b.jpg", "c.jpg"]
);

// The video sits after the cover by default, first when admin says so.
assert.deepEqual(
  shape(buildProductMediaSlides({ images: gallery, coverImageUrl: gallery[0].src, video })),
  ["a.jpg", "video", "b.jpg", "c.jpg"]
);
assert.deepEqual(
  shape(buildProductMediaSlides({ images: gallery, video: { ...video, position: VIDEO_POSITION_FIRST } })),
  ["video", "a.jpg", "b.jpg", "c.jpg"]
);
assert.deepEqual(shape(buildProductMediaSlides({ images: [], video })), ["video"]);
assert.deepEqual(shape(buildProductMediaSlides({ images: gallery, video: { src: "  " } })), ["a.jpg", "b.jpg", "c.jpg"]);
assert.equal(buildProductMediaSlides({ images: [], fallbackAlt: "SR 1" })[0].alt, "SR 1");

const [videoPlayer, productGallery, productCard, cardCss, config] = await Promise.all([
  read("../app/product/[slug]/ProductVideo.jsx"),
  read("../app/product/[slug]/ProductGallery.jsx"),
  read("../app/components/ProductCard.jsx"),
  read("../assets/css/engagement-ring.css"),
  read("../next.config.mjs")
]);

for (const attribute of ["muted", "loop", "playsInline", 'preload="none"']) {
  assert.match(videoPlayer, new RegExp(String.raw`\n\s+${attribute}\r?\n`), `Turntable video needs ${attribute}`);
}
assert.match(videoPlayer, /IntersectionObserver/, "Video plays only while its slide is in view");
assert.match(videoPlayer, /prefers-reduced-motion: reduce/, "Reduced motion turns autoplay off");
assert.match(videoPlayer, /onError=\{\(\) => setFailed\(true\)\}/, "A failed video falls back to its poster");
assert.doesNotMatch(videoPlayer, /\bcontrols\b/, "No full browser controls, only the play/pause button");
assert.match(productGallery, /preload=\{lightboxAt === 0\}/, "The first photograph stays the preloaded LCP image");
assert.match(productCard, /product\.coverImageUrl/, "Card leads with the cover image");
assert.match(productCard, /product\.hoverImageUrl/, "Card swaps to the hover image");
assert.match(cardCss, /@media \(hover: hover\) and \(pointer: fine\)/, "Hover swap is desktop only");
assert.match(config, /"media-src 'self' blob: https:\/\/\*\.supabase\.co"/, "CSP lets Supabase videos play");

// --- admin media: signed uploads, commits, and storage cleanup ---------------

const env = { SUPABASE_URL: "https://maris-test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-role-secret" };
const storageBase = "https://maris-test.supabase.co/storage/v1/object/public";
const galleryFile = `${storageBase}/product-images/products/er-1001/gallery/1.jpg`;

function createMediaClient({ product, objects = {}, galleryImages = [] }) {
  const state = { product: { ...product }, signed: [], removed: [], updates: [] };

  return {
    state,
    storage: {
      from(bucket) {
        return {
          async createSignedUploadUrl(path, options) {
            state.signed.push({ bucket, path, options });
            return { data: { signedUrl: `https://maris-test.supabase.co/storage/v1/object/upload/sign/${bucket}/${path}?token=t`, path, token: "t" }, error: null };
          },
          getPublicUrl(path) {
            return { data: { publicUrl: `${storageBase}/${bucket}/${path}` } };
          },
          async list(folder, options = {}) {
            const prefix = `${bucket}/${folder}/`;
            const entries = new Map();

            for (const [key, metadata] of Object.entries(objects)) {
              if (!key.startsWith(prefix)) continue;
              const rest = key.slice(prefix.length);
              const [first, ...deeper] = rest.split("/");
              entries.set(first, deeper.length ? { id: null, name: first } : { id: key, name: first, metadata });
            }

            const data = [...entries.values()].filter((entry) => !options.search || entry.name.includes(options.search));
            return { data, error: null };
          },
          async remove(paths) {
            state.removed.push(...paths.map((path) => `${bucket}/${path}`));
            return { data: paths, error: null };
          }
        };
      }
    },
    from(table) {
      if (table === "product_images") {
        const query = {
          filters: {},
          select() { return query; },
          eq(column, value) { query.filters[column] = value; return query; },
          async maybeSingle() {
            const row = galleryImages.find((image) => image.id === query.filters.id && query.filters.product_id === state.product.id);
            return { data: row ? { image_url: row.image_url } : null, error: null };
          },
          then(resolve) {
            resolve({ data: galleryImages.map((image) => ({ image_url: image.image_url })), error: null });
          }
        };
        return query;
      }

      assert.equal(table, "products");
      return {
        select() {
          const query = {
            eq() { return query; },
            async maybeSingle() { return { data: { ...state.product }, error: null }; },
            then(resolve) { resolve({ data: [{ ...state.product }], error: null }); }
          };
          return query;
        },
        update(payload) {
          state.updates.push(payload);
          return {
            eq() {
              return {
                select() {
                  return {
                    async single() {
                      Object.assign(state.product, payload);
                      return { data: { ...state.product }, error: null };
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
}

const baseProduct = {
  id: "product-1",
  sku: "ER 1001",
  cover_image_url: galleryFile,
  hover_image_url: null,
  video_url: `${storageBase}/product-videos/products/er-1001/turntable.mp4?v=1`,
  video_poster_url: `${storageBase}/product-videos/products/er-1001/turntable-poster.png?v=1`,
  video_position: 1
};

assert.equal(getProductMediaFolder("SR 0084", "id-1"), "products/sr-0084");
assert.equal(getProductMediaFolder("", "id-1"), "products/id-1");
assert.deepEqual(
  parseStorageObjectUrl(`${storageBase}/product-videos/products/a/turntable.mp4?v=9`),
  { bucket: "product-videos", path: "products/a/turntable.mp4" }
);

// Upload URLs: the path is fixed per product and kind, and upserts.
{
  const client = createMediaClient({ product: baseProduct });
  const upload = await createAdminProductMediaUploadUrl(
    { productId: "product-1", kind: "video", contentType: "video/mp4", size: 18 * 1024 * 1024 },
    { env, client, allowedKinds: ["video", "poster"] }
  );

  assert.equal(upload.path, "products/er-1001/turntable.mp4");
  assert.deepEqual(client.state.signed[0], { bucket: "product-videos", path: "products/er-1001/turntable.mp4", options: { upsert: true } });

  const reject = (input, allowedKinds, status) => assert.rejects(
    () => createAdminProductMediaUploadUrl({ productId: "product-1", ...input }, { env, client, allowedKinds }),
    (error) => error.statusCode === status
  );

  await reject({ kind: "video", contentType: "video/quicktime", size: 10 }, ["video"], 415);
  await reject({ kind: "video", contentType: "video/mp4", size: 21 * 1024 * 1024 }, ["video"], 413);
  await reject({ kind: "cover", contentType: "image/jpeg", size: 10 }, ["video", "poster"], 400);
}

// Committing a new video: checked in storage, cache-busted, and the old poster
// (a different file) removed only after the row saved.
{
  const client = createMediaClient({
    product: baseProduct,
    objects: {
      "product-videos/products/er-1001/turntable.mp4": { size: 5 * 1024 * 1024, mimetype: "video/mp4" },
      "product-videos/products/er-1001/turntable-poster.jpg": { size: 90000, mimetype: "image/jpeg" }
    }
  });
  const media = await updateAdminProductMedia({
    productId: "product-1",
    changes: {
      video: { path: "products/er-1001/turntable.mp4" },
      poster: { path: "products/er-1001/turntable-poster.jpg" },
      videoPosition: 0
    }
  }, { env, client });

  assert.match(media.videoUrl, /\/product-videos\/products\/er-1001\/turntable\.mp4\?v=\d+$/, "A replaced file keeps its name and gets ?v=");
  assert.equal(media.videoPosition, 0);
  assert.deepEqual(client.state.removed, ["product-videos/products/er-1001/turntable-poster.png"], "Only the superseded poster is removed");
}

// A commit must point at this product's own upload, and the upload must exist.
{
  const client = createMediaClient({ product: baseProduct });

  await assert.rejects(
    () => updateAdminProductMedia({ productId: "product-1", changes: { video: { path: "products/other/turntable.mp4" } } }, { env, client }),
    (error) => error.statusCode === 400
  );
  await assert.rejects(
    () => updateAdminProductMedia({ productId: "product-1", changes: { video: { path: "products/er-1001/turntable.mp4" } } }, { env, client }),
    (error) => error.statusCode === 409
  );
  assert.equal(client.state.updates.length, 0, "Nothing is saved when a check fails");
}

// An oversized upload is removed rather than left at a public URL.
{
  const client = createMediaClient({
    product: baseProduct,
    objects: { "product-images/products/er-1001/cover.jpg": { size: 11 * 1024 * 1024, mimetype: "image/jpeg" } }
  });

  await assert.rejects(
    () => updateAdminProductMedia({ productId: "product-1", changes: { cover: { path: "products/er-1001/cover.jpg" } } }, { env, client }),
    (error) => error.statusCode === 413
  );
  assert.deepEqual(client.state.removed, ["product-images/products/er-1001/cover.jpg"]);
}

// Replacing a cover that was a gallery photo leaves the photo alone; removing
// the video clears the poster and deletes both files.
{
  const client = createMediaClient({
    product: baseProduct,
    galleryImages: [{ id: "image-2", image_url: `${storageBase}/product-images/products/er-1001/gallery/2.jpg` }]
  });
  const media = await updateAdminProductMedia({
    productId: "product-1",
    changes: { cover: { imageId: "image-2" }, video: null }
  }, { env, client });

  assert.equal(media.coverImageUrl, `${storageBase}/product-images/products/er-1001/gallery/2.jpg`);
  assert.equal(media.videoUrl, "");
  assert.equal(client.state.updates[0].video_poster_url, null);
  assert.deepEqual(client.state.removed.sort(), [
    "product-videos/products/er-1001/turntable-poster.png",
    "product-videos/products/er-1001/turntable.mp4"
  ], "Video files go; the gallery photo that was the cover stays");
}

// Deleting a product removes what its rows pointed at and its own folders.
{
  const client = createMediaClient({
    product: { id: "someone-else", sku: "ER 2002" },
    objects: {
      "product-videos/products/er-1001/turntable.mp4": { size: 1 },
      "product-images/products/er-1001/hover.webp": { size: 1 },
      "product-images/products/er-1001/gallery/1.jpg": { size: 1 },
      "product-images/product-1/1700000000-old.png": { size: 1 }
    }
  });
  const cleanup = await removeDeletedProductMedia(client, {
    productId: "product-1",
    sku: "ER 1001",
    urls: [galleryFile]
  });

  assert.equal(cleanup.removed, 4);
  assert.deepEqual(client.state.removed.sort(), [
    "product-images/product-1/1700000000-old.png",
    "product-images/products/er-1001/gallery/1.jpg",
    "product-images/products/er-1001/hover.webp",
    "product-videos/products/er-1001/turntable.mp4"
  ]);
}

console.log("product media ok");
