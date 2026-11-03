import BestSellerSection from "./BestSellerSection";
import { HomeServiceStories, HomeContactSection } from "./HomeServices";
import serviceStyles from "./home-services.module.css";
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
    label: "Necklaces & Pendants",
    href: "/category/necklaces-pendants",
    image: "/assets/images/home/optimized/category-focus-pendants-pink-v2.webp",
    alt: "Pear-shaped diamond pendant on blush pink satin"
  },
  {
    label: "Bracelets & Bangles",
    href: "/category/bracelets",
    image: "/assets/images/home/optimized/category-focus-bracelets-pink-v2.webp",
    alt: "Diamond bracelet and rose gold bangle on blush pink satin"
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
            <a className="hero-primary" href="/category/wedding-set">Find Your Wedding Set</a>
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
              <Image src={item.image} alt={item.alt} width={480} height={480} sizes="(max-width: 700px) 50vw, 25vw" unoptimized={!isOptimizableImageSrc(item.image)} />
              <strong>{item.label}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="atelier-reveal" aria-label="New arrival catalogue">
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

      <HomeServiceStories />

      <section className="value-strip" aria-labelledby="value-heading">
        <div className="value-lead">
          <p className="section-kicker">Why Maris</p>
          <h2 id="value-heading">For your style, your story, and your brand.</h2>
          <p>
            Explore our collections, create a personal piece, or discuss jewelry for your business with the Maris team.
          </p>
        </div>

        <div className="value-list">
          <article className="value-card">
            <span aria-hidden="true">01</span>
            <h3><a className="value-card__link" href="#shop-category-heading">Signature collections <span aria-hidden="true">↗</span></a></h3>
            <p>Discover rings, earrings, pendants, and bracelets, with guidance on materials, sizing, and availability.</p>
          </article>
          <article className="value-card">
            <span aria-hidden="true">02</span>
            <h3><a className="value-card__link" href="/our-service">Custom &amp; bridal <span aria-hidden="true">↗</span></a></h3>
            <p>Share your ideas for a personal piece, engagement ring, or wedding bands and explore the details together.</p>
          </article>
          <article className="value-card">
            <span aria-hidden="true">03</span>
            <h3><a className="value-card__link" href="/oem-jewelry">OEM &amp; wholesale <span aria-hidden="true">↗</span></a></h3>
            <p>Discuss production for your brand or pieces for your store, with options shaped around your brief and quantities.</p>
          </article>
          <article className="value-card">
            <span aria-hidden="true">04</span>
            <h3><a className="value-card__link" href="/contact-us">Personal guidance <span aria-hidden="true">↗</span></a></h3>
            <p>Work through materials, pricing, and timing with our team before confirming your order or project.</p>
          </article>
        </div>
      </section>

      <section className="home-answer-guide" aria-labelledby="home-answer-guide-heading">
        <div className="home-answer-guide__intro">
          <p className="section-kicker">Maris answers</p>
          <h2 id="home-answer-guide-heading">How can we help you get started?</h2>
          <p>
            Find your next step, whether you are choosing from a collection, planning a custom piece, or sourcing for your business.
          </p>
        </div>

        <div className={serviceStyles.questions}>
          {HOME_FAQS.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <HomeContactSection />
      <HomeSignupPopup />
      </main>
    </>
  );
}
