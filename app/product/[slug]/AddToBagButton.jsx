"use client";

import { useState, useEffect } from "react";
import { useShopLocale } from "../../hooks/useShopLocale";
import { fill } from "../../lib/i18n";
import { getPublicProductDisplayName, getPublicProductPath } from "../../lib/product-display";

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
  const { t } = useShopLocale();
  const copy = t.product;
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
      href: getPublicProductPath(product),
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
      aria-label={isAdded ? fill(copy.removeLabel, { code: product.sku }) : fill(copy.addLabel, { code: product.sku })}
    >
      {isAdded ? copy.addedToBag : copy.addToBag}
    </button>
  );
}
