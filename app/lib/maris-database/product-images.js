// Product gallery images: upload, removal, and ordering against Supabase
// Storage. These are the product page's views; the catalogue card's cover and
// hover images live on the product row (see ./product-media.js).

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";
import {
  PRODUCT_IMAGE_BUCKET,
  getProductMediaFolder,
  parseStorageObjectUrl,
  removeUnreferencedMediaFiles
} from "./product-media.js";

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export class AdminProductImageUploadError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AdminProductImageUploadError";
    this.statusCode = statusCode;
  }
}

async function readProductSku(supabase, productId) {
  const { data, error } = await supabase
    .from("products")
    .select("sku")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new AdminProductImageUploadError(error.message || "Product could not be loaded.", 500);
  }

  if (!data) {
    throw new AdminProductImageUploadError("Product not found.", 404);
  }

  return data.sku || "";
}

// "R 0050 White Gold 1.JPG" -> { stem: "r-0050-white-gold-1", ext: "jpg" }.
// Storage keys must stay plain ASCII, so Thai or symbols fall back to a stamp.
function splitImageFileName(fileName) {
  const base = String(fileName || "").split(/[\\/]/).pop() || "";
  const dot = base.lastIndexOf(".");
  const ext = (dot > 0 ? base.slice(dot + 1) : "").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const stem = (dot > 0 ? base.slice(0, dot) : base)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return { stem: stem || `image-${Date.now()}`, ext };
}

export async function uploadAdminProductImage(
  { productId, fileName, contentType, buffer, altText, sortOrder, isPrimary },
  { env = process.env, client } = {}
) {
  const supabase = client || createSupabaseAdminClient(env);
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    throw new Error("Supabase admin database is not configured");
  }

  if (!productId) {
    throw new AdminProductImageUploadError("Product ID is required.", 400);
  }

  if (!buffer || !fileName) {
    throw new AdminProductImageUploadError("File is required.", 400);
  }

  if (buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
    throw new AdminProductImageUploadError("Product image must be 5 MB or smaller.", 413);
  }

  // SVG is left out on purpose: it can carry script and is served from the storage origin.
  if (contentType && !ALLOWED_PRODUCT_IMAGE_TYPES.has(String(contentType).toLowerCase())) {
    throw new AdminProductImageUploadError("Product image must be a JPEG, PNG, WebP, AVIF or GIF file.", 400);
  }

  const sku = await readProductSku(supabase, productId);
  const { stem, ext } = splitImageFileName(fileName);
  const folder = `${getProductMediaFolder(sku, productId)}/gallery`;
  const upload = (name) => supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(`${folder}/${name}.${ext}`, buffer, {
      contentType: contentType || "image/jpeg",
      upsert: false
    });

  // Keep the file's own name so Storage reads like the folder on the desk. Only
  // when that name is already taken does a short suffix keep both files.
  let { data: uploadData, error: uploadError } = await upload(stem);

  if (uploadError && /already exists|duplicate/i.test(uploadError.message || "")) {
    ({ data: uploadData, error: uploadError } = await upload(`${stem}-${Math.random().toString(36).slice(2, 6)}`));
  }

  if (uploadError) {
    throw new AdminProductImageUploadError(uploadError.message || "Image could not be uploaded.", 500);
  }

  const { data: publicUrlData } = supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(uploadData.path);

  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      image_url: publicUrlData?.publicUrl || "",
      alt_text: altText || "",
      sort_order: Number(sortOrder) || 0,
      is_primary: isPrimary === true,
      source: "upload"
    })
    .select("*")
    .single();

  if (error) {
    // The row never landed, so the file it was for has nothing pointing at it.
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([uploadData.path]);
    throw new AdminProductImageUploadError(error.message || "Image record could not be saved.", 500);
  }

  return {
    id: data.id,
    imageUrl: data.image_url,
    altText: data.alt_text || "",
    sortOrder: data.sort_order,
    isPrimary: data.is_primary,
    source: data.source
  };
}

export async function deleteAdminProductImage(
  { productId, imageId },
  { env = process.env, client } = {}
) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error("Supabase admin database is not configured");
  }

  if (!productId || !imageId) {
    throw new AdminProductImageUploadError("Product ID and image ID are required.", 400);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data: rows, error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("product_id", productId)
    .select("image_url");

  if (error) {
    throw new AdminProductImageUploadError(error.message || "Product image could not be deleted.", 500);
  }

  // The file goes too, unless the cover, the hover image or another row still
  // shows it - after the backfill most covers are a gallery photo.
  const cleanup = await removeUnreferencedMediaFiles(
    supabase,
    (Array.isArray(rows) ? rows : []).map((row) => parseStorageObjectUrl(row.image_url))
  );

  return {
    id: imageId,
    productId,
    deleted: true,
    fileRemoved: cleanup.removed > 0
  };
}

export async function reorderAdminProductImages(
  { productId, imageIds },
  { env = process.env, client } = {}
) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error("Supabase admin database is not configured");
  }

  const orderedImageIds = Array.from(new Set(
    (Array.isArray(imageIds) ? imageIds : [])
      .map((imageId) => String(imageId || "").trim())
      .filter(Boolean)
  ));

  if (!productId || !orderedImageIds.length) {
    throw new AdminProductImageUploadError("Product ID and ordered image IDs are required.", 400);
  }

  const supabase = client || createSupabaseAdminClient(env);
  // The first gallery image stays primary: it stands in for the cover wherever
  // a product has none yet.
  const results = await Promise.all(orderedImageIds.map((imageId, index) => (
    supabase
      .from("product_images")
      .update({ sort_order: index, is_primary: index === 0 })
      .eq("id", imageId)
      .eq("product_id", productId)
  )));
  const failedResult = results.find((result) => result.error);

  if (failedResult) {
    throw new AdminProductImageUploadError(
      failedResult.error.message || "Product image order could not be updated.",
      500
    );
  }

  return {
    productId,
    imageIds: orderedImageIds,
    updated: true
  };
}

const IMAGE_ALT_TEXT_MAX_LENGTH = 300;

// The storefront reads each image's metal and view from its alt text, so
// retagging an image in the admin is an alt-text update.
export async function updateAdminProductImageAltText(
  { productId, imageId, altText },
  { env = process.env, client } = {}
) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error("Supabase admin database is not configured");
  }

  const cleanAltText = String(altText || "").replace(/\s+/g, " ").trim();

  if (!productId || !imageId) {
    throw new AdminProductImageUploadError("Product ID and image ID are required.", 400);
  }

  if (!cleanAltText || cleanAltText.length > IMAGE_ALT_TEXT_MAX_LENGTH) {
    throw new AdminProductImageUploadError(`Alt text must be 1-${IMAGE_ALT_TEXT_MAX_LENGTH} characters.`, 400);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("product_images")
    .update({ alt_text: cleanAltText })
    .eq("id", imageId)
    .eq("product_id", productId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new AdminProductImageUploadError(error.message || "Product image could not be updated.", 500);
  }

  if (!data) {
    throw new AdminProductImageUploadError("Product image not found.", 404);
  }

  return {
    id: imageId,
    productId,
    altText: cleanAltText,
    updated: true
  };
}
