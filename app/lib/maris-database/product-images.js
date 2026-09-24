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

  if (contentType && !String(contentType).toLowerCase().startsWith("image/")) {
    throw new AdminProductImageUploadError("Product image upload must be an image file.", 400);
  }

  const sku = await readProductSku(supabase, productId);
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const uniqueName = `${getProductMediaFolder(sku, productId)}/gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(uniqueName, buffer, {
      contentType: contentType || "image/jpeg",
      upsert: false
    });

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
