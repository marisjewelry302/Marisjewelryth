import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [appPage, adminPage, homepage] = await Promise.all([
  readFile("app/page.js", "utf8"),
  readFile("assets/js/admin-page.js", "utf8"),
  readFile("assets/js/homepage.js", "utf8")
]);

assert.match(
  appPage,
  /redirect\(["']\/index\.html["']\)/,
  "app/page.js must keep / as a redirect to the synced static /index.html"
);

assert.doesNotMatch(
  appPage,
  /readPublicCatalogueProducts|HeroSlider|CategoryHoverCard/,
  "app/page.js should not render the React storefront while static-first routing is active"
);

const previewLinkMatches = adminPage.match(/\/pages\/product\.html\?collection=\$\{encodeURIComponent\(/g) || [];
assert.equal(
  previewLinkMatches.length,
  2,
  "admin Preview links must point to /pages/product.html from the /admin route"
);

assert.match(
  homepage,
  /const productCode = product\.code \|\| product\.productCode \|\| product\.sku \|\| product\.slug \|\| title;/,
  "homepage atelier cards must prefer product code fields before slugs"
);

assert.match(
  homepage,
  /`pages\/product\.html\?collection=\$\{encodeURIComponent\(collectionKey\)\}&id=\$\{encodeURIComponent\(productCode\)\}`/,
  "homepage atelier cards must link to legacy product.html with collection and id"
);

console.log("Static routing contract is valid.");
