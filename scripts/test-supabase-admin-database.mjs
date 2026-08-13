import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const {
  MARIS_DATABASE_TABLES,
  createAdminProduct,
  createAdminInventoryLog,
  deleteAdminProductImage,
  getSupabaseAdminConfig,
  readAdminCatalogueProducts,
  readAdminDatabaseStatus,
  readPublicCatalogueProducts,
  reorderAdminProductImages,
  updateAdminProduct,
  uploadAdminProductImage
} = await import("../app/lib/maris-database.js");

const { GET: getPublicCatalogueProducts } = await import("../app/api/catalogue/products/route.js");

const EXPECTED_DATABASE_TABLES = [
  "admin_users",
  "auth_rate_limits",
  "customers",
  "custom_order_requests",
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
                      sku: "ER1001",
                      slug: "diamond-ring",
                      name: "Diamond Ring",
                      category: "Engagement Rings",
                      collection: "engagement-ring",
                      collection_name: "The One Aura Collection",
                      status: "active",
                      base_price: 12900,
                      updated_at: "2026-05-27T00:00:00.000Z",
                      product_variants: [
                        {
                          id: "variant-1",
                          sku: "ER1001-WG-52",
                          variant_name: "White Gold 52",
                          material: "white gold",
                          size: "52",
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
  sku: "ER1001",
  slug: "diamond-ring",
  name: "Diamond Ring",
  category: "Engagement Rings",
  collection: "engagement-ring",
  collectionName: "The One Aura Collection",
  status: "active",
  basePrice: 12900,
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
      material: "white gold",
      size: "52",
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
assert.ok(
  catalogueCalls.some((call) => call[0] === "select" && /collection_name/.test(call[2])),
  "Admin catalogue reader should request the display collection name"
);

const missingCatalogue = await readAdminCatalogueProducts({ env: {} });
assert.equal(missingCatalogue.isConfigured, false);
assert.deepEqual(missingCatalogue.products, []);

const publicCatalogueCalls = [];
const publicCatalogueClient = {
  from(tableName) {
    publicCatalogueCalls.push(["from", tableName]);

    return {
      select(columns) {
        publicCatalogueCalls.push(["select", tableName, columns]);

        const query = {
          filters: [],
          eq(column, value) {
            this.filters.push([column, value]);
            publicCatalogueCalls.push(["eq", column, value]);
            return this;
          },
          order(column, options) {
            publicCatalogueCalls.push(["order", column, options]);
            return this;
          },
          async limit(limit) {
            publicCatalogueCalls.push(["limit", limit]);

            return {
              data: [
                {
                  id: "product-1",
                  sku: "ER1001",
                  slug: "diamond-ring",
                  name: "Diamond Ring",
                  category: "Engagement Rings",
                  collection: "engagement-ring",
                  description: "Round diamond ring.",
                  material: "14K Gold",
                  gold_color: "White Gold",
                  status: "active",
                  base_price: 12900,
                  stock_quantity: 5,
                  reserved_quantity: 2,
                  updated_at: "2026-05-27T00:00:00.000Z",
                  metadata: {
                    title: "Featured Diamond Ring",
                    details: ["14K White Gold", "Round diamond"],
                    filterValues: ["white-gold", "round"],
                    imagePresentation: "contain",
                    internalCost: "never-public"
                  },
                  product_variants: [
                    {
                      id: "variant-1",
                      sku: "ER1001-WG-52",
                      variant_name: "White Gold 52",
                      material: "white gold",
                      size: "52",
                      stock_quantity: 2,
                      is_active: true
                    }
                  ],
                  product_images: [
                    {
                      id: "image-2",
                      image_url: "https://example.com/ring-side.png",
                      alt_text: "Diamond Ring side",
                      sort_order: 1,
                      is_primary: false,
                      source: "manual"
                    },
                    {
                      id: "image-1",
                      image_url: "https://example.com/ring-main.png",
                      alt_text: "Diamond Ring main",
                      sort_order: 0,
                      is_primary: true,
                      source: "upload"
                    }
                  ]
                }
              ],
              error: null
            };
          }
        };

        return query;
      }
    };
  }
};

const publicCatalogue = await readPublicCatalogueProducts({
  env: {
    SUPABASE_URL: "https://maris-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
  },
  client: publicCatalogueClient
});

assert.equal(publicCatalogue.source, "supabase");
assert.equal(publicCatalogue.status, "ready");
assert.deepEqual(publicCatalogueCalls.filter((call) => call[0] === "eq"), [
  ["eq", "status", "active"]
]);
assert.ok(
  publicCatalogueCalls.some((call) => call[0] === "select" && /product_variants/.test(call[2]) && /product_images/.test(call[2])),
  "Public catalogue reader should request variants and images with products"
);
assert.ok(
  publicCatalogueCalls.some((call) => call[0] === "select" && /collection_name/.test(call[2])),
  "Public catalogue reader should request the named collection for the product page"
);
assert.deepEqual(publicCatalogue.products[0], {
  id: "product-1",
  sku: "ER1001",
  slug: "diamond-ring",
  name: "Diamond Ring",
  category: "Engagement Rings",
  collection: "engagement-ring",
  collectionName: "",
  status: "active",
  basePrice: 12900,
  primaryImageUrl: "https://example.com/ring-main.png",
  images: [
    {
      id: "image-1",
      imageUrl: "https://example.com/ring-main.png",
      altText: "Diamond Ring main",
      sortOrder: 0,
      isPrimary: true
    },
    {
      id: "image-2",
      imageUrl: "https://example.com/ring-side.png",
      altText: "Diamond Ring side",
      sortOrder: 1,
      isPrimary: false
    }
  ],
  variants: [
    {
      id: "variant-1",
      sku: "ER1001-WG-52",
      variantName: "White Gold 52",
      material: "white gold",
      size: "52"
    }
  ]
});
assert.equal("serviceRoleKey" in publicCatalogue, false);
assert.equal("isActive" in publicCatalogue.products[0], false);
assert.equal("stockQuantity" in publicCatalogue.products[0], false);
assert.equal("reservedQuantity" in publicCatalogue.products[0], false);
assert.equal("metadata" in publicCatalogue.products[0], false);
assert.equal("internalCost" in publicCatalogue.products[0], false);
assert.equal(JSON.stringify(publicCatalogue).includes("service-role-secret"), false);

const missingPublicCatalogue = await readPublicCatalogueProducts({ env: {} });
assert.equal(missingPublicCatalogue.source, "supabase");
assert.equal(missingPublicCatalogue.status, "unavailable");
assert.deepEqual(missingPublicCatalogue.missingEnv, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
assert.deepEqual(missingPublicCatalogue.products, []);

const previousSupabaseUrl = process.env.SUPABASE_URL;
const previousSupabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const missingPublicRouteResponse = await getPublicCatalogueProducts();
const missingPublicRoutePayload = await missingPublicRouteResponse.json();
assert.equal(missingPublicRouteResponse.status, 200);
assert.equal(missingPublicRouteResponse.headers.get("Cache-Control"), "no-store");
assert.equal(missingPublicRoutePayload.source, "supabase");
assert.equal(missingPublicRoutePayload.status, "unavailable");
assert.deepEqual(missingPublicRoutePayload.products, []);
assert.equal("serviceRoleKey" in missingPublicRoutePayload, false);
if (previousSupabaseUrl === undefined) {
  delete process.env.SUPABASE_URL;
} else {
  process.env.SUPABASE_URL = previousSupabaseUrl;
}
if (previousSupabaseServiceRoleKey === undefined) {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
} else {
  process.env.SUPABASE_SERVICE_ROLE_KEY = previousSupabaseServiceRoleKey;
}

function createProductMutationClient() {
  const state = {
    inserts: [],
    updates: [],
    updateFilters: []
  };

  function buildProductRow(payload, overrides = {}) {
    return {
      id: overrides.id || "product-1",
      sku: payload.sku || "SKU1001",
      slug: payload.slug || String(payload.sku || "SKU1001").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: payload.name || "Test Product",
      category: payload.category || "",
      collection: payload.collection || "",
      collection_name: payload.collection_name || null,
      status: payload.status || "draft",
      base_price: payload.base_price ?? null,
      stock_quantity: payload.stock_quantity ?? 0,
      reserved_quantity: payload.reserved_quantity ?? 0,
      updated_at: "2026-07-04T00:00:00.000Z",
      product_variants: [],
      product_images: []
    };
  }

  return {
    state,
    from(tableName) {
      if (tableName === "products") {
        return {
          insert(payload) {
            state.inserts.push(payload);

            return {
              select() {
                return {
                  async single() {
                    return {
                      data: buildProductRow(payload),
                      error: null
                    };
                  }
                };
              }
            };
          },
          update(payload) {
            state.updates.push(payload);

            return {
              eq(column, value) {
                state.updateFilters.push([column, value]);

                return {
                  select() {
                    return {
                      async single() {
                        return {
                          data: buildProductRow(payload, { id: value }),
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
      }

      throw new Error(`Unexpected table ${tableName}`);
    }
  };
}

const productMutationEnv = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};

const engagementProductClient = createProductMutationClient();
await createAdminProduct({
  sku: "ER1002",
  name: "Engagement Halo Ring",
  category: "Engagement Rings",
  collection: "engagement-ring",
  collectionName: "The One Aura Collection",
  price: "18900",
  status: "Ready",
  stockQty: 1,
  reservedQty: 0
}, {
  env: productMutationEnv,
  client: engagementProductClient
});

assert.equal(engagementProductClient.state.inserts[0].category, "Rings");
assert.equal(engagementProductClient.state.inserts[0].collection, "engagement-ring");
assert.equal(engagementProductClient.state.inserts[0].collection_name, "The One Aura Collection");

const weddingSetProductClient = createProductMutationClient();
await createAdminProduct({
  sku: "WS1002",
  name: "Wedding Set Pair",
  category: "Wedding Set",
  collection: "wedding-set",
  price: "28900",
  status: "Ready",
  stockQty: 1,
  reservedQty: 0
}, {
  env: productMutationEnv,
  client: weddingSetProductClient
});

assert.equal(weddingSetProductClient.state.inserts[0].category, "Wedding Set");
assert.equal(weddingSetProductClient.state.inserts[0].collection, "wedding-set");

const editableSkuProductClient = createProductMutationClient();
await updateAdminProduct("product-1", {
  sku: "MWB1001",
  name: "Men's Wedding Band",
  category: "Men's Wedding Bands",
  collection: "mens-wedding-bands",
  collectionName: "The Men Classic Collection",
  price: "15900",
  status: "Ready",
  stockQty: 2
}, {
  env: productMutationEnv,
  client: editableSkuProductClient
});

assert.equal(editableSkuProductClient.state.updates[0].sku, "MWB1001");
assert.equal(editableSkuProductClient.state.updates[0].category, "Rings");
assert.equal(editableSkuProductClient.state.updates[0].collection, "mens-wedding-bands");
assert.equal(editableSkuProductClient.state.updates[0].collection_name, "The Men Classic Collection");
assert.deepEqual(editableSkuProductClient.state.updateFilters[0], ["id", "product-1"]);

function createProductImageUploadClient() {
  const state = {
    uploads: [],
    insertedImages: [],
    selectedColumns: []
  };

  return {
    state,
    storage: {
      from(bucketName) {
        assert.equal(bucketName, "product-images");

        return {
          async upload(path, buffer, options) {
            state.uploads.push({ path, buffer, options });
            return {
              data: {
                path,
                fullPath: `${bucketName}/${path}`
              },
              error: null
            };
          },
          getPublicUrl(path) {
            return {
              data: {
                publicUrl: `https://example.supabase.co/storage/v1/object/public/product-images/${path}`
              }
            };
          }
        };
      }
    },
    from(tableName) {
      assert.equal(tableName, "product_images");

      return {
        insert(payload) {
          state.insertedImages.push(payload);

          return {
            select(columns) {
              state.selectedColumns.push(columns);

              return {
                async single() {
                  return {
                    data: {
                      id: "image-1",
                      ...payload
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
  };
}

const uploadClient = createProductImageUploadClient();
const uploadedImage = await uploadAdminProductImage({
  productId: "product-1",
  fileName: "Main Ring.png",
  contentType: "image/png",
  buffer: Buffer.from("fake-image"),
  altText: "Main ring",
  sortOrder: 0,
  isPrimary: true
}, {
  env: {
    SUPABASE_URL: "https://maris-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
  },
  client: uploadClient,
  now: () => 1710000000000
});

const uploadedPath = uploadClient.state.uploads[0].path;
assert.match(uploadedPath, /^product-1\/\d+-[a-z0-9]+\.png$/);
assert.equal(uploadClient.state.uploads[0].options.contentType, "image/png");
assert.equal(uploadClient.state.uploads[0].options.upsert, false);
assert.equal(uploadClient.state.insertedImages[0].product_id, "product-1");
assert.equal(uploadClient.state.insertedImages[0].image_url, `https://example.supabase.co/storage/v1/object/public/product-images/${uploadedPath}`);
assert.equal(uploadClient.state.insertedImages[0].source, "upload");
assert.deepEqual(uploadedImage, {
  id: "image-1",
  imageUrl: `https://example.supabase.co/storage/v1/object/public/product-images/${uploadedPath}`,
  altText: "Main ring",
  sortOrder: 0,
  isPrimary: true,
  source: "upload"
});

await assert.rejects(
  () => uploadAdminProductImage({
    productId: "product-1",
    fileName: "notes.txt",
    contentType: "text/plain",
    buffer: Buffer.from("not an image")
  }, {
    env: {
      SUPABASE_URL: "https://maris-test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
    },
    client: createProductImageUploadClient()
  }),
  (error) => error.statusCode === 400 && /image/i.test(error.message)
);

await assert.rejects(
  () => uploadAdminProductImage({
    productId: "product-1",
    fileName: "huge.png",
    contentType: "image/png",
    buffer: Buffer.alloc((5 * 1024 * 1024) + 1)
  }, {
    env: {
      SUPABASE_URL: "https://maris-test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
    },
    client: createProductImageUploadClient()
  }),
  (error) => error.statusCode === 413 && /5 MB/i.test(error.message)
);

function createProductImageActionClient() {
  const state = {
    deletes: [],
    updates: []
  };

  function makeQuery(action, payload) {
    const query = {
      filters: [],
      eq(column, value) {
        this.filters.push([column, value]);
        if (this.filters.length === 2) {
          if (action === "delete") {
            state.deletes.push({ filters: [...this.filters] });
          } else {
            state.updates.push({ payload, filters: [...this.filters] });
          }

          return Promise.resolve({ error: null });
        }

        return this;
      }
    };

    return query;
  }

  return {
    state,
    from(tableName) {
      assert.equal(tableName, "product_images");

      return {
        delete() {
          return makeQuery("delete");
        },
        update(payload) {
          return makeQuery("update", payload);
        }
      };
    }
  };
}

const imageActionClient = createProductImageActionClient();
const deletedImage = await deleteAdminProductImage({
  productId: "product-1",
  imageId: "image-2"
}, {
  env: {
    SUPABASE_URL: "https://maris-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
  },
  client: imageActionClient
});

assert.deepEqual(deletedImage, {
  id: "image-2",
  productId: "product-1",
  deleted: true
});
assert.deepEqual(imageActionClient.state.deletes[0].filters, [
  ["id", "image-2"],
  ["product_id", "product-1"]
]);

const reorderedImages = await reorderAdminProductImages({
  productId: "product-1",
  imageIds: ["image-3", "image-1", "image-2"]
}, {
  env: {
    SUPABASE_URL: "https://maris-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
  },
  client: imageActionClient
});

assert.deepEqual(reorderedImages, {
  productId: "product-1",
  imageIds: ["image-3", "image-1", "image-2"],
  updated: true
});
assert.deepEqual(imageActionClient.state.updates.map((update) => update.payload), [
  { sort_order: 0, is_primary: true },
  { sort_order: 1, is_primary: false },
  { sort_order: 2, is_primary: false }
]);
assert.deepEqual(imageActionClient.state.updates.map((update) => update.filters), [
  [["id", "image-3"], ["product_id", "product-1"]],
  [["id", "image-1"], ["product_id", "product-1"]],
  [["id", "image-2"], ["product_id", "product-1"]]
]);

function createInventoryMovementClient() {
  const state = {
    product: {
      id: "product-1",
      sku: "ER1001",
      name: "Diamond Ring",
      stock_quantity: 5,
      reserved_quantity: 1
    },
    rpcCalls: []
  };

  return {
    state,
    async rpc(functionName, args) {
      state.rpcCalls.push({ functionName, args });
      state.product.reserved_quantity += args.p_quantity;

      return {
        data: {
          id: "log-1",
          product_id: args.p_product_id,
          variant_id: args.p_variant_id,
          change_type: args.p_movement_type,
          quantity: args.p_quantity,
          note: args.p_note,
          reference_type: args.p_reference_type,
          reference_id: args.p_reference_id,
          metadata: {
            ...args.p_metadata,
            stockQuantity: state.product.stock_quantity,
            reservedQuantity: state.product.reserved_quantity
          },
          created_by: args.p_created_by,
          products: { ...state.product },
          created_at: "2026-06-02T00:00:00.000Z"
        },
        error: null
      };
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

assert.deepEqual(inventoryClient.state.rpcCalls[0], {
  functionName: "maris_apply_inventory_movement",
  args: {
    p_product_id: "product-1",
    p_movement_type: "reserve",
    p_quantity: 2,
    p_variant_id: null,
    p_note: "Admin reserve",
    p_reference_type: null,
    p_reference_id: null,
    p_metadata: {},
    p_created_by: null
  }
});
assert.equal(inventoryLog.productCode, "ER1001");
assert.equal(inventoryLog.stockQuantity, 5);
assert.equal(inventoryLog.reservedQuantity, 3);

const adminHtml = await readFile(new URL("../app/admin/page.js", import.meta.url), "utf8");
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
const allMigrations = await Promise.all(migrationFiles.map((fileName) => (
  readFile(new URL(`../supabase/migrations/${fileName}`, import.meta.url), "utf8")
)));
const additiveSchema = allMigrations.join("\n\n");

assert.match(adminHtml, /data-admin-panel="database"/, "Admin should expose a database status panel");
assert.match(adminHtml, /data-database-table-status/, "Database panel should render table status rows");
assert.match(adminHtml, /data-database-products-table/, "Database panel should render Supabase product rows");
assert.match(adminJs, /\/api\/admin\/database\/status/, "Admin JavaScript should load database status through the protected API route");
assert.match(adminJs, /\/api\/admin\/database\/catalogue/, "Admin JavaScript should load Supabase catalogue data through the protected API route");
assert.match(envExample, /^SUPABASE_URL=/m, ".env.example should include the Supabase project URL");
assert.match(envExample, /^SUPABASE_SERVICE_ROLE_KEY=/m, ".env.example should include the server-only Supabase service role key");
assert.match(databaseGuide, /service role key is server-only/i, "Database guide must warn that the service role key stays server-only");
assert.match(databaseGuide, /Supabase is the storefront catalogue source/i, "Database guide must describe Supabase as the storefront catalogue source");
assert.match(databaseGuide, /supabase\/migrations\/\d+_create_maris_admin_schema\.sql/, "Database guide should point to the schema migration");
assert.match(databaseGuide, /npm run test:database:live/i, "Database guide should tell operators how to verify the live Supabase tables");
assert.match(docsReadme, /supabase-admin-database\.md/, "Docs index should link to the Supabase admin database guide");
assert.equal(packageJson.scripts["test:database:live"], "node scripts/test-supabase-admin-database-live.mjs");
assert.equal(packageJson.scripts.prebuild, undefined, "Build should no longer run legacy static sync before Next.js");

for (const tableName of EXPECTED_DATABASE_TABLES) {
  assert.match(
    additiveSchema,
    new RegExp(`create table if not exists public\\.${tableName}\\b`, "i"),
    `Migration should create ${tableName}`
  );
  assert.match(
    additiveSchema,
    new RegExp(`alter table public\\.${tableName}\\s+enable row level security`, "i"),
    `Migration should enable RLS for ${tableName}`
  );
}

for (const indexName of [
  "idx_products_sku",
  "idx_auth_rate_limits_updated_at",
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
    additiveSchema,
    new RegExp(`create index if not exists ${indexName}\\b`, "i"),
    `Migration should include ${indexName}`
  );
}

assert.match(
  additiveSchema,
  /create unique index if not exists idx_payments_gateway_transaction_unique\b/i,
  "Gateway transaction ids should be idempotent"
);

for (const functionName of [
  "maris_apply_inventory_movement",
  "maris_create_admin_order",
  "maris_update_admin_order",
  "maris_create_admin_payment",
  "maris_capture_order_payment"
]) {
  assert.match(
    additiveSchema,
    new RegExp(`create or replace function public\\.${functionName}\\b`, "i"),
    `Migration should define atomic RPC ${functionName}`
  );
  assert.match(
    additiveSchema,
    new RegExp(`grant execute on function public\\.${functionName}[\\s\\S]*?to service_role`, "i"),
    `Atomic RPC ${functionName} should be service-role only`
  );
}

assert.match(
  additiveSchema,
  /create or replace function public\.maris_consume_auth_rate_limit\b/i,
  "Authentication must use a durable database rate limiter"
);
assert.match(
  additiveSchema,
  /grant execute on function public\.maris_consume_auth_rate_limit[\s\S]*?to service_role/i,
  "Authentication rate limiting must be service-role only"
);

assert.match(additiveSchema, /from public\.products[\s\S]*?for update/i, "Inventory and order writes must lock product rows");
assert.match(additiveSchema, /from public\.orders[\s\S]*?for update/i, "Order and payment writes must lock order rows");

const liveSchemaTest = await readFile(new URL("../scripts/test-supabase-admin-database-live.mjs", import.meta.url), "utf8");
assert.match(liveSchemaTest, /readAdminDatabaseStatus/, "Live database script should use the same status helper as the admin API");
assert.match(liveSchemaTest, /unreachableTables/, "Live database script should fail when any expected table is unreachable");
