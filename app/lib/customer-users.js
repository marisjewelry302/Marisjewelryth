import { hashCustomerPassword, verifyCustomerPassword } from "./customer-auth.js";
import { sanitizeCustomerMetadata } from "./customer-data.js";
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";
import { deleteEmailSubscriber } from "./customer-subscribers.js";

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
    return { status: "invalid", message: "Name, email, and password (min 12 chars) are required." };
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

export async function changeCustomerPassword(id, currentPassword, newPassword, { env = process.env } = {}) {
  const { config, client: supabase } = getClient(env);

  if (!config.isConfigured) return { status: "not_configured" };

  if (String(newPassword || "").length < 12) {
    return { status: "invalid", message: "New password must be at least 12 characters." };
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
