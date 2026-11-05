import "../../../../assets/css/product.css";
import { readPublicCatalogueProducts } from "../../../lib/maris-database.js";
import { getPublicProductSlug } from "../../../lib/product-display.js";
import { ProductPageView, buildProductMetadata } from "../../../product/[slug]/product-slug-page";

export const revalidate = 60;

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

export async function generateMetadata({ params }) {
  return buildProductMetadata({ params, locale: "th" });
}

export default function ProductThaiPage({ params }) {
  return <ProductPageView params={params} locale="th" />;
}
