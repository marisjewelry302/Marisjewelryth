"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCustomerSession } from "../hooks/useCustomerSession";
import { useShopLocale } from "../hooks/useShopLocale";
import { canMergeLocalWishlist, getBagItemDetails, writeWishlistOwner } from "../lib/bag-store";
import { fill } from "../lib/i18n";
import { localizeCollectionName } from "../lib/ui-text-shop";
import { isOptimizableImageSrc } from "../lib/image-source";
import { formatPublicProductCode } from "../lib/product-display";

// How long the "Removed" notice keeps its Undo button (same as the bag's).
const UNDO_WINDOW_MS = 8000;
const WISHLIST_KEY = "marisWishlist";
const WISHLIST_API = "/api/account/wishlist";

function getItemId(item) {
  return String(item?.id || item?.productId || item?.href || item?.title || item?.sku || "").trim();
}

function normalizeWishlist(items) {
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
    normalized.push({ ...item, id });
  }

  return normalized;
}

function mergeWishlistItems(localItems, remoteItems) {
  const merged = new Map();

  for (const item of normalizeWishlist(remoteItems)) {
    merged.set(item.id, item);
  }

  for (const item of normalizeWishlist(localItems)) {
    merged.set(item.id, item);
  }

  return [...merged.values()];
}

function readWishlist() {
  try {
    const value = JSON.parse(window.localStorage.getItem(WISHLIST_KEY));
    return normalizeWishlist(value);
  } catch (error) {
    return [];
  }
}

function writeWishlist(items) {
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("maris:wishlistchange"));
  } catch (error) {
    // Keep the page usable if browser storage is unavailable.
  }
}

async function saveWishlist(items) {
  const response = await fetch(WISHLIST_API, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ items })
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Wishlist could not be synced.");
  }

  return response.json();
}

export default function WishlistClient() {
  const { locale, t, href: localHref } = useShopLocale();
  const w = t.wishlist;
  const { customer, isLoggedIn, isLoading: sessionLoading } = useCustomerSession();
  const customerId = customer?.id || "";
  const [items, setItems] = useState([]);
  // The list lives in the browser (and the account), so the server-rendered page
  // knows nothing about it. Until both have been read, show a loading state
  // instead of flashing "0 saved / empty".
  const [localReady, setLocalReady] = useState(false);
  const [accountSynced, setAccountSynced] = useState(false);
  const [removedEntry, setRemovedEntry] = useState(null);
  const didSyncRef = useRef(false);
  const undoTimerRef = useRef(null);
  const pendingFocusRef = useRef(null);
  const gridRef = useRef(null);
  const emptyHeadingRef = useRef(null);

  useEffect(() => {
    setItems(readWishlist());
    setLocalReady(true);
  }, []);

  useEffect(() => () => window.clearTimeout(undoTimerRef.current), []);

  useEffect(() => {
    if (sessionLoading) {
      return undefined;
    }

    if (!isLoggedIn || !customerId) {
      didSyncRef.current = false;
      return undefined;
    }

    if (didSyncRef.current) {
      return undefined;
    }

    didSyncRef.current = true;
    let isCancelled = false;

    async function syncWishlist() {
      try {
        // A list that belongs to another customer is never merged into this account.
        const localItems = canMergeLocalWishlist(customerId) ? readWishlist() : [];
        const response = await fetch(WISHLIST_API, {
          cache: "no-store",
          credentials: "same-origin"
        });

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          throw new Error("Wishlist could not be loaded.");
        }

        const payload = await response.json();
        const mergedItems = mergeWishlistItems(localItems, payload?.items || []);

        if (isCancelled) {
          return;
        }

        setItems(mergedItems);
        writeWishlist(mergedItems);
        writeWishlistOwner(customerId);
        await saveWishlist(mergedItems);
      } catch (error) {
        if (!isCancelled) {
          didSyncRef.current = false;
        }
      } finally {
        setAccountSynced(true);
      }
    }

    syncWishlist();

    return () => {
      isCancelled = true;
    };
  }, [customerId, isLoggedIn, sessionLoading]);

  const updateItems = useCallback((nextItems) => {
    const normalizedItems = normalizeWishlist(nextItems);
    setItems(normalizedItems);
    writeWishlist(normalizedItems);

    if (isLoggedIn) {
      writeWishlistOwner(customerId);
      saveWishlist(normalizedItems).catch(() => {});
    }
  }, [customerId, isLoggedIn]);

  const isReady = localReady && !sessionLoading && (!isLoggedIn || !customerId || accountSynced);

  // After a removal or an undo, put keyboard focus somewhere sensible instead of
  // letting it fall to <body>.
  useEffect(() => {
    const pending = pendingFocusRef.current;

    if (!pending) {
      return;
    }

    pendingFocusRef.current = null;

    if (pending.type === "empty") {
      emptyHeadingRef.current?.focus();
      return;
    }

    const card = [...(gridRef.current?.querySelectorAll("[data-wishlist-id]") || [])]
      .find((element) => element.dataset.wishlistId === pending.id);

    card?.querySelector(pending.selector)?.focus();
  }, [items]);

  function removeItem(item, index) {
    const nextItems = items.filter((savedItem) => savedItem.id !== item.id);
    const neighbour = nextItems[index] || nextItems[index - 1];

    window.clearTimeout(undoTimerRef.current);
    setRemovedEntry({ item, index });
    undoTimerRef.current = window.setTimeout(() => setRemovedEntry(null), UNDO_WINDOW_MS);
    pendingFocusRef.current = neighbour
      ? { type: "item", id: neighbour.id, selector: ".wishlist-actions a" }
      : { type: "empty" };
    updateItems(nextItems);
  }

  function undoRemove() {
    window.clearTimeout(undoTimerRef.current);

    if (removedEntry) {
      const restored = [...items];
      restored.splice(Math.min(removedEntry.index, restored.length), 0, removedEntry.item);
      pendingFocusRef.current = { type: "item", id: removedEntry.item.id, selector: ".wishlist-actions button" };
      updateItems(restored);
    }

    setRemovedEntry(null);
  }

  return (
    <main id="main-content" className="wishlist-main site-main">
      <section className="wishlist-hero">
        <p className="eyebrow">{w.eyebrow}</p>
        <h1>{w.title}</h1>
        <p className="lead">{w.lead}</p>
        <p className="wishlist-count">
          {isReady ? (items.length === 1 ? w.one : fill(w.many, { n: items.length })) : "\u00a0"}
        </p>
      </section>

      <section className="wishlist-panel" aria-label={w.label} aria-busy={!isReady}>
        <div className="bag-undo" role="status" aria-live="polite">
          {removedEntry && (
            <>
              <span>{fill(w.removed, { code: removedEntry.item.title ? formatPublicProductCode(removedEntry.item.title) : w.piece })}</span>
              <button type="button" onClick={undoRemove}>{w.undo}</button>
            </>
          )}
        </div>

        {!isReady ? (
          <p className="wishlist-loading" role="status">{w.loading}</p>
        ) : !items.length ? (
          <div className="wishlist-empty">
            <p className="eyebrow">{w.emptyEyebrow}</p>
            <h2 tabIndex={-1} ref={emptyHeadingRef}>{w.emptyTitle}</h2>
            <p>{w.emptyText}</p>
            <div className="page-actions">
              <a className="primary-link" href={localHref("/category/engagement-ring")}>{w.browse}</a>
              <a href={localHref("/")}>{w.goHome}</a>
            </div>
          </div>
        ) : (
          <div className="wishlist-grid" ref={gridRef}>
            {items.map((item, index) => {
              const quoteHref = item.href?.startsWith("/product/")
                ? localHref(`/request-quote?source=wishlist&id=${encodeURIComponent(item.id)}`)
                : localHref("/contact-us");

              return (
                <article className="wishlist-item" key={item.id || item.title} data-wishlist-id={item.id}>
                  <a className="wishlist-image" href={localHref(item.href || "/category/engagement-ring")}>
                    <Image src={item.image || "/assets/images/logo.png"} alt={item.title || w.itemAlt} width={1024} height={1024} sizes="(max-width: 900px) 50vw, 390px" unoptimized={!isOptimizableImageSrc(item.image || "/assets/images/logo.png")} />
                  </a>
                  <div className="wishlist-copy">
                    <p className="wishlist-collection">{localizeCollectionName(item.collection || "Maris Jewelry", locale)}</p>
                    <h2>{item.title ? formatPublicProductCode(item.title) : w.piece}</h2>
                    {getBagItemDetails(item, t.bag.kinds).map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                    <div className="wishlist-actions">
                      <a href={localHref(item.href || "/category/engagement-ring")}>{w.viewDetails}</a>
                      <a href={quoteHref}>{w.requestQuote}</a>
                      <button type="button" aria-label={fill(t.wishlistButton.remove, { code: item.title ? formatPublicProductCode(item.title) : w.piece })} onClick={() => removeItem(item, index)}>
                        {w.remove}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
