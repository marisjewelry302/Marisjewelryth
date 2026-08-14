// Website contact and quote-request leads, as the admin workspace reads them.
// Submission lives in app/lib/inquiries.js; this module owns the read contract.

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";

const ADMIN_INQUIRY_SELECT = `
  id,
  customer_id,
  kind,
  full_name,
  email,
  phone,
  subject,
  source_page,
  message,
  status,
  fields,
  metadata,
  created_at,
  updated_at
`;

export const ADMIN_INQUIRY_STATUSES = Object.freeze(["new", "read", "replied", "closed"]);

export function normalizeInquiry(row) {
  if (!row) {
    return null;
  }

  const fields = row.fields && typeof row.fields === "object" && !Array.isArray(row.fields)
    ? row.fields
    : {};

  return {
    id: row.id,
    customerId: row.customer_id || null,
    kind: row.kind || "contact",
    fullName: row.full_name || "",
    email: row.email || "",
    phone: row.phone || "",
    subject: row.subject || "",
    sourcePage: row.source_page || "",
    message: row.message || "",
    status: row.status || "new",
    // Only the form answers. metadata holds server-side annotations and is not
    // part of the response.
    fields,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export async function readAdminInquiries({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      inquiries: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("inquiries")
    .select(ADMIN_INQUIRY_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase inquiries could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    inquiries: Array.isArray(data) ? data.map(normalizeInquiry).filter(Boolean) : [],
    checkedAt: new Date().toISOString()
  };
}

export async function updateAdminInquiryStatus(inquiryId, status, { env = process.env, client } = {}) {
  if (!inquiryId) {
    return { status: "invalid", message: "Inquiry id is required." };
  }

  if (!ADMIN_INQUIRY_STATUSES.includes(status)) {
    return { status: "invalid", message: "Unsupported inquiry status." };
  }

  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return { status: "not_configured", missingEnv: config.missingEnv };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", inquiryId)
    .select(ADMIN_INQUIRY_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Inquiry could not be updated.");
  }

  if (!data) {
    return { status: "not_found" };
  }

  return { status: "updated", inquiry: normalizeInquiry(data) };
}
