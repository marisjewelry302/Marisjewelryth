// Analytics events: trackEvent gating/allowlisting/PII stripping, the click
// listener's href mapping, and that each form fires only in its success branch.
import { readFile } from "node:fs/promises";

let failures = 0;
function check(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures += 1;
  }
}

// --- browser stub ---------------------------------------------------------
function cookieFor(analytics) {
  const consent = { v: 2, necessary: true, analytics, marketing: false, updatedAt: "2026-01-01T00:00:00.000Z" };
  return `maris_cookie_consent=${encodeURIComponent(JSON.stringify(consent))}`;
}
function setBrowser({ path = "/", consent = true } = {}) {
  globalThis.document = { cookie: consent === null ? "" : cookieFor(consent) };
  globalThis.window = { location: { pathname: path, protocol: "https:" } };
}
function clearBrowser() {
  delete globalThis.window;
  delete globalThis.document;
}

const track = await import("../app/lib/track.js");
const { trackEvent, contactMethodFromHref } = track;

// server: no window
clearBrowser();
check(trackEvent("generate_lead", { form_type: "contact" }) === null, "no-op on the server");

// consent
setBrowser({ consent: null });
check(trackEvent("generate_lead", { form_type: "contact" }) === null, "no-op without a consent decision");
check(window.dataLayer === undefined, "no dataLayer created without consent");
setBrowser({ consent: false });
check(trackEvent("generate_lead", { form_type: "contact" }) === null, "no-op when analytics is declined");

// admin
for (const path of ["/admin", "/admin/products", "/admin/login"]) {
  setBrowser({ path });
  check(trackEvent("generate_lead", { form_type: "contact" }) === null, `no-op on ${path}`);
}
setBrowser({ path: "/administrator" });
check(trackEvent("sign_up", { method: "email" }) !== null, "/administrator is not treated as admin");

// happy path + locale
setBrowser({ path: "/contact-us" });
let sent = trackEvent("generate_lead", { form_type: "contact" });
check(JSON.stringify(sent) === JSON.stringify({ event: "generate_lead", form_type: "contact", locale: "en" }), "pushes event with locale en");
check(Array.isArray(window.dataLayer) && window.dataLayer.length === 1 && window.dataLayer[0] === sent, "creates dataLayer and pushes once");
setBrowser({ path: "/th/request-quote" });
check(trackEvent("generate_lead", { form_type: "quote" }).locale === "th", "locale th from /th path");
check(trackEvent("generate_lead", { form_type: "quote", locale: "en" }).locale === "th", "locale is derived from the path");
setBrowser({ path: "/thailand" });
check(trackEvent("newsletter_signup").locale === "en", "/thailand is not Thai");
setBrowser({ path: "/" });
window.dataLayer = [{ existing: true }];
trackEvent("newsletter_signup");
check(window.dataLayer.length === 2 && window.dataLayer[0].existing === true, "reuses an existing dataLayer");

// allowlists
setBrowser({ path: "/" });
check(trackEvent("purchase", { form_type: "contact" }) === null, "unknown event dropped");
check(trackEvent("page_view") === null, "page_view is not ours to send");
sent = trackEvent("generate_lead", {
  form_type: "contact", name: "Somchai", email_field: "x", message: "hello", address: "1 Road", product_notes: "n", phone: "x", line_id: "x"
});
check(JSON.stringify(Object.keys(sent).sort()) === JSON.stringify(["event", "form_type", "locale"]), "unknown params dropped");
check(trackEvent("generate_lead", { form_type: "newsletter" }).form_type === undefined, "unknown form_type value dropped");
check(trackEvent("sign_up", { method: "google" }).method === undefined, "unknown method value dropped");
check(trackEvent("contact_click", { contact_method: "fax" }).contact_method === undefined, "unknown contact_method dropped");
check(trackEvent("generate_lead", { form_type: { toString: () => "contact" } }).form_type === undefined, "non-string values dropped");
check(trackEvent("generate_lead", { form_type: "custom_order", item_id: "SR 0092 ER" }).item_id === "SR 0092 ER", "product code allowed as item_id");
check(trackEvent("generate_lead", { page_type: "product" }).page_type === "product", "page_type allowed");

// PII stripping
for (const bad of ["a@b.com", "name@example.co.th", "081-234-5678", "+66 81 234 5678", "0812345678", "(02) 123 4567",
  "https://example.com/p?id=1&email=a", "https://example.com/?x", "example.com/page?utm=1"]) {
  const out = trackEvent("generate_lead", { form_type: "custom_order", item_id: bad, page_type: bad });
  check(out.item_id === undefined && out.page_type === undefined, `PII-looking value stripped: ${bad}`);
}
check(trackEvent("generate_lead", { item_id: "ring with note: size 7 call me" }).item_id === undefined, "free text is not a valid item_id");
for (const ok of ["SR 0092 ER", "R0050", "WB-0012"]) {
  check(trackEvent("generate_lead", { item_id: ok }).item_id === ok, `product code kept: ${ok}`);
}
clearBrowser();

// --- click listener mapping ------------------------------------------------
const methods = {
  "https://lin.ee/tFg8osD": "line",
  "https://line.me/R/ti/p/@maris": "line",
  "https://wa.me/66812345678": "whatsapp",
  "https://api.whatsapp.com/send?phone=66812345678": "whatsapp",
  "tel:+6621234567": "phone",
  "TEL:021234567": "phone",
  "mailto:hello@marisjewelry.com": "email",
  "mailto:hello@marisjewelry.com?subject=Hi": "email",
  "/contact-us": null,
  "https://www.facebook.com/maris": null,
  "https://notline.me.evil.example/": null,
  "https://example.com/?u=lin.ee": null,
  "#top": null,
  "": null
};
for (const [href, expected] of Object.entries(methods)) {
  check(contactMethodFromHref(href) === expected, `href ${JSON.stringify(href)} -> ${expected}`);
}

// Execute the real tracker effect against a stub DOM: one event per click, no contact data in it.
const trackerSource = (await readFile("app/components/ContactClickTracker.jsx", "utf8"))
  .replace(/^"use client";\r?\n/, "")
  .replace(/^import[\s\S]*?;\r?\n/gm, "")
  .replace("export default function ContactClickTracker", "function ContactClickTracker");
class FakeElement {
  constructor(href) { this.href = href; }
  closest(selector) { return selector === "a[href]" && this.href !== undefined ? this : null; }
  getAttribute() { return this.href; }
}
setBrowser({ path: "/th/contact-us" });
let handler;
let listeners = 0;
globalThis.document.addEventListener = (type, fn) => { if (type === "click") { handler = fn; listeners += 1; } };
globalThis.document.removeEventListener = (type, fn) => { if (fn === handler) { handler = undefined; listeners -= 1; } };
globalThis.Element = FakeElement;
let cleanup;
new Function("useEffect", "contactMethodFromHref", "trackEvent", "Element", "document", `${trackerSource}\nreturn ContactClickTracker;`)(
  (effect) => { cleanup = effect(); }, contactMethodFromHref, trackEvent, FakeElement, globalThis.document
)();
check(listeners === 1, "tracker registers exactly one document click listener");
handler({ target: new FakeElement("tel:+6621234567") });
handler({ target: new FakeElement("https://lin.ee/tFg8osD") });
handler({ target: new FakeElement("/products") });
handler({ target: new FakeElement(undefined) });
handler({ target: {} });
check(window.dataLayer.length === 2, "one event per qualifying click, none for other links");
check(JSON.stringify(window.dataLayer[0]) === JSON.stringify({ event: "contact_click", contact_method: "phone", locale: "th" }), "phone click event has method and locale only");
check(window.dataLayer[1].contact_method === "line", "line click event");
cleanup();
check(listeners === 0, "tracker removes its listener on unmount");
clearBrowser();
delete globalThis.Element;

// --- source assertions: success branches only ------------------------------
const norm = (text) => text.replace(/\r\n/g, "\n");
const [layout, lead, newsletter, custom, wholesale, account, popup] = (await Promise.all([
  "app/layout.js", "app/components/LeadForm.jsx", "app/components/NewsletterSignup.jsx",
  "app/contact-order/[productCode]/CustomOrderForm.jsx", "app/wholesale/WholesaleClient.jsx",
  "app/account/AccountClient.jsx", "app/HomeSignupPopup.jsx"
].map((file) => readFile(file, "utf8")))).map(norm);

check(/<ContactClickTracker \/>/.test(layout), "layout mounts ContactClickTracker");
check(!/trackEvent/.test(popup), "home signup popup only redirects, so it fires nothing");

function eventsIn(source) { return source.match(/trackEvent\(/g)?.length ?? 0; }

check(eventsIn(lead) === 1, "LeadForm has exactly one trackEvent call");
check(/if \(response\.ok\) \{[^}]*trackEvent\("generate_lead", \{ form_type: type === "quote" \? "quote" : "contact" \}\)/s.test(lead), "LeadForm fires inside the response.ok branch with contact/quote form_type");
check(lead.indexOf("trackEvent(") > lead.indexOf("if (response.ok)") && lead.indexOf("trackEvent(") < lead.indexOf("response.status === 400"), "LeadForm event sits before the error branches");

check(eventsIn(newsletter) === 1 && /if \(response\.ok\) \{[^}]*trackEvent\("newsletter_signup"\)/s.test(newsletter), "NewsletterSignup fires inside the response.ok branch");

check(eventsIn(custom) === 1 && /if \(response\.ok && \(result\.status === "created" \|\| result\.status === "duplicate"\)\) \{[^}]*trackEvent\("generate_lead", \{ form_type: "custom_order", item_id: formatPublicProductCode\(productCode\) \}\)/s.test(custom), "CustomOrderForm fires only for created/duplicate with item_id");

check(eventsIn(wholesale) === 1 && /if \(!ok\) \{[^}]*return;\s*\}\s*trackEvent\("generate_lead", \{ form_type: "wholesale" \}\);\s*onSaved\(/s.test(wholesale), "Wholesale application fires after the !ok early return");

check(eventsIn(account) === 1 && /if \(!res\.ok\) \{[\s\S]*?return;\s*\}\s*setCustomer\(data\.customer\);[\s\S]{0,120}trackEvent\("sign_up", \{ method: "email" \}\)/.test(account), "AccountClient sign_up fires after the signup !res.ok return");
check(account.indexOf('trackEvent("sign_up"') < account.indexOf("/api/account/welcome-email"), "sign_up does not wait for the welcome email");

// No personal field is ever handed to the helper.
for (const [name, source] of [["LeadForm", lead], ["Newsletter", newsletter], ["CustomOrder", custom], ["Wholesale", wholesale], ["Account", account]]) {
  for (const call of source.match(/trackEvent\([^;]*\);/g) ?? []) {
    const args = call.replace(/form_type|item_id|contact_method|"[^"]*"/g, "");
    check(!/\b(email|phone|name|message|address|lineId|notes?|data|payload|body)\b/i.test(args), `${name}: ${call} passes no personal field`);
  }
}

if (failures > 0) {
  console.error(`${failures} analytics events check(s) failed.`);
  process.exit(1);
}
console.log("Analytics events tests passed.");
