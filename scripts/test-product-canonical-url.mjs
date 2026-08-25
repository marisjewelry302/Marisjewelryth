import assert from "node:assert/strict";

const {
  getMeaningfulText,
  getPublicProductPath,
  getPublicProductSlug,
  toPublicProductSlug
} = await import("../app/lib/product-display.js");
const { readPublicProductBySlug } = await import("../app/lib/maris-database.js");
const { buildCatalogueFilterGroups } = await import("../app/lib/product-facets.js");

// A catalogue line the admin never filled in arrives as "-", not as empty text.
for (const blank of ["-", " - ", "--", "—", "N/A", "none", "TBD", "", null, undefined]) {
  assert.equal(getMeaningfulText(blank), "", `${JSON.stringify(blank)} is not copy worth rendering`);
}
assert.equal(getMeaningfulText("  The One Aura Collection "), "The One Aura Collection");

// A blank collection line must not become a filter option either.
const filterGroups = buildCatalogueFilterGroups([
  { sku: "SR 0093 ER", collectionName: "-" },
  { sku: "SR 0098 ER", collectionName: "The One Aura Collection" }
]);
const collectionGroup = filterGroups.find((group) => group.key === "collection");
assert.deepEqual(
  (collectionGroup?.options || []).map((option) => option.label),
  ["One Aura"],
  "Only a real collection line may become a filter"
);

// The SKU decides the canonical path, so a legacy short slug does not create a
// second URL for the same piece.
assert.equal(toPublicProductSlug("SR 0015 ER"), "sr-0015-er");
assert.equal(getPublicProductSlug({ sku: "SR 0015 ER", slug: "sr-0015" }), "sr-0015-er");
assert.equal(getPublicProductPath({ sku: "SR 0015 ER", slug: "sr-0015" }), "/product/sr-0015-er");
assert.equal(getPublicProductPath({ sku: "SR0033WS" }), "/product/sr0033ws");
assert.equal(getPublicProductPath({ slug: "sr-0015" }), "/product/sr-0015", "A row without a SKU keeps its slug");
assert.equal(getPublicProductPath({}), "/product");

const env = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};
const productRow = {
  id: "product-1",
  sku: "SR 0015 ER",
  slug: "sr-0015",
  name: "Diamond Ring",
  category: "Rings",
  collection: "engagement-ring",
  collection_name: "-",
  status: "active",
  base_price: null,
  product_variants: [],
  product_images: []
};

function createLookupClient() {
  const queries = [];

  return {
    queries,
    from() {
      return {
        select() {
          return {
            eq(column, value) {
              if (column === "status") return this;
              queries.push(["eq", column, value]);
              return {
                limit: () => ({
                  maybeSingle: async () => ({ data: productRow.slug === value ? productRow : null, error: null })
                })
              };
            },
            in(column, values) {
              queries.push(["in", column, values]);
              return {
                limit: () => ({
                  maybeSingle: async () => ({ data: values.includes(productRow.sku) ? productRow : null, error: null })
                })
              };
            }
          };
        }
      };
    }
  };
}

// The stored slug still resolves, so older links and search results keep working.
const legacyClient = createLookupClient();
const legacy = await readPublicProductBySlug("sr-0015", { env, client: legacyClient });
assert.equal(legacy.status, "ready");
assert.equal(legacy.product.sku, "SR 0015 ER");
assert.equal(legacy.product.collectionName, "-", "The raw row is preserved; only the display layer filters it");
assert.deepEqual(legacyClient.queries, [["eq", "slug", "sr-0015"]], "A slug hit costs one query");

// The canonical spelling resolves through the SKU even though no row stores it.
const canonicalClient = createLookupClient();
const canonical = await readPublicProductBySlug("sr-0015-er", { env, client: canonicalClient });
assert.equal(canonical.status, "ready");
assert.equal(canonical.product.id, "product-1");
assert.deepEqual(canonicalClient.queries, [
  ["eq", "slug", "sr-0015-er"],
  // The request is tried as written and with the separators read back as spaces,
  // which is how the hand-entered SKUs are stored.
  ["in", "sku", ["SR-0015-ER", "SR 0015 ER"]]
]);

// So does the SKU written out in full, which is what a pasted admin code looks like.
const skuClient = createLookupClient();
const bySku = await readPublicProductBySlug("SR 0015 ER", { env, client: skuClient });
assert.equal(bySku.status, "ready");
assert.equal(bySku.product.id, "product-1");

const missingClient = createLookupClient();
const missing = await readPublicProductBySlug("sr-9999-er", { env, client: missingClient });
assert.equal(missing.status, "not_found");
assert.equal(missing.product, null);

console.log("Product canonical URL contract passed.");
