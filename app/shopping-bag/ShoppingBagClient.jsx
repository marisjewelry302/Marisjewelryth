"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCustomerSession } from "../hooks/useCustomerSession";
import { useLocale } from "../hooks/useLocale";
import { fill, localizePriceLabel } from "../lib/i18n";
import { localizeCollectionName } from "../lib/ui-text-shop";
import { isOptimizableImageSrc } from "../lib/image-source";

const BAG_KEY = "marisShoppingBag";
const BAG_API = "/api/account/bag";

function getItemId(item) {
  return String(item?.id || item?.productId || item?.href || item?.title || item?.sku || "").trim();
}

function clampQuantity(value) {
  const quantity = Math.round(Number(value) || 1);
  return Math.max(1, Math.min(9, quantity));
}

function normalizeBag(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const id = getItemId(item);

    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    normalized.push({ ...item, id, quantity: clampQuantity(item.quantity) });
  }

  return normalized;
}

function mergeBagItems(localItems, remoteItems) {
  const merged = new Map();

  for (const item of normalizeBag(remoteItems)) {
    merged.set(item.id, item);
  }

  for (const item of normalizeBag(localItems)) {
    merged.set(item.id, item);
  }

  return [...merged.values()];
}

function readBag() {
  try {
    const value = JSON.parse(window.localStorage.getItem(BAG_KEY));
    return normalizeBag(value);
  } catch (error) {
    return [];
  }
}

function writeBag(items) {
  try {
    window.localStorage.setItem(BAG_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("maris:bagchange"));
  } catch (error) {
    // Keep the page usable if browser storage is unavailable.
  }
}

async function saveBag(items) {
  const response = await fetch(BAG_API, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ items })
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Shopping bag could not be synced.");
  }

  return response.json();
}

export default function ShoppingBagClient() {
  const { locale, t, href: localHref } = useLocale();
  const b = t.bag;
  const { isLoggedIn, isLoading: sessionLoading } = useCustomerSession();
  const [items, setItems] = useState([]);
  const didSyncRef = useRef(false);

  useEffect(() => {
    setItems(readBag());
  }, []);

  useEffect(() => {
    if (sessionLoading) {
      return undefined;
    }

    if (!isLoggedIn) {
      didSyncRef.current = false;
      return undefined;
    }

    if (didSyncRef.current) {
      return undefined;
    }

    didSyncRef.current = true;
    let isCancelled = false;

    async function syncBag() {
      try {
        const localItems = readBag();
        const response = await fetch(BAG_API, {
          cache: "no-store",
          credentials: "same-origin"
        });

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          throw new Error("Shopping bag could not be loaded.");
        }

        const payload = await response.json();
        const mergedItems = mergeBagItems(localItems, payload?.items || []);

        if (isCancelled) {
          return;
        }

        setItems(mergedItems);
        writeBag(mergedItems);
        await saveBag(mergedItems);
      } catch (error) {
        if (!isCancelled) {
          didSyncRef.current = false;
        }
      }
    }

    syncBag();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn, sessionLoading]);

  const totalQuantity = useMemo(
    () => items.reduce((total, item) => total + (Number(item.quantity) || 1), 0),
    [items]
  );

  const updateItems = useCallback((nextItems) => {
    const normalizedItems = normalizeBag(nextItems);
    setItems(normalizedItems);
    writeBag(normalizedItems);

    if (isLoggedIn) {
      saveBag(normalizedItems).catch(() => {});
    }
  }, [isLoggedIn]);

  function updateQuantity(itemId, quantity) {
    const nextQuantity = clampQuantity(quantity);
    updateItems(items.map((item) => (
      item.id === itemId ? { ...item, quantity: nextQuantity, updatedAt: new Date().toISOString() } : item
    )));
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
              {items.map((item) => (
                <article className="bag-item" key={item.id || item.title}>
                  <a className="bag-image" href={localHref(item.href || "/category/engagement-ring")}>
                    <Image src={item.image || "/assets/images/logo.png"} alt={item.title || b.itemAlt} width={1024} height={1024} sizes="(max-width: 900px) 50vw, 320px" unoptimized={!isOptimizableImageSrc(item.image || "/assets/images/logo.png")} />
                  </a>
                  <div className="bag-copy">
                    <p className="bag-collection">{localizeCollectionName(item.collection || "Maris Jewelry", locale)}</p>
                    <h2>{item.title || b.piece}</h2>
                    {(Array.isArray(item.details) ? item.details : []).map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                    <p className="bag-price">{localizePriceLabel(item.priceLabel || "Price on request", locale)}</p>
                  </div>
                  <div className="bag-controls">
                    <label>
                      {b.qty}
                      <input
                        type="number"
                        min="1"
                        max="9"
                        value={Number(item.quantity) || 1}
                        onChange={(event) => updateQuantity(item.id, event.target.value)}
                      />
                    </label>
                    <button type="button" onClick={() => updateItems(items.filter((savedItem) => savedItem.id !== item.id))}>
                      {b.remove}
                    </button>
                  </div>
                </article>
              ))}
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
              <button className="bag-clear" type="button" onClick={() => updateItems([])}>{b.clear}</button>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
