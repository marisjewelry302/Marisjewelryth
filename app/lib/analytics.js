// Google Analytics 4 helpers. Nothing here loads a script: GoogleAnalytics.jsx
// does that, and only after the visitor has granted the analytics category.
//
// The measurement ID comes from NEXT_PUBLIC_GA_MEASUREMENT_ID and is never
// hard-coded. A missing or malformed value means analytics stays completely off.

export const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
export const GA_SCRIPT_ORIGIN = "https://www.googletagmanager.com";

/** Returns the trimmed ID when it looks like a GA4 measurement ID, otherwise "". */
export function normalizeGaMeasurementId(value) {
  const id = typeof value === "string" ? value.trim() : "";
  return GA_MEASUREMENT_ID_PATTERN.test(id) ? id : "";
}

/** Admin pages never load analytics. Mirrors the banner's own admin check. */
export function isAnalyticsExcludedPath(pathname) {
  const normalized = (pathname || "/").replace(/\/$/, "") || "/";
  return normalized === "/admin" || normalized.startsWith("/admin/");
}

// Paths whose query string carries one-time tokens (password reset, unsubscribe).
const QUERY_FREE_PATH = /^(\/th)?\/(account|unsubscribe)(\/|$)/;
const SENSITIVE_PARAM = /token|email|password|secret|code|key/i;

/**
 * The page path sent to Google: the pathname plus the query string, minus
 * anything that could carry a token or personal detail.
 */
export function buildAnalyticsPagePath(pathname, searchParams) {
  const path = pathname || "/";
  if (QUERY_FREE_PATH.test(path)) return path;

  const kept = new URLSearchParams();
  for (const [name, value] of new URLSearchParams(searchParams?.toString?.() || "")) {
    if (!SENSITIVE_PARAM.test(name)) kept.append(name, value);
  }
  const query = kept.toString();
  return query ? `${path}?${query}` : path;
}

const CONSENT_DENIED = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied"
};

function ensureGtag(win) {
  win.dataLayer = win.dataLayer || [];
  if (typeof win.gtag !== "function") {
    // gtag.js reads the queued Arguments objects, so this must not use rest args.
    win.gtag = function gtag() {
      win.dataLayer.push(arguments);
    };
  }
  return win.gtag;
}

/**
 * Queues Consent Mode v2 defaults (everything denied) and the GA4 config before
 * gtag.js arrives. Safe to call more than once. page_view is sent by hand on
 * every route change, so the config must not send its own.
 */
export function initGoogleAnalytics(win, measurementId) {
  if (!win || !measurementId) return;
  if (win.__marisGaInitialized === measurementId) return;

  const gtag = ensureGtag(win);
  gtag("consent", "default", CONSENT_DENIED);
  gtag("js", new Date());
  gtag("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  win.__marisGaInitialized = measurementId;
}

/** Only analytics_storage ever becomes granted; the ad signals stay denied. */
export function setAnalyticsConsent(win, measurementId, granted) {
  if (!win || !measurementId) return;

  win[`ga-disable-${measurementId}`] = !granted;
  if (typeof win.gtag === "function") {
    win.gtag("consent", "update", {
      ...CONSENT_DENIED,
      analytics_storage: granted ? "granted" : "denied"
    });
  }
}

export function sendPageView(win, { path, title, location }) {
  if (!win || typeof win.gtag !== "function") return;
  win.gtag("event", "page_view", {
    page_path: path,
    page_location: location,
    page_title: title
  });
}

const GA_COOKIE_NAME = /^_ga(_[A-Za-z0-9]+)?$/;

/** Parent domains of a hostname, e.g. shop.example.com -> [".shop.example.com", ".example.com"]. */
export function candidateCookieDomains(hostname) {
  if (!hostname || /^[\d.]+$/.test(hostname) || hostname.includes(":")) return [];
  const labels = hostname.split(".");
  const domains = [];
  for (let index = 0; index < labels.length - 1; index += 1) {
    domains.push(`.${labels.slice(index).join(".")}`);
  }
  return domains;
}

/** Deletes _ga and _ga_<ID> on this host and on every parent domain. */
export function deleteGoogleAnalyticsCookies(doc, hostname) {
  if (!doc) return;

  const names = doc.cookie
    .split(";")
    .map((part) => part.split("=")[0].trim())
    .filter((name) => GA_COOKIE_NAME.test(name));
  const expired = "=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/";

  for (const name of names) {
    doc.cookie = `${name}${expired}`;
    for (const domain of candidateCookieDomains(hostname)) {
      doc.cookie = `${name}${expired}; Domain=${domain}`;
    }
  }
}
