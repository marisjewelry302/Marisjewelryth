import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";
import { normalizeMarketingEmail } from "./customer-email.js";

const SUBSCRIBER_TABLE = "customer_email_subscribers";
const THROTTLE_WINDOW_MINUTES = 60;
const THROTTLE_LIMIT = 5;
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

export async function upsertEmailSubscriber({ email, source = "account", customerId = null, metadata = null }, { env = process.env, client } = {}) {
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
    source: cleanText(source) || "account",
    consent: true
  };

  // The upsert only writes the keys present here, so leaving customer_id out
  // keeps an existing account link intact. An anonymous newsletter signup for
  // an address that already has an account must not unlink that account.
  if (customerId) {
    payload.customer_id = customerId;
  }

  // Same reasoning as customer_id: omitted rather than blanked, so a repeat
  // signup does not wipe what an earlier one recorded.
  if (metadata) {
    payload.metadata = metadata;
  }

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

// Mirrors the throttle in app/lib/inquiries.js: count matching rows inside a
// rolling window and refuse past the limit.
//
// The column differs because the table does. Inquiries append a row per
// submission, so counting by email works there. Here email is unique and the
// write is an upsert, so one address can never hold more than one row and an
// email count would never reach the limit. The flood worth stopping is a script
// posting many different addresses, which is what the caller key counts.
async function countRecentSubscribers(supabase, column, value, now) {
  if (!value) {
    return 0;
  }

  const cutoff = new Date((typeof now === "function" ? now() : new Date()).getTime() - THROTTLE_WINDOW_MINUTES * 60 * 1000);
  const { count, error } = await supabase
    .from(SUBSCRIBER_TABLE)
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .gte("created_at", cutoff.toISOString());

  if (error) {
    throw new Error(error.message || "Subscriber throttle check failed.");
  }

  return count || 0;
}

export async function subscribeToNewsletter(
  { email, source = "newsletter", clientKey = "" },
  { env = process.env, client, now = () => new Date() } = {}
) {
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

  const recent = await countRecentSubscribers(supabase, "metadata->>clientKey", clientKey, now);

  if (recent >= THROTTLE_LIMIT) {
    return { status: "rate_limited", subscriber: null };
  }

  return upsertEmailSubscriber(
    {
      email: normalizedEmail,
      source,
      metadata: clientKey ? { clientKey } : null
    },
    { env, client: supabase }
  );
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
