import ContentPage from "../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("shipping");

export default function ShippingPage() {
  return <ContentPage page={getStaticPage("shipping")} />;
}
