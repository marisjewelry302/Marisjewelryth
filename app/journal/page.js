import { byLanguage, journalArticles } from "../lib/journal-data";

export const metadata = {
  title: "Articles | Maris Jewelry",
  description: "Practical reads for buyers researching diamonds, engagement rings, and fine jewelry with more confidence."
};

export default function JournalPage() {
  const language = "en";

  return (
    <main className="placeholder-main content-page site-main">
      <section className="placeholder-card placeholder-card--editorial journal-library-shell">
        <div className="subpage-intro">
          <p className="eyebrow">Maris Journal</p>
          <h1>Articles</h1>
          <p className="lead journal-library-meta">
            10 practical reads for buyers researching diamonds, engagement rings, and fine jewelry with more confidence.
          </p>
          <p className="journal-library-note">
            This journal collection focuses on questions real buyers actually ask before choosing a piece.
          </p>
        </div>

        <div className="subpage-article-grid journal-library-grid">
          {journalArticles.map((article, index) => (
            <a className="subpage-article-card journal-card-link" href={`/journal/${article.slug}`} key={article.slug}>
              <span className="journal-card-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="journal-card-meta-row">
                <p className="subpage-article-meta">{byLanguage(article.category, language)}</p>
                <span className="journal-card-read-time">{byLanguage(article.readTime, language)}</span>
              </div>
              <h2>{byLanguage(article.title, language)}</h2>
              <p>{byLanguage(article.excerpt, language)}</p>
              <span className="journal-card-cta">Read article</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
