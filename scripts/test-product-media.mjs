import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

console.log("product media ok");
