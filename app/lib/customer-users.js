import { hashCustomerPassword, verifyCustomerPassword } from "./customer-auth.js";
import { sanitizeCustomerMetadata } from "./customer-data.js";
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";
import { deleteEmailSubscriber } from "./customer-subscribers.js";
import {
  PASSWORD_MIN_LENGTH,
  createPasswordResetToken,
  isPasswordResetConfigured,
  isPasswordResetTokenCurrent,
  verifyPasswordResetToken
} from "./customer-password-reset.js";
import { normalizeMarketingEmail, sendPasswordResetEmail } from "./customer-email.js";

const CUSTOMER_COLUMNS = `
  id,
  full_name,
  email,
  phone,
  password_hash,
  metadata,
  created_at,
  updated_at
`;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value) {
  return String(value || "").trim();
}

export function normalizeCustomerProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name || "",
    email: row.email || "",
    phone: row.phone || "",
    metadata: sanitizeCustomerMetadata(row.metadata || {}),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function getClient(env = process.env) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) return { config, client: null };
  return { config, client: createSupabaseAdminClient(env) };
}

// ─── Signup ────────────────────────────────────────────────────────────────

export async function createCustomer({ fullName, email, phone, password }, { env = process.env } = {}) {
  const { config, client: supabase } = getClient(env);

  if (!config.isConfigured) {
    return { status: "not_configured", missingEnv: config.missingEnv };
  }

  const normalizedEmail = normalizeEmail(email);

  if (!cleanText(fullName) || !normalizedEmail || String(password || "").length < 12) {
    const code = cleanText(fullName) && normalizedEmail ? "password_too_short" : "missing_fields";
    return { status: "invalid", code, message: "Name, email, and password (min 12 chars) are required." };
  }

  // Check duplicate email
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    return { status: "duplicate_email", message: "An account with this email already exists." };
  }

  const passwordHash = hashCustomerPassword(password);

  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: cleanText(fullName),
      email: normalizedEmail,
      phone: cleanText(phone),
      password_hash: passwordHash,
      metadata: {}
    })
    .select(CUSTOMER_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || "Customer could not be created.");
  }

  return { status: "created", customer: normalizeCustomerProfile(data) };
}

// ─── Sign In ───────────────────────────────────────────────────────────────

export async function authenticateCustomer(email, password, { env = process.env } = {}) {
  const { config, client: supabase } = getClient(env);

  if (!config.isConfigured) {
    return { status: "not_configured", missingEnv: config.missingEnv };
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return { status: "invalid" };
  }

  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load customer.");

  if (!data) {
    return { status: "invalid" };
  }

  const passwordHash = data.password_hash || data.metadata?.password_hash;

  if (!passwordHash || !verifyCustomerPassword(password, passwordHash)) {
    return { status: "invalid" };
  }

  // Update last_signed_in
  await supabase
    .from("customers")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", data.id);

  return { status: "valid", customer: normalizeCustomerProfile(data) };
}

// ─── Get by ID ─────────────────────────────────────────────────────────────

export async function getCustomerById(id, { env = process.env } = {}) {
  const { config, client: supabase } = getClient(env);

  if (!config.isConfigured) return null;

  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return normalizeCustomerProfile(data);
}

// ─── Update Profile ────────────────────────────────────────────────────────

export async function updateCustomerProfile(id, { fullName, phone, service }, { env = process.env } = {}) {
  const { config, client: supabase } = getClient(env);

  if (!config.isConfigured) {
    return { status: "not_configured" };
  }

  if (!id) return { status: "invalid" };

  const updates = {
    updated_at: new Date().toISOString()
  };

  if (fullName !== undefined) updates.full_name = cleanText(fullName);
  if (phone !== undefined) updates.phone = cleanText(phone);
  if (service !== undefined) {
    // Store preferred service in metadata
    const { data: current } = await supabase
      .from("customers")
      .select("metadata")
      .eq("id", id)
      .maybeSingle();

    updates.metadata = { ...(current?.metadata || {}), preferredService: service };
  }

  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .select(CUSTOMER_COLUMNS)
    .single();

  if (error) throw new Error(error.message || "Profile could not be updated.");

  return { status: "updated", customer: normalizeCustomerProfile(data) };
}

// ─── Change Password ───────────────────────────────────────────────────────

export async function changeCustomerPassword(id, currentPassword, newPassword, { env = process.env, client } = {}) {
  const { config, client: defaultClient } = getClient(env);

  if (!config.isConfigured && !client) return { status: "not_configured" };

  const supabase = client || defaultClient;

  if (String(newPassword || "").length < 12) {
    return { status: "invalid", code: "password_too_short", message: "New password must be at least 12 characters." };
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id, password_hash, metadata")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return { status: "not_found" };

  const currentHash = data.password_hash || data.metadata?.password_hash;

  if (!currentHash || !verifyCustomerPassword(currentPassword, currentHash)) {
    return { status: "wrong_password" };
  }

  const newHash = hashCustomerPassword(newPassword);
  const newMetadata = sanitizeCustomerMetadata(data.metadata || {});

  await supabase
    .from("customers")
    .update({ password_hash: newHash, metadata: newMetadata, updated_at: new Date().toISOString() })
    .eq("id", id);

  return { status: "updated" };
}

// ─── Delete Account ────────────────────────────────────────────────────────

// Erases the account itself, its saved wishlist and bag (removed by the
// foreign keys' ON DELETE CASCADE), and the marketing record for the address.
// Enquiries, quote and custom-order requests, and order and payment records are
// business records the shop may need to keep, so they are not removed here;
// their customer_id is set to null by the foreign keys and the privacy policy
// says how long they are kept.
export async function deleteCustomerAccount(id, password, { env = process.env, client } = {}) {
  const { config, client: defaultClient } = getClient(env);

  if (!config.isConfigured) return { status: "not_configured" };

  const supabase = client || defaultClient;

  const { data, error } = await supabase
    .from("customers")
    .select("id, email, password_hash, metadata")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load customer.");
  if (!data) return { status: "not_found" };

  const passwordHash = data.password_hash || data.metadata?.password_hash;

  if (!passwordHash || !verifyCustomerPassword(password, passwordHash)) {
    return { status: "wrong_password" };
  }

  // The marketing record goes first: if it cannot be deleted the account is
  // left intact and the person can try again, rather than being left with a
  // deleted account and a mailing-list entry nobody can reach.
  await deleteEmailSubscriber(data.email, { env, client });

  const { error: deleteError } = await supabase
    .from("customers")
    .delete()
    .eq("id", id);

  if (deleteError) throw new Error(deleteError.message || "Account could not be deleted.");

  return { status: "deleted" };
}

// ─── Password reset ────────────────────────────────────────────────────────
// Token format and the single-use rule live in customer-password-reset.js.

function readStoredPasswordHash(row) {
  return row?.password_hash || row?.metadata?.password_hash || "";
}

// Looks the account up and emails a reset link when one exists. The caller
// answers every request the same way, so this result is for logs and tests only
// and must never be sent back to the browser.
export async function requestCustomerPasswordReset(
  email,
  { locale = "en", env = process.env, client, now = new Date(), sendEmail = sendPasswordResetEmail } = {}
) {
  const { config, client: defaultClient } = getClient(env);

  if (!config.isConfigured && !client) {
    return { status: "not_configured" };
  }

  if (!isPasswordResetConfigured(env)) {
    return { status: "not_configured" };
  }

  const normalizedEmail = normalizeMarketingEmail(email);

  if (!normalizedEmail) {
    return { status: "no_account" };
  }

  const supabase = client || defaultClient;
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, email, password_hash, metadata")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load customer.");

  const passwordHash = readStoredPasswordHash(data);

  if (!data || !passwordHash) {
    return { status: "no_account" };
  }

  const token = createPasswordResetToken({ customerId: data.id, passwordHash }, { env, now });

  if (!token) {
    return { status: "not_configured" };
  }

  const result = await sendEmail(
    { email: data.email, fullName: data.full_name, token, locale },
    { env }
  );

  return { status: result?.status === "sent" ? "sent" : result?.status || "failed" };
}

// status: "valid" | "expired" | "invalid" | "used" | "not_configured"
// "used" means the signature and expiry are fine but the password has changed
// since the link was issued. It is also what a link for a deleted account gets
// ("invalid"), so a token can never be used to probe for accounts.
export async function inspectPasswordResetToken(token, { env = process.env, client, now = new Date() } = {}) {
  const verified = verifyPasswordResetToken(token, { env, now });

  if (verified.status !== "valid") {
    return { status: verified.status };
  }

  const { config, client: defaultClient } = getClient(env);

  if (!config.isConfigured && !client) {
    return { status: "not_configured" };
  }

  const supabase = client || defaultClient;
  const { data, error } = await supabase
    .from("customers")
    .select("id, password_hash, metadata")
    .eq("id", verified.customerId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load customer.");

  const passwordHash = readStoredPasswordHash(data);

  if (!data || !passwordHash) {
    return { status: "invalid" };
  }

  if (!isPasswordResetTokenCurrent(verified.fingerprint, passwordHash, { env })) {
    return { status: "used" };
  }

  return { status: "valid", customerId: data.id, passwordHash };
}

export async function resetCustomerPasswordWithToken(
  token,
  newPassword,
  { env = process.env, client, now = new Date() } = {}
) {
  if (String(newPassword || "").length < PASSWORD_MIN_LENGTH) {
    return { status: "invalid_password", code: "password_too_short" };
  }

  const inspected = await inspectPasswordResetToken(token, { env, client, now });

  if (inspected.status !== "valid") {
    return { status: inspected.status };
  }

  const { client: defaultClient } = getClient(env);
  const supabase = client || defaultClient;
  const { data: current, error: loadError } = await supabase
    .from("customers")
    .select("metadata")
    .eq("id", inspected.customerId)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message || "Could not load customer.");

  let update = supabase
    .from("customers")
    .update({
      password_hash: hashCustomerPassword(newPassword),
      metadata: sanitizeCustomerMetadata(current?.metadata || {}),
      updated_at: new Date().toISOString()
    })
    .eq("id", inspected.customerId);

  // Compare-and-set on the hash the token was issued for: of two requests that
  // race with the same link, only one can match, so a link works exactly once.
  const storedColumnHash = inspected.passwordHash === current?.metadata?.password_hash ? "" : inspected.passwordHash;

  if (storedColumnHash) {
    update = update.eq("password_hash", storedColumnHash);
  }

  const { data: updated, error } = await update.select("id");

  if (error) throw new Error(error.message || "Password could not be reset.");

  if (!Array.isArray(updated) || updated.length === 0) {
    return { status: "used" };
  }

  return { status: "reset", customerId: inspected.customerId };
}
