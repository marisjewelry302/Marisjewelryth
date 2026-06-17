import ContentPage from "../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("newsletter");

export default function NewsletterPage() {
  return <ContentPage page={getStaticPage("newsletter")} />;
}
