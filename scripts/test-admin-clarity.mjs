import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const adminHtml = await readFile(new URL("../app/admin/page.js", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../assets/js/admin-page.js", import.meta.url), "utf8");
const productDataJs = await readFile(new URL("../assets/js/product-data.js", import.meta.url), "utf8");
const contactPage = await readFile(new URL("../app/contact-us/page.js", import.meta.url), "utf8");
const quotePage = await readFile(new URL("../app/request-quote/RequestQuoteClient.jsx", import.meta.url), "utf8");
const homepage = await readFile(new URL("../app/page.js", import.meta.url), "utf8");
const typographySource = (await Promise.all([
  "../assets/css/style.css",
  "../assets/css/engagement-ring.css",
  "../assets/css/placeholder.css",
  "../app/admin/admin.css",
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
  /<body\b/i,
  "Admin page must not render a nested body inside the root layout body"
);

assert.match(
  adminHtml,
  /<AdminBodyClass\s*\/>/,
  "Admin page should set its body class through a client helper instead of rendering a body tag"
);

assert.doesNotMatch(
  adminHtml,
  /Optional Manual Publish|Publish \/ Update|published catalogue items managed|data-published-catalogue-table|data-published-count|Manual Browser Sandbox|Browser-only sandbox|browser-only tools|Reset Demo Data/i,
  "Admin HTML must not present browser-local catalogue drafts, inventory, or orders as production controls"
);

assert.doesNotMatch(
  adminJs,
  /Catalogue product published|unpublished|Initial stock from catalogue publish|publishedCatalogueKey|readPublishedCatalogueProducts|writePublishedCatalogueProducts/i,
  "Admin JavaScript must not show publish/unpublish language for browser-local catalogue drafts"
);

assert.doesNotMatch(
  adminJs,
  /marisAdminProducts|marisInventoryLogs|marisAdminOrders|productsKey|logsKey|ordersKey|applyMovement|backendConnected|Reset Demo Data/i,
  "Admin products, inventory, and orders must not use browser-local storage or demo reset state"
);

assert.match(
  adminJs,
  /function renderModalGalleryImages/,
  "Edit Product modal should render existing Supabase gallery images, not only the image count"
);

assert.match(
  adminJs,
  /ADMIN_PRODUCT_IMAGES_PATH\s*=\s*"\/product-images"/,
  "Edit Product modal should call protected image actions for deleting or reordering product images"
);

assert.doesNotMatch(
  productDataJs,
  /marisPublishedCatalogueProducts|MARIS_PUBLISHED_PRODUCTS|publishedProductsKey|docs\.google\.com\/spreadsheets/,
  "Admin product data helper must not read browser-local products or Google Sheet as a live source"
);

assert.doesNotMatch(
  [contactPage, quotePage].join("\n"),
  /Netlify|data-netlify|netlify-honeypot|submitToNetlify/i,
  "Public lead forms must not claim unsupported Netlify form delivery in the Vercel workflow"
);

const paymentWebhookResponse = await postPaymentWebhook();
const paymentWebhookPayload = await paymentWebhookResponse.json();
assert.equal(paymentWebhookResponse.status, 501, "Payment webhook must stay disabled until a real gateway integration exists");
assert.equal(paymentWebhookPayload.error, "payment_webhook_not_configured");
assert.equal("success" in paymentWebhookPayload, false, "Disabled payment webhook must not report success");

assert.match(
  homepage,
  /atelier-reveal/,
  "React homepage should include the Maris Atelier Reveal section"
);

assert.match(
  homepage,
  /\/api\/catalogue\/products|readPublicCatalogueProducts/,
  "Atelier Reveal should read public catalogue data through the Supabase-backed path"
);

assert.doesNotMatch(
  typographySource,
  /Cormorant|Georgia|Arial|letter-spacing:\s*-/i,
  "Maris typography should stay on the shared Urbanist/Anuphan stack without clashing legacy fonts or negative tracking"
);

const adminCss = await readFile(new URL("../app/admin/admin.css", import.meta.url), "utf8");

assert.match(
  adminHtml,
  /<label data-ring-type-field>\s*\n\s*Ring Type/,
  "The Ring Type field must be tagged so the product form can hide it for non-ring categories"
);

assert.match(
  adminJs,
  /function syncRingTypeFieldVisibility\(form\)[\s\S]*?field\.hidden = category !== "Rings";/,
  "Admin JS should hide the Ring Type field whenever the chosen category is not Rings"
);

assert.match(
  adminJs,
  /namedItem\("category"\)\?\.addEventListener\("change", \(\) => \{\s*\n\s*syncRingTypeFieldVisibility\(elements\.productForm\);/,
  "Changing the product category must re-evaluate Ring Type visibility"
);

assert.match(
  adminCss,
  /\.admin-form label\[hidden\]\s*\{\s*display:\s*none;/,
  "Hidden product form fields must beat the .admin-form label grid display rule"
);

assert.match(
  adminHtml,
  /async function buildAdminScriptSrc\(src\)[\s\S]*?\?v=\$\{Math\.trunc\(fileStats\.mtimeMs\)\}/,
  "Admin scripts need an mtime version stamp so the one hour /assets/js cache cannot serve stale admin logic"
);

assert.doesNotMatch(
  adminHtml,
  /<Script src="\/assets\/js\//,
  "Admin script tags must use the version stamped src instead of a bare cacheable path"
);

const siteHeaderCss = await readFile(new URL("../assets/css/site-header.css", import.meta.url), "utf8");

// --- Back office design contract -------------------------------------------

assert.match(
  adminCss,
  /--maris-gold-text:\s*#856a22/,
  "Small uppercase admin labels need the darkened gold that clears WCAG AA on paper"
);

assert.doesNotMatch(
  adminCss,
  /\n\s*color: var\(--maris-gold\);/,
  "Nothing in the admin sheet should still paint text with the 2.8:1 brand gold"
);

assert.match(
  adminCss,
  /\.admin-page :is\(input, select, textarea, button, a, summary\):focus-visible/,
  "Every admin control needs a visible focus ring, not just the custom request panel"
);

assert.match(
  adminCss,
  /\.admin-message \{[\s\S]*?position: fixed;/,
  "The admin status line must be a pinned toast so saves are visible from any scroll position"
);

assert.match(
  adminCss,
  /\.admin-message\.is-error::before \{\s*content: "✕";/,
  "Success and error toasts must differ by glyph, not colour alone"
);

assert.match(
  adminJs,
  /classList\.toggle\("is-error", isError\)[\s\S]*?classList\.toggle\("is-visible"/,
  "setMessage should drive the toast through classes instead of writing inline colours"
);

assert.doesNotMatch(
  adminJs,
  /elements\.message\.style\.color/,
  "The toast must not be styled with inline colour any more"
);

assert.match(
  adminCss,
  /\.stock-low::before \{\s*content: "⚠ ";/,
  "Low stock must carry a glyph so it is not signalled by colour alone"
);

assert.match(
  adminCss,
  /@media \(prefers-reduced-motion: reduce\)/,
  "Admin needs the same reduced motion guard the storefront already has"
);

assert.match(
  adminCss,
  /input\[type="file"\]::file-selector-button/,
  "The file picker should match the form instead of showing raw browser chrome"
);

assert.match(
  siteHeaderCss,
  /\.mobile-menu-toggle \{[\s\S]*?width: 44px;\s*\n\s*height: 44px;/,
  "The mobile menu button is the primary control on phones and must meet the 44px target"
);
