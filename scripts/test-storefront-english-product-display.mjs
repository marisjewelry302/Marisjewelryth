import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const files = {
  productCard: readFileSync("app/components/ProductCard.jsx", "utf8"),
  productPage: readFileSync("app/product/[slug]/product-slug-page.js", "utf8"),
  productGallery: readFileSync("app/product/[slug]/ProductGallery.jsx", "utf8"),
  addToBag: readFileSync("app/product/[slug]/AddToBagButton.jsx", "utf8"),
  engagementCss: readFileSync("assets/css/engagement-ring.css", "utf8")
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

assert.match(
  files.productCard,
  /product\.images/,
  "ProductCard should read catalogue gallery images for hover previews"
);

assert.match(
  files.productCard,
  /product-card-image-hover/,
  "ProductCard should render a separate hover image layer"
);

assert.match(
  files.engagementCss,
  /\.product-card-link\.has-hover-image:hover[\s\S]*\.product-card-image-hover/,
  "Catalogue CSS should reveal the hover image layer on pointer hover"
);

console.log("Storefront product display uses English-safe labels.");
