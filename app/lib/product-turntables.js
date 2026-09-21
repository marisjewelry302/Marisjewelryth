// Which pieces have a rendered turntable, and how its frames are named.
//
// A turntable is a ring of stills photographed - or in our case rendered - at
// even steps around the piece, played back under the pointer so it turns. It
// gives up free orbit and free zoom, and in exchange it is exactly as good as
// the renderer that made it. For a stone-led catalogue that trade is worth
// considering: no browser is going to path-trace a brilliant cut, and Maverick
// already does.
//
// This table is the same idea as PRODUCT_MODELS in ./product-3d-models.js - a
// piece that is not listed simply has no turntable, and the gallery falls back
// to the realtime model, and then to photography.

const TURNTABLE_BASE = "/assets/turntable";

// SKU -> what was rendered. `frames` is how many stills go all the way round,
// so 36 is a ten degree step. `format` and `pad` describe the filenames:
// pad 4 and format "webp" means 0001.webp through 0036.webp.
const PRODUCT_TURNTABLES = {
  // "SR 0084": { frames: 36, format: "webp", pad: 4 }
};

export function normalizeProductCode(productCode) {
  return String(productCode || "").trim().toUpperCase().replace(/\s+/g, " ");
}

export function turntableFolder(productCode) {
  return normalizeProductCode(productCode).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Resolve the turntable for a product code, or null when it has none.
 * Returns a plain object so a server component can hand it to the client.
 */
export function resolveProductTurntable(productCode) {
  const normalized = normalizeProductCode(productCode);
  const entry = PRODUCT_TURNTABLES[normalized];

  if (!entry) {
    return null;
  }

  const folder = entry.folder || turntableFolder(normalized);
  const pad = entry.pad ?? 4;
  const format = entry.format || "webp";
  const frames = [];

  for (let i = 1; i <= entry.frames; i += 1) {
    frames.push(`${TURNTABLE_BASE}/${folder}/${String(i).padStart(pad, "0")}.${format}`);
  }

  return {
    frames,
    // Which way the piece turns as the pointer moves right. Whichever way the
    // render went round, one of these two reads as "I am pushing it".
    reverse: entry.reverse === true,
    // Enough frames to spin on immediately, fetched before the rest. A shopper
    // who grabs it at once gets a coarse turn that fills in behind them rather
    // than a spinner.
    previewStride: entry.previewStride ?? 6,
    label: entry.label || `${normalized} turntable`
  };
}

export { PRODUCT_TURNTABLES, TURNTABLE_BASE };
