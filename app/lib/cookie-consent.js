// Cookie consent state for the storefront, shared by the banner, the footer
// "Cookie settings" link, and any future tag (analytics, marketing pixels).
//
// The choice is kept in a first-party cookie so it is readable on every route
// and survives a localStorage wipe. Strictly necessary cookies (the signed
// admin/customer sessions) never wait for consent; only the optional
// categories below do.
//
// Gate any future tracker on the choice:
//
//   import { hasCookieConsent, onCookieConsentChange } from "../lib/cookie-consent";
//   if (hasCookieConsent("analytics")) loadAnalytics();
//   onCookieConsentChange((consent) => { if (consent?.analytics) loadAnalytics(); });

export const COOKIE_CONSENT_NAME = "maris_cookie_consent";
// Bump when the categories or their meaning change: older answers are then
// treated as missing and the banner asks again.
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
export const COOKIE_CONSENT_EVENT = "maris:cookie-consent";
export const COOKIE_SETTINGS_EVENT = "maris:cookie-settings";

export const OPTIONAL_COOKIE_CATEGORIES = ["analytics", "marketing"];

function isBrowser() {
  return typeof document !== "undefined";
}

function readRawCookie(name) {
  if (!isBrowser()) return null;

  const prefix = `${name}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return match ? match.slice(prefix.length) : null;
}

function normalizeConsent(value) {
  if (!value || typeof value !== "object") return null;
  if (value.v !== COOKIE_CONSENT_VERSION) return null;

  return {
    v: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: value.analytics === true,
    marketing: value.marketing === true,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null
  };
}

/** Returns the saved choice, or null when the visitor has not answered yet. */
export function readCookieConsent() {
  const raw = readRawCookie(COOKIE_CONSENT_NAME);
  if (!raw) return null;

  try {
    return normalizeConsent(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}

export function hasCookieConsentDecision() {
  return readCookieConsent() !== null;
}

/** Strictly necessary cookies are always allowed; other categories need an opt-in. */
export function hasCookieConsent(category) {
  if (category === "necessary") return true;
  const consent = readCookieConsent();
  return Boolean(consent && consent[category] === true);
}

export function saveCookieConsent(choices = {}) {
  if (!isBrowser()) return null;

  const consent = {
    v: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: choices.analytics === true,
    marketing: choices.marketing === true,
    updatedAt: new Date().toISOString()
  };

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${COOKIE_CONSENT_NAME}=${encodeURIComponent(JSON.stringify(consent))}` +
    `; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;

  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
  return consent;
}

/** Calls listener(consent) every time the visitor saves a choice. Returns an unsubscribe function. */
export function onCookieConsentChange(listener) {
  if (!isBrowser()) return () => {};

  function handle(event) {
    listener(event.detail ?? readCookieConsent());
  }

  window.addEventListener(COOKIE_CONSENT_EVENT, handle);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handle);
}

/** Reopens the preferences panel, e.g. from the footer link. */
export function openCookieSettings() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_EVENT));
}
