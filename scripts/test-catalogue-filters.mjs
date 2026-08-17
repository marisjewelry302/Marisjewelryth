import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  buildCatalogueFilterGroups,
  getProductCarat,
  getProductFacetTokens,
  getProductMetalValues,
  productMatchesFacetToken
} from "../app/lib/product-facets.js";

const files = {
  categoryProducts: readFileSync("app/category/[collection]/CategoryProducts.jsx", "utf8"),
  productCard: readFileSync("app/components/ProductCard.jsx", "utf8")
};

// The catalogue records metal in image alt text, not in a column, so these
// fixtures mirror what the admin uploader actually writes.
const catalogue = [
  {
    sku: "SR 0055",
    name: "Diamond Cluster Pear Shaped Illusion Ring",
    collectionName: "The One Aura Collection",
    images: [
      { altText: "Diamond Cluster Pear Shaped Illusion Ring White Gold Hero view" },
      { altText: "Diamond Cluster Pear Shaped Illusion Ring Rose Gold Detail view" }
    ],
    variants: []
  },
  {
    sku: "SR 0034",
    name: "Pear Shaped diamond",
    collectionName: "The Infinite Hold",
    images: [{ altText: "Pear Shaped diamond White Gold Front view" }],
    variants: []
  },
  {
    sku: "SR0033ER",
    name: "Round Brilliant",
    collectionName: "The Infinite Hold Collection",
    images: [{ altText: "Round Brilliant Front view" }],
    variants: []
  }
];

const groups = buildCatalogueFilterGroups(catalogue);
const groupKeys = groups.map((group) => group.key);
const optionsOf = (key) => groups.find((group) => group.key === key)?.options || [];

assert.deepEqual(
  optionsOf("metal").map((option) => option.token),
  ["metal:white-gold", "metal:rose-gold"],
  "Metal options must come from the metals the catalogue photography records"
);

assert.equal(
  optionsOf("metal").find((option) => option.token === "metal:white-gold").count,
  2,
  "Filter counts must match the pieces the filter returns"
);

assert.ok(!groupKeys.includes("style") || optionsOf("style").length > 0);

assert.deepEqual(
  optionsOf("collection").map((option) => `${option.token}=${option.count}`),
  ["collection:infinite-hold=2", "collection:one-aura=1"],
  "Collection lines entered as 'The Infinite Hold' and 'The Infinite Hold Collection' are one line"
);

groups.forEach((group) => {
  group.options.forEach((option) => {
    const matched = catalogue.filter((product) => productMatchesFacetToken(product, option.token));

    assert.equal(
      matched.length,
      option.count,
      `Option ${option.token} promises ${option.count} pieces but returns ${matched.length}`
    );
    assert.ok(matched.length > 0, `Option ${option.token} must never return an empty grid`);
  });

  assert.ok(
    group.options.some((option) => option.count < catalogue.length),
    `Group ${group.key} narrows nothing`
  );
});

// Every piece is photographed in white gold here, so the metal group still earns
// its place through the other two - and white gold stays listed rather than
// reading as unavailable.
const universalMetal = buildCatalogueFilterGroups([
  { sku: "A", name: "Ring", images: [{ altText: "Ring White Gold Hero view" }] },
  { sku: "B", name: "Ring", images: [{ altText: "Ring White Gold Hero view" }, { altText: "Ring Rose Gold Hero view" }] }
]);

assert.deepEqual(
  (universalMetal.find((group) => group.key === "metal")?.options || []).map((option) => `${option.token}=${option.count}`),
  ["metal:white-gold=2", "metal:rose-gold=1"],
  "A metal every piece shares stays listed while its group can still narrow"
);

assert.deepEqual(
  buildCatalogueFilterGroups([
    { sku: "A", name: "Ring", images: [{ altText: "Ring White Gold Hero view" }] },
    { sku: "B", name: "Ring", images: [{ altText: "Ring White Gold Hero view" }] }
  ]),
  [],
  "A group where every option matches every piece narrows nothing and is dropped"
);

assert.deepEqual(
  buildCatalogueFilterGroups([catalogue[0]]),
  [],
  "A single piece cannot be narrowed, so no filter should be offered"
);

assert.deepEqual(buildCatalogueFilterGroups([]), [], "An empty collection offers no filters");

assert.deepEqual(
  getProductMetalValues(catalogue[0]),
  ["white-gold", "rose-gold"],
  "Card metal data must list the metals the piece is photographed in"
);

assert.ok(
  getProductFacetTokens(catalogue[0]).includes("shape:pear"),
  "Card filter data must carry the facets the toolbar filters on"
);

assert.equal(
  getProductCarat({ name: "Solitaire Ring", images: [], variants: [] }),
  0,
  "Carat stays zero while the catalogue records none"
);

assert.equal(
  getProductCarat({ name: "Round Brilliant 1.5 ct Ring", images: [], variants: [] }),
  1.5
);

assert.match(
  files.categoryProducts,
  /buildCatalogueFilterGroups\(products\)/,
  "Filter options must be derived from the pieces on the page"
);

assert.doesNotMatch(
  files.categoryProducts,
  /<option value="(white-gold|yellow-gold|rose-gold|halo|solitaire|band)">/,
  "Filter options must not be hardcoded ahead of the data that answers them"
);

assert.match(
  files.categoryProducts,
  /products\.some\(\(product\) => getProductCarat\(product\) > 0\)/,
  "Carat sorting may only be offered when a piece records a carat weight"
);

assert.match(
  files.productCard,
  /data-filters=\{getProductFacetTokens\(product\)\.join\(" "\)\}/,
  "Card filter data must use the same facets as the toolbar"
);

console.log("Catalogue filters are derived from catalogue data.");
