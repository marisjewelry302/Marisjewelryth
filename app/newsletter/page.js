import ContentPage from "../components/ContentPage";
import NewsletterSignup from "../components/NewsletterSignup";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("newsletter");

export default async function NewsletterPage({ searchParams }) {
  // The footer used to submit here as a GET. Old links and bookmarks still
  // arrive with ?email=, so carry that into the form instead of dropping it.
  const params = await searchParams;
  const defaultEmail = String(params?.email || "").trim();

  return (
    <ContentPage page={getStaticPage("newsletter")}>
      <section className="subpage-panel newsletter-panel">
        <h2>Join the list</h2>
        <p>Add your email address and Maris Jewelry will send collection notes and custom design updates.</p>
        <NewsletterSignup source="newsletter-page" variant="page" defaultEmail={defaultEmail} />
      </section>
    </ContentPage>
  );
}
