(() => {
  const bagKey = "marisShoppingBag";
  const badges = Array.from(document.querySelectorAll("[data-bag-count-badge]"));

  if (!badges.length) {
    return;
  }

  function readBag() {
    try {
      return JSON.parse(localStorage.getItem(bagKey)) || [];
    } catch (error) {
      return [];
    }
  }

  function getTotalQuantity() {
    const items = readBag();

    if (!Array.isArray(items)) {
      return 0;
    }

    return items.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
  }

  function updateBadges() {
    const totalQuantity = getTotalQuantity();

    badges.forEach((badge) => {
      badge.textContent = String(totalQuantity);
      badge.hidden = totalQuantity === 0;
    });
  }

  window.addEventListener("maris:bagchange", updateBadges);
  window.addEventListener("storage", (event) => {
    if (event.key === bagKey) {
      updateBadges();
    }
  });

  updateBadges();
})();
