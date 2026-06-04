import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const productDataJs = await readFile(new URL("../assets/js/product-data.js", import.meta.url), "utf8");
const adminHtml = await readFile(new URL("../pages/admin.html", import.meta.url), "utf8");
const sheetGuide = await readFile(new URL("../docs/google-sheet-catalogue.md", import.meta.url), "utf8");

const shuffledCsv = [
  "Internal note row that should not be treated as headers",
  [
    "name",
    "price",
    "image_url",
    "details",
    "code",
    "Collection",
    "Type",
    "ID",
    "Gold Weight",
    "Center",
    "Malee",
    "front_image_url",
    "top_image_url",
    "rose_gold_image_url",
    "yellow_gold_image_url",
    "side_image_url",
    "description"
  ].join(","),
  [
    "Column Shuffle Ring",
    "\"19,900\"",
    "https://example.com/main.png",
    "14K White Gold",
    "ER999",
    "Engagement Ring",
    "ER",
    "SR001",
    "3.4g",
    "Round",
    "0.12ct",
    "https://example.com/front.png",
    "https://example.com/top.png",
    "https://example.com/rose.png",
    "https://example.com/yellow.png",
    "https://example.com/side.png",
    "Mapped by header name"
  ].join(",")
].join("\n");

const windowEvents = [];
const window = {
  dispatchEvent(event) {
    windowEvents.push(event);
  }
};

const context = vm.createContext({
  window,
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {}
  },
  fetch: async () => ({
    ok: true,
    text: async () => shuffledCsv
  }),
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

assert.equal(window.MARIS_SHEET_STATUS.status, "ready");
assert.equal(window.MARIS_SHEET_PRODUCTS.length, 1);

const [product] = window.MARIS_SHEET_PRODUCTS;
assert.equal(product.code, "ER999");
assert.equal(product.name, "Column Shuffle Ring");
assert.equal(product.price, "19,900");
assert.equal(product.image, "https://example.com/main.png");
assert.equal(product.collectionKey, "engagement-ring");
assert.ok(product.gallery.some((item) => item.src === "https://example.com/front.png"));

assert.equal(window.MARIS_SHEET_SCHEMA.mapsByHeaderName, true);
assert.equal(window.MARIS_SHEET_SCHEMA.columnMapping.code.index, 4);
assert.equal(window.MARIS_SHEET_SCHEMA.columnMapping.code.header, "code");
assert.equal(window.MARIS_SHEET_SCHEMA.columnMapping.image_url.index, 2);
assert.deepEqual(Array.from(window.MARIS_SHEET_SCHEMA.missingRequiredKeys), []);
assert.ok(windowEvents.some((event) => event.type === "maris:catalogue-data-updated"));

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
