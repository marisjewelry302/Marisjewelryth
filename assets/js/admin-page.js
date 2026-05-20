(() => {
  const productsKey = "marisAdminProducts";
  const logsKey = "marisInventoryLogs";
  const ordersKey = "marisAdminOrders";
  const settingsKey = "marisAdminSettings";
  const publishedCatalogueKey = "marisPublishedCatalogueProducts";
  const collectionMeta = window.MARIS_COLLECTION_META || {};

  const elements = {
    panels: Array.from(document.querySelectorAll("[data-admin-panel]")),
    tabs: Array.from(document.querySelectorAll("[data-admin-tab]")),
    productForm: document.querySelector("[data-product-form]"),
    catalogueForm: document.querySelector("[data-catalogue-form]"),
    inventoryForm: document.querySelector("[data-inventory-form]"),
    orderForm: document.querySelector("[data-order-form]"),
    settingsForm: document.querySelector("[data-settings-form]"),
    productsTable: document.querySelector("[data-products-table]"),
    publishedCatalogueTable: document.querySelector("[data-published-catalogue-table]"),
    logsTable: document.querySelector("[data-inventory-log-table]"),
    ordersTable: document.querySelector("[data-orders-table]"),
    productSelect: document.querySelector("[data-product-select]"),
    orderProductSelect: document.querySelector("[data-order-product-select]"),
    message: document.querySelector("[data-admin-message]"),
    resetDemo: document.querySelector("[data-reset-demo]"),
    publishedCount: document.querySelector("[data-published-count]"),
    sheetStatus: document.querySelector("[data-sheet-status]"),
    sheetProductCount: document.querySelector("[data-sheet-product-count]"),
    sheetProductCountInline: document.querySelector("[data-sheet-product-count-inline]"),
    sheetLastSync: document.querySelector("[data-sheet-last-sync]"),
    sheetFeedLinks: Array.from(document.querySelectorAll("[data-sheet-feed-link], [data-sheet-feed-link-inline]")),
    sheetCatalogueTable: document.querySelector("[data-sheet-catalogue-table]"),
    totalProducts: document.querySelector("[data-total-products]"),
    totalStock: document.querySelector("[data-total-stock]"),
    totalReserved: document.querySelector("[data-total-reserved]"),
    lowStock: document.querySelector("[data-low-stock]")
  };

  const categoryNames = {
    ER: "Engagement ring - แหวนหมั้น",
    DR: "Engagement Rings",
    WS: "Wedding set - แหวนแต่งงาน",
    WB: "Wedding band - แหวนแถว",
    MB: "Men's Wedding Bands",
    NP: "Necklaces & Pendants",
    BR: "Bracelets",
    EA: "Earrings",
    RG: "Rings"
  };

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getPrefix(code) {
    return String(code).match(/^[A-Z]+/)?.[0] || "MR";
  }

  function getDefaultStock(product, index) {
    if (product.code.startsWith("ER") || product.code.startsWith("DR")) {
      return index < 8 ? 3 : 2;
    }

    return 4;
  }

  function buildSeedProducts() {
    const activeProducts = Array.isArray(window.MARIS_PRODUCTS) ? window.MARIS_PRODUCTS : [];
    const sheetProducts = Array.isArray(window.MARIS_SHEET_PRODUCTS) ? window.MARIS_SHEET_PRODUCTS : [];
    const merged = new Map();

    (activeProducts.length ? activeProducts : sheetProducts).forEach((product) => {
      if (product?.code) {
        merged.set(product.code, product);
      }
    });

    return Array.from(merged.values()).map((product, index) => {
      const prefix = getPrefix(product.code);
      const stockQty = getDefaultStock(product, index);
      const category = product.collectionKey ? getCollectionLabel(product.collectionKey) : (categoryNames[prefix] || "Fine Jewelry");

      return {
        id: product.code,
        sku: product.code,
        name: product.name,
        category,
        price: product.price,
        stockQty,
        reservedQty: 0,
        status: stockQty > 0 ? "Ready" : "Sold Out",
        createdAt: new Date().toISOString()
      };
    });
  }

  function getSettings() {
    return {
      lowStockThreshold: 2,
      ...readJson(settingsKey, {})
    };
  }

  function setMessage(message, isError = false) {
    if (!elements.message) {
      return;
    }

    elements.message.textContent = message;
    elements.message.style.color = isError ? "var(--maris-red)" : "var(--maris-teal)";
  }

  function readProducts() {
    const storedProducts = readJson(productsKey, null);

    if (Array.isArray(storedProducts) && storedProducts.length) {
      return storedProducts;
    }

    const seedProducts = buildSeedProducts();
    writeJson(productsKey, seedProducts);
    return seedProducts;
  }

  function syncProductsWithSeed() {
    const storedProducts = readJson(productsKey, null);
    const seedProducts = buildSeedProducts();

    if (!Array.isArray(storedProducts) || !storedProducts.length) {
      writeProducts(seedProducts);
      return seedProducts;
    }

    const storedById = new Map(storedProducts.map((product) => [product.id, product]));
    const syncedProducts = [];
    const seenIds = new Set();
    let changed = false;

    seedProducts.forEach((seedProduct) => {
      const existingProduct = storedById.get(seedProduct.id);

      if (!existingProduct) {
        syncedProducts.push(seedProduct);
        seenIds.add(seedProduct.id);
        changed = true;
        return;
      }

      const mergedProduct = {
        ...existingProduct,
        sku: seedProduct.sku,
        name: seedProduct.name,
        category: seedProduct.category,
        price: seedProduct.price
      };

      syncedProducts.push(mergedProduct);
      seenIds.add(seedProduct.id);

      if (
        mergedProduct.sku !== existingProduct.sku
        || mergedProduct.name !== existingProduct.name
        || mergedProduct.category !== existingProduct.category
        || mergedProduct.price !== existingProduct.price
      ) {
        changed = true;
      }
    });

    if (changed || syncedProducts.length !== storedProducts.length) {
      writeProducts(syncedProducts);
      return syncedProducts;
    }

    return storedProducts;
  }

  function writeProducts(products) {
    writeJson(productsKey, products);
  }

  function readLogs() {
    return readJson(logsKey, []);
  }

  function writeLogs(logs) {
    writeJson(logsKey, logs);
  }

  function readOrders() {
    return readJson(ordersKey, []);
  }

  function writeOrders(orders) {
    writeJson(ordersKey, orders);
  }

  function readPublishedCatalogueProducts() {
    return readJson(publishedCatalogueKey, []);
  }

  function writePublishedCatalogueProducts(products) {
    writeJson(publishedCatalogueKey, products);
  }

  function getAvailable(product) {
    return Math.max(0, Number(product.stockQty) - Number(product.reservedQty));
  }

  function addLog(product, type, qty, note) {
    const logs = readLogs();
    logs.unshift({
      id: `LOG-${Date.now()}`,
      productId: product.id,
      sku: product.sku,
      type,
      qty: Number(qty),
      note: note || "",
      createdAt: new Date().toISOString()
    });
    writeLogs(logs.slice(0, 80));
  }

  function getMovementLabel(type) {
    const labels = {
      receive: "+ real stock",
      reserve: "+ reserved",
      release: "- reserved",
      sale: "- real / - reserved",
      damage: "- real stock",
      return: "+ real stock"
    };

    return labels[type] || type;
  }

  function getCollectionLabel(collectionKey) {
    return collectionMeta[collectionKey]?.title || collectionKey || "Unassigned";
  }

  function getCollectionHref(collectionKey) {
    return collectionMeta[collectionKey]?.href || "engagement-ring.html";
  }

  function applyMovement(productId, type, qty, note) {
    const products = readProducts();
    const product = products.find((item) => item.id === productId);
    const amount = Number(qty);

    if (!product || !amount || amount < 1) {
      return { ok: false, message: "Please choose a product and valid quantity." };
    }

    if (type === "receive" || type === "return") {
      product.stockQty += amount;
    }

    if (type === "reserve") {
      if (getAvailable(product) < amount) {
        return { ok: false, message: "Not enough available stock to reserve." };
      }

      product.reservedQty += amount;
    }

    if (type === "release") {
      if (product.reservedQty < amount) {
        return { ok: false, message: "Reserved stock is lower than this quantity." };
      }

      product.reservedQty -= amount;
    }

    if (type === "sale") {
      if (product.stockQty < amount || product.reservedQty < amount) {
        return { ok: false, message: "Paid sale needs enough real and reserved stock." };
      }

      product.stockQty -= amount;
      product.reservedQty -= amount;
    }

    if (type === "damage") {
      if (product.stockQty < amount) {
        return { ok: false, message: "Real stock is lower than this quantity." };
      }

      product.stockQty -= amount;
    }

    product.status = product.stockQty > 0 ? (product.status === "Sold Out" ? "Ready" : product.status) : "Sold Out";
    writeProducts(products);
    addLog(product, type, amount, note);
    return { ok: true, message: "Inventory movement saved." };
  }

  function splitTextareaLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function splitTags(value) {
    return String(value || "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function serializeLines(items) {
    return Array.isArray(items) ? items.join("\n") : "";
  }

  function serializeGallery(gallery) {
    if (!Array.isArray(gallery) || !gallery.length) {
      return "";
    }

    return gallery
      .map((item) => [item.label || "", item.src || "", item.alt || ""].join(" | "))
      .join("\n");
  }

  function parseGallery(value, fallbackName, fallbackImage, fallbackHover) {
    const lines = splitTextareaLines(value);
    const gallery = lines
      .map((line, index) => {
        const [labelPart, srcPart, altPart] = line.split("|").map((item) => item?.trim() || "");
        const src = srcPart || labelPart;

        if (!src) {
          return null;
        }

        const label = srcPart ? labelPart || `View ${index + 1}` : `View ${index + 1}`;
        const alt = altPart || `${fallbackName} ${label}`;

        return { label, src, alt };
      })
      .filter(Boolean);

    if (gallery.length) {
      return gallery;
    }

    const fallbackGallery = [];

    if (fallbackImage) {
      fallbackGallery.push({
        label: "Primary View",
        src: fallbackImage,
        alt: `${fallbackName} primary view`
      });
    }

    if (fallbackHover && fallbackHover !== fallbackImage) {
      fallbackGallery.push({
        label: "Alternate View",
        src: fallbackHover,
        alt: `${fallbackName} alternate view`
      });
    }

    return fallbackGallery;
  }

  function buildPublishedProduct(formData) {
    const code = String(formData.get("code") || "").trim().toUpperCase();
    const collectionKey = String(formData.get("collectionKey") || "").trim();
    const title = String(formData.get("title") || code).trim() || code;
    const name = String(formData.get("name") || "").trim();
    const image = String(formData.get("image") || "").trim();
    const hover = String(formData.get("hover") || image).trim() || image;
    const description = String(formData.get("description") || "").trim();
    const details = splitTextareaLines(formData.get("details"));
    const price = String(formData.get("price") || "Price on request").trim() || "Price on request";
    const metal = String(formData.get("metal") || "").trim();
    const style = String(formData.get("style") || "").trim();
    const shape = String(formData.get("shape") || "").trim();
    const imagePresentation = String(formData.get("imagePresentation") || "").trim();
    const manualFilters = splitTags(formData.get("filterValues"));
    const filterValues = Array.from(new Set([...manualFilters, metal, style, shape].filter(Boolean)));
    const gallery = parseGallery(formData.get("gallery"), name || title, image, hover);
    const stockQty = Math.max(0, Number(formData.get("catalogueStockQty")) || 0);

    if (!code || !collectionKey || !name || !image) {
      return {
        ok: false,
        message: "Product code, collection, product name, and main image path are required."
      };
    }

    if (!collectionMeta[collectionKey]) {
      return {
        ok: false,
        message: "Please choose a valid collection."
      };
    }

    return {
      ok: true,
      product: {
        code,
        title,
        name,
        details,
        description,
        image,
        hover,
        price,
        metal,
        style,
        shape,
        filterValues,
        gallery,
        imagePresentation,
        collectionKey,
        updatedAt: new Date().toISOString()
      },
      stockQty
    };
  }

  function upsertAdminProductFromCatalogue(catalogueProduct, stockQty) {
    const products = readProducts();
    const existingProduct = products.find((product) => product.id === catalogueProduct.code);
    const category = getCollectionLabel(catalogueProduct.collectionKey);

    if (existingProduct) {
      existingProduct.sku = catalogueProduct.code;
      existingProduct.name = catalogueProduct.name;
      existingProduct.category = category;
      existingProduct.price = catalogueProduct.price;
      writeProducts(products);
      return;
    }

    const product = {
      id: catalogueProduct.code,
      sku: catalogueProduct.code,
      name: catalogueProduct.name,
      category,
      price: catalogueProduct.price,
      stockQty,
      reservedQty: 0,
      status: stockQty > 0 ? "Ready" : "Sold Out",
      createdAt: new Date().toISOString()
    };

    products.unshift(product);
    writeProducts(products);

    if (stockQty > 0) {
      addLog(product, "receive", stockQty, "Initial stock from catalogue publish");
    }
  }

  function fillCatalogueForm(product) {
    if (!elements.catalogueForm) {
      return;
    }

    elements.catalogueForm.elements.code.value = product.code || "";
    elements.catalogueForm.elements.collectionKey.value = product.collectionKey || "engagement-ring";
    elements.catalogueForm.elements.title.value = product.title || "";
    elements.catalogueForm.elements.name.value = product.name || "";
    elements.catalogueForm.elements.description.value = product.description || "";
    elements.catalogueForm.elements.details.value = serializeLines(product.details);
    elements.catalogueForm.elements.price.value = product.price || "Price on request";
    elements.catalogueForm.elements.image.value = product.image || "";
    elements.catalogueForm.elements.hover.value = product.hover || "";
    elements.catalogueForm.elements.imagePresentation.value = product.imagePresentation || "";
    elements.catalogueForm.elements.metal.value = product.metal || "";
    elements.catalogueForm.elements.style.value = product.style || "";
    elements.catalogueForm.elements.shape.value = product.shape || "";
    elements.catalogueForm.elements.filterValues.value = Array.isArray(product.filterValues) ? product.filterValues.join(", ") : "";
    elements.catalogueForm.elements.gallery.value = serializeGallery(product.gallery);
    elements.catalogueForm.elements.catalogueStockQty.value = "1";
  }

  function renderStats() {
    const products = readProducts();
    const settings = getSettings();
    const totalStock = products.reduce((sum, product) => sum + Number(product.stockQty), 0);
    const totalReserved = products.reduce((sum, product) => sum + Number(product.reservedQty), 0);
    const lowStock = products.filter((product) => getAvailable(product) <= settings.lowStockThreshold).length;

    elements.totalProducts.textContent = String(products.length);
    elements.totalStock.textContent = String(totalStock);
    elements.totalReserved.textContent = String(totalReserved);
    elements.lowStock.textContent = String(lowStock);
  }

  function renderSelects() {
    const products = readProducts();
    const options = products
      .map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.sku)} - ${escapeHtml(product.name)} (${getAvailable(product)} available)</option>`)
      .join("");

    if (elements.productSelect) {
      elements.productSelect.innerHTML = options;
    }

    if (elements.orderProductSelect) {
      elements.orderProductSelect.innerHTML = options;
    }
  }

  function renderProductsTable() {
    const settings = getSettings();
    const rows = readProducts()
      .map((product) => {
        const available = getAvailable(product);
        const stockClass = available <= settings.lowStockThreshold ? "stock-low" : "stock-ok";

        return `
          <tr>
            <td><strong>${escapeHtml(product.sku)}</strong></td>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.category)}</td>
            <td>${escapeHtml(product.price || "Price on request")}</td>
            <td>${product.stockQty}</td>
            <td>${product.reservedQty}</td>
            <td class="${stockClass}">${available}</td>
            <td>${escapeHtml(product.status)}</td>
          </tr>
        `;
      })
      .join("");

    elements.productsTable.innerHTML = rows;
  }

  function renderPublishedCatalogueTable() {
    if (!elements.publishedCatalogueTable) {
      return;
    }

    const publishedProducts = readPublishedCatalogueProducts();

    if (elements.publishedCount) {
      elements.publishedCount.textContent = String(publishedProducts.length);
    }

    const rows = publishedProducts
      .map((product) => {
        const href = `product.html?collection=${encodeURIComponent(product.collectionKey || "engagement-ring")}&id=${encodeURIComponent(product.code)}`;

        return `
          <tr>
            <td><strong>${escapeHtml(product.code)}</strong></td>
            <td>${escapeHtml(getCollectionLabel(product.collectionKey))}</td>
            <td>
              <strong>${escapeHtml(product.name || product.title || product.code)}</strong>
              <div>${escapeHtml(product.price || "Price on request")}</div>
            </td>
            <td>${escapeHtml(product.image || "-")}</td>
            <td>${Array.isArray(product.gallery) ? product.gallery.length : 0}</td>
            <td>
              <div class="admin-row-actions">
                <button type="button" data-catalogue-edit="${escapeHtml(product.code)}">Edit</button>
                <button type="button" data-catalogue-delete="${escapeHtml(product.code)}">Unpublish</button>
                <a class="admin-secondary" href="${href}" target="_blank" rel="noopener noreferrer">Preview</a>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    elements.publishedCatalogueTable.innerHTML = rows || `<tr><td colspan="6">No published catalogue items yet.</td></tr>`;
  }

  function formatSyncTimestamp(value) {
    if (!value) {
      return "Waiting...";
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Waiting..." : parsed.toLocaleString();
  }

  function renderSheetFeed() {
    const sheetStatus = window.MARIS_SHEET_STATUS || {};
    const statusLabel = {
      loading: "Loading feed...",
      ready: "Connected",
      error: "Feed unavailable"
    }[sheetStatus.status] || "Waiting...";
    const sheetCount = Array.isArray(window.MARIS_SHEET_PRODUCTS) ? window.MARIS_SHEET_PRODUCTS.length : 0;
    const feedUrl = String(sheetStatus.sheetUrl || window.MARIS_GOOGLE_SHEET_URL || "").trim();

    if (elements.sheetStatus) {
      elements.sheetStatus.textContent = statusLabel;
      elements.sheetStatus.dataset.sheetState = sheetStatus.status || "loading";
    }

    if (elements.sheetProductCount) {
      elements.sheetProductCount.textContent = String(sheetCount);
    }

    if (elements.sheetProductCountInline) {
      elements.sheetProductCountInline.textContent = String(sheetCount);
    }

    if (elements.sheetLastSync) {
      elements.sheetLastSync.textContent = formatSyncTimestamp(sheetStatus.updatedAt);
    }

    elements.sheetFeedLinks.forEach((link) => {
      if (!link) {
        return;
      }

      link.href = feedUrl || "#";
      link.setAttribute("aria-disabled", feedUrl ? "false" : "true");
      link.classList.toggle("is-disabled", !feedUrl);
    });
  }

  function renderSheetProductsTable() {
    if (!elements.sheetCatalogueTable) {
      return;
    }

    const sheetProducts = Array.isArray(window.MARIS_SHEET_PRODUCTS) ? window.MARIS_SHEET_PRODUCTS : [];
    const sheetStatus = window.MARIS_SHEET_STATUS || {};

    if (!sheetProducts.length) {
      const emptyMessage = sheetStatus.status === "error"
        ? "Google Sheet feed is unavailable right now. No catalogue products are available until the sheet is back online."
        : "No Google Sheet products are synced yet.";
      elements.sheetCatalogueTable.innerHTML = `<tr><td colspan="6">${escapeHtml(emptyMessage)}</td></tr>`;
      return;
    }

    const rows = sheetProducts
      .map((product) => {
        const href = `product.html?collection=${encodeURIComponent(product.collectionKey || "engagement-ring")}&id=${encodeURIComponent(product.code)}`;
        const galleryCount = Array.isArray(product.gallery) ? product.gallery.length : 0;
        const imageLabel = product.image
          ? `<a class="admin-link-inline" href="${escapeHtml(product.image)}" target="_blank" rel="noopener noreferrer">Open image</a>`
          : "-";

        return `
          <tr>
            <td><strong>${escapeHtml(product.code)}</strong></td>
            <td>${escapeHtml(getCollectionLabel(product.collectionKey))}</td>
            <td>
              <strong>${escapeHtml(product.name || product.title || product.code)}</strong>
              <div>${escapeHtml(product.price || "Price on request")}</div>
            </td>
            <td>${imageLabel}</td>
            <td>${galleryCount}</td>
            <td>
              <div class="admin-row-actions">
                <a class="admin-secondary" href="${href}" target="_blank" rel="noopener noreferrer">Preview</a>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    elements.sheetCatalogueTable.innerHTML = rows;
  }

  function renderLogsTable() {
    const rows = readLogs()
      .map((log) => `
        <tr>
          <td>${new Date(log.createdAt).toLocaleString()}</td>
          <td><strong>${escapeHtml(log.sku)}</strong></td>
          <td>${escapeHtml(getMovementLabel(log.type))}</td>
          <td>${log.qty}</td>
          <td>${escapeHtml(log.note || "-")}</td>
        </tr>
      `)
      .join("");

    elements.logsTable.innerHTML = rows || `<tr><td colspan="5">No stock movement yet.</td></tr>`;
  }

  function renderOrdersTable() {
    const products = readProducts();
    const productById = new Map(products.map((product) => [product.id, product]));
    const rows = readOrders()
      .map((order) => {
        const product = productById.get(order.productId);
        const canAct = order.orderStatus === "Pending";

        return `
          <tr>
            <td><strong>${escapeHtml(order.id)}</strong></td>
            <td>${escapeHtml(order.customerName || "Guest")}</td>
            <td>${escapeHtml(product?.sku || order.productId)}</td>
            <td>${order.qty}</td>
            <td>${escapeHtml(order.orderStatus)}</td>
            <td>${escapeHtml(order.paymentStatus)}</td>
            <td>
              <div class="admin-row-actions">
                <button type="button" data-order-paid="${escapeHtml(order.id)}" ${canAct ? "" : "disabled"}>Mark Paid</button>
                <button type="button" data-order-cancel="${escapeHtml(order.id)}" ${canAct ? "" : "disabled"}>Cancel</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    elements.ordersTable.innerHTML = rows || `<tr><td colspan="7">No orders yet.</td></tr>`;
  }

  function renderSettings() {
    const settings = getSettings();
    const input = elements.settingsForm?.elements.lowStockThreshold;

    if (input) {
      input.value = String(settings.lowStockThreshold);
    }
  }

  function renderAll() {
    syncProductsWithSeed();
    renderStats();
    renderSelects();
    renderProductsTable();
    renderSheetFeed();
    renderSheetProductsTable();
    renderPublishedCatalogueTable();
    renderLogsTable();
    renderOrdersTable();
    renderSettings();
  }

  function activatePanel(name) {
    elements.tabs.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.adminTab === name);
    });

    elements.panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.adminPanel === name);
    });
  }

  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      activatePanel(button.dataset.adminTab);
    });
  });

  elements.productForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const sku = String(formData.get("sku")).trim().toUpperCase();
    const name = String(formData.get("name")).trim();
    const stockQty = Math.max(0, Number(formData.get("stockQty")) || 0);
    const reservedQty = Math.max(0, Number(formData.get("reservedQty")) || 0);
    const products = readProducts();

    if (!sku || !name) {
      setMessage("SKU and product name are required.", true);
      return;
    }

    if (products.some((product) => product.sku.toLowerCase() === sku.toLowerCase())) {
      setMessage("This SKU already exists.", true);
      return;
    }

    if (reservedQty > stockQty) {
      setMessage("Reserved stock cannot be more than real stock.", true);
      return;
    }

    const product = {
      id: sku,
      sku,
      name,
      category: String(formData.get("category")),
      price: String(formData.get("price")).trim() || "Price on request",
      stockQty,
      reservedQty,
      status: String(formData.get("status")),
      createdAt: new Date().toISOString()
    };

    products.unshift(product);
    writeProducts(products);

    if (stockQty > 0) {
      addLog(product, "receive", stockQty, "Initial product stock");
    }

    event.currentTarget.reset();
    renderAll();
    setMessage("Product added.");
  });

  elements.catalogueForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = buildPublishedProduct(new FormData(event.currentTarget));

    if (!result.ok) {
      setMessage(result.message, true);
      return;
    }

    const publishedProducts = readPublishedCatalogueProducts();
    const existingIndex = publishedProducts.findIndex((product) => String(product.code).toUpperCase() === result.product.code);

    if (existingIndex >= 0) {
      publishedProducts[existingIndex] = {
        ...publishedProducts[existingIndex],
        ...result.product
      };
    } else {
      publishedProducts.unshift({
        ...result.product,
        createdAt: new Date().toISOString()
      });
    }

    writePublishedCatalogueProducts(publishedProducts);
    upsertAdminProductFromCatalogue(result.product, result.stockQty);
    event.currentTarget.reset();
    renderAll();
    setMessage("Catalogue product published. Reload storefront pages to view the new item.");
  });

  elements.inventoryForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = applyMovement(
      String(formData.get("productId")),
      String(formData.get("type")),
      Number(formData.get("qty")),
      String(formData.get("note")).trim()
    );

    if (!result.ok) {
      setMessage(result.message, true);
      return;
    }

    event.currentTarget.elements.note.value = "";
    renderAll();
    setMessage(result.message);
  });

  elements.orderForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const productId = String(formData.get("productId"));
    const qty = Math.max(1, Number(formData.get("qty")) || 1);
    const reserveResult = applyMovement(productId, "reserve", qty, "Reserved by test order");

    if (!reserveResult.ok) {
      setMessage(reserveResult.message, true);
      return;
    }

    const orders = readOrders();
    orders.unshift({
      id: `ORD-${Date.now()}`,
      productId,
      qty,
      customerName: String(formData.get("customerName")).trim() || "Guest",
      orderStatus: "Pending",
      paymentStatus: "Unpaid",
      createdAt: new Date().toISOString()
    });
    writeOrders(orders);
    event.currentTarget.reset();
    renderAll();
    setMessage("Reserved order created.");
  });

  elements.ordersTable?.addEventListener("click", (event) => {
    const paidButton = event.target.closest("[data-order-paid]");
    const cancelButton = event.target.closest("[data-order-cancel]");
    const orderId = paidButton?.dataset.orderPaid || cancelButton?.dataset.orderCancel;

    if (!orderId) {
      return;
    }

    const orders = readOrders();
    const order = orders.find((item) => item.id === orderId);

    if (!order || order.orderStatus !== "Pending") {
      return;
    }

    if (paidButton) {
      const result = applyMovement(order.productId, "sale", order.qty, `Paid order ${order.id}`);

      if (!result.ok) {
        setMessage(result.message, true);
        return;
      }

      order.orderStatus = "Paid";
      order.paymentStatus = "Paid";
      setMessage("Order marked as paid. Real stock was reduced.");
    }

    if (cancelButton) {
      const result = applyMovement(order.productId, "release", order.qty, `Cancelled order ${order.id}`);

      if (!result.ok) {
        setMessage(result.message, true);
        return;
      }

      order.orderStatus = "Cancelled";
      order.paymentStatus = "Cancelled";
      setMessage("Order cancelled. Reserved stock was released.");
    }

    writeOrders(orders);
    renderAll();
  });

  elements.publishedCatalogueTable?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-catalogue-edit]");
    const deleteButton = event.target.closest("[data-catalogue-delete]");
    const code = editButton?.dataset.catalogueEdit || deleteButton?.dataset.catalogueDelete;

    if (!code) {
      return;
    }

    const publishedProducts = readPublishedCatalogueProducts();
    const product = publishedProducts.find((item) => String(item.code).toUpperCase() === String(code).toUpperCase());

    if (!product) {
      return;
    }

    if (editButton) {
      fillCatalogueForm(product);
      activatePanel("products");
      elements.catalogueForm?.scrollIntoView({ behavior: "smooth", block: "start" });
      setMessage(`Loaded ${product.code} into the catalogue form.`);
      return;
    }

    if (deleteButton) {
      writePublishedCatalogueProducts(
        publishedProducts.filter((item) => String(item.code).toUpperCase() !== String(code).toUpperCase())
      );
      renderAll();
      setMessage(`Catalogue product ${product.code} was unpublished.`);
    }
  });

  elements.settingsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const lowStockThreshold = Math.max(0, Number(new FormData(event.currentTarget).get("lowStockThreshold")) || 0);
    writeJson(settingsKey, { lowStockThreshold });
    renderAll();
    setMessage("Settings saved.");
  });

  elements.resetDemo?.addEventListener("click", () => {
    writeProducts(buildSeedProducts());
    writeLogs([]);
    writeOrders([]);
    writeJson(settingsKey, { lowStockThreshold: 2 });
    renderAll();
    setMessage("Demo admin data reset.");
  });

  window.addEventListener("maris:catalogue-data-updated", () => {
    renderAll();
  });

  Promise.resolve(window.MARIS_DATA_READY)
    .catch(() => null)
    .then(() => {
      renderAll();
    });
})();
