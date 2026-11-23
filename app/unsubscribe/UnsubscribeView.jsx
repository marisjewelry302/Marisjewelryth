import UnsubscribeClient from "./UnsubscribeClient";
import { verifyUnsubscribeToken } from "../lib/email-unsubscribe.js";
import { THAI_LOCALE, localizePath } from "../lib/i18n";
import { baseText } from "../lib/ui-text-base";

function maskEmail(email) {
  const [name, domain] = String(email).split("@");
  return `${name.slice(0, 1)}${"*".repeat(Math.max(name.length - 1, 2))}@${domain}`;
}

// Shared by /unsubscribe and /th/unsubscribe. The email links always point at the
// English URL; the visitor can switch language from the header.
export default function UnsubscribeView({ token, locale = "en" }) {
  const key = locale === THAI_LOCALE ? "th" : "en";
  const u = baseText[key].unsubscribe;
  const { isValid, email } = verifyUnsubscribeToken(token);

  return (
    <main id="main-content" className="placeholder-main content-page site-main">
      <section className="placeholder-card placeholder-card--editorial">
        <div className="subpage-intro">
          <p className="eyebrow">{u.eyebrow}</p>
          <h1>{u.title}</h1>
          {isValid ? (
            <p className="lead">{u.lead.replace("{email}", maskEmail(email))}</p>
          ) : (
            <p className="lead">{u.invalid}</p>
          )}
        </div>
        {isValid ? <UnsubscribeClient token={token} /> : (
          <div className="page-actions">
            <a className="primary-link" href={localizePath("/contact-us", locale)}>{u.contact}</a>
          </div>
        )}
      </section>
    </main>
  );
}
