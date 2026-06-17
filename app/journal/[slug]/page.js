import { notFound } from "next/navigation";
import { byLanguage, getJournalArticle, journalArticles } from "../../lib/journal-data";

export function generateStaticParams() {
  return journalArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = getJournalArticle(slug);

  if (!article) {
    return { title: "Maris Jewelry" };
  }

  return {
    title: `${byLanguage(article.title)} | Maris Jewelry`,
    description: byLanguage(article.excerpt)
  };
}

export default async function JournalArticlePage({ params }) {
  const { slug } = await params;
  const article = getJournalArticle(slug);
  const language = "en";

  if (!article) {
    notFound();
  }

  return (
    <main className="placeholder-main content-page site-main">
      <article className="placeholder-card journal-article-shell">
        <header className="journal-article-header">
          <p className="eyebrow">{byLanguage(article.category, language)}</p>
          <h1>{byLanguage(article.title, language)}</h1>
          <p className="journal-article-dek">{byLanguage(article.excerpt, language)}</p>
        </header>

        <div className="journal-article-layout">
          <div className="journal-article-content">
            {byLanguage(article.sections, language).map((section) => (
              <section className="journal-section" key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <ul className="journal-bullets">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside className="journal-article-sidebar">
            <section className="journal-fact-card">
              <h2>Quick notes</h2>
              <div className="journal-fact-list">
                {byLanguage(article.facts, language).map((item) => (
                  <div key={item[0]}>
                    <p className="journal-fact-label">{item[0]}</p>
                    <p className="journal-fact-value">{item[1]}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="journal-note-card">
              <h2>Final thought</h2>
              <p>{byLanguage(article.note, language)}</p>
            </section>
          </aside>
        </div>

        <div className="page-actions journal-page-actions">
          <a className="primary-link" href="/category/engagement-ring">View engagement rings</a>
          <a href="/contact-us">Contact Maris</a>
          <a href="/journal">Back to articles</a>
        </div>
      </article>
    </main>
  );
}
