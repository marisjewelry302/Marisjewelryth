import { createHash } from "node:crypto";
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return String(forwarded?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
}

function createRateLimitKey(request, action, identifier) {
  return createHash("sha256")
    .update(`${String(action).trim().toLowerCase()}\n${getClientIp(request)}\n${String(identifier || "").trim().toLowerCase()}`)
    .digest("hex");
}

export async function consumeAuthAttempt({
  request,
  action,
  identifier,
  maxAttempts = 6,
  windowSeconds = 15 * 60,
  blockSeconds = 30 * 60,
  success = false,
  env = process.env,
  client
}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return { allowed: false, status: "not_configured", retryAfterSeconds: 0 };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase.rpc("maris_consume_auth_rate_limit", {
    p_key_hash: createRateLimitKey(request, action, identifier),
    p_action: action,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
    p_block_seconds: blockSeconds,
    p_success: success
  });

  if (error) {
    throw new Error(error.message || "Authentication rate limit could not be checked.");
  }

  return {
    allowed: data?.allowed === true,
    status: "ready",
    remaining: Number(data?.remaining) || 0,
    retryAfterSeconds: Number(data?.retryAfterSeconds) || 0
  };
}
