import { readPublicCatalogueProducts } from "./lib/maris-database.js";
import HeroSlider from "./HeroSlider";
import CategoryHoverCard from "./CategoryHoverCard";

export const revalidate = 60;

const HERO_SLIDES = [
  { id: "hero-1", image: "/assets/images/home/optimized/hero-slide-1.jpg", label: "Engagement" },
  { id: "hero-2", image: "/assets/images/home/optimized/hero-slide-2.jpg", label: "Wedding" }
];

const CATEGORY_CARDS = [
  {
    key: "necklaces",
    href: "/pages/necklaces-pendants.html",
    title: "Necklaces & Pendants",
    image: "/assets/images/home/optimized/category-focus-necklaces-landscape-v1.jpg",
    order: "01"
  },
  {
    key: "rings",
    href: "/pages/rings.html",
    title: "Rings",
    image: "/assets/images/home/optimized/category-focus-rings-landscape-v1.jpg",
    order: "02"
  },
  {
    key: "earrings",
    href: "/pages/earrings.html",
    title: "Earrings",
    image: "/assets/images/home/optimized/category-focus-earrings-landscape-v1.jpg",
    order: "03"
  },
  {
    key: "bracelets",
    href: "/pages/bracelets.html",
    title: "Bracelets",
    image: "/assets/images/home/optimized/category-focus-bracelets-landscape-v1.jpg",
    order: "04"
  }
];

const VALUE_CARDS = [
  { title: "Ethically Crafted", body: "Designed with care and made to feel timeless." },
  { title: "Expert Craftsmanship", body: "Refined by skilled artisans with a meticulous eye." },
  { title: "Bespoke Design", body: "Custom jewelry shaped around your vision." },
  { title: "OEM & Wholesale", body: "Flexible production for private label and retail partners." }
];

function formatProductTitle(product) {
  return product.name || product.sku || "Maris piece";
}

export default async function HomePage() {
  const catalogue = await readPublicCatalogueProducts({ limit: 6 });
  const products = catalogue.status === "ready" ? catalogue.products : [];
  const featured = products.slice(0, 3);

  return (
    <main>
      <section className="hero">
        <HeroSlider slides={HERO_SLIDES} />

        <div className="hero-utility-bar">
          <span>Custom Design Available</span>
          <span className="hero-utility-bar__divider" />
          <span>OEM &amp; Wholesale</span>
        </div>

        <header className="hero-header">
          <p className="hero-eyebrow">Fine Jewelry • Bangkok</p>
          <div className="logo">
            <a href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/images/logo.png" alt="Maris Jewelry Logo" />
            </a>
          </div>
        </header>

        <div className="hero-corner">
          <div className="hero-icons">
            <a href="/pages/wishlist.html" aria-label="Wishlist">♡</a>
            <a href="/pages/shopping-bag.html" aria-label="Shopping bag">🛍</a>
          </div>
        </div>

        <div className="hero-content">
          <h1>Crafted for the moments that become forever.</h1>
          <p className="hero-tagline">Quiet diamond jewelry for proposals, vows, and moments that stay.</p>
          <div className="hero-actions">
            <a className="hero-primary" href="/pages/engagement-ring.html">Find Your Ring</a>
            <a className="hero-secondary" href="/pages/about-us.html">About Maris</a>
          </div>
        </div>
      </section>

      <section className="atelier-reveal" data-atelier-reveal>
        <div className="atelier-reveal__copy">
          <p className="section-kicker">Atelier Preview</p>
          <h2>A quiet tray of Maris pieces.</h2>
          <p>Browse selected pieces, then enquire before ordering.</p>
        </div>

        <div className="atelier-reveal__panel">
          <div className="atelier-reveal__focus" data-atelier-focus>
            {featured.length > 0 ? (
              <>
                <p className="atelier-reveal__status">{products.length} catalogue piece{products.length === 1 ? "" : "s"}</p>
                <p className="atelier-reveal__label">{featured[0].collection || "Maris"}</p>
                <h3>{formatProductTitle(featured[0])}</h3>
                <p>{featured[0].basePrice ? `${Number(featured[0].basePrice).toLocaleString()} THB` : "Price on request."}</p>
              </>
            ) : (
              <>
                <p className="atelier-reveal__status">Preview unavailable</p>
                <h3>Selected pieces are not available yet.</h3>
                <p>Enquire with Maris for current pieces.</p>
              </>
            )}
          </div>

          <div className="atelier-product-grid" data-atelier-products>
            {featured.length > 0 ? (
              featured.map((product) => (
                <a
                  key={product.id}
                  className={`atelier-product${product.primaryImageUrl ? "" : " atelier-product--fallback"}`}
                  href={`/product/${product.slug || product.sku}`}
                >
                  {product.primaryImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.primaryImageUrl} alt={formatProductTitle(product)} loading="lazy" decoding="async" />
                  ) : (
                    <span className="atelier-product__image-fallback" aria-hidden="true">Catalogue</span>
                  )}
                  <span>{product.collection || "Maris"}</span>
                  <strong>{formatProductTitle(product)}</strong>
                  <p>Confirm availability</p>
                </a>
              ))
            ) : (
              <article className="atelier-product atelier-unavailable">
                <span>Preview</span>
                <strong>Pieces coming soon</strong>
                <p>Enquire with Maris for current pieces.</p>
              </article>
            )}
          </div>
        </div>

        <div className="atelier-reveal__actions">
          <a href="/pages/engagement-ring.html">View catalogue</a>
          <a href="/pages/request-quote.html">Confirm availability</a>
        </div>
      </section>

      <section className="category-section">
        <div className="category-section-head">
          <div className="category-copy">
            <p className="section-kicker">Maris Edit</p>
            <h2>เลือกชมตามหมวดหมู่</h2>
            <p className="category-intro">เลือกตามโอกาสและสไตล์ของคุณ</p>
          </div>

          <a className="category-feature-link" href="/pages/engagement-ring.html">
            <span>For proposals</span>
            <strong>Engagement Rings</strong>
            <span>View pieces</span>
          </a>
        </div>

        <div className="category-grid">
          {CATEGORY_CARDS.map((card) => (
            <CategoryHoverCard
              key={card.key}
              href={card.href}
              className={`category-card category-card--${card.key}`}
              imageSrc={card.image}
              imageAlt={card.title}
              order={card.order}
              title={card.title}
              ctaLabel="View"
            />
          ))}
        </div>
      </section>

      <section className="value-strip">
        <div className="value-lead">
          <p className="section-kicker">Maris Standard</p>
          <h2>A quieter kind of precision.</h2>
          <p>Each piece is shaped for proportion, comfort, and a refined finish.</p>
        </div>

        <div className="value-list">
          {VALUE_CARDS.map((card) => (
            <div className="value-card" key={card.title}>
              <i aria-hidden="true">◆</i>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
