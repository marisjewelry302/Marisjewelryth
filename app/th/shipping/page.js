import ContentPage from "../../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../../lib/static-pages";

export const metadata = getStaticPageMetadata("shipping", "th");

export default function ShippingThaiPage() {
  return <ContentPage page={getStaticPage("shipping", "th")} locale="th" />;
}
