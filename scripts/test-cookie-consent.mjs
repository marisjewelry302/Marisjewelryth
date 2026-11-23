// Cookie consent: layout wiring, footer entry point, popup coordination, and the
// consent library's read/write behaviour against a stubbed browser.
import { readFile } from "node:fs/promises";

let failures = 0;

function check(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures += 1;
  }
}

const [layout, footer, popup, banner, css, pages] = await Promise.all([
  readFile("app/layout.js", "utf8"),
  readFile("app/components/SiteFooter.jsx", "utf8").then(async (source) => source + (await readFile("app/lib/ui-text-base.js", "utf8"))),
  readFile("app/HomeSignupPopup.jsx", "utf8"),
  readFile("app/components/CookieConsent.jsx", "utf8").then(async (source) => source + (await readFile("app/lib/ui-text-base.js", "utf8"))),
  readFile("assets/css/cookie-consent.css", "utf8"),
  readFile("app/lib/static-pages.js", "utf8")
]);

check(/import "\.\.\/assets\/css\/cookie-consent\.css";/.test(layout), "layout imports cookie-consent.css");
check(/<CookieConsent \/>/.test(layout), "layout renders <CookieConsent />");
check(/openCookieSettings/.test(footer) && /Cookie settings/.test(footer), "footer offers a Cookie settings button");
check(/hasCookieConsentDecision\(\)/.test(popup), "signup popup waits for a cookie decision");
check(/isAdminPath\(pathname\)/.test(banner), "banner stays off admin routes");
check(/Necessary only/.test(banner) && /Accept all/.test(banner), "banner offers both accept and reject as equal buttons");
check((banner.match(/cookie-consent__button is-choice/g) || []).length === 2, "Necessary only and Accept all share the same button style");
check(!/:root\s*\{/.test(css), "cookie-consent.css must not re-declare :root");
check(/title: "Cookies"/.test(pages), "privacy policy has a Cookies section");

// Minimal browser stub: document.cookie behaves like a cookie jar.
const jar = new Map();
const events = [];
globalThis.document = {
  get cookie() {
    return [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
  },
  set cookie(text) {
    const [pair] = text.split(";");
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index).trim(), pair.slice(index + 1));
  }
};
globalThis.window = {
  location: { protocol: "https:" },
  dispatchEvent(event) {
    events.push(event);
  },
  addEventListener() {},
  removeEventListener() {}
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

const consent = await import("../app/lib/cookie-consent.js");

check(consent.readCookieConsent() === null, "no decision before the visitor answers");
check(consent.hasCookieConsent("necessary") === true, "necessary cookies never need consent");
check(consent.hasCookieConsent("analytics") === false, "analytics is off by default");

consent.saveCookieConsent({ analytics: true, marketing: false });
check(consent.hasCookieConsentDecision(), "a saved choice counts as a decision");
check(consent.hasCookieConsent("analytics") === true, "analytics opt-in is stored");
check(consent.hasCookieConsent("marketing") === false, "marketing stays off unless chosen");
check(events.at(-1)?.type === consent.COOKIE_CONSENT_EVENT, "saving dispatches the consent event");

jar.set(consent.COOKIE_CONSENT_NAME, encodeURIComponent(JSON.stringify({ v: 0, analytics: true })));
check(consent.readCookieConsent() === null, "an answer from an older consent version is asked again");

jar.set(consent.COOKIE_CONSENT_NAME, "not-json%");
check(consent.readCookieConsent() === null, "a corrupt cookie is treated as no answer");

// --- Google Analytics 4 gating and the hidden marketing category ---------------
const [gaComponent, analytics, uiText, envExample] = await Promise.all([
  readFile("app/components/GoogleAnalytics.jsx", "utf8"),
  readFile("app/lib/analytics.js", "utf8"),
  readFile("app/lib/ui-text-base.js", "utf8"),
  readFile(".env.example", "utf8")
]);
const ga = await import("../app/lib/analytics.js");

// No script without a valid ID or without analytics consent.
check(ga.normalizeGaMeasurementId("G-ABC123XYZ") === "G-ABC123XYZ", "a well-formed GA4 ID is accepted");
for (const bad of [undefined, null, "", "UA-12345-1", "g-abc123", "G-abc123", "G-", "G-ABC 123", "G-ABC123;alert(1)", "https://x.test"]) {
  check(ga.normalizeGaMeasurementId(bad) === "", `invalid GA ID ${JSON.stringify(bad)} loads nothing`);
}
check(/process\.env\.NEXT_PUBLIC_GA_MEASUREMENT_ID/.test(gaComponent), "GA ID is read from NEXT_PUBLIC_GA_MEASUREMENT_ID");
check(!/G-[A-Z0-9]{6,}/.test(gaComponent + analytics), "no measurement ID is hard-coded");
check(/MEASUREMENT_ID = normalizeGaMeasurementId\(/.test(gaComponent), "GA ID is validated before use");
check(/if \(!enabled \|\| !granted \|\| !scriptRequested\) return null;/.test(gaComponent), "GA renders nothing without an ID, consent, or off /admin");
check((gaComponent.match(/<Script/g) || []).length === 1 && gaComponent.indexOf("<Script") > gaComponent.indexOf("return null;"), "the only gtag.js <Script> sits behind the consent guard");
check(/hasCookieConsent\("analytics"\)/.test(gaComponent) && /onCookieConsentChange/.test(gaComponent), "GA follows the analytics category and later changes");
check(/useSearchParams/.test(gaComponent) && /<Suspense/.test(gaComponent), "page views use useSearchParams inside Suspense");
check(/send_page_view: false/.test(analytics), "gtag config does not send its own page_view");

// Admin routes are excluded.
check(ga.isAnalyticsExcludedPath("/admin") && ga.isAnalyticsExcludedPath("/admin/products") && ga.isAnalyticsExcludedPath("/admin/"), "admin routes are excluded");
check(!ga.isAnalyticsExcludedPath("/") && !ga.isAnalyticsExcludedPath("/administration") && !ga.isAnalyticsExcludedPath("/th"), "storefront routes are not excluded");

// Consent Mode v2: everything denied by default; only analytics_storage can be granted.
const fakeWindow = {};
ga.initGoogleAnalytics(fakeWindow, "G-TEST123");
ga.initGoogleAnalytics(fakeWindow, "G-TEST123");
const queued = fakeWindow.dataLayer.map((entry) => [...entry]);
const consentDefault = queued.filter((entry) => entry[0] === "consent" && entry[1] === "default");
check(consentDefault.length === 1, "consent default is queued exactly once");
check(
  ["analytics_storage", "ad_storage", "ad_user_data", "ad_personalization"].every((key) => consentDefault[0]?.[2]?.[key] === "denied"),
  "consent default denies analytics_storage, ad_storage, ad_user_data and ad_personalization"
);
check(queued.findIndex((entry) => entry[0] === "consent") < queued.findIndex((entry) => entry[0] === "config"), "consent default is queued before the config");
check(queued.filter((entry) => entry[0] === "config").length === 1 && queued.find((entry) => entry[0] === "config")[2].send_page_view === false, "config is queued once with send_page_view off");
check(!queued.some((entry) => entry[0] === "event"), "initialising sends no events");
ga.setAnalyticsConsent(fakeWindow, "G-TEST123", true);
let update = [...fakeWindow.dataLayer.at(-1)];
check(update[1] === "update" && update[2].analytics_storage === "granted", "accepting analytics grants analytics_storage");
check(["ad_storage", "ad_user_data", "ad_personalization"].every((key) => update[2][key] === "denied"), "ad signals stay denied when analytics is granted");
check(fakeWindow["ga-disable-G-TEST123"] === false, "collection is enabled while consent is granted");
ga.setAnalyticsConsent(fakeWindow, "G-TEST123", false);
update = [...fakeWindow.dataLayer.at(-1)];
check(update[2].analytics_storage === "denied" && fakeWindow["ga-disable-G-TEST123"] === true, "withdrawing consent denies storage and disables collection");

// Withdrawal deletes _ga and _ga_<ID> on this host and its parent domains.
const writes = [];
ga.deleteGoogleAnalyticsCookies(
  {
    get cookie() { return "maris_cookie_consent=x; _ga=GA1.1.1; _ga_ABC123=GS1; _gat=1; other=2"; },
    set cookie(text) { writes.push(text); }
  },
  "www.shop.example.com"
);
check(writes.some((text) => text.startsWith("_ga=;") && !text.includes("Domain=")), "_ga is cleared on the current host");
check(writes.some((text) => text.startsWith("_ga_ABC123=;") && text.includes("Domain=.shop.example.com")), "_ga_<ID> is cleared on a parent domain");
check(writes.some((text) => text.startsWith("_ga=;") && text.includes("Domain=.example.com")), "_ga is cleared on the registrable parent domain");
check(writes.every((text) => text.includes("Max-Age=0")), "cookies are expired");
check(!writes.some((text) => /^(maris_cookie_consent|other|_gat)=/.test(text)), "other cookies are left alone");

// Page-view paths never carry tokens or personal details.
check(ga.buildAnalyticsPagePath("/unsubscribe", new URLSearchParams("token=abc")) === "/unsubscribe", "unsubscribe tokens are not sent");
check(ga.buildAnalyticsPagePath("/th/account/reset-password", new URLSearchParams("token=abc")) === "/th/account/reset-password", "reset tokens are not sent");
check(ga.buildAnalyticsPagePath("/category/rings", new URLSearchParams("metal=gold&email=a@b.c")) === "/category/rings?metal=gold", "personal query parameters are dropped");

// Marketing category: hidden while the flag is off, code path kept.
check(consent.MARKETING_COOKIES_ENABLED === false, "marketing cookies are off");
check(JSON.stringify(consent.OPTIONAL_COOKIE_CATEGORIES) === JSON.stringify(["analytics"]), "only analytics is an active optional category");
check(/MARKETING_COOKIES_ENABLED \|\| category\.key !== "marketing"/.test(banner), "banner and settings hide the marketing switch");
check(/finish\(\{ analytics: true, marketing: MARKETING_COOKIES_ENABLED \}\)/.test(banner), "Accept all means necessary + analytics while marketing is off");
consent.saveCookieConsent({ analytics: true, marketing: true });
check(consent.hasCookieConsent("marketing") === false, "marketing can never be granted while the flag is off");
check(consent.readCookieConsent().analytics === true, "analytics is still granted");
check(consent.COOKIE_CONSENT_VERSION >= 2, "consent version was bumped so returning visitors are asked again");
jar.set(consent.COOKIE_CONSENT_NAME, encodeURIComponent(JSON.stringify({ v: 1, analytics: true, marketing: true })));
check(consent.readCookieConsent() === null, "a version 1 answer is asked again");

// Banner and settings copy.
check(/We use Google Analytics to understand how visitors use the site, only if you allow it\./.test(uiText), "English banner describes Google Analytics");
check(/Google Analytics เพื่อทำความเข้าใจว่าผู้เข้าชมใช้งานเว็บไซต์อย่างไร ก็ต่อเมื่อคุณอนุญาตเท่านั้น/.test(uiText), "Thai banner describes Google Analytics");
check(!/more relevant Maris pieces elsewhere|ตรงใจคุณมากขึ้นบนเว็บไซต์อื่น/.test(uiText), "the untrue marketing promise is gone");
check(/^# NEXT_PUBLIC_GA_MEASUREMENT_ID=G-X+/m.test(envExample), ".env.example documents the GA measurement ID, commented out");

if (failures > 0) {
  process.exit(1);
}

console.log("PASS: Cookie consent banner, footer link, popup coordination, consent storage, Google Analytics gating, and hidden marketing category.");
