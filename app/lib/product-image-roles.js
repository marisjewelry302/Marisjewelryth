// Product photography plays two parts. Cover images (at most two) dress the
// catalogue card: the first is shown, the second replaces it on hover. Info
// images are the set the product page lays out. The role is kept in
// product_images.metadata, so no schema change is needed; rows saved before
// roles existed carry none and keep the behaviour they always had.

export const PRODUCT_IMAGE_ROLE_COVER = "cover";
export const PRODUCT_IMAGE_ROLE_INFO = "info";
export const COVER_IMAGE_LIMIT = 2;

export function normalizeProductImageRole(value) {
  const role = String(value || "").trim().toLowerCase();

  return role === PRODUCT_IMAGE_ROLE_COVER || role === PRODUCT_IMAGE_ROLE_INFO ? role : "";
}

export function clampCoverSlot(value) {
  const slot = Number(value);

  return Number.isInteger(slot) && slot > 0 && slot < COVER_IMAGE_LIMIT ? slot : 0;
}

function bySortOrder(left, right) {
  return (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0);
}

// `images` arrives already ordered primary-first. Untagged rows fall back to the
// old reading - the first two images cover the card and every image fills the
// page - so a piece nobody has re-sorted in admin still looks the same.
export function splitProductImages(images = []) {
  const list = Array.isArray(images) ? images : [];
  const tagged = list.filter((image) => normalizeProductImageRole(image.role));

  if (!tagged.length) {
    return {
      coverImages: list.slice(0, COVER_IMAGE_LIMIT),
      infoImages: list
    };
  }

  const covers = list
    .filter((image) => image.role === PRODUCT_IMAGE_ROLE_COVER)
    .sort(bySortOrder)
    .slice(0, COVER_IMAGE_LIMIT);
  const info = list
    .filter((image) => image.role !== PRODUCT_IMAGE_ROLE_COVER)
    .sort(bySortOrder);
  // A piece that so far has only covers still needs something on its page, and
  // one that so far has only info photography still needs a card image.
  const infoImages = info.length ? info : covers;
  const coverImages = covers.length ? covers : infoImages.slice(0, COVER_IMAGE_LIMIT);

  return { coverImages, infoImages };
}
