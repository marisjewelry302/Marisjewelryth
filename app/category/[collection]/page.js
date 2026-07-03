import { notFound } from "next/navigation";
import CategoryProducts from "./CategoryProducts";
import JsonLd from "../../components/JsonLd";
import { COLLECTION_ORDER, getCollection, productMatchesCollection } from "../../lib/collections";
import { readPublicCatalogueProducts } from "../../lib/maris-database.js";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildPageMetadata
} from "../../lib/seo";

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

  const canonicalPath = `/category/${collection.slug}`;
  const metadata = buildPageMetadata({
    title: `${collection.title} | Maris Jewelry`,
    description: `${collection.lead} Browse Maris Jewelry catalogue pieces and contact the atelier to confirm availability or custom details.`,
    path: canonicalPath
  });

  return {
    ...metadata,
    alternates: { canonical: absoluteUrl(canonicalPath) }
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
  const categoryJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd([
        { name: collection.title, path: `/category/${collection.slug}` }
      ]),
      buildCollectionPageJsonLd({ collection, products })
    ]
  };

  return (
    <>
      <JsonLd data={categoryJsonLd} />
      <main className="category-page site-main">
        <section className="page-header">
          <h1>{collection.title}</h1>
          <p className="category-lead">{collection.lead}</p>
        </section>

        <CategoryProducts products={products} collectionTitle={collection.title} />
      </main>
    </>
  );
}
