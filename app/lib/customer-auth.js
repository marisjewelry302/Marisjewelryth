import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "maris_customer_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const SESSION_VERSION = 1;
const PASSWORD_HASH_ALGORITHM = "scrypt";
const PASSWORD_HASH_VERSION = "v1";
const PASSWORD_KEY_LENGTH = 64;

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    const leftDigest = createHmac("sha256", "maris-customer-compare").update(leftBuffer).digest();
    const rightDigest = createHmac("sha256", "maris-customer-compare").update(rightBuffer).digest();
    timingSafeEqual(leftDigest, rightDigest);
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signPayload(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function cleanSecretValue(value) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue || /^replace-with-/i.test(cleanValue)) return "";
  return cleanValue;
}

export function getCustomerAuthConfig(env = process.env) {
  const sessionSecret = cleanSecretValue(
    env.MARIS_CUSTOMER_SESSION_SECRET || env.CUSTOMER_SESSION_SECRET
  );
  return {
    isConfigured: Boolean(sessionSecret),
    sessionSecret
  };
}

export function hashCustomerPassword(password, { salt } = {}) {
  const cleanPassword = String(password || "");
  const passwordSalt = salt || randomBytes(16).toString("base64url");
  const hash = scryptSync(cleanPassword, passwordSalt, PASSWORD_KEY_LENGTH).toString("base64url");
  return [PASSWORD_HASH_ALGORITHM, PASSWORD_HASH_VERSION, passwordSalt, hash].join(":");
}

export function verifyCustomerPassword(password, passwordHash) {
  const [algorithm, version, salt, expectedHash, extra] = String(passwordHash || "").split(":");

  if (
    algorithm !== PASSWORD_HASH_ALGORITHM ||
    version !== PASSWORD_HASH_VERSION ||
    !salt ||
    !expectedHash ||
    extra
  ) {
    return false;
  }

  const actualHash = scryptSync(String(password || ""), salt, PASSWORD_KEY_LENGTH).toString("base64url");
  return safeEqual(actualHash, expectedHash);
}

export function createCustomerSession(customer, now = new Date()) {
  const config = getCustomerAuthConfig();

  if (!config.isConfigured) {
    throw new Error("Customer session signing is not configured. Add MARIS_CUSTOMER_SESSION_SECRET to .env.local");
  }

  const issuedAt = now.getTime();
  const expiresAt = issuedAt + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = base64UrlEncode(
    JSON.stringify({
      v: SESSION_VERSION,
      sub: customer.id,
      email: customer.email,
      iat: issuedAt,
      exp: expiresAt
    })
  );
  const signature = signPayload(payload, config.sessionSecret);
  return `${payload}.${signature}`;
}

export function verifyCustomerSession(sessionValue, now = new Date()) {
  const config = getCustomerAuthConfig();

  if (!config.isConfigured) {
    return { isValid: false, reason: "not_configured" };
  }

  if (!sessionValue) {
    return { isValid: false, reason: "missing" };
  }

  const [payload, signature, extra] = String(sessionValue).split(".");

  if (!payload || !signature || extra) {
    return { isValid: false, reason: "malformed" };
  }

  const expectedSignature = signPayload(payload, config.sessionSecret);

  if (!safeEqual(signature, expectedSignature)) {
    return { isValid: false, reason: "bad_signature" };
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload));

    if (
      session.v !== SESSION_VERSION ||
      typeof session.sub !== "string" ||
      !session.sub ||
      typeof session.exp !== "number" ||
      session.exp <= now.getTime()
    ) {
      return { isValid: false, reason: "expired_or_invalid" };
    }

    return {
      isValid: true,
      customerId: session.sub,
      email: session.email,
      expiresAt: new Date(session.exp)
    };
  } catch {
    return { isValid: false, reason: "unreadable" };
  }
}
