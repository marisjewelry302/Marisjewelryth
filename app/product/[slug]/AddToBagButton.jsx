"use client";

import { useState, useEffect } from "react";
import { useCustomerSession } from "../../hooks/useCustomerSession";
import { useShopLocale } from "../../hooks/useShopLocale";
import { createBagItem, getBagIdForProduct, readBag, updateBag } from "../../lib/bag-store";
import { fill } from "../../lib/i18n";

export default function AddToBagButton({ product, collectionLabel }) {
  const { t } = useShopLocale();
  const copy = t.product;
  const { customer } = useCustomerSession();
  const productId = getBagIdForProduct(product);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    setIsAdded(readBag().some((item) => item.id === productId));
  }, [productId]);

  async function toggleBag() {
    // Reads the bag again inside the update, so a signed-in customer's saved bag
    // is merged in first and the toggle applies to the real current state.
    const next = await updateBag((bag) => (
      bag.some((item) => item.id === productId)
        ? bag.filter((item) => item.id !== productId)
        : [createBagItem(product, collectionLabel), ...bag]
    ), { customerId: customer?.id || "" });

    setIsAdded(next.some((item) => item.id === productId));
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
