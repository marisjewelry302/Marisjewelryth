import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const {
  MARIS_DATABASE_TABLES,
  createAdminInventoryLog,
  getSupabaseAdminConfig,
  readAdminCatalogueProducts,
  readAdminDatabaseStatus
} = await import("../app/lib/maris-database.js");

const EXPECTED_DATABASE_TABLES = [
  "admin_users",
  "customers",
  "inventory_movements",
  "inventory_logs",
  "orders",
  "order_items",
  "payments",
  "product_images",
  "product_variants",
  "products",
  "settings"
];

assert.deepEqual(
  MARIS_DATABASE_TABLES,
  EXPECTED_DATABASE_TABLES,
  "Database table contract should match the Maris Supabase schema"
);

const missingConfig = getSupabaseAdminConfig({});
assert.equal(missingConfig.isConfigured, false);
assert.deepEqual(missingConfig.missingEnv, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
assert.equal("serviceRoleKey" in missingConfig, false, "Service role keys must not be returned by public config helpers");

const placeholderConfig = getSupabaseAdminConfig({
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "your_service_role_key"
});
assert.equal(placeholderConfig.isConfigured, false);
assert.deepEqual(placeholderConfig.missingEnv, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const configured = getSupabaseAdminConfig({
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
});
assert.equal(configured.isConfigured, true);
assert.equal(configured.url, "https://maris-test.supabase.co");
assert.equal(configured.projectRef, "maris-test");
assert.deepEqual(configured.missingEnv, []);
assert.equal("serviceRoleKey" in configured, false, "Service role keys must stay server-only");

const missingStatus = await readAdminDatabaseStatus({ env: {} });
assert.equal(missingStatus.isConfigured, false);
assert.deepEqual(missingStatus.missingEnv, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
assert.deepEqual(missingStatus.tables, []);

const calls = [];
const fakeClient = {
  from(tableName) {
    calls.push(tableName);

    return {
      async select(_columns, options) {
        assert.deepEqual(options, { count: "exact", head: true });

        if (tableName === "orders") {
          return { count: null, error: { message: "permission denied" } };
        }

        return { count: tableName.length, error: null };
      }
    };
  }
};

const liveStatus = await readAdminDatabaseStatus({
  env: {
    SUPABASE_URL: "https://maris-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
  },
  client: fakeClient
});

assert.equal(liveStatus.isConfigured, true);
assert.equal(liveStatus.projectRef, "maris-test");
assert.deepEqual(calls, MARIS_DATABASE_TABLES);
assert.equal(liveStatus.tables.length, MARIS_DATABASE_TABLES.length);
assert.deepEqual(liveStatus.tables.find((table) => table.name === "products"), {
  name: "products",
  isReachable: true,
  rowCount: "products".length,
  error: null
});
assert.deepEqual(liveStatus.tables.find((table) => table.name === "orders"), {
  name: "orders",
  isReachable: false,
  rowCount: null,
  error: "permission denied"
});

const catalogueCalls = [];
const catalogueClient = {
  from(tableName) {
    catalogueCalls.push(["from", tableName]);

    return {
      select(columns) {
        catalogueCalls.push(["select", tableName, columns]);

        return {
          order(column, options) {
            catalogueCalls.push(["order", column, options]);

            return {
              async limit(limit) {
                catalogueCalls.push(["limit", limit]);

                return {
                  data: [
                    {
                      id: "product-1",
                      product_code: "ER1001",
                      slug: "diamond-ring",
                      name_en: "Diamond Ring",
                      name_th: "แหวนเพชร",
                      category: "Engagement Rings",
                      collection: "engagement-ring",
                      status: "active",
                      price_amount: 12900,
                      currency: "THB",
                      is_active: true,
                      updated_at: "2026-05-27T00:00:00.000Z",
                      product_variants: [
                        {
                          id: "variant-1",
                          sku: "ER1001-WG-52",
                          variant_name: "White Gold 52",
                          metal: "white gold",
                          size_label: "52",
                          stock_quantity: 2,
                          is_active: true
                        }
                      ],
                      product_images: [
                        {
                          id: "image-1",
                          image_url: "https://example.com/ring-main.png",
                          alt_text: "Diamond Ring main angle",
                          sort_order: 0,
                          is_primary: true,
                          source: "google_sheet"
                        },
                        {
                          id: "image-2",
                          image_url: "https://example.com/ring-side.png",
                          alt_text: "Diamond Ring side",
                          sort_order: 1,
                          is_primary: false,
                          source: "manual"
                        }
                      ]
                    }
                  ],
                  error: null
                };
              }
            };
          }
        };
      }
    };
  }
};

const catalogue = await readAdminCatalogueProducts({
  env: {
    SUPABASE_URL: "https://maris-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
  },
  client: catalogueClient
});

assert.equal(catalogue.isConfigured, true);
assert.equal(catalogue.products.length, 1);
assert.deepEqual(catalogue.products[0], {
  id: "product-1",
  productCode: "ER1001",
  slug: "diamond-ring",
  nameEn: "Diamond Ring",
  nameTh: "แหวนเพชร",
  category: "Engagement Rings",
  collection: "engagement-ring",
  status: "active",
  priceAmount: 12900,
  currency: "THB",
  isActive: true,
  stockQuantity: 0,
  reservedQuantity: 0,
  stockQty: 0,
  reservedQty: 0,
  updatedAt: "2026-05-27T00:00:00.000Z",
  primaryImageUrl: "https://example.com/ring-main.png",
  imageCount: 2,
  variantCount: 1,
  totalStock: 2,
  variants: [
    {
      id: "variant-1",
      sku: "ER1001-WG-52",
      variantName: "White Gold 52",
      metal: "white gold",
      sizeLabel: "52",
      stockQuantity: 2,
      isActive: true
    }
  ],
  images: [
    {
      id: "image-1",
      imageUrl: "https://example.com/ring-main.png",
      altText: "Diamond Ring main angle",
      sortOrder: 0,
      isPrimary: true,
      source: "google_sheet"
    },
    {
      id: "image-2",
      imageUrl: "https://example.com/ring-side.png",
      altText: "Diamond Ring side",
      sortOrder: 1,
      isPrimary: false,
      source: "manual"
    }
  ]
});
assert.equal(catalogueCalls[0][1], "products");
assert.ok(
  catalogueCalls.some((call) => call[0] === "select" && /product_variants/.test(call[2]) && /product_images/.test(call[2])),
  "Catalogue reader should request variants and images with products"
);

const missingCatalogue = await readAdminCatalogueProducts({ env: {} });
assert.equal(missingCatalogue.isConfigured, false);
assert.deepEqual(missingCatalogue.products, []);

function createInventoryMovementClient() {
  const state = {
    product: {
      id: "product-1",
      product_code: "ER1001",
      name_en: "Diamond Ring",
      stock_quantity: 5,
      reserved_quantity: 1
    },
    inserts: [],
    updates: []
  };

  return {
    state,
    from(tableName) {
      if (tableName === "products") {
        return {
          select(columns) {
            state.productSelect = columns;

            return {
              eq(column, value) {
                state.productFilter = [column, value];
                return this;
              },
              limit(value) {
                state.productLimit = value;
                return this;
              },
              async maybeSingle() {
                return { data: { ...state.product }, error: null };
              }
            };
          },
          update(payload) {
            state.updates.push(payload);
            state.product = {
              ...state.product,
              ...payload
            };

            return {
              async eq(column, value) {
                state.updateFilter = [column, value];
                return { error: null };
              }
            };
          }
        };
      }

      if (tableName === "inventory_logs") {
        return {
          insert(payload) {
            state.inserts.push(payload);

            return {
              select(columns) {
                state.logSelect = columns;

                return {
                  async single() {
                    return {
                      data: {
                        id: "log-1",
                        ...payload,
                        products: { ...state.product },
                        created_at: "2026-06-02T00:00:00.000Z"
                      },
                      error: null
                    };
                  }
                };
              }
            };
          }
        };
      }

      throw new Error(`Unexpected table ${tableName}`);
    }
  };
}

const inventoryClient = createInventoryMovementClient();
const inventoryLog = await createAdminInventoryLog({
  productId: "product-1",
  changeType: "reserve",
  quantity: 2,
  note: "Admin reserve"
}, {
  env: {
    SUPABASE_URL: "https://maris-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
  },
  client: inventoryClient
});

assert.equal(inventoryClient.state.productSelect, "id, product_code, name_en, stock_quantity, reserved_quantity");
assert.deepEqual(inventoryClient.state.productFilter, ["id", "product-1"]);
assert.deepEqual(inventoryClient.state.updates[0], {
  stock_quantity: 5,
  reserved_quantity: 3,
  updated_at: inventoryClient.state.updates[0].updated_at
});
assert.deepEqual(inventoryClient.state.inserts[0], {
  product_id: "product-1",
  variant_id: null,
  change_type: "reserve",
  quantity: 2,
  note: "Admin reserve",
  reference_type: null,
  reference_id: null,
  metadata: {
    stockQuantity: 5,
    reservedQuantity: 3
  },
  created_by: null
});
assert.equal(inventoryLog.productCode, "ER1001");
assert.equal(inventoryLog.stockQuantity, 5);
assert.equal(inventoryLog.reservedQuantity, 3);

const adminHtml = await readFile(new URL("../pages/admin.html", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../assets/js/admin-page.js", import.meta.url), "utf8");
const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
const docsReadme = await readFile(new URL("../docs/README.md", import.meta.url), "utf8");
const databaseGuide = await readFile(new URL("../docs/supabase-admin-database.md", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
let migrationFiles = [];

try {
  migrationFiles = await readdir(new URL("../supabase/migrations/", import.meta.url));
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

const schemaMigrationFile = migrationFiles.find((fileName) => fileName.endsWith("_create_maris_admin_schema.sql"));

assert.ok(schemaMigrationFile, "A Supabase migration should create the Maris admin schema");

const schemaMigration = await readFile(new URL(`../supabase/migrations/${schemaMigrationFile}`, import.meta.url), "utf8");

assert.match(adminHtml, /data-admin-panel="database"/, "Admin should expose a database status panel");
assert.match(adminHtml, /data-database-table-status/, "Database panel should render table status rows");
assert.match(adminHtml, /data-database-products-table/, "Database panel should render Supabase product rows");
assert.match(adminJs, /\/api\/admin\/database\/status/, "Admin JavaScript should load database status through the protected API route");
assert.match(adminJs, /\/api\/admin\/database\/catalogue/, "Admin JavaScript should load Supabase catalogue data through the protected API route");
assert.match(envExample, /^SUPABASE_URL=/m, ".env.example should include the Supabase project URL");
assert.match(envExample, /^SUPABASE_SERVICE_ROLE_KEY=/m, ".env.example should include the server-only Supabase service role key");
assert.match(databaseGuide, /service role key is server-only/i, "Database guide must warn that the service role key stays server-only");
assert.match(databaseGuide, /Google Sheet remains the live storefront source/i, "Database guide must preserve the current live-source boundary");
assert.match(databaseGuide, /supabase\/migrations\/\d+_create_maris_admin_schema\.sql/, "Database guide should point to the schema migration");
assert.match(databaseGuide, /npm run test:database:live/i, "Database guide should tell operators how to verify the live Supabase tables");
assert.match(docsReadme, /supabase-admin-database\.md/, "Docs index should link to the Supabase admin database guide");
assert.equal(packageJson.scripts["test:database:live"], "node scripts/test-supabase-admin-database-live.mjs");

for (const tableName of EXPECTED_DATABASE_TABLES) {
  assert.match(
    schemaMigration,
    new RegExp(`create table if not exists public\\.${tableName}\\b`, "i"),
    `Migration should create ${tableName}`
  );
  assert.match(
    schemaMigration,
    new RegExp(`alter table public\\.${tableName}\\s+enable row level security`, "i"),
    `Migration should enable RLS for ${tableName}`
  );
}

for (const indexName of [
  "idx_products_code",
  "idx_product_variants_product_id",
  "idx_product_images_product_id",
  "idx_orders_customer_id",
  "idx_order_items_order_id",  "idx_order_items_product_id",
  "idx_payments_order_id",
  "idx_payments_customer_id",
  "idx_inventory_logs_product_id",
  "idx_inventory_logs_variant_id",  "idx_inventory_movements_product_id"
]) {
  assert.match(
    schemaMigration,
    new RegExp(`create index if not exists ${indexName}\\b`, "i"),
    `Migration should include ${indexName}`
  );
}

const liveSchemaTest = await readFile(new URL("../scripts/test-supabase-admin-database-live.mjs", import.meta.url), "utf8");
assert.match(liveSchemaTest, /readAdminDatabaseStatus/, "Live database script should use the same status helper as the admin API");
assert.match(liveSchemaTest, /unreachableTables/, "Live database script should fail when any expected table is unreachable");
