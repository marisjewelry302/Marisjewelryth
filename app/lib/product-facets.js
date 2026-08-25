// The catalogue has no structured trim data: `product_variants` is empty and
// `products` stores no metal, shape, or setting column. The descriptive text the
// admin uploader writes is the only real signal - image alt text records the metal
// per photo ("... White Gold Detail view") and product names carry the diamond
// shape and setting style. Facets are read from that text, and the storefront only
// offers a filter option when at least one piece actually answers it, so a control
// can never promise a narrowing the data cannot deliver.

import { getMeaningfulText } from "./product-display.js";

const METAL_FACETS = [
  { value: "white-gold", label: "White Gold", pattern: /\bwhite\s*gold\b/i },
  { value: "yellow-gold", label: "Yellow Gold", pattern: /\byellow\s*gold\b/i },
  { value: "rose-gold", label: "Rose Gold", pattern: /\brose\s*gold\b/i },
  { value: "platinum", label: "Platinum", pattern: /\bplatinum\b/i }
];

const SHAPE_FACETS = [
  { value: "round", label: "Round", pattern: /\bround\b/i },
  { value: "oval", label: "Oval", pattern: /\boval\b/i },
  { value: "pear", label: "Pear", pattern: /\bpear\b/i },
  { value: "emerald", label: "Emerald", pattern: /\bemerald\b/i },
  { value: "princess", label: "Princess", pattern: /\bprincess\b/i },
  { value: "cushion", label: "Cushion", pattern: /\bcushion\b/i },
  { value: "marquise", label: "Marquise", pattern: /\bmarquise\b/i },
  { value: "heart", label: "Heart", pattern: /\bheart\b/i }
];

const STYLE_FACETS = [
  { value: "cluster", label: "Cluster", pattern: /\bcluster\b/i },
  { value: "illusion", label: "Illusion", pattern: /\billusion\b/i },
  { value: "halo", label: "Halo", pattern: /\bhalo\b/i },
  { value: "solitaire", label: "Solitaire", pattern: /\bsolitaire\b/i },
  { value: "three-stone", label: "Three Stone", pattern: /\bthree[\s-]*stone\b/i },
  { value: "eternity", label: "Eternity", pattern: /\beternity\b/i },
  { value: "pave", label: "Pavé", pattern: /\bpav[eé]\b/i }
];

const CARAT_PATTERN = /([\d.]+)\s*(?:ct|carat)\b/i;

function toText(value) {
  return String(value || "").trim();
}

function collectImageText(product) {
  return Array.isArray(product?.images)
    ? product.images.map((image) => toText(image?.altText))
    : [];
}

function collectVariantText(product) {
  return Array.isArray(product?.variants)
    ? product.variants.map((variant) => [variant?.variantName, variant?.material, variant?.size].map(toText).join(" "))
    : [];
}

// Image alt text is the richest source, so it is folded in for every group.
function collectProductText(product = {}) {
  return [
    toText(product.name),
    toText(product.sku),
    toText(product.category),
    toText(product.collection),
    toText(product.collectionName),
    ...collectVariantText(product),
    ...collectImageText(product)
  ]
    .filter(Boolean)
    .join(" ");
}

function matchPatternFacets(facets, text) {
  return facets
    .filter((facet) => facet.pattern.test(text))
    .map((facet) => ({ value: facet.value, label: facet.label }));
}

// "The Infinite Hold Collection", "The Infinite Hold", and "Infinite Hold" are the
// same line entered three ways; "-" and "" mean the line was never filled in.
function getCollectionLineFacets(product = {}) {
  const name = getMeaningfulText(product.collectionName)
    .replace(/^the\s+/i, "")
    .replace(/\s+collection$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!name) {
    return [];
  }

  const value = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return value ? [{ value, label: name }] : [];
}

export const CATALOGUE_FACET_GROUPS = [
  {
    key: "metal",
    label: "Metal",
    getFacets: (product) => matchPatternFacets(METAL_FACETS, collectProductText(product))
  },
  {
    key: "shape",
    label: "Diamond Shape",
    getFacets: (product) => matchPatternFacets(SHAPE_FACETS, collectProductText(product))
  },
  {
    key: "style",
    label: "Setting",
    getFacets: (product) => matchPatternFacets(STYLE_FACETS, collectProductText(product))
  },
  {
    key: "collection",
    label: "Collection",
    getFacets: getCollectionLineFacets
  }
];

function getGroup(groupKey) {
  return CATALOGUE_FACET_GROUPS.find((group) => group.key === groupKey) || null;
}

export function getProductFacetValues(product, groupKey) {
  const group = getGroup(groupKey);

  return group ? group.getFacets(product || {}).map((facet) => facet.value) : [];
}

export function getProductMetalValues(product) {
  return getProductFacetValues(product, "metal");
}

export function getProductFacetTokens(product) {
  return CATALOGUE_FACET_GROUPS.flatMap((group) => (
    group.getFacets(product || {}).map((facet) => `${group.key}:${facet.value}`)
  ));
}

export function productMatchesFacetToken(product, token) {
  if (!token || token === "all") {
    return true;
  }

  const separatorIndex = String(token).indexOf(":");

  if (separatorIndex === -1) {
    return false;
  }

  const groupKey = String(token).slice(0, separatorIndex);
  const value = String(token).slice(separatorIndex + 1);

  return getProductFacetValues(product, groupKey).includes(value);
}

// Only groups a shopper can act on survive: an option no piece matches would
// return an empty grid, and a group whose every option matches every piece
// narrows nothing. Inside a surviving group each value is kept even when it
// matches all of them - dropping "White Gold" because the whole collection comes
// in white gold would read as though it were unavailable.
export function buildCatalogueFilterGroups(products) {
  const catalogue = Array.isArray(products) ? products : [];

  return CATALOGUE_FACET_GROUPS.map((group) => {
    const counts = new Map();

    catalogue.forEach((product) => {
      group.getFacets(product || {}).forEach((facet) => {
        const option = counts.get(facet.value) || { value: facet.value, label: facet.label, count: 0 };
        option.count += 1;
        counts.set(facet.value, option);
      });
    });

    const options = Array.from(counts.values())
      .filter((option) => option.count > 0)
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
      .map((option) => ({ ...option, token: `${group.key}:${option.value}` }));

    return { key: group.key, label: group.label, options };
  }).filter((group) => group.options.some((option) => option.count < catalogue.length));
}

export function getProductCarat(product = {}) {
  const match = collectProductText(product).match(CARAT_PATTERN);
  const carat = match ? Number(match[1]) : 0;

  return Number.isFinite(carat) ? carat : 0;
}
