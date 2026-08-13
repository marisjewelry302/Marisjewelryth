// Value coercions used by more than one domain module.


export function parseMoneyAmount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value).replace(/,/g, "").trim();
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : null;
}

export function cleanOptionalText(value) {
  const text = String(value || "").trim();
  return text || null;
}

export function getMetadata(row) {
  const metadata = row?.metadata;

  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}
