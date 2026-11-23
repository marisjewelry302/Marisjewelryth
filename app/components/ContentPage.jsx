import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { THAI_LOCALE, localizePath } from "../lib/i18n";
import { isOptimizableImageSrc } from "../lib/image-source";
import { contentPageTextTh } from "../lib/static-pages-th";
import CookieSettingsButton from "./CookieSettingsButton";

// Policy text is a plain string, or an array of strings and inline parts:
// { href, label } for a link (site paths are localized; mailto:, tel:, #anchors
// and https: pass through) and { action: "cookie-settings", label } for the
// button that reopens the cookie panel.
function renderPolicyText(content, locale) {
  if (!Array.isArray(content)) return content;

  return content.map((part, index) => {
    if (typeof part === "string") return <Fragment key={index}>{part}</Fragment>;
    if (part.action === "cookie-settings") {
      return <CookieSettingsButton key={index}>{part.label}</CookieSettingsButton>;
    }
    if (part.href.startsWith("/")) {
      return <Link key={index} href={localizePath(part.href, locale)}>{part.label}</Link>;
    }
    const external = part.href.startsWith("https://") || part.href.startsWith("http://");
    return (
      <a key={index} href={part.href} {...(external ? { rel: "noopener" } : {})}>{part.label}</a>
    );
  });
}

// Sections beyond this count get an "On this page" list of anchors.
const POLICY_TOC_THRESHOLD = 4;

export default function ContentPage({ page, children, locale = "en" }) {
  const effectiveDateLabel = locale === THAI_LOCALE ? contentPageTextTh.effectiveDate : "Effective date";
  const onThisPageLabel = locale === THAI_LOCALE ? contentPageTextTh.onThisPage : "On this page";
  const policyTocSections = page.policySections && page.policySections.length > POLICY_TOC_THRESHOLD
    ? page.policySections.filter((section) => section.id)
    : [];
  const hasStepImages = page.steps?.some((step) => step.image);
  const heroImages = page.heroImages ?? (page.heroImage ? [page.heroImage] : []);
  // Opt-in (page.introAction): surfaces the primary action above the fold; the full row stays at the bottom.
  const introAction = page.actions?.[0];
  const cardClassName = [
    "placeholder-card",
    "placeholder-card--editorial",
    page.layout === "wide" ? "placeholder-card--wide" : null
  ].filter(Boolean).join(" ");

  return (
    <main id="main-content" className="placeholder-main content-page site-main">
      <section className={cardClassName}>
        <div className="subpage-intro">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="lead">{page.lead}</p>
          {page.introAction && introAction && (
            <p className="subpage-intro-action">
              <a className="primary-link" href={localizePath(introAction.href, locale)}>{introAction.label}</a>
            </p>
          )}
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
                    <div className="subpage-step-image">
                      <Image
                        src={step.image.src}
                        alt={step.image.alt}
                        fill
                        sizes="(max-width: 767px) 90vw, 260px"
                        unoptimized={!isOptimizableImageSrc(step.image.src)}
                      />
                    </div>
                  )}
                  <p className="subpage-step-index">{String(index + 1).padStart(2, "0")}</p>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {page.aftercare && (
          <section className="subpage-panel">
            <h2>{page.aftercare.title}</h2>
            <div className="subpage-stack">
              {page.aftercare.items.map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {page.effectiveDate && <p className="subpage-note">{effectiveDateLabel}: {page.effectiveDate}</p>}

        {policyTocSections.length > 0 && (
          <nav className="policy-toc" aria-label={onThisPageLabel}>
            <p className="policy-toc__title">{onThisPageLabel}</p>
            <ol>
              {policyTocSections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {page.policySections && (
          <div className="policy-content">
            {page.policySections.map((section) => (
              <section className="policy-section" id={section.id} key={section.title}>
                <h2>{section.title}</h2>
                {section.text && <p>{renderPolicyText(section.text, locale)}</p>}
                {section.items && (
                  <ul className="policy-list">
                    {section.items.map((item) => (
                      typeof item === "string"
                        ? <li key={item}>{item}</li>
                        : <li key={item.label}><strong>{item.label}:</strong> {renderPolicyText(item.text, locale)}</li>
                    ))}
                  </ul>
                )}
                {section.after && <p>{renderPolicyText(section.after, locale)}</p>}
              </section>
            ))}
          </div>
        )}

        {/* Slot for pages that need a real form alongside the editorial copy. */}
        {children}

        {page.note && <p className="subpage-note">{page.note}</p>}

        {page.actions && (
          <div className="page-actions">
            {page.actions.map((action, index) => (
              <a key={action.href} className={index === 0 ? "primary-link" : undefined} href={localizePath(action.href, locale)}>
                {action.label}
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
