import { COLLECTION_ORDER } from "./lib/collections";
import { journalArticles } from "./lib/journal-data";
import { readPublicCatalogueProducts } from "./lib/maris-database";
import { absoluteUrl } from "./lib/seo";

async function getSitemapProducts() {
  try {
    const result = await readPublicCatalogueProducts({ limit: 500 });
    return Array.isArray(result.products) ? result.products : [];
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const products = await getSitemapProducts();
  const staticRoutes = [
    "",
    "about-us",
    "contact-us",
    "privacy-policy",
    "terms-of-service",
    "returns",
    "shipping",
    "our-service",
    "oem-jewelry",
    "wholesale-retail",
    "newsletter",
    "request-quote",
    "shopping-bag",
    "wishlist",
    "account",
    "journal"
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(`/${route}`).replace(/\/$/, ""),
      lastModified: new Date("2026-06-17")
    })),
    ...COLLECTION_ORDER.map((collection) => ({
      url: absoluteUrl(`/category/${collection}`),
      lastModified: new Date("2026-06-17")
    })),
    ...journalArticles.map((article) => ({
      url: absoluteUrl(`/journal/${article.slug}`),
      lastModified: new Date("2026-06-17")
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/product/${product.slug || product.sku}`),
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date("2026-06-17")
    }))
  ];
}
