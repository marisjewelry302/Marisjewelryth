import CollectionsPageView, { buildCollectionsMetadata } from "../../collections/collections-page";

export const revalidate = 60;

export function generateMetadata() {
  return buildCollectionsMetadata("th");
}

export default function CollectionsThaiPage() {
  return <CollectionsPageView locale="th" />;
}
