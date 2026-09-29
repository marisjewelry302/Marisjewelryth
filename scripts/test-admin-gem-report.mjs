import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const { createAdminProduct, readPublicProductBySlug, updateAdminProduct } = await import("../app/lib/maris-database.js");
const { formatGemCarat, normalizeGemReport, toPublicGemReport } = await import("../app/lib/gem-report.js");

const adminHtml = await readFile(new URL("../app/admin/page.js", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../assets/js/admin-page.js", import.meta.url), "utf8");
const productPage = await readFile(new URL("../app/product/[slug]/product-slug-page.js", import.meta.url), "utf8");
const parserSource = await readFile(new URL("../assets/js/admin-gem-report-parser.js", import.meta.url), "utf8");

const context = { window: {}, TextDecoder };
vm.runInNewContext(parserSource, context);
const parser = context.window.MARIS_ADMIN_GEM_REPORT;

assert.equal(typeof parser?.parseGemReportCsv, "function", "The gem report parser should expose parseGemReportCsv");

// vm objects come from another realm, so they are compared as plain JSON.
const plain = (value) => JSON.parse(JSON.stringify(value));
const parse = (text, options) => plain(parser.parseGemReportCsv(text, options));

// A MatrixGold-style export: a title line above the header, per-stone and line
// carat columns, and a total line that must not count as a stone.
const matrix = parse([
  "Gem Report",
  "Shape,Size (mm),Qty,Material,Ct Wt Each,Total Ct Wt",
  "Round,1.30,24,Diamond,0.009,0.216",
  "Oval,7x5,1,Diamond,0.75,0.75",
  "Total,,25,,,0.966"
].join("\n"), { fileName: "gem report.csv" });

assert.equal(matrix.ok, true);
assert.equal(matrix.skippedRows, 1, "The total line is left out");
assert.equal(matrix.needsCaratMode, false, "Separate each and total columns leave nothing to guess");
assert.deepEqual(matrix.report, {
  stones: [
    // The largest stone leads, so the centre stone heads the table.
    { stone: "Diamond", shape: "Oval", size: "7 × 5 mm", quantity: 1, caratEach: 0.75, caratTotal: 0.75 },
    { stone: "Diamond", shape: "Round", size: "1.30 mm", quantity: 24, caratEach: 0.009, caratTotal: 0.216 }
  ],
  totalQuantity: 25,
  totalCarat: 0.966,
  fileName: "gem report.csv"
});
assert.deepEqual(matrix.specs, {
  caratWeight: "0.966 ct total",
  stoneType: "Diamond",
  stoneShape: "Oval"
});

// One carat column beside Qty is read from the stone sizes: a 1.3 mm round
// weighs about 0.008 ct, so 0.19 over 24 stones is the line's weight...
const lineCarat = parse("Stone,Shape,Size,Qty,Carat\nDiamond,Round,1.3,24,0.19\nDIAMOND,ROUND,6.5,1,1.00\n");
assert.equal(lineCarat.needsCaratMode, true);
assert.equal(lineCarat.caratMode, "total");
assert.equal(lineCarat.caratModeSource, "sizes");
assert.equal(lineCarat.report.totalCarat, 1.19);
assert.deepEqual(lineCarat.report.stones[0], {
  stone: "Diamond",
  shape: "Round",
  size: "6.5 mm",
  quantity: 1,
  caratEach: 1,
  caratTotal: 1
}, "Upper-case exports are shown in title case");

// ...while 0.008 is the weight of each stone.
const eachCarat = parse("Stone,Shape,Size,Qty,Carat\nDiamond,Round,1.3,24,0.008\nDiamond,Round,6.5,1,1.00\n");
assert.equal(eachCarat.caratMode, "each");
assert.equal(eachCarat.report.stones[1].caratTotal, 0.192);

// The admin can overrule the guess.
const overruled = parse("Stone,Shape,Size,Qty,Carat\nDiamond,Round,1.3,24,0.19\n", { caratMode: "each" });
assert.equal(overruled.caratModeSource, "admin");
assert.equal(overruled.report.totalCarat, 4.56);

// Semicolon exports from comma-decimal locales.
const semicolon = parse("Gem;Cut;Diameter;Count;Weight (ct)\nDiamond;Round;1,30;12;0,108\nSapphire;Pear;7x5;1;0,85\n");
assert.equal(semicolon.ok, true);
assert.equal(semicolon.report.totalCarat, 0.958);
assert.equal(semicolon.report.stones[1].size, "1.30 mm");
assert.equal(semicolon.specs.stoneType, "Sapphire & Diamond");

// One line per gem with width and length columns: identical stones merge.
const perGem = parse("Name,Cut,Width,Length,Weight\nDiamond,Round,1.3,1.3,0.009\nDiamond,Round,1.3,1.3,0.009\nDiamond,Oval,5,7,0.75\n");
assert.deepEqual(perGem.report.stones.map((stone) => [stone.shape, stone.size, stone.quantity, stone.caratTotal]), [
  ["Oval", "7 × 5 mm", 1, 0.75],
  ["Round", "1.3 mm", 2, 0.018]
]);
assert.equal(perGem.needsCaratMode, false, "Single stones need no carat reading");

// Thai headers, with the metal weight column kept out of the carats.
const thai = parse("ชนิดพลอย,รูปทรง,ขนาด (มม.),จำนวน (เม็ด),น้ำหนัก (กะรัต),น้ำหนักทอง (กรัม)\nเพชร,กลม,1.3,20,0.18,3.2\nรวม,,20,0.18,\n");
assert.equal(thai.columns.carat, "น้ำหนัก (กะรัต)");
assert.equal(thai.skippedRows, 1);
assert.deepEqual(thai.report.stones, [
  { stone: "เพชร", shape: "กลม", size: "1.3 mm", quantity: 20, caratEach: 0.009, caratTotal: 0.18 }
]);

// Quoted cells and a byte order mark.
const quoted = parse("﻿\"Stone\",\"Shape\",\"Qty\",\"Total Carat\"\n\"Diamond, lab grown\",\"Round\",\"3\",\"0.30\"\n");
assert.equal(quoted.report.stones[0].stone, "Diamond, lab grown");
assert.equal(quoted.report.stones[0].caratEach, 0.1);

const garbage = parse("hello,world\n1,2\n");
assert.equal(garbage.ok, false);
assert.match(garbage.error, /header row/);

// Encodings: Excel "Unicode text" and a Thai Windows (TIS-620) export.
const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("Stone\tQty\tCarat\r\nRuby\t1\t0.5\r\n", "utf16le")]);
assert.deepEqual(plain(parser.parseGemReportCsv(parser.decodeGemReportBytes(utf16)).report.stones), [
  { stone: "Ruby", shape: "", size: "", quantity: 1, caratEach: 0.5, caratTotal: 0.5 }
]);
const tis620 = new Uint8Array([...Buffer.from("Stone,Carat\n"), 0xe0, 0xbe, 0xaa, 0xc3, ...Buffer.from(",0.5\n")]);
assert.match(parser.decodeGemReportBytes(tis620), /เพชร/);

assert.equal(parser.formatCarat(0.5), "0.50");
assert.equal(parser.formatCarat(0.966), "0.966");
assert.equal(parser.formatCarat(0.0035), "0.0035");
assert.equal(parser.formatCarat(0.966), formatGemCarat(0.966), "Admin and product page format carats alike");
assert.equal(parser.formatCarat(0.0035), formatGemCarat(0.0035));

// The server trusts none of the request: text is capped, bad numbers dropped,
// empty lines removed and the totals summed again.
const normalized = normalizeGemReport({
  stones: [
    { stone: " Diamond ", shape: "Round", size: "1.3 mm", quantity: 24, caratEach: 0.008 },
    { stone: "<b>x</b>".repeat(20), quantity: -3, caratTotal: "nope" },
    { quantity: 5 },
    "not a stone"
  ],
  totalQuantity: 999,
  totalCarat: 999,
  fileName: "gem report.csv",
  importedAt: "2026-09-29T00:00:00.000Z"
});
assert.equal(normalized.stones.length, 2);
assert.deepEqual(normalized.stones[0], {
  stone: "Diamond",
  shape: "Round",
  size: "1.3 mm",
  quantity: 24,
  caratEach: 0.008,
  caratTotal: 0.192
});
assert.equal(normalized.stones[1].stone.length, 80);
assert.equal(normalized.stones[1].quantity, 1);
assert.equal(normalized.stones[1].caratTotal, null);
assert.equal(normalized.totalQuantity, 25);
assert.equal(normalized.totalCarat, 0.192);
assert.equal(normalizeGemReport({ stones: [] }), null);
assert.equal(normalizeGemReport("csv text"), null);
assert.deepEqual(Object.keys(toPublicGemReport(normalized)), ["stones", "totalQuantity", "totalCarat"]);

// Writes: a new product stores the report with an import time; an edit that
// sends null clears it and one that leaves it out does not touch it.
const env = { SUPABASE_URL: "https://maris-test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-role-secret" };

function createWriteClient() {
  const writes = [];
  const respond = (payload) => ({
    select: () => ({ single: async () => ({ data: { id: "product-1", sku: "SR 0100", name: "Ring", ...payload }, error: null }) })
  });

  return {
    writes,
    from() {
      return {
        insert(payload) {
          writes.push(["insert", payload]);
          return respond(payload);
        },
        update(payload) {
          writes.push(["update", payload]);
          return { eq: () => respond(payload) };
        }
      };
    }
  };
}

const createClient = createWriteClient();
const created = await createAdminProduct({
  sku: "SR 0100",
  name: "Ring",
  category: "Rings",
  status: "Ready",
  gemReport: matrix.report
}, { env, client: createClient });
const insertedReport = createClient.writes[0][1].gem_report;
assert.equal(insertedReport.totalCarat, 0.966);
assert.equal(insertedReport.fileName, "gem report.csv");
assert.ok(Date.parse(insertedReport.importedAt), "The server stamps when the report was imported");
assert.equal(created.gemReport.totalQuantity, 25, "The admin reads the saved report back");

const plainCreateClient = createWriteClient();
await createAdminProduct({ sku: "SR 0101", name: "Ring", category: "Rings", status: "Ready" }, { env, client: plainCreateClient });
assert.equal("gem_report" in plainCreateClient.writes[0][1], false);

const clearClient = createWriteClient();
await updateAdminProduct("product-1", { gemReport: null }, { env, client: clearClient });
assert.deepEqual(clearClient.writes[0][1], { gem_report: null });

const untouchedClient = createWriteClient();
await updateAdminProduct("product-1", { name: "Ring" }, { env, client: untouchedClient });
assert.equal("gem_report" in untouchedClient.writes[0][1], false);

// The product page reads the report; the public copy leaves the file name out.
const selects = [];
const detailClient = {
  from() {
    return {
      select(columns) {
        selects.push(columns);
        return {
          eq(column) {
            if (column === "status") return this;
            return {
              limit: () => ({
                maybeSingle: async () => ({
                  data: { id: "product-1", sku: "SR 0100", slug: "sr-0100", name: "Ring", gem_report: insertedReport },
                  error: null
                })
              })
            };
          }
        };
      }
    };
  }
};
const detail = await readPublicProductBySlug("sr-0100", { env, client: detailClient });
assert.match(selects[0], /gem_report/);
assert.equal(detail.product.gemReport.totalCarat, 0.966);
assert.equal("fileName" in detail.product.gemReport, false);

// Wiring: the add form and the edit modal both carry the CSV control.
assert.match(adminHtml, /admin-gem-report-parser\.js/, "The admin page should load the gem report parser");
assert.match(adminHtml, /data-gem-report-file/, "The add product form should have a gem report file input");
assert.match(adminHtml, /data-gem-report-preview/);
assert.match(adminJs, /gemReport: productFormGemReport\?\.getPayload\(\)/, "Add Product should send the imported report");
assert.match(adminJs, /gemReport: modalGemReport\.getPayload\(\)/, "Save Changes should send an imported or removed report");
assert.match(adminJs, /id="modal-field-gem-report"/);
assert.match(productPage, /data-product-gem-report/, "The product page should list the stones");

console.log("Admin gem report contract passed.");
