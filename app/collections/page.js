import CollectionsPageView, { buildCollectionsMetadata } from "./collections-page";

export const revalidate = 60;

export function generateMetadata() {
  return buildCollectionsMetadata();
}

export default function CollectionsPage() {
  return <CollectionsPageView />;
}
