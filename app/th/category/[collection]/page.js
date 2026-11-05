import CategoryPageView, { buildCategoryMetadata, getCategoryStaticParams } from "../../../category/[collection]/category-page";

export const revalidate = 60;

export function generateStaticParams() {
  return getCategoryStaticParams();
}

export async function generateMetadata({ params }) {
  return buildCategoryMetadata({ params, locale: "th" });
}

export default function CategoryThaiPage({ params }) {
  return <CategoryPageView params={params} locale="th" />;
}
