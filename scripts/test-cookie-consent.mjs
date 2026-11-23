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

// --- Hidden marketing category and analytics copy (GTM loads GA4; see GoogleTagManager.jsx) ---
const uiText = await readFile("app/lib/ui-text-base.js", "utf8");

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

if (failures > 0) {
  process.exit(1);
}

console.log("PASS: Cookie consent banner, footer link, popup coordination, consent storage, analytics copy, and hidden marketing category.");
