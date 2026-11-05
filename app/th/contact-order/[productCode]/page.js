import ContactOrderPageView, { buildOrderMetadata } from "../../../contact-order/[productCode]/contact-order-page";

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  return buildOrderMetadata({ params, locale: "th" });
}

export default function ContactOrderThaiPage(props) {
  return <ContactOrderPageView {...props} />;
}
