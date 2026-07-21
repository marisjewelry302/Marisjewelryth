import { notFound } from "next/navigation";
import { cache } from "react";
import { readPublicProductBySlug, readRelatedPublicProducts } from "../../lib/maris-database.js";
import { getPublicProductAltText, getPublicProductDisplayName, getPublicVariantDisplayName } from "../../lib/product-display.js";
import JsonLd from "../../components/JsonLd";
import WishlistButton from "../../components/WishlistButton";
import ProductGallery from "./ProductGallery";
import AddToBagButton from "./AddToBagButton";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildProductJsonLd
} from "../../lib/seo";

export const revalidate = 60;
const getProductBySlug = cache((slug) => readPublicProductBySlug(slug));

const COLLECTION_LABELS = {
  "engagement-ring": "Engagement Rings",
  "wedding-set": "Wedding Set",
  "wedding-bands": "Wedding Bands",
  "mens-wedding-bands": "Men's Wedding Bands",
  "necklaces-pendants": "Necklaces & Pendants",
  bracelets: "Bracelets",
  earrings: "Earrings",
  rings: "Rings"
};

function formatPrice(basePrice) {
  if (basePrice === null || basePrice === undefined) {
    return "Price on request";
  }

  return `${Number(basePrice).toLocaleString()} THB`;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { product } = await getProductBySlug(slug);

  if (!product) {
    return { title: "Maris Jewelry" };
  }

  const displayName = getPublicProductDisplayName(product);
  const collectionLabel = COLLECTION_LABELS[product.collection] || product.category || "Maris Jewelry";
  const productPath = `/product/${product.slug || product.sku}`;
  const metadata = buildPageMetadata({
    title: `${displayName} | Maris Jewelry`,
    description: `Explore ${displayName} from ${collectionLabel}. Enquire with Maris Jewelry for current availability, sizing, and custom guidance.`,
    path: productPath,
    image: product.primaryImageUrl || product.images?.[0]?.imageUrl
  });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "website"
    }
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const { product } = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const { products: relatedProducts } = await readRelatedPublicProducts(product.collection, product.id);
  const collectionLabel = COLLECTION_LABELS[product.collection] || product.category || "Maris Jewelry";
  const displayName = getPublicProductDisplayName(product);
  const productPath = `/product/${product.slug || product.sku}`;
  const wishlistItem = {
    id: `${product.collection || collectionLabel}:${product.sku}`,
    title: product.sku,
    details: [displayName],
    image: product.primaryImageUrl,
    href: productPath,
    collection: collectionLabel,
    priceLabel: formatPrice(product.basePrice)
  };
  const productJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd([
        ...(product.collection ? [{ name: collectionLabel, path: `/category/${product.collection}` }] : []),
        { name: displayName, path: productPath }
      ]),
      buildProductJsonLd({ product, displayName, collectionLabel })
    ]
  };

  return (
    <>
      <JsonLd data={productJsonLd} />
      <main className="product-page">
        <div className="product-detail">
          <div className="product-gallery-column">
            <ProductGallery images={product.images} productCode={product.sku} productName={displayName} />
          </div>

          <div className="product-summary">
            <p className="product-kicker" data-product-collection>{collectionLabel}</p>
            <h1 data-product-title>{product.sku}</h1>
            <h2 data-product-name>{displayName}</h2>
            <p className="product-description" data-product-description>
              {displayName}
            </p>

            {product.variants.length > 0 && (
              <ul className="product-details-list" data-product-details>
                {product.variants.map((variant) => (
                  <li key={variant.id}>
                    {getPublicVariantDisplayName(variant)}
                  </li>
                ))}
              </ul>
            )}

            <p className="product-price" data-product-price>{formatPrice(product.basePrice)}</p>

            <div className="product-actions">
              <AddToBagButton product={product} collectionLabel={collectionLabel} />
              <WishlistButton item={wishlistItem} variant="action" />
              <a
                className="product-action is-primary is-contact"
                href={`/contact-order/${encodeURIComponent(product.sku)}`}
              >
                Contact Maris to Order
              </a>
            </div>

            <p className="product-note">Enquire with our atelier for current availability and bespoke sizing.</p>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="also-like" data-also-like-section>
            <h2>You may also like</h2>
            <div className="also-grid" data-also-like>
              {relatedProducts.map((item) => (
                <a key={item.id} className="also-card" href={`/product/${item.slug || item.sku}`}>
                  {item.primaryImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.primaryImageUrl} alt={getPublicProductAltText(item)} />
                  )}
                  <span>{item.sku}</span>
                  <small>{getPublicProductDisplayName(item)}</small>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
