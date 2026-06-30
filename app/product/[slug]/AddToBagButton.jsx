"use client";

import { useState, useEffect } from "react";
import { getPublicProductDisplayName } from "../../lib/product-display";

const BAG_KEY = "marisShoppingBag";

function readBag() {
  try {
    return JSON.parse(localStorage.getItem(BAG_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function writeBag(items) {
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("maris:bagchange"));
    return true;
  } catch (error) {
    return false;
  }
}

export default function AddToBagButton({ product, collectionLabel }) {
  const productId = `${product.collection}:${product.sku}`;
  const displayName = getPublicProductDisplayName(product);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    setIsAdded(readBag().some((item) => item.id === productId));
  }, [productId]);

  function getBagItem() {
    return {
      id: productId,
      title: product.sku,
      details: [displayName],
      image: product.primaryImageUrl,
      href: `/product/${product.slug || product.sku}`,
      collection: collectionLabel,
      priceLabel: product.basePrice === null ? "Price on request" : `${Number(product.basePrice).toLocaleString()} THB`,
      quantity: 1,
      addedAt: new Date().toISOString()
    };
  }

  function toggleBag() {
    const bag = readBag();
    const alreadyIn = bag.some((item) => item.id === productId);

    if (alreadyIn) {
      writeBag(bag.filter((item) => item.id !== productId));
      setIsAdded(false);
    } else {
      writeBag([getBagItem(), ...bag]);
      setIsAdded(true);
    }
  }

  return (
    <button
      type="button"
      className={`product-action${isAdded ? " is-added" : ""}`}
      onClick={toggleBag}
      aria-label={isAdded ? `Remove ${product.sku} from shopping bag` : `Add ${product.sku} to shopping bag`}
    >
      {isAdded ? "Added to Bag" : "Add to Bag"}
    </button>
  );
}
