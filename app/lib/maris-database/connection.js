// Supabase environment resolution, the service-role client, and the health probe.
// Every other module in this folder builds on it.

import { createClient } from "@supabase/supabase-js";

export const MARIS_DATABASE_TABLES = Object.freeze([
  "admin_users",
  "auth_rate_limits",
  "customers",
  "custom_order_requests",
  "inventory_movements",
  "inventory_logs",
  "orders",
  "order_items",
  "payments",
  "product_images",
  "product_variants",
  "products",
  "settings"
]);

const SUPABASE_URL_ENV = "SUPABASE_URL";

const NEXT_PUBLIC_SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";

const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";

function cleanEnvValue(value) {
  const cleanValue = String(value || "").trim();

  if (
    !cleanValue
    || /^replace-with-/i.test(cleanValue)
    || /^your[_-]/i.test(cleanValue)
    || /^https:\/\/your-project/i.test(cleanValue)
  ) {
    return "";
  }

  return cleanValue;
}

function getProjectRef(url) {
  try {
    const hostname = new URL(url).hostname;
    const [projectRef] = hostname.split(".");

    return projectRef || null;
  } catch (error) {
    return null;
  }
}

function readSupabaseAdminEnv(env = process.env) {
  return {
    url: cleanEnvValue(env[SUPABASE_URL_ENV] || env[NEXT_PUBLIC_SUPABASE_URL_ENV]),
    serviceRoleKey: cleanEnvValue(env[SUPABASE_SERVICE_ROLE_KEY_ENV])
  };
}

export function getSupabaseAdminConfig(env = process.env) {
  const { url, serviceRoleKey } = readSupabaseAdminEnv(env);
  const missingEnv = [];

  if (!url) {
    missingEnv.push(SUPABASE_URL_ENV);
  }

  if (!serviceRoleKey) {
    missingEnv.push(SUPABASE_SERVICE_ROLE_KEY_ENV);
  }

  return {
    isConfigured: missingEnv.length === 0,
    url,
    projectRef: url ? getProjectRef(url) : null,
    hasServiceRoleKey: Boolean(serviceRoleKey),
    missingEnv,
    tables: [...MARIS_DATABASE_TABLES]
  };
}

export function createSupabaseAdminClient(env = process.env) {
  const { url, serviceRoleKey } = readSupabaseAdminEnv(env);
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    },
    global: {
      headers: {
        "X-Client-Info": "maris-jewelry-admin"
      }
    }
  });
}

export async function readAdminDatabaseStatus({ env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      tables: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const tables = await Promise.all(MARIS_DATABASE_TABLES.map(async (tableName) => {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });

      if (error) {
        return {
          name: tableName,
          isReachable: false,
          rowCount: null,
          error: error.message || String(error)
        };
      }

      return {
        name: tableName,
        isReachable: true,
        rowCount: typeof count === "number" ? count : null,
        error: null
      };
    } catch (error) {
      return {
        name: tableName,
        isReachable: false,
        rowCount: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }));

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    tables,
    checkedAt: new Date().toISOString()
  };
}
