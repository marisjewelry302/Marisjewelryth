// next/image rejects any remote host that is not declared in
// next.config.mjs -> images.remotePatterns, and the rejection is a request-time
// throw, not a broken image. Catalogue image URLs come from admin-entered
// Supabase records, so a host we do not recognise must degrade to an
// unoptimized <img> rather than take the whole page down.

const OPTIMIZABLE_HOST = /(^|\.)supabase\.co$/i;

export function isOptimizableImageSrc(src) {
  const value = String(src || "").trim();

  if (!value) {
    return false;
  }

  // Same-origin paths are served by the /assets/* route handler and are always
  // safe to optimize.
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && OPTIMIZABLE_HOST.test(url.hostname);
  } catch {
    return false;
  }
}
