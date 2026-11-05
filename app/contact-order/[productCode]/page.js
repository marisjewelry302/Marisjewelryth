import ContactOrderPageView, { buildOrderMetadata } from "./contact-order-page";

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  return buildOrderMetadata({ params });
}

export default function ContactOrderPage(props) {
  return <ContactOrderPageView {...props} />;
}
