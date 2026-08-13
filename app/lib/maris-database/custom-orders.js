// Custom order requests plus their status and history tracking.

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";
import { getRelatedCustomer } from "./customers.js";
import { getMetadata } from "./shared.js";

export const ADMIN_CUSTOM_ORDER_STATUSES = Object.freeze([
  "pending",
  "contacted",
  "completed",
  "cancelled"
]);

const ADMIN_CUSTOM_ORDER_NOTE_LIMIT = 1000;

const ADMIN_CUSTOM_ORDER_HISTORY_LIMIT = 50;

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
  updated_at,
  customers (
    id,
    full_name,
    email,
    phone
  )
`;

function normalizeCustomOrderTracking(metadata) {
  const tracking = metadata?.tracking;

  if (!tracking || typeof tracking !== "object" || Array.isArray(tracking)) {
    return {
      lastActionAt: null,
      lastActionBy: "",
      history: []
    };
  }

  const history = Array.isArray(tracking.history)
    ? tracking.history.slice(-ADMIN_CUSTOM_ORDER_HISTORY_LIMIT).map((event) => ({
        at: event?.at || null,
        actor: String(event?.actor || ""),
        fromStatus: String(event?.fromStatus || ""),
        toStatus: String(event?.toStatus || ""),
        note: String(event?.note || "")
      }))
    : [];

  return {
    lastActionAt: tracking.lastActionAt || history.at(-1)?.at || null,
    lastActionBy: String(tracking.lastActionBy || history.at(-1)?.actor || ""),
    history
  };
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
  const tracking = normalizeCustomOrderTracking(metadata);

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
    updatedAt: row.updated_at || null,
    metal: row.metal || "",
    metalPurity: row.metal_purity || "",
    ringSize: row.ring_size === null || row.ring_size === undefined ? null : Number(row.ring_size),
    stoneCarat: row.stone_carat === null || row.stone_carat === undefined ? null : Number(row.stone_carat),
    stoneColor: row.stone_color || "",
    stoneClarity: row.stone_clarity || "",
    stoneCut: row.stone_cut || "",
    origin: row.origin || "",
    metadata,
    ringDesign,
    tracking
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

export class AdminCustomOrderRequestError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AdminCustomOrderRequestError";
    this.statusCode = statusCode;
  }
}

export async function updateAdminCustomOrderRequest(requestId, updates = {}, {
  env = process.env,
  client,
  actor = "admin",
  now
} = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    throw new AdminCustomOrderRequestError(
      `Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`,
      503
    );
  }

  const cleanRequestId = String(requestId || "").trim();
  const requestedStatus = updates.status === undefined
    ? null
    : String(updates.status || "").trim().toLowerCase();
  const note = String(updates.note || "").trim();

  if (!cleanRequestId) {
    throw new AdminCustomOrderRequestError("Custom request id is required.");
  }

  if (requestedStatus && !ADMIN_CUSTOM_ORDER_STATUSES.includes(requestedStatus)) {
    throw new AdminCustomOrderRequestError("Custom request status is not supported.");
  }

  if (note.length > ADMIN_CUSTOM_ORDER_NOTE_LIMIT) {
    throw new AdminCustomOrderRequestError(`Follow-up note must be ${ADMIN_CUSTOM_ORDER_NOTE_LIMIT} characters or fewer.`);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data: existing, error: existingError } = await supabase
    .from("custom_order_requests")
    .select(ADMIN_CUSTOM_ORDER_SELECT)
    .eq("id", cleanRequestId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new AdminCustomOrderRequestError(existingError.message || "Custom request could not be loaded.", 500);
  }

  if (!existing) {
    throw new AdminCustomOrderRequestError("Custom request not found.", 404);
  }

  const currentStatus = ADMIN_CUSTOM_ORDER_STATUSES.includes(existing.status) ? existing.status : "pending";
  const nextStatus = requestedStatus || currentStatus;

  if (nextStatus === currentStatus && !note) {
    throw new AdminCustomOrderRequestError("Change the status or add a follow-up note before saving.");
  }

  const metadata = getMetadata(existing);
  const previousTracking = normalizeCustomOrderTracking(metadata);
  const actionAt = (typeof now === "function" ? now() : new Date()).toISOString();
  const actionBy = String(actor || "admin").trim().slice(0, 120) || "admin";
  const history = [...previousTracking.history, {
    at: actionAt,
    actor: actionBy,
    fromStatus: currentStatus,
    toStatus: nextStatus,
    note
  }].slice(-ADMIN_CUSTOM_ORDER_HISTORY_LIMIT);
  const nextMetadata = {
    ...metadata,
    tracking: {
      lastActionAt: actionAt,
      lastActionBy: actionBy,
      history
    }
  };

  let updateQuery = supabase
    .from("custom_order_requests")
    .update({
      status: nextStatus,
      metadata: nextMetadata
    })
    .eq("id", cleanRequestId);

  if (existing.updated_at) {
    updateQuery = updateQuery.eq("updated_at", existing.updated_at);
  }

  const { data, error } = await updateQuery
    .select(ADMIN_CUSTOM_ORDER_SELECT)
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") {
      throw new AdminCustomOrderRequestError(
        "This request changed in another admin session. Refresh and try again.",
        409
      );
    }

    throw new AdminCustomOrderRequestError(error?.message || "Custom request could not be updated.", 500);
  }

  return normalizeCustomOrderRequest(data);
}
