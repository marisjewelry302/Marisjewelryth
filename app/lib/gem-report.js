// The gem report of a sample piece: every stone line the admin imported from
// the CAD export. The CSV itself is read in the browser
// (assets/js/admin-gem-report-parser.js); what reaches the database or the
// product page comes through normalizeGemReport, which trusts none of it. Text
// is trimmed and capped, numbers must be finite and positive, and the totals
// are summed again here rather than taken from the request.

const MAX_STONES = 200;
const MAX_TEXT_LENGTH = 80;
const MAX_FILE_NAME_LENGTH = 160;
const MAX_QUANTITY = 100000;
const MAX_CARAT = 10000;

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

function readText(value, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function readCarat(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const carat = Number(value);
  return Number.isFinite(carat) && carat > 0 && carat <= MAX_CARAT ? round4(carat) : null;
}

function readQuantity(value) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 && quantity <= MAX_QUANTITY ? quantity : 1;
}

function readTimestamp(value) {
  const time = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function normalizeStone(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const quantity = readQuantity(value.quantity);
  const caratEach = readCarat(value.caratEach);
  const caratTotal = readCarat(value.caratTotal) ?? (caratEach === null ? null : round4(caratEach * quantity));
  const stone = {
    stone: readText(value.stone),
    shape: readText(value.shape),
    size: readText(value.size),
    quantity,
    caratEach: caratEach ?? (caratTotal === null ? null : round4(caratTotal / quantity)),
    caratTotal
  };

  return stone.stone || stone.shape || stone.size || stone.caratTotal !== null ? stone : null;
}

export function normalizeGemReport(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.stones)) {
    return null;
  }

  const stones = value.stones.slice(0, MAX_STONES).map(normalizeStone).filter(Boolean);

  if (!stones.length) {
    return null;
  }

  const carats = stones.map((stone) => stone.caratTotal).filter((carat) => carat !== null);

  return {
    stones,
    totalQuantity: stones.reduce((sum, stone) => sum + stone.quantity, 0),
    totalCarat: carats.length ? round4(carats.reduce((sum, carat) => sum + carat, 0)) : null,
    fileName: readText(value.fileName, MAX_FILE_NAME_LENGTH),
    importedAt: readTimestamp(value.importedAt)
  };
}

// The product page shows the stones and their totals; which file they came
// from and when is admin bookkeeping.
export function toPublicGemReport(value) {
  const report = normalizeGemReport(value);

  if (!report) {
    return null;
  }

  return {
    stones: report.stones,
    totalQuantity: report.totalQuantity,
    totalCarat: report.totalCarat
  };
}

// Two decimals where that loses nothing, three otherwise, and up to four for
// melee under 0.1 ct. The admin preview formats with the same rule.
export function formatGemCarat(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "";
  }

  const carat = Number(value);

  if (carat < 0.1) {
    return String(Number(carat.toFixed(4)));
  }

  return Number(carat.toFixed(2)) === Number(carat.toFixed(3)) ? carat.toFixed(2) : carat.toFixed(3);
}
