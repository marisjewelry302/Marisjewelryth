"use client";

import Link from "next/link";

import { useLocale } from "../hooks/useLocale";

// Shared by the site-wide 404 and the product 404. It is a client component so
// the copy and every link follow the language in the URL (/th/... is Thai). The
// tab title comes from each not-found.js (app, app/th, product, th/product).
export default function NotFoundView({ variant = "page" }) {
  const { t, href } = useLocale();
  const copy = t.notFound;
  const text = variant === "product" ? copy.product : copy;

  return (
    <main id="main-content" className="not-found-shell site-main" data-maris-not-found="">
      <section className="placeholder-card">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="lead">{text.lead}</p>
        <div className="page-actions">
          <Link className="primary-link" href={href("/collections")}>{copy.browseLabel}</Link>
          <Link href={href("/")}>{copy.homeLabel}</Link>
        </div>
        <nav className="not-found-links" aria-label={copy.moreLabel}>
          <p className="not-found-links__label">{copy.moreLabel}</p>
          <ul>
            {copy.links.map((item) => (
              <li key={item.href}>
                <Link href={href(item.href)}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </main>
  );
}
