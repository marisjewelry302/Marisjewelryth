Promise.resolve(window.MARIS_DATA_READY)
  .catch(() => null)
  .then(() => {
  const products = adminCache.products || [];
  const collectionProducts = window.MARIS_COLLECTION_PRODUCTS || {};
  const grid = document.querySelector("[data-category-products]");
  const sortBy = document.querySelector("#sort-by");
  const filterBy = document.querySelector("#filter-by");

  if (!grid) {
    return;
  }

  const category = grid.dataset.categoryProducts;

  // suffix ลงท้าย SKU กำหนด collection เช่น SR0033ER → engagement-ring
  const suffixCollectionMap = {
    "ER": "engagement-ring",
    "WS": "wedding-set",
    "WB": "wedding-bands",
    "MR": "mens-wedding-bands",
    "NP": "necklaces-pendants",
    "BR": "bracelets",
    "EA": "earrings",
    "RG": "rings"
  };

  // prefix แบบเดิมสำหรับ SKU ที่ไม่มี suffix (เช่น ER0001, WB0002)
  const prefixes = {
    "engagement-ring": ["ER", "DR"],
    "wedding-bands": ["WB"],
    "mens-wedding-bands": ["MB", "MR"],
    "wedding-set": ["WS"],
    "necklaces-pendants": ["NP"],
    "bracelets": ["BR"],
    "earrings": ["EA"],
    "rings": ["RG"]
  };

  function inferCollectionFromCode(code) {
    const upper = String(code || "").toUpperCase();
    // ตรวจ suffix ก่อน: SR0033ER → suffix ER → engagement-ring
    for (const [suffix, col] of Object.entries(suffixCollectionMap)) {
      if (upper.endsWith(suffix) && upper.length > suffix.length) {
        return col;
      }
    }
    // ถ้าไม่มี suffix ดู prefix แบบเดิม
    for (const [col, pfxList] of Object.entries(prefixes)) {
      if ([pfxList].flat().some((pfx) => upper.startsWith(pfx))) {
        return col;
      }
    }
    return "rings"; // default
  }

  const productMap = new Map(products.map((product) => [product.code, product]));
  const configuredCodes = Array.isArray(collectionProducts[category]) ? collectionProducts[category] : [];

  const categoryProducts = configuredCodes.length
    ? configuredCodes
      .map((code) => productMap.get(code))
      .filter(Boolean)
      .map((product, index) => ({ ...product, order: index + 1 }))
    : products
      .filter((product) => inferCollectionFromCode(product.code) === category)
      .map((product, index) => ({ ...product, order: index + 1 }));

  if (!categoryProducts.length) {
    grid.innerHTML = "";
    return;
  }

  function getCaratValue(product) {
    if (typeof product.sortCarat === "number") {
      return product.sortCarat;
    }

    const firstDetail = Array.isArray(product.details) ? product.details[0] : "";
    const match = String(firstDetail).match(/([\d.]+)\s*ct/i);
    return match ? Number(match[1]) : 0;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderProducts() {
    grid.innerHTML = categoryProducts
      .map((product) => `
        <article class="product-card" data-order="${product.order}" data-code="${escapeHtml(product.code)}" data-carat="${getCaratValue(product)}" data-metal="${escapeHtml(product.metal || "")}" data-style="${escapeHtml(product.style || "")}" data-shape="${escapeHtml(product.shape || "")}" data-filters="${escapeHtml(Array.isArray(product.filterValues) ? product.filterValues.join(" ") : "")}">
          <img src="${escapeHtml(product.image)}" data-hover="${escapeHtml(product.hover || product.image)}" alt="${escapeHtml(product.name)}" data-image-presentation="${escapeHtml(product.imagePresentation || "")}">
          <div class="product-info">
            <h3>${escapeHtml(product.title)}</h3>
            <p>${escapeHtml(product.name)}</p>
            ${(product.details || []).map((detail) => `<p>${escapeHtml(detail)}</p>`).join("")}
            <p>${escapeHtml(product.price)}</p>
          </div>
        </article>
      `)
      .join("");
  }

  function getSortComparator(mode) {
    if (mode === "code-asc") {
      return (a, b) => a.dataset.code.localeCompare(b.dataset.code, undefined, { numeric: true });
    }

    if (mode === "carat-desc") {
      return (a, b) => Number(b.dataset.carat) - Number(a.dataset.carat);
    }

    if (mode === "carat-asc") {
      return (a, b) => Number(a.dataset.carat) - Number(b.dataset.carat);
    }

    return (a, b) => Number(a.dataset.order) - Number(b.dataset.order);
  }

  function matchesFilter(card, filterValue) {
    if (!filterValue || filterValue === "all") {
      return true;
    }

    const configuredFilters = (card.dataset.filters || "").split(/\s+/).filter(Boolean);
    return card.dataset.metal === filterValue || card.dataset.style === filterValue || card.dataset.shape === filterValue || configuredFilters.includes(filterValue);
  }

  function updateCatalogue() {
    const productCards = Array.from(grid.querySelectorAll(".product-card"));
    const filterValue = filterBy?.value || "all";
    const comparator = getSortComparator(sortBy?.value || "featured");
    const visibleCards = productCards
      .filter((card) => matchesFilter(card, filterValue))
      .sort(comparator);
    const hiddenCards = productCards.filter((card) => !matchesFilter(card, filterValue));

    [...visibleCards, ...hiddenCards].forEach((card) => {
      grid.appendChild(card);
    });

    visibleCards.forEach((card) => {
      card.hidden = false;
    });

    hiddenCards.forEach((card) => {
      card.hidden = true;
    });
  }

  function swapCatalogueImage(image, nextSrc) {
    window.clearTimeout(image.swapTimer);

    const card = image.closest(".product-card");

    if (!nextSrc || image.getAttribute("src") === nextSrc) {
      card?.classList.remove("is-swapping");
      return;
    }

    card?.classList.add("is-swapping");

    image.swapTimer = window.setTimeout(() => {
      image.setAttribute("src", nextSrc);
      card?.classList.remove("is-swapping");
      image.swapTimer = null;
    }, 80);
  }

  function initImageHover() {
    grid.querySelectorAll(".product-card img[data-hover]").forEach((image) => {
      image.dataset.original = image.getAttribute("src");

      const preloadImage = new Image();
      preloadImage.src = image.dataset.hover;

      image.addEventListener("mouseenter", () => {
        swapCatalogueImage(image, image.dataset.hover);
      });

      image.addEventListener("mouseleave", () => {
        swapCatalogueImage(image, image.dataset.original);
      });

      image.addEventListener("load", () => {
        image.closest(".product-card")?.classList.remove("is-swapping");
      });
    });
  }

  renderProducts();
  initImageHover();
  updateCatalogue();
  sortBy?.addEventListener("change", updateCatalogue);
  filterBy?.addEventListener("change", updateCatalogue);
});
