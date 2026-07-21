const PRIVATE_METADATA_KEYS = new Set([
  "credential",
  "password",
  "passwordhash",
  "resettoken",
  "secret",
  "sessiontoken",
  "verificationtoken"
]);

function normalizeKey(value) {
  return String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function sanitizeCustomerMetadata(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeCustomerMetadata);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_METADATA_KEYS.has(normalizeKey(key)))
      .map(([key, entry]) => [key, sanitizeCustomerMetadata(entry)])
  );
}
