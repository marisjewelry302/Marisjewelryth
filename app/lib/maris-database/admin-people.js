// Read-only customer and newsletter lists for the admin. Columns are named one
// by one (never select("*")), so password hashes and tokens are never loaded.

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";

const PAGE_SIZE = 1000;
// A safety stop, far above what the shop holds. Past it the list says so.
const MAX_ROWS = 20000;

const CUSTOMER_COLUMNS = "id, full_name, email, phone, created_at";
const SUBSCRIBER_COLUMNS = "id, email, customer_id, source, consent, created_at";

async function fetchAllRows(buildQuery) {
  const rows = [];

  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message || "The list could not be loaded.");
    }

    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return { rows, truncated: false };
    }
  }

  return { rows, truncated: true };
}

async function countByCustomer(supabase, table) {
  try {
    const { rows } = await fetchAllRows(() => supabase.from(table).select("customer_id").order("customer_id"));
    const counts = new Map();

    for (const row of rows) {
      counts.set(row.customer_id, (counts.get(row.customer_id) || 0) + 1);
    }

    return counts;
  } catch {
    // The counts are a nicety: a missing table must not hide the customers.
    return null;
  }
}

function notConfigured(config, key) {
  return {
    isConfigured: false,
    missingEnv: config.missingEnv,
    [key]: [],
    truncated: false,
    checkedAt: new Date().toISOString()
  };
}

export async function readAdminCustomerList({ env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return notConfigured(config, "customers");
  }

  const supabase = client || createSupabaseAdminClient(env);
  const [{ rows, truncated }, subscribers, bagCounts, wishlistCounts] = await Promise.all([
    fetchAllRows(() => supabase.from("customers").select(CUSTOMER_COLUMNS).order("created_at", { ascending: false })),
    fetchAllRows(() => supabase.from("customer_email_subscribers").select("email, consent").order("email"))
      .catch(() => ({ rows: null })),
    countByCustomer(supabase, "customer_bags"),
    countByCustomer(supabase, "customer_wishlists")
  ]);

  const consentByEmail = subscribers.rows
    ? new Map(subscribers.rows.map((row) => [String(row.email || "").toLowerCase(), row.consent !== false]))
    : null;

  return {
    isConfigured: true,
    missingEnv: [],
    truncated,
    customers: rows.map((row) => {
      const email = String(row.email || "").trim();
      const consent = consentByEmail ? consentByEmail.get(email.toLowerCase()) : undefined;

      return {
        id: row.id,
        fullName: row.full_name || "",
        email,
        phone: row.phone || "",
        createdAt: row.created_at || null,
        marketing: consent === undefined ? "none" : consent ? "subscribed" : "unsubscribed",
        bagCount: bagCounts ? bagCounts.get(row.id) || 0 : null,
        wishlistCount: wishlistCounts ? wishlistCounts.get(row.id) || 0 : null
      };
    }),
    checkedAt: new Date().toISOString()
  };
}

export async function readAdminNewsletterSubscribers({ env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return notConfigured(config, "subscribers");
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { rows, truncated } = await fetchAllRows(() => supabase
    .from("customer_email_subscribers")
    .select(SUBSCRIBER_COLUMNS)
    .order("created_at", { ascending: false }));

  return {
    isConfigured: true,
    missingEnv: [],
    truncated,
    subscribers: rows.map((row) => ({
      id: row.id,
      email: row.email || "",
      status: row.consent === false ? "unsubscribed" : "subscribed",
      subscribedAt: row.created_at || null,
      source: row.source || "",
      hasAccount: Boolean(row.customer_id)
    })),
    checkedAt: new Date().toISOString()
  };
}
