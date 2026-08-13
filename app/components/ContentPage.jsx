import Image from "next/image";
import { isOptimizableImageSrc } from "../lib/image-source";

export default function ContentPage({ page }) {
  const hasStepImages = page.steps?.some((step) => step.image);
  const heroImages = page.heroImages ?? (page.heroImage ? [page.heroImage] : []);
  const cardClassName = [
    "placeholder-card",
    "placeholder-card--editorial",
    page.layout === "wide" ? "placeholder-card--wide" : null
  ].filter(Boolean).join(" ");

  return (
    <main className="placeholder-main content-page site-main">
      <section className={cardClassName}>
        <div className="subpage-intro">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="lead">{page.lead}</p>
        </div>

        {heroImages.length > 0 && (
          <div className="subpage-hero-gallery">
            {heroImages.map((image) => (
              <figure className="subpage-hero-image" key={image.src}>
                <Image src={image.src} alt={image.alt} width={1600} height={681} sizes="(max-width: 1100px) 100vw, 1040px" unoptimized={!isOptimizableImageSrc(image.src)} />
              </figure>
            ))}
          </div>
        )}

        {page.features && (
          <div className="subpage-feature-grid">
            {page.features.map((feature) => (
              <article className="subpage-feature-card" key={feature.title}>
                <h2>{feature.title}</h2>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        )}

        {page.detail && (
          <div className="subpage-detail-grid">
            <section className="subpage-panel">
              <h2>{page.detail.title}</h2>
              <div className="subpage-stack">
                {page.detail.items.map((item) => (
                  <article key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </section>

            {page.aside && (
              <aside className="subpage-panel subpage-panel--accent">
                <h2>{page.aside.title}</h2>
                <dl className="subpage-info-list">
                  {page.aside.items.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </aside>
            )}
          </div>
        )}

        {page.steps && (
          <section className="subpage-panel">
            <h2>{page.stepsTitle}</h2>
            <div className={`subpage-step-grid${hasStepImages ? " subpage-step-grid--visual" : ""}`}>
              {page.steps.map((step, index) => (
                <article className={`subpage-step-card${step.image ? " subpage-step-card--visual" : ""}`} key={step.title}>
                  {step.image && (
                    <div
                      aria-label={step.image.alt}
                      className="subpage-step-image"
                      role="img"
                      style={{
                        backgroundImage: `url(${step.image.src})`,
                        backgroundPosition: step.image.position
                      }}
                    />
                  )}
                  <p className="subpage-step-index">{String(index + 1).padStart(2, "0")}</p>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {page.policySections && (
          <div className="policy-content">
            {page.policySections.map((section) => (
              <section className="policy-section" key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.text}</p>
              </section>
            ))}
          </div>
        )}

        {page.note && <p className="subpage-note">{page.note}</p>}

        {page.actions && (
          <div className="page-actions">
            {page.actions.map((action, index) => (
              <a key={action.href} className={index === 0 ? "primary-link" : undefined} href={action.href}>
                {action.label}
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
