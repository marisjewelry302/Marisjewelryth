import CategoryHoverCard from "./CategoryHoverCard";
import HeroSlider from "./HeroSlider";
import { readPublicCatalogueProducts } from "./lib/maris-database.js";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const heroSlides = [
  {
    id: "hero-1",
    label: "01",
    image: "/assets/images/home/optimized/home-hero-optimized.jpg",
    positionStart: "50% 50%",
    positionEnd: "46% 52%"
  },
  {
    id: "hero-2",
    label: "02",
    image: "/assets/images/home/optimized/home-hero-optimized.jpg",
    positionStart: "68% 48%",
    positionEnd: "62% 52%"
  },
  {
    id: "hero-3",
    label: "03",
    image: "/assets/images/home/optimized/home-hero-optimized.jpg",
    positionStart: "34% 52%",
    positionEnd: "40% 50%"
  }
];

const categoryCards = [
  {
    href: "/category/necklaces-pendants",
    className: "category-card category-card--necklaces",
    imageSrc: "/assets/images/home/optimized/category-focus-necklaces-landscape-v1.jpg",
    imageAlt: "Necklaces and pendants", 
    title: "Necklaces & Pendants",
    ctaLabel: "View"
  },
  {
    href: "/category/rings",
    className: "category-card category-card--rings",
    imageSrc: "/assets/images/home/optimized/category-focus-rings-landscape-v1.jpg",
    imageAlt: "Rings",
    title: "Rings",
    ctaLabel: "View"
  },
  {
    href: "/category/earrings",
    className: "category-card category-card--earrings",
    imageSrc: "/assets/images/home/optimized/category-focus-earrings-landscape-v1.jpg",
    imageAlt: "Earrings",
    title: "Earrings",
    ctaLabel: "View"
  },
  {
    href: "/category/bracelets",
    className: "category-card category-card--bracelets",
    imageSrc: "/assets/images/home/optimized/category-focus-bracelets-landscape-v1.jpg",
    imageAlt: "Bracelets",
    title: "Bracelets",
    ctaLabel: "View"
  }
];

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
            <a className="hero-secondary" href="/about-us">Discover Maris</a>
          </div>
        </div>
      </section>

      <section className="atelier-reveal" aria-labelledby="atelier-heading">
        <div className="atelier-reveal__stage" aria-hidden="true">
          <span className="atelier-reveal__line" />
          <span className="atelier-reveal__stone" />
          <span className="atelier-reveal__line" />
        </div>

        <div className="atelier-reveal__copy">
          <p className="section-kicker">From the atelier</p>
          <h2 id="atelier-heading">Pieces selected with calm detail.</h2>
          <p>
            Explore current Maris Jewelry pieces and move into a quote request when a design feels right.
          </p>
          <div className="atelier-reveal__actions">
            <a href="/category/engagement-ring">View engagement rings</a>
            <a href="/request-quote">Request availability</a>
          </div>
        </div>

        <div className="atelier-reveal__panel">
          <div className="atelier-reveal__focus">
            <p className="atelier-reveal__status">Available catalogue</p>
            <h3>{featuredProducts.length ? "Recently added pieces" : "Maris catalogue preview"}</h3>
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
                    <img src={product.primaryImageUrl} alt={`${product.sku} ${product.name}`} />
                  ) : (
                    <span className="atelier-product__image-fallback">Image coming soon</span>
                  )}
                  <span className="atelier-product__meta">
                    <span>{product.sku}</span>
                    <strong>{product.name}</strong>
                  </span>
                </a>
              ))
            ) : (
              categoryCards.slice(0, 3).map((card, index) => (
                <a
                  key={card.href}
                  className="atelier-product"
                  href={card.href}
                  style={{ "--atelier-delay": `${index * 90}ms` }}
                >
                  <img src={card.imageSrc} alt={card.imageAlt} />
                  <span className="atelier-product__meta">                    <span>{card.order}</span>
                    <strong>{card.title}</strong>
                  </span>
                </a>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="category-section" aria-labelledby="category-heading">
        <div className="category-section-head">
          <div className="category-copy">
            <p className="section-kicker">Collections</p>
            <h2 id="category-heading">Fine jewelry by the way it is worn.</h2>
            <p className="category-intro">
              Move from everyday gifting to proposal pieces, wedding bands, and private custom conversations.
            </p>
          </div>
          <a className="category-feature-link" href="/category/engagement-ring">
            <span>Start here</span>
            <strong>Engagement Rings</strong>
            <span>Explore</span>
          </a>
        </div>

        <div className="category-grid">
          {categoryCards.map((card) => (
            <CategoryHoverCard key={card.href} {...card} />
          ))}
        </div>
      </section>

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
    </main>
  );
}
