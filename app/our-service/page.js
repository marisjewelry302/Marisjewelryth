import ContentPage from "../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("our-service");

export default function OurServicePage() {
  return <ContentPage page={getStaticPage("our-service")} />;
}
