import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/smakj/OneDrive/เดสก์ท็อป/my-portfolio/maris-jewelry/outputs/google-sheet-template-20260515";
const outputPath = path.join(outputDir, "maris-google-sheet-template.xlsx");

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const feedSheet = workbook.worksheets.add("Catalogue Feed");
const guideSheet = workbook.worksheets.add("Guide");

feedSheet.showGridLines = true;
guideSheet.showGridLines = false;

feedSheet.mergeCells("A1:Q1");
feedSheet.getRange("A1:Q1").values = [["Maris Google Sheet Catalogue Template"]];
feedSheet.getRange("A1:Q1").format = {
  fill: "#00493A",
  font: { bold: true, color: "#FFFFFF", size: 14 }
};
feedSheet.getRange("A1:Q1").format.rowHeightPx = 34;

const headers = [[
  "ID",
  "Collection",
  "Type",
  "Center",
  "Malee",
  "Gold Weight",
  "code",
  "name",
  "image_url",
  "top_image_url",
  "front_image_url",
  "side_image_url",
  "yellow_gold_image_url",
  "rose_gold_image_url",
  "price",
  "description",
  "details"
]];

feedSheet.getRange("A2:Q2").values = headers;
feedSheet.getRange("A2:Q2").format = {
  fill: "#F3E3CF",
  font: { bold: true, color: "#102923" }
};
feedSheet.getRange("A2:Q2").format.rowHeightPx = 28;

const sampleRows = [
  ["SR 0033", "Infinite Hold", "WS", "Rd 1.00 ct.", "rd 42 pcs / 0.61 ct", "14kt 3.47 g", "WSSR0033", "The Infinite Hold Collection", "", "", "", "", "", "", "Price on request"],
  ["SR 0033ER", "Infinite Hold", "ER", "Rd 1.00 ct.", "rd 22 pcs / 0.31 ct", "14kt 2.02 g", "ERSR0033ER", "The Infinite Hold Collection", "", "", "", "", "", "", "Price on request"],
  ["SR 0033WB", "Infinite Hold", "WB", "", "rd 20 pcs / 0.30 ct", "14kt 1.45 g", "WBSR0033WB", "The Infinite Hold Collection", "", "", "", "", "", "", "Price on request"]
];

feedSheet.getRange("A3:O5").values = sampleRows;
feedSheet.getRange("P3").formulas = [[
  '=IF(A3="","", "SKU "&A3&". from the "&B3&" collection. Type "&C3&IFERROR(" ("&VLOOKUP(C3,$A$9:$B$14,2,FALSE)&")","")&IF(D3<>"",". center stone "&D3,"")&IF(E3<>"",". Malee "&E3,"")&IF(F3<>"",". gold weight "&F3,""))'
]];
feedSheet.getRange("P3:P120").fillDown();
feedSheet.getRange("Q3").formulas = [[
  '=IF(A3="","",TEXTJOIN(CHAR(10),TRUE,IF(D3<>"",D3,""),IF(E3<>"","Malee "&E3,""),IF(F3<>"",F3,"")))'
]];
feedSheet.getRange("Q3:Q120").fillDown();

feedSheet.getRange("P3:Q120").format.wrapText = true;
feedSheet.getRange("A3:Q120").format = {
  font: { color: "#102923", size: 11 }
};

const columnWidths = {
  A: 100,
  B: 130,
  C: 72,
  D: 122,
  E: 148,
  F: 116,
  G: 90,
  H: 190,
  I: 180,
  J: 148,
  K: 148,
  L: 148,
  M: 162,
  N: 156,
  O: 108,
  P: 380,
  Q: 240
};

for (const [column, width] of Object.entries(columnWidths)) {
  feedSheet.getRange(`${column}:${column}`).format.columnWidthPx = width;
}

feedSheet.getRange("A3:Q120").format.rowHeightPx = 64;
feedSheet.freezePanes.freezeRows(2);

guideSheet.mergeCells("A1:F1");
guideSheet.getRange("A1:F1").values = [["How To Use This Template"]];
guideSheet.getRange("A1:F1").format = {
  fill: "#00493A",
  font: { bold: true, color: "#FFFFFF", size: 14 }
};
guideSheet.getRange("A1:F1").format.rowHeightPx = 34;

guideSheet.getRange("A3:B7").values = [
  ["Step", "Action"],
  ["1", "Keep columns A-F for product specs: ID, Collection, Type, Center, Malee, Gold Weight"],
  ["2", "Use column G onward for website fields: code, name, image URLs, price, description, details"],
  ["3", "Paste public Google Drive image links into image_url and the angle image columns"],
  ["4", "Publish the Google Sheet to CSV so the website can read it automatically"]
];

guideSheet.getRange("A8:B15").values = [
  ["Reference", "Meaning"],
  ["SR", "Stock Ring"],
  ["SE", "Stock Earring"],
  ["SP", "Stock Pendant"],
  ["WS", "Wedding set / แหวนแต่งงาน"],
  ["ER", "Engagement ring / แหวนหมั้น"],
  ["WB", "Wedding band / แหวนแถว"],
  ["MB", "Men's wedding band / แหวนแต่งงานผู้ชาย"]
];

guideSheet.getRange("D3:E12").values = [
  ["Column", "Use"],
  ["image_url", "White gold or main view"],
  ["top_image_url", "Top view image"],
  ["front_image_url", "Front view image"],
  ["side_image_url", "Side view image"],
  ["yellow_gold_image_url", "Yellow gold variation"],
  ["rose_gold_image_url", "Rose gold variation"],
  ["description", "Auto formula is included, but you can overwrite it"],
  ["details", "Auto formula is included, but you can overwrite it"],
  ["code", "Website product code such as WSSR0033, ERSR0033ER, WBSR0033WB"]
];

guideSheet.getRange("A3:B15").format = {
  font: { color: "#102923", size: 11 }
};
guideSheet.getRange("D3:E12").format = {
  font: { color: "#102923", size: 11 }
};
guideSheet.getRange("A3:B3").format = {
  fill: "#F3E3CF",
  font: { bold: true, color: "#102923" }
};
guideSheet.getRange("A8:B8").format = {
  fill: "#F3E3CF",
  font: { bold: true, color: "#102923" }
};
guideSheet.getRange("D3:E3").format = {
  fill: "#F3E3CF",
  font: { bold: true, color: "#102923" }
};

guideSheet.getRange("A3:E15").format.wrapText = true;
guideSheet.getRange("A:A").format.columnWidthPx = 84;
guideSheet.getRange("B:B").format.columnWidthPx = 440;
guideSheet.getRange("C:C").format.columnWidthPx = 64;
guideSheet.getRange("D:D").format.columnWidthPx = 150;
guideSheet.getRange("E:E").format.columnWidthPx = 330;
guideSheet.getRange("F:F").format.columnWidthPx = 40;
guideSheet.getRange("A3:E15").format.rowHeightPx = 34;

const feedInspect = await workbook.inspect({
  kind: "table",
  range: "Catalogue Feed!A1:Q8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 17
});

const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 20 },
  summary: "formula error scan"
});

const feedPreview = await workbook.render({ sheetName: "Catalogue Feed", range: "A1:Q8", scale: 1.5, format: "png" });
await fs.writeFile(path.join(outputDir, "catalogue-feed-preview.png"), new Uint8Array(await feedPreview.arrayBuffer()));

const guidePreview = await workbook.render({ sheetName: "Guide", range: "A1:F15", scale: 1.5, format: "png" });
await fs.writeFile(path.join(outputDir, "guide-preview.png"), new Uint8Array(await guidePreview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

console.log(JSON.stringify({
  outputPath,
  inspectChars: feedInspect.ndjson.length,
  formulaErrors: formulaErrors.ndjson
}, null, 2));
