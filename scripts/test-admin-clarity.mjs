import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adminHtml = await readFile(new URL("../pages/admin.html", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../assets/js/admin-page.js", import.meta.url), "utf8");
const productDataJs = await readFile(new URL("../assets/js/product-data.js", import.meta.url), "utf8");
const { default: nextConfig } = await import("../next.config.mjs");

const redirects = await nextConfig.redirects();

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
  /Google Sheet remains the temporary storefront catalogue source during migration/i,
  "Admin copy must frame Google Sheet as temporary during Supabase migration"
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

assert.match(
  adminJs,
  /loadAdminBackendData\(\)/,
  "Admin JavaScript must load products, inventory, and orders from the protected Supabase APIs"
);

assert.doesNotMatch(
  productDataJs,
  /marisPublishedCatalogueProducts|MARIS_PUBLISHED_PRODUCTS|publishedProductsKey/,
  "Storefront product data must not read browser-local catalogue products as a live source"
);
