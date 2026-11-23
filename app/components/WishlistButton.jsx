"use client";

import { useEffect, useState } from "react";

import { useShopLocale } from "../hooks/useShopLocale";
import { fill } from "../lib/i18n";

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

// One heart outline: filled when the piece is saved, an outline when it is not,
// so the two states differ by shape and not only by a pale tint.
function HeartIcon() {
  return (
    <svg className="wishlist-heart" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export default function WishlistButton({ item, variant = "icon" }) {
  const { t } = useShopLocale();
  const copy = t.wishlistButton;
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

  if (variant === "action") {
    return (
      <button
        type="button"
        className={`product-action wishlist-action${isSaved ? " is-added is-saved" : ""}`}
        aria-pressed={isSaved}
        aria-label={isSaved ? fill(copy.remove, { code: item.title }) : fill(copy.save, { code: item.title })}
        onClick={toggleWishlist}
      >
        <span className="wishlist-action-icon" aria-hidden="true">{isSaved ? "♥" : "♡"}</span>
        <span>{isSaved ? copy.saved : copy.add}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`wishlist-toggle${isSaved ? " is-saved" : ""}`}
      aria-pressed={isSaved}
      aria-label={isSaved ? fill(copy.remove, { code: item.title }) : fill(copy.save, { code: item.title })}
      onClick={toggleWishlist}
    >
      <HeartIcon />
    </button>
  );
}
