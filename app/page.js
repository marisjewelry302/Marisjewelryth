import BestSellerSection from "./BestSellerSection";
import HeroSlider from "./HeroSlider";
import HomeSignupPopup from "./HomeSignupPopup";
import { readPublicCatalogueProducts } from "./lib/maris-database.js";
import { getPublicProductDisplayName } from "./lib/product-display.js";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const heroSlides = [
  {
    id: "hero-1",
    label: "01",
    image: "/assets/images/home/optimized/home-hero-optimized.png",
    positionStart: "62% 50%",
    positionEnd: "58% 52%"
  },
  {
    id: "hero-2",
    label: "02",
    image: "/assets/images/service/custom-jewelry-service-hero-02-seamless.png",
    positionStart: "50% 50%",
    positionEnd: "50% 50%"
  },
  {
    id: "hero-3",
    label: "03",
    image: "/assets/images/home/optimized/home-hero-pendant-earrings.png",
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

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts();

  return (
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

      <section className="home-collection-showcase" aria-label="Shop signature collections">
        <div className="home-collection-grid">
          <a className="home-collection-card home-collection-card--rings" href="/category/rings">
            <span className="home-collection-card__title">Signature Rings</span>
            <img
              className="home-collection-card__image"
              src="/assets/images/home/collections/cover-rings-collection.png"
              alt="A diamond ring on dark brown satin"
            />
            <span className="home-collection-card__action">View Collection</span>
          </a>

          <a className="home-collection-card home-collection-card--pendants" href="/category/necklaces-pendants">
            <span className="home-collection-card__title">Elegant Pendants</span>
            <img
              className="home-collection-card__image"
              src="/assets/images/home/collections/cover-pendants-collection.png"
              alt="A pear-shaped diamond pendant on champagne satin"
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
            <h3>{featuredProducts.length ? "New arrival" : "Maris catalogue preview"}</h3>
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
                  href={`/product/${product.slug || product.sku}`}
                  style={{ "--atelier-delay": `${index * 90}ms` }}
                >
                  {product.primaryImageUrl ? (
                    <img src={product.primaryImageUrl} alt={`${product.sku || "Maris"} ${getAtelierProductLabel(product)}`} />
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

      <BestSellerSection />

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

      <HomeSignupPopup />
    </main>
  );
}
