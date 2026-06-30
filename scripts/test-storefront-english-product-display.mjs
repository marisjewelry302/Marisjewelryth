import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const files = {
  productCard: readFileSync("app/components/ProductCard.jsx", "utf8"),
  productPage: readFileSync("app/product/[slug]/product-slug-page.js", "utf8"),
  productGallery: readFileSync("app/product/[slug]/ProductGallery.jsx", "utf8"),
  addToBag: readFileSync("app/product/[slug]/AddToBagButton.jsx", "utf8")
};

assert.match(
  files.productCard,
  /getPublicProductDisplayName/,
  "ProductCard should use the public English product display helper"
);

assert.doesNotMatch(
  files.productCard,
  /<p>\{product\.name\}<\/p>/,
  "ProductCard must not render raw product.name"
);

assert.doesNotMatch(
  files.productPage,
  /<h2 data-product-name>\{product\.name\}<\/h2>/,
  "Product page must not render raw product.name in the visible heading"
);

assert.doesNotMatch(
  files.productPage,
  /<small>\{item\.name\}<\/small>/,
  "Related product cards must not render raw item.name"
);

assert.doesNotMatch(
  files.productGallery,
  /\|\| `\$\{productCode\} \$\{productName\} view/,
  "Product gallery must not prefer raw database alt text before the English display name"
);

assert.doesNotMatch(
  files.addToBag,
  /details: \[product\.name\]/,
  "Shopping bag item details must not store raw product.name"
);

console.log("Storefront product display uses English-safe labels.");
