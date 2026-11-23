import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// Contract for the Thai / English switch in the admin: one dictionary with the
// same keys in both languages, a remembered choice, a server that renders in the
// chosen language, browser scripts that read their text from the dictionary, and
// a CSV whose headers follow the language.

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = (relativePath) => readFile(path.join(ROOT, relativePath), "utf8");
const i18n = await import("../app/lib/admin-i18n.js");
const {
  ADMIN_I18N_CLIENT_HELPER,
  ADMIN_LANG_COOKIE,
  ADMIN_LANG_COOKIE_MAX_AGE,
  ADMIN_LANG_COOKIE_PATH,
  buildAdminI18nBootstrap,
  buildAdminLangCookie,
  createAdminT,
  en,
  getAdminClientMessages,
  getAdminLocale,
  normalizeAdminLang,
  th
} = i18n;

const placeholdersOf = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

// ── 1. The dictionary ─────────────────────────────────────────────────────────

const enKeys = Object.keys(en).sort();
const thKeys = Object.keys(th).sort();

assert.ok(enKeys.length > 500, "The dictionary covers the whole admin");
assert.deepEqual(enKeys, thKeys, "en and th have identical key sets");

for (const key of enKeys) {
  assert.equal(typeof en[key], "string", `en.${key} is text`);
  assert.equal(typeof th[key], "string", `th.${key} is text`);
  assert.ok(en[key].trim().length > 0, `en.${key} is not empty`);
  assert.ok(th[key].trim().length > 0, `th.${key} is not empty`);
  assert.deepEqual(placeholdersOf(th[key]), placeholdersOf(en[key]), `${key}: placeholders match between en and th`);
}

// A count is two entries (.one / .other) in both languages.
for (const key of enKeys.filter((name) => name.endsWith(".one"))) {
  assert.ok(`${key.slice(0, -4)}.other` in en, `${key} has a matching .other`);
}

// Thai is real Thai: every entry that is not a technical value differs from the
// English and contains Thai letters.
const technical = new Set(["wholesale.po", "wholesale.account.line", "login.logoAlt", "lang.thTitle", "gem.col.stone"]);
const hasThai = (text) => /[฀-๿]/.test(text);

for (const key of thKeys) {
  if (technical.has(key) || th[key] === en[key]) {
    continue;
  }

  assert.ok(hasThai(th[key]), `th.${key} is written in Thai`);
}

const sameAsEnglish = thKeys.filter((key) => th[key] === en[key]);
assert.deepEqual(
  sameAsEnglish.filter((key) => !technical.has(key)),
  [],
  "Every Thai entry is translated (only technical values may match the English)"
);

// The owner's wording for yellow gold, and no brass by mistake.
assert.equal(th["metal.YG"], "ทองคำเหลือง", "Yellow gold is ทองคำเหลือง");
assert.ok(!Object.values(th).some((text) => text.includes("ทองเหลือง")), "ทองเหลือง (brass) is not used for yellow gold");
assert.equal(en["metal.YG"], "Yellow Gold");

// Product codes, SKU, CSV and file sizes are kept as they are.
assert.ok(th["hint.cardImages"].includes("10 MB") && th["hint.cardImages"].includes("WebP"), "File sizes and formats stay as they are");
assert.ok(th["cust.export"].includes("CSV") && th["news.export"].includes("CSV"), "CSV stays CSV");
assert.ok(th["modal.skuCode"].includes("SKU"), "SKU stays SKU");

// The English is still the plain-English wording the admin had.
assert.equal(en["dash.needsAttention"], "Needs attention");
assert.equal(en["login.title"], "Admin Login");
assert.equal(en["del.confirm"], "Delete permanently");
assert.equal(en["status.product.active"], "Live");

// Statuses, roles, and the other labels the owner reads every day.
for (const prefix of ["status.product.", "status.order.", "status.payment.", "role."]) {
  assert.ok(enKeys.some((key) => key.startsWith(prefix)), `${prefix}* labels exist`);
}

// ── 2. t(), tp() and the browser helper behave the same ───────────────────────

const thT = createAdminT("th");
assert.equal(thT.lang, "th");
assert.equal(thT.t("login.title"), th["login.title"]);
assert.equal(thT.t("setup.passwordHint", { min: 12 }), "อย่างน้อย 12 ตัวอักษร", "{var} interpolation");
assert.equal(createAdminT("en").t("setup.passwordHint", { min: 12 }), "At least 12 characters.");
assert.equal(createAdminT("en").tp("gem.stones", 1), "1 stone");
assert.equal(createAdminT("en").tp("gem.stones", 3), "3 stones");
assert.equal(thT.tp("gem.stones", 3), "3 เม็ด");
assert.equal(createAdminT("en").t("no.such.key"), "no.such.key", "A missing key is shown as itself");
assert.equal(createAdminT("en").t("setup.passwordHint"), "At least {min} characters.", "A missing value leaves its placeholder");
assert.equal(createAdminT("fr").lang, "en", "An unknown language falls back to English");
assert.equal(getAdminLocale("th"), "th-TH");
assert.equal(getAdminLocale("en"), "en-GB");

function runClientHelper(lang, { protocol = "http:" } = {}) {
  const window = { location: { protocol, reloaded: 0, reload() { this.reloaded += 1; } } };
  const document = { cookie: "" };
  vm.runInNewContext(buildAdminI18nBootstrap(lang), { window, document });
  return { window, document };
}

for (const lang of ["en", "th"]) {
  const { window } = runClientHelper(lang);
  const server = createAdminT(lang);

  assert.equal(window.MARIS_ADMIN_I18N.lang, lang);
  assert.equal(window.MARIS_ADMIN_I18N.locale, getAdminLocale(lang), "The browser gets the Intl locale");

  for (const key of Object.keys(getAdminClientMessages(lang))) {
    const vars = { n: 2, count: 3, sku: "MR-1", name: "x", status: "s", percent: 5, mb: 10, actual: "11.2" };
    assert.equal(window.marisAdminT(key, vars), server.t(key, vars), `Browser and server agree on ${key} (${lang})`);
  }

  assert.equal(window.marisAdminT.plural("gem.stones", 1, {}), server.tp("gem.stones", 1));
  assert.equal(window.marisAdminT.plural("gem.stones", 4, {}), server.tp("gem.stones", 4));
  assert.equal(window.marisAdminT("nope"), "nope");
}

// Text that only the server renders is not sent to the browser.
const clientEn = getAdminClientMessages("en");
assert.ok(!("login.title" in clientEn) && !("dash.needsAttention" in clientEn), "Server-only text stays out of the inline dictionary");
assert.ok("error.sessionEnded" in clientEn && "gallery.confirmDelete" in clientEn, "Browser text is sent");

// The inline JSON cannot close the script tag or break out of it.
const hostile = i18n.toInlineJson({ x: "</script><script>alert(1)</script>&" });
assert.ok(!hostile.includes("</script"), "Inline JSON never contains a closing script tag");
assert.deepEqual(JSON.parse(hostile), { x: "</script><script>alert(1)</script>&" }, "...and still decodes to the same value");
assert.ok(!buildAdminI18nBootstrap("th").includes("</script"), "The bootstrap script is safe to inline");
assert.ok(ADMIN_I18N_CLIENT_HELPER.includes("marisAdminSetLang"), "The helper also carries the language switch");

// ── 3. The cookie ─────────────────────────────────────────────────────────────

assert.equal(ADMIN_LANG_COOKIE, "maris_admin_lang");
assert.equal(ADMIN_LANG_COOKIE_PATH, "/admin");
assert.equal(ADMIN_LANG_COOKIE_MAX_AGE, 60 * 60 * 24 * 365, "One year");
assert.equal(buildAdminLangCookie("th"), "maris_admin_lang=th; Path=/admin; Max-Age=31536000; SameSite=Lax");
assert.equal(buildAdminLangCookie("en"), "maris_admin_lang=en; Path=/admin; Max-Age=31536000; SameSite=Lax");
assert.ok(!/httponly/i.test(buildAdminLangCookie("th")), "Not httpOnly: the browser script reads it too");
assert.ok(buildAdminLangCookie("th", { secure: true }).endsWith("; Secure"), "Secure on https");
assert.equal(buildAdminLangCookie("xx"), buildAdminLangCookie("en"), "Only th or en can be stored");
assert.equal(normalizeAdminLang(undefined), "en", "Default is English when no cookie is set");
assert.equal(normalizeAdminLang(""), "en");
assert.equal(normalizeAdminLang("TH"), "th");
assert.equal(normalizeAdminLang("de"), "en");

// The switch the browser runs writes that same cookie and reloads.
{
  const { window, document } = runClientHelper("en");
  window.marisAdminSetLang("th");
  assert.equal(document.cookie, buildAdminLangCookie("th"), "The browser stores the same cookie the server builds");
  assert.equal(window.location.reloaded, 1, "Switching language reloads the page");
  window.marisAdminSetLang("de");
  assert.equal(window.location.reloaded, 1, "An unknown language is ignored");
  const secure = runClientHelper("en", { protocol: "https:" });
  secure.window.marisAdminSetLang("en");
  assert.equal(secure.document.cookie, buildAdminLangCookie("en", { secure: true }));
}

const toggleScript = await read("assets/js/admin-lang-toggle.js");
assert.match(toggleScript, /marisAdminSetLang/, "The toggle script uses the shared language setter");
assert.match(toggleScript, /data-admin-lang-set/, "...from buttons marked data-admin-lang-set");
assert.doesNotMatch(toggleScript, /localStorage|sessionStorage/, "The choice lives in the cookie only");

const langReader = await read("app/lib/admin-lang.js");
assert.match(langReader, /cookies\(\)/, "The server reads the cookie");
assert.match(langReader, /ADMIN_LANG_COOKIE/, "...by its shared name");

// ── 4. Admin sources use the dictionary ───────────────────────────────────────

const sources = {
  "app/admin/page.js": await read("app/admin/page.js"),
  "app/admin/login/page.js": await read("app/admin/login/page.js"),
  "app/admin/setup/page.js": await read("app/admin/setup/page.js"),
  "assets/js/admin-page.js": await read("assets/js/admin-page.js"),
  "assets/js/admin-wholesale.js": await read("assets/js/admin-wholesale.js"),
  "assets/js/admin-people.js": await read("assets/js/admin-people.js"),
  "assets/js/admin-gem-report-parser.js": await read("assets/js/admin-gem-report-parser.js"),
  "assets/js/admin-image-group-parser.js": await read("assets/js/admin-image-group-parser.js")
};
const clientScripts = ["assets/js/admin-page.js", "assets/js/admin-wholesale.js", "assets/js/admin-people.js"];

// Every key a source asks for exists in the dictionary, and the browser scripts
// only ask for keys that are sent to the browser.
for (const [file, source] of Object.entries(sources)) {
  for (const match of source.matchAll(/(?<![\w$.])(tp?)\(\s*"([^"\n]+)"/g)) {
    const [, fn, key] = match;
    const exists = key in en || (fn === "tp" && `${key}.one` in en && `${key}.other` in en);
    assert.ok(exists, `${file} uses ${key}, which is in the dictionary`);

    if (clientScripts.includes(file)) {
      const sent = key in clientEn || (`${key}.one` in clientEn && `${key}.other` in clientEn);
      assert.ok(sent, `${file} uses ${key}, which is sent to the browser`);
    }
  }
}

// Keys picked at run time are checked for every value they can take.
for (const code of ["WG", "YG", "RG", "PN", "Pd", "AG"]) assert.ok(`metal.${code}` in clientEn, `metal.${code}`);
for (const view of ["hero", "heroOption", "top", "front", "side", "back"]) assert.ok(`imageView.${view}` in clientEn, `imageView.${view}`);
for (const slot of ["cover", "hover"]) assert.ok(`card.slot.${slot}` in clientEn, `card.slot.${slot}`);
for (const name of ["engagement-ring", "wedding-set", "wedding-bands", "mens-wedding-bands", "necklaces-pendants", "bracelets", "earrings", "rings"]) {
  assert.ok(`collection.${name}` in clientEn, `collection.${name}`);
}
for (const permission of ["catalogue:write", "catalogue:delete", "operations:write", "settings:write", "personal-data:export", "payments:write", "default"]) {
  assert.ok(`perm.denied.${permission}` in clientEn, `perm.denied.${permission}`);
}
for (const role of ["owner", "ceo", "developer", "admin", "manager", "staff", "viewer"]) assert.ok(`role.${role}` in en, `role.${role}`);

// The browser scripts no longer carry the English wording: it moved to the dictionary.
const movedStrings = {
  "assets/js/admin-page.js": [
    "Loading products...", "Saved successfully.", "Could not save changes.", "Choose a product from the list first.",
    "Follow-up saved.", "Best Seller carousel updated.", "No custom requests yet.", "Data refreshed.",
    "Your session has ended.", "Delete this gallery image?", "Scroll sideways to see more columns", "Not specified",
    "Reserved stock cannot be more than real stock.", "Remove the turntable video and its poster?", "Image order updated.",
    "Unsaved changes", "Needs follow-up", "Quote request", "Open image", "Check failed", "Price on request is", "No stock movement yet."
  ],
  "assets/js/admin-wholesale.js": [
    "No purchase orders match these filters.", "Needs quote", "Send quote", "Save wholesale terms",
    "No accounts match these filters.", "Open the Wholesale tab to load data.", "Write the note first.", "Add price break"
  ],
  "assets/js/admin-people.js": [
    "Not signed up", "No name", "Preparing...", "Could not load the list.", "Downloaded ${name}"
  ],
  "app/admin/page.js": [
    "Needs attention", "Add a Product in 3 Steps", "Stock Rule", "Save Movement", "Create Reserved Order",
    "Download customers (CSV)", "Checks the server connection", "Delete permanently", "Log Out", "Custom Requests", "Pricing &amp; MOQ"
  ],
  "app/admin/login/page.js": ["Admin Login", "Sign In", "Protected Back Office", "Username or password is not correct."],
  "app/admin/setup/page.js": ["Create Owner Account", "Create Owner", "Confirm Password", "Display Name"]
};
const allEnglish = Object.values(en).join("\n");

for (const [file, strings] of Object.entries(movedStrings)) {
  for (const text of strings) {
    assert.ok(!sources[file].includes(text), `${file} no longer hard-codes "${text}"`);
  }
}

// ...and the wording they dropped is still in the English dictionary.
for (const text of [
  "Loading products...", "Saved successfully.", "Could not save changes.", "Choose a product from the list first.",
  "Best Seller carousel updated.", "Needs attention", "Stock Rule", "Delete permanently", "Send quote", "Admin Login"
]) {
  assert.ok(allEnglish.includes(text), `The English dictionary keeps "${text}"`);
}

// Stored values stay English on purpose (the storefront and the database read them).
assert.match(sources["assets/js/admin-page.js"], /const IMAGE_METAL_LABELS = \["White Gold", "Yellow Gold", "Rose Gold"\]/, "Image tags stay English data");
assert.match(sources["assets/js/admin-page.js"], /function getCollectionDataLabel\(/, "A product's saved category stays the English title");
assert.doesNotMatch(
  sources["assets/js/admin-page.js"],
  /category: getCollectionLabel\(/,
  "The translated collection name is never saved as a category"
);

// Dates and numbers use the language's locale.
for (const file of clientScripts) {
  assert.doesNotMatch(sources[file], /toLocale(?:Date|Time)?String\(\)/, `${file} always passes a locale to toLocaleString`);
  assert.doesNotMatch(sources[file], /(?:toLocale\w*String|Intl\.\w+)\(\s*"en-GB"/, `${file} takes its locale from the admin language`);
}
assert.match(sources["assets/js/admin-page.js"], /const adminLocale = window\.MARIS_ADMIN_I18N\?\.locale \|\| "en-GB"/);
assert.match(sources["assets/js/admin-wholesale.js"], /new Intl\.DateTimeFormat\(locale,/);
assert.match(sources["assets/js/admin-people.js"], /toLocaleDateString\(locale,/);

// An unsaved edit still asks before the page goes away (so before a language reload).
assert.match(sources["assets/js/admin-page.js"], /addEventListener\("beforeunload"/, "The unsaved-work guard is still there");
assert.match(sources["assets/js/admin-page.js"], /hasUnsavedAdminWork\(\)/);
assert.match(toggleScript, /marisAdminSetLang/, "The switch goes through location.reload(), which fires beforeunload");
assert.match(ADMIN_I18N_CLIENT_HELPER, /location\.reload\(\)/);

// Wiring: top bar switch, shell language, injected dictionary, server-read cookie.
const adminPage = sources["app/admin/page.js"];
assert.match(adminPage, /readAdminLang\(\)/, "The admin page reads the language cookie");
assert.match(adminPage, /<AdminLangSwitch lang=\{lang\}/, "The top bar has the TH | EN switch");
assert.match(adminPage, /className="admin-page-shell"\s+lang=\{lang\}/, "The admin shell carries lang");
assert.match(adminPage, /<AdminI18nScript lang=\{lang\} \/>/, "The dictionary is injected for the browser scripts");
assert.ok(adminPage.indexOf("<AdminI18nScript") < adminPage.indexOf("<Script src={adminPageScriptSrc}"), "The dictionary arrives before the admin scripts");
assert.match(sources["app/admin/login/page.js"], /<AdminLangSwitch lang=\{lang\} t=\{t\} className=\{styles\.langSwitch\}/, "The sign-in card has the switch in its corner");
assert.match(sources["app/admin/login/page.js"], /<main className=\{styles\.page\} id="main-content" lang=\{lang\}/, "The sign-in page carries lang");
assert.match(sources["app/admin/setup/page.js"], /readAdminLang\(\)/, "Setup follows the language too");
assert.match(await read("app/admin/login/login.module.css"), /\.langSwitch\s*\{[^}]*position:\s*absolute/, "The sign-in switch sits in the card corner");
assert.match(await read("app/admin/layout.js"), /return children;/, "The admin layout still renders children without html or body");
assert.doesNotMatch(await read("app/admin/AdminLangSwitch.jsx") + (await read("app/admin/AdminI18nScript.jsx")), /<body|<html/, "No nested document shell");

// ── 5. CSV headers follow the language; BOM and neutralising stay ─────────────

const lists = await import("../app/lib/admin-people-lists.js");
const { createAdminPeopleHandlers } = await import("../app/lib/admin-people-api.js");
const customerRow = {
  id: "1", fullName: "=HYPERLINK(\"x\")", email: "a@example.com", phone: "+66 81", createdAt: "2026-01-02T00:00:00Z",
  marketing: "subscribed", bagCount: 2, wishlistCount: 0
};
const subscriberRow = { id: "2", email: "b@example.com", status: "unsubscribed", subscribedAt: "2026-02-03T00:00:00Z", source: "-cmd", hasAccount: true };

const enCustomers = lists.customersToCsv([customerRow]);
const thCustomers = lists.customersToCsv([customerRow], "th");
const enSubscribers = lists.subscribersToCsv([subscriberRow]);
const thSubscribers = lists.subscribersToCsv([subscriberRow], "th");

assert.ok(enCustomers.startsWith(`${lists.CSV_BOM}Name,Email,Phone,Created,Marketing emails,Saved bag items,Saved wishlist items\r\n`), "English CSV headers are unchanged");
assert.ok(thCustomers.startsWith(`${lists.CSV_BOM}${th["csv.customers.name"]},${th["csv.customers.email"]},`), "Thai CSV headers");
assert.ok(enSubscribers.startsWith(`${lists.CSV_BOM}Email,Status,Subscribed on,Source,Has account\r\n`));
assert.ok(thSubscribers.startsWith(`${lists.CSV_BOM}${th["csv.newsletter.email"]},${th["csv.newsletter.status"]},`));
assert.ok(thSubscribers.includes(th["people.status.unsubscribed"]) && thSubscribers.includes(th["common.yes"]), "Thai labels in the rows");
assert.ok(enSubscribers.includes("Unsubscribed") && enSubscribers.includes(",Yes"), "English labels in the rows");

for (const csv of [enCustomers, thCustomers, enSubscribers, thSubscribers]) {
  assert.ok(csv.startsWith(lists.CSV_BOM), "The UTF-8 byte order mark stays");
  assert.ok(csv.endsWith("\r\n"), "CRLF rows stay");
}
assert.ok(thCustomers.includes("\"'=HYPERLINK(\"\"x\"\")\""), "A cell starting with = is still neutralised (Thai)");
assert.ok(enCustomers.includes("\"'=HYPERLINK(\"\"x\"\")\""), "A cell starting with = is still neutralised (English)");
assert.ok(thSubscribers.includes("'-cmd") && enSubscribers.includes("'-cmd"), "A cell starting with - is neutralised in both");
assert.equal(lists.parseCsvLang(new URLSearchParams("lang=th")), "th");
assert.equal(lists.parseCsvLang(new URLSearchParams("")), "en", "English when the request names no language");
assert.equal(lists.parseCsvLang(new URLSearchParams("lang=zz")), "en");

const handlers = createAdminPeopleHandlers("customers", {
  requirePermission: async () => ({ ok: true }),
  readCustomers: async () => ({ isConfigured: true, customers: [customerRow], checkedAt: "now" }),
  readSubscribers: async () => ({ isConfigured: true, subscribers: [], checkedAt: "now" })
});
const thExport = await handlers.export(new Request("https://admin.test/api/admin/customers/export?lang=th"));
const enExport = await handlers.export(new Request("https://admin.test/api/admin/customers/export"));
// Response.text() drops a leading BOM, so read the bytes.
const thBytes = new Uint8Array(await thExport.arrayBuffer());
const enBytes = new Uint8Array(await enExport.arrayBuffer());
assert.deepEqual([...thBytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "The downloaded file starts with the UTF-8 BOM");
assert.deepEqual([...enBytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
assert.ok(new TextDecoder("utf-8", { ignoreBOM: true }).decode(thBytes).startsWith(`${lists.CSV_BOM}${th["csv.customers.name"]},`), "The export route follows ?lang=th");
assert.ok(new TextDecoder("utf-8", { ignoreBOM: true }).decode(enBytes).startsWith(`${lists.CSV_BOM}Name,`), "The export route defaults to English");
assert.equal(thExport.headers.get("Content-Type"), "text/csv; charset=utf-8");
assert.match(sources["assets/js/admin-people.js"], /queryString\(\{ lang: adminLang \}\)/, "The page asks for the CSV in its own language");

// ── 6. The pages render in the chosen language ────────────────────────────────
// The sign-in, setup and admin pages are rendered for real here (JSX compiled
// with Next's own compiler, Next's server modules replaced by small stand-ins),
// once per cookie value, so what is checked is the HTML a browser would get.

const require = createRequire(import.meta.url);
const swc = require("next/dist/build/swc");
await swc.loadBindings();
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

process.env.MARIS_ADMIN_SESSION_SECRET = process.env.MARIS_ADMIN_SESSION_SECRET || "admin-i18n-test-secret";

const world = { cookie: undefined, session: undefined, setup: {} };
const moduleCache = new Map();
const OWNER_PERMISSIONS = ["read", "catalogue:write", "catalogue:delete", "operations:write", "payments:write", "settings:write", "customers:read", "newsletter:read", "personal-data:export"];
const esm = (exports) => ({ __esModule: true, ...exports });
const stubs = {
  "next/headers": esm({
    cookies: async () => ({
      get: (name) => {
        const values = { [ADMIN_LANG_COOKIE]: world.cookie, maris_admin_session: world.session };
        return values[name] === undefined ? undefined : { value: values[name] };
      }
    })
  }),
  "next/navigation": esm({
    redirect: (target) => { throw Object.assign(new Error(`redirect:${target}`), { redirectTo: target }); }
  }),
  "next/image": esm({ default: ({ src, alt, width, height }) => React.createElement("img", { src, alt, width, height }) }),
  "next/script": esm({ default: ({ src }) => React.createElement("script", { src }) }),
  "lib/admin-users.js": esm({
    getAdminSetupState: async () => world.setup,
    logAdminConfigProblem: () => {}
  }),
  "lib/admin-authorization.js": esm({
    authorizeAdminSessionValue: async () => ({ ok: true, user: { role: "owner", username: "owner", displayName: "Maris Owner" } }),
    getAdminRoleLabel: () => "Owner",
    getAdminRolePermissions: () => OWNER_PERMISSIONS,
    normalizeAdminRole: (role) => String(role || "").trim().toLowerCase()
  }),
  "admin/AdminBodyClass.jsx": esm({ default: () => null })
};

function loadModule(absolutePath) {
  if (moduleCache.has(absolutePath)) {
    return moduleCache.get(absolutePath).exports;
  }

  const relative = path.relative(ROOT, absolutePath).split(path.sep).join("/");
  const stubKey = Object.keys(stubs).find((key) => relative === `app/${key}`);
  const module = { exports: {} };
  moduleCache.set(absolutePath, module);

  if (stubKey) {
    module.exports = stubs[stubKey];
    return module.exports;
  }

  const source = require("node:fs").readFileSync(absolutePath, "utf8");
  const { code } = swc.transformSync(source, {
    filename: absolutePath,
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } }, target: "es2022" },
    module: { type: "commonjs" }
  });
  const localRequire = (specifier) => {
    if (stubs[specifier]) return stubs[specifier];
    if (specifier.endsWith(".css")) return new Proxy({}, { get: (_, name) => (name === "__esModule" ? undefined : String(name)) });
    if (specifier.startsWith(".")) {
      const base = path.resolve(path.dirname(absolutePath), specifier);
      const found = ["", ".js", ".jsx", ".mjs"].map((extension) => base + extension).find((candidate) => require("node:fs").existsSync(candidate) && require("node:fs").statSync(candidate).isFile());
      return loadModule(found || base);
    }
    return require(specifier);
  };
  new Function("require", "module", "exports", code)(localRequire, module, module.exports);
  module.exports = module.exports;
  return module.exports;
}

// Server components may be async: walk the tree, run each component, keep the HTML.
async function resolveTree(node) {
  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "string" || typeof node === "number") return node;
  if (Array.isArray(node)) return Promise.all(node.map(resolveTree));
  if (typeof node.type === "function") return resolveTree(await node.type(node.props));
  if (node.type === React.Fragment) return React.createElement(React.Fragment, null, ...React.Children.toArray(await resolveTree(node.props.children)));
  const { children, ...props } = node.props || {};
  const resolved = React.Children.toArray(await resolveTree(children));
  return React.createElement(node.type, props, ...resolved);
}

async function renderPage(file, { cookie, searchParams = {}, setup = {}, signedIn = false } = {}) {
  world.cookie = cookie;
  world.session = signedIn ? "stub-session" : undefined;
  world.setup = setup;
  moduleCache.clear();
  const page = loadModule(path.join(ROOT, file)).default;
  const tree = await resolveTree(await page({ searchParams: Promise.resolve(searchParams) }));
  return renderToStaticMarkup(tree);
}

// Visible text only, so attribute values and script bodies do not count.
const visibleText = (html) => html
  .replace(/<script[\s\S]*?<\/script>/g, " ")
  .replace(/<[^>]*>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, "\"")
  .replace(/\s+/g, " ");

const loginTh = await renderPage("app/admin/login/page.js", { cookie: "th", setup: { isConfigured: true } });
assert.match(loginTh, /<main[^>]*lang="th"/, "The sign-in page is lang=th with the cookie");
assert.ok(loginTh.includes(th["login.title"]) && loginTh.includes(th["login.username"]) && loginTh.includes(th["login.submit"]), "The sign-in page renders Thai when the cookie is th");
assert.ok(!loginTh.includes("Admin Login") && !visibleText(loginTh).includes("Sign In") && !loginTh.includes("Protected Back Office"), "...and no English sign-in wording is left");
assert.match(loginTh, /data-admin-lang-set="th" aria-pressed="true"/, "The TH button is the pressed one");
assert.match(loginTh, /data-admin-lang-set="en" aria-pressed="false"/);
assert.match(loginTh, /class="[^"]*langSwitch[^"]*"/, "The switch is in the card corner");
assert.ok(loginTh.includes("window.MARIS_ADMIN_I18N="), "The sign-in page hands the cookie settings to the toggle script");
assert.ok(loginTh.includes("admin-lang-toggle.js"), "...and loads the toggle script");

const loginEn = await renderPage("app/admin/login/page.js", { cookie: undefined, setup: { isConfigured: true } });
assert.match(loginEn, /<main[^>]*lang="en"/, "English by default");
assert.ok(loginEn.includes("Admin Login") && loginEn.includes("Sign In") && !hasThai(visibleText(loginEn)), "No cookie: English, no Thai");
const loginOdd = await renderPage("app/admin/login/page.js", { cookie: "klingon", setup: { isConfigured: true } });
assert.ok(loginOdd.includes("Admin Login"), "A broken cookie value falls back to English");
const loginError = await renderPage("app/admin/login/page.js", { cookie: "th", searchParams: { error: "invalid" }, setup: { isConfigured: true } });
assert.ok(loginError.includes(th["login.invalid"]), "The error banner is Thai");
const loginDb = await renderPage("app/admin/login/page.js", { cookie: "th", setup: { isConfigured: false } });
assert.ok(loginDb.includes(th["login.dbNotConnected"]), "The database notice is Thai");

const setupTh = await renderPage("app/admin/setup/page.js", { cookie: "th", setup: { isConfigured: true, hasAdminUsers: false, canCreateInitialAdmin: true } });
assert.ok(setupTh.includes(th["setup.title"]) && setupTh.includes(th["setup.confirmPassword"]), "Setup renders Thai");
assert.ok(setupTh.includes(createAdminT("th").t("setup.passwordHint", { min: 12 })), "The password hint is Thai with the real minimum");
const setupEn = await renderPage("app/admin/setup/page.js", { cookie: undefined, setup: { isConfigured: true, hasAdminUsers: false, canCreateInitialAdmin: true } });
assert.ok(setupEn.includes("Create Owner Account") && setupEn.includes("At least 12 characters."));

const adminTh = await renderPage("app/admin/page.js", { cookie: "th", signedIn: true });
const adminEn = await renderPage("app/admin/page.js", { cookie: undefined, signedIn: true });
const adminThText = visibleText(adminTh);
const adminEnText = visibleText(adminEn);

assert.match(adminTh, /class="admin-page-shell" lang="th"/, "The admin shell is lang=th");
assert.match(adminEn, /class="admin-page-shell" lang="en"/, "The admin shell is lang=en by default");
assert.match(adminTh, /class="admin-lang-switch[^"]*"[^>]*>[\s\S]*data-admin-lang-set="th" aria-pressed="true"/, "The top bar shows the switch with TH selected");
assert.ok(adminTh.indexOf("admin-lang-switch") < adminTh.indexOf("admin-user"), "The switch is in the top bar next to the user");

for (const key of [
  "nav.dashboard", "nav.products", "nav.bestSeller", "nav.inventory", "nav.orders", "nav.customRequests", "nav.inquiries",
  "nav.wholesale", "nav.customers", "nav.newsletter", "nav.settings", "dash.needsAttention", "dash.stockRule", "inv.save",
  "orders.create", "cust.export", "news.export", "sys.title", "del.confirm", "ws.tab.pricing", "bs.save", "form.addProductSubmit"
]) {
  assert.ok(adminThText.includes(th[key]), `The Thai admin shows ${key}`);
  assert.ok(adminEnText.includes(en[key]), `The English admin shows ${key}`);
}

// Nothing a manager reads in the Thai admin is left in English (technical words aside).
for (const key of [
  "dash.needsAttention", "dash.allClear", "dash.stockRule", "dash.addIn3Steps", "inv.save", "orders.create", "orders.note",
  "cr.note", "ws.note", "inq.note", "cust.export", "news.export", "sys.note", "set.none", "del.intro", "del.confirm",
  "bs.save", "bs.pickNote", "products.col.available", "form.addProductSubmit", "form.specsNote", "page.logout", "page.viewStorefront",
  "common.allStatuses", "wholesale.status.in_production"
]) {
  assert.ok(!adminThText.includes(en[key]), `The Thai admin no longer shows "${en[key]}"`);
}

assert.ok(adminTh.includes("window.MARIS_ADMIN_I18N="), "The dictionary is injected into the Thai admin");
const bootstrap = /<script id="maris-admin-i18n">([\s\S]*?)<\/script>/.exec(adminTh);
assert.ok(bootstrap, "The inline dictionary script is rendered");
{
  const { window } = (() => {
    const sandbox = { window: { location: { protocol: "http:", reload() {} } }, document: { cookie: "" } };
    vm.runInNewContext(bootstrap[1].replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"), sandbox);
    return sandbox;
  })();
  assert.equal(window.MARIS_ADMIN_I18N.lang, "th");
  assert.equal(window.MARIS_ADMIN_I18N.locale, "th-TH");
  assert.equal(window.marisAdminT("gallery.deleting"), th["gallery.deleting"], "The browser helper speaks Thai on the Thai page");
}
assert.ok(adminTh.indexOf("window.MARIS_ADMIN_I18N=") < adminTh.indexOf("admin-page.js"), "The dictionary arrives before the admin scripts");
assert.ok(adminTh.includes("admin-lang-toggle.js"), "The admin loads the toggle script");
assert.ok(adminTh.includes(th["hint.cardImages"]) && adminTh.includes(th["hint.galleryImages"]) && adminTh.includes(th["hint.gemReportFile"]), "File size and format hints are Thai");
assert.ok(adminTh.includes(">TH<") && adminTh.includes(">EN<"), "The switch is the compact TH | EN");
assert.ok(adminTh.includes("MR-RNG-001"), "Product codes and SKU samples stay as they are");
assert.ok(adminTh.includes("value=\"Wedding Set\"") && adminTh.includes("value=\"Necklaces &amp; Pendants\"") , "Category values stay English data");
assert.ok(adminTh.includes(">" + th["collection.wedding-set"] + "<"), "...while their labels are Thai");

// ── 7. Server messages that are not translated ────────────────────────────────

// The admin APIs send plain English text with no error code, except the wholesale
// price break codes, which the page maps to the dictionary. The page shows the
// server text as it comes; scripts/test-admin-i18n.mjs documents the places here.
assert.match(sources["assets/js/admin-wholesale.js"], /priceBreaksOrder: t\("wholesale\.hint\.priceBreaksOrder"\)/, "Wholesale price break codes are translated");
assert.match(sources["assets/js/admin-page.js"], /payload\.error \|\| t\("error\.server"/, "Server error text is shown as sent, with a translated fallback");

console.log("PASS: Admin Thai / English switch contract is wired.");
