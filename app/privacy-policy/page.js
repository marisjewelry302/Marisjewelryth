import ContentPage from "../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("privacy-policy");

export default function PrivacyPolicyPage() {
  return <ContentPage page={getStaticPage("privacy-policy")} />;
}
