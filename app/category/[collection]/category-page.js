import { notFound } from "next/navigation";
import "../../../assets/css/category.css";
import CategoryProducts from "./CategoryProducts";
import JsonLd from "../../components/JsonLd";
import { COLLECTION_ORDER, getCollection, productMatchesCollection } from "../../lib/collections";
import { THAI_LOCALE } from "../../lib/i18n";
import { readPublicCatalogueProducts } from "../../lib/maris-database.js";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildPageMetadata
} from "../../lib/seo";
import { uiText } from "../../lib/ui-text";

export function getCategoryStaticParams() {
  return COLLECTION_ORDER.map((collection) => ({ collection }));
}

// The English collection keeps its slug, matching rules and product codes; only
// the words shown to the visitor come from the language dictionary.
function localizeCollection(collection, locale) {
  const words = uiText[locale === THAI_LOCALE ? "th" : "en"].collections[collection.slug];
  return words ? { ...collection, title: words.title, lead: words.lead } : collection;
}

export async function buildCategoryMetadata({ params, locale = "en" }) {
  const { collection: collectionSlug } = await params;
  const baseCollection = getCollection(collectionSlug);

  if (!baseCollection) {
    return { title: "Maris Jewelry" };
  }

  const collection = localizeCollection(baseCollection, locale);
  const copy = uiText[locale === THAI_LOCALE ? "th" : "en"];

  return buildPageMetadata({
    title: `${collection.title} | Maris Jewelry`,
    description: `${collection.lead} ${copy.categoryMeta}`,
    path: `/category/${collection.slug}`,
    locale
  });
}

async function getCollectionProducts(collectionSlug) {
  try {
    const result = await readPublicCatalogueProducts({ limit: 200 });
    return result.products.filter((product) => productMatchesCollection(product, collectionSlug));
  } catch (error) {
    return [];
  }
}

export default async function CategoryPageView({ params, locale = "en" }) {
  const { collection: collectionSlug } = await params;
  const baseCollection = getCollection(collectionSlug);

  if (!baseCollection) {
    notFound();
  }

  const collection = localizeCollection(baseCollection, locale);
  const products = await getCollectionProducts(collection.slug);
  const categoryJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd([
        { name: collection.title, path: `/category/${collection.slug}` }
      ], locale),
      buildCollectionPageJsonLd({ collection, products, locale })
    ]
  };

  return (
    <>
      <JsonLd data={categoryJsonLd} />
      <main id="main-content" className="category-page site-main">
        <section className="page-header">
          <h1>{collection.title}</h1>
          <p className="category-lead">{collection.lead}</p>
        </section>

        <CategoryProducts products={products} collectionTitle={collection.title} collectionSlug={collection.slug} />
      </main>
    </>
  );
}
