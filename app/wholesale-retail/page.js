import ContentPage from "../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("wholesale-retail");

export default function WholesaleRetailPage() {
  return <ContentPage page={getStaticPage("wholesale-retail")} />;
}
