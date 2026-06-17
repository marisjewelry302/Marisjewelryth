export const COLLECTIONS = {
  "wedding-set": {
    slug: "wedding-set",
    title: "Wedding Set",
    shortTitle: "Wedding Set",
    lead: "Matched engagement rings and wedding bands designed to sit together with balance.",
    prefixes: ["WS"],
    suffixes: ["WS"]
  },
  "engagement-ring": {
    slug: "engagement-ring",
    title: "Engagement Rings",
    shortTitle: "Engagement",
    lead: "Diamond rings for proposals, commitments, and one-of-one custom moments.",
    prefixes: ["ER", "DR"],
    suffixes: ["ER"]
  },
  "wedding-bands": {
    slug: "wedding-bands",
    title: "Wedding Bands",
    shortTitle: "Wedding Bands",
    lead: "Clean bands and diamond details made for everyday vows.",
    prefixes: ["WB"],
    suffixes: ["WB"]
  },
  "mens-wedding-bands": {
    slug: "mens-wedding-bands",
    title: "Men's Rings",
    shortTitle: "Men's Rings",
    lead: "Refined bands with quiet presence, comfort, and long-term wear in mind.",
    prefixes: ["MB", "MR"],
    suffixes: ["MR"]
  },
  "necklaces-pendants": {
    slug: "necklaces-pendants",
    title: "Necklaces & Pendants",
    shortTitle: "Necklaces",
    lead: "Fine chains, pendants, and diamond accents for everyday gifting.",
    prefixes: ["NP"],
    suffixes: ["NP"]
  },
  bracelets: {
    slug: "bracelets",
    title: "Bracelets",
    shortTitle: "Bracelets",
    lead: "Slim bracelets and diamond details that stay graceful on the wrist.",
    prefixes: ["BR"],
    suffixes: ["BR"]
  },
  earrings: {
    slug: "earrings",
    title: "Earrings",
    shortTitle: "Earrings",
    lead: "Diamond earrings with soft light, wearable scale, and a refined finish.",
    prefixes: ["EA"],
    suffixes: ["EA"]
  },
  rings: {
    slug: "rings",
    title: "Rings",
    shortTitle: "Rings",
    lead: "Fine rings for gifting, stacking, and personal milestones.",
    prefixes: ["RG"],
    suffixes: ["RG"]
  }
};

export const COLLECTION_ORDER = [
  "wedding-set",
  "engagement-ring",
  "wedding-bands",
  "mens-wedding-bands",
  "necklaces-pendants",
  "bracelets",
  "earrings",
  "rings"
];

const COLLECTION_ALIASES = {
  engagement: "engagement-ring",
  "engagement-rings": "engagement-ring",
  "engagement-ring": "engagement-ring",
  "wedding-set": "wedding-set",
  "wedding-sets": "wedding-set",
  "wedding-band": "wedding-bands",
  "wedding-bands": "wedding-bands",
  "mens-ring": "mens-wedding-bands",
  "mens-rings": "mens-wedding-bands",
  "men-s-rings": "mens-wedding-bands",
  "mens-wedding-band": "mens-wedding-bands",
  "mens-wedding-bands": "mens-wedding-bands",
  necklace: "necklaces-pendants",
  necklaces: "necklaces-pendants",
  pendant: "necklaces-pendants",
  pendants: "necklaces-pendants",
  "necklaces-pendants": "necklaces-pendants",
  bracelet: "bracelets",
  bracelets: "bracelets",
  earring: "earrings",
  earrings: "earrings",
  ring: "rings",
  rings: "rings"
};

export function slugifyCollection(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeCollection(value) {
  const slug = slugifyCollection(value);
  return COLLECTIONS[slug] ? slug : COLLECTION_ALIASES[slug] || "";
}

export function getCollection(slug) {
  return COLLECTIONS[normalizeCollection(slug) || slug] || null;
}

export function inferCollectionFromCode(code) {
  const upper = String(code || "").toUpperCase();

  for (const collection of Object.values(COLLECTIONS)) {
    if (collection.suffixes.some((suffix) => upper.endsWith(suffix) && upper.length > suffix.length)) {
      return collection.slug;
    }
  }

  for (const collection of Object.values(COLLECTIONS)) {
    if (collection.prefixes.some((prefix) => upper.startsWith(prefix))) {
      return collection.slug;
    }
  }

  return "";
}

export function productMatchesCollection(product, collectionSlug) {
  const expected = normalizeCollection(collectionSlug);
  const explicit = normalizeCollection(product.collection || product.category);

  if (explicit) {
    return explicit === expected;
  }

  return inferCollectionFromCode(product.sku || product.code || "") === expected;
}

export function formatProductPrice(basePrice) {
  if (basePrice === null || basePrice === undefined || basePrice === "") {
    return "Price on request";
  }

  return `${Number(basePrice).toLocaleString()} THB`;
}
