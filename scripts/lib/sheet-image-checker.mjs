import { readdir } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_GOOGLE_SHEET_SOURCE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQfntxK3qZhO4cfHkqlFtpY5kP7M3xLLzTkjkH6kTPkfJNdl5rgmGDozfyM3OTMBzo9WS0aXbF4U8Xr/pub?output=csv";

const DEPLOY_EXCLUDED_PREFIXES = [
  "assets/images/home/archive/"
];

const PRODUCT_COLUMNS = [
  { key: "code", aliases: ["web_code", "site_code", "product_code", "website_code", "sku"] },
  { key: "name", aliases: ["product_name", "display_name"] },
  { key: "id", aliases: ["sku", "stock_id"] },
  { key: "collection", aliases: ["category", "page_category"] },
  { key: "type", aliases: ["product_type"] }
];

const IMAGE_COLUMNS = [
  {
    key: "image_url",
    required: true,
    aliases: ["image", "main_image", "main_image_url", "cover_image", "cover_image_url", "white_gold", "white_gold_image", "white_gold_image_url", "white_gold_url", "white_gold_view", "white_gold_view_image"]
  },
  { key: "top_image_url", aliases: ["top", "top_image", "top_url", "top_view", "top_view_image"] },
  { key: "front_image_url", aliases: ["front", "front_image", "front_url", "front_view", "front_view_image"] },
  { key: "side_image_url", aliases: ["side", "side_image", "side_url", "side_view", "side_view_image"] },
  { key: "yellow_gold_image_url", aliases: ["yellow_gold", "yellow_gold_image", "yellow_gold_url", "yellow_gold_view", "yellow_gold_view_image"] },
  { key: "rose_gold_image_url", aliases: ["rose_gold", "rose_gold_image", "rose_gold_url", "rose_gold_view", "rose_gold_view_image"] },
  { key: "hover_image_url", aliases: ["hover", "hover_image"] },
  { key: "gallery", aliases: ["gallery_images", "gallery_urls", "gallery_image_urls"] }
];

const ALL_COLUMNS = [...PRODUCT_COLUMNS, ...IMAGE_COLUMNS];
const IMAGE_KEYS = new Set(IMAGE_COLUMNS.map((column) => column.key));

function normalizeString(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSheetKey(value) {
  return slugify(value).replace(/-/g, "_");
}

function getColumnAliases(column) {
  return Array.from(new Set([column.key, ...(column.aliases || [])].map(normalizeSheetKey).filter(Boolean)));
}

function buildColumnLookup() {
  const lookup = new Map();

  ALL_COLUMNS.forEach((column) => {
    getColumnAliases(column).forEach((alias) => {
      if (!lookup.has(alias)) {
        lookup.set(alias, column.key);
      }
    });
  });

  return lookup;
}

const columnLookup = buildColumnLookup();

function resolveColumnKey(header) {
  const normalizedHeader = normalizeSheetKey(header);
  return columnLookup.get(normalizedHeader) || normalizedHeader;
}

function isSpreadsheetErrorValue(value) {
  return /^#(?:name\?|n\/a|na|value!|ref!|div\/0!|num!|error!|null!)$/i.test(normalizeString(value));
}

function sanitizeCell(value) {
  const input = normalizeString(value);
  return isSpreadsheetErrorValue(input) ? "" : input;
}

function firstNonEmpty(record, keys) {
  const matchedKey = keys.find((key) => normalizeString(record[key]));
  return matchedKey ? normalizeString(record[matchedKey]) : "";
}

function toPosix(value) {
  return String(value || "").replace(/\\/g, "/");
}

function stripQueryAndHash(value) {
  return String(value || "").replace(/[?#].*$/, "");
}

function safeDecodeUri(value) {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

function getHeaderMeta(headers) {
  return headers.map((header, index) => {
    const normalizedHeader = normalizeSheetKey(header);
    const key = resolveColumnKey(header);
    const columnLetter = getColumnLetter(index + 1);

    return {
      index,
      columnLetter,
      columnNumber: index + 1,
      header: normalizeString(header),
      normalizedHeader,
      key,
      isImageColumn: IMAGE_KEYS.has(key) || /^(.+_)?image(_.+)?$/.test(normalizedHeader) || normalizedHeader.includes("_image_") || normalizedHeader.includes("gallery")
    };
  });
}

function getColumnLetter(columnNumber) {
  let value = columnNumber;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

function isImageFile(value) {
  return /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(stripQueryAndHash(value));
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(normalizeString(value));
}

function hasUrlScheme(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(normalizeString(value));
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function findHeaderRow(rows) {
  const interestingHeaders = new Set(["code", "name", ...IMAGE_KEYS]);

  return rows.findIndex((row) => {
    const normalized = row.map(resolveColumnKey);
    return normalized.some((cell) => interestingHeaders.has(cell));
  });
}

function rowToRecord(headers, row) {
  return headers.reduce((record, header, index) => {
    const normalizedHeader = normalizeSheetKey(header);
    const resolvedKey = resolveColumnKey(header);
    const value = sanitizeCell(row[index]);

    if (!resolvedKey) {
      return record;
    }

    if (!normalizeString(record[resolvedKey])) {
      record[resolvedKey] = value;
    }

    if (normalizedHeader && normalizedHeader !== resolvedKey && !normalizeString(record[normalizedHeader])) {
      record[normalizedHeader] = value;
    }

    return record;
  }, {});
}

function extractGoogleDriveId(url) {
  const input = normalizeString(url);
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/uc\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/i,
    /[?&]id=([a-zA-Z0-9_-]+)/i
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

export function normalizeRemoteImageUrl(value) {
  const input = normalizeString(value);

  if (!input) {
    return "";
  }

  if (/^https?:\/\/drive\.google\.com/i.test(input)) {
    const driveId = extractGoogleDriveId(input);
    return driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600` : input;
  }

  return input;
}

export function resolveGoogleSheetCsvUrl(sourceUrl) {
  const input = normalizeString(sourceUrl);

  if (!input) {
    return "";
  }

  try {
    const url = new URL(input);

    if (url.hostname !== "docs.google.com") {
      return input;
    }

    if (url.pathname.includes("/pub") && url.searchParams.get("output") === "csv") {
      return url.toString();
    }

    const sheetMatch = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);

    if (!sheetMatch?.[1]) {
      return input;
    }

    const gid = url.searchParams.get("gid") || url.hash.replace(/^#gid=/i, "") || "0";
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=csv&gid=${gid}`;
  } catch {
    return input;
  }
}

function getRowIdentity(record, rowNumber) {
  return {
    code: firstNonEmpty(record, ["code", "web_code", "site_code", "product_code", "sku", "id"]) || `row-${rowNumber}`,
    name: firstNonEmpty(record, ["name", "product_name", "display_name", "collection"]) || ""
  };
}

function splitImageCell(value) {
  const input = sanitizeCell(value);

  if (!input) {
    return [];
  }

  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractGalleryValue(line) {
  const segments = line.split("|").map((segment) => segment.trim()).filter(Boolean);

  if (segments.length >= 2) {
    return segments[1];
  }

  return segments[0] || "";
}

function buildImageReferences(headers, rows, headerRowIndex) {
  const headerMeta = getHeaderMeta(headers);
  const imageMeta = headerMeta.filter((meta) => meta.isImageColumn);
  const hasMainImageColumn = imageMeta.some((meta) => meta.key === "image_url");
  const references = [];
  const issues = [];

  rows.forEach((row, rowOffset) => {
    const rowNumber = headerRowIndex + rowOffset + 2;
    const record = rowToRecord(headers, row);
    const hasProductData = Object.values(record).some((value) => normalizeString(value));

    if (!hasProductData) {
      return;
    }

    const identity = getRowIdentity(record, rowNumber);

    if (!hasMainImageColumn) {
      issues.push({
        type: "missing-required-image-column",
        severity: "error",
        rowNumber,
        ...identity,
        column: "image_url",
        message: "Sheet is missing an image_url-compatible column."
      });
    } else if (!firstNonEmpty(record, ["image_url", "image", "main_image", "main_image_url", "cover_image", "cover_image_url", "white_gold", "white_gold_image", "white_gold_image_url"])) {
      issues.push({
        type: "missing-required-image",
        severity: "error",
        rowNumber,
        ...identity,
        column: "image_url",
        message: "Product row has no main image value."
      });
    }

    imageMeta.forEach((meta) => {
      const rawValue = row[meta.index];
      const lines = splitImageCell(rawValue);

      lines.forEach((line, lineIndex) => {
        const value = meta.key === "gallery" ? extractGalleryValue(line) : line;

        if (!value) {
          return;
        }

        references.push({
          rowNumber,
          ...identity,
          column: `${meta.header || meta.key} (${meta.columnLetter})`,
          columnKey: meta.key,
          value,
          lineIndex: lineIndex + 1
        });
      });
    });
  });

  return { references, issues };
}

async function walkFiles(root) {
  const files = [];

  async function walk(current) {
    let entries = [];

    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const filePath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(filePath);
      } else if (entry.isFile()) {
        files.push(filePath);
      }
    }
  }

  await walk(root);
  return files;
}

function pushMapList(map, key, value) {
  const values = map.get(key) || [];
  values.push(value);
  map.set(key, values);
}

async function buildLocalImageIndex(projectRoot, excludedPrefixes = DEPLOY_EXCLUDED_PREFIXES) {
  const imageRoot = path.join(projectRoot, "assets");
  const files = await walkFiles(imageRoot);
  const index = {
    byRelativePath: new Map(),
    byRelativePathLower: new Map(),
    byBasename: new Map(),
    byBasenameLower: new Map(),
    byStemLower: new Map(),
    excludedPrefixes
  };

  files.forEach((filePath) => {
    const relativePath = toPosix(path.relative(projectRoot, filePath));

    if (!isImageFile(relativePath)) {
      return;
    }

    if (excludedPrefixes.some((prefix) => relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix))) {
      return;
    }

    const basename = path.posix.basename(relativePath);
    const stem = basename.replace(/\.[^.]+$/, "").toLowerCase();

    index.byRelativePath.set(relativePath, relativePath);
    index.byRelativePathLower.set(relativePath.toLowerCase(), relativePath);
    pushMapList(index.byBasename, basename, relativePath);
    pushMapList(index.byBasenameLower, basename.toLowerCase(), relativePath);
    pushMapList(index.byStemLower, stem, relativePath);
  });

  return index;
}

function normalizeLocalReference(value) {
  const withoutQuery = stripQueryAndHash(normalizeString(value));
  let normalized = safeDecodeUri(toPosix(withoutQuery));

  normalized = normalized.replace(/^\/+/, "");

  while (normalized.startsWith("../")) {
    normalized = normalized.slice(3);
  }

  while (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }

  if (normalized.startsWith("public/")) {
    normalized = normalized.slice("public/".length);
  }

  return normalized;
}

function issueFromReference(reference, type, message, extra = {}) {
  return {
    type,
    severity: "error",
    rowNumber: reference.rowNumber,
    code: reference.code,
    name: reference.name,
    column: reference.column,
    value: reference.value,
    message,
    ...extra
  };
}

function checkLocalReference(reference, assetIndex) {
  const localPath = normalizeLocalReference(reference.value);
  const basename = path.posix.basename(localPath);
  const basenameLower = basename.toLowerCase();
  const stemLower = basename.replace(/\.[^.]+$/, "").toLowerCase();

  if (!isImageFile(localPath)) {
    return issueFromReference(reference, "unsupported-local-image", "Image column value is not a supported local image path or public http(s) image URL.", {
      resolvedPath: localPath
    });
  }

  if (localPath.includes("/")) {
    if (assetIndex.byRelativePath.has(localPath)) {
      return null;
    }

    const caseMatch = assetIndex.byRelativePathLower.get(localPath.toLowerCase());

    if (caseMatch) {
      return issueFromReference(reference, "case-mismatch", "Local image path exists but the letter case does not match the real file path.", {
        resolvedPath: localPath,
        suggestion: caseMatch
      });
    }
  }

  const exactBasenameMatches = assetIndex.byBasename.get(basename) || [];

  if (!localPath.includes("/") && exactBasenameMatches.length === 1) {
    return null;
  }

  if (!localPath.includes("/") && exactBasenameMatches.length > 1) {
    return issueFromReference(reference, "ambiguous-local-file", "Filename matches more than one deployed local image. Use the full assets/... path.", {
      candidates: exactBasenameMatches.slice(0, 5)
    });
  }

  const caseBasenameMatches = assetIndex.byBasenameLower.get(basenameLower) || [];

  if (!localPath.includes("/") && caseBasenameMatches.length === 1) {
    return issueFromReference(reference, "case-mismatch", "Local image filename exists but the letter case does not match the real file.", {
      resolvedPath: localPath,
      suggestion: caseBasenameMatches[0]
    });
  }

  const stemMatches = assetIndex.byStemLower.get(stemLower) || [];

  if (stemMatches.length) {
    return issueFromReference(reference, "name-mismatch", "No exact local image match, but a similar filename exists.", {
      resolvedPath: localPath,
      candidates: stemMatches.slice(0, 5)
    });
  }

  return issueFromReference(reference, "missing-local-file", "Local image file was not found in deployed assets.", {
    resolvedPath: localPath
  });
}

function getHeader(response, name) {
  if (!response?.headers) {
    return "";
  }

  if (typeof response.headers.get === "function") {
    return response.headers.get(name) || "";
  }

  if (response.headers instanceof Map) {
    return response.headers.get(name) || "";
  }

  return response.headers[name] || response.headers[name.toLowerCase()] || "";
}

async function fetchWithTimeout(fetchFn, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchFn(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkRemoteReference(reference, fetchFn, timeoutMs) {
  const remoteUrl = normalizeRemoteImageUrl(reference.value);
  let response;
  let networkError = null;

  try {
    response = await fetchWithTimeout(fetchFn, remoteUrl, { method: "HEAD", redirect: "follow" }, timeoutMs);
  } catch (error) {
    networkError = error;
  }

  if (!response || [403, 405].includes(response.status) || networkError) {
    try {
      response = await fetchWithTimeout(fetchFn, remoteUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          Range: "bytes=0-0"
        }
      }, timeoutMs);
      networkError = null;
    } catch (error) {
      networkError = error;
    }
  }

  if (networkError) {
    return issueFromReference(reference, "url-unreachable", `Image URL could not be reached: ${networkError.message || networkError.name || "request failed"}.`, {
      url: remoteUrl
    });
  }

  if (!response?.ok) {
    return issueFromReference(reference, "url-unreachable", `Image URL returned HTTP ${response?.status || "unknown"}.`, {
      url: remoteUrl,
      status: response?.status || 0
    });
  }

  const contentType = getHeader(response, "content-type").toLowerCase();

  if (contentType && !contentType.startsWith("image/") && contentType !== "application/octet-stream") {
    return issueFromReference(reference, "url-not-image", `Image URL responded with non-image content type ${contentType}.`, {
      url: remoteUrl,
      status: response.status,
      contentType
    });
  }

  return null;
}

function classifyReference(reference) {
  const value = normalizeString(reference.value);

  if (!value) {
    return "empty";
  }

  if (isHttpUrl(value)) {
    return "remote";
  }

  if (hasUrlScheme(value)) {
    return "unsupported-url";
  }

  return "local";
}

export async function checkSheetImages(options = {}) {
  const {
    csvText = "",
    projectRoot = process.cwd(),
    fetchFn = globalThis.fetch,
    timeoutMs = 10000
  } = options;

  if (!csvText) {
    return {
      ok: false,
      summary: {
        rowsChecked: 0,
        imageReferencesChecked: 0,
        localImagesChecked: 0,
        remoteImagesChecked: 0,
        issueCount: 1
      },
      issues: [{
        type: "missing-csv",
        severity: "error",
        message: "No CSV text was provided."
      }],
      references: []
    };
  }

  const rows = parseCsv(csvText);
  const headerRowIndex = findHeaderRow(rows);

  if (headerRowIndex < 0) {
    return {
      ok: false,
      summary: {
        rowsChecked: 0,
        imageReferencesChecked: 0,
        localImagesChecked: 0,
        remoteImagesChecked: 0,
        issueCount: 1
      },
      issues: [{
        type: "missing-header-row",
        severity: "error",
        message: "Could not find a Sheet header row with product or image columns."
      }],
      references: []
    };
  }

  const headers = rows[headerRowIndex];
  const dataRows = rows.slice(headerRowIndex + 1);
  const { references, issues } = buildImageReferences(headers, dataRows, headerRowIndex);
  const assetIndex = await buildLocalImageIndex(projectRoot);
  const summary = {
    rowsChecked: dataRows.filter((row) => row.some((cell) => normalizeString(cell))).length,
    imageReferencesChecked: references.length,
    localImagesChecked: 0,
    remoteImagesChecked: 0,
    issueCount: 0
  };

  for (const reference of references) {
    const classification = classifyReference(reference);
    let issue = null;

    if (classification === "remote") {
      summary.remoteImagesChecked += 1;
      issue = await checkRemoteReference(reference, fetchFn, timeoutMs);
    } else if (classification === "local") {
      summary.localImagesChecked += 1;
      issue = checkLocalReference(reference, assetIndex);
    } else if (classification === "unsupported-url") {
      issue = issueFromReference(reference, "unsupported-url-scheme", "Only http(s) image URLs or deployed local files are supported.");
    }

    if (issue) {
      issues.push(issue);
    }
  }

  summary.issueCount = issues.length;

  return {
    ok: issues.length === 0,
    summary,
    issues,
    references
  };
}

export function formatSheetImageReport(report) {
  const lines = [
    "Maris Google Sheet image check",
    `Rows checked: ${report.summary.rowsChecked}`,
    `Image references checked: ${report.summary.imageReferencesChecked}`,
    `Local files checked: ${report.summary.localImagesChecked}`,
    `Remote URLs checked: ${report.summary.remoteImagesChecked}`
  ];

  if (report.ok) {
    lines.push("Result: OK - every Sheet image reference resolved.");
    return lines.join("\n");
  }

  lines.push(`Result: BLOCKED - ${report.summary.issueCount} image issue(s) found.`);
  lines.push("");

  report.issues.forEach((issue, index) => {
    const product = [issue.code, issue.name].filter(Boolean).join(" / ") || "unknown product";
    lines.push(`${index + 1}. Row ${issue.rowNumber || "-"} ${product}`);
    lines.push(`   Column: ${issue.column || "-"}`);
    lines.push(`   Value: ${issue.value || "-"}`);
    lines.push(`   Problem: ${issue.message}`);

    if (issue.suggestion) {
      lines.push(`   Suggested path: ${issue.suggestion}`);
    }

    if (issue.candidates?.length) {
      lines.push(`   Similar files: ${issue.candidates.join(", ")}`);
    }

    if (issue.url) {
      lines.push(`   Checked URL: ${issue.url}`);
    }
  });

  return lines.join("\n");
}
