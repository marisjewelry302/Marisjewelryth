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

const [
  hasAppPage,
  hasAppRoute,
  hasOurServicePage,
  adminPage,
  homepage,
  productPage,
  packageJson,
  staticPages,
  siteHeader,
  sitemap,
  nextConfig,
  siteCss
] = await Promise.all([
  fileExists("app/page.js"),
  fileExists("app/route.js"),
  fileExists("app/our-service/page.js"),
  readFile("assets/js/admin-page.js", "utf8"),
  readFile("app/page.js", "utf8"),
  readFile("app/product/[slug]/product-slug-page.js", "utf8"),
  readFile("package.json", "utf8"),
  readFile("app/lib/static-pages.js", "utf8"),
  readFile("app/components/SiteHeader.jsx", "utf8"),
  readFile("app/sitemap.js", "utf8"),
  readFile("next.config.mjs", "utf8"),
  readFile("assets/css/style.css", "utf8")
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
  /href=\{`\/contact-order\/\$\{encodeURIComponent\(product\.sku\)\}`\}/,
  "product page custom order links must point to /contact-order/{sku}"
);
assert.match(
  productPage,
  /ติดต่อสั่งสินค้า/,
  "product page custom order CTA must use the Thai contact order copy"
);
assert.doesNotMatch(
  productPage,
  /\/request-quote\?collection=/,
  "product page custom order CTA must not use the old request-quote route"
);
assert.doesNotMatch(
  productPage,
  /Confirm Availability/,
  "product page custom order CTA must not use the old availability copy"
);

assert.equal(hasOurServicePage, true, "our-service page route must exist");
assert.match(staticPages, /"our-service":/, "our-service content must be defined in static pages");
assert.match(staticPages, /custom-jewelry-process-storyboard\.png/, "our-service must use the process storyboard image");
assert.match(staticPages, /custom-jewelry-service-hero\.png/, "our-service hero must use a dedicated image that is not the step storyboard");
assert.match(staticPages, /custom-jewelry-service-hero-02-seamless\.png/, "our-service hero gallery must include the seamless satin jewelry hero image");
assert.match(staticPages, /heroImages:\s*\[/, "our-service must support multiple hero images");
assert.match(siteHeader, /href: "\/our-service", label: "Our Service"/, "Our Expertise nav must link to Our Service");
assert.match(
  await readFile("app/components/ContentPage.jsx", "utf8"),
  /page\.heroImages\s*\?\?\s*\(\s*page\.heroImage\s*\?\s*\[page\.heroImage\]\s*:\s*\[\]\s*\)/,
  "content page must render either a hero gallery or the legacy single hero image"
);
assert.match(sitemap, /"our-service"/, "sitemap must include our-service");
assert.match(nextConfig, /\["our-service", "\/our-service"\]/, "legacy pages redirect map must include our-service");
assert.match(siteCss, /\.home-signup-popup__dialog\s*\{[\s\S]*overflow-x:\s*hidden;[\s\S]*overflow-y:\s*auto;/, "signup popup dialog must allow vertical scrolling instead of clipping bottom controls");
assert.match(siteCss, /\.home-signup-popup__content\s*\{[\s\S]*justify-content:\s*flex-start;/, "signup popup content must start at the top so bottom controls stay inside the dialog");

console.log("React routing contract is valid.");
