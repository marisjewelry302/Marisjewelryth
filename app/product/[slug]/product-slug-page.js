import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { readPublicProductBySlug, readRelatedPublicProducts } from "../../lib/maris-database.js";
import {
  getMeaningfulText,
  getPublicProductAltText,
  getPublicProductDisplayName,
  getPublicProductPath,
  getPublicProductSeoTitle,
  getPublicProductSlug,
  getPublicVariantDisplayName,
  groupProductImagesByMetal
} from "../../lib/product-display.js";
import JsonLd from "../../components/JsonLd";
import WishlistButton from "../../components/WishlistButton";
import ProductGallery from "./ProductGallery";
import { ProductContactLink, ProductMetalProvider, ProductMetalSelector } from "./ProductMetalContext";
import AddToBagButton from "./AddToBagButton";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildProductJsonLd
} from "../../lib/seo";
import { THAI_LOCALE, fill, localizePath } from "../../lib/i18n";
import { uiText } from "../../lib/ui-text";

import Image from "next/image";
import { isOptimizableImageSrc } from "../../lib/image-source";
import { formatGemCarat } from "../../lib/gem-report";
export const revalidate = 60;
const getProductBySlug = cache((slug) => readPublicProductBySlug(slug));

// Details of the piece as photographed. The metal is picked with the selector
// above, so it has no row; carat weight leads because buyers compare it first.
const PRODUCT_SPEC_KEYS = ["caratWeight", "stoneType", "stoneShape"];

// Every stone of the sample piece, from the gem report imported in the admin.
// A column only shows when some line fills it; the carat is the line's total,
// so the column adds up to the footer.
const GEM_REPORT_KEYS = ["stone", "shape", "size", "quantity", "caratTotal"];

function readGemReportCell(stone, key) {
  return key === "caratTotal" ? formatGemCarat(stone.caratTotal) : getMeaningfulText(stone[key]);
}

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

function formatPrice(basePrice, locale = "en") {
  const isThai = locale === THAI_LOCALE;

  if (basePrice === null || basePrice === undefined) {
    return isThai ? "สอบถามราคา" : "Price on request";
  }

  return `${Number(basePrice).toLocaleString()} ${isThai ? "บาท" : "THB"}`;
}

export async function buildProductMetadata({ params, locale = "en" }) {
  const copy = uiText[locale === THAI_LOCALE ? "th" : "en"];
  const { slug } = await params;
  const { product } = await getProductBySlug(readRequestedSlug(slug));

  if (!product) {
    return { title: "Maris Jewelry" };
  }

  const seoTitle = getPublicProductSeoTitle(product);
  const collectionLabel = copy.collections[product.collection]?.title || product.category || "Maris Jewelry";
  const productPath = getPublicProductPath(product);
  const metadata = buildPageMetadata({
    title: `${seoTitle} | Maris Jewelry`,
    description: fill(copy.product.metaDescription, { title: seoTitle, collection: collectionLabel }),
    path: productPath,
    image: product.primaryImageUrl || product.images?.[0]?.imageUrl,
    locale
  });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "website"
    }
  };
}

export async function generateMetadata({ params }) {
  return buildProductMetadata({ params });
}

export default async function ProductPage({ params }) {
  return ProductPageView({ params });
}

export async function ProductPageView({ params, locale = "en" }) {
  const copy = uiText[locale === THAI_LOCALE ? "th" : "en"];
  const t = copy.product;
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
    permanentRedirect(localizePath(`/product/${canonicalSlug}`, locale));
  }

  const { products: relatedProducts } = await readRelatedPublicProducts(product.collection, product.id, { sku: product.sku });
  const collectionLabel = copy.collections[product.collection]?.title || product.category || "Maris Jewelry";
  // What the bag and wishlist store: always the English title, so a saved piece reads the same in either language.
  const storedCollectionLabel = uiText.en.collections[product.collection]?.title || product.category || "Maris Jewelry";
  const displayName = getPublicProductDisplayName(product);
  const collectionLine = getMeaningfulText(product.collectionName);
  const productPath = getPublicProductPath(product);
  const productSpecs = PRODUCT_SPEC_KEYS
    .map((key) => ({ key, label: t.specs[key], value: getMeaningfulText(product.specs?.[key]) }))
    .filter((spec) => spec.value);
  const gemStones = product.gemReport?.stones || [];
  const gemColumns = GEM_REPORT_KEYS
    .filter((key) => gemStones.some((stone) => readGemReportCell(stone, key)))
    .map((key) => [key, t.gemColumns[key]]);
  const productDescription = getMeaningfulText(product.description);
  const imageSets = groupProductImagesByMetal(product.images, product.coverImageUrl);
  const metalOptions = imageSets.length > 1 ? imageSets.map(({ key, label }) => ({ key, label })) : [];
  const wishlistItem = {
    id: `${product.collection || storedCollectionLabel}:${product.sku}`,
    title: product.sku,
    details: [displayName],
    image: product.primaryImageUrl,
    href: productPath,
    collection: storedCollectionLabel,
    priceLabel: formatPrice(product.basePrice)
  };
  const productJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd([
        ...(product.collection ? [{ name: collectionLabel, path: `/category/${product.collection}` }] : []),
        { name: displayName, path: productPath }
      ], locale),
      buildProductJsonLd({ product, displayName, collectionLabel, locale })
    ]
  };

  return (
    <>
      <JsonLd data={productJsonLd} />
      <main id="main-content" className="product-page">
        <ProductMetalProvider initialKey={imageSets[0].key}>
          <div className="product-detail">
            <div className="product-gallery-column">
              <ProductGallery
                imageSets={imageSets}
                coverImageUrl={product.coverImageUrl}
                video={product.videoUrl ? { src: product.videoUrl, poster: product.videoPosterUrl, position: product.videoPosition } : null}
                productCode={product.sku}
                productName={displayName}
              />
            </div>

            <div className="product-summary">
              <p className="product-kicker" data-product-collection>{collectionLabel}</p>
              <h1 data-product-title>{product.sku}</h1>
              <h2 data-product-name>{displayName}</h2>
              {/* Rows left blank store "-", which is not copy worth printing. */}
              {collectionLine && (
                <p className="product-collection-line" data-product-collection-name>
                  {collectionLine}
                </p>
              )}

              <ProductMetalSelector metals={metalOptions} />

              {/* Every piece is made to order, so the specs describe the sample
                  and say plainly that each one can be changed. */}
              {(productSpecs.length > 0 || gemStones.length > 0) && (
                <section className="product-spec-block" aria-labelledby="product-specs-heading">
                  <p className="product-kicker" id="product-specs-heading">{t.sampleDetails}</p>
                  {productSpecs.length > 0 && (
                    <dl className="product-specs" data-product-specs>
                      {productSpecs.map((spec) => (
                        <div key={spec.key}>
                          <dt>{spec.label}</dt>
                          <dd>{spec.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {gemStones.length > 0 && (
                    <div className="product-gem-report" data-product-gem-report>
                      <table className="product-gem-table">
                        <caption>{t.stoneDetails}</caption>
                        <thead>
                          <tr>
                            {gemColumns.map(([key, label]) => (
                              <th key={key} scope="col" className={`is-${key}`}>{label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {gemStones.map((stone, index) => (
                            <tr key={index}>
                              {gemColumns.map(([key]) => (
                                <td key={key} className={`is-${key}`}>{readGemReportCell(stone, key)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                        {gemStones.length > 1 && (
                          <tfoot>
                            <tr>
                              {gemColumns.map(([key], columnIndex) => (
                                <td key={key} className={`is-${key}`}>
                                  {columnIndex === 0
                                    ? t.total
                                    : key === "quantity"
                                      ? product.gemReport.totalQuantity
                                      : key === "caratTotal"
                                        ? formatGemCarat(product.gemReport.totalCarat)
                                        : ""}
                                </td>
                              ))}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                  <p className="product-note product-spec-note" data-product-spec-note>
                    {t.sampleNote}
                  </p>
                </section>
              )}

              {productDescription && (
                <p className="product-description" data-product-description>
                  {productDescription}
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

              <p className="product-price" data-product-price>{formatPrice(product.basePrice, locale)}</p>

              <div className="product-actions">
                <AddToBagButton product={product} collectionLabel={storedCollectionLabel} />
                <WishlistButton item={wishlistItem} variant="action" />
                <ProductContactLink
                  className="product-action is-primary is-contact"
                  productCode={product.sku}
                  hasMetalChoice={metalOptions.length > 1}
                >
                  {t.contactToOrder}
                </ProductContactLink>
              </div>

              <p className="product-note">{t.availabilityNote}</p>

              {/* Maris makes to order, so these are agreed per client rather than
                  fixed on the page. Say where they are settled, promise nothing. */}
              <section className="product-spec-block product-enquiry-specs" aria-labelledby="product-enquiry-heading" data-product-enquiry-specs>
                <p className="product-kicker" id="product-enquiry-heading">{t.madeToSpec}</p>
                <dl className="product-specs">
                  {t.enquiry.map(([label, text]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{text}</dd>
                    </div>
                  ))}
                </dl>
                <p className="product-note product-spec-note">
                  {t.madeToSpecNote}
                </p>
              </section>
            </div>
          </div>
          <div className="product-sticky-cta">
            <ProductContactLink
              className="product-action is-primary is-contact"
              productCode={product.sku}
              hasMetalChoice={metalOptions.length > 1}
            >
              {t.contactToOrder}
            </ProductContactLink>
          </div>
        </ProductMetalProvider>

        <section className="product-promises" aria-labelledby="product-promises-heading" data-product-promises>
          <p className="product-kicker" id="product-promises-heading">{t.promisesLabel}</p>
          <ul className="product-promise-list">
            {t.promises.map(([title, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="product-extra" aria-label={t.infoLabel} data-product-extra>
          <div className="product-extra-media">
            <Image src="/assets/images/service/custom-jewelry-service-hero-02-seamless.webp" alt={t.infoImageAlt} fill sizes="(max-width: 900px) 100vw, 45vw" />
          </div>
          <div className="product-extra-list">
            {t.info.map((item) => (
              <details key={item.title} name="product-extra" open={item.open || undefined}>
                <summary>{item.title}</summary>
                <div className="product-extra-body">
                  <p>{item.text}</p>
                  {item.links && (
                    <p className="product-extra-links">
                      {item.links.map(([label, href]) => (
                        <a key={href} href={localizePath(href, locale)}>{label}</a>
                      ))}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="also-like" data-also-like-section>
            <h2>{t.alsoLike}</h2>
            <div className="also-grid" data-also-like>
              {relatedProducts.map((item) => (
                <a key={item.id} className="also-card" href={localizePath(getPublicProductPath(item), locale)}>
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
