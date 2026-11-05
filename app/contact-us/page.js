import ContactPageView from "../components/ContactPageView";
import { buildPageMetadata } from "../lib/seo";

export const metadata = buildPageMetadata({
  title: "Contact Us | Maris Jewelry",
  description: "Contact Maris Jewelry for catalogue questions, custom design, OEM service, wholesale support, or private consultation.",
  path: "/contact-us"
});

export default function ContactUsPage() {
  return <ContactPageView />;
}
