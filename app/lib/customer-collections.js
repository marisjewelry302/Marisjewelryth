import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";

const WISHLIST_TABLE = "customer_wishlists";
const BAG_TABLE = "customer_bags";
const MAX_BAG_QUANTITY = 9;

function getCollectionClient({ env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return { config, client: null };
  }

  return {
    config,
    client: client || createSupabaseAdminClient(env)
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function cloneJsonObject(value) {
  try {
    const cloned = JSON.parse(JSON.stringify(value));
    return cloned && typeof cloned === "object" && !Array.isArray(cloned) ? cloned : null;
  } catch {
    return null;
  }
}

function getItemId(item) {
  return cleanText(item?.id || item?.productId || item?.href || item?.title || item?.sku);
}

function clampBagQuantity(value) {
  const quantity = Math.round(Number(value) || 1);
  return Math.max(1, Math.min(MAX_BAG_QUANTITY, quantity));
}

export function normalizeCollectionItems(items, { withQuantity = false } = {}) {
  if (!Array.isArray(items)) {
    return [];
  }

  const seen = new Set();
  const normalizedItems = [];

  for (const rawItem of items) {
    const item = cloneJsonObject(rawItem);

    if (!item) {
      continue;
    }

    const id = getItemId(item);

    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    item.id = id;

    if (withQuantity) {
      item.quantity = clampBagQuantity(item.quantity);
    }

    normalizedItems.push(item);
  }

  return normalizedItems;
}

function normalizeCollectionRows(rows, { withQuantity = false } = {}) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return normalizeCollectionItems(
    rows.map((row) => {
      const item = cloneJsonObject(row?.item_data) || {};
      item.id = getItemId(item) || cleanText(row?.item_id);

      if (withQuantity) {
        item.quantity = clampBagQuantity(row?.quantity ?? item.quantity);
      }

      return item;
    }),
    { withQuantity }
  );
}

async function readCustomerCollection(customerId, { tableName, withQuantity, env, client }) {
  const { config, client: supabase } = getCollectionClient({ env, client });

  if (!config.isConfigured) {
    return {
      status: "not_configured",
      missingEnv: config.missingEnv,
      items: []
    };
  }

  if (!customerId) {
    return { status: "invalid", items: [] };
  }

  const columns = withQuantity
    ? "item_id, item_data, quantity, created_at"
    : "item_id, item_data, created_at";
  const { data, error } = await supabase
    .from(tableName)
    .select(columns)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Customer collection could not be loaded.");
  }

  return {
    status: "ready",
    items: normalizeCollectionRows(data, { withQuantity })
  };
}

async function replaceCustomerCollection(customerId, items, { tableName, withQuantity, env, client }) {
  const { config, client: supabase } = getCollectionClient({ env, client });

  if (!config.isConfigured) {
    return {
      status: "not_configured",
      missingEnv: config.missingEnv,
      items: []
    };
  }

  if (!customerId) {
    return { status: "invalid", items: [] };
  }

  const normalizedItems = normalizeCollectionItems(items, { withQuantity });
  const deleteResult = await supabase
    .from(tableName)
    .delete()
    .eq("customer_id", customerId);

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message || "Customer collection could not be replaced.");
  }

  if (normalizedItems.length > 0) {
    const rows = normalizedItems.map((item) => {
      const row = {
        customer_id: customerId,
        item_id: item.id,
        item_data: item
      };

      if (withQuantity) {
        row.quantity = clampBagQuantity(item.quantity);
      }

      return row;
    });
    const insertResult = await supabase
      .from(tableName)
      .insert(rows);

    if (insertResult.error) {
      throw new Error(insertResult.error.message || "Customer collection could not be saved.");
    }
  }

  return {
    status: "saved",
    items: normalizedItems
  };
}

export function readCustomerWishlist(customerId, options = {}) {
  return readCustomerCollection(customerId, {
    ...options,
    tableName: WISHLIST_TABLE,
    withQuantity: false
  });
}

export function replaceCustomerWishlist(customerId, items, options = {}) {
  return replaceCustomerCollection(customerId, items, {
    ...options,
    tableName: WISHLIST_TABLE,
    withQuantity: false
  });
}

export function readCustomerBag(customerId, options = {}) {
  return readCustomerCollection(customerId, {
    ...options,
    tableName: BAG_TABLE,
    withQuantity: true
  });
}

export function replaceCustomerBag(customerId, items, options = {}) {
  return replaceCustomerCollection(customerId, items, {
    ...options,
    tableName: BAG_TABLE,
    withQuantity: true
  });
}

