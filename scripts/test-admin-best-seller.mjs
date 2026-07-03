import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const configuredEnv = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key"
};

async function readRequiredSource(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function readOptionalSource(path) {
  try {
    await access(new URL(`../${path}`, import.meta.url));
    return readRequiredSource(path);
  } catch {
    return "";
  }
}

function createBestSellerClient() {
  const state = {
    settingsValue: { productIds: ["p-3", "p-1"] },
    upsertPayload: null,
    products: [
      {
        id: "p-1",
        sku: "MR-RNG-001",
        slug: "maris-ring",
        name: "Maris Ring",
        category: "Rings",
        collection: "ring",
        status: "active",
        base_price: 18900,
        product_variants: [],
        product_images: [
          {
            id: "img-1",
            image_url: "/ring.jpg",
            alt_text: "Maris ring",
            sort_order: 0,
            is_primary: true
          }
        ],
        metadata: { internalNote: "do not expose" }
      },
      {
        id: "p-2",
        sku: "MR-HDN-001",
        slug: "hidden-ring",
        name: "Hidden Ring",
        category: "Rings",
        collection: "ring",
        status: "draft",
        base_price: 9900,
        product_variants: [],
        product_images: [],
        metadata: {}
      },
      {
        id: "p-3",
        sku: "MR-ER-001",
        slug: "maris-earring",
        name: "Maris Earring",
        category: "Earrings",
        collection: "earring",
        status: "active",
        base_price: 12900,
        product_variants: [],
        product_images: [
          {
            id: "img-3",
            image_url: "/earring.jpg",
            alt_text: "Maris earring",
            sort_order: 0,
            is_primary: true
          }
        ],
        metadata: { privateSortHint: 99 }
      }
    ]
  };

  function createQuery(table) {
    const query = {
      filters: {},
      selected: "",
      insertPayload: null,
      select(value) {
        this.selected = value;
        return this;
      },
      eq(column, value) {
        this.filters[column] = value;
        return this;
      },
      in(column, values) {
        this.filters[column] = values;
        return this;
      },
      limit(value) {
        this.limitValue = value;
        return this;
      },
      upsert(payload) {
        state.upsertPayload = payload;
        state.settingsValue = payload.value;
        return this;
      },
      maybeSingle() {
        if (table === "settings") {
          return Promise.resolve({
            data: state.settingsValue ? { value: state.settingsValue } : null,
            error: null
          });
        }

        return Promise.resolve({ data: null, error: null });
      },
      single() {
        if (table === "settings") {
          return Promise.resolve({
            data: { value: state.settingsValue },
            error: null
          });
        }

        return Promise.resolve({ data: null, error: null });
      },
      then(resolve, reject) {
        return this.execute().then(resolve, reject);
      },
      execute() {
        if (table !== "products") {
          return Promise.resolve({ data: [], error: null });
        }

        const ids = Array.isArray(this.filters.id) ? this.filters.id : [];
        const status = this.filters.status;
        const data = state.products
          .filter((product) => !ids.length || ids.includes(product.id))
          .filter((product) => !status || product.status === status)
          .slice(0, this.limitValue || state.products.length);

        return Promise.resolve({ data, error: null });
      }
    };

    return query;
  }

  return {
    state,
    from(table) {
      return createQuery(table);
    }
  };
}

const database = await import("../app/lib/maris-database.js");
const adminPage = await readRequiredSource("app/admin/page.js");
const adminScript = await readRequiredSource("assets/js/admin-page.js");
const homepage = await readRequiredSource("app/page.js");
const bestSellerSection = await readRequiredSource("app/BestSellerSection.jsx");
const bestSellerRoute = await readOptionalSource("app/api/admin/best-sellers/route.js");

assert.equal(
  typeof database.readAdminBestSellerSettings,
  "function",
  "database helper should read admin best seller settings"
);
assert.equal(
  typeof database.updateAdminBestSellerSettings,
  "function",
  "database helper should update admin best seller settings"
);
assert.equal(
  typeof database.readPublicBestSellerProducts,
  "function",
  "database helper should read public best seller products"
);

const client = createBestSellerClient();
const current = await database.readAdminBestSellerSettings({ env: configuredEnv, client });
assert.deepEqual(current.productIds, ["p-3", "p-1"]);

const updated = await database.updateAdminBestSellerSettings(["p-2", "p-1", "p-2", " "], {
  env: configuredEnv,
  client
});
assert.deepEqual(updated.productIds, ["p-2", "p-1"]);
assert.deepEqual(client.state.upsertPayload.value.productIds, ["p-2", "p-1"]);

client.state.settingsValue = { productIds: ["p-3", "p-1"] };
const publicBestSellers = await database.readPublicBestSellerProducts({
  env: configuredEnv,
  client,
  limit: 7
});
assert.equal(publicBestSellers.status, "ready");
assert.deepEqual(publicBestSellers.products.map((product) => product.id), ["p-3", "p-1"]);
assert.equal(
  Object.hasOwn(publicBestSellers.products[0], "metadata"),
  false,
  "public best seller products must not expose raw metadata"
);

assert.match(adminPage, /data-admin-tab="best-seller"/);
assert.match(adminPage, /data-admin-panel="best-seller"/);
assert.match(adminPage, /data-best-seller-form/);
assert.match(adminPage, /data-best-seller-slots/);
assert.match(bestSellerRoute, /readAdminBestSellerSettings/);
assert.match(bestSellerRoute, /updateAdminBestSellerSettings/);
assert.match(adminScript, /fetchAdminApi\("\/best-sellers"\)/);
assert.match(adminScript, /function renderBestSellerSettings\(\)/);
assert.match(adminScript, /data-best-seller-slot/);
assert.match(homepage, /readPublicBestSellerProducts/);
assert.match(homepage, /<BestSellerSection\s+items=\{bestSellerProducts\}\s*\/>/);
assert.match(bestSellerSection, /export default function BestSellerSection\(\{\s*items\s*=\s*\[\]\s*\}\)/);

console.log("PASS: Admin best seller settings, route, UI, and homepage carousel contract are wired.");
