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
  ourServicePage,
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
  readFile("app/our-service/page.js", "utf8"),
  readFile("assets/js/admin-page.js", "utf8"),
  readFile("app/page.js", "utf8").then(async (source) => source + (await readFile("app/components/HomeView.jsx", "utf8"))),
  readFile("app/product/[slug]/product-slug-page.js", "utf8").then(async (source) => source + (await readFile("app/lib/ui-text-shop.js", "utf8"))),
  readFile("package.json", "utf8"),
  readFile("app/lib/static-pages.js", "utf8"),
  readFile("app/components/SiteHeader.jsx", "utf8").then(async (source) => source + (await readFile("app/lib/ui-text-base.js", "utf8"))),
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
  /<ProductContactLink[\s\S]*?productCode=\{product\.sku\}/,
  "product page custom order links must point to /contact-order/{sku}"
);
assert.match(
  productPage,
  /Contact Maris to Order/,
  "product page custom order CTA must use the English contact order copy"
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
assert.equal((staticPages.match(/custom-jewelry-process-0\d-[a-z-]+\.webp/g) || []).length, 8, "our-service must render each process step through its own optimized image");
assert.match(staticPages, /custom-jewelry-service-hero\.webp/, "our-service hero must use an optimized dedicated image that is not the step storyboard");
assert.match(staticPages, /custom-jewelry-service-hero-02-seamless\.webp/, "our-service hero gallery must include the optimized seamless satin jewelry hero image");
assert.match(staticPages, /heroImages:\s*\[/, "our-service must support multiple hero images");
assert.match(ourServicePage, /heroImages:\s*\[\]/, "our-service route must suppress the top hero gallery");
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

// Every ?service= deep link in the static pages must match a ContactPageView option value,
// otherwise the contact form silently falls back to "Engagement Rings".
const contactViewSource = await readFile("app/components/ContactPageView.jsx", "utf8");
const contactServiceValues = new Set([...contactViewSource.matchAll(/^\s*\["([^"]+)",\s*"[^"]+"\],?\s*$/gm)].map((match) => match[1]));
assert.ok(contactServiceValues.has("Custom Design"), "contact form must expose the Custom Design service option");
for (const file of ["app/lib/static-pages.js", "app/lib/static-pages-th.js"]) {
  const source = await readFile(file, "utf8");
  const linked = [...source.matchAll(/\?service=([^"&]*(?:%26[^"&]*)*)"/g)].map((match) => decodeURIComponent(match[1]));
  assert.ok(linked.length > 0, `${file} should contain contact service deep links`);
  for (const value of linked) {
    assert.ok(contactServiceValues.has(value), `${file}: ?service=${value} is not a ContactPageView service option`);
  }
}

console.log("React routing contract is valid.");
