import { readFile } from "node:fs/promises";

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const source = await readFile(new URL("../app/components/GoogleTagManager.jsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.js", import.meta.url), "utf8");
const config = await readFile(new URL("../next.config.mjs", import.meta.url), "utf8");
check(layout.includes('process.env.VERCEL_ENV === "production" && <GoogleTagManager />'), "Only Vercel production mounts GTM");
check(!source.includes("<iframe"), "No consent-bypassing noscript iframe");
check(config.includes("https://*.google-analytics.com"), "CSP must permit GA collection");

function harness(initialConsent = null, initialPath = "/") {
  let consent = initialConsent;
  let pathname = initialPath;
  let listener;
  let cleanup;
  let reloads = 0;
  const scripts = [];
  const window = { location: { reload() { reloads += 1; } } };
  const document = {
    getElementById(id) { return scripts.find((script) => script.id === id); },
    createElement() {
      const script = { remove() { scripts.splice(scripts.indexOf(script), 1); } };
      return script;
    },
    head: { appendChild(script) { scripts.push(script); } }
  };
  // The component renders null and has no JSX. Execute its real effect with
  // browser/hook stubs to test ordering, Strict Mode replay, and revocation.
  const body = source.replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default function GoogleTagManager", "function GoogleTagManager");
  const Component = new Function(
    "useEffect", "usePathname", "readCookieConsent", "onCookieConsentChange", "window", "document",
    body + "\nreturn GoogleTagManager;"
  )(
    (effect) => { cleanup = effect(); }, () => pathname, () => consent,
    (callback) => { listener = callback; return () => { listener = undefined; }; },
    window, document
  );
  function render(path = pathname) {
    cleanup?.();
    pathname = path;
    Component();
  }
  render();
  return {
    window, scripts, render,
    get reloads() { return reloads; },
    change(value) { consent = value; listener(value); },
    cleanup() { cleanup(); return listener; }
  };
}

const noConsent = harness();
check(noConsent.scripts.length === 0, "No request before a cookie choice");
noConsent.change({ analytics: false, marketing: false });
check(noConsent.scripts.length === 0, "Necessary-only never loads GTM");
noConsent.change({ analytics: false, marketing: true });
check(noConsent.scripts.length === 0, "Marketing-only does not opt into analytics");
noConsent.change({ analytics: true, marketing: false });
check(noConsent.scripts.length === 1, "Analytics opt-in loads GTM");
check(noConsent.scripts[0].src === "https://www.googletagmanager.com/gtm.js?id=GTM-M3PZSLMH", "Correct container");
check(noConsent.scripts[0].async === true, "GTM loads asynchronously");
const queue = noConsent.window.dataLayer;
check(queue[0][0] === "consent" && queue[0][1] === "default", "Consent defaults precede GTM");
check(queue[0][2].analytics_storage === "denied", "Analytics denied by default");
const start = queue.findIndex((item) => item.event === "gtm.js");
check(start > 0 && queue[start - 1][2].analytics_storage === "granted", "Opt-in is queued before GTM startup");
check(queue[start - 1][2].ad_storage === "denied", "Analytics-only keeps ads denied");

noConsent.render();
noConsent.render("/th/category/rings");
check(noConsent.scripts.length === 1, "Strict Mode and navigation do not duplicate GTM");
check(queue.filter((item) => item.event === "gtm.js").length === 1, "Only one startup event");
noConsent.change({ analytics: true, marketing: true });
check(queue.at(-1)[2].ad_user_data === "granted", "Marketing choice updates consent v2");
noConsent.change({ analytics: false, marketing: false });
check(queue.at(-1)[2].analytics_storage === "denied" && noConsent.reloads === 1, "Revocation denies and unloads tags via reload");
check(noConsent.cleanup() === undefined, "Consent event subscription cleans up");

const saved = harness({ analytics: true, marketing: false });
check(saved.scripts.length === 1, "Saved consent loads on a later visit");
saved.scripts[0].onerror();
check(saved.scripts.length === 0, "Failed downloads can be retried");
saved.render();
check(saved.scripts.length === 1, "Retry works without duplicate live scripts");
saved.render("/admin");
check(saved.reloads === 1, "Entering admin unloads a previously active container");
for (const path of ["/admin", "/admin/login", "/admin/products"]) {
  check(harness({ analytics: true, marketing: true }, path).scripts.length === 0, "Admin must never load GTM");
}
console.log("PASS: GTM consent gating, startup order, deduplication, retries, revocation, and admin exclusion.");
