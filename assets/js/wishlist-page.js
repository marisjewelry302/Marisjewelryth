(() => {
  const wishlistKey = "marisWishlist";
  const list = document.querySelector("[data-wishlist-list]");
  const emptyState = document.querySelector("[data-wishlist-empty]");
  const count = document.querySelector("[data-wishlist-count]");

  if (!list || !emptyState || !count) {
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

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getCountText(total) {
    if (total === 1) {
      return "1 saved piece";
    }

    return `${total} saved pieces`;
  }

  function renderWishlist() {
    const items = readWishlist();

    count.textContent = getCountText(items.length);
    emptyState.hidden = items.length > 0;
    list.hidden = items.length === 0;

    if (!items.length) {
      list.innerHTML = "";
      return;
    }

    list.innerHTML = items
      .map((item) => {
        const details = Array.isArray(item.details) ? item.details : [];
        const quoteHref = String(item.href || "engagement-ring.html").replace(/^product\.html/i, "request-quote.html");

        return `
          <article class="wishlist-item">
            <a class="wishlist-image" href="${escapeHtml(item.href || "engagement-ring.html")}">
              <img src="${escapeHtml(item.image || "../assets/images/logo.png")}" alt="${escapeHtml(item.title || "Wishlist item")}">
            </a>
            <div class="wishlist-copy">
              <p class="wishlist-collection">${escapeHtml(item.collection || "Maris Jewelry")}</p>
              <h2>${escapeHtml(item.title || "Maris Piece")}</h2>
              ${details.map((detail) => `<p>${escapeHtml(detail)}</p>`).join("")}
              <div class="wishlist-actions">
                <a href="${escapeHtml(item.href || "engagement-ring.html")}">View Collection</a>
                <a href="${escapeHtml(quoteHref)}">Request Quote</a>
                <button type="button" data-remove-wishlist="${escapeHtml(item.id || "")}">Remove</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  list.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-wishlist]");

    if (!removeButton) {
      return;
    }

    const removeId = removeButton.dataset.removeWishlist;
    const nextWishlist = readWishlist().filter((item) => item.id !== removeId);
    writeWishlist(nextWishlist);
    renderWishlist();
  });

  renderWishlist();
})();
