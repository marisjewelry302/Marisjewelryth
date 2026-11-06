import { notFound } from "next/navigation";
import { THAI_LOCALE, localizePath } from "../lib/i18n";
import { getJournalArticle, getJournalText, getJournalVideoEmbed, journalArticles } from "../lib/journal-data";
import { uiText } from "../lib/ui-text";

function languageOf(locale) {
  return locale === THAI_LOCALE ? "th" : "en";
}

export function JournalListView({ locale = "en" }) {
  const language = languageOf(locale);
  const copy = uiText[language].journal;
  const link = (path) => localizePath(path, locale);

  return (
    <main id="main-content" className="placeholder-main content-page site-main">
      <section className="placeholder-card placeholder-card--editorial journal-library-shell">
        <div className="subpage-intro">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="lead journal-library-meta">{copy.lead}</p>
          <p className="journal-library-note">{copy.note}</p>
        </div>

        <div className="subpage-article-grid journal-library-grid">
          {journalArticles.map((article, index) => {
            const text = getJournalText(article, language);

            return (
              <a className="subpage-article-card journal-card-link" href={link(`/journal/${article.slug}`)} key={article.slug}>
                <span className="journal-card-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="journal-card-meta-row">
                  <p className="subpage-article-meta">{text.category}</p>
                  <span className="journal-card-read-time">{text.readTime}</span>
                </div>
                <h2>{text.title}</h2>
                <p>{text.excerpt}</p>
                <span className="journal-card-cta">{copy.read}</span>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export function JournalArticleView({ slug, locale = "en" }) {
  const article = getJournalArticle(slug);

  if (!article) {
    notFound();
  }

  const language = languageOf(locale);
  const copy = uiText[language].journal;
  const text = getJournalText(article, language);
  const link = (path) => localizePath(path, locale);
  const videoEmbed = getJournalVideoEmbed(article);

  return (
    <main id="main-content" className="placeholder-main content-page site-main">
      <article className="placeholder-card journal-article-shell">
        <header className="journal-article-header">
          <p className="eyebrow">{text.category}</p>
          <h1>{text.title}</h1>
          <p className="journal-article-dek">{text.excerpt}</p>
        </header>

        <div className="journal-article-layout">
          <div className="journal-article-content">
            {videoEmbed ? (
              <div className={`journal-video${article.videoFormat === "vertical" ? " journal-video--vertical" : ""}`}>
                <iframe
                  src={videoEmbed}
                  title={text.title}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : null}
            {videoEmbed ? (
              <p className="journal-video-link">
                <a href={article.video} target="_blank" rel="noopener noreferrer">
                  {language === "th" ? "ดูบน YouTube" : "Watch on YouTube"}
                </a>
              </p>
            ) : null}
            {text.sections.map((section) => (
              <section className="journal-section" key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets.length ? (
                  <ul className="journal-bullets">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <aside className="journal-article-sidebar">
            <section className="journal-fact-card">
              <h2>{copy.quick}</h2>
              <div className="journal-fact-list">
                {text.facts.map((item) => (
                  <div key={item[0]}>
                    <p className="journal-fact-label">{item[0]}</p>
                    <p className="journal-fact-value">{item[1]}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="journal-note-card">
              <h2>{copy.final}</h2>
              <p>{text.note}</p>
            </section>
          </aside>
        </div>

        <div className="page-actions journal-page-actions">
          <a className="primary-link" href={link("/category/engagement-ring")}>{copy.viewRings}</a>
          <a href={link("/contact-us")}>{copy.contact}</a>
          <a href={link("/journal")}>{copy.back}</a>
        </div>
      </article>
    </main>
  );
}
