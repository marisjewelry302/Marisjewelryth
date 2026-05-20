(() => {
  const bagKey = "marisShoppingBag";
  const emptyState = document.querySelector("[data-bag-empty]");
  const bagContent = document.querySelector("[data-bag-content]");
  const bagList = document.querySelector("[data-bag-list]");
  const bagCount = document.querySelector("[data-bag-count]");
  const bagTotal = document.querySelector("[data-bag-total]");
  const clearButton = document.querySelector("[data-bag-clear]");
  const requestLink = document.querySelector("[data-bag-request]");

  if (!emptyState || !bagContent || !bagList || !bagCount || !bagTotal) {
    return;
  }

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

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getTotalQuantity(items) {
    return items.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
  }

  function getCountText(total) {
    if (total === 1) {
      return "1 piece selected";
    }

    return `${total} pieces selected`;
  }

  function renderBag() {
    const items = readBag();
    const totalQuantity = getTotalQuantity(items);

    bagCount.textContent = getCountText(totalQuantity);
    bagTotal.textContent = String(totalQuantity);
    emptyState.hidden = items.length > 0;
    bagContent.hidden = items.length === 0;

    if (requestLink) {
      requestLink.href = "request-quote.html?source=bag";
    }

    if (!items.length) {
      bagList.innerHTML = "";
      return;
    }

    bagList.innerHTML = items
      .map((item) => {
        const details = Array.isArray(item.details) ? item.details : [];
        const quantity = Number(item.quantity) || 1;

        return `
          <article class="bag-item">
            <a class="bag-image" href="${escapeHtml(item.href || "engagement-ring.html")}">
              <img src="${escapeHtml(item.image || "../assets/images/logo.png")}" alt="${escapeHtml(item.title || "Shopping bag item")}">
            </a>
            <div class="bag-copy">
              <p class="bag-collection">${escapeHtml(item.collection || "Maris Jewelry")}</p>
              <h2>${escapeHtml(item.title || "Maris Piece")}</h2>
              ${details.map((detail) => `<p>${escapeHtml(detail)}</p>`).join("")}
              <p class="bag-price">${escapeHtml(item.priceLabel || "Price on request")}</p>
            </div>
            <div class="bag-controls">
              <label>
                Qty
                <input type="number" min="1" max="9" value="${quantity}" data-bag-quantity="${escapeHtml(item.id || "")}">
              </label>
              <button type="button" data-remove-bag="${escapeHtml(item.id || "")}">Remove</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  bagList.addEventListener("input", (event) => {
    const quantityInput = event.target.closest("[data-bag-quantity]");

    if (!quantityInput) {
      return;
    }

    const nextQuantity = Math.max(1, Math.min(9, Number(quantityInput.value) || 1));
    const itemId = quantityInput.dataset.bagQuantity;
    const items = readBag().map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        quantity: nextQuantity,
        updatedAt: new Date().toISOString()
      };
    });

    writeBag(items);
    renderBag();
  });

  bagList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-bag]");

    if (!removeButton) {
      return;
    }

    const removeId = removeButton.dataset.removeBag;
    writeBag(readBag().filter((item) => item.id !== removeId));
    renderBag();
  });

  clearButton?.addEventListener("click", () => {
    writeBag([]);
    renderBag();
  });

  renderBag();
})();
