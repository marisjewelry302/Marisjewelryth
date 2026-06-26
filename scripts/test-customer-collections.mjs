import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const {
  normalizeCollectionItems,
  readCustomerBag,
  readCustomerWishlist,
  replaceCustomerBag,
  replaceCustomerWishlist
} = await import("../app/lib/customer-collections.js");

function createCollectionClient({ tableRows = {}, errors = {} } = {}) {
  const state = {
    deletes: [],
    inserts: [],
    selects: []
  };

  return {
    state,
    from(tableName) {
      const rows = tableRows[tableName] || [];

      return {
        select(columns) {
          state.selects.push({ tableName, columns });
          return {
            eq(column, value) {
              state.selects[state.selects.length - 1].filter = [column, value];
              return this;
            },
            order(column, options) {
              state.selects[state.selects.length - 1].order = [column, options];
              return Promise.resolve({
                data: rows,
                error: errors[`${tableName}:select`] || null
              });
            }
          };
        },
        delete() {
          return {
            eq(column, value) {
              state.deletes.push({ tableName, filter: [column, value] });
              return Promise.resolve({ error: errors[`${tableName}:delete`] || null });
            }
          };
        },
        insert(payload) {
          state.inserts.push({ tableName, payload });
          return Promise.resolve({
            data: payload,
            error: errors[`${tableName}:insert`] || null
          });
        }
      };
    }
  };
}

const env = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};

assert.deepEqual(
  normalizeCollectionItems([
    null,
    "bad",
    { id: "ring-1", title: "Ring", quantity: "2", details: ["14K"] },
    { id: "ring-1", title: "Duplicate" },
    { href: "/product/pendant", title: "Pendant", quantity: 0 },
    { title: "No id" }
  ], { withQuantity: true }),
  [
    { id: "ring-1", title: "Ring", quantity: 2, details: ["14K"] },
    { href: "/product/pendant", title: "Pendant", quantity: 1, id: "/product/pendant" },
    { title: "No id", id: "No id", quantity: 1 }
  ],
  "Collection normalizer should keep valid unique objects and derive stable ids"
);

const readClient = createCollectionClient({
  tableRows: {
    customer_wishlists: [
      {
        item_id: "ring-1",
        item_data: { id: "ring-1", title: "Ring" },
        created_at: "2026-06-26T01:00:00.000Z"
      }
    ],
    customer_bags: [
      {
        item_id: "ring-1",
        quantity: 3,
        item_data: { id: "ring-1", title: "Ring", quantity: 1 },
        created_at: "2026-06-26T01:00:00.000Z"
      }
    ]
  }
});

assert.deepEqual(await readCustomerWishlist("customer-1", { env, client: readClient }), {
  status: "ready",
  items: [{ id: "ring-1", title: "Ring" }]
});
assert.deepEqual(await readCustomerBag("customer-1", { env, client: readClient }), {
  status: "ready",
  items: [{ id: "ring-1", title: "Ring", quantity: 3 }]
});
assert.deepEqual(readClient.state.selects.map((entry) => [entry.tableName, entry.filter]), [
  ["customer_wishlists", ["customer_id", "customer-1"]],
  ["customer_bags", ["customer_id", "customer-1"]]
]);

const writeClient = createCollectionClient();
const savedWishlist = await replaceCustomerWishlist("customer-1", [
  { id: "ring-1", title: "Ring" },
  { id: "ring-2", title: "Second Ring" }
], { env, client: writeClient });
assert.equal(savedWishlist.status, "saved");
assert.equal(writeClient.state.deletes[0].tableName, "customer_wishlists");
assert.deepEqual(writeClient.state.deletes[0].filter, ["customer_id", "customer-1"]);
assert.deepEqual(writeClient.state.inserts[0].payload.map((row) => row.item_id), ["ring-1", "ring-2"]);
assert.ok(
  writeClient.state.inserts[0].payload.every((row) => row.customer_id === "customer-1"),
  "Wishlist rows must be scoped server-side by customer id"
);

const savedBag = await replaceCustomerBag("customer-1", [
  { id: "ring-1", title: "Ring", quantity: 99 }
], { env, client: writeClient });
assert.equal(savedBag.status, "saved");
assert.equal(writeClient.state.inserts[1].tableName, "customer_bags");
assert.equal(writeClient.state.inserts[1].payload[0].quantity, 9, "Bag quantity should be clamped to the UI range");

assert.deepEqual(await readCustomerWishlist("customer-1", { env: {} }), {
  status: "not_configured",
  missingEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  items: []
});

const migrationFiles = await readdir(new URL("../supabase/migrations/", import.meta.url));
const collectionMigrationFile = migrationFiles.find((fileName) => fileName.endsWith("_create_customer_collections.sql"));
assert.ok(collectionMigrationFile, "A Supabase migration should create customer collection tables");

const collectionMigration = await readFile(new URL(`../supabase/migrations/${collectionMigrationFile}`, import.meta.url), "utf8");

for (const tableName of ["customer_wishlists", "customer_bags"]) {
  assert.match(
    collectionMigration,
    new RegExp(`create table if not exists public\\.${tableName}\\b`, "i"),
    `Migration should create ${tableName}`
  );
  assert.match(
    collectionMigration,
    new RegExp(`alter table public\\.${tableName}\\s+enable row level security`, "i"),
    `Migration should enable RLS for ${tableName}`
  );
  assert.match(
    collectionMigration,
    new RegExp(`references public\\.customers\\(id\\) on delete cascade`, "i"),
    `${tableName} should cascade when a customer is removed`
  );
}

for (const indexName of [
  "idx_customer_wishlists_customer_id",
  "idx_customer_bags_customer_id"
]) {
  assert.match(
    collectionMigration,
    new RegExp(`create index if not exists ${indexName}\\b`, "i"),
    `Migration should include ${indexName}`
  );
}

const wishlistRoute = await readFile(new URL("../app/api/account/wishlist/route.js", import.meta.url), "utf8");
const bagRoute = await readFile(new URL("../app/api/account/bag/route.js", import.meta.url), "utf8");
const sessionHook = await readFile(new URL("../app/hooks/useCustomerSession.js", import.meta.url), "utf8");
const wishlistClient = await readFile(new URL("../app/wishlist/WishlistClient.jsx", import.meta.url), "utf8");
const bagClient = await readFile(new URL("../app/shopping-bag/ShoppingBagClient.jsx", import.meta.url), "utf8");

for (const routeSource of [wishlistRoute, bagRoute]) {
  assert.match(routeSource, /verifyCustomerSession/, "Account collection APIs must verify the httpOnly session cookie");
  assert.match(routeSource, /SESSION_COOKIE_NAME/, "Account collection APIs must read the customer session cookie");
  assert.doesNotMatch(routeSource, /customerId\s*=.*body|body\.customerId|customer_id.*body/i, "Frontend must not provide customer ids");
  assert.match(routeSource, /401/, "Logged-out collection API calls should return 401");
}

assert.match(sessionHook, /\/api\/account\/me/, "useCustomerSession should derive login state from the account session API");
assert.match(wishlistClient, /\/api\/account\/wishlist/, "Wishlist page should sync through the account wishlist API");
assert.match(bagClient, /\/api\/account\/bag/, "Shopping bag page should sync through the account bag API");
