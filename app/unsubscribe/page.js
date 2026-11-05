import UnsubscribeClient from "./UnsubscribeClient";
import { verifyUnsubscribeToken } from "../lib/email-unsubscribe.js";

export const metadata = {
  title: "Unsubscribe | Maris Jewelry",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

function maskEmail(email) {
  const [name, domain] = String(email).split("@");
  return `${name.slice(0, 1)}${"*".repeat(Math.max(name.length - 1, 2))}@${domain}`;
}

export default async function UnsubscribePage({ searchParams }) {
  const params = await searchParams;
  const token = String(params?.token || "");
  const { isValid, email } = verifyUnsubscribeToken(token);

  return (
    <main id="main-content" className="placeholder-main content-page site-main">
      <section className="placeholder-card placeholder-card--editorial">
        <div className="subpage-intro">
          <p className="eyebrow">Maris Updates</p>
          <h1>Unsubscribe</h1>
          {isValid ? (
            <p className="lead">Stop Maris Jewelry marketing emails to {maskEmail(email)}.</p>
          ) : (
            <p className="lead">This unsubscribe link is not valid or is incomplete. To stop receiving emails, contact us and we will remove you.</p>
          )}
        </div>
        {isValid ? <UnsubscribeClient token={token} /> : (
          <div className="page-actions">
            <a className="primary-link" href="/contact-us">Contact Maris</a>
          </div>
        )}
      </section>
    </main>
  );
}
