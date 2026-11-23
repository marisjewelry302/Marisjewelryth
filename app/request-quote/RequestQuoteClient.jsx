"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { isOptimizableImageSrc } from "../lib/image-source";
import { useSearchParams } from "next/navigation";
import ContactMethodFields from "../components/ContactMethodFields";
import LeadForm from "../components/LeadForm";
import { useShopLocale } from "../hooks/useShopLocale";
import { getBagItemDetails, readBag } from "../lib/bag-store";
import { fill, localizePriceLabel } from "../lib/i18n";
import { localizeCollectionName, shopEn } from "../lib/ui-text-shop";
import { baseText } from "../lib/ui-text-base";

const WISHLIST_KEY = "marisWishlist";

function readWishlist() {
  try {
    const value = JSON.parse(window.localStorage.getItem(WISHLIST_KEY));
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
    details: [],
    image: "/assets/images/logo.png",
    href: `/product/${productId}`,
    // The English title is localized when it renders, never the raw slug.
    collection: shopEn.collections[collection]?.title || "Maris Jewelry",
    priceLabel: "Price on request",
    quantity: 1
  };
}

// "?source=wishlist&id=<saved item id>": the full saved item (picture, name,
// collection) comes from the wishlist stored in this browser. A link that no
// longer matches falls back to a piece built from the code in the id.
function buildWishlistItem(searchParams) {
  const savedId = searchParams.get("id") || "";
  const saved = readWishlist().find((item) => item?.id === savedId);

  if (saved) {
    return { ...saved, quantity: 1 };
  }

  const code = savedId.includes(":") ? savedId.slice(savedId.lastIndexOf(":") + 1) : savedId;
  const params = new URLSearchParams();
  params.set("id", code);

  return buildParamItem(params);
}

function formatSelectedPieces(items) {
  return items
    .map((item, index) => {
      // Stored details are English, which is what the atelier reads in the email.
      const details = Array.isArray(item.details) ? item.details.join("; ") : "";
      return `${index + 1}. ${item.title || "Maris piece"} | ${item.collection || "Maris Jewelry"} | Qty ${Number(item.quantity) || 1} | ${details} | ${item.href || ""}`;
    })
    .join("\n");
}

export default function RequestQuoteClient() {
  const { locale, t, href: localHref } = useShopLocale();
  const q = t.quote;
  const lead = baseText[locale].lead;
  const searchParams = useSearchParams();
  // null until the bag / wishlist in this browser has been read, so the empty
  // panel never flashes for a visitor who does have a selection.
  const [selectedItems, setSelectedItems] = useState(null);
  const [bagCount, setBagCount] = useState(0);

  useEffect(() => {
    const source = searchParams.get("source");
    setBagCount(readBag().length);

    if (source === "bag") {
      setSelectedItems(readBag());
      return;
    }

    if (source === "wishlist") {
      const wishlistItem = buildWishlistItem(searchParams);
      setSelectedItems(wishlistItem ? [wishlistItem] : []);
      return;
    }

    const paramItem = buildParamItem(searchParams);
    setSelectedItems(paramItem ? [paramItem] : []);
  }, [searchParams]);

  const items = selectedItems || [];
  const selectedPieces = useMemo(() => formatSelectedPieces(items), [selectedItems]);
  const empty = q.emptyPanel;

  return (
    <main id="main-content" className="placeholder-main content-page site-main">
      <section className="placeholder-card placeholder-card--editorial">
        <div className="subpage-intro">
          <p className="eyebrow">{q.eyebrow}</p>
          <h1>{q.title}</h1>
          <p className="lead">{q.lead}</p>
        </div>

        {selectedItems && selectedItems.length === 0 && (
          <div className="wishlist-empty">
            <p className="eyebrow">{empty.eyebrow}</p>
            <h2>{empty.title}</h2>
            <p>{empty.text}</p>
            <div className="page-actions">
              <a className="primary-link" href={localHref("/collections")}>{empty.links.collections}</a>
              <a href={localHref("/category/engagement-ring")}>{empty.links.engagement}</a>
              <a href={localHref("/category/wedding-bands")}>{empty.links.bands}</a>
              <a href={localHref("/ready-to-ship")}>{empty.links.ready}</a>
              {bagCount > 0 && <a href={localHref("/shopping-bag")}>{fill(empty.links.bag, { n: bagCount })}</a>}
            </div>
            <p>{empty.contactNote}</p>
            <div className="page-actions">
              <a href={localHref("/contact-us")}>{empty.links.contact}</a>
            </div>
          </div>
        )}

        {selectedItems && selectedItems.length > 0 && (
        <div className="inquiry-layout">
          <div className="inquiry-column">
            <div className="quote-selection-intro" aria-live="polite">
              <strong>{selectedItems.length === 1 ? q.selectedOne : fill(q.selectedMany, { n: selectedItems.length })}</strong>
              <span>{q.attached}</span>
            </div>

            <div className="selected-piece-list">
              {selectedItems.map((item) => (
                <article className="selected-piece-card" key={item.id || item.title}>
                  <a className="selected-piece-image" href={localHref(item.href || "/category/engagement-ring")}>
                    <Image src={item.image || "/assets/images/logo.png"} alt={item.title || q.itemAlt} width={1024} height={1024} sizes="(max-width: 900px) 50vw, 320px" unoptimized={!isOptimizableImageSrc(item.image || "/assets/images/logo.png")} />
                  </a>
                  <div className="selected-piece-copy">
                    <p className="selected-piece-collection">{localizeCollectionName(item.collection || "Maris Jewelry", locale)}</p>
                    <h2>{item.title || q.piece}</h2>
                    {getBagItemDetails(item, t.bag.kinds).map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                  </div>
                  <div className="selected-piece-meta">
                    <span>{q.qtyLabel}: {Number(item.quantity) || 1}</span>
                    <span>{localizePriceLabel(item.priceLabel || "Price on request", locale)}</span>
                    <a href={localHref(item.href || "/category/engagement-ring")}>{q.viewDetails}</a>
                  </div>
                </article>
              ))}
            </div>
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
                  <ContactMethodFields phoneLabel={q.phone} preferredLabel={q.preferred} contacts={q.contacts} />
                  <label>
                    <span>{q.budget} {lead.optional}</span>
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
                  <span>{q.notes} {lead.optional}</span>
                  <textarea name="message" placeholder={q.notesPlaceholder} />
                </label>

                <p className="inquiry-form-note">{q.formNote}</p>
              </LeadForm>
            </section>
          </div>
        </div>
        )}

        {selectedItems && selectedItems.length > 0 && (
          <div className="page-actions">
            <a className="primary-link" href={localHref("/shopping-bag")}>{q.returnSelection}</a>
            <a href={localHref("/category/engagement-ring")}>{q.browse}</a>
          </div>
        )}
      </section>
    </main>
  );
}
