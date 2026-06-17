"use client";

import { useEffect, useState } from "react";

const WISHLIST_KEY = "marisWishlist";

function readWishlist() {
  try {
    const value = JSON.parse(window.localStorage.getItem(WISHLIST_KEY));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function writeWishlist(items) {
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("maris:wishlistchange"));
}

export default function WishlistClient() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(readWishlist());
  }, []);

  function updateItems(nextItems) {
    setItems(nextItems);
    writeWishlist(nextItems);
  }

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
