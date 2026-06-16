import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    return false;
  }
}

const [hasAppPage, hasAppRoute, adminPage, homepage] = await Promise.all([
  fileExists("app/page.js"),
  fileExists("app/route.js"),
  readFile("assets/js/admin-page.js", "utf8"),
  readFile("assets/js/homepage.js", "utf8")
]);
const appRoute = hasAppRoute ? await readFile("app/route.js", "utf8") : "";

assert.equal(hasAppPage, false, "app/page.js must not redirect / to /index.html");
assert.equal(hasAppRoute, true, "app/route.js must serve / without changing the browser URL");

assert.doesNotMatch(
  appRoute,
  /redirect\(["']\/index\.html["']\)/,
  "app/route.js must keep the browser URL at / instead of redirecting to /index.html"
);

assert.match(
  appRoute,
  /readFile\(path\.join\(process\.cwd\(\), ["']index\.html["']\), ["']utf8["']\)/,
  "app/route.js must serve the root static index.html file"
);

assert.match(
  appRoute,
  /Content-Type["']:\s*["']text\/html; charset=utf-8["']/,
  "app/route.js must return index.html as text/html"
);

assert.doesNotMatch(
  appRoute,
  /readPublicCatalogueProducts|HeroSlider|CategoryHoverCard/,
  "app/route.js should not render the React storefront while static-first routing is active"
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
