// The one shopping-bag store (and the wishlist's owner tag), shared by the product page, the Ready to Ship
// grid and the bag page. The bag lives in this browser's localStorage; when a
// customer is signed in every change is also saved to their account, so a piece
// removed on a product page does not come back on the bag page.
//
// The local bag is tagged with the customer it belongs to. A bag that belongs to
// someone else is never merged into the account that signs in next, and the
// account page clears it on sign-out. The saved-pieces wishlist follows the same
// rule through the helpers at the end of this file.

import {
  PUBLIC_PRODUCT_KIND_NAMES,
  getPublicProductDisplayName,
  getPublicProductKind,
  getPublicProductPath
} from "./product-display";

export const BAG_KEY = "marisShoppingBag";
export const BAG_OWNER_KEY = "marisShoppingBagOwner";
export const BAG_CHANGE_EVENT = "maris:bagchange";
export const MAX_BAG_QUANTITY = 9;

const BAG_API = "/api/account/bag";

export function getBagItemId(item) {
  return String(item?.id || item?.productId || item?.href || item?.title || item?.sku || "").trim();
}

export function clampQuantity(value) {
  const quantity = Math.round(Number(value) || 1);
  return Math.max(1, Math.min(MAX_BAG_QUANTITY, quantity));
}

export function normalizeBag(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const id = getBagItemId(item);

    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    normalized.push({ ...item, id, quantity: clampQuantity(item.quantity) });
  }

  return normalized;
}

export function mergeBagItems(localItems, remoteItems) {
  const merged = new Map();

  for (const item of normalizeBag(remoteItems)) {
    merged.set(item.id, item);
  }

  for (const item of normalizeBag(localItems)) {
    merged.set(item.id, item);
  }

  return [...merged.values()];
}

export function readBag() {
  try {
    return normalizeBag(JSON.parse(window.localStorage.getItem(BAG_KEY)));
  } catch {
    return [];
  }
}

export function writeBag(items) {
  try {
    window.localStorage.setItem(BAG_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(BAG_CHANGE_EVENT));
    return true;
  } catch {
    // Keep the page usable if browser storage is unavailable.
    return false;
  }
}

function readBagOwner() {
  try {
    return window.localStorage.getItem(BAG_OWNER_KEY) || "";
  } catch {
    return "";
  }
}

function writeBagOwner(customerId) {
  try {
    if (customerId) {
      window.localStorage.setItem(BAG_OWNER_KEY, String(customerId));
    } else {
      window.localStorage.removeItem(BAG_OWNER_KEY);
    }
  } catch {
    // Storage unavailable: nothing to tag.
  }
}

let syncedCustomerId = null;
let syncPromise = null;
let syncPromiseCustomerId = null;

// Called when the customer signs out: the bag on this device is theirs, so it
// goes with the session and cannot reach the next person who signs in here.
export function clearLocalBag() {
  syncedCustomerId = null;
  syncPromise = null;
  syncPromiseCustomerId = null;

  try {
    window.localStorage.removeItem(BAG_KEY);
    window.localStorage.removeItem(BAG_OWNER_KEY);
    window.dispatchEvent(new CustomEvent(BAG_CHANGE_EVENT));
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

async function loadRemoteBag() {
  const response = await fetch(BAG_API, { cache: "no-store", credentials: "same-origin" });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Shopping bag could not be loaded.");
  }

  const payload = await response.json();
  return normalizeBag(payload?.items);
}

async function saveRemoteBag(items) {
  const response = await fetch(BAG_API, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ items })
  });

  if (response.status === 401) {
    return false;
  }

  if (!response.ok) {
    throw new Error("Shopping bag could not be synced.");
  }

  return true;
}

// Brings the account's saved bag into this browser once per page load. The
// local bag is merged in only when it is anonymous or already this customer's.
export function syncBagWithAccount(customerId) {
  if (!customerId) {
    return Promise.resolve(readBag());
  }

  if (syncedCustomerId === customerId) {
    return Promise.resolve(readBag());
  }

  if (syncPromise && syncPromiseCustomerId === customerId) {
    return syncPromise;
  }

  syncPromiseCustomerId = customerId;
  syncPromise = (async () => {
    try {
      const remote = await loadRemoteBag();

      if (remote === null) {
        return readBag();
      }

      const owner = readBagOwner();
      const local = !owner || owner === String(customerId) ? readBag() : [];
      const merged = mergeBagItems(local, remote);

      writeBag(merged);
      writeBagOwner(customerId);
      await saveRemoteBag(merged);
      syncedCustomerId = customerId;
      return merged;
    } catch {
      return readBag();
    } finally {
      syncPromise = null;
      syncPromiseCustomerId = null;
    }
  })();

  return syncPromise;
}

// Applies a change to the bag. Always saved locally; saved to the account too
// when a customer is signed in. Returns the new items.
export async function updateBag(mutate, { customerId = "" } = {}) {
  if (customerId) {
    await syncBagWithAccount(customerId);
  }

  const next = normalizeBag(mutate(readBag()));

  writeBag(next);

  if (customerId) {
    writeBagOwner(customerId);
    saveRemoteBag(next).catch(() => {});
  }

  return next;
}

// ─── Wishlist owner ────────────────────────────────────────────────────────
// The wishlist lives in localStorage too, so it leaks between customers on a
// shared browser the same way the bag did. It is tagged with its owner; a list
// owned by another customer is never merged, and sign-out clears it.

export const WISHLIST_KEY = "marisWishlist";
export const WISHLIST_OWNER_KEY = "marisWishlistOwner";
export const WISHLIST_CHANGE_EVENT = "maris:wishlistchange";

export function readWishlistOwner() {
  try {
    return window.localStorage.getItem(WISHLIST_OWNER_KEY) || "";
  } catch {
    return "";
  }
}

export function writeWishlistOwner(customerId) {
  try {
    if (customerId) {
      window.localStorage.setItem(WISHLIST_OWNER_KEY, String(customerId));
    } else {
      window.localStorage.removeItem(WISHLIST_OWNER_KEY);
    }
  } catch {
    // Storage unavailable: nothing to tag.
  }
}

// True when the wishlist in this browser is anonymous or already this customer's.
export function canMergeLocalWishlist(customerId) {
  const owner = readWishlistOwner();
  return !owner || owner === String(customerId);
}

export function clearLocalWishlist() {
  try {
    window.localStorage.removeItem(WISHLIST_KEY);
    window.localStorage.removeItem(WISHLIST_OWNER_KEY);
    window.dispatchEvent(new CustomEvent(WISHLIST_CHANGE_EVENT));
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

// The item a product becomes in the bag. Only language-neutral data is stored
// (code, kind, English collection title); names are derived when it renders.
export function createBagItem(product, collection) {
  return {
    id: getBagIdForProduct(product),
    title: product.sku,
    kind: getPublicProductKind(product),
    details: [getPublicProductDisplayName(product)],
    image: product.primaryImageUrl,
    href: getPublicProductPath(product),
    collection,
    priceLabel: product.basePrice === null ? "Price on request" : `${Number(product.basePrice).toLocaleString()} THB`,
    quantity: 1,
    addedAt: new Date().toISOString()
  };
}

// The product page and Ready to Ship share this id, so a piece added in one
// place shows as added in the other.
export function getBagIdForProduct(product) {
  return `${product.collection}:${product.sku}`;
}

const KIND_BY_ENGLISH_NAME = Object.fromEntries(
  Object.entries(PUBLIC_PRODUCT_KIND_NAMES).map(([kind, name]) => [name, kind])
);

// Detail lines for display, in the page's language. Items saved before "kind"
// existed carry the English name, which is looked up the same way.
export function getBagItemDetails(item, kindLabels = {}) {
  const details = Array.isArray(item?.details) ? item.details : [];
  const kind = item?.kind || KIND_BY_ENGLISH_NAME[details[0]];

  if (kind && kindLabels[kind]) {
    return [kindLabels[kind], ...details.slice(1)];
  }

  return details;
}
