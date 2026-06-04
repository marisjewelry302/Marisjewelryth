import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_GOOGLE_SHEET_SOURCE_URL,
  checkSheetImages,
  formatSheetImageReport,
  resolveGoogleSheetCsvUrl
} from "./lib/sheet-image-checker.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readStorefrontSheetUrl() {
  try {
    const productDataJs = await readFile(path.join(projectRoot, "assets", "js", "product-data.js"), "utf8");
    const match = productDataJs.match(/googleSheetSourceUrl\s*=\s*"([^"]+)"/);
    return match?.[1] || DEFAULT_GOOGLE_SHEET_SOURCE_URL;
  } catch {
    return DEFAULT_GOOGLE_SHEET_SOURCE_URL;
  }
}

async function main() {
  const sourceUrl = process.env.MARIS_GOOGLE_SHEET_URL || process.env.MARIS_SHEET_IMAGE_CHECK_URL || await readStorefrontSheetUrl();
  const sheetUrl = resolveGoogleSheetCsvUrl(sourceUrl);
  const timeoutMs = Number(process.env.MARIS_SHEET_IMAGE_CHECK_TIMEOUT_MS || 10000);

  if (!sheetUrl) {
    throw new Error("No Google Sheet CSV URL is configured.");
  }

  const response = await fetch(sheetUrl, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Google Sheet CSV request failed with HTTP ${response.status}: ${sheetUrl}`);
  }

  const csvText = await response.text();
  const report = await checkSheetImages({
    csvText,
    projectRoot,
    timeoutMs
  });

  console.log(formatSheetImageReport(report));

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Maris Google Sheet image check failed before it could inspect the rows.");
  console.error(error?.message || error);
  process.exitCode = 1;
});
