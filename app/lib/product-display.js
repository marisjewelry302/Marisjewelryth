const THAI_TEXT_PATTERN = /[\u0E00-\u0E7F]/;

export function hasThaiText(value) {
  return THAI_TEXT_PATTERN.test(String(value || ""));
}

export function getPublicProductDisplayName(product = {}) {
  const sku = String(product.sku || "").toUpperCase();
  const searchText = [
    product.category,
    product.collection,
    product.slug,
    !hasThaiText(product.name) ? product.name : ""
  ].filter(Boolean).join(" ").toLowerCase();

  if (sku.startsWith("SE") || searchText.includes("earring")) {
    return "Diamond Earrings";
  }

  if (
    sku.startsWith("WB")
    || sku.startsWith("MB")
    || sku.startsWith("MR")
    || sku.startsWith("MWB")
    || searchText.includes("wedding-band")
    || searchText.includes("wedding band")
  ) {
    return "Wedding Band";
  }

  if (sku.startsWith("SR") || searchText.includes("ring")) {
    return "Diamond Ring";
  }

  if (sku.startsWith("SN") || sku.startsWith("SP") || searchText.includes("necklace") || searchText.includes("pendant")) {
    return "Diamond Pendant";
  }

  if (sku.startsWith("SB") || searchText.includes("bracelet")) {
    return "Diamond Bracelet";
  }

  return "Fine Jewelry Piece";
}

// Catalogue codes are entered by hand and most follow "SR 0101 ER", but a few
// arrive unspaced ("SR0033WS"). Normalising for display only keeps a product
// grid from looking untidy without rewriting the stored SKU.
const PRODUCT_CODE_PATTERN = /^([A-Z]{2,3})\s*(\d{3,4})\s*([A-Z]{0,3})$/;

export function formatPublicProductCode(sku) {
  const value = String(sku || "").trim().toUpperCase();
  const match = value.match(PRODUCT_CODE_PATTERN);

  if (!match) {
    return value;
  }

  const [, prefix, digits, suffix] = match;
  return [prefix, digits, suffix].filter(Boolean).join(" ");
}

export function getPublicProductAltText(product = {}) {
  return `${product.sku || "Maris"} ${getPublicProductDisplayName(product)}`;
}

export function getPublicVariantDisplayName(variant = {}) {
  if (variant.variantName && !hasThaiText(variant.variantName)) {
    return variant.variantName;
  }

  const details = [
    variant.material,
    variant.size ? `Size ${variant.size}` : ""
  ].filter(Boolean);

  return details.length ? details.join(", ") : variant.sku || "Selected option";
}

export function getPublicImageAltText(image = {}, productCode, productName, index = 0) {
  if (image.altText && !hasThaiText(image.altText)) {
    return image.altText;
  }

  return `${productCode || "Maris"} ${productName || "Fine Jewelry Piece"} view ${index + 1}`;
}

// A catalogue row that was never filled in arrives as "-" rather than empty, so
// a plain truthy check prints a stray dash where the copy should be. Facet
// building already skipped those values; this keeps the rendered page in step.
const BLANK_TEXT_VALUES = new Set(["-", "--", "---", "–", "—", "n/a", "na", "none", "tbd"]);

export function getMeaningfulText(value) {
  const text = String(value || "").trim();

  return BLANK_TEXT_VALUES.has(text.toLowerCase()) ? "" : text;
}

// Slugs are derived from the SKU when a product is created, but a few legacy
// rows store a shortened form ("sr-0015" for "SR 0015 ER"). The SKU is the one
// value every record carries, so it decides the canonical path and the older
// spellings redirect onto it instead of quietly serving a second URL.
export function toPublicProductSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getPublicProductSlug(product = {}) {
  return toPublicProductSlug(product.sku) || toPublicProductSlug(product.slug);
}

export function getPublicProductPath(product = {}) {
  const slug = getPublicProductSlug(product);

  return slug ? `/product/${slug}` : "/product";
}

// Uploads name each image "<product> <metal> <view>" (the admin reads both from
// the file name), so the alt text is what splits a gallery into metal sets.
export const PRODUCT_IMAGE_METALS = [
  { key: "white-gold", label: "White Gold", pattern: /\bwhite\s*gold\b/i },
  { key: "rose-gold", label: "Rose Gold", pattern: /\brose\s*gold\b/i },
  { key: "yellow-gold", label: "Yellow Gold", pattern: /\byellow\s*gold\b/i }
];

const PRODUCT_IMAGE_VIEWS = [
  { key: "hero", label: "Main View", pattern: /\b(hero|main|primary)\b/i },
  { key: "top", label: "Top View", pattern: /\btop\b/i },
  { key: "front", label: "Front View", pattern: /\bfront\b/i },
  { key: "side", label: "Side View", pattern: /\bside\b/i },
  { key: "back", label: "Back View", pattern: /\bback\b/i }
];

export function getProductImageMetal(image = {}) {
  return PRODUCT_IMAGE_METALS.find((metal) => metal.pattern.test(image.altText || "")) || null;
}

export function getProductImageView(image = {}) {
  return PRODUCT_IMAGE_VIEWS.find((view) => view.pattern.test(image.altText || "")) || null;
}

// Main view first, then top, front, side, back. A metal-specific shot with no
// named view (most are tagged "Detail") is that metal's own photo, so it leads
// straight after the main view rather than trailing the shared angles.
function getViewOrder(image) {
  const view = getProductImageView(image);

  if (view) {
    return PRODUCT_IMAGE_VIEWS.indexOf(view);
  }

  return getProductImageMetal(image) ? 0.5 : PRODUCT_IMAGE_VIEWS.length;
}

// Returns one set per metal that has images, each ordered by getViewOrder.
// Images that name no metal belong to every set. A piece shot in a single
// metal (or none) comes back as one set, which the gallery shows without a
// metal switch.
export function groupProductImagesByMetal(images = []) {
  const sharedImages = images.filter((image) => !getProductImageMetal(image));
  const sets = PRODUCT_IMAGE_METALS
    .map((metal) => ({
      key: metal.key,
      label: metal.label,
      images: [
        ...images.filter((image) => getProductImageMetal(image)?.key === metal.key),
        ...sharedImages
      ].sort((left, right) => getViewOrder(left) - getViewOrder(right) || left.sortOrder - right.sortOrder)
    }))
    .filter((set) => set.images.length > sharedImages.length);

  if (sets.length < 2) {
    return [{ key: sets[0]?.key || "", label: sets[0]?.label || "", images }];
  }

  // Lead with the metal of the image the admin marked as primary.
  const primaryMetal = getProductImageMetal(images.find((image) => image.isPrimary) || images[0]);
  const leadIndex = Math.max(0, sets.findIndex((set) => set.key === primaryMetal?.key));

  return [sets[leadIndex], ...sets.filter((_, index) => index !== leadIndex)];
}
