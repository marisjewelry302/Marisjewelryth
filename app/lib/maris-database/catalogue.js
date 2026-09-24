// Product records: normalizers, storefront and admin reads, best-seller slots, and product writes.

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";
import { cleanOptionalText, parseMoneyAmount } from "./shared.js";
import {
  compareSiblingProductCodes,
  isSiblingProductCode,
  parsePublicProductCode,
  toPublicProductSlug
} from "../product-display.js";
import { normalizeVideoPosition } from "../product-media.js";
import { removeDeletedProductMedia } from "./product-media.js";

const BEST_SELLER_SETTING_KEY = "home_best_sellers";

const BEST_SELLER_SLOT_LIMIT = 7;

const ADMIN_CATALOGUE_SELECT = `
  id,
  sku,
  slug,
  name,
  category,
  collection,
  collection_name,
  description,
  metal_type,
  metal_weight,
  stone_type,
  carat_weight,
  status,
  base_price,
  cover_image_url,
  hover_image_url,
  video_url,
  video_poster_url,
  video_position,
  stock_quantity,
  reserved_quantity,
  updated_at,
  product_variants (
    id,
    sku,
    variant_name,
    material,
    size,
    stock_quantity,
    is_active
  ),
  product_images (
    id,
    image_url,
    alt_text,
    sort_order,
    is_primary,
    source
  )
`;

const PUBLIC_CATALOGUE_SELECT = `
  id,
  sku,
  slug,
  name,
  category,
  collection,
  collection_name,
  description,
  metal_type,
  metal_weight,
  stone_type,
  carat_weight,
  status,
  base_price,
  cover_image_url,
  hover_image_url,
  video_url,
  video_poster_url,
  video_position,
  product_variants (
    id,
    sku,
    variant_name,
    material,
    size,
    is_active
  ),
  product_images (
    id,
    image_url,
    alt_text,
    sort_order,
    is_primary
  )
`;

// Metal and stone specs shown on the product page, keyed by the name the
// admin form sends and mapped to their products columns.
const PRODUCT_SPEC_COLUMNS = {
  metalType: "metal_type",
  metalWeight: "metal_weight",
  stoneType: "stone_type",
  caratWeight: "carat_weight"
};

function normalizeProductSpecs(row) {
  return Object.fromEntries(Object.entries(PRODUCT_SPEC_COLUMNS).map(([key, column]) => [
    key,
    cleanOptionalText(row[column]) || ""
  ]));
}

// Only the spec keys the caller sent become columns, so a partial update
// leaves the others untouched.
function buildProductSpecsPayload(input = {}) {
  const specs = input.specs && typeof input.specs === "object" ? input.specs : {};

  return Object.fromEntries(Object.entries(PRODUCT_SPEC_COLUMNS)
    .filter(([key]) => specs[key] !== undefined)
    .map(([key, column]) => [column, cleanOptionalText(specs[key])]));
}

function normalizeVariant(row) {
  return {
    id: row.id,
    sku: row.sku || "",
    variantName: row.variant_name || "",
    material: row.material || "",
    size: row.size || "",
    stockQuantity: Number(row.stock_quantity) || 0,
    isActive: row.is_active !== false
  };
}

function normalizeImage(row) {
  return {
    id: row.id,
    imageUrl: row.image_url || "",
    altText: row.alt_text || "",
    sortOrder: Number(row.sort_order) || 0,
    isPrimary: row.is_primary === true,
    source: row.source || "manual"
  };
}

const ADMIN_PRODUCT_COLLECTION_ALIASES = Object.freeze({
  ws: "wedding-set",
  "wedding-set": "wedding-set",
  "wedding-sets": "wedding-set",
  er: "engagement-ring",
  "engagement-ring": "engagement-ring",
  "engagement-rings": "engagement-ring",
  wb: "wedding-bands",
  "wedding-band": "wedding-bands",
  "wedding-bands": "wedding-bands",
  mb: "mens-wedding-bands",
  mwb: "mens-wedding-bands",
  mr: "mens-wedding-bands",
  "mens-ring": "mens-wedding-bands",
  "mens-rings": "mens-wedding-bands",
  "mens-wedding-band": "mens-wedding-bands",
  "mens-wedding-bands": "mens-wedding-bands",
  "men-s-wedding-band": "mens-wedding-bands",
  "men-s-wedding-bands": "mens-wedding-bands",
  np: "necklaces-pendants",
  necklace: "necklaces-pendants",
  necklaces: "necklaces-pendants",
  pendant: "necklaces-pendants",
  pendants: "necklaces-pendants",
  "necklaces-pendants": "necklaces-pendants",
  br: "bracelets",
  bracelet: "bracelets",
  bracelets: "bracelets",
  ea: "earrings",
  earring: "earrings",
  earrings: "earrings",
  se: "earrings",
  rg: "rings",
  sr: "rings",
  ring: "rings",
  rings: "rings"
});

const ADMIN_RING_COLLECTIONS = new Set([
  "engagement-ring",
  "wedding-bands",
  "mens-wedding-bands",
  "rings"
]);

function slugifyAdminProductValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeAdminProductCollection(value) {
  const normalized = slugifyAdminProductValue(value);

  return ADMIN_PRODUCT_COLLECTION_ALIASES[normalized] || "";
}

function normalizeAdminProductSku(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeAdminProductCategory({ category, collection }) {
  const collectionKey = normalizeAdminProductCollection(collection) || normalizeAdminProductCollection(category);

  if (collectionKey === "wedding-set") {
    return "Wedding Set";
  }

  if (ADMIN_RING_COLLECTIONS.has(collectionKey)) {
    return "Rings";
  }

  return cleanOptionalText(category) || "";
}

function normalizeBestSellerProductIds(value, limit = BEST_SELLER_SLOT_LIMIT) {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(value?.productIds)
      ? value.productIds
      : [];

  return Array.from(new Set(
    source
      .map((productId) => String(productId || "").trim())
      .filter(Boolean)
  )).slice(0, limit);
}

function normalizeAdminProductStatus(value) {
  const status = String(value || "").trim().toLowerCase();

  if (status === "ready" || status === "preorder" || status === "sold out") {
    return "active";
  }

  if (status === "hidden") {
    return "archived";
  }

  if (["draft", "active", "archived"].includes(status)) {
    return status;
  }

  return "draft";
}

function sortImages(left, right) {
  if (left.isPrimary !== right.isPrimary) {
    return left.isPrimary ? -1 : 1;
  }

  return left.sortOrder - right.sortOrder;
}

// The card's cover and hover images and the turntable video live on the product
// row (migration 20260921000000). The gallery in product_images is the product
// page's set of views; a product saved before it had a cover still shows its
// first gallery image on the card.
function normalizeProductMedia(row, images) {
  const coverImageUrl = cleanOptionalText(row.cover_image_url) || "";
  const hoverImageUrl = cleanOptionalText(row.hover_image_url) || "";
  const videoUrl = cleanOptionalText(row.video_url) || "";

  return {
    coverImageUrl,
    hoverImageUrl,
    primaryImageUrl: coverImageUrl || images[0]?.imageUrl || "",
    videoUrl,
    videoPosterUrl: videoUrl ? cleanOptionalText(row.video_poster_url) || "" : "",
    videoPosition: normalizeVideoPosition(row.video_position)
  };
}

function normalizeProduct(row) {
  const variants = Array.isArray(row.product_variants)
    ? row.product_variants.map(normalizeVariant)
    : [];
  const images = Array.isArray(row.product_images)
    ? row.product_images.map(normalizeImage).sort(sortImages)
    : [];
  const media = normalizeProductMedia(row, images);
  const collectionName = cleanOptionalText(row.collection_name) || "";

  return {
    id: row.id,
    sku: row.sku || "",
    slug: row.slug || "",
    name: row.name || "",
    category: row.category || "",
    collection: row.collection || "",
    collectionName,
    description: cleanOptionalText(row.description) || "",
    specs: normalizeProductSpecs(row),
    status: row.status || "draft",
    basePrice: row.base_price === null || row.base_price === undefined ? null : Number(row.base_price),
    stockQuantity: Number(row.stock_quantity) || 0,
    reservedQuantity: Number(row.reserved_quantity) || 0,
    stockQty: Number(row.stock_quantity) || 0,
    reservedQty: Number(row.reserved_quantity) || 0,
    updatedAt: row.updated_at || null,
    ...media,
    imageCount: images.length,
    variantCount: variants.length,
    totalStock: variants.reduce((total, variant) => total + variant.stockQuantity, 0),
    variants,
    images
  };
}

function normalizePublicVariant(row) {
  return {
    id: row.id,
    sku: row.sku || "",
    variantName: row.variant_name || "",
    material: row.material || "",
    size: row.size || ""
  };
}

function normalizePublicImage(row) {
  return {
    id: row.id,
    imageUrl: row.image_url || "",
    altText: row.alt_text || "",
    sortOrder: Number(row.sort_order) || 0,
    isPrimary: row.is_primary === true
  };
}

function normalizePublicProduct(row) {
  const variants = Array.isArray(row.product_variants)
    ? row.product_variants.filter((variant) => variant.is_active !== false).map(normalizePublicVariant)
    : [];
  const images = Array.isArray(row.product_images)
    ? row.product_images.map(normalizePublicImage).sort(sortImages)
    : [];
  const media = normalizeProductMedia(row, images);

  return {
    id: row.id,
    sku: row.sku || "",
    slug: row.slug || "",
    name: row.name || "",
    category: row.category || "",
    collection: row.collection || "",
    collectionName: cleanOptionalText(row.collection_name) || "",
    description: cleanOptionalText(row.description) || "",
    specs: normalizeProductSpecs(row),
    status: row.status || "active",
    basePrice: row.base_price === null || row.base_price === undefined ? null : Number(row.base_price),
    ...media,
    images,
    variants
  };
}

export async function readAdminCatalogueProducts({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      products: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_CATALOGUE_SELECT)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase catalogue products could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    products: Array.isArray(data) ? data.map(normalizeProduct) : [],
    checkedAt: new Date().toISOString()
  };
}

export async function readPublicCatalogueProducts({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      source: "supabase",
      status: "unavailable",
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      products: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("products")
    .select(PUBLIC_CATALOGUE_SELECT)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase public catalogue products could not be loaded.");
  }

  const products = Array.isArray(data) ? data.map(normalizePublicProduct) : [];

  return {
    source: "supabase",
    status: products.length > 0 ? "ready" : "empty",
    projectRef: config.projectRef,
    missingEnv: [],
    products,
    checkedAt: new Date().toISOString()
  };
}

export async function readAdminBestSellerSettings({ env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      productIds: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", BEST_SELLER_SETTING_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Best Seller settings could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    productIds: normalizeBestSellerProductIds(data?.value),
    checkedAt: new Date().toISOString()
  };
}

export async function updateAdminBestSellerSettings(productIds, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const normalizedProductIds = normalizeBestSellerProductIds(productIds);
  const supabase = client || createSupabaseAdminClient(env);
  const value = {
    productIds: normalizedProductIds,
    updatedAt: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("settings")
    .upsert({
      key: BEST_SELLER_SETTING_KEY,
      value,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" })
    .select("value")
    .single();

  if (error) {
    throw new Error(error.message || "Best Seller settings could not be saved.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    productIds: normalizeBestSellerProductIds(data?.value || value),
    checkedAt: new Date().toISOString()
  };
}

export async function readPublicBestSellerProducts({ env = process.env, client, limit = BEST_SELLER_SLOT_LIMIT } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      source: "supabase",
      status: "unavailable",
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      products: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const settings = await readAdminBestSellerSettings({ env, client: supabase });
  const productIds = settings.productIds.slice(0, limit);

  if (!productIds.length) {
    return {
      source: "supabase",
      status: "empty",
      projectRef: config.projectRef,
      missingEnv: [],
      products: [],
      checkedAt: new Date().toISOString()
    };
  }

  const { data, error } = await supabase
    .from("products")
    .select(PUBLIC_CATALOGUE_SELECT)
    .eq("status", "active")
    .in("id", productIds)
    .limit(productIds.length);

  if (error) {
    throw new Error(error.message || "Supabase best seller products could not be loaded.");
  }

  const productOrder = new Map(productIds.map((productId, index) => [productId, index]));
  const products = (Array.isArray(data) ? data.map(normalizePublicProduct) : [])
    .sort((left, right) => (
      (productOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER)
      - (productOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    ));

  return {
    source: "supabase",
    status: products.length > 0 ? "ready" : "empty",
    projectRef: config.projectRef,
    missingEnv: [],
    products,
    checkedAt: new Date().toISOString()
  };
}

export async function readPublicProductBySlug(slugOrSku, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  const normalized = String(slugOrSku || "").trim();

  if (!config.isConfigured || !normalized) {
    return {
      source: "supabase",
      status: "unavailable",
      product: null
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const slugCandidate = toPublicProductSlug(normalized);
  // A request can arrive as the stored slug, the SKU itself, or the SKU written
  // as a slug. Each spelling has to find the piece so no catalogue link 404s;
  // the product page then redirects the non-canonical ones onto one URL.
  const skuCandidates = [...new Set([
    normalized.toUpperCase(),
    slugCandidate.replace(/-/g, " ").toUpperCase()
  ].filter(Boolean))];

  function selectActiveProducts(narrow) {
    return narrow(supabase
      .from("products")
      .select(PUBLIC_CATALOGUE_SELECT)
      .eq("status", "active"));
  }

  let data = null;

  if (slugCandidate) {
    const bySlug = await selectActiveProducts((query) => query.eq("slug", slugCandidate).limit(1).maybeSingle());

    if (bySlug.error) {
      throw new Error(bySlug.error.message || "Supabase product could not be loaded.");
    }

    data = bySlug.data;
  }

  if (!data && skuCandidates.length) {
    const bySku = await selectActiveProducts((query) => query.in("sku", skuCandidates).limit(1).maybeSingle());

    if (bySku.error) {
      throw new Error(bySku.error.message || "Supabase product could not be loaded.");
    }

    data = bySku.data;
  }

  return {
    source: "supabase",
    status: data ? "ready" : "not_found",
    product: data ? normalizePublicProduct(data) : null
  };
}

export async function readRelatedPublicProducts(collection, excludeId, { env = process.env, client, limit = 4, sku } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return { source: "supabase", status: "unavailable", products: [] };
  }

  const supabase = client || createSupabaseAdminClient(env);
  // Siblings of the same design ("SR 0015 ER" next to "SR 0015 WB") come first,
  // whatever collection they sit in; the rest of the row is filled from the
  // piece's own collection. SKUs are hand-entered with or without spaces, so
  // the database match is loose and the exact code comparison happens here.
  const code = parsePublicProductCode(sku);
  let siblings = [];

  if (code) {
    const bySku = await supabase
      .from("products")
      .select(PUBLIC_CATALOGUE_SELECT)
      .eq("status", "active")
      .ilike("sku", `${code.prefix}%${code.digits}%`)
      .limit(limit * 3);

    if (bySku.error) {
      throw new Error(bySku.error.message || "Supabase related products could not be loaded.");
    }

    siblings = (Array.isArray(bySku.data) ? bySku.data.map(normalizePublicProduct) : [])
      .filter((item) => item.id !== excludeId && isSiblingProductCode(sku, item.sku))
      .sort((left, right) => compareSiblingProductCodes(left.sku, right.sku));
  }

  let sameCollection = [];

  if (siblings.length < limit) {
    const query = supabase
      .from("products")
      .select(PUBLIC_CATALOGUE_SELECT)
      .eq("status", "active")
      .limit(limit + siblings.length + 1);
    const { data, error } = await (collection ? query.eq("collection", collection) : query);

    if (error) {
      throw new Error(error.message || "Supabase related products could not be loaded.");
    }

    sameCollection = Array.isArray(data) ? data.map(normalizePublicProduct) : [];
  }

  const seen = new Set([excludeId]);
  const products = [...siblings, ...sameCollection]
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, limit);

  return { source: "supabase", status: "ready", products };
}

// camelCase media fields in, snake_case columns out. A field left undefined is
// not written; an empty string clears the column.
const PRODUCT_MEDIA_URL_FIELDS = Object.freeze({
  coverImageUrl: "cover_image_url",
  hoverImageUrl: "hover_image_url",
  videoUrl: "video_url",
  videoPosterUrl: "video_poster_url"
});

function toProductMediaPayload(input = {}) {
  const payload = {};

  for (const [field, column] of Object.entries(PRODUCT_MEDIA_URL_FIELDS)) {
    if (input[field] !== undefined) {
      payload[column] = cleanOptionalText(input[field]) || null;
    }
  }

  if (input.videoPosition !== undefined) {
    payload.video_position = normalizeVideoPosition(input.videoPosition);
  }

  return payload;
}

export async function createAdminProduct(product, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const status = normalizeAdminProductStatus(product.status);
  const sku = normalizeAdminProductSku(product.sku);
  const collection = normalizeAdminProductCollection(product.collection || product.ringType || product.category) || null;
  const collectionName = cleanOptionalText(product.collectionName) || null;
  const imageUrl = cleanOptionalText(product.imageUrl || product.primaryImageUrl || product.image);
  const payload = Object.fromEntries(Object.entries({
    sku,
    slug: product.slug || sku.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: product.name,
    category: normalizeAdminProductCategory({ category: product.category, collection }),
    collection,
    collection_name: collectionName,
    description: cleanOptionalText(product.description),
    ...buildProductSpecsPayload(product),
    base_price: parseMoneyAmount(product.price) ?? null,
    status,
    stock_quantity: Number(product.stockQty) || 0,
    reserved_quantity: Number(product.reservedQty) || 0,
    // The first image a product is created with also dresses its card.
    cover_image_url: imageUrl || undefined,
    ...toProductMediaPayload(product)
  }).filter(([, value]) => value !== undefined));

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select(ADMIN_CATALOGUE_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || "Product could not be created.");
  }

  if (imageUrl) {
    const imagePayload = {
      product_id: data.id,
      image_url: imageUrl,
      alt_text: cleanOptionalText(product.imageAlt || product.altText) || `${product.name} main image`,
      sort_order: 0,
      is_primary: true,
      source: product.imageSource || "manual"
    };
    const imageResult = await supabase
      .from("product_images")
      .insert(imagePayload);

    if (imageResult.error) {
      throw new Error(imageResult.error.message || "Product image could not be created.");
    }
  }

  return normalizeProduct(data);
}

export async function updateAdminProduct(productId, updates, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const status = updates.status === undefined ? undefined : normalizeAdminProductStatus(updates.status);
  const collection = updates.collection === undefined
    ? undefined
    : normalizeAdminProductCollection(updates.collection || updates.category) || null;
  const category = updates.category === undefined && updates.collection === undefined
    ? undefined
    : normalizeAdminProductCategory({ category: updates.category, collection });
  const collectionName = updates.collectionName === undefined
    ? undefined
    : cleanOptionalText(updates.collectionName) || null;
  const isActive = updates.isActive !== undefined
    ? updates.isActive
    : status === undefined
      ? undefined
      : status === "active";
  const payload = {
    sku: updates.sku === undefined ? undefined : normalizeAdminProductSku(updates.sku),
    slug: updates.slug,
    name: updates.name,
    category,
    collection,
    collection_name: collectionName,
    description: updates.description === undefined ? undefined : cleanOptionalText(updates.description),
    ...buildProductSpecsPayload(updates),
    base_price: updates.price === undefined ? undefined : parseMoneyAmount(updates.price),
    status,
    stock_quantity: updates.stockQty !== undefined ? Number(updates.stockQty) : undefined,
    reserved_quantity: updates.reservedQty !== undefined ? Number(updates.reservedQty) : undefined,
    ...toProductMediaPayload(updates)
  };

  const cleanedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  const { data, error } = await supabase
    .from("products")
    .update(cleanedPayload)
    .eq("id", productId)
    .select(ADMIN_CATALOGUE_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || "Product could not be updated.");
  }

  return normalizeProduct(data);
}

export async function deleteAdminProduct(productId, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  if (!productId) {
    throw new Error("Product id is required.");
  }

  const supabase = client || createSupabaseAdminClient(env);

  const existingResult = await supabase
    .from("products")
    .select("id, sku, cover_image_url, hover_image_url, video_url, video_poster_url, product_images ( image_url )")
    .eq("id", productId)
    .limit(1)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message || "Product could not be looked up.");
  }

  if (!existingResult.data) {
    throw new Error("Product not found.");
  }

  const existing = existingResult.data;
  const mediaUrls = [
    existing.cover_image_url,
    existing.hover_image_url,
    existing.video_url,
    existing.video_poster_url,
    ...(Array.isArray(existing.product_images) ? existing.product_images.map((image) => image.image_url) : [])
  ].filter(Boolean);

  const imagesResult = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (imagesResult.error) {
    throw new Error(imagesResult.error.message || "Product images could not be deleted.");
  }

  const variantsResult = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);

  if (variantsResult.error) {
    throw new Error(variantsResult.error.message || "Product variants could not be deleted.");
  }

  const productResult = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (productResult.error) {
    throw new Error(productResult.error.message || "Product could not be deleted.");
  }

  // Files go only once the rows are gone, so a failed delete never leaves a
  // product pointing at nothing. A file another product still shows stays.
  const cleanup = await removeDeletedProductMedia(supabase, {
    productId,
    sku: existing.sku,
    urls: mediaUrls
  });

  return { id: productId, deleted: true, filesRemoved: cleanup.removed, filesFailed: cleanup.failed.length };
}
