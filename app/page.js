import BestSellerSection from "./BestSellerSection";
import { isOptimizableImageSrc } from "./lib/image-source";
import Image from "next/image";
import HeroSlider from "./HeroSlider";
import HomeSignupPopup from "./HomeSignupPopup";
import JsonLd from "./components/JsonLd";
import { readPublicBestSellerProducts, readPublicCatalogueProducts } from "./lib/maris-database.js";
import { getPublicProductDisplayName, getPublicProductPath } from "./lib/product-display.js";
import {
  HOME_FAQS,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildPageMetadata
} from "./lib/seo";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: "Maris Jewelry | Bangkok Fine Jewelry Atelier",
  description:
    "Browse engagement rings, wedding bands, fine jewelry, and custom design guidance from Maris Jewelry, a Bangkok atelier for catalogue inquiries and private requests.",
  path: "/"
});

const heroSlides = [
  {
    id: "hero-1",
    label: "01",
    image: "/assets/images/home/optimized/home-hero-optimized.webp",
    positionStart: "62% 50%",
    positionEnd: "58% 52%"
  },
  {
    id: "hero-2",
    label: "02",
    image: "/assets/images/service/custom-jewelry-service-hero-02-seamless.webp",
    positionStart: "50% 50%",
    positionEnd: "50% 50%"
  },
  {
    id: "hero-3",
    label: "03",
    image: "/assets/images/home/optimized/home-hero-pendant-earrings.webp",
    positionStart: "50% 50%",
    positionEnd: "46% 52%"
  }
];

const atelierFallbackCards = [
  {
    href: "/category/engagement-ring",
    kicker: "Catalogue slot",
    title: "Engagement selection"
  },
  {
    href: "/request-quote",
    kicker: "Private request",
    title: "Availability review"
  },
  {
    href: "/about-us",
    kicker: "Maris atelier",
    title: "Custom conversation"
  }
];

const shopCategoryItems = [
  {
    label: "Rings",
    href: "/category/rings",
    image: "/assets/images/home/optimized/category-focus-rings-pink-v2.webp",
    alt: "Diamond rings arranged on blush pink satin"
  },
  {
    label: "Earrings",
    href: "/category/earrings",
    image: "/assets/images/home/optimized/category-focus-earrings-pink-v2.webp",
    alt: "Pear-shaped diamond earrings on blush pink satin"
  },
  {
    label: "Pendants",
    href: "/category/necklaces-pendants",
    image: "/assets/images/home/optimized/category-focus-pendants-pink-v2.webp",
    alt: "Pear-shaped diamond pendant on blush pink satin"
  },
  {
    label: "Bracelets & Bangles",
    href: "/category/bracelets",
    image: "/assets/images/home/optimized/category-focus-bracelets-pink-v2.webp",
    alt: "Diamond bracelet and rose gold bangle on blush pink satin"
  },
  {
    label: "Necklaces",
    href: "/category/necklaces-pendants",
    image: "/assets/images/home/optimized/category-focus-necklaces-pink-v2.webp",
    alt: "Rose gold diamond necklace on blush pink satin"
  }
];

function getAtelierProductLabel(product) {
  return getPublicProductDisplayName(product);
}

async function getFeaturedProducts() {
  try {
    const result = await readPublicCatalogueProducts({ limit: 6 });
    return result.products.slice(0, 3);
  } catch (error) {
    return [];
  }
}

async function getBestSellerProducts() {
  try {
    const result = await readPublicBestSellerProducts({ limit: 7 });
    return result.products;
  } catch (error) {
    return [];
  }
}

export default async function HomePage() {
  const [featuredProducts, bestSellerProducts] = await Promise.all([
    getFeaturedProducts(),
    getBestSellerProducts()
  ]);
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd([{ name: "Home", path: "/" }]),
      buildFaqPageJsonLd(HOME_FAQS)
    ]
  };

  return (
    <>
      <link rel="preload" as="image" href={heroSlides[0].image} type="image/webp" fetchPriority="high" />
      <JsonLd data={homeJsonLd} />
      <main className="home-main site-main">
      <section className="hero">
        <div className="hero-utility-bar" aria-label="Maris highlights">
          <span>Bangkok atelier</span>
          <span className="hero-utility-bar__divider" aria-hidden="true" />
          <span>Fine jewelry</span>
          <span className="hero-utility-bar__divider" aria-hidden="true" />
          <span>Custom design</span>
        </div>

        <HeroSlider slides={heroSlides} />

        <div className="hero-content">
          <p className="hero-eyebrow">Fine Jewelry • Bangkok</p>
          <h1>Crafted for the moments that become forever.</h1>
          <p className="hero-tagline">
            Quietly elegant diamond jewelry for proposals, vows, and the intimate milestones held closest to the heart.
          </p>
          <div className="hero-actions">
            <a className="hero-primary" href="/category/engagement-ring">Find Your Engagement Ring</a>
            <a className="hero-secondary" href="/design-your-ring">Design Your Ring</a>
            <a className="hero-secondary" href="/about-us">Discover Maris</a>
          </div>
        </div>
      </section>

      <section className="shop-category-section" aria-labelledby="shop-category-heading">
        <div className="shop-category-head">
          <h2 id="shop-category-heading">Shop By Category</h2>
          <span aria-hidden="true" />
          <p>From classic earstuds to chandeliers, from timeless bracelet to chic bangles. Shop our wide selection of jewelry</p>
        </div>

        <div className="shop-category-grid">
          {shopCategoryItems.map((item) => (
            <a className="shop-category-card" href={item.href} key={item.label}>
              <Image src={item.image} alt={item.alt} width={480} height={360} sizes="(max-width: 700px) 50vw, 25vw" unoptimized={!isOptimizableImageSrc(item.image)} />
              <strong>{item.label}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="home-collection-showcase" aria-label="Shop signature collections">
        <div className="home-collection-grid">
          <a className="home-collection-card home-collection-card--rings" href="/category/rings">
            <span className="home-collection-card__title">Signature Rings</span>
            <Image
              className="home-collection-card__image"
              src="/assets/images/home/collections/cover-rings-collection.webp"
              alt="A diamond ring on dark brown satin"
              width={1254}
              height={1254}
              sizes="(max-width: 900px) 100vw, 50vw"
            />
            <span className="home-collection-card__action">View Collection</span>
          </a>

          <a className="home-collection-card home-collection-card--pendants" href="/category/necklaces-pendants">
            <span className="home-collection-card__title">Elegant Pendants</span>
            <Image
              className="home-collection-card__image"
              src="/assets/images/home/collections/cover-pendants-collection.webp"
              alt="A pear-shaped diamond pendant on champagne satin"
              width={1254}
              height={1254}
              sizes="(max-width: 900px) 100vw, 50vw"
            />
            <span className="home-collection-card__action">View Collection</span>
          </a>
        </div>
      </section>

      <section className="atelier-reveal" aria-label="New arrival catalogue">
        <div className="atelier-reveal__stage" aria-hidden="true">
          <span className="atelier-reveal__line" />
          <span className="atelier-reveal__stone" />
          <span className="atelier-reveal__line" />
        </div>

        <div className="atelier-reveal__panel">
          <div className="atelier-reveal__focus">
            <h2>{featuredProducts.length ? "New arrival" : "Maris catalogue preview"}</h2>
            <span className="atelier-reveal__heading-rule" aria-hidden="true" />
            <p>
              Product availability is confirmed personally by the atelier before order details are finalized.
            </p>
          </div>

          <div className="atelier-product-grid">
            {featuredProducts.length ? (
              featuredProducts.map((product, index) => (
                <a
                  key={product.id}
                  className="atelier-product"
                  href={getPublicProductPath(product)}
                  style={{ "--atelier-delay": `${index * 90}ms` }}
                >
                  {product.primaryImageUrl ? (
                    <Image src={product.primaryImageUrl} alt={`${product.sku || "Maris"} ${getAtelierProductLabel(product)}`} width={1024} height={1024} sizes="(max-width: 900px) 50vw, 25vw" unoptimized={!isOptimizableImageSrc(product.primaryImageUrl)} />
                  ) : (
                    <span className="atelier-product__image-fallback">Image coming soon</span>
                  )}
                  <span className="atelier-product__meta">
                    <span>{product.sku}</span>
                    <strong>{getAtelierProductLabel(product)}</strong>
                  </span>
                </a>
              ))
            ) : (
              atelierFallbackCards.map((card, index) => (
                <a
                  key={card.href}
                  className="atelier-product atelier-product--fallback"
                  href={card.href}
                  style={{ "--atelier-delay": `${index * 90}ms` }}
                >
                  <span className="atelier-product__image-fallback">Image coming soon</span>
                  <span className="atelier-product__meta">
                    <span>{card.kicker}</span>
                    <strong>{card.title}</strong>
                  </span>
                </a>
              ))
            )}
          </div>
        </div>
      </section>

      <BestSellerSection items={bestSellerProducts} />

      <section className="value-strip" aria-labelledby="value-heading">
        <div className="value-lead">
          <p className="section-kicker">Why Maris</p>
          <h2 id="value-heading">Quiet support from first idea to final piece.</h2>
          <p>
            Guided choices, clear options, and fine jewelry made to stay wearable beyond the moment.
          </p>
        </div>

        <div className="value-list">
          <article className="value-card">
            <span aria-hidden="true">01</span>
            <h3>Custom-ready</h3>
            <p>Adjust proportion, metal tone, and details to fit the mood you want.</p>
          </article>
          <article className="value-card">
            <span aria-hidden="true">02</span>
            <h3>Material guidance</h3>
            <p>Compare stones and metals by presence, price, and daily wearability.</p>
          </article>
          <article className="value-card">
            <span aria-hidden="true">03</span>
            <h3>Availability checks</h3>
            <p>Confirm stock, sizing, and timing with the atelier before ordering.</p>
          </article>
          <article className="value-card">
            <span aria-hidden="true">04</span>
            <h3>Partner support</h3>
            <p>Begin OEM, wholesale, or retail conversations from one clear catalogue base.</p>
          </article>
        </div>
      </section>

      <section className="home-answer-guide" aria-labelledby="home-answer-guide-heading">
        <div className="home-answer-guide__intro">
          <p className="section-kicker">Maris answers</p>
          <h2 id="home-answer-guide-heading">Clear answers before you choose a piece.</h2>
          <p>
            A calm starting point for buyers comparing engagement rings, custom work, availability, and the right way to begin.
          </p>
        </div>

        <div className="home-answer-guide__grid">
          {HOME_FAQS.map((faq) => (
            <article className="home-answer-guide__item" key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <HomeSignupPopup />
      </main>
    </>
  );
}
