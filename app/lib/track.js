// Privacy-safe analytics events for the GTM dataLayer.
//
// trackEvent() pushes { event, ...params } onto window.dataLayer only when the
// visitor has opted in to analytics, never on /admin, and never on the server.
// Event names and parameter keys are allowlisted and every value is checked, so
// a call site cannot leak a name, email, phone, Line ID, message, address or
// product note by accident. Product codes ("SR 0092 ER") are allowed as item_id.
//
// GTM only loads in Vercel production after consent (GoogleTagManager.jsx), but
// this helper is gated on consent itself so it is safe to call from anywhere.

import { hasCookieConsent } from "./cookie-consent.js";

export const ALLOWED_EVENTS = ["generate_lead", "sign_up", "newsletter_signup", "contact_click"];
export const ALLOWED_PARAMS = ["form_type", "method", "contact_method", "locale", "page_type", "item_id"];

const ENUM_PARAMS = {
  form_type: ["contact", "quote", "custom_order", "wholesale"],
  method: ["email"],
  contact_method: ["line", "whatsapp", "phone", "email"],
  locale: ["th", "en"]
};

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+/;
// 7+ digits with optional separators, e.g. +66 81 234 5678 or (02) 123-4567.
const PHONE_PATTERN = /\+?\d[\d\s().-]{5,}\d/;
// A URL carrying a query string or fragment, or any "?key=" fragment.
const URL_WITH_QUERY_PATTERN = /(?:[a-z][a-z0-9+.-]*:\/\/|www\.)\S*[?#]|\S\?\S*=/i;
const ITEM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _./-]{0,39}$/;
const PAGE_TYPE_PATTERN = /^[a-z0-9_-]{1,40}$/;

export function looksLikePersonalData(value) {
  const text = String(value);
  return EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text) || URL_WITH_QUERY_PATTERN.test(text);
}

function cleanParam(key, value) {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text || looksLikePersonalData(text)) return undefined;
  if (ENUM_PARAMS[key]) return ENUM_PARAMS[key].includes(text) ? text : undefined;
  if (key === "item_id") return ITEM_ID_PATTERN.test(text) ? text : undefined;
  if (key === "page_type") return PAGE_TYPE_PATTERN.test(text) ? text : undefined;
  return undefined;
}

export function isAdminPath(pathname) {
  const path = String(pathname || "");
  return path === "/admin" || path.startsWith("/admin/");
}

export function localeFromPath(pathname) {
  const path = String(pathname || "");
  return path === "/th" || path.startsWith("/th/") ? "th" : "en";
}

/** Returns the object pushed to the dataLayer, or null when nothing was sent. */
export function trackEvent(name, params = {}) {
  if (typeof window === "undefined") return null;
  if (!ALLOWED_EVENTS.includes(name)) return null;

  const pathname = window.location?.pathname;
  if (isAdminPath(pathname)) return null;

  try {
    if (!hasCookieConsent("analytics")) return null;

    const payload = { event: name };
    for (const key of ALLOWED_PARAMS) {
      if (key === "locale" || !params || !Object.prototype.hasOwnProperty.call(params, key)) continue;
      const clean = cleanParam(key, params[key]);
      if (clean !== undefined) payload[key] = clean;
    }
    payload.locale = localeFromPath(pathname);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    return payload;
  } catch {
    return null;
  }
}

/** Maps a link href to a contact_method, or null for any other link. */
export function contactMethodFromHref(href) {
  const value = String(href || "").trim();
  if (/^tel:/i.test(value)) return "phone";
  if (/^mailto:/i.test(value)) return "email";

  let host = "";
  try {
    host = new URL(value, "https://placeholder.invalid").hostname.toLowerCase();
  } catch {
    return null;
  }
  const is = (domain) => host === domain || host.endsWith(`.${domain}`);
  if (is("line.me") || is("lin.ee")) return "line";
  if (host === "wa.me" || host === "api.whatsapp.com" || host === "web.whatsapp.com" || is("whatsapp.com")) return "whatsapp";
  return null;
}
