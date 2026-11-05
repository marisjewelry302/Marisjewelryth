import { createHmac, timingSafeEqual } from "node:crypto";

import { absoluteUrl } from "./seo.js";

// Unsubscribe links go out in emails that can sit in an inbox for years, so the
// token has no expiry. It is an HMAC of the address under a purpose-prefixed
// message, which keeps it from doubling as a session signature even though the
// same server secret signs both.
const TOKEN_PURPOSE = "maris-marketing-unsubscribe-v1";

function readSecret(env) {
  const value = String(env.MARIS_CUSTOMER_SESSION_SECRET || env.CUSTOMER_SESSION_SECRET || "").trim();
  return !value || /^replace-with-/i.test(value) ? "" : value;
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(`${TOKEN_PURPOSE}.${payload}`).digest("base64url");
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function createUnsubscribeToken(email, { env = process.env } = {}) {
  const secret = readSecret(env);
  const normalized = normalizeEmail(email);

  if (!secret || !normalized) {
    return "";
  }

  const payload = Buffer.from(normalized, "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyUnsubscribeToken(token, { env = process.env } = {}) {
  const secret = readSecret(env);
  const [payload, signature, extra] = String(token || "").split(".");

  if (!secret || !payload || !signature || extra) {
    return { isValid: false, email: "" };
  }

  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { isValid: false, email: "" };
  }

  const email = normalizeEmail(Buffer.from(payload, "base64url").toString("utf8"));
  return email ? { isValid: true, email } : { isValid: false, email: "" };
}

export function buildUnsubscribeUrl(email, { env = process.env } = {}) {
  const token = createUnsubscribeToken(email, { env });
  return token ? absoluteUrl(`/unsubscribe?token=${encodeURIComponent(token)}`) : "";
}

// The address mail clients POST to for one-click unsubscribe (RFC 8058).
export function buildOneClickUnsubscribeUrl(email, { env = process.env } = {}) {
  const token = createUnsubscribeToken(email, { env });
  return token ? absoluteUrl(`/api/unsubscribe?token=${encodeURIComponent(token)}`) : "";
}
