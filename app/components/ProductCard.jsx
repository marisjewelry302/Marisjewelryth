import { formatProductPrice } from "../lib/collections";
import { getPublicProductAltText, getPublicProductDisplayName } from "../lib/product-display";
import WishlistButton from "./WishlistButton";

const FALLBACK_IMAGE = "/assets/images/logo.png";

function getProductHref(product) {
  return `/product/${product.slug || product.sku}`;
}

function getImageSource(image) {
  if (typeof image === "string") {
    return image.trim();
  }

  return String(image?.imageUrl || image?.src || image?.url || "").trim();
}

function getHoverImageSource(product, primaryImage) {
  const galleryImages = Array.isArray(product.images)
    ? product.images.map(getImageSource)
    : [];
  const candidates = [
    product.hover,
    product.hoverImageUrl,
    ...galleryImages
  ].map((image) => String(image || "").trim());

  return candidates.find((image) => image && image !== primaryImage) || "";
}

export default function ProductCard({ product, collectionLabel }) {
  const href = getProductHref(product);
  const displayName = getPublicProductDisplayName(product);
  const productCode = product.sku || displayName;
  const primaryImage = product.primaryImageUrl || product.image || FALLBACK_IMAGE;
  const hoverImage = getHoverImageSource(product, primaryImage);
  const hasHoverImage = Boolean(hoverImage);
  const wishlistItem = {
    id: `${product.collection || collectionLabel}:${productCode}`,
    title: productCode,
    details: [displayName],
    image: primaryImage,
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
      <a className={`product-card-link${hasHoverImage ? " has-hover-image" : ""}`} href={href} aria-label={`View ${productCode} ${displayName}`}>
        <span className="product-card-image-frame">
          <img
            className="product-card-image product-card-image-primary"
            src={primaryImage}
            alt={getPublicProductAltText(product)}
            loading="lazy"
            decoding="async"
          />
          {hasHoverImage ? (
            <img
              className="product-card-image product-card-image-hover"
              src={hoverImage}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </span>
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
