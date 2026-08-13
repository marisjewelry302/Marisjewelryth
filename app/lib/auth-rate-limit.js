import { createHash } from "node:crypto";
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";

// Only the deployment proxy may decide who the caller is. `x-forwarded-for` is a
// chain the client can seed, so its leftmost entry is attacker-controlled and must
// never key a rate limit. Vercel sets the two single-value headers below itself;
// the chain is a last resort and is read from the right, where the closest trusted
// proxy appends the address it actually received the request from.
function getClientIp(request) {
  const trusted = request.headers.get("x-vercel-forwarded-for")
    || request.headers.get("x-real-ip");

  if (trusted?.trim()) {
    return trusted.trim();
  }

  const chain = String(request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return chain.at(-1) || "unknown";
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
