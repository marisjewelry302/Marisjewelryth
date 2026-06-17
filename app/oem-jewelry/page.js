import ContentPage from "../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("oem-jewelry");

export default function OemJewelryPage() {
  return <ContentPage page={getStaticPage("oem-jewelry")} />;
}
