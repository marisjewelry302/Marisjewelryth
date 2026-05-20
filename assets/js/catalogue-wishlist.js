Promise.resolve(window.MARIS_DATA_READY)
  .catch(() => null)
  .then(() => {
  const wishlistKey = "marisWishlist";
  const productCards = Array.from(document.querySelectorAll(".product-card"));

  if (!productCards.length) {
    return;
  }

  function readWishlist() {
    try {
      return JSON.parse(localStorage.getItem(wishlistKey)) || [];
    } catch (error) {
      return [];
    }
  }

  function writeWishlist(items) {
    try {
      localStorage.setItem(wishlistKey, JSON.stringify(items));
    } catch (error) {
      return;
    }
  }

  function getCurrentPageName() {
    return window.location.pathname.split("/").pop() || "engagement-ring.html";
  }

  function getCollectionName() {
    const heading = document.querySelector(".page-header h1");
    return heading ? heading.textContent.trim() : document.title.trim();
  }

  function getProductData(card) {
    const image = card.querySelector("img");
    const title = card.querySelector(".product-info h3")?.textContent.trim() || card.dataset.code || "Maris Piece";
    const details = Array.from(card.querySelectorAll(".product-info p"))
      .map((detail) => detail.textContent.trim())
      .filter(Boolean);
    const pageName = getCurrentPageName();

    return {
      id: `${pageName}:${card.dataset.code || title}`,
      title,
      details,
      image: image?.dataset.original || image?.getAttribute("src") || "",
      href: pageName,
      collection: getCollectionName()
    };
  }

  function setButtonState(button, isSaved, productTitle) {
    button.classList.toggle("is-saved", isSaved);
    button.setAttribute("aria-pressed", String(isSaved));
    button.setAttribute(
      "aria-label",
      isSaved ? `Remove ${productTitle} from wishlist` : `Save ${productTitle} to wishlist`
    );
    button.textContent = isSaved ? "\u2665" : "\u2661";
  }

  productCards.forEach((card) => {
    const info = card.querySelector(".product-info");
    const product = getProductData(card);

    if (!info || info.querySelector(".wishlist-toggle")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "wishlist-toggle";
    info.appendChild(button);

    setButtonState(button, readWishlist().some((item) => item.id === product.id), product.title);

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const latestProduct = getProductData(card);
      const wishlist = readWishlist();
      const existingIndex = wishlist.findIndex((item) => item.id === latestProduct.id);

      if (existingIndex >= 0) {
        wishlist.splice(existingIndex, 1);
        setButtonState(button, false, latestProduct.title);
      } else {
        wishlist.unshift({
          ...latestProduct,
          savedAt: new Date().toISOString()
        });
        setButtonState(button, true, latestProduct.title);
      }

      writeWishlist(wishlist);
    });
  });
});
