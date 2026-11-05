import "../../../assets/css/product.css";
import { getProductStaticParams } from "../../lib/product-static-params.js";

export { default, generateMetadata } from "./product-slug-page";

export const revalidate = 60;

export async function generateStaticParams() {
  return getProductStaticParams();
}
