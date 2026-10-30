import assert from "node:assert/strict";

const { readAdminCatalogueProducts, readPublicCatalogueProducts } = await import("../app/lib/maris-database.js");

const env = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};

// A catalogue bigger than one page, with the newest rows first like the real query returns.
const TOTAL = 1150;
const rows = Array.from({ length: TOTAL }, (_, index) => ({
  id: `product-${String(index).padStart(4, "0")}`,
  sku: `SR ${String(index).padStart(4, "0")}`,
  slug: `sr-${index}`,
  name: `Ring ${index}`,
  category: "Rings",
  collection: "engagement-ring",
  status: index % 10 === 0 ? "draft" : "active",
  stock_quantity: 5,
  reserved_quantity: 0,
  product_variants: [],
  product_images: []
}));

function createClient() {
  const calls = [];

  return {
    calls,
    from(tableName) {
      assert.equal(tableName, "products");

      return {
        select() {
          const query = {
            statusFilter: null,
            eq(column, value) {
              assert.equal(column, "status");
              query.statusFilter = value;
              return query;
            },
            order(column) {
              calls.push(["order", column]);
              return query;
            },
            matching() {
              return query.statusFilter ? rows.filter((row) => row.status === query.statusFilter) : rows;
            },
            async range(from, to) {
              calls.push(["range", from, to]);
              return { data: query.matching().slice(from, to + 1), error: null };
            },
            async limit(count) {
              calls.push(["limit", count]);
              return { data: query.matching().slice(0, count), error: null };
            }
          };

          return query;
        }
      };
    }
  };
}

// With no limit the admin list walks every page instead of stopping at 100.
const adminClient = createClient();
const admin = await readAdminCatalogueProducts({ env, client: adminClient });
assert.equal(admin.products.length, TOTAL, "Admin catalogue must return every product, not a fixed first page");
assert.deepEqual(
  adminClient.calls.filter((call) => call[0] === "range"),
  [["range", 0, 499], ["range", 500, 999], ["range", 1000, 1499]]
);
assert.ok(
  adminClient.calls.some((call) => call[0] === "order" && call[1] === "id"),
  "Paging needs a unique tiebreak so rows with equal updated_at are never skipped or repeated"
);
assert.equal(new Set(admin.products.map((product) => product.id)).size, TOTAL);

// The public list applies the active filter on every page and still returns all of them.
const publicClient = createClient();
const publicCatalogue = await readPublicCatalogueProducts({ env, client: publicClient });
const activeCount = rows.filter((row) => row.status === "active").length;
assert.equal(publicCatalogue.status, "ready");
assert.equal(publicCatalogue.products.length, activeCount, "Public catalogue must return every active product");

// A page that is exactly full still needs one more request to prove nothing is left.
const exactClient = createClient();
rows.splice(500);
const exact = await readAdminCatalogueProducts({ env, client: exactClient });
assert.equal(exact.products.length, 500);
assert.deepEqual(
  exactClient.calls.filter((call) => call[0] === "range"),
  [["range", 0, 499], ["range", 500, 999]]
);

// An explicit limit keeps the single bounded query that the homepage and sitemap rely on.
const limitedClient = createClient();
const limited = await readPublicCatalogueProducts({ env, client: limitedClient, limit: 6 });
assert.equal(limited.products.length, 6);
assert.deepEqual(limitedClient.calls.filter((call) => call[0] === "limit"), [["limit", 6]]);
assert.equal(limitedClient.calls.some((call) => call[0] === "range"), false);

// A database error on any page is surfaced, not swallowed into a short list.
const failingClient = {
  from() {
    return {
      select() {
        const query = {
          order: () => query,
          eq: () => query,
          range: async () => ({ data: null, error: { message: "boom" } })
        };
        return query;
      }
    };
  }
};
await assert.rejects(
  () => readAdminCatalogueProducts({ env, client: failingClient }),
  /boom/
);

console.log("Catalogue pagination checks passed.");
