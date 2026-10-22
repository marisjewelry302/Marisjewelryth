import "../../../assets/css/product.css";
import { readPublicCatalogueProducts } from "../../lib/maris-database.js";
import { getPublicProductSlug } from "../../lib/product-display.js";

export { default, generateMetadata } from "./product-slug-page";

export const revalidate = 60;

// A dynamic route with no generateStaticParams is rendered on every request with
// "Cache-Control: no-store", so each product page waited on the database and skipped
// the CDN (about 2 s each). Listing the products here makes Next prerender them and
// serve them from cache, refreshing every `revalidate` seconds. If the catalogue
// cannot be read at build time this returns [] and pages are built on first request.
export async function generateStaticParams() {
  try {
    const { products } = await readPublicCatalogueProducts({ limit: 500 });

    return products
      .map((product) => ({ slug: getPublicProductSlug(product) }))
      .filter((params) => params.slug);
  } catch (error) {
    return [];
  }
}
