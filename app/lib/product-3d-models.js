// Which pieces have a 3D model, and how the viewer should present them.
//
// The Cartier product page answers this question before it renders anything:
// its 3D slide is an iframe onto a router page that looks the SKU up in a
// product list, and posts SKU_NOT_AVAILABLE back to the page when the piece has
// no model, so the gallery quietly falls back to photography. This table is
// that list, and `resolveProductModel` is that router.

const PRODUCT_MODEL_BASE = "/assets/models/products";

// A placeholder while no product model is committed yet. Cartier keeps the same
// escape hatch - `?dev=TRUE` on the widget URL routes to a CartierJewelry_DEV
// build - so the viewer can be judged before the catalogue models exist. It
// never resolves in a production build.
const PREVIEW_PLACEHOLDER = {
  url: "/assets/models/products/sr-0084.glb",
  label: "SR 0084 (stand-in)",
  exposure: 1,
  envRotation: 0,
  isPreviewPlaceholder: true
};

// Camera stops the viewer can jump to, as spherical offsets from the fitted
// centre of the piece. Cartier ships the same idea as preset.CameraViews.json:
// a handful of angles someone chose on purpose, so a shopper never has to find
// the flattering one by dragging.
const DEFAULT_CAMERA_VIEWS = [
  // Raised, not level. A stone seen edge-on is the one angle at which it reads
  // as grey glass; from above the crown catches the studio and the cut shows.
  // This is also the angle that puts the shank's sweep and the engraving in
  // frame at once.
  { id: "three-quarter", label: "Three-quarter", theta: 0.72, phi: 0.72, distance: 1 },
  { id: "front", label: "Front", theta: 0, phi: 1.42, distance: 0.94 },
  { id: "profile", label: "Profile", theta: Math.PI / 2, phi: 1.4, distance: 0.98 },
  { id: "top", label: "Top", theta: 0.2, phi: 0.32, distance: 1.04 }
];

// SKU -> model. `file` is resolved against PRODUCT_MODEL_BASE; `url` wins when a
// piece is hosted somewhere else. Drop the .glb into assets/models/products/ and
// add its row here - nothing else needs to change.
const PRODUCT_MODELS = {
  // "SR 0015 ER": { file: "sr-0015-er.glb", exposure: 1.1 }
};

export function normalizeProductCode(productCode) {
  return String(productCode || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

// One model usually covers a whole size run, so a SKU that carries a size or a
// finish suffix falls back to its family. Cartier does the crude version of this
// by rewriting the last two digits of a bracelet SKU to "00" before giving up.
function getFamilyCode(normalizedCode) {
  const tokens = normalizedCode.split(" ");

  if (tokens.length < 3) {
    return "";
  }

  return tokens.slice(0, 2).join(" ");
}

/**
 * Resolve the 3D model for a product code, or null when the piece has none.
 * Returns a plain object so a server component can hand it straight to the
 * client viewer.
 */
export function resolveProductModel(productCode, options = {}) {
  const { allowPreviewPlaceholder = process.env.NODE_ENV !== "production" } = options;
  const normalized = normalizeProductCode(productCode);

  if (!normalized) {
    return null;
  }

  const entry = PRODUCT_MODELS[normalized] || PRODUCT_MODELS[getFamilyCode(normalized)];

  if (!entry) {
    return allowPreviewPlaceholder ? { ...PREVIEW_PLACEHOLDER, views: DEFAULT_CAMERA_VIEWS } : null;
  }

  const url = entry.url || `${PRODUCT_MODEL_BASE}/${entry.file}`;

  return {
    url,
    label: entry.label || "3D view",
    // Metal reads as metal or as grey plastic depending on this one number, so
    // it stays per piece rather than baked into the viewer.
    exposure: typeof entry.exposure === "number" ? entry.exposure : 1,
    // Turns the studio around the piece, in radians. Which softbox lands on the
    // shank is a styling decision and differs from one shape to the next.
    envRotation: typeof entry.envRotation === "number" ? entry.envRotation : 0,
    views: entry.views || DEFAULT_CAMERA_VIEWS,
    isPreviewPlaceholder: false
  };
}

export { DEFAULT_CAMERA_VIEWS, PRODUCT_MODEL_BASE };
