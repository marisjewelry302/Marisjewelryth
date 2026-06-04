(() => {
  const collectionMeta = window.MARIS_COLLECTION_META || {};
  const settingsState = {
    lowStockThreshold: 2
  };

  const elements = {
    panels: Array.from(document.querySelectorAll("[data-admin-panel]")),
    tabs: Array.from(document.querySelectorAll("[data-admin-tab]")),
    productForm: document.querySelector("[data-product-form]"),
    catalogueForm: document.querySelector("[data-catalogue-form]"),
    inventoryForm: document.querySelector("[data-inventory-form]"),
    orderForm: document.querySelector("[data-order-form]"),
    settingsForm: document.querySelector("[data-settings-form]"),
    productsTable: document.querySelector("[data-products-table]"),
    catalogueDraftTable: document.querySelector("[data-catalogue-draft-table]"),
    logsTable: document.querySelector("[data-inventory-log-table]"),
    ordersTable: document.querySelector("[data-orders-table]"),
    productSelect: document.querySelector("[data-product-select]"),
    orderProductSelect: document.querySelector("[data-order-product-select]"),
    message: document.querySelector("[data-admin-message]"),
    resetDemo: document.querySelector("[data-reset-demo]"),
    catalogueDraftCount: document.querySelector("[data-catalogue-draft-count]"),
    sheetStatus: document.querySelector("[data-sheet-status]"),
    sheetProductCount: document.querySelector("[data-sheet-product-count]"),
    sheetProductCountInline: document.querySelector("[data-sheet-product-count-inline]"),
    sheetLastSync: document.querySelector("[data-sheet-last-sync]"),
    sheetFeedLinks: Array.from(document.querySelectorAll("[data-sheet-feed-link], [data-sheet-feed-link-inline]")),
    sheetCatalogueTable: document.querySelector("[data-sheet-catalogue-table]"),
    databaseStatus: document.querySelector("[data-database-status]"),
    databaseProject: document.querySelector("[data-database-project]"),
    databaseChecked: document.querySelector("[data-database-checked]"),
    databaseSummary: document.querySelector("[data-database-summary]"),
    databaseTableStatus: document.querySelector("[data-database-table-status]"),
    databaseProductsSummary: document.querySelector("[data-database-products-summary]"),
    databaseProductsTable: document.querySelector("[data-database-products-table]"),
    totalProducts: document.querySelector("[data-total-products]"),
    totalStock: document.querySelector("[data-total-stock]"),
    totalReserved: document.querySelector("[data-total-reserved]"),
    lowStock: document.querySelector("[data-low-stock]")
  };

  let databaseStatusState = {
    isLoading: true,
    isConfigured: false,
    missingEnv: [],
    tables: []
  };

  let databaseCatalogueState = {
    isLoading: true,
    isConfigured: false,
    missingEnv: [],
    products: []
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const ADMIN_API_PREFIX = "/api/admin";
  const adminCache = {
    products: [],
    orders: [],
    logs: [],
    isLoading: true,
    isReady: false,
    error: ""
  };

  async function fetchAdminApi(path, options = {}) {
    const url = `${ADMIN_API_PREFIX}${path}`;
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = {
      Accept: "application/json",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    };
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(payload.error || `API request failed with HTTP ${response.status}.`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  async function loadAdminBackendData() {
    adminCache.isLoading = true;
    adminCache.error = "";

    try {
      const [productsPayload, ordersPayload, logsPayload] = await Promise.all([
        fetchAdminApi("/products"),
        fetchAdminApi("/orders"),
        fetchAdminApi("/inventory-logs")
      ]);

      adminCache.products = Array.isArray(productsPayload.products) ? productsPayload.products : [];
      adminCache.orders = Array.isArray(ordersPayload.orders) ? ordersPayload.orders : [];
      adminCache.logs = Array.isArray(logsPayload.logs) ? logsPayload.logs : [];
      adminCache.isReady = true;
    } catch (error) {
      adminCache.products = [];
      adminCache.orders = [];
      adminCache.logs = [];
      adminCache.isReady = false;
      adminCache.error = error instanceof Error ? error.message : "Supabase admin data could not be loaded.";
    } finally {
      adminCache.isLoading = false;
    }
  }

  function getCachedProducts() {
    return Array.isArray(adminCache.products) ? adminCache.products : [];
  }

  function getCachedOrders() {
    return Array.isArray(adminCache.orders) ? adminCache.orders : [];
  }

  function getCachedLogs() {
    return Array.isArray(adminCache.logs) ? adminCache.logs : [];
  }

  function getStoredSettings() {
    return { ...settingsState };
  }

  function getSettings() {
    return { ...settingsState };
  }

  function setMessage(message, isError = false) {
    if (!elements.message) {
      return;
    }

    elements.message.textContent = message;
    elements.message.style.color = isError ? "var(--maris-red)" : "var(--maris-teal)";
  }

  function ensureAdminDataReady() {
    if (adminCache.isReady) {
      return true;
    }

    const message = adminCache.error
      || "Connect Supabase before saving admin products, inventory, or orders.";
    setMessage(message, true);
    return false;
  }

  function readProducts() {
    return getCachedProducts();
  }

  function readLogs() {
    return getCachedLogs();
  }

  function readOrders() {
    return getCachedOrders();
  }

  function readCatalogueDrafts() {
    return [];
  }

  function getAvailable(product) {
    return Math.max(0, Number(product.stockQty) - Number(product.reservedQty));
  }

  function getProductSku(product) {
    return product.sku || product.productCode || product.code || product.id || "";
  }

  function getProductName(product) {
    return product.name || product.nameEn || product.nameTh || getProductSku(product);
  }

  function getProductCategory(product) {
    return product.category || getCollectionLabel(product.collection) || "Fine Jewelry";
  }

  function getProductPrice(product) {
    if (product.price) {
      return product.price;
    }

    if (product.priceAmount === null || product.priceAmount === undefined) {
      return "Price on request";
    }

    const amount = Number(product.priceAmount);
    const formattedAmount = Number.isFinite(amount) ? amount.toLocaleString() : String(product.priceAmount);
    return `${formattedAmount} ${product.currency || "THB"}`;
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

  function isSelectedFile(file) {
    return file && typeof file === "object" && typeof file.size === "number" && file.size > 0;
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

  function buildCatalogueDraft(formData) {
    const code = String(formData.get("code") || "").trim().toUpperCase();
    const collectionKey = String(formData.get("collectionKey") || "").trim();
    const title = String(formData.get("title") || code).trim() || code;
    const name = String(formData.get("name") || "").trim();
    const mainImageFile = formData.get("mainImageFile");
    const galleryImageFiles = formData.getAll("galleryImageFiles").filter(isSelectedFile);
    const description = String(formData.get("description") || "").trim();
    const details = splitTextareaLines(formData.get("details"));
    const price = String(formData.get("price") || "Price on request").trim() || "Price on request";
    const metal = String(formData.get("metal") || "").trim();
    const style = String(formData.get("style") || "").trim();
    const shape = String(formData.get("shape") || "").trim();
    const imagePresentation = String(formData.get("imagePresentation") || "").trim();
    const manualFilters = splitTags(formData.get("filterValues"));
    const filterValues = Array.from(new Set([...manualFilters, metal, style, shape].filter(Boolean)));
    const stockQty = Math.max(0, Number(formData.get("catalogueStockQty")) || 0);

    if (!code || !collectionKey || !name || !isSelectedFile(mainImageFile)) {
      return {
        ok: false,
        message: "Product code, collection, product name, and main product image are required."
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
        image: "",
        hover: "",
        price,
        metal,
        style,
        shape,
        filterValues,
        gallery: [],
        imagePresentation,
        collectionKey,
        updatedAt: new Date().toISOString()
      },
      mainImageFile,
      galleryImageFiles,
      stockQty
    };
  }

  async function uploadProductImage(productId, file, options = {}) {
    const uploadFormData = new FormData();
    uploadFormData.set("productId", productId);
    uploadFormData.set("file", file);
    uploadFormData.set("altText", options.altText || file.name || "Product image");
    uploadFormData.set("sortOrder", String(options.sortOrder || 0));
    uploadFormData.set("isPrimary", options.isPrimary ? "true" : "false");

    return fetchAdminApi("/uploads/product-image", {
      method: "POST",
      body: uploadFormData
    });
  }

  async function uploadCatalogueImages(product, result) {
    await uploadProductImage(product.id, result.mainImageFile, {
      altText: `${result.product.name || result.product.code} primary image`,
      sortOrder: 0,
      isPrimary: true
    });

    await Promise.all(result.galleryImageFiles.map((file, index) => uploadProductImage(product.id, file, {
      altText: `${result.product.name || result.product.code} gallery image ${index + 1}`,
      sortOrder: index + 1,
      isPrimary: false
    })));
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
      .map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(getProductSku(product))} - ${escapeHtml(getProductName(product))} (${getAvailable(product)} available)</option>`)
      .join("");
    const fallback = adminCache.isLoading
      ? `<option value="">Loading Supabase products...</option>`
      : `<option value="">No Supabase products available</option>`;

    if (elements.productSelect) {
      elements.productSelect.innerHTML = options || fallback;
    }

    if (elements.orderProductSelect) {
      elements.orderProductSelect.innerHTML = options || fallback;
    }
  }

  function renderProductsTable() {
    const settings = getSettings();
    const products = readProducts();

    if (adminCache.isLoading) {
      elements.productsTable.innerHTML = `<tr><td colspan="8">Loading Supabase products...</td></tr>`;
      return;
    }

    if (!adminCache.isReady) {
      elements.productsTable.innerHTML = `<tr><td colspan="8">${escapeHtml(adminCache.error || "Connect Supabase before managing admin products.")}</td></tr>`;
      return;
    }

    const rows = products
      .map((product) => {
        const available = getAvailable(product);
        const stockClass = available <= settings.lowStockThreshold ? "stock-low" : "stock-ok";

        return `
          <tr>
            <td><strong>${escapeHtml(getProductSku(product))}</strong></td>
            <td>${escapeHtml(getProductName(product))}</td>
            <td>${escapeHtml(getProductCategory(product))}</td>
            <td>${escapeHtml(getProductPrice(product))}</td>
            <td>${product.stockQty}</td>
            <td>${product.reservedQty}</td>
            <td class="${stockClass}">${available}</td>
            <td>${escapeHtml(product.status)}</td>
          </tr>
        `;
      })
      .join("");

    elements.productsTable.innerHTML = rows || `<tr><td colspan="8">No Supabase products yet.</td></tr>`;
  }

  function renderCatalogueDraftTable() {
    if (!elements.catalogueDraftTable) {
      return;
    }

    const catalogueDrafts = readCatalogueDrafts();

    if (elements.catalogueDraftCount) {
      elements.catalogueDraftCount.textContent = String(catalogueDrafts.length);
    }

    const rows = catalogueDrafts
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
                <button type="button" data-catalogue-draft-edit="${escapeHtml(product.code)}">Edit</button>
                <button type="button" data-catalogue-draft-delete="${escapeHtml(product.code)}">Remove Draft</button>
                <a class="admin-secondary" href="${href}" target="_blank" rel="noopener noreferrer">Preview</a>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    elements.catalogueDraftTable.innerHTML = rows || `<tr><td colspan="6">Browser-local catalogue drafts have been retired. Use Supabase product saving instead.</td></tr>`;
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

  function getDatabaseStatusLabel() {
    if (databaseStatusState.isLoading) {
      return "Checking...";
    }

    if (databaseStatusState.error) {
      return "Check failed";
    }

    if (!databaseStatusState.isConfigured) {
      return "Needs env";
    }

    const tables = Array.isArray(databaseStatusState.tables) ? databaseStatusState.tables : [];
    const hasTableErrors = tables.some((table) => !table.isReachable);

    return hasTableErrors ? "Partial access" : "Connected";
  }

  function renderDatabaseStatus() {
    if (!elements.databaseTableStatus) {
      return;
    }

    const tables = Array.isArray(databaseStatusState.tables) ? databaseStatusState.tables : [];
    const missingEnv = Array.isArray(databaseStatusState.missingEnv) ? databaseStatusState.missingEnv : [];
    const statusLabel = getDatabaseStatusLabel();
    const state = databaseStatusState.isLoading
      ? "loading"
      : databaseStatusState.error || !databaseStatusState.isConfigured || tables.some((table) => !table.isReachable)
        ? "error"
        : "ready";

    if (elements.databaseStatus) {
      elements.databaseStatus.textContent = statusLabel;
      elements.databaseStatus.dataset.databaseState = state;
    }

    if (elements.databaseProject) {
      elements.databaseProject.textContent = databaseStatusState.projectRef || "-";
    }

    if (elements.databaseChecked) {
      elements.databaseChecked.textContent = formatSyncTimestamp(databaseStatusState.checkedAt);
    }

    if (elements.databaseSummary) {
      if (databaseStatusState.isLoading) {
        elements.databaseSummary.textContent = "Checking Supabase through the protected admin API.";
      } else if (databaseStatusState.error) {
        elements.databaseSummary.textContent = databaseStatusState.error;
      } else if (!databaseStatusState.isConfigured) {
        elements.databaseSummary.textContent = `Set ${missingEnv.join(" and ")} before using the shared database.`;
      } else {
        elements.databaseSummary.textContent = "Server-side Supabase connection is available for the next CRUD step.";
      }
    }

    if (databaseStatusState.isLoading) {
      elements.databaseTableStatus.innerHTML = `<tr><td colspan="4">Checking database tables...</td></tr>`;
      return;
    }

    if (databaseStatusState.error) {
      elements.databaseTableStatus.innerHTML = `<tr><td colspan="4">${escapeHtml(databaseStatusState.error)}</td></tr>`;
      return;
    }

    if (!databaseStatusState.isConfigured) {
      elements.databaseTableStatus.innerHTML = `<tr><td colspan="4">Missing environment variables: ${escapeHtml(missingEnv.join(", "))}</td></tr>`;
      return;
    }

    elements.databaseTableStatus.innerHTML = tables
      .map((table) => `
        <tr>
          <td><strong>${escapeHtml(table.name)}</strong></td>
          <td class="${table.isReachable ? "stock-ok" : "stock-low"}">${table.isReachable ? "Reachable" : "Needs attention"}</td>
          <td>${table.rowCount === null || table.rowCount === undefined ? "-" : escapeHtml(table.rowCount)}</td>
          <td>${escapeHtml(table.error || "Ready for server-side admin workflows")}</td>
        </tr>
      `)
      .join("");
  }

  async function loadDatabaseStatus() {
    if (!elements.databaseTableStatus) {
      return;
    }

    renderDatabaseStatus();

    try {
      const response = await fetch("/api/admin/database/status", {
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        }
      });
      const payload = await response.json().catch(() => ({}));

      databaseStatusState = {
        isLoading: false,
        ...payload,
        error: !response.ok && response.status !== 503
          ? (payload.error || `Database status request failed with HTTP ${response.status}.`)
          : null
      };
    } catch (error) {
      databaseStatusState = {
        isLoading: false,
        isConfigured: false,
        missingEnv: [],
        tables: [],
        error: error instanceof Error ? error.message : "Database status request failed."
      };
    }

    renderDatabaseStatus();
  }

  function formatDatabasePrice(product) {
    if (product.priceAmount === null || product.priceAmount === undefined) {
      return "Price on request";
    }

    const amount = Number(product.priceAmount);
    const formattedAmount = Number.isFinite(amount) ? amount.toLocaleString() : String(product.priceAmount);

    return `${formattedAmount} ${product.currency || "THB"}`;
  }

  function renderDatabaseProducts() {
    if (!elements.databaseProductsTable) {
      return;
    }

    const products = Array.isArray(databaseCatalogueState.products) ? databaseCatalogueState.products : [];
    const missingEnv = Array.isArray(databaseCatalogueState.missingEnv) ? databaseCatalogueState.missingEnv : [];

    if (elements.databaseProductsSummary) {
      if (databaseCatalogueState.isLoading) {
        elements.databaseProductsSummary.textContent = "Checking Supabase products through the protected admin API.";
      } else if (databaseCatalogueState.error) {
        elements.databaseProductsSummary.textContent = databaseCatalogueState.error;
      } else if (!databaseCatalogueState.isConfigured) {
        elements.databaseProductsSummary.textContent = `Set ${missingEnv.join(" and ")} before reading products from Supabase.`;
      } else {
        elements.databaseProductsSummary.textContent = `${products.length} Supabase products loaded read-only. Google Sheet still drives the live storefront.`;
      }
    }

    if (databaseCatalogueState.isLoading) {
      elements.databaseProductsTable.innerHTML = `<tr><td colspan="8">Checking Supabase products...</td></tr>`;
      return;
    }

    if (databaseCatalogueState.error) {
      elements.databaseProductsTable.innerHTML = `<tr><td colspan="8">${escapeHtml(databaseCatalogueState.error)}</td></tr>`;
      return;
    }

    if (!databaseCatalogueState.isConfigured) {
      elements.databaseProductsTable.innerHTML = `<tr><td colspan="8">Missing environment variables: ${escapeHtml(missingEnv.join(", "))}</td></tr>`;
      return;
    }

    const rows = products
      .map((product) => {
        const imageLink = product.primaryImageUrl
          ? `<a class="admin-link-inline" href="${escapeHtml(product.primaryImageUrl)}" target="_blank" rel="noopener noreferrer">Open image</a>`
          : "-";

        return `
          <tr>
            <td><strong>${escapeHtml(product.productCode || product.id)}</strong></td>
            <td>
              <strong>${escapeHtml(product.nameEn || product.nameTh || product.productCode)}</strong>
              <div>${escapeHtml(product.category || "-")}</div>
            </td>
            <td class="${product.isActive ? "stock-ok" : "stock-low"}">${escapeHtml(product.status || "draft")}</td>
            <td>${escapeHtml(formatDatabasePrice(product))}</td>
            <td>${escapeHtml(product.variantCount || 0)}</td>
            <td>${escapeHtml(product.imageCount || 0)}</td>
            <td>${escapeHtml(product.totalStock || 0)}</td>
            <td>${imageLink}</td>
          </tr>
        `;
      })
      .join("");

    elements.databaseProductsTable.innerHTML = rows || `<tr><td colspan="8">No Supabase products found yet.</td></tr>`;
  }

  async function loadDatabaseCatalogue() {
    if (!elements.databaseProductsTable) {
      return;
    }

    renderDatabaseProducts();

    try {
      const response = await fetch("/api/admin/database/catalogue", {
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        }
      });
      const payload = await response.json().catch(() => ({}));

      databaseCatalogueState = {
        isLoading: false,
        ...payload,
        error: !response.ok && response.status !== 503
          ? (payload.error || `Supabase catalogue request failed with HTTP ${response.status}.`)
          : null
      };
    } catch (error) {
      databaseCatalogueState = {
        isLoading: false,
        isConfigured: false,
        missingEnv: [],
        products: [],
        error: error instanceof Error ? error.message : "Supabase catalogue request failed."
      };
    }

    renderDatabaseProducts();
  }

  function renderLogsTable() {
    if (adminCache.isLoading) {
      elements.logsTable.innerHTML = `<tr><td colspan="5">Loading Supabase inventory logs...</td></tr>`;
      return;
    }

    if (!adminCache.isReady) {
      elements.logsTable.innerHTML = `<tr><td colspan="5">${escapeHtml(adminCache.error || "Connect Supabase before managing inventory.")}</td></tr>`;
      return;
    }

    const rows = readLogs()
      .map((log) => {
        const createdAt = log.createdAt ? new Date(log.createdAt).toLocaleString() : "-";
        const movementType = log.type || log.changeType;
        const quantity = log.qty ?? log.quantity ?? 0;

        return `
          <tr>
            <td>${escapeHtml(createdAt)}</td>
            <td><strong>${escapeHtml(log.sku || log.productCode || log.productId || "-")}</strong></td>
            <td>${escapeHtml(getMovementLabel(movementType))}</td>
            <td>${escapeHtml(quantity)}</td>
            <td>${escapeHtml(log.note || "-")}</td>
          </tr>
        `;
      })
      .join("");

    elements.logsTable.innerHTML = rows || `<tr><td colspan="5">No stock movement yet.</td></tr>`;
  }

  function renderOrdersTable() {
    const products = readProducts();
    const productById = new Map(products.map((product) => [product.id, product]));

    if (adminCache.isLoading) {
      elements.ordersTable.innerHTML = `<tr><td colspan="7">Loading Supabase orders...</td></tr>`;
      return;
    }

    if (!adminCache.isReady) {
      elements.ordersTable.innerHTML = `<tr><td colspan="7">${escapeHtml(adminCache.error || "Connect Supabase before managing orders.")}</td></tr>`;
      return;
    }

    const rows = readOrders()
      .map((order) => {
        const product = productById.get(order.productId);
        const orderStatus = order.orderStatus || order.status || "draft";
        const canCancel = orderStatus === "Pending" || orderStatus === "draft" || orderStatus === "quoted";

        return `
          <tr>
            <td><strong>${escapeHtml(order.orderNumber || order.id)}</strong></td>
            <td>${escapeHtml(order.customerName || "Guest")}</td>
            <td>${escapeHtml(product ? getProductSku(product) : (order.productCode || order.productId))}</td>
            <td>${order.qty}</td>
            <td>${escapeHtml(orderStatus)}</td>
            <td>${escapeHtml(order.paymentStatus || order.payment_status || "unpaid")}</td>
            <td>
              <div class="admin-row-actions">
                <button type="button" data-order-cancel="${escapeHtml(order.id)}" ${canCancel ? "" : "disabled"}>Cancel</button>
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
    renderStats();
    renderSelects();
    renderProductsTable();
    renderSheetFeed();
    renderSheetProductsTable();
    renderCatalogueDraftTable();
    renderDatabaseStatus();
    renderDatabaseProducts();
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

  elements.productForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!ensureAdminDataReady()) {
      return;
    }

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

    if (products.some((product) => getProductSku(product).toLowerCase() === sku.toLowerCase())) {
      setMessage("This SKU already exists.", true);
      return;
    }

    if (reservedQty > stockQty) {
      setMessage("Reserved stock cannot be more than real stock.", true);
      return;
    }

    const product = {
      sku,
      name,
      category: String(formData.get("category")),
      price: String(formData.get("price")).trim() || "Price on request",
      stockQty,
      reservedQty,
      status: String(formData.get("status")),
      createdAt: new Date().toISOString()
    };

    try {
      await fetchAdminApi("/products", {
        method: "POST",
        body: JSON.stringify(product)
      });
      await loadAdminBackendData();
      event.currentTarget.reset();
      renderAll();
      setMessage("Product saved in Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save product in Supabase.", true);
    }
  });

  elements.catalogueForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!ensureAdminDataReady()) {
      return;
    }

    const result = buildCatalogueDraft(new FormData(event.currentTarget));

    if (!result.ok) {
      setMessage(result.message, true);
      return;
    }

    try {
      const payload = await fetchAdminApi("/products", {
        method: "POST",
        body: JSON.stringify({
          sku: result.product.code,
          name: result.product.name,
          category: getCollectionLabel(result.product.collectionKey),
          collection: result.product.collectionKey,
          price: result.product.price,
          stockQty: result.stockQty,
          reservedQty: 0,
          status: result.stockQty > 0 ? "Ready" : "Sold Out",
          metadata: {
            source: "admin_catalogue_form",
            title: result.product.title,
            description: result.product.description,
            details: result.product.details,
            filterValues: result.product.filterValues,
            imagePresentation: result.product.imagePresentation
          }
        })
      });
      await uploadCatalogueImages(payload.product, result);
      await loadAdminBackendData();
      loadDatabaseCatalogue();
      event.currentTarget.reset();
      renderAll();
      setMessage("Catalogue product and images saved in Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save catalogue product and images in Supabase.", true);
    }
  });

  elements.inventoryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!ensureAdminDataReady()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const productId = String(formData.get("productId"));
    const type = String(formData.get("type"));
    const qty = Number(formData.get("qty"));
    const note = String(formData.get("note")).trim();

    if (!productId || !qty || qty < 1) {
      setMessage("Please choose a product and valid quantity.", true);
      return;
    }

    try {
      await fetchAdminApi("/inventory-logs", {
        method: "POST",
        body: JSON.stringify({
          productId,
          movementType: type,
          quantity: qty,
          note
        })
      });
      await loadAdminBackendData();
      event.currentTarget.elements.note.value = "";
      renderAll();
      setMessage("Inventory movement saved in Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save inventory movement in Supabase.", true);
    }
  });

  elements.orderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!ensureAdminDataReady()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const productId = String(formData.get("productId"));
    const qty = Math.max(1, Number(formData.get("qty")) || 1);

    if (!productId) {
      setMessage("Please choose a product before creating an order.", true);
      return;
    }

    const newOrder = {
      productId,
      qty,
      customerName: String(formData.get("customerName")).trim() || "Guest",
      orderStatus: "Pending",
      paymentStatus: "Unpaid",
      createdAt: new Date().toISOString()
    };

    try {
      await fetchAdminApi("/orders", {
        method: "POST",
        body: JSON.stringify(newOrder)
      });
      await loadAdminBackendData();
      event.currentTarget.reset();
      renderAll();
      setMessage("Reserved order created in Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save order in Supabase.", true);
    }
  });

  elements.ordersTable?.addEventListener("click", async (event) => {
    const cancelButton = event.target.closest("[data-order-cancel]");
    const orderId = cancelButton?.dataset.orderCancel;

    if (!orderId) {
      return;
    }

    if (!ensureAdminDataReady()) {
      return;
    }

    const orders = readOrders();
    const order = orders.find((item) => item.id === orderId);
    const orderStatus = order?.orderStatus || order?.status;

    if (!order || (orderStatus !== "Pending" && orderStatus !== "draft" && orderStatus !== "quoted")) {
      return;
    }

    try {
      await fetchAdminApi(`/orders?id=${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled", paymentStatus: "cancelled" })
      });
      await loadAdminBackendData();
      renderAll();
      setMessage("Order cancelled in Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel order in Supabase.", true);
    }
  });

  elements.settingsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const lowStockThreshold = Math.max(0, Number(new FormData(event.currentTarget).get("lowStockThreshold")) || 0);
    settingsState.lowStockThreshold = lowStockThreshold;
    renderAll();
    setMessage("Settings applied for this admin view.");
  });

  elements.resetDemo?.addEventListener("click", async () => {
    await loadAdminBackendData();
    renderAll();
    setMessage(adminCache.isReady ? "Supabase admin data refreshed." : (adminCache.error || "Supabase admin data could not be refreshed."), !adminCache.isReady);
  });

  window.addEventListener("maris:catalogue-data-updated", () => {
    renderAll();
  });

  Promise.resolve(window.MARIS_DATA_READY)
    .catch(() => null)
    .then(async () => {
      renderAll();
      await loadAdminBackendData();
      renderAll();
      loadDatabaseStatus();
      loadDatabaseCatalogue();
    });
})();
