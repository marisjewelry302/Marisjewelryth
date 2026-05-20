Promise.resolve(window.MARIS_DATA_READY)
  .catch(() => null)
  .then(() => {
  const bagKey = "marisShoppingBag";
  const products = window.MARIS_PRODUCTS || [];
  const params = new URLSearchParams(window.location.search);
  const selectedContainer = document.querySelector("[data-quote-selected]");
  const emptyState = document.querySelector("[data-quote-empty]");
  const intro = document.querySelector("[data-quote-selection-meta]");
  const itemsInput = document.querySelector("[data-quote-items-input]");
  const sourceInput = document.querySelector("[data-quote-source-input]");
  const submitButton = document.querySelector("[data-quote-submit]");
  const returnLink = document.querySelector("[data-quote-return-link]");

  if (!selectedContainer || !emptyState || !itemsInput || !sourceInput) {
    return;
  }

  const collectionMap = window.MARIS_COLLECTION_META || {
    "engagement-ring": {
      title: "Engagement Rings",
      titleTh: "แหวนหมั้น",
      href: "engagement-ring.html"
    }
  };

  const copy = {
    en: {
      selectionSingular: "1 selected piece",
      selectionPlural: "{count} selected pieces",
      selectionLeadSingular: "You are requesting pricing and availability for the selected piece below.",
      selectionLeadPlural: "You are requesting pricing and availability for the selected pieces below.",
      quantity: "Qty",
      emptyTitle: "Choose a piece before requesting a quote",
      emptyBody: "Start from a product page or your shopping bag to bring selected items into this request form.",
      viewDetails: "View details"
    },
    th: {
      selectionSingular: "เลือกไว้ 1 ชิ้น",
      selectionPlural: "เลือกไว้ {count} ชิ้น",
      selectionLeadSingular: "คุณกำลังขอราคาและเช็กสถานะสำหรับสินค้าที่เลือกด้านล่าง",
      selectionLeadPlural: "คุณกำลังขอราคาและเช็กสถานะสำหรับสินค้าที่เลือกด้านล่าง",
      quantity: "จำนวน",
      emptyTitle: "กรุณาเลือกสินค้าก่อนขอใบเสนอราคา",
      emptyBody: "เริ่มจากหน้าสินค้าหรือตะกร้าสินค้า เพื่อส่งรายการที่เลือกเข้ามาในฟอร์มนี้",
      viewDetails: "ดูรายละเอียด"
    }
  };

  function getLanguage() {
    return document.documentElement.lang.toLowerCase().startsWith("th") ? "th" : "en";
  }

  function readBag() {
    try {
      return JSON.parse(localStorage.getItem(bagKey)) || [];
    } catch (error) {
      return [];
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

  function getProductSelection() {
    const id = params.get("id");
    const collectionKey = params.get("collection") || "engagement-ring";

    if (!id) {
      return null;
    }

    const product = products.find((item) => item.code === id);
    const collection = collectionMap[collectionKey] || collectionMap["engagement-ring"] || Object.values(collectionMap)[0];

    if (!product || !collection) {
      return null;
    }

    return {
      id: `${collection.href}:${product.code}`,
      title: product.title,
      name: product.name,
      details: Array.isArray(product.details) ? product.details : [],
      image: product.image,
      href: `product.html?collection=${encodeURIComponent(collectionKey)}&id=${encodeURIComponent(product.code)}`,
      collection: collection.title,
      collectionTh: collection.titleTh,
      quantity: 1
    };
  }

  function getSelectedItems() {
    const productSelection = getProductSelection();

    if (productSelection) {
      return {
        source: "product",
        returnHref: productSelection.href,
        items: [productSelection]
      };
    }

    const bagItems = readBag();

    if (Array.isArray(bagItems) && bagItems.length) {
      return {
        source: "bag",
        returnHref: "shopping-bag.html",
        items: bagItems
      };
    }

    return {
      source: "empty",
      returnHref: "engagement-ring.html",
      items: []
    };
  }

  function buildItemsSummary(items, language) {
    return items.map((item, index) => {
      const lines = [
        `${index + 1}. ${item.title || "Maris Piece"} (${language === "th" ? item.collectionTh || item.collection || "Maris Jewelry" : item.collection || "Maris Jewelry"})`,
        `${copy[language].quantity}: ${Number(item.quantity) || 1}`
      ];

      if (item.name) {
        lines.push(item.name);
      }

      (Array.isArray(item.details) ? item.details : []).forEach((detail) => {
        lines.push(`- ${detail}`);
      });

      return lines.join("\n");
    }).join("\n\n");
  }

  function renderSelection() {
    const language = getLanguage();
    const selection = getSelectedItems();
    const itemCount = selection.items.length;

    sourceInput.value = selection.source;
    itemsInput.value = buildItemsSummary(selection.items, language);

    if (returnLink) {
      returnLink.href = selection.returnHref;
    }

    if (!itemCount) {
      emptyState.hidden = false;
      selectedContainer.hidden = true;
      submitButton?.setAttribute("disabled", "disabled");

      if (intro) {
        intro.innerHTML = `
          <strong>${copy[language].emptyTitle}</strong>
          <span>${copy[language].emptyBody}</span>
        `;
      }

      selectedContainer.innerHTML = "";
      return;
    }

    emptyState.hidden = true;
    selectedContainer.hidden = false;
    submitButton?.removeAttribute("disabled");

    if (intro) {
      const countText = itemCount === 1
        ? copy[language].selectionSingular
        : copy[language].selectionPlural.replace("{count}", String(itemCount));

      intro.innerHTML = `
        <strong>${countText}</strong>
        <span>${itemCount === 1 ? copy[language].selectionLeadSingular : copy[language].selectionLeadPlural}</span>
      `;
    }

    selectedContainer.innerHTML = selection.items.map((item) => `
      <article class="selected-piece-card">
        <a class="selected-piece-image" href="${escapeHtml(item.href || "engagement-ring.html")}">
          <img src="${escapeHtml(item.image || "../assets/images/logo.png")}" alt="${escapeHtml(item.title || "Maris Piece")}">
        </a>
        <div class="selected-piece-copy">
          <p class="selected-piece-collection">${escapeHtml(language === "th" ? item.collectionTh || item.collection || "Maris Jewelry" : item.collection || "Maris Jewelry")}</p>
          <h2>${escapeHtml(item.title || "Maris Piece")}</h2>
          ${item.name ? `<p>${escapeHtml(item.name)}</p>` : ""}
          ${(Array.isArray(item.details) ? item.details : []).map((detail) => `<p>${escapeHtml(detail)}</p>`).join("")}
        </div>
        <div class="selected-piece-meta">
          <span>${copy[language].quantity}: ${Number(item.quantity) || 1}</span>
          <a href="${escapeHtml(item.href || "engagement-ring.html")}">${copy[language].viewDetails}</a>
        </div>
      </article>
    `).join("");
  }

  renderSelection();

  const observer = new MutationObserver((mutations) => {
    const langChanged = mutations.some((mutation) => mutation.type === "attributes" && mutation.attributeName === "lang");

    if (langChanged) {
      renderSelection();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });

  window.addEventListener("maris:bagchange", renderSelection);
});
