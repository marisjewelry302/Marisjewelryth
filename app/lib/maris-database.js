import { createClient } from "@supabase/supabase-js";

export const MARIS_DATABASE_TABLES = Object.freeze([
  "admin_users",
  "customers",
  "custom_order_requests",
  "inventory_movements",
  "inventory_logs",
  "orders",
  "order_items",
  "payments",
  "product_images",
  "product_variants",
  "products",
  "settings"
]);

const SUPABASE_URL_ENV = "SUPABASE_URL";
const NEXT_PUBLIC_SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const BEST_SELLER_SETTING_KEY = "home_best_sellers";
const BEST_SELLER_SLOT_LIMIT = 7;
const ADMIN_CATALOGUE_SELECT = `
  id,
  sku,
  slug,
  name,
  category,
  collection,
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
const ADMIN_CUSTOM_ORDER_SELECT = `
  id,
  customer_id,
  product_code,
  full_name,
  company_name,
  email,
  contact_number,
  metal,
  metal_purity,
  ring_size,
  stone_carat,
  stone_color,
  stone_clarity,
  stone_cut,
  origin,
  status,
  metadata,
  created_at,
  customers (
    id,
    full_name,
    email,
    phone
  )
`;

function cleanEnvValue(value) {
  const cleanValue = String(value || "").trim();

  if (
    !cleanValue
    || /^replace-with-/i.test(cleanValue)
    || /^your[_-]/i.test(cleanValue)
    || /^https:\/\/your-project/i.test(cleanValue)
  ) {
    return "";
  }

  return cleanValue;
}

function getProjectRef(url) {
  try {
    const hostname = new URL(url).hostname;
    const [projectRef] = hostname.split(".");

    return projectRef || null;
  } catch (error) {
    return null;
  }
}

function readSupabaseAdminEnv(env = process.env) {
  return {
    url: cleanEnvValue(env[SUPABASE_URL_ENV] || env[NEXT_PUBLIC_SUPABASE_URL_ENV]),
    serviceRoleKey: cleanEnvValue(env[SUPABASE_SERVICE_ROLE_KEY_ENV])
  };
}

export function getSupabaseAdminConfig(env = process.env) {
  const { url, serviceRoleKey } = readSupabaseAdminEnv(env);
  const missingEnv = [];

  if (!url) {
    missingEnv.push(SUPABASE_URL_ENV);
  }

  if (!serviceRoleKey) {
    missingEnv.push(SUPABASE_SERVICE_ROLE_KEY_ENV);
  }

  return {
    isConfigured: missingEnv.length === 0,
    url,
    projectRef: url ? getProjectRef(url) : null,
    hasServiceRoleKey: Boolean(serviceRoleKey),
    missingEnv,
    tables: [...MARIS_DATABASE_TABLES]
  };
}

export function createSupabaseAdminClient(env = process.env) {
  const { url, serviceRoleKey } = readSupabaseAdminEnv(env);
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    },
    global: {
      headers: {
        "X-Client-Info": "maris-jewelry-admin"
      }
    }
  });
}

export async function readAdminDatabaseStatus({ env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      tables: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const tables = await Promise.all(MARIS_DATABASE_TABLES.map(async (tableName) => {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });

      if (error) {
        return {
          name: tableName,
          isReachable: false,
          rowCount: null,
          error: error.message || String(error)
        };
      }

      return {
        name: tableName,
        isReachable: true,
        rowCount: typeof count === "number" ? count : null,
        error: null
      };
    } catch (error) {
      return {
        name: tableName,
        isReachable: false,
        rowCount: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }));

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    tables,
    checkedAt: new Date().toISOString()
  };
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

function parseMoneyAmount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value).replace(/,/g, "").trim();
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : null;
}

function cleanOptionalText(value) {
  const text = String(value || "").trim();
  return text || null;
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

  return {
    id: row.id,
    sku: row.sku || "",
    slug: row.slug || "",
    name: row.name || "",
    category: row.category || "",
    collection: row.collection || "",
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
      description: "Homepage Best Seller carousel product order.",
      is_public: true
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

const ADMIN_ORDER_SELECT = `
  id,
  order_number,
  customer_id,
  status,
  payment_status,
  channel,
  subtotal_amount,
  discount_amount,
  shipping_amount,
  total_amount,
  currency,
  placed_at,
  notes,
  metadata,
  created_at,
  updated_at,
  customers (
    id,
    full_name,
    email,
    phone
  ),
  order_items (
    id,
    product_id,
    variant_id,
    product_code,
    item_name,
    quantity,
    unit_price_amount,
    total_amount
  )
`;

function normalizeOrder(row) {
  if (!row) {
    return null;
  }

  const productItem = Array.isArray(row.order_items) ? row.order_items[0] : null;

  return {
    id: row.id,
    orderNumber: row.order_number || "",
    status: row.status || "draft",
    paymentStatus: row.payment_status || "unpaid",
    channel: row.channel || "admin",
    subtotalAmount: Number(row.subtotal_amount) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    shippingAmount: Number(row.shipping_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    currency: row.currency || "THB",
    placedAt: row.placed_at || null,
    notes: row.notes || "",
    customerName: row.customers?.full_name || "Guest",
    customerEmail: row.customers?.email || "",
    customerPhone: row.customers?.phone || "",
    productId: productItem?.product_id || null,
    productCode: productItem?.product_code || "",
    qty: Number(productItem?.quantity) || 0,
    items: Array.isArray(row.order_items) ? row.order_items : [],
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function normalizeInventoryLog(row) {
  if (!row) {
    return null;
  }

  const product = row.products || row.product || null;
  const metadata = row.metadata || {};
  const stockQuantity = product?.stock_quantity ?? metadata.stockQuantity ?? metadata.stock_quantity ?? null;
  const reservedQuantity = product?.reserved_quantity ?? metadata.reservedQuantity ?? metadata.reserved_quantity ?? null;

  return {
    id: row.id,
    productId: row.product_id || null,
    variantId: row.variant_id || null,
    productCode: product?.sku || row.product_code || "",
    sku: product?.sku || row.product_code || "",
    changeType: row.change_type || row.movement_type || "adjustment",
    type: row.change_type || row.movement_type || "adjustment",
    quantity: Number(row.quantity) || 0,
    qty: Number(row.quantity) || 0,
    note: row.note || "",
    metadata,
    stockQuantity: stockQuantity === null || stockQuantity === undefined ? null : Number(stockQuantity),
    reservedQuantity: reservedQuantity === null || reservedQuantity === undefined ? null : Number(reservedQuantity),
    referenceType: row.reference_type || null,
    referenceId: row.reference_id || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at || null
  };
}

function normalizeCustomer(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name || "",
    phone: row.phone || "",
    email: row.email || "",
    lineId: row.line_id || "",
    address: row.address || {},
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes || "",
    metadata: row.metadata || {},
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function getRelatedCustomer(row) {
  if (Array.isArray(row?.customers)) {
    return row.customers[0] || null;
  }

  return row?.customers || null;
}

function getMetadata(row) {
  const metadata = row?.metadata;

  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

export function normalizeCustomOrderRequest(row) {
  if (!row) {
    return null;
  }

  const customer = getRelatedCustomer(row);
  const metadata = getMetadata(row);
  const ringDesign = metadata.ringDesign && typeof metadata.ringDesign === "object"
    ? metadata.ringDesign
    : {};

  return {
    id: row.id,
    customerId: row.customer_id || customer?.id || null,
    customerName: customer?.full_name || row.full_name || "",
    customerEmail: customer?.email || row.email || "",
    customerPhone: customer?.phone || row.contact_number || "",
    fullName: row.full_name || "",
    companyName: row.company_name || "",
    email: row.email || "",
    contactNumber: row.contact_number || "",
    productCode: row.product_code || "",
    status: row.status || "pending",
    createdAt: row.created_at || null,
    metal: row.metal || "",
    metalPurity: row.metal_purity || "",
    ringSize: row.ring_size === null || row.ring_size === undefined ? null : Number(row.ring_size),
    stoneCarat: row.stone_carat === null || row.stone_carat === undefined ? null : Number(row.stone_carat),
    stoneColor: row.stone_color || "",
    stoneClarity: row.stone_clarity || "",
    stoneCut: row.stone_cut || "",
    origin: row.origin || "",
    metadata,
    ringDesign
  };
}

function normalizePayment(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    orderId: row.order_id || null,
    customerId: row.customer_id || null,
    gateway: row.payment_gateway || "",
    transactionId: row.gateway_transaction_id || "",
    amount: Number(row.amount) || 0,
    currency: row.currency || "THB",
    status: row.status || "pending",
    capturedAt: row.captured_at || null,
    receivedAt: row.received_at || null,
    metadata: row.metadata || {},
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export async function readAdminOrders({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      orders: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("orders")
    .select(ADMIN_ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase orders could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    orders: Array.isArray(data) ? data.map(normalizeOrder) : [],
    checkedAt: new Date().toISOString()
  };
}

export async function readAdminInventoryLogs({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      logs: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("inventory_logs")
    .select("*, products ( id, sku, name, stock_quantity, reserved_quantity )")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase inventory logs could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    logs: Array.isArray(data) ? data.map(normalizeInventoryLog) : [],
    checkedAt: new Date().toISOString()
  };
}

export async function readAdminCustomers({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      customers: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase customers could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    customers: Array.isArray(data) ? data.map(normalizeCustomer) : [],
    checkedAt: new Date().toISOString()
  };
}

export async function readAdminCustomOrderRequests({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      requests: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("custom_order_requests")
    .select(ADMIN_CUSTOM_ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase custom order requests could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    requests: Array.isArray(data) ? data.map(normalizeCustomOrderRequest).filter(Boolean) : [],
    checkedAt: new Date().toISOString()
  };
}

export async function readAdminPayments({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      payments: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase payments could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    payments: Array.isArray(data) ? data.map(normalizePayment) : [],
    checkedAt: new Date().toISOString()
  };
}

export async function createAdminProduct(product, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const status = normalizeAdminProductStatus(product.status);
  const payload = {
    sku: product.sku,
    slug: product.slug || product.sku?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: product.name,
    category: product.category,
    collection: product.collection || null,
    base_price: parseMoneyAmount(product.price) ?? null,
    status,
    stock_quantity: Number(product.stockQty) || 0,
    reserved_quantity: Number(product.reservedQty) || 0,
    metadata: product.metadata || {}
  };

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
  const isActive = updates.isActive !== undefined
    ? updates.isActive
    : status === undefined
      ? undefined
      : status === "active";
  const payload = {
    slug: updates.slug,
    name: updates.name,
    category: updates.category,
    collection: updates.collection,
    base_price: updates.price === undefined ? undefined : parseMoneyAmount(updates.price),
    status,
    stock_quantity: updates.stockQty !== undefined ? Number(updates.stockQty) : undefined,
    reserved_quantity: updates.reservedQty !== undefined ? Number(updates.reservedQty) : undefined,
    metadata: updates.metadata
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

function calculateInventoryQuantities(product, changeType, quantity) {
  const stockQuantity = Number(product.stock_quantity || 0);
  const reservedQuantity = Number(product.reserved_quantity || 0);
  const amount = Number(quantity) || 0;

  if (amount <= 0) {
    throw new Error("Inventory quantity must be greater than zero.");
  }

  if (changeType === "receive" || changeType === "return") {
    return {
      stockQuantity: stockQuantity + amount,
      reservedQuantity
    };
  }

  if (changeType === "reserve") {
    if (stockQuantity - reservedQuantity < amount) {
      throw new Error("Not enough available stock to reserve.");
    }

    return {
      stockQuantity,
      reservedQuantity: reservedQuantity + amount
    };
  }

  if (changeType === "release") {
    if (reservedQuantity < amount) {
      throw new Error("Reserved stock is lower than this quantity.");
    }

    return {
      stockQuantity,
      reservedQuantity: reservedQuantity - amount
    };
  }

  if (changeType === "sale") {
    if (stockQuantity < amount || reservedQuantity < amount) {
      throw new Error("Paid sale needs enough real and reserved stock.");
    }

    return {
      stockQuantity: stockQuantity - amount,
      reservedQuantity: reservedQuantity - amount
    };
  }

  if (changeType === "damage") {
    if (stockQuantity < amount) {
      throw new Error("Real stock is lower than this quantity.");
    }

    return {
      stockQuantity: stockQuantity - amount,
      reservedQuantity
    };
  }

  if (changeType === "adjustment") {
    const nextStockQuantity = stockQuantity + amount;

    if (nextStockQuantity < reservedQuantity) {
      throw new Error("Adjusted stock cannot be lower than reserved stock.");
    }

    return {
      stockQuantity: nextStockQuantity,
      reservedQuantity
    };
  }

  throw new Error("Unsupported inventory movement type.");
}

export async function createAdminInventoryLog(log, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const changeType = log.changeType || log.movementType || "adjustment";
  const quantity = Number(log.quantity) || 0;
  const productId = log.productId || null;

  if (!productId) {
    throw new Error("Product id is required for inventory movement.");
  }

  const productResult = await supabase
    .from("products")
    .select("id, sku, name, stock_quantity, reserved_quantity")
    .eq("id", productId)
    .limit(1)
    .maybeSingle();

  if (productResult.error || !productResult.data) {
    throw new Error(productResult.error?.message || "Product not found for inventory movement.");
  }

  const nextQuantities = calculateInventoryQuantities(productResult.data, changeType, quantity);
  const productUpdate = {
    stock_quantity: nextQuantities.stockQuantity,
    reserved_quantity: nextQuantities.reservedQuantity,
    updated_at: new Date().toISOString()
  };
  const updateResult = await supabase
    .from("products")
    .update(productUpdate)
    .eq("id", productId);

  if (updateResult.error) {
    throw new Error(updateResult.error.message || "Product stock could not be updated.");
  }

  const payload = {
    product_id: productId,
    variant_id: log.variantId || null,
    change_type: changeType,
    quantity,
    note: log.note || "",
    reference_type: log.referenceType || null,
    reference_id: log.referenceId || null,
    metadata: {
      ...(log.metadata || {}),
      stockQuantity: nextQuantities.stockQuantity,
      reservedQuantity: nextQuantities.reservedQuantity
    },
    created_by: log.createdBy || null
  };

  const { data, error } = await supabase
    .from("inventory_logs")
    .insert(payload)
    .select("*, products ( id, sku, name, stock_quantity, reserved_quantity )")
    .single();

  if (error) {
    throw new Error(error.message || "Inventory log could not be created.");
  }

  return normalizeInventoryLog(data);
}

export async function createAdminOrder(orderData, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);

  const productResult = await supabase
    .from("products")
    .select("id, sku, name, stock_quantity, reserved_quantity")
    .eq("id", orderData.productId)
    .limit(1)
    .maybeSingle();

  if (productResult.error || !productResult.data) {
    throw new Error(productResult.error?.message || "Product not found for order.");
  }

  const product = productResult.data;
  const available = Number(product.stock_quantity || 0) - Number(product.reserved_quantity || 0);
  const quantity = Number(orderData.qty) || 1;

  if (available < quantity) {
    throw new Error("Not enough available stock to reserve for this order.");
  }

  const orderNumber = `ORD-${Date.now()}`;

  const orderPayload = {
    order_number: orderNumber,
    status: "draft",
    payment_status: "unpaid",
    channel: orderData.channel || "admin",
    subtotal_amount: Number(orderData.subtotalAmount || 0) || 0,
    discount_amount: Number(orderData.discountAmount || 0) || 0,
    shipping_amount: Number(orderData.shippingAmount || 0) || 0,
    total_amount: Number(orderData.totalAmount || 0) || 0,
    currency: orderData.currency || "THB",
    placed_at: orderData.placedAt || null,
    notes: orderData.notes || "",
    created_at: new Date().toISOString()
  };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select("*")
    .single();

  if (orderError) {
    throw new Error(orderError.message || "Order could not be created.");
  }

  const orderItemPayload = {
    order_id: order.id,
    product_id: product.id,
    product_code: product.sku,
    item_name: product.name || product.sku,
    quantity,
    unit_price_amount: Number(orderData.unitPriceAmount || 0) || 0,
    total_amount: Number(orderData.totalAmount || 0) || 0,
    metadata: orderData.metadata || {}
  };

  const { data: itemData, error: itemError } = await supabase
    .from("order_items")
    .insert(orderItemPayload)
    .select("*")
    .single();

  if (itemError) {
    throw new Error(itemError.message || "Order item could not be created.");
  }

  await createAdminInventoryLog({
    productId: product.id,
    changeType: "reserve",
    quantity,
    note: `Reserved by order ${orderNumber}`
  }, { env, client: supabase });

  const orderWithItems = {
    ...order,
    order_items: [itemData],
    customers: { full_name: orderData.customerName || "Guest", email: orderData.customerEmail || "", phone: orderData.customerPhone || "" }
  };

  return normalizeOrder(orderWithItems);
}

export async function updateAdminOrder(orderId, updates, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);

  if (updates.status === "paid") {
    throw new Error("Payment status must be updated by the payment gateway webhook only.");
  }

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .limit(1)
    .maybeSingle();

  if (existingOrderError || !existingOrder) {
    throw new Error(existingOrderError?.message || "Order not found.");
  }

  if (updates.status === "cancelled" && existingOrder.status !== "cancelled") {
    const item = Array.isArray(existingOrder.order_items) ? existingOrder.order_items[0] : null;

    if (item && item.product_id) {
      await createAdminInventoryLog({
        productId: item.product_id,
        changeType: "release",
        quantity: Number(item.quantity || 0),
        note: `Released reservation for cancelled order ${existingOrder.order_number}`
      }, { env, client: supabase });
    }
  }

  const payload = {
    status: updates.status,
    payment_status: updates.paymentStatus,
    notes: updates.notes,
    updated_at: new Date().toISOString()
  };

  const cleanedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  const { data, error } = await supabase
    .from("orders")
    .update(cleanedPayload)
    .eq("id", orderId)
    .select(ADMIN_ORDER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || "Order could not be updated.");
  }

  return normalizeOrder(data);
}

export async function createAdminPayment(payment, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const payload = {
    order_id: payment.orderId || null,
    customer_id: payment.customerId || null,
    payment_gateway: payment.gateway || "manual",
    gateway_transaction_id: payment.transactionId || null,
    amount: Number(payment.amount) || 0,
    currency: payment.currency || "THB",
    status: payment.status || "pending",
    captured_at: payment.capturedAt || null,
    metadata: payment.metadata || {}
  };

  const { data, error } = await supabase
    .from("payments")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Payment record could not be created.");
  }

  return normalizePayment(data);
}

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
