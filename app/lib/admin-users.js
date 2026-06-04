import { getAdminConfig, hashAdminPassword, verifyAdminPassword } from "./admin-auth.js";
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";

const ADMIN_USER_COLUMNS = `
  id,
  username,
  display_name,
  role,
  is_active,
  password_hash
`;

function cleanText(value) {
  return String(value || "").trim();
}

export function normalizeAdminUsername(value) {
  return cleanText(value).toLowerCase();
}

function normalizeAdminUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username || "",
    displayName: row.display_name || "",
    role: row.role || "admin",
    isActive: row.is_active !== false
  };
}

function getAdminUsersConfig(env = process.env) {
  const databaseConfig = getSupabaseAdminConfig(env);
  const sessionConfig = getAdminConfig(env);
  const missingEnv = [...databaseConfig.missingEnv];

  if (!sessionConfig.isSessionConfigured) {
    missingEnv.push("MARIS_ADMIN_SESSION_SECRET");
  }

  return {
    ...databaseConfig,
    isConfigured: databaseConfig.isConfigured && sessionConfig.isSessionConfigured,
    missingEnv
  };
}

function getAdminUsersClient({ env = process.env, client } = {}) {
  const config = getAdminUsersConfig(env);

  if (!config.isConfigured) {
    return { config, client: null };
  }

  return {
    config,
    client: client || createSupabaseAdminClient(env)
  };
}

async function countAdminUsers({ env = process.env, client } = {}) {
  const { config, client: supabase } = getAdminUsersClient({ env, client });

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      missingEnv: config.missingEnv,
      count: null
    };
  }

  const { count, error } = await supabase
    .from("admin_users")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(error.message || "Admin users could not be counted.");
  }

  return {
    isConfigured: true,
    missingEnv: [],
    count: typeof count === "number" ? count : 0
  };
}

export async function getAdminSetupState({ env = process.env, client } = {}) {
  const result = await countAdminUsers({ env, client });
  const hasAdminUsers = result.count > 0;

  return {
    isConfigured: result.isConfigured,
    missingEnv: result.missingEnv,
    adminUserCount: result.count,
    hasAdminUsers,
    canCreateInitialAdmin: result.isConfigured && !hasAdminUsers
  };
}

export async function authenticateAdminUser(username, password, { env = process.env, client } = {}) {
  const normalizedUsername = normalizeAdminUsername(username);
  const { config, client: supabase } = getAdminUsersClient({ env, client });

  if (!config.isConfigured) {
    return {
      status: "not_configured",
      missingEnv: config.missingEnv
    };
  }

  if (!normalizedUsername || !password) {
    return { status: "invalid" };
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select(ADMIN_USER_COLUMNS)
    .eq("username", normalizedUsername)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Admin user could not be loaded.");
  }

  if (!data || data.is_active === false || !verifyAdminPassword(password, data.password_hash)) {
    return { status: "invalid" };
  }

  await supabase
    .from("admin_users")
    .update({ last_signed_in_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    status: "valid",
    user: normalizeAdminUser(data)
  };
}

export async function createInitialAdminUser({ username, displayName, password }, { env = process.env, client } = {}) {
  const normalizedUsername = normalizeAdminUsername(username);

  if (!normalizedUsername || String(password || "").length < 8) {
    return { status: "invalid" };
  }

  const setupState = await getAdminSetupState({ env, client });

  if (!setupState.isConfigured) {
    return {
      status: "not_configured",
      missingEnv: setupState.missingEnv
    };
  }

  if (setupState.hasAdminUsers) {
    return { status: "already_exists" };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      username: normalizedUsername,
      display_name: cleanText(displayName) || normalizedUsername,
      role: "owner",
      is_active: true,
      password_hash: hashAdminPassword(password)
    })
    .select(ADMIN_USER_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || "Initial admin user could not be created.");
  }

  return {
    status: "created",
    user: normalizeAdminUser(data)
  };
}
