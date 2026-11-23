import { createHmac, timingSafeEqual } from "node:crypto";

// Password-reset links are signed, expiring and single use, and need no database
// column:
//
//   token = base64url(JSON { v, sub, fp, exp }) + "." + HMAC-SHA256(secret, purpose + "." + payload)
//
// - sub is the customer id; exp is a Unix time in milliseconds.
// - fp is a keyed fingerprint (HMAC, not a plain hash) of the customer's current
//   password hash. Once the password changes, the fingerprint no longer matches, so
//   a link that has been used, or one issued before the password was changed some
//   other way, stops working. The fingerprint cannot be used to guess the hash.
// - The signing secret is the customer session secret the project already uses for
//   signed tokens. The purpose prefix keeps a reset signature from being valid as a
//   session or an unsubscribe signature, and the other way round.
// - The token carries no email address and no password material.

const TOKEN_PURPOSE = "maris-customer-password-reset-v1";
const FINGERPRINT_PURPOSE = "maris-customer-password-reset-fingerprint-v1";
const TOKEN_VERSION = 1;

export const PASSWORD_RESET_TTL_SECONDS = 45 * 60;
export const PASSWORD_MIN_LENGTH = 12;

function readSecret(env) {
  const value = String(env.MARIS_CUSTOMER_SESSION_SECRET || env.CUSTOMER_SESSION_SECRET || "").trim();
  return !value || /^replace-with-/i.test(value) ? "" : value;
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(`${TOKEN_PURPOSE}.${payload}`).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isPasswordResetConfigured(env = process.env) {
  return Boolean(readSecret(env));
}

export function fingerprintPasswordHash(passwordHash, { env = process.env } = {}) {
  const secret = readSecret(env);

  if (!secret || !passwordHash) {
    return "";
  }

  return createHmac("sha256", secret)
    .update(`${FINGERPRINT_PURPOSE}.${passwordHash}`)
    .digest("base64url")
    .slice(0, 32);
}

export function createPasswordResetToken({ customerId, passwordHash }, { env = process.env, now = new Date() } = {}) {
  const secret = readSecret(env);
  const fingerprint = fingerprintPasswordHash(passwordHash, { env });

  if (!secret || !customerId || !fingerprint) {
    return "";
  }

  const payload = Buffer.from(JSON.stringify({
    v: TOKEN_VERSION,
    sub: String(customerId),
    fp: fingerprint,
    exp: now.getTime() + PASSWORD_RESET_TTL_SECONDS * 1000
  }), "utf8").toString("base64url");

  return `${payload}.${sign(payload, secret)}`;
}

// status: "valid" | "expired" | "invalid" | "not_configured"
// "expired" is only reported for a token whose signature checks out, so an
// attacker cannot learn anything from it.
export function verifyPasswordResetToken(token, { env = process.env, now = new Date() } = {}) {
  const secret = readSecret(env);

  if (!secret) {
    return { status: "not_configured" };
  }

  const [payload, signature, extra] = String(token || "").split(".");

  if (!payload || !signature || extra !== undefined) {
    return { status: "invalid" };
  }

  if (!safeEqual(signature, sign(payload, secret))) {
    return { status: "invalid" };
  }

  let data;

  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { status: "invalid" };
  }

  if (
    !data
    || data.v !== TOKEN_VERSION
    || typeof data.sub !== "string"
    || !data.sub
    || typeof data.fp !== "string"
    || !data.fp
    || typeof data.exp !== "number"
  ) {
    return { status: "invalid" };
  }

  if (data.exp <= now.getTime()) {
    return { status: "expired" };
  }

  return {
    status: "valid",
    customerId: data.sub,
    fingerprint: data.fp,
    expiresAt: new Date(data.exp)
  };
}

// True while the token still matches the password it was issued for.
export function isPasswordResetTokenCurrent(fingerprint, passwordHash, { env = process.env } = {}) {
  const current = fingerprintPasswordHash(passwordHash, { env });
  return Boolean(current) && safeEqual(current, fingerprint);
}
