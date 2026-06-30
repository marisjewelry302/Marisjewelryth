import { readFile } from "node:fs/promises";

const componentSource = await readFile("app/BestSellerSection.jsx", "utf8");
const styleSource = await readFile("assets/css/style.css", "utf8");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const headMarkup = componentSource.match(/<div className="best-seller-head">([\s\S]*?)<\/div>/)?.[1] ?? "";
const headStyles = styleSource.match(/\.best-seller-head\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

if (/section-kicker|Maris selection|Maris collection/i.test(headMarkup)) {
  fail("Best Seller heading must not render a Maris collection/selection kicker.");
}

if (!/<h2 id="best-seller-heading">Best Seller<\/h2>/.test(headMarkup)) {
  fail("Best Seller heading markup must stay present.");
}

if (!/text-align:\s*center;/.test(headStyles)) {
  fail("Best Seller heading must be centered with text-align.");
}

if (!/justify-items:\s*center;/.test(headStyles)) {
  fail("Best Seller heading grid content must be centered.");
}

console.log("PASS: Best Seller heading is centered without the Maris kicker.");
