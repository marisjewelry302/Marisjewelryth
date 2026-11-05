import "../../../../assets/css/product.css";
import { getProductStaticParams } from "../../../lib/product-static-params.js";
import { ProductPageView, buildProductMetadata } from "../../../product/[slug]/product-slug-page";

export const revalidate = 60;

export async function generateStaticParams() {
  return getProductStaticParams();
}

export async function generateMetadata({ params }) {
  return buildProductMetadata({ params, locale: "th" });
}

export default function ProductThaiPage({ params }) {
  return <ProductPageView params={params} locale="th" />;
}
