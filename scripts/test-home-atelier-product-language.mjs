import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const homepage = readFileSync("app/page.js", "utf8");

assert.match(
  homepage,
  /function getAtelierProductLabel\(product\)/,
  "homepage should define an English display label helper for atelier product cards"
);

assert.doesNotMatch(
  homepage,
  /<strong>\{product\.name\}<\/strong>/,
  "atelier product card title must not render raw catalogue product.name"
);

assert.doesNotMatch(
  homepage,
  /alt=\{`\$\{product\.sku\} \$\{product\.name\}`\}/,
  "atelier product image alt text must not include raw catalogue product.name"
);

assert.match(
  homepage,
  /<strong>\{getAtelierProductLabel\(product\)\}<\/strong>/,
  "atelier product card title should render the English display label"
);

console.log("Homepage atelier product cards use English labels.");
