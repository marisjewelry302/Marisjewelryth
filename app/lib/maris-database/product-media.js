// A product's card images (cover, hover) and turntable video (video, poster).
//
// Files never pass through a Next.js route: Vercel caps a request body at about
// 4.5 MB and a turntable runs to 20. Instead admin asks for a signed upload URL,
// the browser uploads straight to Storage, and admin then commits the path.
// The commit checks the object really is where it should be and within limits
// before the product points at it, and only once the product row is saved does
// the file it replaced get removed.

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";
import { normalizeVideoPosition } from "../product-media.js";

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const PRODUCT_VIDEO_BUCKET = "product-videos";

const IMAGE_TYPES = Object.freeze({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" });
const MEGABYTE = 1024 * 1024;

export const PRODUCT_MEDIA_KINDS = Object.freeze({
  cover: { bucket: PRODUCT_IMAGE_BUCKET, column: "cover_image_url", name: "cover", types: IMAGE_TYPES, maxBytes: 10 * MEGABYTE },
  hover: { bucket: PRODUCT_IMAGE_BUCKET, column: "hover_image_url", name: "hover", types: IMAGE_TYPES, maxBytes: 10 * MEGABYTE },
  video: { bucket: PRODUCT_VIDEO_BUCKET, column: "video_url", name: "turntable", types: Object.freeze({ "video/mp4": "mp4" }), maxBytes: 20 * MEGABYTE },
  poster: { bucket: PRODUCT_VIDEO_BUCKET, column: "video_poster_url", name: "turntable-poster", types: IMAGE_TYPES, maxBytes: 5 * MEGABYTE }
});

export const CARD_IMAGE_KINDS = Object.freeze(["cover", "hover"]);
export const TURNTABLE_KINDS = Object.freeze(["video", "poster"]);

const PRODUCT_MEDIA_SELECT = "id, sku, cover_image_url, hover_image_url, video_url, video_poster_url, video_position";
const MEDIA_COLUMNS = Object.values(PRODUCT_MEDIA_KINDS).map((kind) => kind.column);
// Files this module names itself. Only these are ever removed when a product
// points somewhere else; a gallery photo chosen as the cover is left alone.
const OWNED_MEDIA_FILE = /^products\/[^/]+\/(cover|hover|turntable|turntable-poster)\.[a-z0-9]+$/;

export class AdminProductMediaError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AdminProductMediaError";
    this.statusCode = statusCode;
  }
}

function requireConfigured(env) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }
}

// "SR 0084" -> "products/sr-0084". A piece with no code yet files under its id.
export function getProductMediaFolder(sku, productId) {
  const slug = String(sku || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return `products/${slug || String(productId || "").trim()}`;
}

// A public Storage URL -> { bucket, path }, or null for anything else. The
// ?v= cache-buster is not part of the object's path.
export function parseStorageObjectUrl(url) {
  const match = /\/storage\/v1\/object\/public\/([^/]+)\/([^?#]+)/.exec(String(url || ""));

  if (!match) {
    return null;
  }

  try {
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

function storageKey(object) {
  return object ? `${object.bucket}/${object.path}` : "";
}

function publicUrl(supabase, bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data?.publicUrl || "";
}

function toMediaResponse(row) {
  const videoUrl = row.video_url || "";

  return {
    productId: row.id,
    coverImageUrl: row.cover_image_url || "",
    hoverImageUrl: row.hover_image_url || "",
    videoUrl,
    videoPosterUrl: videoUrl ? row.video_poster_url || "" : "",
    videoPosition: normalizeVideoPosition(row.video_position)
  };
}

async function readProductMediaRow(supabase, productId) {
  if (!productId) {
    throw new AdminProductMediaError("Product id is required.", 400);
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_MEDIA_SELECT)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new AdminProductMediaError(error.message || "Product could not be loaded.", 500);
  }

  if (!data) {
    throw new AdminProductMediaError("Product not found.", 404);
  }

  return data;
}

function resolveKind(kind, allowedKinds) {
  const name = String(kind || "").trim().toLowerCase();

  if (!allowedKinds.includes(name)) {
    throw new AdminProductMediaError(`Media kind must be one of: ${allowedKinds.join(", ")}.`, 400);
  }

  return { name, ...PRODUCT_MEDIA_KINDS[name] };
}

function describeTypes(kind) {
  return Object.values(kind.types).map((extension) => extension.toUpperCase()).join(", ");
}

/**
 * A signed URL the browser can PUT one file to. The path is fixed per product
 * and kind (products/sr-0084/turntable.mp4), so a replacement overwrites the
 * same name and the committed URL carries ?v= to get past caches.
 */
export async function createAdminProductMediaUploadUrl(
  { productId, kind, contentType, size },
  { env = process.env, client, allowedKinds = Object.keys(PRODUCT_MEDIA_KINDS) } = {}
) {
  requireConfigured(env);

  const mediaKind = resolveKind(kind, allowedKinds);
  const type = String(contentType || "").trim().toLowerCase();
  const extension = mediaKind.types[type];
  const bytes = Number(size);

  if (!extension) {
    throw new AdminProductMediaError(`${mediaKind.name} must be ${describeTypes(mediaKind)}.`, 415);
  }

  if (!Number.isFinite(bytes) || bytes <= 0) {
    throw new AdminProductMediaError("File size is required.", 400);
  }

  if (bytes > mediaKind.maxBytes) {
    throw new AdminProductMediaError(`${mediaKind.name} must be ${mediaKind.maxBytes / MEGABYTE} MB or smaller.`, 413);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const product = await readProductMediaRow(supabase, productId);
  const path = `${getProductMediaFolder(product.sku, product.id)}/${mediaKind.name}.${extension}`;
  const { data, error } = await supabase.storage.from(mediaKind.bucket).createSignedUploadUrl(path, { upsert: true });

  if (error || !data?.signedUrl) {
    throw new AdminProductMediaError(error?.message || "Upload URL could not be created.", 500);
  }

  return {
    kind: mediaKind.name,
    bucket: mediaKind.bucket,
    path,
    signedUrl: data.signedUrl,
    contentType: type,
    maxBytes: mediaKind.maxBytes
  };
}

async function readUploadedObject(supabase, bucket, path) {
  const slash = path.lastIndexOf("/");
  const folder = path.slice(0, slash);
  const fileName = path.slice(slash + 1);
  const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 100, search: fileName });

  if (error) {
    throw new AdminProductMediaError(error.message || "Uploaded file could not be checked.", 500);
  }

  return (Array.isArray(data) ? data : []).find((entry) => entry.name === fileName && entry.id) || null;
}

// Turns one requested change into the URL the column will hold.
async function resolveMediaValue(supabase, product, kindName, change) {
  const kind = PRODUCT_MEDIA_KINDS[kindName];

  if (change === null) {
    return null;
  }

  if (change?.imageId && CARD_IMAGE_KINDS.includes(kindName)) {
    const { data, error } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("id", String(change.imageId))
      .eq("product_id", product.id)
      .maybeSingle();

    if (error) {
      throw new AdminProductMediaError(error.message || "Gallery image could not be loaded.", 500);
    }

    if (!data?.image_url) {
      throw new AdminProductMediaError("That gallery image does not belong to this product.", 404);
    }

    return data.image_url;
  }

  const path = String(change?.path || "").trim();
  const expectedStem = `${getProductMediaFolder(product.sku, product.id)}/${kind.name}.`;
  const extension = path.slice(expectedStem.length);

  if (!path.startsWith(expectedStem) || !Object.values(kind.types).includes(extension)) {
    throw new AdminProductMediaError(`Unexpected ${kindName} path. Ask for a new upload URL and try again.`, 400);
  }

  const object = await readUploadedObject(supabase, kind.bucket, path);

  if (!object) {
    throw new AdminProductMediaError(`The ${kindName} upload has not arrived in storage.`, 409);
  }

  const size = Number(object.metadata?.size) || 0;
  const mimetype = String(object.metadata?.mimetype || "").toLowerCase();

  if (size > kind.maxBytes || (mimetype && !kind.types[mimetype])) {
    // Never leave an out-of-spec file sitting at a public URL.
    await supabase.storage.from(kind.bucket).remove([path]);
    throw new AdminProductMediaError(
      `The ${kindName} upload must be ${describeTypes(kind)} and ${kind.maxBytes / MEGABYTE} MB or smaller.`,
      413
    );
  }

  return `${publicUrl(supabase, kind.bucket, path)}?v=${Date.now()}`;
}

async function readReferencedStorageKeys(supabase, candidateKeys) {
  const referenced = new Set();

  if (!candidateKeys.size) {
    return referenced;
  }

  const [images, products] = await Promise.all([
    supabase.from("product_images").select("image_url"),
    supabase.from("products").select(MEDIA_COLUMNS.join(", "))
  ]);

  if (images.error || products.error) {
    // Unsure what is still in use, so remove nothing.
    return new Set(candidateKeys);
  }

  const mark = (url) => {
    const key = storageKey(parseStorageObjectUrl(url));

    if (candidateKeys.has(key)) {
      referenced.add(key);
    }
  };

  images.data.forEach((row) => mark(row.image_url));
  products.data.forEach((row) => MEDIA_COLUMNS.forEach((column) => mark(row[column])));

  return referenced;
}

// Removes storage objects nothing in the database points at any more. Called
// only after the row that stopped pointing at them has been saved or deleted.
export async function removeUnreferencedMediaFiles(supabase, objects) {
  const byKey = new Map();

  for (const object of objects) {
    if (object?.bucket && object?.path && [PRODUCT_IMAGE_BUCKET, PRODUCT_VIDEO_BUCKET].includes(object.bucket)) {
      byKey.set(storageKey(object), object);
    }
  }

  const referenced = await readReferencedStorageKeys(supabase, new Set(byKey.keys()));
  const removable = [...byKey.values()].filter((object) => !referenced.has(storageKey(object)));
  const failed = [];

  for (const bucket of [PRODUCT_IMAGE_BUCKET, PRODUCT_VIDEO_BUCKET]) {
    const paths = removable.filter((object) => object.bucket === bucket).map((object) => object.path);

    if (!paths.length) continue;

    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      failed.push(...paths.map((path) => `${bucket}/${path}`));
    }
  }

  return { removed: removable.length - failed.length, failed };
}

/**
 * Points the product at new card images or a new turntable, or clears them.
 * `changes` keys are cover, hover, video, poster - each { path } for a fresh
 * upload, { imageId } (cover/hover only) to reuse a gallery image, or null to
 * clear - plus videoPosition. Clearing the video clears its poster too.
 */
export async function updateAdminProductMedia(
  { productId, changes = {} },
  { env = process.env, client } = {}
) {
  requireConfigured(env);

  const supabase = client || createSupabaseAdminClient(env);
  const product = await readProductMediaRow(supabase, productId);
  const payload = {};

  for (const kindName of Object.keys(PRODUCT_MEDIA_KINDS)) {
    if (changes[kindName] !== undefined) {
      payload[PRODUCT_MEDIA_KINDS[kindName].column] = await resolveMediaValue(supabase, product, kindName, changes[kindName]);
    }
  }

  if (changes.video === null && changes.poster === undefined) {
    payload.video_poster_url = null;
  }

  if (changes.videoPosition !== undefined) {
    payload.video_position = normalizeVideoPosition(changes.videoPosition);
  }

  if (!Object.keys(payload).length) {
    throw new AdminProductMediaError("Nothing to update.", 400);
  }

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", product.id)
    .select(PRODUCT_MEDIA_SELECT)
    .single();

  if (error) {
    throw new AdminProductMediaError(error.message || "Product media could not be saved.", 500);
  }

  // The row is saved; now the files it no longer uses can go. A file written
  // over in place (same name, new ?v=) is the one now in use, so it stays.
  const stillInUse = new Set(MEDIA_COLUMNS.map((column) => storageKey(parseStorageObjectUrl(data[column]))));
  const replaced = MEDIA_COLUMNS
    .filter((column) => column in payload)
    .map((column) => parseStorageObjectUrl(product[column]))
    .filter((object) => object && OWNED_MEDIA_FILE.test(object.path) && !stillInUse.has(storageKey(object)));
  const cleanup = await removeUnreferencedMediaFiles(supabase, replaced);

  return { ...toMediaResponse(data), cleanup };
}

async function listFolderFiles(supabase, bucket, folder) {
  const files = [];
  const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });

  if (error || !Array.isArray(data)) {
    return files;
  }

  for (const entry of data) {
    const path = `${folder}/${entry.name}`;

    if (entry.id) {
      files.push({ bucket, path });
    } else {
      files.push(...await listFolderFiles(supabase, bucket, path));
    }
  }

  return files;
}

/**
 * Every storage object that belonged to a product that has just been deleted:
 * whatever its rows pointed at, plus anything left in its own folders (an
 * upload that was never committed). Folders shared with another product's
 * code are left to URL matching alone.
 */
export async function removeDeletedProductMedia(supabase, { productId, sku, urls = [] }) {
  const objects = urls.map(parseStorageObjectUrl).filter(Boolean);
  const folder = getProductMediaFolder(sku, productId);
  const { data: others } = await supabase.from("products").select("id, sku");
  const folderShared = (Array.isArray(others) ? others : [])
    .some((row) => row.id !== productId && getProductMediaFolder(row.sku, row.id) === folder);

  if (!folderShared) {
    objects.push(
      ...await listFolderFiles(supabase, PRODUCT_IMAGE_BUCKET, folder),
      ...await listFolderFiles(supabase, PRODUCT_VIDEO_BUCKET, folder)
    );
  }

  // Uploads from before files were filed by product code sat under the id.
  if (productId) {
    objects.push(...await listFolderFiles(supabase, PRODUCT_IMAGE_BUCKET, String(productId)));
  }

  return removeUnreferencedMediaFiles(supabase, objects);
}
