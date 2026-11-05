import ContentPage from "../../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../../lib/static-pages";

export const metadata = getStaticPageMetadata("about-us", "th");

export default function AboutUsThaiPage() {
  return <ContentPage page={getStaticPage("about-us", "th")} locale="th" />;
}
