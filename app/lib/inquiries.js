// Submission path for the Contact and Request a Quote forms.
//
// Mirrors app/lib/custom-order-requests.js: validate, reject a repeat of the
// same submission, throttle per email and phone, then save. The row is written
// before any notification is attempted, so a mail problem can never lose an
// enquiry.

import { createHash } from "node:crypto";

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";

const INQUIRY_SELECT = "id, status, created_at";
const DUPLICATE_WINDOW_MINUTES = 10;
const THROTTLE_WINDOW_MINUTES = 60;
const THROTTLE_LIMIT = 5;

export const INQUIRY_KINDS = Object.freeze(new Set(["contact", "quote"]));

// Columns on the table. Anything else the form sent is kept in `fields`.
const CORE_FIELDS = new Set(["name", "full_name", "email", "phone", "message", "subject", "source_page"]);
// Never store these: they are form plumbing, not answers.
const IGNORED_FIELDS = new Set(["form-name", "subject", "source_page"]);

const MAX_TEXT = 500;
const MAX_MESSAGE = 4000;
const MAX_FIELDS = 40;

function cleanText(value, limit = MAX_TEXT) {
  return String(value ?? "").trim().slice(0, limit);
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function digitsOf(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeInquiryInput(input = {}) {
  const kind = INQUIRY_KINDS.has(input.kind) ? input.kind : "contact";
  const raw = input.fields && typeof input.fields === "object" && !Array.isArray(input.fields)
    ? input.fields
    : {};

  const extras = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (CORE_FIELDS.has(key) || IGNORED_FIELDS.has(key)) continue;
    if (count >= MAX_FIELDS) break;
    const text = cleanText(value, MAX_MESSAGE);
    if (!text) continue;
    extras[cleanText(key, 80)] = text;
    count += 1;
  }

  const phone = cleanText(raw.phone ?? input.phone, 60);

  return {
    kind,
    fullName: cleanText(raw.name ?? raw.full_name ?? input.fullName, 200),
    email: normalizeEmail(raw.email ?? input.email),
    phone,
    phoneDigits: digitsOf(phone),
    subject: cleanText(input.subject, 200),
    sourcePage: cleanText(input.sourcePage, 300),
    message: cleanText(raw.message ?? input.message, MAX_MESSAGE),
    fields: extras
  };
}

export function validateInquiry(inquiry) {
  const errors = [];

  if (!inquiry.fullName) errors.push({ field: "name", message: "Name is required." });
  if (!inquiry.email) errors.push({ field: "email", message: "Email is required." });
  else if (!isValidEmail(inquiry.email)) errors.push({ field: "email", message: "Email is not valid." });
  if (!INQUIRY_KINDS.has(inquiry.kind)) errors.push({ field: "kind", message: "Unsupported inquiry type." });

  return errors;
}

export function buildInquiryFingerprint(inquiry) {
  return createHash("sha256").update(JSON.stringify({
    kind: inquiry.kind,
    email: inquiry.email,
    phoneDigits: inquiry.phoneDigits,
    message: inquiry.message,
    fields: inquiry.fields
  })).digest("hex");
}

async function findDuplicate(supabase, fingerprint, now) {
  const cutoff = new Date((typeof now === "function" ? now() : new Date()).getTime() - DUPLICATE_WINDOW_MINUTES * 60 * 1000);
  const { data, error } = await supabase
    .from("inquiries")
    .select(INQUIRY_SELECT)
    .eq("metadata->>requestFingerprint", fingerprint)
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || "Inquiry lookup failed.");
  return data || null;
}

async function countRecent(supabase, column, value, now) {
  if (!value) return 0;

  const cutoff = new Date((typeof now === "function" ? now() : new Date()).getTime() - THROTTLE_WINDOW_MINUTES * 60 * 1000);
  const { count, error } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .gte("created_at", cutoff.toISOString());

  if (error) throw new Error(error.message || "Inquiry throttle check failed.");
  return count || 0;
}

export async function createInquiry(input, { env = process.env, client, now = () => new Date(), sendEmails } = {}) {
  const inquiry = normalizeInquiryInput(input);
  const errors = validateInquiry(inquiry);

  if (errors.length) {
    return { status: "invalid", errors };
  }

  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return { status: "not_configured", missingEnv: config.missingEnv };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const fingerprint = buildInquiryFingerprint(inquiry);
  const duplicate = await findDuplicate(supabase, fingerprint, now);

  if (duplicate) {
    return { status: "duplicate", inquiryId: duplicate.id, inquiryStatus: duplicate.status };
  }

  const [byEmail, byPhone] = await Promise.all([
    countRecent(supabase, "email", inquiry.email, now),
    countRecent(supabase, "metadata->>phoneDigits", inquiry.phoneDigits, now)
  ]);

  if (byEmail >= THROTTLE_LIMIT || byPhone >= THROTTLE_LIMIT) {
    return { status: "rate_limited" };
  }

  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      kind: inquiry.kind,
      full_name: inquiry.fullName,
      email: inquiry.email,
      phone: inquiry.phone || null,
      subject: inquiry.subject || null,
      source_page: inquiry.sourcePage || null,
      message: inquiry.message || null,
      fields: inquiry.fields,
      metadata: {
        requestFingerprint: fingerprint,
        phoneDigits: inquiry.phoneDigits
      }
    })
    .select(INQUIRY_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || "Inquiry could not be saved.");
  }

  const created = { status: "created", inquiryId: data.id, inquiryStatus: data.status };

  // Saved already. Notification is a bonus and must not change the outcome.
  if (!sendEmails) {
    return created;
  }

  try {
    const emailResult = await sendEmails({ inquiry, inquiryId: data.id });

    if (emailResult?.status === "not_configured") {
      return { ...created, status: "email_not_configured", missingEnv: emailResult.missingEnv || [] };
    }

    if (emailResult?.status && emailResult.status !== "sent") {
      return { ...created, status: "email_failed" };
    }
  } catch {
    return { ...created, status: "email_failed" };
  }

  return created;
}
