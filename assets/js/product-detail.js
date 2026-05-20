Promise.resolve(window.MARIS_DATA_READY)
  .catch(() => null)
  .then(() => {
  const bagKey = "marisShoppingBag";
  const products = window.MARIS_PRODUCTS || [];
  const collectionMap = window.MARIS_COLLECTION_META || {
    "engagement-ring": {
      title: "Engagement Rings",
      href: "engagement-ring.html"
    }
  };
  const collectionProducts = window.MARIS_COLLECTION_PRODUCTS || {};
  const params = new URLSearchParams(window.location.search);
  const collectionKey = params.get("collection") || "engagement-ring";
  const collection = collectionMap[collectionKey] || collectionMap["engagement-ring"] || Object.values(collectionMap)[0];

  function inferCollectionKey(item) {
    const configuredCollection = Object.entries(collectionProducts).find(([, codes]) => Array.isArray(codes) && codes.includes(item.code));

    if (configuredCollection) {
      return configuredCollection[0];
    }

    if (item.code.startsWith("WS")) {
      return "wedding-set";
    }

    if (item.code.startsWith("NP")) {
      return "necklaces-pendants";
    }

    if (item.code.startsWith("BR")) {
      return "bracelets";
    }

    if (item.code.startsWith("EA")) {
      return "earrings";
    }

    if (item.code.startsWith("RG")) {
      return "rings";
    }

    return "engagement-ring";
  }

  function getDefaultProductCode(key) {
    const configuredCodes = Array.isArray(collectionProducts[key]) ? collectionProducts[key] : [];

    if (configuredCodes.length) {
      return configuredCodes[0];
    }

    return products.find((item) => inferCollectionKey(item) === key)?.code || products[0]?.code || "";
  }

  const productCode = String(params.get("id") || getDefaultProductCode(collectionKey)).toUpperCase();

  function getLookupCodes(code, key) {
    const normalizedCode = String(code || "").trim().toUpperCase();

    if (!normalizedCode) {
      return [];
    }

    const candidates = [normalizedCode];

    if (key === "engagement-ring" && /^ER\d+$/i.test(normalizedCode)) {
      candidates.push(`DR${normalizedCode.slice(2)}`);
    }

    if (key === "engagement-ring" && /^DR\d+$/i.test(normalizedCode)) {
      candidates.push(`ER${normalizedCode.slice(2)}`);
    }

    if (key === "wedding-bands" && /^WB\d+$/i.test(normalizedCode)) {
      candidates.push(`DR${normalizedCode.slice(2)}`);
    }

    if (key === "wedding-bands" && /^DR\d+$/i.test(normalizedCode)) {
      candidates.push(`WB${normalizedCode.slice(2)}`);
    }

    return [...new Set(candidates)];
  }

  function getDisplayCode(code, key) {
    const normalizedCode = String(code || "").trim().toUpperCase();

    if (!normalizedCode) {
      return "";
    }

    if (key === "engagement-ring" && /^(?:DR|ER)\d+$/i.test(normalizedCode)) {
      return `ER${normalizedCode.slice(2)}`;
    }

    if (key === "wedding-bands" && /^(?:DR|WB)\d+$/i.test(normalizedCode)) {
      return `WB${normalizedCode.slice(2)}`;
    }

    return normalizedCode;
  }

  const resolvedProduct = getLookupCodes(productCode, collectionKey)
    .map((code) => products.find((item) => item.code === code))
    .find(Boolean);
  const product = resolvedProduct || products.find((item) => item.code === productCode) || products[0];
  const displayProductCode = getDisplayCode(product?.code || productCode, collectionKey) || productCode;

  if (!product) {
    return;
  }

  const productId = `${collection.href}:${displayProductCode}`;
  const productUrl = `product.html?collection=${encodeURIComponent(collectionKey)}&id=${encodeURIComponent(displayProductCode)}`;

  const fields = {
    collection: document.querySelector("[data-product-collection]"),
    title: document.querySelector("[data-product-title]"),
    name: document.querySelector("[data-product-name]"),
    gallery: document.querySelector("[data-product-gallery]"),
    image: document.querySelector("[data-product-image]"),
    imageLabel: document.querySelector("[data-product-image-label]"),
    prev: document.querySelector("[data-product-gallery-prev]"),
    next: document.querySelector("[data-product-gallery-next]"),
    thumbnails: document.querySelector("[data-product-thumbnails]"),
    thumbnailsPrev: document.querySelector("[data-product-thumbnails-prev]"),
    thumbnailsNext: document.querySelector("[data-product-thumbnails-next]"),
    lightbox: document.querySelector("[data-product-lightbox]"),
    lightboxImage: document.querySelector("[data-product-lightbox-image]"),
    lightboxClose: document.querySelector("[data-product-lightbox-close]"),
    description: document.querySelector("[data-product-description]"),
    details: document.querySelector("[data-product-details]"),
    price: document.querySelector("[data-product-price]"),
    addToBag: document.querySelector("[data-product-add-bag]"),
    buyNow: document.querySelector("[data-product-buy-now]"),
    alsoLike: document.querySelector("[data-also-like]")
  };
  const galleryItems = (Array.isArray(product.gallery) && product.gallery.length ? product.gallery : [
    {
      src: product.image,
      alt: `${displayProductCode} ${product.name}`,
      label: "Primary View",
      presentation: product.imagePresentation || ""
    }
  ]).map((item, index) => ({
    src: item.src || product.image,
    alt: item.alt || `${displayProductCode} ${product.name}`,
    label: item.label || `View ${index + 1}`,
    presentation: item.presentation || product.imagePresentation || ""
  }));
  let activeGalleryIndex = 0;

  function readBag() {
    try {
      return JSON.parse(localStorage.getItem(bagKey)) || [];
    } catch (error) {
      return [];
    }
  }

  function writeBag(items) {
    try {
      localStorage.setItem(bagKey, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("maris:bagchange"));
      return true;
    } catch (error) {
      return false;
    }
  }

  function isInBag() {
    return readBag().some((item) => item.id === productId);
  }

  function getBagItem() {
    return {
      id: productId,
      title: displayProductCode,
      details: [product.name, ...product.details],
      image: product.image,
      href: productUrl,
      collection: collection.title,
      priceLabel: product.price,
      quantity: 1,
      addedAt: new Date().toISOString()
    };
  }

  function updateAddButton() {
    if (!fields.addToBag) {
      return;
    }

    const saved = isInBag();
    fields.addToBag.classList.toggle("is-added", saved);
    fields.addToBag.textContent = saved ? "Added to Bag" : "Add to Bag";
    fields.addToBag.setAttribute(
      "aria-label",
      saved ? `Remove ${displayProductCode} from shopping bag` : `Add ${displayProductCode} to shopping bag`
    );
  }

  function setImagePresentation(element, presentation) {
    if (!element) {
      return;
    }

    if (presentation) {
      element.dataset.imagePresentation = presentation;
    } else {
      delete element.dataset.imagePresentation;
    }
  }

  function setActiveGalleryImage(index) {
    if (!galleryItems.length) {
      return;
    }

    activeGalleryIndex = Math.max(0, Math.min(index, galleryItems.length - 1));
    const activeItem = galleryItems[activeGalleryIndex];

    fields.image.src = activeItem.src;
    fields.image.alt = activeItem.alt;
    setImagePresentation(fields.image, activeItem.presentation);
    fields.gallery?.setAttribute("aria-label", `Open ${activeItem.label.toLowerCase()} preview for ${displayProductCode}`);

    if (fields.lightboxImage) {
      fields.lightboxImage.src = activeItem.src;
      fields.lightboxImage.alt = `${activeItem.alt} large preview`;
      setImagePresentation(fields.lightboxImage, activeItem.presentation);
    }

    if (fields.imageLabel) {
      fields.imageLabel.textContent = activeItem.label;
    }

    fields.thumbnails?.querySelectorAll("[data-gallery-index]").forEach((button) => {
      const isActive = Number(button.dataset.galleryIndex) === activeGalleryIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));

      if (isActive) {
        button.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }
    });

    updateThumbnailNav();
  }

  function stepGallery(direction) {
    if (galleryItems.length <= 1) {
      return;
    }

    const nextIndex = (activeGalleryIndex + direction + galleryItems.length) % galleryItems.length;
    setActiveGalleryImage(nextIndex);
  }

  function updateThumbnailNav() {
    if (!fields.thumbnails || !fields.thumbnailsPrev || !fields.thumbnailsNext) {
      return;
    }

    const maxScrollLeft = Math.max(0, fields.thumbnails.scrollWidth - fields.thumbnails.clientWidth);
    const canScroll = maxScrollLeft > 4;

    fields.thumbnailsPrev.hidden = !canScroll;
    fields.thumbnailsNext.hidden = !canScroll;

    if (!canScroll) {
      return;
    }

    fields.thumbnailsPrev.disabled = fields.thumbnails.scrollLeft <= 2;
    fields.thumbnailsNext.disabled = fields.thumbnails.scrollLeft >= maxScrollLeft - 2;
  }

  function scrollThumbnailRail(direction) {
    if (!fields.thumbnails) {
      return;
    }

    fields.thumbnails.scrollBy({
      left: direction * Math.max(220, fields.thumbnails.clientWidth * 0.72),
      behavior: "smooth"
    });
  }

  function renderGalleryThumbnails() {
    if (!fields.thumbnails) {
      return;
    }

    if (galleryItems.length <= 1) {
      fields.thumbnails.hidden = true;
      if (fields.thumbnailsPrev) {
        fields.thumbnailsPrev.hidden = true;
      }
      if (fields.thumbnailsNext) {
        fields.thumbnailsNext.hidden = true;
      }
      return;
    }

    fields.thumbnails.hidden = false;
    fields.thumbnails.innerHTML = galleryItems
      .map((item, index) => `
        <button class="product-thumbnail${index === activeGalleryIndex ? " is-active" : ""}" type="button" data-gallery-index="${index}" aria-label="Show ${item.label}" aria-pressed="${index === activeGalleryIndex}">
          <img src="${item.src}" alt="${item.alt}" data-image-presentation="${item.presentation}">
          <span class="product-thumbnail-label">${item.label}</span>
        </button>
      `)
      .join("");

    updateThumbnailNav();
  }

  function addToBag() {
    const bag = readBag();

    if (bag.some((item) => item.id === productId)) {
      return true;
    }

    return writeBag([getBagItem(), ...bag]);
  }

  function toggleBag() {
    const bag = readBag();

    if (bag.some((item) => item.id === productId)) {
      writeBag(bag.filter((item) => item.id !== productId));
    } else {
      writeBag([getBagItem(), ...bag]);
    }

    updateAddButton();
  }

  function renderProduct() {
    document.title = `${displayProductCode} | Maris Jewelry`;

    fields.collection.textContent = collection.title;
    fields.title.textContent = displayProductCode;
    fields.name.textContent = product.name;
    fields.description.textContent = product.description;
    fields.price.textContent = product.price;

    fields.details.innerHTML = product.details
      .map((detail) => `<li>${detail}</li>`)
      .join("");

    renderGalleryThumbnails();
    setActiveGalleryImage(0);
    updateAddButton();
  }

  function renderAlsoLike() {
    if (!fields.alsoLike) {
      return;
    }

    const preferredCodes = Array.isArray(collectionProducts[collectionKey]) ? collectionProducts[collectionKey] : [];
    const seenCodes = new Set([product.code]);
    const recommendations = [];

    preferredCodes.forEach((code) => {
      if (seenCodes.has(code)) {
        return;
      }

      const item = products.find((candidate) => candidate.code === code);

      if (!item) {
        return;
      }

      seenCodes.add(code);
      recommendations.push(item);
    });

    products.forEach((item) => {
      if (seenCodes.has(item.code) || recommendations.length >= 4) {
        return;
      }

      seenCodes.add(item.code);
      recommendations.push(item);
    });

    fields.alsoLike.innerHTML = recommendations
      .slice(0, 4)
      .map((item) => {
        let itemCollectionKey = inferCollectionKey(item);

        if (collectionKey === "wedding-bands" && /^(?:DR|WB)\d+$/i.test(item.code)) {
          itemCollectionKey = "wedding-bands";
        }

        const itemDisplayCode = getDisplayCode(item.code, itemCollectionKey) || item.title;
        const href = `product.html?collection=${encodeURIComponent(itemCollectionKey)}&id=${encodeURIComponent(itemDisplayCode)}`;

        return `
          <a class="also-card" href="${href}">
            <img src="${item.image}" alt="${itemDisplayCode} ${item.name}">
            <span>${itemDisplayCode}</span>
            <small>${item.name}</small>
          </a>
        `;
      })
      .join("");
  }

  function openLightbox() {
    if (!fields.lightbox || !fields.lightboxImage) {
      return;
    }

    fields.lightbox.hidden = false;
    document.body.classList.add("is-lightbox-open");
    fields.lightboxClose?.focus();
  }

  function closeLightbox() {
    if (!fields.lightbox) {
      return;
    }

    fields.lightbox.hidden = true;
    document.body.classList.remove("is-lightbox-open");
    fields.gallery?.focus();
  }

  fields.addToBag?.addEventListener("click", toggleBag);

  fields.gallery?.addEventListener("click", openLightbox);

  fields.prev?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    stepGallery(-1);
  });

  fields.next?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    stepGallery(1);
  });

  fields.thumbnails?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gallery-index]");

    if (!button) {
      return;
    }

    setActiveGalleryImage(Number(button.dataset.galleryIndex));
  });

  fields.thumbnails?.addEventListener("scroll", updateThumbnailNav, { passive: true });

  fields.thumbnailsPrev?.addEventListener("click", () => {
    scrollThumbnailRail(-1);
  });

  fields.thumbnailsNext?.addEventListener("click", () => {
    scrollThumbnailRail(1);
  });

  fields.gallery?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepGallery(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepGallery(1);
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openLightbox();
  });

  fields.lightboxClose?.addEventListener("click", closeLightbox);

  fields.lightbox?.addEventListener("click", (event) => {
    if (event.target === fields.lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && fields.lightbox && !fields.lightbox.hidden) {
      closeLightbox();
      return;
    }

    if (event.key === "ArrowLeft" && fields.lightbox && !fields.lightbox.hidden) {
      stepGallery(-1);
      return;
    }

    if (event.key === "ArrowRight" && fields.lightbox && !fields.lightbox.hidden) {
      stepGallery(1);
    }
  });

  fields.buyNow?.addEventListener("click", () => {
    if (addToBag()) {
      window.location.href = `request-quote.html?collection=${encodeURIComponent(collectionKey)}&id=${encodeURIComponent(product.code)}`;
    }
  });

  window.addEventListener("resize", updateThumbnailNav);

  renderProduct();
  renderAlsoLike();
});
