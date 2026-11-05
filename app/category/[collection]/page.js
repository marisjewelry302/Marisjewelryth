import CategoryPageView, { buildCategoryMetadata, getCategoryStaticParams } from "./category-page";

export const revalidate = 60;

export function generateStaticParams() {
  return getCategoryStaticParams();
}

export async function generateMetadata({ params }) {
  return buildCategoryMetadata({ params });
}

export default function CategoryPage({ params }) {
  return <CategoryPageView params={params} />;
}
