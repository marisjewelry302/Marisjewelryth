"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCustomerSession } from "../hooks/useCustomerSession";

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
  const { isLoggedIn, isLoading: sessionLoading } = useCustomerSession();
  const [items, setItems] = useState([]);
  const didSyncRef = useRef(false);

  useEffect(() => {
    setItems(readWishlist());
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

    async function syncWishlist() {
      try {
        const localItems = readWishlist();
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
        await saveWishlist(mergedItems);
      } catch (error) {
        if (!isCancelled) {
          didSyncRef.current = false;
        }
      }
    }

    syncWishlist();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn, sessionLoading]);

  const updateItems = useCallback((nextItems) => {
    const normalizedItems = normalizeWishlist(nextItems);
    setItems(normalizedItems);
    writeWishlist(normalizedItems);

    if (isLoggedIn) {
      saveWishlist(normalizedItems).catch(() => {});
    }
  }, [isLoggedIn]);

  return (
    <main className="wishlist-main site-main">
      <section className="wishlist-hero">
        <p className="eyebrow">Saved Pieces</p>
        <h1>Wishlist</h1>
        <p className="lead">Keep the pieces you love in one quiet place. Tap the heart on any catalogue item, then come back here to review it.</p>
        <p className="wishlist-count">{items.length === 1 ? "1 saved piece" : `${items.length} saved pieces`}</p>
      </section>

      <section className="wishlist-panel" aria-label="Saved wishlist items">
        {!items.length ? (
          <div className="wishlist-empty">
            <p className="eyebrow">Nothing Saved Yet</p>
            <h2>Your wishlist is waiting.</h2>
            <p>Start from the catalogue and press the heart beside any piece you want to keep for later.</p>
            <div className="page-actions">
              <a className="primary-link" href="/category/engagement-ring">Browse Engagement Rings</a>
              <a href="/">Go to Home</a>
            </div>
          </div>
        ) : (
          <div className="wishlist-grid">
            {items.map((item) => {
              const quoteHref = item.href?.startsWith("/product/")
                ? `/request-quote?id=${encodeURIComponent(item.title || item.id)}`
                : "/request-quote";

              return (
                <article className="wishlist-item" key={item.id || item.title}>
                  <a className="wishlist-image" href={item.href || "/category/engagement-ring"}>
                    <img src={item.image || "/assets/images/logo.png"} alt={item.title || "Wishlist item"} />
                  </a>
                  <div className="wishlist-copy">
                    <p className="wishlist-collection">{item.collection || "Maris Jewelry"}</p>
                    <h2>{item.title || "Maris Piece"}</h2>
                    {(Array.isArray(item.details) ? item.details : []).map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                    <div className="wishlist-actions">
                      <a href={item.href || "/category/engagement-ring"}>View Details</a>
                      <a href={quoteHref}>Request Quote</a>
                      <button type="button" onClick={() => updateItems(items.filter((savedItem) => savedItem.id !== item.id))}>
                        Remove
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
