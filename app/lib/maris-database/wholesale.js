// Wholesale (B2B): accounts, per-product wholesale pricing, and purchase orders.
//
// Every write that moves money or status goes through a security-definer
// function in supabase/migrations/20261106000000_create_wholesale_program.sql,
// so the database, not this file, decides prices and allowed transitions.

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";
import {
  mapWholesaleDatabaseError,
  normalizeWholesaleAccount,
  normalizeWholesaleOrder,
  sortPriceBreaks
} from "../wholesale.js";

export class WholesaleError extends Error {
  constructor(message, statusCode = 400, details = undefined) {
    super(message);
    this.name = "WholesaleError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

const ACCOUNT_SELECT = `
  id, customer_id, company_name, business_type, tax_id, business_address, country,
  website, contact_name, contact_phone, line_id, expected_monthly_volume,
  interested_categories, applicant_note, status, discount_percent, payment_terms,
  admin_note, reviewed_by, reviewed_at, created_at, updated_at
`;

const ADMIN_ACCOUNT_SELECT = `
  ${ACCOUNT_SELECT},
  customers ( id, full_name, email )
`;

const ORDER_SELECT = `
  id, order_number, wholesale_account_id, status, customer_reference, requested_ship_date,
  shipping_address, customer_note, discount_percent, subtotal_amount, discount_amount,
  shipping_amount, total_amount, currency, payment_terms, quote_valid_until,
  tracking_number, metadata, submitted_at, created_at, updated_at,
  wholesale_order_items (
    id, product_id, product_sku, product_name, quantity, list_unit_price, unit_price, line_total
  )
`;

const ADMIN_ORDER_SELECT = `
  ${ORDER_SELECT},
  wholesale_accounts ( id, company_name, contact_name, contact_phone, customers ( email ) )
`;

const WHOLESALE_PRODUCT_SELECT = `
  id, sku, slug, name, category, collection, collection_name, base_price, status,
  cover_image_url, stone_type, carat_weight,
  product_wholesale_settings ( is_enabled, minimum_order_quantity, case_pack, lead_time_days, note ),
  product_wholesale_price_breaks ( min_quantity, unit_price )
`;

function getClient(env, client) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return { config, supabase: null };
  }

  return { config, supabase: client || createSupabaseAdminClient(env) };
}

function notConfigured(config) {
  return { isConfigured: false, missingEnv: config.missingEnv };
}

function throwDatabaseError(error, fallback) {
  const mapped = mapWholesaleDatabaseError(error);
  throw new WholesaleError(mapped.statusCode === 500 ? fallback : mapped.message, mapped.statusCode);
}

// PostgREST returns a one-to-one embed as an object, older versions as an array.
function single(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function normalizeWholesaleProduct(row) {
  const settings = single(row.product_wholesale_settings);

  return {
    id: row.id,
    sku: row.sku || "",
    slug: row.slug || "",
    name: row.name || "",
    category: row.category || "",
    collection: row.collection || "",
    collectionName: row.collection_name || "",
    status: row.status || "",
    basePrice: row.base_price === null || row.base_price === undefined ? null : Number(row.base_price),
    image: row.cover_image_url || "",
    stoneType: row.stone_type || "",
    caratWeight: row.carat_weight || "",
    wholesale: {
      isEnabled: settings?.is_enabled === true,
      minimumOrderQuantity: Number(settings?.minimum_order_quantity) || 1,
      casePack: Number(settings?.case_pack) || 1,
      leadTimeDays: settings?.lead_time_days ?? null,
      note: settings?.note || "",
      priceBreaks: sortPriceBreaks(row.product_wholesale_price_breaks)
    }
  };
}

// ─── Customer side ─────────────────────────────────────────────────────────

export async function readWholesaleAccountForCustomer(customerId, { env = process.env, client } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { data, error } = await supabase
    .from("wholesale_accounts")
    .select(ACCOUNT_SELECT)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throwDatabaseError(error, "Wholesale account could not be loaded.");

  return { isConfigured: true, account: normalizeWholesaleAccount(data, { forCustomer: true }) };
}

// Creates the application, or lets a pending or rejected applicant resubmit.
// Approved and suspended accounts are changed by the atelier only.
export async function submitWholesaleApplication(customerId, application, { env = process.env, client } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { data: existing, error: readError } = await supabase
    .from("wholesale_accounts")
    .select("id, status")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (readError) throwDatabaseError(readError, "Wholesale application could not be saved.");

  if (existing && !["pending", "rejected"].includes(existing.status)) {
    throw new WholesaleError("This wholesale account is already reviewed. Please contact the atelier to change it.", 409);
  }

  const row = {
    customer_id: customerId,
    company_name: application.companyName,
    business_type: application.businessType,
    tax_id: application.taxId || null,
    business_address: application.businessAddress,
    country: application.country,
    website: application.website || null,
    contact_name: application.contactName,
    contact_phone: application.contactPhone,
    line_id: application.lineId || null,
    expected_monthly_volume: application.expectedMonthlyVolume || null,
    interested_categories: application.interestedCategories,
    applicant_note: application.applicantNote || null,
    status: "pending"
  };

  const query = existing
    ? supabase.from("wholesale_accounts").update(row).eq("id", existing.id).in("status", ["pending", "rejected"])
    : supabase.from("wholesale_accounts").insert(row);

  const { data, error } = await query.select(ACCOUNT_SELECT).single();

  if (error) throwDatabaseError(error, "Wholesale application could not be saved.");

  return {
    isConfigured: true,
    isNew: !existing,
    account: normalizeWholesaleAccount(data, { forCustomer: true })
  };
}

// Wholesale-enabled active products, priced for this account in the portal.
export async function readWholesaleCatalogue({ env = process.env, client } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { data, error } = await supabase
    .from("products")
    .select(WHOLESALE_PRODUCT_SELECT)
    .eq("status", "active")
    .order("sku")
    .limit(1000);

  if (error) throwDatabaseError(error, "Wholesale catalogue could not be loaded.");

  const products = (Array.isArray(data) ? data : [])
    .map(normalizeWholesaleProduct)
    .filter((product) => product.wholesale.isEnabled);

  return { isConfigured: true, products };
}

export async function readCustomerWholesaleOrders(accountId, { env = process.env, client, limit = 50 } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { data, error } = await supabase
    .from("wholesale_orders")
    .select(ORDER_SELECT)
    .eq("wholesale_account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throwDatabaseError(error, "Wholesale orders could not be loaded.");

  return {
    isConfigured: true,
    orders: (data || []).map((row) => normalizeWholesaleOrder(row, { forCustomer: true }))
  };
}

export async function submitWholesaleOrder(customerId, order, { env = process.env, client } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { data, error } = await supabase.rpc("maris_submit_wholesale_order", {
    p_customer_id: customerId,
    p_items: order.items,
    p_shipping_address: order.shippingAddress,
    p_customer_reference: order.customerReference || null,
    p_requested_ship_date: order.requestedShipDate || null,
    p_customer_note: order.customerNote || null,
    p_idempotency_key: order.idempotencyKey || null
  });

  if (error) throwDatabaseError(error, "Purchase order could not be submitted.");

  return { isConfigured: true, result: data };
}

export async function readWholesaleOrderById(orderId, { env = process.env, client, forCustomer = false } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { data, error } = await supabase
    .from("wholesale_orders")
    .select(ADMIN_ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error) throwDatabaseError(error, "Wholesale order could not be loaded.");

  return { isConfigured: true, order: normalizeWholesaleOrder(data, { forCustomer }) };
}

export async function customerUpdateWholesaleOrder(customerId, orderId, action, note, { env = process.env, client } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { data, error } = await supabase.rpc("maris_customer_update_wholesale_order", {
    p_order_id: orderId,
    p_customer_id: customerId,
    p_action: action,
    p_note: note || null
  });

  if (error) throwDatabaseError(error, "Order could not be updated.");

  return { isConfigured: true, result: data };
}

// ─── Admin side ────────────────────────────────────────────────────────────

export async function readAdminWholesaleAccounts({ env = process.env, client, limit = 200 } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { data, error } = await supabase
    .from("wholesale_accounts")
    .select(ADMIN_ACCOUNT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throwDatabaseError(error, "Wholesale accounts could not be loaded.");

  return { isConfigured: true, accounts: (data || []).map((row) => normalizeWholesaleAccount(row)) };
}

export async function updateAdminWholesaleAccount(accountId, update, { actor, env = process.env, client } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const row = {};
  if (update.status !== undefined) {
    row.status = update.status;
    row.reviewed_by = String(actor || "").slice(0, 120) || null;
    row.reviewed_at = new Date().toISOString();
  }
  if (update.discountPercent !== undefined) row.discount_percent = update.discountPercent;
  if (update.paymentTerms !== undefined) row.payment_terms = update.paymentTerms;
  if (update.adminNote !== undefined) row.admin_note = update.adminNote || null;

  const { data, error } = await supabase
    .from("wholesale_accounts")
    .update(row)
    .eq("id", accountId)
    .select(ADMIN_ACCOUNT_SELECT)
    .maybeSingle();

  if (error) throwDatabaseError(error, "Wholesale account could not be updated.");
  if (!data) throw new WholesaleError("Wholesale account not found.", 404);

  return { isConfigured: true, account: normalizeWholesaleAccount(data) };
}

// Every product (any status), so the atelier can prepare terms before launch.
export async function readAdminWholesalePricing({ env = process.env, client } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { data, error } = await supabase
    .from("products")
    .select(WHOLESALE_PRODUCT_SELECT)
    .neq("status", "archived")
    .order("sku")
    .limit(2000);

  if (error) throwDatabaseError(error, "Wholesale pricing could not be loaded.");

  return { isConfigured: true, products: (data || []).map(normalizeWholesaleProduct) };
}

export async function setAdminProductWholesalePricing(productId, pricing, { env = process.env, client } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { error } = await supabase.rpc("maris_admin_set_product_wholesale_pricing", {
    p_product_id: productId,
    p_is_enabled: pricing.isEnabled,
    p_minimum_order_quantity: pricing.minimumOrderQuantity,
    p_case_pack: pricing.casePack,
    p_lead_time_days: pricing.leadTimeDays,
    p_note: pricing.note || null,
    p_breaks: pricing.priceBreaks
  });

  if (error) throwDatabaseError(error, "Wholesale pricing could not be saved.");

  const { data, error: readError } = await supabase
    .from("products")
    .select(WHOLESALE_PRODUCT_SELECT)
    .eq("id", productId)
    .maybeSingle();

  if (readError) throwDatabaseError(readError, "Wholesale pricing could not be reloaded.");

  return { isConfigured: true, product: data ? normalizeWholesaleProduct(data) : null };
}

export async function readAdminWholesaleOrders({ env = process.env, client, limit = 200 } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { data, error } = await supabase
    .from("wholesale_orders")
    .select(ADMIN_ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throwDatabaseError(error, "Wholesale orders could not be loaded.");

  return { isConfigured: true, orders: (data || []).map((row) => normalizeWholesaleOrder(row)) };
}

export async function updateAdminWholesaleOrder(orderId, command, { actor, env = process.env, client } = {}) {
  const { config, supabase } = getClient(env, client);
  if (!supabase) return notConfigured(config);

  const { error } = await supabase.rpc("maris_admin_update_wholesale_order", {
    p_order_id: orderId,
    p_action: command.action,
    p_actor: String(actor || "admin").slice(0, 120),
    p_items: command.items,
    p_shipping_amount: command.action === "quote" ? command.shippingAmount : null,
    p_discount_amount: command.action === "quote" ? command.discountAmount : null,
    p_quote_valid_until: command.quoteValidUntil,
    p_tracking_number: command.trackingNumber,
    p_note: command.note || null
  });

  if (error) throwDatabaseError(error, "Wholesale order could not be updated.");

  return readWholesaleOrderById(orderId, { env, client: supabase });
}
