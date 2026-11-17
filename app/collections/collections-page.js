import "../../assets/css/category.css";
import JsonLd from "../components/JsonLd";
import ProductCard from "../components/ProductCard";
import { THAI_LOCALE, fill } from "../lib/i18n";
import { readPublicCatalogueProducts } from "../lib/maris-database.js";
import { getCollectionLineFacets } from "../lib/product-facets";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "../lib/seo";
import { uiText } from "../lib/ui-text";
import styles from "./collections.module.css";

const ABOVE_FOLD_CARD_COUNT = 4;

export function buildCollectionsMetadata(locale = "en") {
  const copy = uiText[locale === THAI_LOCALE ? "th" : "en"].collectionsPage;

  return buildPageMetadata({
    title: `${copy.title} | Maris Jewelry`,
    description: copy.meta,
    path: "/collections",
    locale
  });
}

// "The Infinite Hold Collection" and "Infinite Hold" are one line entered two
// ways, so pieces are grouped by the same normalised name the catalogue filter
// uses, and the first spelling seen is shown. Pieces with no collection name
// are left to their category pages.
function groupByCollectionName(products) {
  const groups = new Map();

  for (const product of products) {
    const [facet] = getCollectionLineFacets(product);

    if (!facet) {
      continue;
    }

    if (!groups.has(facet.value)) {
      groups.set(facet.value, { slug: facet.value, title: String(product.collectionName).trim(), products: [] });
    }

    groups.get(facet.value).products.push(product);
  }

  return Array.from(groups.values()).sort((a, b) => a.title.localeCompare(b.title));
}

async function getCollectionGroups() {
  try {
    const result = await readPublicCatalogueProducts();
    return groupByCollectionName(result.products);
  } catch (error) {
    return [];
  }
}

export default async function CollectionsPageView({ locale = "en" }) {
  const copy = uiText[locale === THAI_LOCALE ? "th" : "en"].collectionsPage;
  const groups = await getCollectionGroups();

  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd([{ name: copy.title, path: "/collections" }], locale)} />
      <main id="main-content" className="category-page site-main">
        <section className="page-header">
          <h1>{copy.title}</h1>
          <p className="category-lead">{copy.lead}</p>
        </section>

        {groups.length ? (
          <>
            <nav className={styles.jump} aria-label={copy.jumpLabel}>
              <ul>
                {groups.map((group) => (
                  <li key={group.slug}>
                    <a href={`#${group.slug}`}>{group.title}</a>
                  </li>
                ))}
              </ul>
            </nav>

            {groups.map((group, groupIndex) => (
              <section key={group.slug} id={group.slug} className={styles.group} aria-labelledby={`${group.slug}-title`}>
                <header className={styles.groupHeader}>
                  <h2 id={`${group.slug}-title`}>{group.title}</h2>
                  <p>{fill(copy.count, { count: group.products.length })}</p>
                </header>
                <div className="products">
                  {group.products.map((product, index) => (
                    <ProductCard
                      key={product.id || product.sku}
                      product={product}
                      collectionLabel={group.title}
                      isAboveFold={groupIndex === 0 && index < ABOVE_FOLD_CARD_COUNT}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          <p className={styles.empty}>{copy.empty}</p>
        )}
      </main>
    </>
  );
}
