import ContentPage from "../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("terms-of-service");

export default function TermsOfServicePage() {
  return <ContentPage page={getStaticPage("terms-of-service")} />;
}
