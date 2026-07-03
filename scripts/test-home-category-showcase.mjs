import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const pageSource = await readFile(new URL("../app/page.js", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../assets/css/style.css", import.meta.url), "utf8");

const categorySectionIndex = pageSource.indexOf('className="shop-category-section"');
const collectionSectionIndex = pageSource.indexOf('className="home-collection-showcase"');

assert.ok(categorySectionIndex > -1, "Homepage should render a Shop by Category section.");
assert.ok(collectionSectionIndex > -1, "Homepage should still render the View Collection showcase.");
assert.ok(
  categorySectionIndex < collectionSectionIndex,
  "Shop by Category should appear before the View Collection showcase."
);

assert.match(pageSource, /<h2 id="shop-category-heading">Shop By Category<\/h2>/);
assert.match(
  pageSource,
  /From classic earstuds to chandeliers, from timeless bracelet to chic bangles\./
);
assert.match(pageSource, /className="shop-category-grid"/);

const expectedLabels = ["แหวน", "ต่างหู", "จี้", "สร้อยข้อมือและกำไล", "สร้อยคอ"];
for (const label of expectedLabels) {
  assert.match(pageSource, new RegExp(`label:\\s*"${label}"`), `Missing category label: ${label}`);
}
assert.doesNotMatch(pageSource, /label:\s*"เข็มกลัด"/, "Brooch category should not render on the homepage.");

const categoryItemsMatch = pageSource.match(/const shopCategoryItems = \[([\s\S]*?)\];/);
assert.ok(categoryItemsMatch, "Homepage should keep category items in a local array.");
const categoryItemsSource = categoryItemsMatch[1];
const itemCount = (categoryItemsSource.match(/\{\s*label:/g) || []).length;
assert.equal(itemCount, 5, "Shop by Category should render five category items.");

const imagePaths = [...categoryItemsSource.matchAll(/image:\s*"([^"]+)"/g)].map((match) => match[1]);
assert.equal(imagePaths.length, 5, "Each category item should define an image.");

for (const imagePath of imagePaths) {
  const localPath = imagePath.replace(/^\/+/, "");
  await access(new URL(`../${localPath}`, import.meta.url));
}

assert.match(styleSource, /\.shop-category-section\s*\{/);
assert.match(styleSource, /\.shop-category-grid\s*\{/);
assert.match(styleSource, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
assert.match(styleSource, /@media \(max-width:\s*980px\)[\s\S]*\.shop-category-grid/);
assert.match(styleSource, /@media \(max-width:\s*640px\)[\s\S]*\.shop-category-grid/);

console.log("PASS: Homepage Shop by Category section is wired before View Collection.");
