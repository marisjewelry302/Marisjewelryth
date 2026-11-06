import BestSellerSection from "../BestSellerSection";
import { HomeServiceStories, HomeContactSection } from "../HomeServices";
import serviceStyles from "../home-services.module.css";
import { isOptimizableImageSrc } from "../lib/image-source";
import Image from "next/image";
import HeroSlider from "../HeroSlider";
import HomeSignupPopup from "../HomeSignupPopup";
import JsonLd from "./JsonLd";
import { HOME_FAQS_TH, homeCopy } from "../lib/home-copy";
import { THAI_LOCALE, localizePath } from "../lib/i18n";
import { readPublicBestSellerProducts, readPublicCatalogueProducts } from "../lib/maris-database.js";
import { getPublicProductDisplayName, getPublicProductPath } from "../lib/product-display.js";
import {
  HOME_FAQS,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd
} from "../lib/seo";

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

const atelierFallbackHrefs = ["/category/engagement-ring", "/request-quote", "/about-us"];

const shopCategoryItems = [
  { href: "/category/rings", image: "/assets/images/home/optimized/category-focus-rings-box-v3.webp" },
  { href: "/category/earrings", image: "/assets/images/home/optimized/category-focus-earrings-scene-v6.webp" },
  { href: "/category/necklaces-pendants", image: "/assets/images/home/optimized/category-focus-pendants-scene-v6.webp" },
  { href: "/category/bracelets", image: "/assets/images/home/optimized/category-focus-bracelets-scene-v6.webp" }
];

const valueHrefs = ["#shop-category-heading", "/our-service", "/oem-jewelry", "/contact-us"];

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

// Shared by / and /th. Product names come from the catalogue and are not
// translated yet, so product links keep their English path.
export default async function HomeView({ locale = "en" }) {
  const isThai = locale === THAI_LOCALE;
  const c = homeCopy[isThai ? "th" : "en"];
  const faqs = isThai ? HOME_FAQS_TH : HOME_FAQS;
  const link = (path) => localizePath(path, locale);
  const valueLinks = valueHrefs.map((href) => (href.startsWith("#") ? href : link(href)));
  const [featuredProducts, bestSellerProducts] = await Promise.all([
    getFeaturedProducts(),
    getBestSellerProducts()
  ]);
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd([{ name: isThai ? "หน้าแรก" : "Home", path: "/" }], locale),
      buildFaqPageJsonLd(faqs, locale)
    ]
  };

  return (
    <>
      <link rel="preload" as="image" href={heroSlides[0].image} type="image/webp" fetchPriority="high" />
      <JsonLd data={homeJsonLd} />
      <main id="main-content" className="home-main site-main">
      <section className="hero">
        <div className="hero-utility-bar" aria-label={c.highlightsLabel}>
          <span>{c.highlights[0]}</span>
          <span className="hero-utility-bar__divider" aria-hidden="true" />
          <span>{c.highlights[1]}</span>
          <span className="hero-utility-bar__divider" aria-hidden="true" />
          <span>{c.highlights[2]}</span>
        </div>

        <HeroSlider slides={heroSlides} />

        <div className="hero-content">
          <p className="hero-eyebrow">{c.heroEyebrow}</p>
          <h1>{c.heroTitle}</h1>
          <p className="hero-tagline">{c.heroTagline}</p>
          <div className="hero-actions">
            <a className="hero-primary" href={link("/category/wedding-set")}>{c.heroPrimary}</a>
            <a className="hero-secondary" href={link("/about-us")}>{c.heroSecondary}</a>
          </div>
        </div>
      </section>

      <section className="shop-category-section" aria-labelledby="shop-category-heading">
        <div className="shop-category-head">
          <h2 id="shop-category-heading">{c.shopHeading}</h2>
          <span aria-hidden="true" />
          <p>{c.shopLead}</p>
        </div>

        <div className="shop-category-grid">
          {shopCategoryItems.map((item, index) => (
            <a className="shop-category-card" href={link(item.href)} key={item.href}>
              <Image src={item.image} alt={c.categories[index].alt} width={480} height={480} sizes="(max-width: 700px) 50vw, 25vw" unoptimized={!isOptimizableImageSrc(item.image)} />
              <strong>{c.categories[index].label}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="atelier-reveal" aria-label={c.catalogueLabel}>
        <div className="atelier-reveal__panel">
          <div className="atelier-reveal__focus">
            <h2>{featuredProducts.length ? c.newArrival : c.catalogueFallback}</h2>
            <span className="atelier-reveal__heading-rule" aria-hidden="true" />
            <p>{c.availabilityNote}</p>
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
                    <span className="atelier-product__image-fallback">{c.imageSoon}</span>
                  )}
                  <span className="atelier-product__meta">
                    <span>{product.sku}</span>
                    <strong>{getAtelierProductLabel(product)}</strong>
                  </span>
                </a>
              ))
            ) : (
              atelierFallbackHrefs.map((cardHref, index) => (
                <a
                  key={cardHref}
                  className="atelier-product atelier-product--fallback"
                  href={link(cardHref)}
                  style={{ "--atelier-delay": `${index * 90}ms` }}
                >
                  <span className="atelier-product__image-fallback">{c.imageSoon}</span>
                  <span className="atelier-product__meta">
                    <span>{c.fallbackCards[index].kicker}</span>
                    <strong>{c.fallbackCards[index].title}</strong>
                  </span>
                </a>
              ))
            )}
          </div>
        </div>
      </section>

      <BestSellerSection items={bestSellerProducts} />

      <HomeServiceStories locale={locale} />

      <section className="value-strip" aria-labelledby="value-heading">
        <div className="value-lead">
          <p className="section-kicker">{c.whyKicker}</p>
          <h2 id="value-heading">{c.whyHeading}</h2>
          <p>{c.whyLead}</p>
        </div>

        <div className="value-list">
          {c.values.map((item, index) => (
            <article className="value-card" key={item.title}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <h3><a className="value-card__link" href={valueLinks[index]}>{item.title} <span aria-hidden="true">↗</span></a></h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="product-promises is-home" aria-labelledby="home-promises-heading">
        <p className="section-kicker" id="home-promises-heading">{c.promisesKicker}</p>
        <ul className="product-promise-list">
          {c.promises.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-answer-guide" aria-labelledby="home-answer-guide-heading">
        <div className="home-answer-guide__intro">
          <p className="section-kicker">{c.answersKicker}</p>
          <h2 id="home-answer-guide-heading">{c.answersHeading}</h2>
          <p>{c.answersLead}</p>
        </div>

        <div className={serviceStyles.questions}>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <HomeContactSection locale={locale} />
      <HomeSignupPopup />
      </main>
    </>
  );
}
