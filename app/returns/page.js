import ContentPage from "../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("returns");

export default function ReturnsPage() {
  return <ContentPage page={getStaticPage("returns")} />;
}
