// Admin-wide settings kept in the existing `settings` table (key / jsonb value),
// the same table the Best Seller order uses. No new schema: one row per key.
//
// The shop currently has no admin-wide settings to change (an alert level
// was removed on the owner's decision). The route and this module stay in place
// so a future setting is one entry in SETTING_DEFINITIONS, with no new plumbing.
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";

// name -> { key, description, normalize(value) -> value | null (null = rejected) }
export const SETTING_DEFINITIONS = Object.freeze({});

function pickKnownSettings(input) {
  const picked = {};

  for (const name of Object.keys(SETTING_DEFINITIONS)) {
    if (input && Object.prototype.hasOwnProperty.call(input, name)) {
      picked[name] = input[name];
    }
  }

  return picked;
}

export async function readAdminSettings({ env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      missingEnv: config.missingEnv,
      settings: {},
      checkedAt: new Date().toISOString()
    };
  }

  const definitions = Object.entries(SETTING_DEFINITIONS);
  const settings = {};

  if (definitions.length) {
    const supabase = client || createSupabaseAdminClient(env);
    const { data, error } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", definitions.map(([, definition]) => definition.key));

    if (error) {
      throw new Error(error.message || "Settings could not be loaded.");
    }

    for (const [name, definition] of definitions) {
      const row = (data || []).find((item) => item.key === definition.key);
      settings[name] = row?.value ?? null;
    }
  }

  return {
    isConfigured: true,
    missingEnv: [],
    settings,
    checkedAt: new Date().toISOString()
  };
}

export async function updateAdminSettings(input, { env = process.env, client, updatedBy = null } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const picked = pickKnownSettings(input);
  const names = Object.keys(picked);

  if (!names.length) {
    const error = new Error("There are no settings to save.");
    error.status = 400;
    throw error;
  }

  const supabase = client || createSupabaseAdminClient(env);
  const now = new Date().toISOString();

  for (const name of names) {
    const definition = SETTING_DEFINITIONS[name];
    const value = definition.normalize(picked[name]);

    if (value === null) {
      const error = new Error(`${name} is not a valid value.`);
      error.status = 400;
      throw error;
    }

    const { error } = await supabase
      .from("settings")
      .upsert({
        key: definition.key,
        value: { value, updatedAt: now },
        description: definition.description,
        is_public: false,
        updated_by: updatedBy || null,
        updated_at: now
      }, { onConflict: "key" });

    if (error) {
      throw new Error(error.message || "Settings could not be saved.");
    }
  }

  return readAdminSettings({ env, client: supabase });
}
