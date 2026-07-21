const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isUnsafeRequest(request) {
  return !SAFE_METHODS.has(String(request.method || "GET").toUpperCase());
}

export function isSameOriginRequest(request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin) {
    return origin === requestOrigin && fetchSite !== "cross-site";
  }

  if (fetchSite) {
    return fetchSite === "same-origin";
  }

  return process.env.NODE_ENV !== "production";
}
