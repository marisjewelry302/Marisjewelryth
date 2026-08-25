import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { readPublicProductBySlug, readRelatedPublicProducts } from "../../lib/maris-database.js";
import {
  getMeaningfulText,
  getPublicProductAltText,
  getPublicProductDisplayName,
  getPublicProductPath,
  getPublicProductSlug,
  getPublicVariantDisplayName
} from "../../lib/product-display.js";
import JsonLd from "../../components/JsonLd";
import WishlistButton from "../../components/WishlistButton";
import ProductGallery from "./ProductGallery";
import AddToBagButton from "./AddToBagButton";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildProductJsonLd
} from "../../lib/seo";

import Image from "next/image";
import { isOptimizableImageSrc } from "../../lib/image-source";
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

// A pasted product code reaches this route percent-encoded ("SR%200015%20ER"),
// and the segment arrives here as written, so it is decoded before it is looked
// up. A malformed escape is not worth throwing over - it simply will not match.
function readRequestedSlug(slug) {
  const value = String(slug || "");

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatPrice(basePrice) {
  if (basePrice === null || basePrice === undefined) {
    return "Price on request";
  }

  return `${Number(basePrice).toLocaleString()} THB`;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { product } = await getProductBySlug(readRequestedSlug(slug));

  if (!product) {
    return { title: "Maris Jewelry" };
  }

  const displayName = getPublicProductDisplayName(product);
  const collectionLabel = COLLECTION_LABELS[product.collection] || product.category || "Maris Jewelry";
  const productPath = getPublicProductPath(product);
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
  const requestedSlug = readRequestedSlug(slug);
  const { product } = await getProductBySlug(requestedSlug);

  if (!product) {
    notFound();
  }

  const canonicalSlug = getPublicProductSlug(product);

  // Legacy slugs and raw SKUs both resolve, so send them to the one canonical
  // path rather than serving the same piece under several URLs.
  if (canonicalSlug && requestedSlug !== canonicalSlug) {
    permanentRedirect(`/product/${canonicalSlug}`);
  }

  const { products: relatedProducts } = await readRelatedPublicProducts(product.collection, product.id);
  const collectionLabel = COLLECTION_LABELS[product.collection] || product.category || "Maris Jewelry";
  const displayName = getPublicProductDisplayName(product);
  const collectionLine = getMeaningfulText(product.collectionName);
  const productPath = getPublicProductPath(product);
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
            {/* The catalogue carries no per-product copy yet, so show the named
                collection when the record has one instead of repeating the title.
                Rows left blank store "-", which is not copy worth printing. */}
            {collectionLine && (
              <p className="product-description" data-product-description>
                {collectionLine}
              </p>
            )}

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
                <a key={item.id} className="also-card" href={getPublicProductPath(item)}>
                  {item.primaryImageUrl && (
                    <Image src={item.primaryImageUrl} alt={getPublicProductAltText(item)} width={1024} height={1024} sizes="(max-width: 900px) 50vw, 25vw" unoptimized={!isOptimizableImageSrc(item.primaryImageUrl)} />
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
