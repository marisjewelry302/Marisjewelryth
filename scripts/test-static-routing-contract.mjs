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

const [hasAppPage, hasAppRoute, adminPage, homepage, productPage, packageJson] = await Promise.all([
  fileExists("app/page.js"),
  fileExists("app/route.js"),
  readFile("assets/js/admin-page.js", "utf8"),
  readFile("app/page.js", "utf8"),
  readFile("app/product/[slug]/product-slug-page.js", "utf8"),
  readFile("package.json", "utf8")
]);

assert.equal(hasAppPage, true, "app/page.js must render the React storefront at /");
assert.equal(hasAppRoute, false, "app/route.js must be removed after the React storefront migration");

assert.doesNotMatch(
  packageJson,
  /sync-legacy-public|predev|prebuild|sync:legacy/,
  "package scripts must not sync the legacy static site during dev/build"
);

assert.match(homepage, /readPublicCatalogueProducts/, "homepage must use the React/Supabase catalogue path");
assert.match(homepage, /<HeroSlider slides=\{heroSlides\}/, "homepage must render the React hero slider");
assert.doesNotMatch(homepage, /\/index\.html|pages\/.*\.html/, "homepage must not link to legacy .html pages");

assert.doesNotMatch(adminPage, /\/pages\/product\.html/, "admin Preview links must not point to legacy product.html");
assert.match(adminPage, /function getProductPreviewHref\(code\)/, "admin Preview links must use the React product preview helper");

assert.match(
  productPage,
  /href=\{`\/request-quote\?collection=/,
  "product page quote links must point to /request-quote"
);

console.log("React routing contract is valid.");
