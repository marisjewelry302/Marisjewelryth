import assert from "node:assert/strict";

const { isSiblingProductCode, compareSiblingProductCodes } = await import("../app/lib/product-display.js");
const { readRelatedPublicProducts } = await import("../app/lib/maris-database.js");

// The same design number is a sibling whether or not the SKU was typed with spaces.
assert.equal(isSiblingProductCode("SR 0015 ER", "SR 0015 WB"), true);
assert.equal(isSiblingProductCode("SR 0015 ER", "sr0015ws"), true);
assert.equal(isSiblingProductCode("SR 0015 ER", "SR 0015 ER"), false, "The piece itself is not its own sibling");
assert.equal(isSiblingProductCode("SR 0015 ER", "SR 0150 WB"), false);
assert.equal(isSiblingProductCode("SR 0015 ER", "SR 00151 WB"), false);
assert.equal(isSiblingProductCode("SR 0015 ER", "SE 0015 ER"), false);
assert.equal(isSiblingProductCode("", "SR 0015 WB"), false);
assert.deepEqual(
  ["SR 0015 WS", "SR 0015 XX", "SR 0015 ER", "SR 0015 WB"].sort(compareSiblingProductCodes),
  ["SR 0015 ER", "SR 0015 WB", "SR 0015 WS", "SR 0015 XX"]
);

const env = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};

function row(id, sku, collection) {
  return { id, sku, slug: sku.toLowerCase(), name: "Diamond Ring", collection, status: "active", product_variants: [], product_images: [] };
}

const rows = [
  row("self", "SR 0015 ER", "engagement-ring"),
  row("ws", "SR0015WS", "wedding-band"),
  row("wb", "SR 0015 WB", "wedding-band"),
  row("near", "SR 00150 WB", "wedding-band"),
  row("ring-a", "SR 0020 ER", "engagement-ring"),
  row("ring-b", "SR 0021 ER", "engagement-ring"),
  row("ring-c", "SR 0022 ER", "engagement-ring")
];

function createClient() {
  const calls = [];

  return {
    calls,
    from() {
      const filters = [];
      let count = Infinity;
      calls.push(filters);
      const query = {
        select: () => query,
        eq(column, value) {
          filters.push(["eq", column, value]);
          return query;
        },
        ilike(column, pattern) {
          filters.push(["ilike", column, pattern]);
          return query;
        },
        limit(value) {
          count = value;
          return query;
        },
        then(resolve, reject) {
          const matcher = (item) => filters.every(([kind, column, value]) => {
            if (column === "status") return true;
            if (kind === "eq") return item[column] === value;
            const regex = new RegExp(`^${value.replace(/%/g, ".*")}$`, "i");
            return regex.test(item[column]);
          });
          return Promise.resolve({ data: rows.filter(matcher).slice(0, count), error: null }).then(resolve, reject);
        }
      };
      return query;
    }
  };
}

const client = createClient();
const related = await readRelatedPublicProducts("engagement-ring", "self", { env, client, sku: "SR 0015 ER" });
assert.deepEqual(
  related.products.map((item) => item.id),
  ["wb", "ws", "ring-a", "ring-b"],
  "Siblings lead in ER, WB, WS order, then the collection fills the row"
);
assert.deepEqual(client.calls[0], [["eq", "status", "active"], ["ilike", "sku", "SR%0015%"]]);

// Without a readable SKU the row is the collection alone, as before.
const plainClient = createClient();
const plain = await readRelatedPublicProducts("engagement-ring", "self", { env, client: plainClient });
assert.deepEqual(plain.products.map((item) => item.id), ["ring-a", "ring-b", "ring-c"]);
assert.equal(plainClient.calls.length, 1);

console.log("Related products contract passed.");
