import CustomOrderForm from "./CustomOrderForm";

export const dynamic = "force-dynamic";

function decodeProductCodeParam(productCode = "") {
  const rawProductCode = Array.isArray(productCode) ? productCode[0] : productCode;

  try {
    return decodeURIComponent(rawProductCode || "").trim().toUpperCase();
  } catch {
    return String(rawProductCode || "").trim().toUpperCase();
  }
}

export async function generateMetadata({ params }) {
  const { productCode } = await params;
  const decodedProductCode = decodeProductCodeParam(productCode);
  const titleCode = decodedProductCode || "Custom order";

  return {
    title: `${titleCode} | Contact Maris Jewelry`,
    description: `Contact Maris Jewelry about ${titleCode} and optional bespoke details.`
  };
}

export default async function ContactOrderPage({ params }) {
  const { productCode } = await params;
  const decodedProductCode = decodeProductCodeParam(productCode);

  return <CustomOrderForm productCode={decodedProductCode} />;
}
