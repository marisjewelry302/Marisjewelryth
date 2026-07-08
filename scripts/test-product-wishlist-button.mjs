import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const productPage = readFileSync("app/product/[slug]/product-slug-page.js", "utf8");
const wishlistButton = readFileSync("app/components/WishlistButton.jsx", "utf8");
const productCss = readFileSync("assets/css/product.css", "utf8");

assert.match(
  productPage,
  /import WishlistButton from "\.\.\/\.\.\/components\/WishlistButton";/,
  "Product detail page should import the shared WishlistButton."
);

assert.match(
  productPage,
  /const wishlistItem = \{[\s\S]*id: `\$\{product\.collection \|\| collectionLabel\}:\$\{product\.sku\}`[\s\S]*title: product\.sku[\s\S]*details: \[displayName\][\s\S]*image: product\.primaryImageUrl[\s\S]*href: productPath[\s\S]*collection: collectionLabel[\s\S]*priceLabel: formatPrice\(product\.basePrice\)[\s\S]*\};/,
  "Product detail page should build the same wishlist item contract used by catalogue cards."
);

assert.match(
  productPage,
  /<WishlistButton item=\{wishlistItem\} variant="action" \/>/,
  "Product detail actions should render WishlistButton as an action button."
);

assert.match(
  productPage,
  /className="product-action is-primary is-contact"/,
  "The contact-order action should span the action group cleanly after adding wishlist."
);

assert.match(
  wishlistButton,
  /export default function WishlistButton\(\{ item, variant = "icon" \}\)/,
  "WishlistButton should keep the catalogue icon default while accepting a detail-page action variant."
);

assert.match(
  wishlistButton,
  /variant === "action"/,
  "WishlistButton should branch action-button rendering by variant."
);

assert.match(
  wishlistButton,
  /product-action wishlist-action/,
  "WishlistButton action variant should share product action styling."
);

assert.match(
  wishlistButton,
  /Add to Wishlist/,
  "WishlistButton action variant should expose clear save copy."
);

assert.match(
  productCss,
  /\.wishlist-action\s*\{/,
  "Product CSS should style the wishlist action button."
);

assert.match(
  productCss,
  /\.product-action\.is-contact\s*\{/,
  "Product CSS should let the contact order action occupy the full action row."
);

console.log("PASS: Product detail wishlist button is wired.");
