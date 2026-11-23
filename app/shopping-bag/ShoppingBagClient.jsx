"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCustomerSession } from "../hooks/useCustomerSession";
import { useShopLocale } from "../hooks/useShopLocale";
import {
  MAX_BAG_QUANTITY,
  clampQuantity,
  getBagItemDetails,
  normalizeBag,
  readBag,
  syncBagWithAccount,
  updateBag
} from "../lib/bag-store";
import { fill, localizePriceLabel } from "../lib/i18n";
import { localizeCollectionName } from "../lib/ui-text-shop";
import { isOptimizableImageSrc } from "../lib/image-source";

// How long the "Bag cleared" notice keeps its Undo button.
const UNDO_WINDOW_MS = 8000;

export default function ShoppingBagClient() {
  const { locale, t, href: localHref } = useShopLocale();
  const b = t.bag;
  const { customer, isLoggedIn, isLoading: sessionLoading } = useCustomerSession();
  const customerId = customer?.id || "";
  const [items, setItems] = useState([]);
  // What is typed in a quantity box before it is committed; empty is allowed while typing.
  const [drafts, setDrafts] = useState({});
  const [clearedItems, setClearedItems] = useState(null);
  const clearTimerRef = useRef(null);

  useEffect(() => {
    setItems(readBag());
  }, []);

  // A signed-in customer's saved bag is merged in once per page load. The shared
  // store only merges a local bag that is anonymous or already theirs.
  useEffect(() => {
    if (sessionLoading || !isLoggedIn || !customerId) {
      return undefined;
    }

    let isCancelled = false;

    syncBagWithAccount(customerId).then((syncedItems) => {
      if (!isCancelled) {
        setItems(syncedItems);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [customerId, isLoggedIn, sessionLoading]);

  useEffect(() => () => window.clearTimeout(clearTimerRef.current), []);

  const totalQuantity = useMemo(
    () => items.reduce((total, item) => total + (Number(item.quantity) || 1), 0),
    [items]
  );

  const updateItems = useCallback((nextItems) => {
    const normalizedItems = normalizeBag(nextItems);
    setItems(normalizedItems);
    updateBag(() => normalizedItems, { customerId });
  }, [customerId]);

  function updateQuantity(itemId, quantity) {
    const nextQuantity = clampQuantity(quantity);
    setDrafts((current) => {
      const { [itemId]: removed, ...rest } = current;
      return rest;
    });
    updateItems(items.map((item) => (
      item.id === itemId ? { ...item, quantity: nextQuantity, updatedAt: new Date().toISOString() } : item
    )));
  }

  function clearBag() {
    window.clearTimeout(clearTimerRef.current);
    setClearedItems(items);
    updateItems([]);
    clearTimerRef.current = window.setTimeout(() => setClearedItems(null), UNDO_WINDOW_MS);
  }

  function undoClear() {
    window.clearTimeout(clearTimerRef.current);

    if (clearedItems) {
      updateItems(clearedItems);
    }

    setClearedItems(null);
  }

  return (
    <main id="main-content" className="bag-main site-main">
      <section className="bag-hero">
        <p className="eyebrow">{b.eyebrow}</p>
        <h1>{b.title}</h1>
        <p className="lead">{b.lead}</p>
        <p className="bag-count">{totalQuantity === 1 ? b.one : fill(b.many, { n: totalQuantity })}</p>
      </section>

      <section className="bag-layout" aria-label={b.label}>
        <div className="bag-undo" role="status" aria-live="polite">
          {clearedItems && (
            <>
              <span>{b.cleared}</span>
              <button type="button" onClick={undoClear}>{b.undo}</button>
            </>
          )}
        </div>

        {!items.length ? (
          <div className="bag-empty">
            <p className="eyebrow">{b.emptyEyebrow}</p>
            <h2>{b.emptyTitle}</h2>
            <p>{b.emptyText}</p>
            <div className="page-actions">
              <a className="primary-link" href={localHref("/category/engagement-ring")}>{b.browse}</a>
              <a href={localHref("/")}>{b.goHome}</a>
            </div>
          </div>
        ) : (
          <div className="bag-content">
            <div className="bag-list">
              {items.map((item) => {
                const code = item.title || b.piece;
                const quantity = Number(item.quantity) || 1;

                return (
                  <article className="bag-item" key={item.id || item.title}>
                    <a className="bag-image" href={localHref(item.href || "/category/engagement-ring")}>
                      <Image src={item.image || "/assets/images/logo.png"} alt={item.title || b.itemAlt} width={1024} height={1024} sizes="(max-width: 900px) 50vw, 320px" unoptimized={!isOptimizableImageSrc(item.image || "/assets/images/logo.png")} />
                    </a>
                    <div className="bag-copy">
                      <p className="bag-collection">{localizeCollectionName(item.collection || "Maris Jewelry", locale)}</p>
                      <h2>{code}</h2>
                      {getBagItemDetails(item, b.kinds).map((detail) => (
                        <p key={detail}>{detail}</p>
                      ))}
                      <p className="bag-price">{localizePriceLabel(item.priceLabel || "Price on request", locale)}</p>
                    </div>
                    <div className="bag-controls">
                      <div className="bag-qty">
                        <span className="bag-qty-label">{b.qty}</span>
                        <div className="bag-qty-row">
                          <button
                            type="button"
                            className="bag-qty-step"
                            aria-label={fill(b.decrease, { code })}
                            disabled={quantity <= 1}
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                          >
                            −
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={2}
                            aria-label={fill(b.qtyFor, { code })}
                            value={drafts[item.id] ?? String(quantity)}
                            onChange={(event) => {
                              const digits = event.target.value.replace(/\D/g, "").slice(0, 2);
                              setDrafts((current) => ({ ...current, [item.id]: digits }));
                            }}
                            onBlur={(event) => {
                              if (item.id in drafts) {
                                updateQuantity(item.id, event.target.value);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                updateQuantity(item.id, event.currentTarget.value);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="bag-qty-step"
                            aria-label={fill(b.increase, { code })}
                            disabled={quantity >= MAX_BAG_QUANTITY}
                            onClick={() => updateQuantity(item.id, quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <small className="bag-qty-hint">{fill(b.qtyHint, { max: MAX_BAG_QUANTITY })}</small>
                      </div>
                      <button
                        type="button"
                        aria-label={fill(b.removeLabel, { code })}
                        onClick={() => updateItems(items.filter((savedItem) => savedItem.id !== item.id))}
                      >
                        {b.remove}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="bag-summary" aria-label={b.summaryLabel}>
              <p className="eyebrow">{b.summary}</p>
              <h2>{b.startQuote}</h2>
              <div className="bag-summary-row">
                <span>{b.totalPieces}</span>
                <strong>{totalQuantity}</strong>
              </div>
              <div className="bag-summary-row">
                <span>{b.pricing}</span>
                <strong>{b.onRequest}</strong>
              </div>
              <p className="bag-note">{b.note}</p>
              <a className="bag-primary-action" href={localHref("/request-quote?source=bag")}>{b.continueQuote}</a>
              <a className="bag-secondary-action" href={localHref("/category/engagement-ring")}>{b.continueShopping}</a>
              <a className="bag-secondary-action" href={localHref("/contact-us")}>{b.contactDirect}</a>
              <button className="bag-clear" type="button" onClick={clearBag}>{b.clear}</button>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
