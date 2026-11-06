import { JournalArticleView } from "../../components/JournalViews";
import { getJournalArticle, getJournalText, journalArticles } from "../../lib/journal-data";
import { buildPageMetadata } from "../../lib/seo";

export function generateStaticParams() {
  return journalArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = getJournalArticle(slug);

  if (!article) {
    return { title: "Maris Jewelry" };
  }

  const text = getJournalText(article, "en");

  return buildPageMetadata({
    title: `${text.title} | Maris Jewelry`,
    description: text.excerpt,
    path: `/journal/${article.slug}`,
    ...(article.image ? { image: article.image } : {})
  });
}

export default async function JournalArticlePage({ params }) {
  const { slug } = await params;

  return <JournalArticleView slug={slug} />;
}
