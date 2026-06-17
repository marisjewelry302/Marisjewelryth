"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LeadForm from "../components/LeadForm";

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
    <main className="placeholder-main content-page site-main">
      <section className="placeholder-card placeholder-card--editorial">
        <div className="subpage-intro">
          <p className="eyebrow">Quote Request</p>
          <h1>Request pricing and availability</h1>
          <p className="lead">
            Share the piece you are considering or send your saved bag, and Maris Jewelry will confirm pricing direction, availability, and the next best step.
          </p>
        </div>

        <div className="inquiry-layout">
          <div className="inquiry-column">
            <div className="quote-selection-intro" aria-live="polite">
              <strong>{selectedItems.length ? `${selectedItems.length} selected piece${selectedItems.length === 1 ? "" : "s"}` : "No piece selected yet"}</strong>
              <span>
                {selectedItems.length
                  ? "These details will be attached to your quote request."
                  : "Start from a product page or your shopping bag to bring selected items into this form."}
              </span>
            </div>

            {!selectedItems.length && (
              <div className="empty-selection">
                <p>Start from a product page or your shopping bag to bring selected items into this request form.</p>
              </div>
            )}

            {selectedItems.length > 0 && (
              <div className="selected-piece-list">
                {selectedItems.map((item) => (
                  <article className="selected-piece-card" key={item.id || item.title}>
                    <a className="selected-piece-image" href={item.href || "/category/engagement-ring"}>
                      <img src={item.image || "/assets/images/logo.png"} alt={item.title || "Selected piece"} />
                    </a>
                    <div className="selected-piece-copy">
                      <p className="selected-piece-collection">{item.collection || "Maris Jewelry"}</p>
                      <h2>{item.title || "Maris Piece"}</h2>
                      {(Array.isArray(item.details) ? item.details : []).map((detail) => (
                        <p key={detail}>{detail}</p>
                      ))}
                    </div>
                    <div className="selected-piece-meta">
                      <span>{item.priceLabel || "Price on request"}</span>
                      <a href={item.href || "/category/engagement-ring"}>View details</a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="inquiry-column">
            <section className="inquiry-card inquiry-card--accent">
              <h2>What happens next</h2>
              <div className="inquiry-list">
                <article>
                  <strong>1. Review your selection</strong>
                  <p>We look at the selected pieces, requested timing, and whether you need ready-to-order guidance or custom development.</p>
                </article>
                <article>
                  <strong>2. Confirm price direction</strong>
                  <p>We reply with pricing range, metal or stone notes, and any details that affect the final quote.</p>
                </article>
                <article>
                  <strong>3. Plan the next step</strong>
                  <p>Depending on the piece, we can move into sizing, custom adjustments, appointment planning, or order confirmation.</p>
                </article>
              </div>
            </section>

            <section className="inquiry-card">
              <h2>Tell us what you need</h2>
              <p>Leave your details below so Maris Jewelry can return with the right pricing direction and availability notes.</p>

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
                    <span>Full name</span>
                    <input type="text" name="name" autoComplete="name" required />
                  </label>
                  <label>
                    <span>Email</span>
                    <input type="email" name="email" autoComplete="email" required />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input type="tel" name="phone" autoComplete="tel" />
                  </label>
                  <label>
                    <span>Preferred contact</span>
                    <select name="preferred_contact" defaultValue="Email">
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                      <option value="Line">Line</option>
                      <option value="WhatsApp">WhatsApp</option>
                    </select>
                  </label>
                  <label>
                    <span>Budget range</span>
                    <input type="text" name="budget_range" placeholder="e.g. 30,000 - 60,000 THB" />
                  </label>
                  <label>
                    <span>Ring size (if known)</span>
                    <input type="text" name="ring_size" placeholder="e.g. US 6 / EU 52" />
                  </label>
                  <label>
                    <span>Timing</span>
                    <select name="timeline" defaultValue="Just researching">
                      <option value="As soon as possible">As soon as possible</option>
                      <option value="Within 2 weeks">Within 2 weeks</option>
                      <option value="Within this month">Within this month</option>
                      <option value="Just researching">Just researching</option>
                    </select>
                  </label>
                  <label>
                    <span>Interested in</span>
                    <select name="service" defaultValue="Engagement Rings">
                      <option value="Engagement Rings">Engagement Rings</option>
                      <option value="Wedding Bands">Wedding Bands</option>
                      <option value="Men's Wedding Bands">Men's Wedding Bands</option>
                      <option value="Gifts">Gifts</option>
                      <option value="Custom Design">Custom Design</option>
                    </select>
                  </label>
                </div>

                <label>
                  <span>Notes</span>
                  <textarea name="message" placeholder="Tell us about your preferred metal, stone, deadline, or any changes you would like to discuss." />
                </label>

                <p className="inquiry-form-note">
                  If you already know your event date or target budget, adding it here will help Maris Jewelry give a more useful first reply.
                </p>
              </LeadForm>
            </section>
          </div>
        </div>

        <div className="page-actions">
          <a className="primary-link" href="/shopping-bag">Return to selection</a>
          <a href="/category/engagement-ring">Browse Engagement Rings</a>
        </div>
      </section>
    </main>
  );
}
