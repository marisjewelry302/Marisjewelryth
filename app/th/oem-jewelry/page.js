import ContentPage from "../../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../../lib/static-pages";

export const metadata = getStaticPageMetadata("oem-jewelry", "th");

export default function OemJewelryThaiPage() {
  return <ContentPage page={getStaticPage("oem-jewelry", "th")} locale="th" />;
}
