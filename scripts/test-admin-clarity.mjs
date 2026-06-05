import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const adminHtml = await readFile(new URL("../pages/admin.html", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../assets/js/admin-page.js", import.meta.url), "utf8");
const homepageHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const homepageJs = await readFile(new URL("../assets/js/homepage.js", import.meta.url), "utf8");
const homepageCss = await readFile(new URL("../assets/css/style.css", import.meta.url), "utf8");
const contactHtml = await readFile(new URL("../pages/contact-us.html", import.meta.url), "utf8");
const newsletterHtml = await readFile(new URL("../pages/newsletter.html", import.meta.url), "utf8");
const quoteHtml = await readFile(new URL("../pages/request-quote.html", import.meta.url), "utf8");
const formSubmissionsJs = await readFile(new URL("../assets/js/form-submissions.js", import.meta.url), "utf8");
const productDataJs = await readFile(new URL("../assets/js/product-data.js", import.meta.url), "utf8");
const sitemapXml = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
const typographySource = (await Promise.all([
  "../index.html",
  "../404.html",
  "../assets/css/style.css",
  "../assets/css/engagement-ring.css",
  "../assets/css/placeholder.css",
  "../assets/css/admin.css",
  "../assets/css/product.css",
  "../assets/css/site-header.css",
  "../assets/css/footer.css",
  "../app/admin/login/login.module.css"
].map((sourcePath) => readFile(new URL(sourcePath, import.meta.url), "utf8")))).join("\n");
const { POST: postPaymentWebhook } = await import("../app/api/webhooks/payment/route.js");
const { default: nextConfig } = await import("../next.config.mjs");
const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const redirects = await nextConfig.redirects();

assert.equal(
  path.resolve(nextConfig.turbopack?.root || ""),
  projectRoot,
  "Next/Turbopack root should stay pinned to this repository, not the parent portfolio workspace"
);

assert.ok(
  redirects.some((redirectRule) => (
    redirectRule.source === "/pages/admin.html"
    && redirectRule.destination === "/admin"
    && redirectRule.permanent === false
  )),
  "The legacy /pages/admin.html route must go through the protected /admin gate"
);

assert.match(
  adminHtml,
  /Supabase is now the storefront catalogue source/i,
  "Admin copy must frame Supabase as the storefront catalogue source"
);

assert.doesNotMatch(
  adminHtml,
  /Optional Manual Publish|Publish \/ Update|published catalogue items managed|data-published-catalogue-table|data-published-count|Manual Browser Sandbox|Browser-only sandbox|browser-only tools|Reset Demo Data/i,
  "Admin HTML must not present browser-local catalogue drafts, inventory, or orders as production controls"
);

assert.doesNotMatch(
  adminJs,
  /Catalogue product published|unpublished|Initial stock from catalogue publish|publishedCatalogueKey|readPublishedCatalogueProducts|writePublishedCatalogueProducts|data-catalogue-delete/i,
  "Admin JavaScript must not show publish/unpublish language for browser-local catalogue drafts"
);

assert.doesNotMatch(
  adminJs,
  /marisAdminProducts|marisInventoryLogs|marisAdminOrders|productsKey|logsKey|ordersKey|applyMovement|backendConnected|Reset Demo Data/i,
  "Admin products, inventory, and orders must not use browser-local storage or demo reset state"
);

assert.doesNotMatch(
  adminJs,
  /Google Sheet feed|Google Sheet products|Google Sheet still drives|sheet is back online/i,
  "Admin JavaScript must not describe Google Sheet as the live catalogue source"
);

assert.match(
  adminJs,
  /loadAdminBackendData\(\)/,
  "Admin JavaScript must load products, inventory, and orders from the protected Supabase APIs"
);

assert.doesNotMatch(
  productDataJs,
  /marisPublishedCatalogueProducts|MARIS_PUBLISHED_PRODUCTS|publishedProductsKey|docs\.google\.com\/spreadsheets/,
  "Storefront product data must not read browser-local products or Google Sheet as a live source"
);

assert.doesNotMatch(
  [contactHtml, newsletterHtml, quoteHtml, formSubmissionsJs].join("\n"),
  /Netlify|data-netlify|netlify-honeypot|submitToNetlify/i,
  "Public lead forms must not claim unsupported Netlify form delivery in the Vercel workflow"
);

assert.match(
  formSubmissionsJs,
  /dataset\.submitEndpoint/,
  "Form submissions should only post to an explicitly configured endpoint"
);

const paymentWebhookResponse = await postPaymentWebhook();
const paymentWebhookPayload = await paymentWebhookResponse.json();
assert.equal(paymentWebhookResponse.status, 501, "Payment webhook must stay disabled until a real gateway integration exists");
assert.equal(paymentWebhookPayload.error, "payment_webhook_not_configured");
assert.equal("success" in paymentWebhookPayload, false, "Disabled payment webhook must not report success");

assert.doesNotMatch(
  sitemapXml,
  /netlify\.app/i,
  "Sitemap must not point to the old Netlify deployment domain"
);

assert.match(
  sitemapXml,
  /https:\/\/www\.your-domain\.com\//,
  "Sitemap should use the documented production-domain placeholder until the real domain is set"
);

assert.match(
  homepageHtml,
  /data-atelier-reveal/,
  "Homepage should include the Maris Atelier Reveal surprise section"
);

for (const requiredAtelierHook of [
  "data-atelier-status",
  "data-atelier-focus",
  "data-atelier-products"
]) {
  assert.match(
    homepageHtml,
    new RegExp(requiredAtelierHook),
    `Atelier Reveal should expose ${requiredAtelierHook} for read-only catalogue rendering`
  );
}

assert.match(
  homepageJs,
  /\/api\/catalogue\/products/,
  "Atelier Reveal should read public catalogue data through the Supabase-backed API"
);

assert.doesNotMatch(
  homepageJs,
  /localStorage|sessionStorage|indexedDB/i,
  "Homepage surprise must not store catalogue, lead, order, or stock data in browser storage"
);

assert.match(
  homepageJs,
  /atelier-unavailable/,
  "Atelier Reveal should render an honest unavailable state instead of fake products"
);

assert.match(
  homepageCss,
  /\.atelier-reveal\b/,
  "Atelier Reveal should have a dedicated visual treatment"
);

assert.match(
  homepageCss,
  /\.atelier-product-grid\b/,
  "Atelier Reveal should render a stable responsive product grid"
);

assert.doesNotMatch(
  typographySource,
  /Cormorant|Georgia|Arial|letter-spacing:\s*-/i,
  "Maris typography should stay on the shared Urbanist/Anuphan stack without clashing legacy fonts or negative tracking"
);
