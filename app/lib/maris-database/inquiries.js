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

// ─── Customer account ───────────────────────────────────────────────────────
// What a signed-in customer may see of their own enquiries. Rows are matched on
// customer_id only, which the inquiries route sets from the verified session at
// submission time. Matching on email is deliberately not done: account emails
// are not verified, so anyone could register with another person's address.
// Never returns the email, phone, metadata or any other contact detail.

const CUSTOMER_INQUIRY_SELECT = "id, kind, subject, message, status, fields, created_at";
const EXCERPT_LENGTH = 160;

function readSelectedPieces(fields) {
  const raw = typeof fields?.selected_pieces === "string" ? fields.selected_pieces : "";

  // One piece per line: "1. Title | Collection | Qty 1 | details | /product/slug".
  return raw
    .split(/\r?\n/)
    .map((line) => line.split("|")[0].replace(/^\s*\d+\.\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function buildExcerpt(message) {
  const text = String(message || "").replace(/\s+/g, " ").trim();
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…` : text;
}

export function normalizeCustomerInquiry(row) {
  if (!row) {
    return null;
  }

  const fields = row.fields && typeof row.fields === "object" && !Array.isArray(row.fields) ? row.fields : {};

  return {
    id: row.id,
    kind: row.kind === "quote" ? "quote" : "contact",
    createdAt: row.created_at || null,
    service: typeof fields.service === "string" ? fields.service.slice(0, 80) : "",
    pieces: readSelectedPieces(fields),
    status: row.status || "new",
    excerpt: buildExcerpt(row.message)
  };
}

export async function readCustomerInquiries(customerId, { env = process.env, client, limit = 20 } = {}) {
  const id = String(customerId || "").trim();

  if (!id) {
    return { status: "invalid", inquiries: [], quoteCount: 0, total: 0 };
  }

  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured && !client) {
    return { status: "not_configured", inquiries: [], quoteCount: 0, total: 0 };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("inquiries")
    .select(CUSTOMER_INQUIRY_SELECT)
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(Number(limit) || 20, 1), 50));

  if (error) {
    throw new Error(error.message || "Inquiries could not be loaded.");
  }

  const inquiries = (Array.isArray(data) ? data : []).map(normalizeCustomerInquiry).filter(Boolean);

  return {
    status: "ready",
    inquiries,
    quoteCount: inquiries.filter((inquiry) => inquiry.kind === "quote").length,
    total: inquiries.length
  };
}
