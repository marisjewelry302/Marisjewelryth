// Where to send an admin after signing in. Only a same-origin path inside
// /admin is ever accepted, so the `next` parameter cannot become an open redirect.
export const ADMIN_DEFAULT_NEXT_PATH = "/admin";

const PARSE_BASE = "https://admin-next-path.invalid";

export function sanitizeAdminNextPath(value) {
  if (typeof value !== "string") return ADMIN_DEFAULT_NEXT_PATH;

  const candidate = value.trim();

  // Must be exactly /admin or continue with a path, query or fragment separator.
  if (!/^\/admin(?:[/?#]|$)/.test(candidate)) return ADMIN_DEFAULT_NEXT_PATH;
  // No backslashes, control characters or whitespace (browsers treat "\" like "/").
  if (/[\\\p{Cc}\s]/u.test(candidate)) return ADMIN_DEFAULT_NEXT_PATH;
  // No encoded slashes, backslashes or dots that could be decoded into a different path later.
  if (/%(?:2f|5c|2e)/i.test(candidate.split("#")[0])) return ADMIN_DEFAULT_NEXT_PATH;

  let parsed;
  try {
    parsed = new URL(candidate, PARSE_BASE);
  } catch {
    return ADMIN_DEFAULT_NEXT_PATH;
  }

  if (parsed.origin !== PARSE_BASE) return ADMIN_DEFAULT_NEXT_PATH;
  if (!/^\/admin(?:\/|$)/.test(parsed.pathname)) return ADMIN_DEFAULT_NEXT_PATH;
  if (parsed.pathname.split("/").some((segment) => segment === "..")) return ADMIN_DEFAULT_NEXT_PATH;
  // Signing in only to land on the sign-in or set-up screen again is a loop.
  if (/^\/admin\/(?:login|setup)(?:\/|$)/.test(parsed.pathname)) return ADMIN_DEFAULT_NEXT_PATH;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
