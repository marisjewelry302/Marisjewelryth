import { JournalArticleView } from "../../../components/JournalViews";
import { getJournalArticle, getJournalText, journalArticles } from "../../../lib/journal-data";
import { buildPageMetadata } from "../../../lib/seo";

export function generateStaticParams() {
  return journalArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = getJournalArticle(slug);

  if (!article) {
    return { title: "Maris Jewelry" };
  }

  const text = getJournalText(article, "th");

  return buildPageMetadata({
    title: `${text.title} | Maris Jewelry`,
    description: text.excerpt,
    path: `/journal/${article.slug}`,
    ...(article.image ? { image: article.image } : {}),
    locale: "th"
  });
}

export default async function JournalArticleThaiPage({ params }) {
  const { slug } = await params;

  return <JournalArticleView slug={slug} locale="th" />;
}
