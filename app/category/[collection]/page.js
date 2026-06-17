import { notFound } from "next/navigation";
import CategoryProducts from "./CategoryProducts";
import { COLLECTION_ORDER, getCollection, productMatchesCollection } from "../../lib/collections";
import { readPublicCatalogueProducts } from "../../lib/maris-database.js";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export function generateStaticParams() {
  return COLLECTION_ORDER.map((collection) => ({ collection }));
}

export async function generateMetadata({ params }) {
  const { collection: collectionSlug } = await params;
  const collection = getCollection(collectionSlug);

  if (!collection) {
    return { title: "Maris Jewelry" };
  }

  return {
    title: `${collection.title} | Maris Jewelry`,
    description: collection.lead
  };
}

async function getCollectionProducts(collectionSlug) {
  try {
    const result = await readPublicCatalogueProducts({ limit: 200 });
    return result.products.filter((product) => productMatchesCollection(product, collectionSlug));
  } catch (error) {
    return [];
  }
}

export default async function CategoryPage({ params }) {
  const { collection: collectionSlug } = await params;
  const collection = getCollection(collectionSlug);

  if (!collection) {
    notFound();
  }

  const products = await getCollectionProducts(collection.slug);

  return (
    <main className="category-page site-main">
      <section className="page-header">
        <p className="eyebrow">Maris Catalogue</p>
        <h1>{collection.title}</h1>
        <p className="category-lead">{collection.lead}</p>
      </section>

      <CategoryProducts products={products} collectionTitle={collection.title} />
    </main>
  );
}
