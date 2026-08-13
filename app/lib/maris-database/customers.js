// Customer records as the admin workspace sees them.

import { sanitizeCustomerMetadata } from "../customer-data.js";
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";

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
    metadata: sanitizeCustomerMetadata(row.metadata || {}),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export function getRelatedCustomer(row) {
  if (Array.isArray(row?.customers)) {
    return row.customers[0] || null;
  }

  return row?.customers || null;
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
