// Locale helpers shared by server pages and client components.
//
// English lives at the root (/about-us) and Thai under the /th prefix
// (/th/about-us). The Thai tree is built up page by page, so TRANSLATED_ROUTES
// is the single list of English paths that already have a Thai counterpart.
// Links, hreflang alternates and the sitemap all read it, which means a page
// only becomes reachable from Thai navigation once its translation exists.

export const DEFAULT_LOCALE = "en";
export const THAI_LOCALE = "th";
export const THAI_PREFIX = "/th";

export const TRANSLATED_ROUTES = [
  "/",
  "/about-us",
  "/contact-us",
  "/our-service",
  "/oem-jewelry",
  "/wholesale-retail",
  "/shipping",
  "/returns",
  "/privacy-policy",
  "/terms-of-service",
  "/newsletter",
  "/journal",
  "/request-quote",
  "/shopping-bag",
  "/wishlist",
  "/account"
];

// Dynamic sections: every path below these roots has a Thai counterpart.
const TRANSLATED_PREFIXES = ["/category/", "/product/", "/journal/", "/contact-order/"];

export function getLocale(pathname) {
  const path = String(pathname || "");
  return path === THAI_PREFIX || path.startsWith(`${THAI_PREFIX}/`) ? THAI_LOCALE : DEFAULT_LOCALE;
}

function splitHref(href) {
  const match = String(href).match(/^([^?#]*)(.*)$/);
  return { path: match[1] || "", rest: match[2] || "" };
}

export function hasThaiVersion(path) {
  const { path: bare } = splitHref(path);
  const normalized = bare.replace(/\/$/, "") || "/";
  return TRANSLATED_ROUTES.includes(normalized) || TRANSLATED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

// Turns an English site path into the path for the requested locale. Anchors,
// external URLs and routes without a Thai version are returned unchanged.
export function localizePath(href, locale) {
  const value = String(href || "");

  if (locale !== THAI_LOCALE || !value.startsWith("/") || value.startsWith("//") || !hasThaiVersion(value)) {
    return value;
  }

  const { path, rest } = splitHref(value);
  const normalized = path.replace(/\/$/, "") || "/";
  return `${normalized === "/" ? THAI_PREFIX : `${THAI_PREFIX}${normalized}`}${rest}`;
}

// Removes the /th prefix so a Thai path can be compared against English routes.
export function stripLocale(pathname) {
  const path = String(pathname || "/");

  if (path === THAI_PREFIX) return "/";
  return path.startsWith(`${THAI_PREFIX}/`) ? path.slice(THAI_PREFIX.length) : path;
}

// Fills {name} placeholders in a dictionary string.
export function fill(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

// Prices are saved in the visitor's bag in the language they were added in, so
// a stored "30,000 THB" or "Price on request" is rewritten when it is shown.
export function localizePriceLabel(label, locale) {
  if (locale !== THAI_LOCALE) return label;
  const value = String(label || "");
  if (!value || value === "Price on request") return "สอบถามราคา";
  const match = value.match(/^([\d,.]+)\s*THB$/);
  return match ? `${match[1]} บาท` : value;
}
