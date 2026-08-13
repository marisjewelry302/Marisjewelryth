// Product image upload, removal, and ordering against Supabase Storage.

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export class AdminProductImageUploadError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AdminProductImageUploadError";
    this.statusCode = statusCode;
  }
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

  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueName = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(uniqueName, buffer, {
      contentType: contentType || "image/jpeg",
      upsert: false
    });

  if (uploadError) {
    throw new AdminProductImageUploadError(uploadError.message || "Image could not be uploaded.", 500);
  }

  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(uploadData.path);

  const imageUrl = publicUrlData?.publicUrl || "";

  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      image_url: imageUrl,
      alt_text: altText || "",
      sort_order: Number(sortOrder) || 0,
      is_primary: isPrimary === true,
      source: "upload"
    })
    .select("*")
    .single();

  if (error) {
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
  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("product_id", productId);

  if (error) {
    throw new AdminProductImageUploadError(error.message || "Product image could not be deleted.", 500);
  }

  return {
    id: imageId,
    productId,
    deleted: true
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
  const results = await Promise.all(orderedImageIds.map((imageId, index) => (
    supabase
      .from("product_images")
      .update({
        sort_order: index,
        is_primary: index === 0
      })
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
