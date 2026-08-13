// Product records: normalizers, storefront and admin reads, best-seller slots, and product writes.

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";
import { cleanOptionalText, parseMoneyAmount } from "./shared.js";

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
  status,
  base_price,
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
  status,
  base_price,
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

function normalizeProduct(row) {
  const variants = Array.isArray(row.product_variants)
    ? row.product_variants.map(normalizeVariant)
    : [];
  const images = Array.isArray(row.product_images)
    ? row.product_images.map(normalizeImage).sort(sortImages)
    : [];
  const primaryImage = images.find((image) => image.isPrimary) || images[0] || null;
  const collectionName = cleanOptionalText(row.collection_name) || "";

  return {
    id: row.id,
    sku: row.sku || "",
    slug: row.slug || "",
    name: row.name || "",
    category: row.category || "",
    collection: row.collection || "",
    collectionName,
    status: row.status || "draft",
    basePrice: row.base_price === null || row.base_price === undefined ? null : Number(row.base_price),
    stockQuantity: Number(row.stock_quantity) || 0,
    reservedQuantity: Number(row.reserved_quantity) || 0,
    stockQty: Number(row.stock_quantity) || 0,
    reservedQty: Number(row.reserved_quantity) || 0,
    updatedAt: row.updated_at || null,
    primaryImageUrl: primaryImage?.imageUrl || "",
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
  const primaryImage = images.find((image) => image.isPrimary) || images[0] || null;

  return {
    id: row.id,
    sku: row.sku || "",
    slug: row.slug || "",
    name: row.name || "",
    category: row.category || "",
    collection: row.collection || "",
    collectionName: cleanOptionalText(row.collection_name) || "",
    status: row.status || "active",
    basePrice: row.base_price === null || row.base_price === undefined ? null : Number(row.base_price),
    primaryImageUrl: primaryImage?.imageUrl || "",
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
  const { data, error } = await supabase
    .from("products")
    .select(PUBLIC_CATALOGUE_SELECT)
    .eq("status", "active")
    .or(`slug.eq.${normalized},sku.eq.${normalized.toUpperCase()}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Supabase product could not be loaded.");
  }

  return {
    source: "supabase",
    status: data ? "ready" : "not_found",
    product: data ? normalizePublicProduct(data) : null
  };
}

export async function readRelatedPublicProducts(collection, excludeId, { env = process.env, client, limit = 4 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return { source: "supabase", status: "unavailable", products: [] };
  }

  const supabase = client || createSupabaseAdminClient(env);
  let query = supabase
    .from("products")
    .select(PUBLIC_CATALOGUE_SELECT)
    .eq("status", "active")
    .limit(limit + 1);

  if (collection) {
    query = query.eq("collection", collection);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Supabase related products could not be loaded.");
  }

  const products = (Array.isArray(data) ? data.map(normalizePublicProduct) : [])
    .filter((item) => item.id !== excludeId)
    .slice(0, limit);

  return { source: "supabase", status: "ready", products };
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
  const payload = Object.fromEntries(Object.entries({
    sku,
    slug: product.slug || sku.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: product.name,
    category: normalizeAdminProductCategory({ category: product.category, collection }),
    collection,
    collection_name: collectionName,
    base_price: parseMoneyAmount(product.price) ?? null,
    status,
    stock_quantity: Number(product.stockQty) || 0,
    reserved_quantity: Number(product.reservedQty) || 0
  }).filter(([, value]) => value !== undefined));

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select(ADMIN_CATALOGUE_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || "Product could not be created.");
  }

  const imageUrl = cleanOptionalText(product.imageUrl || product.primaryImageUrl || product.image);

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
    base_price: updates.price === undefined ? undefined : parseMoneyAmount(updates.price),
    status,
    stock_quantity: updates.stockQty !== undefined ? Number(updates.stockQty) : undefined,
    reserved_quantity: updates.reservedQty !== undefined ? Number(updates.reservedQty) : undefined
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
    .select("id")
    .eq("id", productId)
    .limit(1)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message || "Product could not be looked up.");
  }

  if (!existingResult.data) {
    throw new Error("Product not found.");
  }

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

  return { id: productId, deleted: true };
}
