import ContentPage from "../../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../../lib/static-pages";

export const metadata = getStaticPageMetadata("returns", "th");

export default function ReturnsThaiPage() {
  return <ContentPage page={getStaticPage("returns", "th")} locale="th" />;
}
