import { COLLECTION_ORDER } from "./lib/collections";
import { journalArticles } from "./lib/journal-data";
import { readPublicCatalogueProducts } from "./lib/maris-database";
import { getPublicProductPath } from "./lib/product-display.js";
import { THAI_LOCALE, hasThaiVersion, localizePath } from "./lib/i18n";
import { absoluteUrl } from "./lib/seo";

// Refreshed hourly. A database error is not caught here: publishing a sitemap
// with no products would tell search engines the pages are gone, whereas an
// error leaves the last good sitemap in place (and fails the build if it
// happens there). An unconfigured database still returns no products.
export const revalidate = 3600;

async function getSitemapProducts() {
  const result = await readPublicCatalogueProducts();
  return Array.isArray(result.products) ? result.products : [];
}

// A page with a Thai version lists both URLs, each pointing at the other, so
// Google can pair the English and Thai pages (hreflang).
function withLanguages(path, extra = {}) {
  const english = absoluteUrl(path).replace(/\/$/, "");

  if (!hasThaiVersion(path)) {
    return [{ url: english, ...extra }];
  }

  const thai = absoluteUrl(localizePath(path, THAI_LOCALE));
  const alternates = { languages: { en: english, th: thai } };
  return [{ url: english, alternates, ...extra }, { url: thai, alternates, ...extra }];
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
    "journal"
  ];

  // Static pages have no tracked edit date, so omit lastModified rather than
  // report a fixed date Google would learn to ignore.
  return [
    ...staticRoutes.flatMap((route) => withLanguages(`/${route}`)),
    ...COLLECTION_ORDER.flatMap((collection) => withLanguages(`/category/${collection}`)),
    ...journalArticles.flatMap((article) => withLanguages(`/journal/${article.slug}`)),
    ...products.flatMap((product) => withLanguages(
      getPublicProductPath(product),
      product.updatedAt ? { lastModified: new Date(product.updatedAt) } : {}
    ))
  ];
}
