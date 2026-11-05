import ContentPage from "../../components/ContentPage";
import NewsletterSignup from "../../components/NewsletterSignup";
import { getStaticPage, getStaticPageMetadata } from "../../lib/static-pages";

export const metadata = getStaticPageMetadata("newsletter", "th");

export default async function NewsletterThaiPage({ searchParams }) {
  const params = await searchParams;
  const defaultEmail = String(params?.email || "").trim();

  return (
    <ContentPage page={getStaticPage("newsletter", "th")} locale="th">
      <section className="subpage-panel newsletter-panel">
        <h2>สมัครรับข่าวสาร</h2>
        <p>กรอกอีเมลของคุณ แล้ว Maris Jewelry จะส่งบันทึกคอลเลกชันและอัปเดตงานออกแบบตามสั่งให้</p>
        <NewsletterSignup source="newsletter-page" variant="page" defaultEmail={defaultEmail} />
      </section>
    </ContentPage>
  );
}
