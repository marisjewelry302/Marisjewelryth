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

export default function WishlistButton({ item }) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    function syncSavedState() {
      setIsSaved(readWishlist().some((savedItem) => savedItem.id === item.id));
    }

    syncSavedState();
    window.addEventListener("storage", syncSavedState);
    window.addEventListener("maris:wishlistchange", syncSavedState);

    return () => {
      window.removeEventListener("storage", syncSavedState);
      window.removeEventListener("maris:wishlistchange", syncSavedState);
    };
  }, [item.id]);

  function toggleWishlist() {
    const currentWishlist = readWishlist();

    if (currentWishlist.some((savedItem) => savedItem.id === item.id)) {
      writeWishlist(currentWishlist.filter((savedItem) => savedItem.id !== item.id));
      setIsSaved(false);
      return;
    }

    writeWishlist([{ ...item, addedAt: new Date().toISOString() }, ...currentWishlist]);
    setIsSaved(true);
  }

  return (
    <button
      type="button"
      className={`wishlist-toggle${isSaved ? " is-saved" : ""}`}
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${item.title} from wishlist` : `Save ${item.title} to wishlist`}
      onClick={toggleWishlist}
    >
      ♥
    </button>
  );
}
