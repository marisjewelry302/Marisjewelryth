import { formatProductPrice } from "../lib/collections";
import WishlistButton from "./WishlistButton";

function getProductHref(product) {
  return `/product/${product.slug || product.sku}`;
}

export default function ProductCard({ product, collectionLabel }) {
  const href = getProductHref(product);
  const wishlistItem = {
    id: `${product.collection || collectionLabel}:${product.sku}`,
    title: product.sku || product.name,
    details: [product.name].filter(Boolean),
    image: product.primaryImageUrl || "/assets/images/logo.png",
    href,
    collection: collectionLabel,
    priceLabel: formatProductPrice(product.basePrice)
  };

  return (
    <article
      className="product-card is-clickable"
      data-code={product.sku}
      data-carat={product.searchCarat || ""}
      data-metal={product.searchText || ""}
      data-filters={product.searchText || ""}
    >
      <a className="product-card-link" href={href} aria-label={`View ${product.sku || product.name}`}>
        <img
          src={product.primaryImageUrl || "/assets/images/logo.png"}
          alt={`${product.sku || "Maris"} ${product.name || "Jewelry"}`}
          loading="lazy"
          decoding="async"
        />
      </a>
      <WishlistButton item={wishlistItem} />
      <div className="product-info">
        <h3>{product.sku || product.name}</h3>
        {product.name && <p>{product.name}</p>}
        <p>{formatProductPrice(product.basePrice)}</p>
      </div>
    </article>
  );
}
