import ContentPage from "../../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../../lib/static-pages";

export const metadata = getStaticPageMetadata("terms-of-service", "th");

export default function TermsOfServiceThaiPage() {
  return <ContentPage page={getStaticPage("terms-of-service", "th")} locale="th" />;
}
