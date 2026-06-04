import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const productDataJs = await readFile(new URL("../assets/js/product-data.js", import.meta.url), "utf8");
const adminHtml = await readFile(new URL("../pages/admin.html", import.meta.url), "utf8");
const sheetGuide = await readFile(new URL("../docs/google-sheet-catalogue.md", import.meta.url), "utf8");

const publicCataloguePayload = {
  source: "supabase",
  status: "ready",
  checkedAt: "2026-06-04T05:20:00.000Z",
  productCount: 1,
  products: [
    {
      id: "product-1",
      code: "ER999",
      slug: "column-shuffle-ring",
      title: "Column Shuffle Ring",
      name: "Column Shuffle Ring",
      nameTh: "แหวนเพชร",
      collectionKey: "engagement-ring",
      category: "Engagement Rings",
      description: "Mapped by public API",
      details: ["14K White Gold"],
      price: "19,900 THB",
      priceAmount: 19900,
      currency: "THB",
      status: "active",
      stockState: "available",
      availableQuantity: 3,
      image: "https://example.com/main.png",
      hover: "https://example.com/hover.png",
      gallery: [
        {
          id: "image-1",
          label: "Primary View",
          src: "https://example.com/main.png",
          alt: "Column Shuffle Ring main",
          sortOrder: 0,
          isPrimary: true
        },
        {
          id: "image-2",
          label: "Front View",
          src: "https://example.com/front.png",
          alt: "Column Shuffle Ring front",
          sortOrder: 1,
          isPrimary: false
        }
      ],
      filterValues: ["white-gold", "round"],
      imagePresentation: "contain",
      updatedAt: "2026-06-04T05:19:00.000Z"
    }
  ]
};

const windowEvents = [];
const window = {
  dispatchEvent(event) {
    windowEvents.push(event);
  }
};
const fetchCalls = [];

const context = vm.createContext({
  window,
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {}
  },
  fetch: async (url) => {
    fetchCalls.push(String(url));

    return {
      ok: true,
      json: async () => publicCataloguePayload
    };
  },
  console,
  URL,
  Date,
  CustomEvent: class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  }
});

vm.runInContext(productDataJs, context);
await window.MARIS_DATA_READY;

assert.deepEqual(fetchCalls, ["/api/catalogue/products"]);
assert.equal(fetchCalls.some((url) => /docs\.google\.com/i.test(url)), false);
assert.equal(window.MARIS_SHEET_STATUS.source, "supabase");
assert.equal(window.MARIS_SHEET_STATUS.status, "ready");
assert.equal(window.MARIS_SHEET_PRODUCTS.length, 0);
assert.equal(window.MARIS_PRODUCTS.length, 1);

const [product] = window.MARIS_PRODUCTS;
assert.equal(product.code, "ER999");
assert.equal(product.name, "Column Shuffle Ring");
assert.equal(product.price, "19,900 THB");
assert.equal(product.image, "https://example.com/main.png");
assert.equal(product.hover, "https://example.com/hover.png");
assert.equal(product.collectionKey, "engagement-ring");
assert.ok(product.gallery.some((item) => item.src === "https://example.com/front.png"));
assert.deepEqual(Array.from(window.MARIS_COLLECTION_PRODUCTS["engagement-ring"]), ["ER999"]);

assert.equal(window.MARIS_SHEET_SCHEMA.mapsByHeaderName, true);
assert.deepEqual(Array.from(window.MARIS_SHEET_SCHEMA.missingRequiredKeys), ["code", "name", "image_url"]);
assert.ok(windowEvents.some((event) => event.type === "maris:catalogue-data-updated" && event.detail.source === "supabase"));

assert.doesNotMatch(
  adminHtml,
  /A-Q|Current Sheet column order|Keep the Sheet columns in the current/i,
  "Admin instructions must teach header-name mapping instead of fixed A-Q order"
);

assert.doesNotMatch(
  sheetGuide,
  /A-Q|from `G` onward|`[A-Q]`:/i,
  "Google Sheet guide must not tell the team to preserve A-Q column positions"
);

assert.match(
  sheetGuide,
  /column names/i,
  "Google Sheet guide should explicitly tell the team that column names drive mapping"
);
