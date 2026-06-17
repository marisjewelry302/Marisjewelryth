import ContentPage from "../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("about-us");

export default function AboutUsPage() {
  return <ContentPage page={getStaticPage("about-us")} />;
}
