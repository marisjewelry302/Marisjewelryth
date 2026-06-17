"use client";

import { useEffect, useMemo, useState } from "react";

const BAG_KEY = "marisShoppingBag";

function readBag() {
  try {
    const value = JSON.parse(window.localStorage.getItem(BAG_KEY));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function writeBag(items) {
  window.localStorage.setItem(BAG_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("maris:bagchange"));
}

export default function ShoppingBagClient() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(readBag());
  }, []);

  const totalQuantity = useMemo(
    () => items.reduce((total, item) => total + (Number(item.quantity) || 1), 0),
    [items]
  );

  function updateItems(nextItems) {
    setItems(nextItems);
    writeBag(nextItems);
  }

  function updateQuantity(itemId, quantity) {
    const nextQuantity = Math.max(1, Math.min(9, Number(quantity) || 1));
    updateItems(items.map((item) => (
      item.id === itemId ? { ...item, quantity: nextQuantity, updatedAt: new Date().toISOString() } : item
    )));
  }

  return (
    <main className="bag-main site-main">
      <section className="bag-hero">
        <p className="eyebrow">Selected Pieces</p>
        <h1>Shopping Bag</h1>
        <p className="lead">Review the pieces you are considering. Final pricing and availability will be confirmed by the Maris team.</p>
        <p className="bag-count">{totalQuantity === 1 ? "1 piece selected" : `${totalQuantity} pieces selected`}</p>
      </section>

      <section className="bag-layout" aria-label="Shopping bag">
        {!items.length ? (
          <div className="bag-empty">
            <p className="eyebrow">Your Bag Is Empty</p>
            <h2>No pieces selected yet.</h2>
            <p>Choose a catalogue piece and press Add to Bag. The item will appear here for review.</p>
            <div className="page-actions">
              <a className="primary-link" href="/category/engagement-ring">Browse Engagement Rings</a>
              <a href="/">Go to Home</a>
            </div>
          </div>
        ) : (
          <div className="bag-content">
            <div className="bag-list">
              {items.map((item) => (
                <article className="bag-item" key={item.id || item.title}>
                  <a className="bag-image" href={item.href || "/category/engagement-ring"}>
                    <img src={item.image || "/assets/images/logo.png"} alt={item.title || "Shopping bag item"} />
                  </a>
                  <div className="bag-copy">
                    <p className="bag-collection">{item.collection || "Maris Jewelry"}</p>
                    <h2>{item.title || "Maris Piece"}</h2>
                    {(Array.isArray(item.details) ? item.details : []).map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                    <p className="bag-price">{item.priceLabel || "Price on request"}</p>
                  </div>
                  <div className="bag-controls">
                    <label>
                      Qty
                      <input
                        type="number"
                        min="1"
                        max="9"
                        value={Number(item.quantity) || 1}
                        onChange={(event) => updateQuantity(item.id, event.target.value)}
                      />
                    </label>
                    <button type="button" onClick={() => updateItems(items.filter((savedItem) => savedItem.id !== item.id))}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <aside className="bag-summary" aria-label="Bag summary">
              <p className="eyebrow">Summary</p>
              <h2>Start your quote request</h2>
              <div className="bag-summary-row">
                <span>Total Pieces</span>
                <strong>{totalQuantity}</strong>
              </div>
              <div className="bag-summary-row">
                <span>Pricing</span>
                <strong>On request</strong>
              </div>
              <p className="bag-note">Use this selection to request pricing, check availability, or begin a custom conversation before final order details are confirmed.</p>
              <a className="bag-primary-action" href="/request-quote?source=bag">Continue to Quote Request</a>
              <a className="bag-secondary-action" href="/category/engagement-ring">Continue Shopping</a>
              <a className="bag-secondary-action" href="/contact-us">Contact Maris directly</a>
              <button className="bag-clear" type="button" onClick={() => updateItems([])}>Clear Bag</button>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
