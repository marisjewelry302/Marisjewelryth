// Product image upload, removal, and ordering against Supabase Storage.

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";
import {
  PRODUCT_IMAGE_ROLE_COVER,
  PRODUCT_IMAGE_ROLE_INFO,
  clampCoverSlot,
  normalizeProductImageRole
} from "../product-image-roles.js";

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export class AdminProductImageUploadError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AdminProductImageUploadError";
    this.statusCode = statusCode;
  }
}

const IMAGE_ROLE_MIGRATION_MESSAGE =
  "Cover and info images need the product_images.metadata column. Run supabase/migrations/20260917000000_add_product_image_metadata.sql first.";

function toImageRoleError(error, fallbackMessage) {
  const message = String(error?.message || "");

  if (/metadata/i.test(message) && /(does not exist|schema cache)/i.test(message)) {
    return new AdminProductImageUploadError(IMAGE_ROLE_MIGRATION_MESSAGE, 409);
  }

  return new AdminProductImageUploadError(message || fallbackMessage, 500);
}

async function readProductImageRows(supabase, productId) {
  const { data, error } = await supabase
    .from("product_images")
    .select("id, sort_order, is_primary, metadata")
    .eq("product_id", productId);

  if (error) {
    throw toImageRoleError(error, "Product images could not be loaded.");
  }

  return (Array.isArray(data) ? data : []).map((row) => ({
    id: String(row.id),
    sortOrder: Number(row.sort_order) || 0,
    isPrimary: row.is_primary === true,
    role: normalizeProductImageRole(row.metadata?.role),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {}
  }));
}

function getNextInfoSortOrder(rows, excludeId) {
  return rows
    .filter((row) => row.id !== excludeId && row.role !== PRODUCT_IMAGE_ROLE_COVER)
    .reduce((highest, row) => Math.max(highest, row.sortOrder + 1), 0);
}

async function updateProductImageRow(supabase, productId, imageId, payload) {
  const { error } = await supabase
    .from("product_images")
    .update(payload)
    .eq("id", imageId)
    .eq("product_id", productId);

  if (error) {
    throw toImageRoleError(error, "Product image could not be updated.");
  }
}

// Only the first cover may be primary. Older rows that still claim it (legacy
// uploads, a replaced cover) are cleared so every primary-first reader agrees.
async function clearOtherPrimaryImages(supabase, productId, rows, keepId) {
  const stalePrimaryRows = rows.filter((row) => row.isPrimary && row.id !== keepId);

  for (const row of stalePrimaryRows) {
    await updateProductImageRow(supabase, productId, row.id, { is_primary: false });
  }
}

export async function uploadAdminProductImage(
  { productId, fileName, contentType, buffer, altText, sortOrder, isPrimary, role, slot },
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
  const imageRole = normalizeProductImageRole(role);
  const coverSlot = clampCoverSlot(slot ?? sortOrder);
  const existingRows = imageRole === PRODUCT_IMAGE_ROLE_COVER
    ? await readProductImageRows(supabase, productId)
    : [];
  const insertPayload = {
    product_id: productId,
    image_url: imageUrl,
    alt_text: altText || "",
    sort_order: Number(sortOrder) || 0,
    is_primary: isPrimary === true,
    source: "upload"
  };

  if (imageRole === PRODUCT_IMAGE_ROLE_COVER) {
    insertPayload.sort_order = coverSlot;
    insertPayload.is_primary = coverSlot === 0;
  } else if (imageRole === PRODUCT_IMAGE_ROLE_INFO) {
    insertPayload.is_primary = false;
  }

  if (imageRole) {
    insertPayload.metadata = { role: imageRole };
  }

  const insertImage = (payload) => supabase
    .from("product_images")
    .insert(payload)
    .select("*")
    .single();
  let { data, error } = await insertImage(insertPayload);

  // Before the metadata migration runs an untagged row already reads as info,
  // so an info upload can still land; only covers genuinely need the column.
  if (error && imageRole === PRODUCT_IMAGE_ROLE_INFO && toImageRoleError(error).statusCode === 409) {
    const { metadata: _metadata, ...legacyPayload } = insertPayload;
    ({ data, error } = await insertImage(legacyPayload));
  }

  if (error) {
    throw toImageRoleError(error, "Image record could not be saved.");
  }

  // A cover slot holds one image, so a new upload replaces whatever sat there.
  // The old row goes only after the new one is saved, so the card never blanks.
  if (imageRole === PRODUCT_IMAGE_ROLE_COVER) {
    const replacedRows = existingRows.filter((row) => (
      row.role === PRODUCT_IMAGE_ROLE_COVER && row.sortOrder === coverSlot
    ));

    for (const row of replacedRows) {
      await deleteAdminProductImage({ productId, imageId: row.id }, { env, client: supabase });
    }

    if (coverSlot === 0) {
      await clearOtherPrimaryImages(supabase, productId, existingRows, data.id);
    }
  }

  return {
    id: data.id,
    imageUrl: data.image_url,
    altText: data.alt_text || "",
    sortOrder: data.sort_order,
    isPrimary: data.is_primary,
    source: data.source,
    ...(imageRole ? { role: imageRole } : {})
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
  { productId, imageIds, role },
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
  const imageRole = normalizeProductImageRole(role);
  // Info photography never leads the card, so reordering it leaves primary
  // alone; an untyped reorder keeps the original "first image is primary" rule.
  const results = await Promise.all(orderedImageIds.map((imageId, index) => (
    supabase
      .from("product_images")
      .update(imageRole === PRODUCT_IMAGE_ROLE_INFO
        ? { sort_order: index }
        : { sort_order: index, is_primary: index === 0 })
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

// Moves one existing image into a cover slot or into the info set. Dropping a
// cover onto the other cover slot swaps the two; dropping an info image onto an
// occupied slot sends the displaced cover back to the end of the info set.
export async function assignAdminProductImageRole(
  { productId, imageId, role, slot },
  { env = process.env, client } = {}
) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error("Supabase admin database is not configured");
  }

  const imageRole = normalizeProductImageRole(role);

  if (!productId || !imageId || !imageRole) {
    throw new AdminProductImageUploadError("Product ID, image ID, and a cover or info role are required.", 400);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const rows = await readProductImageRows(supabase, productId);
  const target = rows.find((row) => row.id === String(imageId));

  if (!target) {
    throw new AdminProductImageUploadError("Product image not found.", 404);
  }

  if (imageRole === PRODUCT_IMAGE_ROLE_INFO) {
    await updateProductImageRow(supabase, productId, target.id, {
      sort_order: getNextInfoSortOrder(rows, target.id),
      is_primary: false,
      metadata: { ...target.metadata, role: PRODUCT_IMAGE_ROLE_INFO }
    });

    return { productId, imageId: target.id, role: imageRole, updated: true };
  }

  const coverSlot = clampCoverSlot(slot);
  const occupant = rows.find((row) => (
    row.id !== target.id && row.role === PRODUCT_IMAGE_ROLE_COVER && row.sortOrder === coverSlot
  ));
  const isSwap = Boolean(occupant) && target.role === PRODUCT_IMAGE_ROLE_COVER;

  if (occupant) {
    await updateProductImageRow(supabase, productId, occupant.id, isSwap
      ? { sort_order: target.sortOrder, is_primary: target.sortOrder === 0 }
      : {
          sort_order: getNextInfoSortOrder(rows, occupant.id),
          is_primary: false,
          metadata: { ...occupant.metadata, role: PRODUCT_IMAGE_ROLE_INFO }
        });
  }

  await updateProductImageRow(supabase, productId, target.id, {
    sort_order: coverSlot,
    is_primary: coverSlot === 0,
    metadata: { ...target.metadata, role: PRODUCT_IMAGE_ROLE_COVER }
  });

  const primaryId = coverSlot === 0 ? target.id : isSwap && target.sortOrder === 0 ? occupant.id : "";

  if (primaryId) {
    await clearOtherPrimaryImages(supabase, productId, rows, primaryId);
  }

  return { productId, imageId: target.id, role: imageRole, slot: coverSlot, updated: true };
}
