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
  readFile("app/components/SiteFooter.jsx", "utf8").then(async (source) => source + (await readFile("app/lib/ui-text.js", "utf8"))),
  readFile("app/HomeSignupPopup.jsx", "utf8"),
  readFile("app/components/CookieConsent.jsx", "utf8").then(async (source) => source + (await readFile("app/lib/ui-text.js", "utf8"))),
  readFile("assets/css/cookie-consent.css", "utf8"),
  readFile("app/lib/static-pages.js", "utf8")
]);

check(/import "\.\.\/assets\/css\/cookie-consent\.css";/.test(layout), "layout imports cookie-consent.css");
check(/<CookieConsent \/>/.test(layout), "layout renders <CookieConsent />");
check(/openCookieSettings/.test(footer) && /Cookie settings/.test(footer), "footer offers a Cookie settings button");
check(/hasCookieConsentDecision\(\)/.test(popup), "signup popup waits for a cookie decision");
check(/isAdminPath\(pathname\)/.test(banner), "banner stays off admin routes");
check(/Necessary only/.test(banner) && /Accept all/.test(banner), "banner offers both accept and reject as equal buttons");
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

if (failures > 0) {
  process.exit(1);
}

console.log("PASS: Cookie consent banner, footer link, popup coordination, and consent storage.");
