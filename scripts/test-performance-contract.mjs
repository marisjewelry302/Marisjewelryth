import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";

const optimizedAssets = [
  "../assets/images/home/optimized/home-hero-optimized.webp",
  "../assets/images/service/custom-jewelry-service-hero-02-seamless.webp",
  "../assets/images/home/optimized/home-hero-pendant-earrings.webp",
  "../assets/images/home/collections/cover-rings-collection.webp",
  "../assets/images/home/collections/cover-pendants-collection.webp",
  "../assets/images/home/popup/popup-background.webp",
  "../assets/images/service/custom-jewelry-process-storyboard.webp",
  "../assets/images/service/custom-jewelry-service-hero.webp"
];

let totalBytes = 0;
for (const asset of optimizedAssets) {
  const info = await stat(new URL(asset, import.meta.url));
  totalBytes += info.size;
  assert.ok(info.size < 400_000, `${asset} should remain below 400 KB`);
}
assert.ok(totalBytes < 1_500_000, "Optimized campaign images should remain below 1.5 MB in total");

for (const removedPng of [
  "../assets/images/home/optimized/home-hero-optimized.png",
  "../assets/images/home/optimized/home-hero-pendant-earrings.png",
  "../assets/images/home/collections/cover-rings-collection.png",
  "../assets/images/home/collections/cover-pendants-collection.png",
  "../assets/images/home/popup/popup-background.png"
]) {
  await assert.rejects(access(new URL(removedPng, import.meta.url)));
}

const homePage = await readFile(new URL("../app/page.js", import.meta.url), "utf8");
const categoryPage = await readFile(new URL("../app/category/[collection]/page.js", import.meta.url), "utf8");
const productPage = await readFile(new URL("../app/product/[slug]/product-slug-page.js", import.meta.url), "utf8");
const catalogueRoute = await readFile(new URL("../app/api/catalogue/products/route.js", import.meta.url), "utf8");
const heroSlider = await readFile(new URL("../app/HeroSlider.jsx", import.meta.url), "utf8");
const rootLayout = await readFile(new URL("../app/layout.js", import.meta.url), "utf8");

for (const [label, source] of [
  ["home", homePage],
  ["category", categoryPage],
  ["product", productPage],
  ["catalogue API", catalogueRoute]
]) {
  assert.doesNotMatch(source, /dynamic\s*=\s*["']force-dynamic["']/, `${label} should use cacheable rendering`);
}

assert.match(homePage, /rel="preload"[\s\S]*?fetchPriority="high"/);
assert.match(heroSlider, /index === activeIndex && slide\.image/, "Inactive hero backgrounds must not all load during LCP");
assert.match(catalogueRoute, /public, s-maxage=60, stale-while-revalidate=300/);
assert.doesNotMatch(rootLayout, /category\.css|product\.css|custom-order\.css|design-your-ring\.css|articles\.css/);
