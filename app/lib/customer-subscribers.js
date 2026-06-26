import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";
import { normalizeMarketingEmail } from "./customer-email.js";

const SUBSCRIBER_TABLE = "customer_email_subscribers";
const SUBSCRIBER_COLUMNS = `
  id,
  email,
  customer_id,
  source,
  consent,
  welcome_email_sent_at,
  last_welcome_email_id,
  created_at,
  updated_at
`;

function cleanText(value) {
  return String(value || "").trim();
}

function getSubscribersClient({ env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return { config, client: null };
  }

  return {
    config,
    client: client || createSupabaseAdminClient(env)
  };
}

function normalizeSubscriber(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email || "",
    customerId: row.customer_id || null,
    source: row.source || "account",
    consent: row.consent !== false,
    welcomeEmailSentAt: row.welcome_email_sent_at || null,
    lastWelcomeEmailId: row.last_welcome_email_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export async function upsertEmailSubscriber({ email, source = "account", customerId = null }, { env = process.env, client } = {}) {
  const { config, client: supabase } = getSubscribersClient({ env, client });

  if (!config.isConfigured) {
    return {
      status: "not_configured",
      missingEnv: config.missingEnv,
      subscriber: null
    };
  }

  const normalizedEmail = normalizeMarketingEmail(email);

  if (!normalizedEmail) {
    return { status: "invalid", subscriber: null };
  }

  const payload = {
    email: normalizedEmail,
    customer_id: customerId || null,
    source: cleanText(source) || "account",
    consent: true
  };
  const { data, error } = await supabase
    .from(SUBSCRIBER_TABLE)
    .upsert(payload, { onConflict: "email" })
    .select(SUBSCRIBER_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || "Email subscriber could not be saved.");
  }

  return {
    status: "ready",
    subscriber: normalizeSubscriber(data)
  };
}

export async function markWelcomeEmailSent(email, { customerId = null, resendEmailId = null } = {}, { env = process.env, client, now = () => new Date() } = {}) {
  const { config, client: supabase } = getSubscribersClient({ env, client });

  if (!config.isConfigured) {
    return {
      status: "not_configured",
      missingEnv: config.missingEnv,
      subscriber: null
    };
  }

  const normalizedEmail = normalizeMarketingEmail(email);

  if (!normalizedEmail) {
    return { status: "invalid", subscriber: null };
  }

  const { data, error } = await supabase
    .from(SUBSCRIBER_TABLE)
    .update({
      customer_id: customerId || null,
      welcome_email_sent_at: now().toISOString(),
      last_welcome_email_id: resendEmailId || null
    })
    .eq("email", normalizedEmail)
    .select(SUBSCRIBER_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || "Welcome email status could not be saved.");
  }

  return {
    status: "updated",
    subscriber: normalizeSubscriber(data)
  };
}
