import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const seo = await import("../app/lib/seo.js");

assert.equal(seo.SITE_URL, "https://marisjewelryth.vercel.app");
assert.equal(seo.absoluteUrl("/category/engagement-ring"), "https://marisjewelryth.vercel.app/category/engagement-ring");

const homeMetadata = seo.buildPageMetadata({
  title: "Bangkok Fine Jewelry Atelier",
  description: "A guided fine jewelry catalogue and custom design atelier in Bangkok.",
  path: "/"
});

assert.equal(homeMetadata.metadataBase.href, "https://marisjewelryth.vercel.app/");
assert.equal(homeMetadata.alternates.canonical, "https://marisjewelryth.vercel.app/");
assert.equal(homeMetadata.openGraph.url, "https://marisjewelryth.vercel.app/");
assert.equal(homeMetadata.twitter.card, "summary_large_image");

const faqSchema = seo.buildFaqPageJsonLd(seo.HOME_FAQS);
assert.equal(faqSchema["@type"], "FAQPage");
assert.equal(faqSchema.mainEntity.length >= 4, true, "homepage FAQ schema should cover answer-engine questions");
assert.match(
  faqSchema.mainEntity.map((item) => item.name).join(" "),
  /custom|online|Bangkok/i,
  "FAQ schema should answer custom design, ordering, and location questions"
);

const productSchema = seo.buildProductJsonLd({
  product: {
    sku: "ER-001",
    slug: "er-001",
    name: "Solitaire diamond ring",
    collection: "engagement-ring",
    basePrice: 45000,
    primaryImageUrl: "/assets/images/sample-ring.png",
    images: [{ imageUrl: "/assets/images/sample-ring.png" }]
  },
  displayName: "Solitaire diamond ring",
  collectionLabel: "Engagement Rings"
});

assert.equal(productSchema["@type"], "Product");
assert.equal(productSchema.url, "https://marisjewelryth.vercel.app/product/er-001");
assert.equal(productSchema.offers.priceCurrency, "THB");
assert.equal(productSchema.offers.seller.name, "Maris Jewelry");

const layout = await readSource("../app/layout.js");
const homepage = await readSource("../app/page.js");
const categoryPage = await readSource("../app/category/[collection]/page.js");
const productPage = await readSource("../app/product/[slug]/product-slug-page.js");
const robots = await readSource("../app/robots.js");
const sitemap = await readSource("../app/sitemap.js");
const packageJson = JSON.parse(await readSource("../package.json"));

assert.match(layout, /buildOrganizationJsonLd/);
assert.match(layout, /buildWebsiteJsonLd/);
assert.match(layout, /buildLocalBusinessJsonLd/);
assert.match(layout, /<JsonLd data=\{siteJsonLd\}/);

assert.match(homepage, /HOME_FAQS/);
assert.match(homepage, /buildFaqPageJsonLd/);
assert.match(homepage, /home-answer-guide/);

assert.match(categoryPage, /buildCollectionPageJsonLd/);
assert.match(categoryPage, /buildBreadcrumbJsonLd/);
assert.match(categoryPage, /alternates:\s*\{\s*canonical:/);

assert.match(productPage, /buildProductJsonLd/);
assert.match(productPage, /buildBreadcrumbJsonLd/);
assert.match(productPage, /openGraph/);

assert.match(robots, /SITE_URL/);
assert.match(robots, /\/admin\//);
assert.match(robots, /\/api\//);

assert.match(sitemap, /readPublicCatalogueProducts/);
assert.match(sitemap, /\/product\/\$\{product\.slug \|\| product\.sku\}/);

assert.equal(packageJson.scripts["test:seo-aeo-geo"], "node scripts/test-seo-aeo-geo.mjs");

console.log("SEO/AEO/GEO contract passed.");
