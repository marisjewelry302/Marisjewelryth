import ContentPage from "../../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../../lib/static-pages";

export const metadata = getStaticPageMetadata("wholesale-retail", "th");

export default function WholesaleRetailThaiPage() {
  return <ContentPage page={getStaticPage("wholesale-retail", "th")} locale="th" />;
}
