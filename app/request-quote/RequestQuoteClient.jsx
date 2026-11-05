"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { isOptimizableImageSrc } from "../lib/image-source";
import { useSearchParams } from "next/navigation";
import LeadForm from "../components/LeadForm";
import { useShopLocale } from "../hooks/useShopLocale";
import { fill, localizePriceLabel } from "../lib/i18n";
import { localizeCollectionName } from "../lib/ui-text-shop";

const BAG_KEY = "marisShoppingBag";

function readBag() {
  try {
    const value = JSON.parse(window.localStorage.getItem(BAG_KEY));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function buildParamItem(searchParams) {
  const productId = searchParams.get("id") || searchParams.get("sku") || "";
  const collection = searchParams.get("collection") || "engagement-ring";

  if (!productId) {
    return null;
  }

  return {
    id: `${collection}:${productId}`,
    title: productId,
    details: [`Collection: ${collection}`],
    image: "/assets/images/logo.png",
    href: `/product/${productId}`,
    collection,
    priceLabel: "Price on request",
    quantity: 1
  };
}

function formatSelectedPieces(items) {
  return items
    .map((item, index) => {
      const details = Array.isArray(item.details) ? item.details.join("; ") : "";
      return `${index + 1}. ${item.title || "Maris piece"} | ${item.collection || "Maris Jewelry"} | Qty ${Number(item.quantity) || 1} | ${details} | ${item.href || ""}`;
    })
    .join("\n");
}

export default function RequestQuoteClient() {
  const { locale, t, href: localHref } = useShopLocale();
  const q = t.quote;
  const searchParams = useSearchParams();
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    const source = searchParams.get("source");

    if (source === "bag") {
      setSelectedItems(readBag());
      return;
    }

    const paramItem = buildParamItem(searchParams);
    setSelectedItems(paramItem ? [paramItem] : []);
  }, [searchParams]);

  const selectedPieces = useMemo(() => formatSelectedPieces(selectedItems), [selectedItems]);

  return (
    <main id="main-content" className="placeholder-main content-page site-main">
      <section className="placeholder-card placeholder-card--editorial">
        <div className="subpage-intro">
          <p className="eyebrow">{q.eyebrow}</p>
          <h1>{q.title}</h1>
          <p className="lead">{q.lead}</p>
        </div>

        <div className="inquiry-layout">
          <div className="inquiry-column">
            <div className="quote-selection-intro" aria-live="polite">
              <strong>{selectedItems.length ? (selectedItems.length === 1 ? q.selectedOne : fill(q.selectedMany, { n: selectedItems.length })) : q.none}</strong>
              <span>
                {selectedItems.length
                  ? q.attached
                  : q.startFrom}
              </span>
            </div>

            {!selectedItems.length && (
              <div className="empty-selection">
                <p>{q.emptyBox}</p>
              </div>
            )}

            {selectedItems.length > 0 && (
              <div className="selected-piece-list">
                {selectedItems.map((item) => (
                  <article className="selected-piece-card" key={item.id || item.title}>
                    <a className="selected-piece-image" href={localHref(item.href || "/category/engagement-ring")}>
                      <Image src={item.image || "/assets/images/logo.png"} alt={item.title || q.itemAlt} width={1024} height={1024} sizes="(max-width: 900px) 50vw, 320px" unoptimized={!isOptimizableImageSrc(item.image || "/assets/images/logo.png")} />
                    </a>
                    <div className="selected-piece-copy">
                      <p className="selected-piece-collection">{localizeCollectionName(item.collection || "Maris Jewelry", locale)}</p>
                      <h2>{item.title || q.piece}</h2>
                      {(Array.isArray(item.details) ? item.details : []).map((detail) => (
                        <p key={detail}>{detail}</p>
                      ))}
                    </div>
                    <div className="selected-piece-meta">
                      <span>{localizePriceLabel(item.priceLabel || "Price on request", locale)}</span>
                      <a href={localHref(item.href || "/category/engagement-ring")}>{q.viewDetails}</a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="inquiry-column">
            <section className="inquiry-card inquiry-card--accent">
              <h2>{q.nextTitle}</h2>
              <div className="inquiry-list">
                {q.steps.map(([stepTitle, stepText]) => (
                  <article key={stepTitle}>
                    <strong>{stepTitle}</strong>
                    <p>{stepText}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="inquiry-card">
              <h2>{q.needTitle}</h2>
              <p>{q.needLead}</p>

              <LeadForm
                formName="maris-quote-request"
                sourcePage="request-quote"
                subject="Maris Website Quote Request"
                type="quote"
                resetOnSuccess={false}
                requireSelectedPieces
              >
                <input type="hidden" name="source" value={searchParams.get("source") || "product"} readOnly />
                <textarea className="request-quote-hidden" name="selected_pieces" value={selectedPieces} readOnly />

                <div className="inquiry-field-grid">
                  <label>
                    <span>{q.fullName}</span>
                    <input type="text" name="name" autoComplete="name" required />
                  </label>
                  <label>
                    <span>{q.email}</span>
                    <input type="email" name="email" autoComplete="email" required />
                  </label>
                  <label>
                    <span>{q.phone}</span>
                    <input type="tel" name="phone" autoComplete="tel" />
                  </label>
                  <label>
                    <span>{q.preferred}</span>
                    <select name="preferred_contact" defaultValue="Email">
                      {q.contacts.map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{q.budget}</span>
                    <input type="text" name="budget_range" placeholder={q.budgetPlaceholder} />
                  </label>
                  <label>
                    <span>{q.ringSize}</span>
                    <input type="text" name="ring_size" placeholder={q.ringSizePlaceholder} />
                  </label>
                  <label>
                    <span>{q.timing}</span>
                    <select name="timeline" defaultValue="Just researching">
                      {q.timings.map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{q.interested}</span>
                    <select name="service" defaultValue="Engagement Rings">
                      {q.services.map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  <span>{q.notes}</span>
                  <textarea name="message" placeholder={q.notesPlaceholder} />
                </label>

                <p className="inquiry-form-note">{q.formNote}</p>
              </LeadForm>
            </section>
          </div>
        </div>

        <div className="page-actions">
          <a className="primary-link" href={localHref("/shopping-bag")}>{q.returnSelection}</a>
          <a href={localHref("/category/engagement-ring")}>{q.browse}</a>
        </div>
      </section>
    </main>
  );
}
