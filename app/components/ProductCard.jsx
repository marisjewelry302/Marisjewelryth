import Image from "next/image";
import { formatProductPrice } from "../lib/collections";
import { isOptimizableImageSrc } from "../lib/image-source";
import { formatPublicProductCode, getPublicProductAltText, getPublicProductDisplayName } from "../lib/product-display";
import WishlistButton from "./WishlistButton";

// Catalogue photography is square; the card frame fixes both axes in CSS, so
// these values only reserve the right aspect ratio before the file arrives.
const CARD_IMAGE_SIZE = 1024;
const CARD_IMAGE_SIZES = "(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw";

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
          <Image
            className="product-card-image product-card-image-primary"
            src={primaryImage}
            alt={getPublicProductAltText(product)}
            width={CARD_IMAGE_SIZE}
            height={CARD_IMAGE_SIZE}
            sizes={CARD_IMAGE_SIZES}
            unoptimized={!isOptimizableImageSrc(primaryImage)}
          />
          {hasHoverImage ? (
            <Image
              className="product-card-image product-card-image-hover"
              src={hoverImage}
              alt=""
              aria-hidden={true}
              width={CARD_IMAGE_SIZE}
              height={CARD_IMAGE_SIZE}
              sizes={CARD_IMAGE_SIZES}
              unoptimized={!isOptimizableImageSrc(hoverImage)}
            />
          ) : null}
        </span>
      </a>
      <WishlistButton item={wishlistItem} />
      <div className="product-info">
        <h3>{formatPublicProductCode(productCode)}</h3>
        <p>{displayName}</p>
        <p>{formatProductPrice(product.basePrice)}</p>
      </div>
    </article>
  );
}
