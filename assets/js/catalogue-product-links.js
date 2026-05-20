Promise.resolve(window.MARIS_DATA_READY)
  .catch(() => null)
  .then(() => {
  const productCards = Array.from(document.querySelectorAll(".product-card"));

  if (!productCards.length) {
    return;
  }

  const collection = window.location.pathname.split("/").pop()?.replace(".html", "") || "engagement-ring";

  function getProductUrl(card) {
    const code = card.dataset.code;
    return `product.html?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(code)}`;
  }

  productCards.forEach((card) => {
    if (!card.dataset.code) {
      return;
    }

    card.classList.add("is-clickable");
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `View product ${card.dataset.code}`);

    card.addEventListener("click", (event) => {
      if (event.target.closest("button, a, select")) {
        return;
      }

      window.location.href = getProductUrl(card);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      window.location.href = getProductUrl(card);
    });
  });
});
