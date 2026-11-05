import ContentPage from "../../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../../lib/static-pages";

export const metadata = getStaticPageMetadata("privacy-policy", "th");

export default function PrivacyPolicyThaiPage() {
  return <ContentPage page={getStaticPage("privacy-policy", "th")} locale="th" />;
}
