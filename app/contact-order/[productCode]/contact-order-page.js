import CustomOrderForm from "./CustomOrderForm";
import "../../../assets/css/custom-order.css";
import { THAI_LOCALE, fill } from "../../lib/i18n";
import { readPublicProductBySlug } from "../../lib/maris-database.js";
import {
  getPublicProductAltText,
  groupProductImagesByMetal
} from "../../lib/product-display.js";
import { buildPageMetadata } from "../../lib/seo";
import { uiText } from "../../lib/ui-text";

// The product page links here with the metal the shopper was viewing, so the
// photo and the pre-filled metal option match the piece they chose.
const METAL_OPTION_CODES = {
  "white-gold": "WG",
  "rose-gold": "RG",
  "yellow-gold": "YG"
};

function decodeProductCodeParam(productCode = "") {
  const rawProductCode = Array.isArray(productCode) ? productCode[0] : productCode;

  try {
    return decodeURIComponent(rawProductCode || "").trim().toUpperCase();
  } catch {
    return String(rawProductCode || "").trim().toUpperCase();
  }
}

// A missing or unreachable product only costs the page its photo; the form
// still works for any code, including bespoke requests.
async function readOrderedProduct(productCode) {
  try {
    const { product } = await readPublicProductBySlug(productCode);
    return product;
  } catch {
    return null;
  }
}

function pickProductImage(product, metalKey) {
  if (!product) {
    return null;
  }

  const imageSets = groupProductImagesByMetal(product.images, product.coverImageUrl);
  const metalSet = metalKey ? imageSets.find((set) => set.key === metalKey) : null;
  // Same lead photo the gallery shows for that metal: the cover when it was
  // shot in this metal, otherwise the set's main view.
  const setLeadsWithCover = metalSet?.images.some((image) => image.imageUrl === product.coverImageUrl);
  const src = (setLeadsWithCover ? product.coverImageUrl : metalSet?.images[0]?.imageUrl)
    || product.coverImageUrl
    || product.primaryImageUrl
    || "";

  return src ? { src, alt: getPublicProductAltText(product) } : null;
}

export async function buildOrderMetadata({ params, locale = "en" }) {
  const copy = uiText[locale === THAI_LOCALE ? "th" : "en"].order;
  const { productCode } = await params;
  const decodedProductCode = decodeProductCodeParam(productCode);
  const titleCode = decodedProductCode || copy.customOrder;

  return buildPageMetadata({
    title: fill(copy.metaTitle, { code: titleCode }),
    description: fill(copy.metaDescription, { code: titleCode }),
    path: `/contact-order/${encodeURIComponent(decodedProductCode || "custom-order")}`,
    locale
  });
}

export default async function ContactOrderPageView({ params, searchParams }) {
  const { productCode } = await params;
  const { metal } = await searchParams;
  const decodedProductCode = decodeProductCodeParam(productCode);
  const metalKey = METAL_OPTION_CODES[metal] ? metal : "";
  const product = await readOrderedProduct(decodedProductCode);

  return (
    <CustomOrderForm
      productCode={decodedProductCode}
      productImage={pickProductImage(product, metalKey)}
      initialMetal={product && metalKey ? METAL_OPTION_CODES[metalKey] : ""}
    />
  );
}
