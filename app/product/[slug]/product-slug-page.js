import { notFound } from "next/navigation";
import { readPublicProductBySlug, readRelatedPublicProducts } from "../../lib/maris-database.js";
import ProductGallery from "./ProductGallery";
import AddToBagButton from "./AddToBagButton";

export const revalidate = 60;
export const dynamic = "force-dynamic";

const COLLECTION_LABELS = {
  "engagement-ring": "Engagement Rings",
  "wedding-set": "Wedding Set",
  "wedding-bands": "Wedding Bands",
  "mens-wedding-bands": "Men's Rings",
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
  const { product } = await readPublicProductBySlug(slug);

  if (!product) {
    return { title: "Maris Jewelry" };
  }

  return {
    title: `${product.sku || product.name} | Maris Jewelry`,
    description: `${product.name} — ${COLLECTION_LABELS[product.collection] || "Maris Jewelry"}.`
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const { product } = await readPublicProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const { products: relatedProducts } = await readRelatedPublicProducts(product.collection, product.id);
  const collectionLabel = COLLECTION_LABELS[product.collection] || product.category || "Maris Jewelry";

  return (
    <div className="product-page">
      <div className="product-detail">
        <div className="product-gallery-column">
          <ProductGallery images={product.images} productCode={product.sku} productName={product.name} />
        </div>

        <div className="product-summary">
          <p className="product-kicker" data-product-collection>{collectionLabel}</p>
          <h1 data-product-title>{product.sku}</h1>
          <h2 data-product-name>{product.name}</h2>
          <p className="product-description" data-product-description>
            {product.name}
          </p>

          {product.variants.length > 0 && (
            <ul className="product-details-list" data-product-details>
              {product.variants.map((variant) => (
                <li key={variant.id}>
                  {variant.variantName || variant.material || variant.sku}
                  {variant.size ? ` — Size ${variant.size}` : ""}
                </li>
              ))}
            </ul>
          )}

          <p className="product-price" data-product-price>{formatPrice(product.basePrice)}</p>

          <div className="product-actions">
            <AddToBagButton product={product} collectionLabel={collectionLabel} />
            <a
              className="product-action is-primary"
              href={`/request-quote?collection=${encodeURIComponent(product.collection)}&id=${encodeURIComponent(product.sku)}`}
            >
              Confirm Availability
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
                  <img src={item.primaryImageUrl} alt={`${item.sku} ${item.name}`} />
                )}
                <span>{item.sku}</span>
                <small>{item.name}</small>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
