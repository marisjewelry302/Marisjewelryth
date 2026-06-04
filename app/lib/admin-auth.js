import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "maris_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

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
    const leftDigest = createHmac("sha256", "maris-admin-compare").update(leftBuffer).digest();
    const rightDigest = createHmac("sha256", "maris-admin-compare").update(rightBuffer).digest();
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

  if (!cleanValue || /^replace-with-/i.test(cleanValue)) {
    return "";
  }

  return cleanValue;
}

export function getAdminConfig(env = process.env) {
  const sessionSecret = cleanSecretValue(env.MARIS_ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET);

  return {
    isConfigured: Boolean(sessionSecret),
    isSessionConfigured: Boolean(sessionSecret),
    sessionSecret
  };
}

export function hashAdminPassword(password, { salt } = {}) {
  const cleanPassword = String(password || "");
  const passwordSalt = salt || randomBytes(16).toString("base64url");
  const hash = scryptSync(cleanPassword, passwordSalt, PASSWORD_KEY_LENGTH).toString("base64url");

  return [
    PASSWORD_HASH_ALGORITHM,
    PASSWORD_HASH_VERSION,
    passwordSalt,
    hash
  ].join(":");
}

export function verifyAdminPassword(password, passwordHash) {
  const [algorithm, version, salt, expectedHash, extra] = String(passwordHash || "").split(":");

  if (
    algorithm !== PASSWORD_HASH_ALGORITHM
    || version !== PASSWORD_HASH_VERSION
    || !salt
    || !expectedHash
    || extra
  ) {
    return false;
  }

  const actualHash = scryptSync(String(password || ""), salt, PASSWORD_KEY_LENGTH).toString("base64url");

  return safeEqual(actualHash, expectedHash);
}

export function createAdminSession(username, now = new Date()) {
  const config = getAdminConfig();

  if (!config.isSessionConfigured) {
    throw new Error("Admin session signing is not configured");
  }

  const identity = typeof username === "object" && username !== null
    ? username
    : { username };
  const issuedAt = now.getTime();
  const expiresAt = issuedAt + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = base64UrlEncode(JSON.stringify({
    v: SESSION_VERSION,
    uid: identity.id || null,
    sub: identity.username,
    role: identity.role || "admin",
    iat: issuedAt,
    exp: expiresAt
  }));
  const signature = signPayload(payload, config.sessionSecret);

  return `${payload}.${signature}`;
}

export function verifyAdminSession(sessionValue, now = new Date()) {
  const config = getAdminConfig();

  if (!config.isSessionConfigured) {
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
      session.v !== SESSION_VERSION
      || typeof session.sub !== "string"
      || !session.sub
      || typeof session.exp !== "number"
      || session.exp <= now.getTime()
    ) {
      return { isValid: false, reason: "expired_or_invalid" };
    }

    return {
      isValid: true,
      username: session.sub,
      userId: session.uid || null,
      role: session.role || "admin",
      expiresAt: new Date(session.exp)
    };
  } catch (error) {
    return { isValid: false, reason: "unreadable" };
  }
}
