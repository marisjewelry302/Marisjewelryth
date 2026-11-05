import { readPublicCatalogueProducts } from "./maris-database.js";
import { getPublicProductSlug } from "./product-display.js";

// A dynamic route with no generateStaticParams is rendered on every request with
// "Cache-Control: no-store", so each product page waited on the database and skipped
// the CDN (about 2 s each). Listing the products here makes Next prerender them and
// serve them from cache, refreshing every `revalidate` seconds. Every active product
// is listed, matching the sitemap, so none is left to render on first request. If the
// catalogue cannot be read at build time this returns [] and pages are built on first
// request. Shared by the English and Thai product routes.
export async function getProductStaticParams() {
  try {
    const { products } = await readPublicCatalogueProducts();

    return products
      .map((product) => ({ slug: getPublicProductSlug(product) }))
      .filter((params) => params.slug);
  } catch (error) {
    return [];
  }
}
