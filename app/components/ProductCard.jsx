import { formatProductPrice } from "../lib/collections";
import { getPublicProductAltText, getPublicProductDisplayName } from "../lib/product-display";
import WishlistButton from "./WishlistButton";

function getProductHref(product) {
  return `/product/${product.slug || product.sku}`;
}

export default function ProductCard({ product, collectionLabel }) {
  const href = getProductHref(product);
  const displayName = getPublicProductDisplayName(product);
  const productCode = product.sku || displayName;
  const wishlistItem = {
    id: `${product.collection || collectionLabel}:${productCode}`,
    title: productCode,
    details: [displayName],
    image: product.primaryImageUrl || "/assets/images/logo.png",
    href,
    collection: collectionLabel,
    priceLabel: formatProductPrice(product.basePrice)
  };

  return (
    <article
      className="product-card is-clickable"
      data-code={productCode}
      data-carat={product.searchCarat || ""}
      data-metal={product.searchText || ""}
      data-filters={product.searchText || ""}
    >
      <a className="product-card-link" href={href} aria-label={`View ${productCode} ${displayName}`}>
        <img
          src={product.primaryImageUrl || "/assets/images/logo.png"}
          alt={getPublicProductAltText(product)}
          loading="lazy"
          decoding="async"
        />
      </a>
      <WishlistButton item={wishlistItem} />
      <div className="product-info">
        <h3>{productCode}</h3>
        <p>{displayName}</p>
        <p>{formatProductPrice(product.basePrice)}</p>
      </div>
    </article>
  );
}
