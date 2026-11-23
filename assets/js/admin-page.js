(() => {
  // Text and formats come from the server-injected dictionary
  // (app/lib/admin-i18n.js -> window.MARIS_ADMIN_I18N, window.marisAdminT).
  const t = window.marisAdminT || ((key) => key);
  const tp = window.marisAdminT?.plural || ((key) => key);
  const adminLocale = window.MARIS_ADMIN_I18N?.locale || "en-GB";
  const fallbackCollectionMeta = {
    // The English titles are stored data (a product's category); they are not
    // shown directly. getCollectionLabel() shows the translated name.
    "engagement-ring": { title: "Engagement Rings", href: "/category/engagement-ring" },
    "wedding-set": { title: "Wedding Set", href: "/category/wedding-set" },
    "wedding-bands": { title: "Wedding Bands", href: "/category/wedding-bands" },
    "mens-wedding-bands": { title: "Men's Wedding Bands", href: "/category/mens-wedding-bands" },
    "necklaces-pendants": { title: "Necklaces & Pendants", href: "/category/necklaces-pendants" },
    bracelets: { title: "Bracelets", href: "/category/bracelets" },
    earrings: { title: "Earrings", href: "/category/earrings" },
    rings: { title: "Rings", href: "/category/rings" }
  };
  const collectionMeta = {
    ...fallbackCollectionMeta,
    ...(window.MARIS_COLLECTION_META || {})
  };
  const ringCollectionKeys = new Set(["engagement-ring", "wedding-bands", "mens-wedding-bands", "rings"]);
  const categoryCollectionMap = {
    "Wedding Set": "wedding-set",
    Earrings: "earrings",
    Bracelets: "bracelets",
    "Necklaces & Pendants": "necklaces-pendants"
  };
  const elements = {
    panels: Array.from(document.querySelectorAll("[data-admin-panel]")),
    tabs: Array.from(document.querySelectorAll("[data-admin-tab]")),
    productForm: document.querySelector("[data-product-form]"),
    productSearch: document.querySelector("[data-products-search]"),
    bestSellerForm: document.querySelector("[data-best-seller-form]"),
    inventoryForm: document.querySelector("[data-inventory-form]"),
    orderForm: document.querySelector("[data-order-form]"),
    productsTable: document.querySelector("[data-products-table]"),
    productsPagination: document.querySelector("[data-products-pagination]"),
    productsPageSummary: document.querySelector("[data-products-page-summary]"),
    logsTable: document.querySelector("[data-inventory-log-table]"),
    ordersTable: document.querySelector("[data-orders-table]"),
    customRequestsTable: document.querySelector("[data-custom-requests-table]"),
    customRequestDetail: document.querySelector("[data-custom-request-detail]"),
    customRequestSearch: document.querySelector("[data-custom-request-search]"),
    customRequestStatus: document.querySelector("[data-custom-request-status]"),
    customRequestListSummary: document.querySelector("[data-custom-request-list-summary]"),
    customRequestStatusFilters: Array.from(document.querySelectorAll("[data-custom-request-status-filter]")),
    customRequestCounts: Array.from(document.querySelectorAll("[data-custom-request-count]")),
    inquiriesTable: document.querySelector("[data-inquiries-table]"),
    inquiryDetail: document.querySelector("[data-inquiry-detail]"),
    inquiryListSummary: document.querySelector("[data-inquiry-list-summary]"),
    inquirySearch: document.querySelector("[data-inquiry-search]"),
    inquiryStatus: document.querySelector("[data-inquiry-status]"),
    inquiryStatusFilters: Array.from(document.querySelectorAll("[data-inquiry-status-filter]")),
    inquiryCounts: Array.from(document.querySelectorAll("[data-inquiry-count]")),
    productSelect: document.querySelector("[data-product-select]"),
    orderProductSelect: document.querySelector("[data-order-product-select]"),
    productDatalist: document.querySelector("[data-product-datalist]"),
    orderProductDatalist: document.querySelector("[data-order-product-datalist]"),
    message: document.querySelector("[data-admin-message]"),
    resetDemo: document.querySelector("[data-reset-demo]"),
    catalogueStatus: document.querySelector("[data-catalogue-status]"),
    catalogueLiveCount: document.querySelector("[data-catalogue-live-count]"),
    catalogueLastLoaded: document.querySelector("[data-catalogue-last-loaded]"),
    bestSellerSlots: document.querySelector("[data-best-seller-slots]"),
    bestSellerCount: document.querySelector("[data-best-seller-count]"),
    bestSellerDirty: document.querySelector("[data-best-seller-dirty]"),
    bestSellerDiscard: document.querySelector("[data-best-seller-discard]"),
    bestSellerRemoveUnavailable: document.querySelector("[data-best-seller-remove-unavailable]"),
    bestSellerUnavailableNote: document.querySelector("[data-best-seller-unavailable-note]"),
    bestSellerSearch: document.querySelector("[data-best-seller-search]"),
    bestSellerCollection: document.querySelector("[data-best-seller-collection]"),
    bestSellerResults: document.querySelector("[data-best-seller-results]"),
    bestSellerResultsSummary: document.querySelector("[data-best-seller-results-summary]"),
    databaseStatus: document.querySelector("[data-database-status]"),
    databaseProject: document.querySelector("[data-database-project]"),
    databaseChecked: document.querySelector("[data-database-checked]"),
    databaseSummary: document.querySelector("[data-database-summary]"),
    databaseTableStatus: document.querySelector("[data-database-table-status]"),
    databaseProductsSummary: document.querySelector("[data-database-products-summary]"),
    databaseProductsTable: document.querySelector("[data-database-products-table]"),
    totalProducts: document.querySelector("[data-total-products]"),
    totalStock: document.querySelector("[data-total-stock]"),
    totalReserved: document.querySelector("[data-total-reserved]")
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

  const SEARCH_DEBOUNCE_MS = 150;

  // Runs `fn` once typing pauses, so a search box does not redraw on every key.
  function debounce(fn, waitMs) {
    let timer = null;

    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), waitMs);
    };
  }

  // ── PERMISSIONS ─────────────────────────────────────────────────────────────
  // The server renders the signed-in role's permissions on the page shell. A
  // control tagged data-requires="<permission>" is disabled, with the reason as
  // its tooltip, when the role cannot use it. The API still enforces every
  // permission; this only stops people filling in a form that would be refused.
  const adminShell = document.querySelector(".admin-page-shell");
  const adminPermissionsKnown = Boolean(adminShell && adminShell.dataset.adminPermissions !== undefined);
  const adminPermissions = new Set(String(adminShell?.dataset.adminPermissions || "").split(/\s+/).filter(Boolean));
  const adminRoleLabel = adminShell?.dataset.adminRoleLabel || t("perm.roleFallback");
  const KNOWN_PERMISSION_REASONS = new Set([
    "catalogue:write",
    "catalogue:delete",
    "operations:write",
    "settings:write",
    "personal-data:export",
    "payments:write"
  ]);

  function adminCan(permission) {
    return !adminPermissionsKnown || adminPermissions.has(permission);
  }

  function describePermissionDenied(permission) {
    return t(KNOWN_PERMISSION_REASONS.has(permission) ? `perm.denied.${permission}` : "perm.denied.default", { role: adminRoleLabel });
  }

  function applyAdminPermissions(root = document) {
    root.querySelectorAll("[data-requires]").forEach((control) => {
      const permission = control.dataset.requires;
      const allowed = adminCan(permission);

      control.classList.toggle("is-permission-locked", !allowed);

      if (allowed) {
        if (control.dataset.lockedByRole === "true") {
          delete control.dataset.lockedByRole;
          control.removeAttribute("aria-disabled");
          control.removeAttribute("title");
          if ("disabled" in control) control.disabled = false;
        }
        return;
      }

      control.dataset.lockedByRole = "true";
      control.setAttribute("aria-disabled", "true");
      control.title = describePermissionDenied(permission);
      if ("disabled" in control) control.disabled = true;
    });
  }

  // For submit handlers: false (with a message) when the role cannot do this.
  function ensureAdminCan(permission) {
    if (adminCan(permission)) {
      return true;
    }

    setMessage(describePermissionDenied(permission), true);
    return false;
  }

  window.MARIS_ADMIN_PERMISSIONS = { can: adminCan, apply: applyAdminPermissions, describe: describePermissionDenied };

  const ADMIN_API_PREFIX = "/api/admin";
  const ADMIN_PRODUCT_IMAGES_PATH = "/product-images";
  // The catalogue card's two images, and the limits the media routes enforce
  // (app/lib/maris-database/product-media.js). Checked here first so a wrong
  // file is turned away before it uploads.
  const CARD_IMAGE_SLOTS = ["cover", "hover"];
  const CARD_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MEGABYTE = 1024 * 1024;
  const CARD_IMAGE_MAX_BYTES = 10 * MEGABYTE;
  // Gallery limits mirror app/lib/maris-database/product-images.js.
  const GALLERY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
  const GALLERY_IMAGE_MAX_BYTES = 5 * MEGABYTE;
  const CARD_IMAGE_HINT = t("hint.cardImages");
  const GALLERY_IMAGE_HINT = t("hint.galleryImages");
  const VIDEO_MAX_BYTES = 20 * MEGABYTE;
  const SQUARE_TOLERANCE = 0.02;
  const POSTER_MAX_EDGE = 1080;
  const VIDEO_POSITION_FIRST = 0;
  const VIDEO_POSITION_AFTER_COVER = 1;
  // "Last, whatever the length": the storefront clamps it to each metal's set.
  const VIDEO_POSITION_LAST = 99;
  const BEST_SELLER_SLOT_COUNT = 7;
  const BEST_SELLER_RESULTS_PAGE_SIZE = 24;
  const PRODUCT_LIST_PAGE_SIZE = 5;
  const adminCache = {
    products: [],
    bestSellerProductIds: [],
    orders: [],
    customRequests: [],
    inquiries: [],
    logs: [],
    isLoading: true,
    isReady: false,
    error: "",
    // When the product list was last loaded from the server.
    productsLoadedAt: "",
    // One message per data set ("" = loaded fine), so one failing endpoint only
    // affects the tables and actions that need it.
    errors: {}
  };
  const ADMIN_DATASETS = {
    products: { path: "/products", label: t("dataset.products"), apply: (payload) => {
      adminCache.products = Array.isArray(payload.products) ? payload.products : [];
      adminCache.productsLoadedAt = new Date().toISOString();
      rememberProductSkus(adminCache.products);
    } },
    orders: { path: "/orders", label: t("dataset.orders"), apply: (payload) => {
      adminCache.orders = Array.isArray(payload.orders) ? payload.orders : [];
    } },
    logs: { path: "/inventory-logs", label: t("dataset.logs"), apply: (payload) => {
      adminCache.logs = Array.isArray(payload.logs) ? payload.logs : [];
    } },
    customRequests: { path: "/api/admin/custom-order-requests", label: t("dataset.customRequests"), apply: (payload) => {
      adminCache.customRequests = Array.isArray(payload.requests) ? payload.requests : [];
    } },
    bestSellers: { path: "/best-sellers", label: t("dataset.bestSellers"), apply: (payload) => {
      // The unsaved slot order (bestSellerState.draftIds) is deliberately kept:
      // it is cleared only by a successful save or the Discard button.
      adminCache.bestSellerProductIds = Array.isArray(payload.productIds) ? payload.productIds : [];
    } },
    inquiries: { path: "/api/admin/inquiries", label: t("dataset.inquiries"), apply: (payload) => {
      adminCache.inquiries = Array.isArray(payload.inquiries) ? payload.inquiries : [];
    } }
  };
  const productListState = {
    searchTerm: "",
    status: "all",
    page: 1,
    // Empty sortKey keeps the server order (most recently changed first).
    sortKey: "",
    sortDir: "asc"
  };
  // draftIds stays null until the manager edits the slots, so a reload or a
  // save falls back to the saved Supabase order.
  const bestSellerState = {
    draftIds: null,
    searchTerm: "",
    collection: "",
    visibleCount: BEST_SELLER_RESULTS_PAGE_SIZE
  };
  // SKUs seen for every product id, so a slot whose product was deleted or
  // hidden can still say which product it was.
  const productSkuMemory = new Map();
  const customRequestListState = {
    searchTerm: "",
    status: "all",
    selectedId: ""
  };
  const customRequestStatuses = ["pending", "contacted", "completed", "cancelled"];
  const customRequestStatusLabels = {
    pending: t("status.request.pending"),
    contacted: t("status.request.contacted"),
    completed: t("status.request.completed"),
    cancelled: t("status.request.cancelled")
  };
  const customRequestMetalLabels = {
    WG: t("metal.WG"),
    YG: t("metal.YG"),
    RG: t("metal.RG"),
    PN: t("metal.PN"),
    Pd: t("metal.Pd")
  };
  let modalGalleryImages = [];
  let modalMedia = {
    coverImageUrl: "",
    hoverImageUrl: "",
    videoUrl: "",
    videoPosterUrl: "",
    videoPosition: VIDEO_POSITION_AFTER_COVER
  };
  // A picked turntable waiting for its Upload click: the file, what was read
  // from it, and the poster drawn from its first frame.
  let modalVideoDraft = null;
  let modalVideoUploading = false;
  let modalGemReport = null;
  let modalGalleryDragIndex = null;

  // 401: the session has ended. Show a persistent banner with a sign-in link that
  // opens in a new tab, so nothing typed on this page is lost.
  // 403: the signed-in role is not allowed to do this.
  const SESSION_ENDED_MESSAGE = t("error.sessionEnded");
  const FORBIDDEN_MESSAGE = t("error.forbidden");

  function showSessionBanner() {
    const banner = document.querySelector("[data-admin-session-banner]");
    if (!banner) return;
    const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const link = banner.querySelector("[data-admin-session-banner-link]");
    const text = banner.querySelector("[data-admin-session-banner-text]");
    if (link) link.href = `/admin/login?next=${encodeURIComponent(target)}`;
    if (text) text.textContent = SESSION_ENDED_MESSAGE;
    banner.hidden = false;
  }

  function describeAuthFailure(status) {
    if (status === 401) {
      showSessionBanner();
      return SESSION_ENDED_MESSAGE;
    }
    if (status === 403) {
      return FORBIDDEN_MESSAGE;
    }
    return "";
  }

  async function fetchAdminApi(path, options = {}) {
    const url = path.startsWith(ADMIN_API_PREFIX) ? path : `${ADMIN_API_PREFIX}${path}`;
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
      const error = new Error(describeAuthFailure(response.status) || payload.error || t("error.server", { status: response.status }));
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function refreshAdminCacheSummary() {
    const messages = Object.values(adminCache.errors).filter(Boolean);
    adminCache.isReady = !adminCache.errors.products;
    adminCache.error = messages[0] || "";
  }

  // Loads the named data sets (default: all). A failed one keeps what was
  // already on screen and records its own error; the others still load.
  async function loadAdminBackendData(names = Object.keys(ADMIN_DATASETS)) {
    adminCache.isLoading = true;

    try {
      const results = await Promise.allSettled(names.map((name) => fetchAdminApi(ADMIN_DATASETS[name].path)));

      results.forEach((result, index) => {
        const name = names[index];

        if (result.status === "fulfilled") {
          ADMIN_DATASETS[name].apply(result.value);
          adminCache.errors[name] = "";
        } else {
          const reason = result.reason;
          adminCache.errors[name] = reason instanceof Error && reason.message
            ? reason.message
            : t("error.couldNotLoad", { label: ADMIN_DATASETS[name].label });
        }
      });
    } finally {
      adminCache.isLoading = false;
      refreshAdminCacheSummary();
    }
  }

  // A table cell for a data set that failed to load, with its own Retry button.
  function datasetErrorCell(name, colspan, fallbackMessage) {
    const message = adminCache.errors[name] || fallbackMessage;
    return `<tr><td colspan="${colspan}">${escapeHtml(t("error.couldNotLoadWhy", { label: ADMIN_DATASETS[name].label, message }))} <button type="button" class="admin-secondary" data-retry-dataset="${name}">${escapeHtml(t("common.retry"))}</button></td></tr>`;
  }

  function getCachedProducts() {
    return Array.isArray(adminCache.products) ? adminCache.products : [];
  }

  function getBestSellerProductIds() {
    return Array.from(new Set(
      (Array.isArray(adminCache.bestSellerProductIds) ? adminCache.bestSellerProductIds : [])
        .map((productId) => String(productId || "").trim())
        .filter(Boolean)
    )).slice(0, BEST_SELLER_SLOT_COUNT);
  }

  function getCachedOrders() {
    return Array.isArray(adminCache.orders) ? adminCache.orders : [];
  }

  function getCachedLogs() {
    return Array.isArray(adminCache.logs) ? adminCache.logs : [];
  }

  function getCachedCustomRequests() {
    return Array.isArray(adminCache.customRequests) ? adminCache.customRequests : [];
  }

  function getCustomRequestStatus(request) {
    const status = String(request?.status || "pending").toLowerCase();
    return customRequestStatuses.includes(status) ? status : "pending";
  }

  function getCustomRequestStatusLabel(status) {
    return customRequestStatusLabels[status] || customRequestStatusLabels.pending;
  }

  function formatCustomRequestDate(value) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString(adminLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getCustomRequestAge(value) {
    const createdAt = new Date(value || "");

    if (Number.isNaN(createdAt.getTime())) {
      return { label: "", isOverdue: false };
    }

    const elapsedHours = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (60 * 60 * 1000)));

    if (elapsedHours < 1) {
      return { label: t("time.justReceived"), isOverdue: false };
    }

    if (elapsedHours < 24) {
      return { label: t("time.hoursAgo", { n: elapsedHours }), isOverdue: elapsedHours >= 4 };
    }

    const days = Math.floor(elapsedHours / 24);
    return { label: t("time.daysAgo", { n: days }), isOverdue: true };
  }

  function getCustomRequestHistory(request) {
    return Array.isArray(request?.tracking?.history) ? request.tracking.history : [];
  }

  function getFilteredCustomRequests() {
    const searchTerm = customRequestListState.searchTerm.trim().toLowerCase();

    return getCachedCustomRequests().filter((request) => {
      const status = getCustomRequestStatus(request);

      if (customRequestListState.status !== "all" && status !== customRequestListState.status) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return [
        request.id,
        request.productCode,
        request.customerName,
        request.fullName,
        request.customerEmail,
        request.email,
        request.customerPhone,
        request.contactNumber,
        request.companyName
      ].some((value) => String(value || "").toLowerCase().includes(searchTerm));
    });
  }

  function buildCustomRequestDesignSummary(request) {
    const ringDesign = request.ringDesign || {};
    const metal = [request.metalPurity, customRequestMetalLabels[request.metal] || request.metal].filter(Boolean).join(" ");
    const stone = [
      request.stoneCarat ? `${request.stoneCarat} ct` : "",
      ringDesign.stoneShape,
      request.stoneColor,
      request.stoneClarity,
      request.stoneCut
    ].filter(Boolean).join(" ");

    return [
      ringDesign.style,
      ringDesign.setting,
      metal,
      request.ringSize ? t("request.size", { size: request.ringSizeLabel || `US ${request.ringSize}` }) : "",
      request.origin,
      stone
    ].filter(Boolean).join(" · ") || request.metadata?.optionSummary || t("request.noPreferences");
  }

  let messageHideTimer = null;

  function setMessage(message, isError = false) {
    if (!elements.message) {
      return;
    }

    window.clearTimeout(messageHideTimer);
    elements.message.classList.remove("has-action");
    elements.message.textContent = message;
    elements.message.classList.toggle("is-error", isError);
    elements.message.classList.toggle("is-visible", Boolean(message));

    if (!message) {
      return;
    }

    // Errors stay put long enough to read and act on; confirmations get out of
    // the way so the toast never covers the row an admin is working on.
    messageHideTimer = window.setTimeout(() => {
      elements.message.classList.remove("is-visible");
    }, isError ? 8000 : 4000);
  }

  // Runs `task` once at a time for `lockElement` (a form or button): a second
  // click/submit while it is running is ignored, the button shows `busyLabel`,
  // and everything is restored in `finally`. Returns true when the task ran.
  async function withSubmitLock(lockElement, button, busyLabel, task) {
    if (!lockElement || lockElement.dataset.submitting === "true") {
      return false;
    }

    const previousLabel = button ? button.textContent : "";
    lockElement.dataset.submitting = "true";
    if (button) {
      button.disabled = true;
      if (busyLabel) {
        button.textContent = busyLabel;
      }
    }

    try {
      await task();
    } finally {
      delete lockElement.dataset.submitting;
      if (button) {
        button.disabled = false;
        if (busyLabel) {
          button.textContent = previousLabel;
        }
      }
    }

    return true;
  }

  // Blocks an action only when a data set it needs failed to load.
  // A confirmation toast with one action button (for example Undo) that stays
  // for `duration` ms.
  function setMessageWithAction(message, actionLabel, onAction, duration = 8000) {
    if (!elements.message) {
      return;
    }

    window.clearTimeout(messageHideTimer);
    elements.message.classList.remove("is-error");
    elements.message.textContent = "";

    const text = document.createElement("span");
    text.textContent = message;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-message-action";
    button.textContent = actionLabel;
    button.addEventListener("click", async () => {
      button.disabled = true;
      await onAction();
    });

    elements.message.append(text, button);
    elements.message.classList.add("is-visible", "has-action");
    messageHideTimer = window.setTimeout(() => setMessage(""), duration);
  }

  function ensureAdminDataReady(...names) {
    const needed = names.length ? names : ["products"];
    const failed = needed.find((name) => adminCache.errors[name]);

    if (!failed && !adminCache.isLoading) {
      return true;
    }

    setMessage(
      failed
        ? t("error.datasetFailed", {
          label: `${ADMIN_DATASETS[failed].label[0].toUpperCase()}${ADMIN_DATASETS[failed].label.slice(1)}`,
          message: adminCache.errors[failed]
        })
        : t("error.stillLoading"),
      true
    );
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

  function readCustomRequests() {
    return getCachedCustomRequests();
  }

  function getProductSearchText(product) {
    return [
      getProductSku(product),
      getProductName(product),
      getProductCategory(product),
      getProductCollectionName(product),
      getProductPrice(product),
      product?.status,
      getProductStatusLabel(product?.status),
      product?.slug,
      product?.description
    ].filter(Boolean).join(" ").toLowerCase();
  }

  const PRODUCT_STATUS_ORDER = { active: 0, draft: 1, archived: 2 };

  function getProductImageCount(product) {
    return Array.isArray(product.images) ? product.images.length : (Number(product.imageCount) || 0);
  }

  function getProductPriceValue(product) {
    const amount = Number(product.basePrice ?? product.priceAmount);

    if (Number.isFinite(amount)) {
      return amount;
    }

    const parsed = Number(String(product.price || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : -1;
  }

  // What each sortable column sorts by.
  const PRODUCT_SORTERS = {
    sku: (product) => getProductSku(product),
    name: (product) => getProductName(product),
    collection: (product) => getCollectionLabel(product.collection),
    price: getProductPriceValue,
    available: (product) => getAvailable(product),
    images: getProductImageCount,
    status: (product) => PRODUCT_STATUS_ORDER[normalizeProductStatus(product.status)]
  };

  function sortProducts(products, key, direction) {
    const read = PRODUCT_SORTERS[key];

    if (!read) {
      return products;
    }

    const factor = direction === "desc" ? -1 : 1;

    return [...products].sort((left, right) => {
      const a = read(left);
      const b = read(right);
      const result = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

      return result * factor;
    });
  }

  function getProductListView() {
    const products = readProducts();
    const searchLabel = productListState.searchTerm.trim();
    const query = searchLabel.toLowerCase();
    const statusFilter = productListState.status;
    const statusProducts = statusFilter === "all"
      ? products
      : products.filter((product) => normalizeProductStatus(product.status) === statusFilter);
    const matchingProducts = query
      ? statusProducts.filter((product) => getProductSearchText(product).includes(query))
      : statusProducts;
    const filteredProducts = sortProducts(matchingProducts, productListState.sortKey, productListState.sortDir);
    const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PRODUCT_LIST_PAGE_SIZE));
    const currentPage = Math.min(Math.max(Number(productListState.page) || 1, 1), pageCount);
    const startIndex = (currentPage - 1) * PRODUCT_LIST_PAGE_SIZE;

    productListState.page = currentPage;

    const statusCounts = { all: products.length, active: 0, draft: 0, archived: 0 };
    products.forEach((product) => {
      statusCounts[normalizeProductStatus(product.status)] += 1;
    });

    return {
      query,
      searchLabel,
      statusFilter,
      statusCounts,
      totalProducts: products.length,
      filteredProducts,
      filteredCount: filteredProducts.length,
      pageProducts: filteredProducts.slice(startIndex, startIndex + PRODUCT_LIST_PAGE_SIZE),
      pageCount,
      currentPage,
      startItem: filteredProducts.length ? startIndex + 1 : 0,
      endItem: Math.min(startIndex + PRODUCT_LIST_PAGE_SIZE, filteredProducts.length)
    };
  }

  function renderProductListControls(view) {
    document.querySelectorAll("[data-products-status]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.productsStatus === view.statusFilter));
    });
    document.querySelectorAll("[data-products-status-count]").forEach((count) => {
      count.textContent = String(view.statusCounts[count.dataset.productsStatusCount] ?? 0);
    });
    document.querySelectorAll("[data-products-sort]").forEach((button) => {
      const isSorted = productListState.sortKey === button.dataset.productsSort;
      const direction = productListState.sortDir === "desc" ? "descending" : "ascending";

      button.closest("th")?.setAttribute("aria-sort", isSorted ? direction : "none");
      button.dataset.sortDirection = isSorted ? productListState.sortDir : "";
    });

    if (elements.productsPageSummary) {
      if (adminCache.isLoading) {
        elements.productsPageSummary.textContent = t("products.loading");
      } else if (adminCache.errors.products) {
        elements.productsPageSummary.textContent = t("products.loadError", { message: adminCache.errors.products });
      } else if (!view.filteredCount && view.query) {
        elements.productsPageSummary.textContent = t("products.noMatch", { query: view.searchLabel });
      } else if (!view.filteredCount) {
        elements.productsPageSummary.textContent = t("products.none");
      } else if (view.query) {
        elements.productsPageSummary.textContent = t("products.showingMatches", { start: view.startItem, end: view.endItem, count: view.filteredCount, query: view.searchLabel, total: view.totalProducts });
      } else {
        elements.productsPageSummary.textContent = t("products.showing", { start: view.startItem, end: view.endItem, count: view.filteredCount });
      }
    }

    if (!elements.productsPagination) {
      return;
    }

    if (adminCache.isLoading || adminCache.errors.products || view.pageCount <= 1) {
      elements.productsPagination.innerHTML = "";
      return;
    }

    const pageButtons = Array.from({ length: view.pageCount }, (_, index) => {
      const page = index + 1;
      const isCurrent = page === view.currentPage;
      return `<button type="button" data-products-page="${page}"${isCurrent ? ' aria-current="page"' : ""}>${page}</button>`;
    }).join("");

    elements.productsPagination.innerHTML = `
      <button type="button" data-products-page="${Math.max(1, view.currentPage - 1)}"${view.currentPage === 1 ? " disabled" : ""}>${escapeHtml(t("common.prev"))}</button>
      ${pageButtons}
      <button type="button" data-products-page="${Math.min(view.pageCount, view.currentPage + 1)}"${view.currentPage === view.pageCount ? " disabled" : ""}>${escapeHtml(t("common.next"))}</button>
    `;
  }

  function getAvailable(product) {
    return Math.max(0, Number(product.stockQty) - Number(product.reservedQty));
  }

  function getProductSku(product) {
    return product.sku || product.productCode || product.code || product.id || "";
  }

  function getProductName(product) {
    return product.name || product.nameEn || getProductSku(product);
  }

  function getProductCategory(product) {
    return product.category || getCollectionDataLabel(product.collection) || "Fine Jewelry";
  }

  // One set of words for a product's stored status, used everywhere it is shown.
  const PRODUCT_STATUS_LABELS = {
    active: t("status.product.active"),
    draft: t("status.product.draft"),
    archived: t("status.product.archived")
  };

  function normalizeProductStatus(value) {
    const status = String(value ?? "").trim().toLowerCase();
    return Object.hasOwn(PRODUCT_STATUS_LABELS, status) ? status : "draft";
  }

  function getProductStatusLabel(value) {
    return PRODUCT_STATUS_LABELS[normalizeProductStatus(value)];
  }

  // Badges say the same thing for products, orders and payments: green is
  // good, amber is waiting, grey is closed or off.
  const STATUS_TONES = {
    active: "good", draft: "pending", archived: "muted",
    paid: "good", completed: "good", shipped: "good", ready: "good", confirmed: "good",
    quoted: "pending", making: "pending", pending: "pending", unpaid: "pending",
    cancelled: "muted", failed: "muted", refunded: "muted"
  };

  function renderStatusBadge(label, statusKey) {
    const tone = STATUS_TONES[String(statusKey || "").toLowerCase()] || "pending";
    return `<span class="admin-status-badge is-${tone}">${escapeHtml(label)}</span>`;
  }

  function renderProductStatusBadge(value) {
    const status = normalizeProductStatus(value);
    return renderStatusBadge(PRODUCT_STATUS_LABELS[status], status);
  }

  // Order and payment statuses as stored, in plain words.
  const ORDER_STATUS_LABELS = {
    draft: t("status.order.draft"),
    pending: t("status.order.pending"),
    quoted: t("status.order.quoted"),
    confirmed: t("status.order.confirmed"),
    paid: t("status.order.paid"),
    making: t("status.order.making"),
    ready: t("status.order.ready"),
    shipped: t("status.order.shipped"),
    completed: t("status.order.completed"),
    cancelled: t("status.order.cancelled")
  };
  const PAYMENT_STATUS_LABELS = {
    unpaid: t("status.payment.unpaid"),
    pending: t("status.payment.pending"),
    paid: t("status.payment.paid"),
    failed: t("status.payment.failed"),
    refunded: t("status.payment.refunded"),
    cancelled: t("status.payment.cancelled")
  };

  function formatStatusLabel(labels, value) {
    const key = String(value ?? "").trim().toLowerCase();

    if (Object.hasOwn(labels, key)) {
      return labels[key];
    }

    return key ? key.replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase()) : "-";
  }

  // Sample-piece specs shown on the product page; the key doubles as the
  // create-form field name and the modal renders one input per entry.
  const PRODUCT_SPEC_FIELDS = [
    { key: "caratWeight", modalId: "modal-field-carat-weight", label: t("spec.caratWeight"), placeholder: "0.50 ct" },
    { key: "stoneType", modalId: "modal-field-stone-type", label: t("spec.stoneType"), placeholder: "Natural Diamond" },
    { key: "stoneShape", modalId: "modal-field-stone-shape", label: t("spec.stoneShape"), placeholder: "Round Brilliant" }
  ];

  // The storefront splits a gallery into metal sets by reading the metal and
  // view from each image's alt text, so uploads write both into it.
  // These English words are stored data, not display text: show them through
  // displayImageMetal() / displayImageView().
  const IMAGE_METAL_LABELS = ["White Gold", "Yellow Gold", "Rose Gold"];
  const IMAGE_METAL_CODES = { "White Gold": "WG", "Yellow Gold": "YG", "Rose Gold": "RG" };
  const IMAGE_VIEW_CODES = { "Hero view": "hero", "Top view": "top", "Front view": "front", "Side view": "side", "Back view": "back" };

  function displayImageMetal(label) {
    return IMAGE_METAL_CODES[label] ? t(`metal.${IMAGE_METAL_CODES[label]}`) : label;
  }

  function displayImageView(label) {
    return IMAGE_VIEW_CODES[label] ? t(`imageView.${IMAGE_VIEW_CODES[label]}`) : label;
  }

  const IMAGE_VIEW_LABELS = [
    ["Hero view", /\b(hero|main|primary)\b/i],
    ["Top view", /\btop\b/i],
    ["Front view", /\bfront\b/i],
    ["Side view", /\bside\b/i],
    ["Back view", /\bback\b/i]
  ];

  function readImageTag(altText) {
    const text = String(altText || "");
    const metal = IMAGE_METAL_LABELS.find((label) => new RegExp(`\\b${label.replace(" ", "\\s*")}\\b`, "i").test(text)) || "";
    const view = IMAGE_VIEW_LABELS.find(([, pattern]) => pattern.test(text))?.[0] || "";
    return { metal, view };
  }

  // An explicit choice in the modal wins; otherwise fall back to what the
  // file name says, the same way the create form groups its uploads.
  function buildModalImageAltText(name, file, fallbackView) {
    const parsed = getAdminImageGroupParser()?.parseImageFile(file);
    const chosenMetal = document.getElementById("modal-field-image-metal")?.value || "";
    const chosenView = document.getElementById("modal-field-image-view")?.value || "";
    const metal = chosenMetal || (IMAGE_METAL_LABELS.includes(parsed?.metalLabel) ? parsed.metalLabel : "");
    const view = chosenView || (parsed?.viewKey && parsed.viewKey !== "detail" ? parsed.viewLabel : fallbackView);
    return [name, metal, view].filter(Boolean).join(" ");
  }

  // Swaps the metal and view words in an existing alt text and keeps the rest,
  // so the product wording the upload wrote survives a retag.
  function retagImageAltText(altText, metal, view, fallbackName) {
    const base = String(altText || "")
      .replace(/\b(white|rose|yellow)\s*gold\b/gi, " ")
      .replace(/\b(hero|main|primary|top|front|side|back|detail)\s+view\b/gi, " ")
      .replace(/\b(primary|gallery)\s+image(\s+\d+)?\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    return [base || fallbackName, metal, view].filter(Boolean).join(" ");
  }

  function renderImageTagOptions(labels, selected, emptyLabel) {
    return [["", emptyLabel], ...labels.map((label) => [label, IMAGE_METAL_CODES[label] ? displayImageMetal(label) : displayImageView(label)])]
      .map(([value, label]) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`)
      .join("");
  }

  function getProductMetadata(product) {
    const metadata = product?.metadata;
    return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  }

  function getProductCollectionName(product) {
    return product?.collectionName || getProductMetadata(product).collectionName || "";
  }

  function parseModalMetadata(value) {
    try {
      const parsed = JSON.parse(value || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function buildProductMetadata(product, collectionName) {
    const metadata = { ...getProductMetadata(product) };
    const cleanCollectionName = String(collectionName || "").trim();

    if (cleanCollectionName) {
      metadata.collectionName = cleanCollectionName;
    } else {
      delete metadata.collectionName;
    }

    return metadata;
  }

  function getProductPrice(product) {
    if (product.price) {
      return product.price;
    }

    // Product rows from /api/admin/products carry basePrice; the database
    // catalogue rows carry priceAmount.
    const rawAmount = product.priceAmount ?? product.basePrice;

    if (rawAmount === null || rawAmount === undefined) {
      return t("product.priceOnRequest");
    }

    const amount = Number(rawAmount);
    const formattedAmount = Number.isFinite(amount) ? amount.toLocaleString(adminLocale) : String(rawAmount);
    return `${formattedAmount} ${product.currency || "THB"}`;
  }

  function getMovementLabel(type) {
    const labels = {
      receive: t("movement.receive"),
      reserve: t("movement.reserve"),
      release: t("movement.release"),
      sale: t("movement.sale"),
      damage: t("movement.damage"),
      return: t("movement.return")
    };

    return labels[type] || type;
  }

  // The stored (English) collection title: what is saved as a product's category.
  function getCollectionDataLabel(collectionKey) {
    return collectionMeta[collectionKey]?.title || collectionKey || "Unassigned";
  }

  // The collection name as shown on screen, in the active language.
  function getCollectionLabel(collectionKey) {
    const translated = collectionKey ? t(`collection.${collectionKey}`) : "";

    if (translated && translated !== `collection.${collectionKey}`) {
      return translated;
    }

    return collectionMeta[collectionKey]?.title || collectionKey || t("common.unassigned");
  }

  // Stored category values, not display text.
  function getBroadCategoryLabel(collectionKey, fallbackCategory = "") {
    if (collectionKey === "wedding-set") {
      return "Wedding Set";
    }

    if (ringCollectionKeys.has(collectionKey)) {
      return "Rings";
    }

    return getCollectionDataLabel(collectionKey) || fallbackCategory || "Unassigned";
  }

  function getProductFormCollectionKey(category, ringType) {
    if (category === "Rings") {
      return ringCollectionKeys.has(ringType) ? ringType : "rings";
    }

    return categoryCollectionMap[category] || "";
  }

  function getCollectionHref(collectionKey) {
    return collectionMeta[collectionKey]?.href || "/category/engagement-ring";
  }

  function getProductPreviewHref(code) {
    const productCode = String(code || "").trim();
    return productCode ? `/product/${encodeURIComponent(productCode)}` : "/category/engagement-ring";
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

  function getAdminImageGroupParser() {
    return window.MARIS_ADMIN_IMAGE_GROUP && typeof window.MARIS_ADMIN_IMAGE_GROUP.buildImageFileGroup === "function"
      ? window.MARIS_ADMIN_IMAGE_GROUP
      : null;
  }

  function buildSmartImageGroup(files) {
    const parser = getAdminImageGroupParser();

    if (!parser) {
      return null;
    }

    const group = parser.buildImageFileGroup(files);
    return group?.ok ? group : null;
  }

  function getSmartImageGroupFromFormData(formData) {
    return buildSmartImageGroup(formData.getAll("imageGroupFiles").filter(isSelectedFile));
  }

  function setFormValue(form, name, value, options = {}) {
    const field = form?.elements?.namedItem(name);

    if (!field || value === undefined || value === null || value === "") {
      return;
    }

    if (options.force || !String(field.value || "").trim()) {
      field.value = value;
    }
  }

  function syncRingTypeFieldVisibility(form) {
    const field = form?.querySelector("[data-ring-type-field]");
    const category = String(form?.elements?.namedItem("category")?.value || "").trim();

    if (!field) {
      return;
    }

    field.hidden = category !== "Rings";
  }

  // ── GEM REPORT ──────────────────────────────────────────────────────────────
  // A CAD gem report CSV fills the three spec fields and is saved whole with
  // the product, whose page then lists every stone. The add form and the edit
  // modal each get one control. It keeps the file's text, so the carat reading
  // can be switched without choosing the file again, and it only hands a
  // report to the save once one was imported or removed.

  const GEM_REPORT_MAX_BYTES = 2 * 1024 * 1024;
  const GEM_REPORT_FILE_ACCEPT = ".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain";

  function getGemReportParser() {
    return window.MARIS_ADMIN_GEM_REPORT && typeof window.MARIS_ADMIN_GEM_REPORT.parseGemReportCsv === "function"
      ? window.MARIS_ADMIN_GEM_REPORT
      : null;
  }

  function formatGemReportCarat(value) {
    return getGemReportParser()?.formatCarat(value) || "";
  }

  async function readGemReportFile(file) {
    const parser = getGemReportParser();

    if (!parser) {
      throw new Error(t("gem.readerMissing"));
    }

    if (/\.(xlsx?|xlsm|numbers|pdf)$/i.test(file.name)) {
      throw new Error(t("gem.notCsv"));
    }

    if (file.size > GEM_REPORT_MAX_BYTES) {
      throw new Error(t("gem.tooLarge"));
    }

    return parser.decodeGemReportBytes(await file.arrayBuffer());
  }

  function renderGemReportTable(report) {
    const stones = Array.isArray(report?.stones) ? report.stones : [];
    const rows = stones.map((stone) => `
      <tr>
        <td>${escapeHtml(stone.stone || "")}</td>
        <td>${escapeHtml(stone.shape || "")}</td>
        <td>${escapeHtml(stone.size || "")}</td>
        <td class="is-number">${escapeHtml(stone.quantity)}</td>
        <td class="is-number">${escapeHtml(formatGemReportCarat(stone.caratEach))}</td>
        <td class="is-number">${escapeHtml(formatGemReportCarat(stone.caratTotal))}</td>
      </tr>`).join("");

    return `
      <div class="admin-gem-report-table">
        <table>
          <thead>
            <tr>
              <th scope="col">${escapeHtml(t("gem.col.stone"))}</th>
              <th scope="col">${escapeHtml(t("gem.col.shape"))}</th>
              <th scope="col">${escapeHtml(t("gem.col.size"))}</th>
              <th scope="col" class="is-number">${escapeHtml(t("gem.col.qty"))}</th>
              <th scope="col" class="is-number">${escapeHtml(t("gem.col.ctEach"))}</th>
              <th scope="col" class="is-number">${escapeHtml(t("gem.col.ctTotal"))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3">${escapeHtml(t("gem.col.total"))}</td>
              <td class="is-number">${escapeHtml(report.totalQuantity)}</td>
              <td></td>
              <td class="is-number">${escapeHtml(formatGemReportCarat(report.totalCarat))}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  }

  function createGemReportControl({ input, preview, emptyText, removedText, setSpecField }) {
    let state = { report: null, draft: null, changed: false };

    function render(error = "") {
      const { report, draft, changed } = state;
      const result = draft?.result;
      const parts = [];

      if (error) {
        parts.push(`<p class="admin-gem-report-error" role="alert">${escapeHtml(error)}</p>`);
      }

      if (!report) {
        parts.push(`<p>${escapeHtml(changed ? removedText : emptyText)}</p>`);
        preview.innerHTML = parts.join("");
        return;
      }

      const lineCount = report.stones.length;
      const source = [
        report.fileName,
        result
          ? t("gem.notSavedYet")
          : report.importedAt ? t("gem.imported", { date: new Date(report.importedAt).toLocaleDateString(adminLocale) }) : ""
      ].filter(Boolean).join(" · ");

      parts.push(`
        <p class="admin-gem-report-summary">
          <strong>${escapeHtml(tp("gem.stones", report.totalQuantity, { n: report.totalQuantity }))}${report.totalCarat === null ? "" : ` · ${escapeHtml(t("gem.ctTotal", { carat: formatGemReportCarat(report.totalCarat) }))}`}</strong>
          <span>${escapeHtml(tp("gem.lines", lineCount, { n: lineCount }))}${source ? ` · ${escapeHtml(source)}` : ""}</span>
        </p>`);

      if (result?.needsCaratMode) {
        parts.push(`
          <label class="admin-gem-report-mode">
            <span>${escapeHtml(t("gem.caratColumn", { column: result.columns.carat || "Carat" }))}</span>
            <select data-gem-report-carat-mode>
              <option value="total"${result.caratMode === "total" ? " selected" : ""}>${escapeHtml(t("gem.caratModeTotal"))}</option>
              <option value="each"${result.caratMode === "each" ? " selected" : ""}>${escapeHtml(t("gem.caratModeEach"))}</option>
            </select>
          </label>`);
      }

      parts.push(renderGemReportTable(report));

      const notes = [];
      if (result) {
        const filled = PRODUCT_SPEC_FIELDS.filter(({ key }) => result.specs?.[key]).map(({ label }) => label);
        if (filled.length) notes.push(t("gem.filled", { fields: filled.join(", ") }));
        if (result.needsCaratMode && result.caratModeSource === "default") {
          notes.push(t("gem.caratUnsure"));
        }
        if (result.skippedRows) {
          notes.push(tp("gem.skipped", result.skippedRows, { n: result.skippedRows }));
        }
        if (result.truncated) notes.push(t("gem.truncated"));
      }
      if (notes.length) {
        parts.push(`<p class="admin-gem-report-note">${notes.map(escapeHtml).join(" ")}</p>`);
      }

      parts.push(`<button class="admin-secondary" type="button" data-gem-report-remove>${escapeHtml(t("gem.remove"))}</button>`);
      preview.innerHTML = parts.join("");
    }

    function applyResult(result, keys) {
      Object.entries(result.specs || {})
        .filter(([key, value]) => value && (!keys || keys.includes(key)))
        .forEach(([key, value]) => setSpecField(key, value));
    }

    input.addEventListener("change", async () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      try {
        const text = await readGemReportFile(file);
        const result = getGemReportParser().parseGemReportCsv(text, { fileName: file.name });

        if (!result.ok) {
          throw new Error(result.error);
        }

        state = { report: result.report, draft: { text, fileName: file.name, result }, changed: true };
        applyResult(result);
        render();
      } catch (error) {
        input.value = "";
        render(`${file.name}: ${error instanceof Error ? error.message : t("gem.unreadable")}`);
      }
    });

    preview.addEventListener("change", (event) => {
      const select = event.target.closest("[data-gem-report-carat-mode]");

      if (!select || !state.draft) {
        return;
      }

      const result = getGemReportParser().parseGemReportCsv(state.draft.text, {
        fileName: state.draft.fileName,
        caratMode: select.value
      });

      if (result.ok) {
        state = { ...state, report: result.report, draft: { ...state.draft, result } };
        applyResult(result, ["caratWeight"]);
        render();
      }
    });

    preview.addEventListener("click", (event) => {
      if (!event.target.closest("[data-gem-report-remove]")) {
        return;
      }

      state = { report: null, draft: null, changed: true };
      input.value = "";
      render();
    });

    return {
      // Loads what is saved on the product (or nothing, for the add form).
      reset(storedReport = null) {
        state = { report: storedReport, draft: null, changed: false };
        input.value = "";
        render();
      },
      // undefined leaves the saved report alone; null removes it.
      getPayload() {
        return state.changed ? state.report : undefined;
      }
    };
  }

  function updateImageGroupSummary(form, group) {
    const summary = form?.querySelector("[data-image-group-summary]");

    if (!summary) {
      return;
    }

    if (!group) {
      summary.textContent = t("images.noneSelected");
      return;
    }

    const orderedNames = group.orderedImages
      .map((image, index) => `${index + 1}. ${escapeHtml(image.fileName)}`)
      .join("<br>");

    summary.innerHTML = `
      <strong>${escapeHtml(group.summary || t("images.groupReady"))}</strong>
      <span>${orderedNames}</span>
    `;
  }

  function applyImageGroupToProductForm(form) {
    const input = form?.elements?.namedItem("imageGroupFiles");
    const files = Array.from(input?.files || []).filter(isSelectedFile);
    const group = buildSmartImageGroup(files);

    updateImageGroupSummary(form, group);

    if (!group) {
      return null;
    }

    setFormValue(form, "sku", group.code);
    setFormValue(form, "name", group.productName);
    setFormValue(form, "category", getBroadCategoryLabel(group.collectionKey), { force: true });

    if (ringCollectionKeys.has(group.collectionKey)) {
      setFormValue(form, "ringType", group.collectionKey, { force: true });
    }

    syncRingTypeFieldVisibility(form);

    return group;
  }

  function findSmartImageMetadata(file, smartGroup) {
    return smartGroup?.orderedImages?.find((image) => image.file === file) || null;
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

        const label = srcPart ? labelPart || t("images.view", { n: index + 1 }) : t("images.view", { n: index + 1 });
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
        label: t("images.primaryView"),
        src: fallbackImage,
        alt: `${fallbackName} primary view`
      });
    }

    if (fallbackHover && fallbackHover !== fallbackImage) {
      fallbackGallery.push({
        label: t("images.alternateView"),
        src: fallbackHover,
        alt: `${fallbackName} alternate view`
      });
    }

    return fallbackGallery;
  }

  function buildProductImageUploadDraft(formData, product) {
    const smartGroup = getSmartImageGroupFromFormData(formData);
    const selectedFiles = formData.getAll("imageGroupFiles").filter(isSelectedFile);
    const orderedFiles = smartGroup?.orderedImages?.length
      ? smartGroup.orderedImages.map((image) => image.file)
      : selectedFiles;

    return {
      product,
      coverImageFiles: formData.getAll("coverImageFiles").filter(isSelectedFile).slice(0, CARD_IMAGE_SLOTS.length),
      mainImageFile: orderedFiles[0] || null,
      galleryImageFiles: orderedFiles.slice(1),
      smartGroup
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

  // One entry per file to upload; each can be run again on its own if it fails.
  function buildProductImageUploadTasks(product, draft, productName) {
    const tasks = [];
    const cardFiles = (draft.coverImageFiles || []).filter(isSelectedFile);
    const galleryFiles = [draft.mainImageFile, ...(draft.galleryImageFiles || [])].filter(isSelectedFile);

    // Cover first, hover second - each straight to storage, then onto the row.
    cardFiles.forEach((file, index) => {
      const slot = CARD_IMAGE_SLOTS[index];

      if (!slot) {
        return;
      }

      tasks.push({
        name: file.name,
        run: async () => {
          const path = await uploadProductMediaFile(product.id, slot, file);
          await saveProductMedia(product.id, { [slot]: { path } });
        }
      });
    });

    galleryFiles.forEach((file, index) => {
      const smartImage = findSmartImageMetadata(file, draft.smartGroup);

      tasks.push({
        name: file.name,
        run: () => uploadProductImage(product.id, file, {
          altText: smartImage?.altText || `${productName} gallery image ${index + 1}`,
          sortOrder: index,
          isPrimary: index === 0
        })
      });
    });

    return tasks;
  }

  // Runs tasks one after another and never throws: returns the ones that failed
  // so the admin can retry just those. `onProgress(done, total)` drives the button label.
  async function runProductImageUploadTasks(tasks, onProgress) {
    const failed = [];

    for (const [index, task] of tasks.entries()) {
      onProgress?.(index + 1, tasks.length);

      try {
        await task.run();
      } catch (error) {
        failed.push({ task, message: error instanceof Error ? error.message : t("upload.failed") });
      }
    }

    return failed;
  }

  function getModalProductId() {
    return document.getElementById("maris-edit-modal")?.dataset.productId || "";
  }

  function getModalProductImages(product) {
    const images = Array.isArray(product?.images) ? product.images : [];

    // The gallery is the product page's set of views, in the order the
    // storefront shows them.
    return images
      .filter((image) => image?.id && image?.imageUrl)
      .map((image, index) => ({
        id: String(image.id),
        imageUrl: image.imageUrl,
        altText: image.altText || `${getProductName(product)} image ${index + 1}`,
        sortOrder: Number(image.sortOrder) || index,
        isPrimary: image.isPrimary === true
      }))
      .sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }

        return left.sortOrder - right.sortOrder;
      });
  }

  function getModalProductMedia(product) {
    const videoUrl = product?.videoUrl || "";

    return {
      coverImageUrl: product?.coverImageUrl || "",
      hoverImageUrl: product?.hoverImageUrl || "",
      videoUrl,
      videoPosterUrl: videoUrl ? product?.videoPosterUrl || "" : "",
      videoPosition: normalizeModalVideoPosition(product?.videoPosition)
    };
  }

  function normalizeModalVideoPosition(value) {
    const position = value === null || value === undefined || value === "" ? NaN : Number(value);

    return Number.isInteger(position) && position >= 0
      ? Math.min(position, VIDEO_POSITION_LAST)
      : VIDEO_POSITION_AFTER_COVER;
  }

  // ── MEDIA UPLOADS ───────────────────────────────────────────────────────────
  // Card images and the turntable go straight from the browser to Supabase
  // Storage on a signed URL, then a PATCH points the product at them. Nothing
  // large passes through a Next.js route, so Vercel's ~4.5 MB body cap never
  // applies.

  function uploadToSignedUrl(signedUrl, file, onProgress) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      const body = new FormData();

      body.append("cacheControl", "3600");
      body.append("", file);
      request.open("PUT", signedUrl);
      request.setRequestHeader("x-upsert", "true");
      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress?.(event.loaded / event.total);
        }
      });
      request.addEventListener("load", () => {
        if (request.status >= 200 && request.status < 300) {
          onProgress?.(1);
          resolve();
          return;
        }

        let message = "";

        try {
          message = JSON.parse(request.responseText)?.message || "";
        } catch {
          message = "";
        }

        reject(new Error(message || t("upload.failedStatus", { status: request.status })));
      });
      request.addEventListener("error", () => reject(new Error(t("upload.failedConnection"))));
      request.send(body);
    });
  }

  // Asks for a signed URL, uploads, and returns the storage path to commit.
  async function uploadProductMediaFile(productId, kind, file, onProgress) {
    const route = kind === "video" || kind === "poster" ? "video-upload-url" : "card-image-upload-url";
    const upload = await fetchAdminApi(`/products/${encodeURIComponent(productId)}/${route}`, {
      method: "POST",
      body: JSON.stringify({ kind, contentType: file.type, size: file.size })
    });

    await uploadToSignedUrl(upload.signedUrl, file, onProgress);
    return upload.path;
  }

  function saveProductMedia(productId, changes) {
    return fetchAdminApi(`/products/${encodeURIComponent(productId)}/media`, {
      method: "PATCH",
      body: JSON.stringify(changes)
    });
  }

  function validateCardImageFile(file, asPoster = false) {
    if (!CARD_IMAGE_TYPES.includes(file.type)) {
      return t(asPoster ? "upload.posterType" : "upload.cardType");
    }

    if (file.size > CARD_IMAGE_MAX_BYTES) {
      return t(asPoster ? "upload.posterSize" : "upload.cardSize", { mb: CARD_IMAGE_MAX_BYTES / MEGABYTE });
    }

    return "";
  }

  function validateGalleryImageFile(file) {
    if (!GALLERY_IMAGE_TYPES.includes(file.type)) {
      return t("upload.galleryType");
    }

    if (file.size > GALLERY_IMAGE_MAX_BYTES) {
      return t("upload.gallerySize", { mb: GALLERY_IMAGE_MAX_BYTES / MEGABYTE, actual: (file.size / MEGABYTE).toFixed(1) });
    }

    return "";
  }

  // First problem across a list of files, naming the file, or "".
  function findImageFileProblem(files, validate) {
    for (const file of files) {
      const problem = validate(file);

      if (problem) {
        return `${file.name}: ${problem}`;
      }
    }

    return "";
  }

  function waitForMediaEvent(media, eventName, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(t("video.tookTooLong")));
      }, timeoutMs);
      const handleEvent = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error(t("video.browserCannotRead")));
      };
      function cleanup() {
        clearTimeout(timer);
        media.removeEventListener(eventName, handleEvent);
        media.removeEventListener("error", handleError);
      }

      media.addEventListener(eventName, handleEvent, { once: true });
      media.addEventListener("error", handleError, { once: true });
    });
  }

  // Reads the picked file's size and length and draws its first frame to a
  // JPEG to use as the poster.
  async function readTurntableVideo(file) {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;

    try {
      await waitForMediaEvent(video, "loadeddata");

      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;

      if (!width || !height) {
        throw new Error(t("video.noPicture"));
      }

      if (duration > 0.2) {
        video.currentTime = 0.05;
        await waitForMediaEvent(video, "seeked");
      }

      const scale = Math.min(1, POSTER_MAX_EDGE / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const posterBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));

      return {
        width,
        height,
        duration,
        poster: posterBlob ? new File([posterBlob], "turntable-poster.jpg", { type: "image/jpeg" }) : null
      };
    } finally {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    }
  }

  // Checks run before anything uploads. Only a wrong type or an oversized file
  // stops it; a non-square video is uploaded with a warning.
  async function inspectTurntableFile(file) {
    if (file.type !== "video/mp4") {
      return { error: t("video.mustBeMp4") };
    }

    if (file.size > VIDEO_MAX_BYTES) {
      return { error: t("video.tooLarge", { mb: VIDEO_MAX_BYTES / MEGABYTE, actual: (file.size / MEGABYTE).toFixed(1) }) };
    }

    try {
      const details = await readTurntableVideo(file);
      const ratio = details.width / details.height;
      const warnings = [];

      if (Math.abs(ratio - 1) > SQUARE_TOLERANCE) {
        warnings.push(t("video.notSquare", { width: details.width, height: details.height }));
      }

      return { ...details, warnings };
    } catch (error) {
      return { error: error instanceof Error ? error.message : t("video.unreadable") };
    }
  }

  function revokeModalVideoDraftUrls() {
    if (modalVideoDraft?.posterPreviewUrl) {
      URL.revokeObjectURL(modalVideoDraft.posterPreviewUrl);
    }
  }

  function setModalVideoProgress(fraction, label = "") {
    const progress = document.getElementById("modal-video-progress");
    const text = document.getElementById("modal-video-progress-text");

    if (!progress || !text) return;

    progress.hidden = fraction === null;
    text.hidden = fraction === null;

    if (fraction !== null) {
      progress.value = Math.round(fraction * 100);
      text.textContent = label || `${Math.round(fraction * 100)}%`;
    }
  }

  // ── CARD IMAGES (COVER & HOVER) ─────────────────────────────────────────────

  function renderModalCardImages() {
    const grid = document.getElementById("modal-card-grid");
    const preview = document.getElementById("modal-card-preview");
    if (!grid || !preview) return;

    grid.innerHTML = CARD_IMAGE_SLOTS.map((slot) => {
      const url = slot === "cover" ? modalMedia.coverImageUrl : modalMedia.hoverImageUrl;
      const label = slot === "cover" ? t("card.cover") : t("card.hover");
      const slotName = t(`card.slot.${slot}`);
      const note = slot === "cover" ? t("card.coverNote") : t("card.hoverNote");
      const image = url
        ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(slotName)}">`
        : `<div class="modal-image-placeholder">${escapeHtml(slot === "cover" && modalGalleryImages.length ? t("card.notSetUsesGallery") : t("card.notSet"))}</div>`;

      return `
        <div class="modal-card-slot" data-card-slot="${slot}">
          <span class="modal-cover-label">${label}</span>
          ${image}
          <p class="modal-slot-note">${note}</p>
          <div class="modal-chip-row">
            <label class="modal-chip-btn">
              ${escapeHtml(url ? t("common.replace") : t("common.upload"))}
              <input class="modal-hidden-input" type="file" accept="${CARD_IMAGE_TYPES.join(",")}" data-card-upload="${slot}">
            </label>
            <button class="modal-chip-btn" type="button" data-card-pick="${slot}" ${modalGalleryImages.length ? "" : "disabled"}>${escapeHtml(t("card.chooseFromGallery"))}</button>
            ${url ? `<button class="modal-chip-btn is-danger" type="button" data-card-remove="${slot}">${escapeHtml(t("common.remove"))}</button>` : ""}
          </div>
          <div class="modal-card-picker" data-card-picker="${slot}" hidden>
            ${modalGalleryImages.map((galleryImage) => `
              <button type="button" data-card-choose="${slot}" data-image-id="${escapeHtml(galleryImage.id)}" aria-label="${escapeHtml(t("card.useGalleryImageAs", { slot: slotName }))}">
                <img src="${escapeHtml(galleryImage.imageUrl)}" alt="">
              </button>
            `).join("")}
          </div>
        </div>
      `;
    }).join("");

    const cardCover = modalMedia.coverImageUrl || modalGalleryImages[0]?.imageUrl || "";
    const cardHover = modalMedia.hoverImageUrl && modalMedia.hoverImageUrl !== cardCover ? modalMedia.hoverImageUrl : "";

    preview.innerHTML = cardCover
      ? `
        <span class="modal-card-preview-frame${cardHover ? " has-hover" : ""}">
          <img class="is-cover" src="${escapeHtml(cardCover)}" alt="${escapeHtml(t("card.previewAlt"))}">
          ${cardHover ? `<img class="is-hover" src="${escapeHtml(cardHover)}" alt="">` : ""}
        </span>
        <span class="modal-card-preview-code">${escapeHtml(document.getElementById("maris-edit-modal")?.dataset.productCode || "")}</span>
        <span class="modal-slot-note">${escapeHtml(cardHover ? t("card.previewHover") : t("card.previewNoHover"))}</span>
      `
      : `<span class="modal-slot-note">${escapeHtml(t("card.previewEmpty"))}</span>`;
  }

  async function commitModalMedia(changes, pendingText, doneText) {
    const productId = getModalProductId();
    if (!productId) return false;

    setModalMessage(pendingText, false);

    try {
      const result = await saveProductMedia(productId, changes);
      modalMedia = getModalProductMedia(result.media);
      await refreshChangedProduct(productId, result.product);
      setModalMessage(doneText);
      return true;
    } catch (error) {
      await refreshChangedProduct(productId).catch(() => {});
      setModalMessage(error instanceof Error ? error.message : t("media.saveFailed"), true);
      return false;
    }
  }

  async function uploadModalCardImage(slot, file) {
    const productId = getModalProductId();
    const problem = validateCardImageFile(file);
    const label = t(`card.slot.${slot}`);

    if (!productId) return;

    if (problem) {
      setModalMessage(problem, true);
      return;
    }

    try {
      const path = await uploadProductMediaFile(productId, slot, file, (fraction) => {
        setModalMessage(t("card.uploading", { slot: label, percent: Math.round(fraction * 100) }), false);
      });
      await commitModalMedia({ [slot]: { path } }, t("card.saving", { slot: label }), t("card.updated", { slot: label }));
    } catch (error) {
      setModalMessage(error instanceof Error ? error.message : t("card.uploadFailed", { slot: label }), true);
    }
  }

  function handleModalCardClick(event) {
    const pickBtn = event.target.closest("[data-card-pick]");
    if (pickBtn) {
      const picker = document.querySelector(`[data-card-picker="${pickBtn.dataset.cardPick}"]`);
      if (picker) picker.hidden = !picker.hidden;
      return;
    }

    const chooseBtn = event.target.closest("[data-card-choose]");
    if (chooseBtn) {
      const slot = chooseBtn.dataset.cardChoose;
      commitModalMedia(
        { [slot]: { imageId: chooseBtn.dataset.imageId } },
        t("card.usingGallery", { slot: t(`card.slot.${slot}`) }),
        t("card.updated", { slot: t(`card.slot.${slot}`) })
      );
      return;
    }

    const removeBtn = event.target.closest("[data-card-remove]");
    if (removeBtn) {
      const slot = removeBtn.dataset.cardRemove;

      if (confirm(t("card.confirmRemove", { slot: t(`card.slot.${slot}`) }))) {
        commitModalMedia({ [slot]: null }, t("card.removing", { slot: t(`card.slot.${slot}`) }), t("card.removed", { slot: t(`card.slot.${slot}`) }));
      }
    }
  }

  function handleModalCardChange(event) {
    const input = event.target.closest("[data-card-upload]");
    const file = input?.files?.[0];

    if (file) {
      uploadModalCardImage(input.dataset.cardUpload, file);
    }
  }

  // ── TURNTABLE VIDEO ─────────────────────────────────────────────────────────

  function renderModalVideo() {
    const block = document.getElementById("modal-video-block");
    if (!block) return;

    const draft = modalVideoDraft;
    const current = modalMedia.videoUrl
      ? `
        <div class="modal-video-current">
          <video src="${escapeHtml(modalMedia.videoUrl)}" ${modalMedia.videoPosterUrl ? `poster="${escapeHtml(modalMedia.videoPosterUrl)}"` : ""} muted loop playsinline preload="metadata" controls></video>
          <div class="modal-chip-row">
            <label class="modal-chip-btn">
              ${escapeHtml(modalMedia.videoPosterUrl ? t("video.replacePoster") : t("video.uploadPoster"))}
              <input class="modal-hidden-input" type="file" accept="${CARD_IMAGE_TYPES.join(",")}" data-video-poster-upload>
            </label>
            <button class="modal-chip-btn is-danger" type="button" data-video-remove>${escapeHtml(t("video.remove"))}</button>
          </div>
        </div>
      `
      : `<p class="modal-slot-note">${escapeHtml(t("video.none"))}</p>`;
    const pending = draft
      ? `
        <div class="modal-video-draft">
          ${draft.posterPreviewUrl ? `<img src="${draft.posterPreviewUrl}" alt="${escapeHtml(t("video.posterAlt"))}">` : ""}
          <div>
            <p class="modal-slot-note"><strong>${escapeHtml(draft.file.name)}</strong> · ${(draft.file.size / MEGABYTE).toFixed(1)} MB · ${draft.width}×${draft.height}${draft.duration ? ` · ${draft.duration.toFixed(1)} s` : ""}</p>
            ${draft.warnings.map((warning) => `<p class="modal-video-warning">⚠ ${escapeHtml(warning)}</p>`).join("")}
            <label class="modal-chip-btn">
              ${escapeHtml(draft.customPoster ? t("video.changePoster") : t("video.useOwnPoster"))}
              <input class="modal-hidden-input" type="file" accept="${CARD_IMAGE_TYPES.join(",")}" data-video-draft-poster>
            </label>
            <p class="modal-slot-note">${draft.customPoster ? escapeHtml(t("video.posterName", { name: draft.customPoster.name })) : escapeHtml(t("video.posterAuto"))}</p>
            <div class="modal-chip-row">
              <button class="admin-primary" type="button" data-video-upload ${modalVideoUploading ? "disabled" : ""}>${escapeHtml(modalMedia.videoUrl ? t("video.uploadReplace") : t("video.upload"))}</button>
              <button class="admin-secondary" type="button" data-video-cancel ${modalVideoUploading ? "disabled" : ""}>${escapeHtml(t("common.cancel"))}</button>
            </div>
          </div>
        </div>
      `
      : "";

    block.innerHTML = `
      ${current}
      <label class="modal-label">
        ${escapeHtml(t(modalMedia.videoUrl ? "video.fileLabelReplace" : "video.fileLabelAdd", { mb: VIDEO_MAX_BYTES / MEGABYTE }))}
        <input class="modal-file-input" type="file" accept="video/mp4" data-video-file ${modalVideoUploading ? "disabled" : ""}>
      </label>
      ${pending}
      <progress id="modal-video-progress" max="100" value="0" hidden></progress>
      <p id="modal-video-progress-text" class="modal-slot-note" hidden></p>
      ${renderModalVideoSlots()}
    `;
  }

  // The photos of one metal's set in the order the product page shows them: the
  // views sorted as groupProductImagesByMetal does, with the card cover leading
  // its own set when that set is the first metal. The video's slot counts along this list, and every
  // other metal follows the same slot.
  function getModalVideoSlotPhotos() {
    const tagged = modalGalleryImages.map((image) => ({ ...image, ...readImageTag(image.altText) }));
    const shared = tagged.filter((image) => !image.metal);
    const viewOrder = (image) => {
      const index = IMAGE_VIEW_LABELS.findIndex(([label]) => label === image.view);
      return index >= 0 ? index : image.metal ? 0.5 : IMAGE_VIEW_LABELS.length;
    };
    const sets = IMAGE_METAL_LABELS
      .map((metal) => ({
        metal,
        images: [...tagged.filter((image) => image.metal === metal), ...shared]
          .sort((left, right) => viewOrder(left) - viewOrder(right) || left.sortOrder - right.sortOrder)
      }))
      .filter((set) => set.images.length > shared.length);
    const coverUrl = modalMedia.coverImageUrl;
    const coverImage = tagged.find((image) => coverUrl && image.imageUrl === coverUrl);
    // The product page always opens on White Gold, then Yellow, then Rose.
    const lead = sets.length < 2
      ? { metal: "", images: tagged }
      : sets[0];
    const coverLeads = coverUrl && (!coverImage?.metal || coverImage.metal === lead.metal);
    const photos = lead.images.map((image) => image.imageUrl);

    if (!coverLeads) return photos;

    return [coverUrl, ...photos.filter((url) => url !== coverUrl)];
  }

  // Every slide of the lead set with the video dropped into its slot. Click a
  // slide, drag the video onto one, or use Earlier / Later to move it.
  function renderModalVideoSlots() {
    if (!modalMedia.videoUrl) {
      return "";
    }

    const photos = getModalVideoSlotPhotos();
    const videoIndex = Math.min(modalMedia.videoPosition, photos.length);
    const slots = [...photos];
    slots.splice(videoIndex, 0, "");
    const lastIndex = slots.length - 1;
    const tiles = slots
      .map((url, index) => {
        if (index === videoIndex) {
          return `
            <div class="modal-slot-tile is-video" draggable="true" data-video-tile title="${escapeHtml(t("videoSlot.dragTitle"))}">
              ${modalMedia.videoPosterUrl ? `<img src="${escapeHtml(modalMedia.videoPosterUrl)}" alt="">` : ""}
              <span class="modal-slot-badge">${escapeHtml(t("videoSlot.badge", { n: index + 1 }))}</span>
            </div>
          `;
        }

        return `
          <button class="modal-slot-tile" type="button" data-video-slot="${index}" title="${escapeHtml(t("videoSlot.moveHere"))}">
            <img src="${escapeHtml(url)}" alt="">
            <span class="modal-slot-badge">${index + 1}</span>
          </button>
        `;
      })
      .join("");

    return `
      <div class="modal-video-position" id="modal-video-slots">
        <p class="modal-cover-label">${escapeHtml(t("videoSlot.position", { n: videoIndex + 1, total: slots.length }))}${videoIndex === lastIndex ? escapeHtml(` ${t("videoSlot.last")}`) : ""}</p>
        <div class="modal-slot-strip">${tiles}</div>
        <div class="modal-chip-row">
          <button class="modal-chip-btn" type="button" data-video-nudge="-1" ${videoIndex === 0 ? "disabled" : ""}>&larr; ${escapeHtml(t("videoSlot.earlier"))}</button>
          <button class="modal-chip-btn" type="button" data-video-nudge="1" ${videoIndex === lastIndex ? "disabled" : ""}>${escapeHtml(t("videoSlot.later"))} &rarr;</button>
        </div>
        <p class="modal-slot-note">${escapeHtml(t("videoSlot.note"))}</p>
      </div>
    `;
  }

  // Slide index in the strip -> the number saved. The last slide is saved as
  // "last" so a metal with more photos still ends on the video.
  function saveModalVideoSlot(slotIndex) {
    const slotCount = getModalVideoSlotPhotos().length + 1;
    const videoPosition = slotIndex >= slotCount - 1 ? VIDEO_POSITION_LAST : Math.max(0, slotIndex);

    if (videoPosition === modalMedia.videoPosition) return;

    commitModalMedia({ videoPosition }, t("video.savingPosition"), t("video.positionSaved"));
  }

  async function prepareModalVideo(file) {
    revokeModalVideoDraftUrls();
    modalVideoDraft = null;
    setModalMessage(t("video.checking"), false);

    const inspection = await inspectTurntableFile(file);

    if (inspection.error) {
      renderModalVideo();
      setModalMessage(inspection.error, true);
      return;
    }

    modalVideoDraft = {
      file,
      width: inspection.width,
      height: inspection.height,
      duration: inspection.duration,
      warnings: inspection.warnings,
      autoPoster: inspection.poster,
      customPoster: null,
      posterPreviewUrl: inspection.poster ? URL.createObjectURL(inspection.poster) : ""
    };
    renderModalVideo();
    setModalMessage(inspection.warnings.length ? t("video.checkWarning") : t("video.ready"), false);
  }

  async function uploadModalVideo() {
    const productId = getModalProductId();
    const draft = modalVideoDraft;
    if (!productId || !draft || modalVideoUploading) return;

    const poster = draft.customPoster || draft.autoPoster;
    modalVideoUploading = true;
    renderModalVideo();

    try {
      setModalVideoProgress(0);
      const videoPath = await uploadProductMediaFile(productId, "video", draft.file, (fraction) => {
        setModalVideoProgress(fraction, t("video.uploading", { percent: Math.round(fraction * 100) }));
      });
      let posterPath = "";

      if (poster) {
        setModalVideoProgress(1, t("video.uploadingPoster"));
        posterPath = await uploadProductMediaFile(productId, "poster", poster);
      }

      setModalVideoProgress(1, t("common.saving"));
      revokeModalVideoDraftUrls();
      modalVideoDraft = null;
      modalVideoUploading = false;
      await commitModalMedia(
        {
          video: { path: videoPath },
          poster: posterPath ? { path: posterPath } : null,
          videoPosition: modalMedia.videoPosition
        },
        t("video.savingTurntable"),
        t("video.turntableSaved")
      );
    } catch (error) {
      modalVideoUploading = false;
      renderModalVideo();
      setModalMessage(error instanceof Error ? error.message : t("video.uploadFailed"), true);
    } finally {
      modalVideoUploading = false;
      setModalVideoProgress(null);
    }
  }

  async function uploadModalVideoPoster(file) {
    const productId = getModalProductId();
    const problem = validateCardImageFile(file, true);
    if (!productId) return;

    if (problem) {
      setModalMessage(problem, true);
      return;
    }

    try {
      const path = await uploadProductMediaFile(productId, "poster", file, (fraction) => {
        setModalMessage(t("poster.uploading", { percent: Math.round(fraction * 100) }), false);
      });
      await commitModalMedia({ poster: { path } }, t("poster.saving"), t("poster.updated"));
    } catch (error) {
      setModalMessage(error instanceof Error ? error.message : t("poster.uploadFailed"), true);
    }
  }

  function handleModalVideoDragStart(event) {
    if (!event.target.closest("[data-video-tile]")) return;

    event.dataTransfer?.setData("text/plain", "video");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function handleModalVideoDragOver(event) {
    const slot = event.target.closest("[data-video-slot]");
    if (!slot) return;

    event.preventDefault();
    slot.classList.add("drag-over");
  }

  function handleModalVideoDragLeave(event) {
    event.target.closest("[data-video-slot]")?.classList.remove("drag-over");
  }

  function handleModalVideoDrop(event) {
    const slot = event.target.closest("[data-video-slot]");
    if (!slot) return;

    event.preventDefault();
    slot.classList.remove("drag-over");
    saveModalVideoSlot(Number(slot.dataset.videoSlot));
  }

  function handleModalVideoClick(event) {
    const slotButton = event.target.closest("[data-video-slot]");
    if (slotButton) {
      saveModalVideoSlot(Number(slotButton.dataset.videoSlot));
      return;
    }

    const nudgeButton = event.target.closest("[data-video-nudge]");
    if (nudgeButton) {
      const current = Math.min(modalMedia.videoPosition, getModalVideoSlotPhotos().length);
      saveModalVideoSlot(current + Number(nudgeButton.dataset.videoNudge));
      return;
    }

    if (event.target.closest("[data-video-upload]")) {
      uploadModalVideo();
      return;
    }

    if (event.target.closest("[data-video-cancel]")) {
      revokeModalVideoDraftUrls();
      modalVideoDraft = null;
      renderModalVideo();
      setModalMessage("", false);
      return;
    }

    if (event.target.closest("[data-video-remove]")) {
      if (confirm(t("video.confirmRemove"))) {
        commitModalMedia({ video: null }, t("video.removing"), t("video.removed"));
      }
    }
  }

  function handleModalVideoChange(event) {
    const input = event.target;

    if (input.matches("[data-video-file]") && input.files?.[0]) {
      prepareModalVideo(input.files[0]);
      return;
    }

    if (input.matches("[data-video-draft-poster]") && input.files?.[0] && modalVideoDraft) {
      const problem = validateCardImageFile(input.files[0], true);

      if (problem) {
        setModalMessage(problem, true);
        return;
      }

      revokeModalVideoDraftUrls();
      modalVideoDraft.customPoster = input.files[0];
      modalVideoDraft.posterPreviewUrl = URL.createObjectURL(input.files[0]);
      renderModalVideo();
      return;
    }

    if (input.matches("[data-video-poster-upload]") && input.files?.[0]) {
      uploadModalVideoPoster(input.files[0]);
      return;
    }
  }

  function updateModalGalleryCount() {
    const galleryCountEl = document.getElementById("modal-gallery-count");
    if (!galleryCountEl) return;

    const galleryCount = modalGalleryImages.length;
    galleryCountEl.textContent =
      galleryCount ? tp("gallery.count", galleryCount, { n: galleryCount }) : t("gallery.none");
  }

  function renderModalGalleryImages(images = modalGalleryImages) {
    const grid = document.getElementById("modal-gallery-grid");
    if (!grid) return;

    modalGalleryImages = Array.isArray(images) ? images : [];
    updateModalGalleryCount();

    if (!modalGalleryImages.length) {
      grid.innerHTML = `<p class="modal-gallery-empty">${escapeHtml(t("gallery.noneToManage"))}</p>`;
      return;
    }

    grid.innerHTML = modalGalleryImages
      .map((image, index) => `
        <div class="modal-gallery-item" draggable="true" data-gallery-index="${index}" data-image-id="${escapeHtml(image.id)}">
          <img src="${escapeHtml(image.imageUrl)}" alt="${escapeHtml(image.altText || t("gallery.imageAlt", { n: index + 1 }))}">
          <span class="gallery-badge">${index + 1}</span>
          <div class="gallery-tag">
            <select aria-label="${escapeHtml(t("gallery.metalFor", { n: index + 1 }))}" data-gallery-metal="${escapeHtml(image.id)}">
              ${renderImageTagOptions(IMAGE_METAL_LABELS, readImageTag(image.altText).metal, t("gallery.allMetals"))}
            </select>
            <select aria-label="${escapeHtml(t("gallery.viewFor", { n: index + 1 }))}" data-gallery-view="${escapeHtml(image.id)}">
              ${renderImageTagOptions(IMAGE_VIEW_LABELS.map(([label]) => label), readImageTag(image.altText).view, t("gallery.otherView"))}
            </select>
          </div>
          <button class="modal-gallery-move" type="button" data-gallery-move="-1" aria-label="${escapeHtml(t("gallery.moveEarlier", { n: index + 1 }))}"${index === 0 ? " disabled" : ""}>&larr;</button>
          <button class="modal-gallery-move" type="button" data-gallery-move="1" aria-label="${escapeHtml(t("gallery.moveLater", { n: index + 1 }))}"${index === modalGalleryImages.length - 1 ? " disabled" : ""}>&rarr;</button>
          <button class="modal-gallery-delete" type="button" data-gallery-delete="${escapeHtml(image.id)}" aria-label="${escapeHtml(t("gallery.deleteImage"))}">&times;</button>
        </div>
      `)
      .join("");
  }

  function renderModalProductImages(product) {
    modalGalleryImages = getModalProductImages(product);
    modalMedia = getModalProductMedia(product);
    renderModalGalleryImages(modalGalleryImages);
    renderModalCardImages();
    renderModalVideo();
  }

  // Puts one changed product into the loaded data (or adds it).
  function patchCachedProduct(product) {
    if (!product?.id) {
      return;
    }

    const exists = getCachedProducts().some((item) => item.id === product.id);
    adminCache.products = exists
      ? getCachedProducts().map((item) => (item.id === product.id ? product : item))
      : [product, ...getCachedProducts()];
    rememberProductSkus([product]);
  }

  // After a gallery, card image or video change: patch just that product into
  // the loaded data and redraw only the product list, the stat cards and the
  // open modal - not every data set and every tab. The media routes hand the
  // updated product back; if one did not, it is fetched on its own.
  async function refreshChangedProduct(productId, knownProduct = null) {
    let product = knownProduct;

    if (!product) {
      try {
        product = (await fetchAdminApi(`/products?id=${encodeURIComponent(productId)}`)).product || null;
      } catch {
        product = null;
      }
    }

    if (product) {
      patchCachedProduct(product);
    } else {
      await loadAdminBackendData(["products"]);
      product = getCachedProducts().find((item) => item.id === productId) || null;
    }

    renderStats();
    renderProductTables();

    if (product && getModalProductId() === productId) {
      renderModalProductImages(product);
    }
  }

  async function deleteModalGalleryImage(imageId) {
    const productId = getModalProductId();
    if (!productId || !imageId) return;

    if (!confirm(t("gallery.confirmDelete"))) {
      return;
    }

    setModalMessage(t("gallery.deleting"), false);

    try {
      const result = await fetchAdminApi(`${ADMIN_PRODUCT_IMAGES_PATH}?productId=${encodeURIComponent(productId)}&imageId=${encodeURIComponent(imageId)}`, {
        method: "DELETE"
      });
      await refreshChangedProduct(productId, result.product);
      setModalMessage(t("gallery.deleted"));
    } catch (error) {
      setModalMessage(error instanceof Error ? error.message : t("gallery.deleteFailed"), true);
    }
  }

  async function retagModalGalleryImage(imageId) {
    const productId = getModalProductId();
    const image = modalGalleryImages.find((item) => item.id === imageId);
    const grid = document.getElementById("modal-gallery-grid");
    if (!productId || !image || !grid) return;

    const metal = grid.querySelector(`[data-gallery-metal="${CSS.escape(imageId)}"]`)?.value || "";
    const view = grid.querySelector(`[data-gallery-view="${CSS.escape(imageId)}"]`)?.value || "";
    const productName = document.getElementById("modal-field-name")?.value.trim() || "Product";
    const altText = retagImageAltText(image.altText, metal, view, productName);

    setModalMessage(t("gallery.savingTag"), false);

    try {
      const result = await fetchAdminApi(ADMIN_PRODUCT_IMAGES_PATH, {
        method: "PATCH",
        body: JSON.stringify({ productId, imageId, altText })
      });
      await refreshChangedProduct(productId, result.product);
      setModalMessage(t("gallery.tagged", { metal: metal ? displayImageMetal(metal) : t("gallery.allMetals"), view: view ? displayImageView(view) : t("gallery.otherView") }));
    } catch (error) {
      await refreshChangedProduct(productId).catch(() => {});
      setModalMessage(error instanceof Error ? error.message : t("gallery.tagFailed"), true);
    }
  }

  function handleModalGalleryTagChange(event) {
    const select = event.target.closest("[data-gallery-metal], [data-gallery-view]");
    if (!select) return;

    retagModalGalleryImage(select.dataset.galleryMetal || select.dataset.galleryView);
  }

  async function reorderModalGalleryImages(fromIndex, toIndex) {
    const productId = getModalProductId();
    if (!productId || fromIndex === toIndex) return;

    const nextImages = [...modalGalleryImages];
    const [movedImage] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, movedImage);
    modalGalleryImages = nextImages.map((image, index) => ({
      ...image,
      sortOrder: index,
      isPrimary: index === 0
    }));
    renderModalGalleryImages(modalGalleryImages);
    setModalMessage(t("gallery.savingOrder"), false);

    try {
      const result = await fetchAdminApi(ADMIN_PRODUCT_IMAGES_PATH, {
        method: "PATCH",
        body: JSON.stringify({
          productId,
          imageIds: modalGalleryImages.map((image) => image.id)
        })
      });
      await refreshChangedProduct(productId, result.product);
      setModalMessage(t("gallery.orderUpdated"));
    } catch (error) {
      await refreshChangedProduct(productId).catch(() => {});
      setModalMessage(error instanceof Error ? error.message : t("gallery.orderFailed"), true);
    }
  }

  function handleModalGalleryClick(event) {
    const moveBtn = event.target.closest("[data-gallery-move]");
    if (moveBtn) {
      const index = Number(moveBtn.closest(".modal-gallery-item")?.dataset.galleryIndex);
      const target = index + Number(moveBtn.dataset.galleryMove);

      if (Number.isInteger(index) && target >= 0 && target < modalGalleryImages.length) {
        reorderModalGalleryImages(index, target);
      }
      return;
    }

    const deleteBtn = event.target.closest("[data-gallery-delete]");
    if (!deleteBtn) return;

    deleteModalGalleryImage(deleteBtn.dataset.galleryDelete);
  }

  function handleModalGalleryDragStart(event) {
    const item = event.target.closest(".modal-gallery-item");
    if (!item || event.target.closest("select")) return;

    modalGalleryDragIndex = Number(item.dataset.galleryIndex);
    item.classList.add("is-dragging");
    event.dataTransfer?.setData("text/plain", String(modalGalleryDragIndex));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function handleModalGalleryDragOver(event) {
    const item = event.target.closest(".modal-gallery-item");
    if (!item || modalGalleryDragIndex === null) return;

    event.preventDefault();
    item.classList.add("drag-over");
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleModalGalleryDragLeave(event) {
    const item = event.target.closest(".modal-gallery-item");
    item?.classList.remove("drag-over");
  }

  function handleModalGalleryDrop(event) {
    const item = event.target.closest(".modal-gallery-item");
    if (!item || modalGalleryDragIndex === null) return;

    event.preventDefault();
    document.querySelectorAll(".modal-gallery-item.drag-over").forEach((node) => node.classList.remove("drag-over"));
    const toIndex = Number(item.dataset.galleryIndex);

    if (Number.isInteger(modalGalleryDragIndex) && Number.isInteger(toIndex)) {
      reorderModalGalleryImages(modalGalleryDragIndex, toIndex);
    }
  }

  function handleModalGalleryDragEnd() {
    modalGalleryDragIndex = null;
    document.querySelectorAll(".modal-gallery-item.is-dragging, .modal-gallery-item.drag-over").forEach((node) => {
      node.classList.remove("is-dragging", "drag-over");
    });
  }

  function renderStats() {
    const products = readProducts();
    const totalStock = products.reduce((sum, product) => sum + Number(product.stockQty), 0);
    const totalReserved = products.reduce((sum, product) => sum + Number(product.reservedQty), 0);

    elements.totalProducts.textContent = String(products.length);
    elements.totalStock.textContent = String(totalStock);
    elements.totalReserved.textContent = String(totalReserved);
  }

  function getProductPickerLabel(product) {
    return `${getProductSku(product)} - ${getProductName(product)}`;
  }

  // Fills the searchable product lists ("SKU - Name"). Nothing is pre-selected:
  // the admin has to pick a product on purpose.
  function renderSelects() {
    const options = readProducts()
      .map((product) => `<option value="${escapeHtml(getProductPickerLabel(product))}" label="${escapeHtml(t("products.availableCount", { n: getAvailable(product) }))}"></option>`)
      .join("");

    for (const list of [elements.productDatalist, elements.orderProductDatalist]) {
      if (list) {
        list.innerHTML = options;
      }
    }
  }

  // The product the admin typed or picked: an exact "SKU - Name" or a SKU.
  function resolvePickedProduct(value) {
    const text = String(value || "").trim().toLowerCase();

    if (!text) {
      return null;
    }

    const products = readProducts();

    return products.find((product) => getProductPickerLabel(product).toLowerCase() === text)
      || products.find((product) => getProductSku(product).toLowerCase() === text)
      || null;
  }

  // One table for the catalogue: what an admin scans (SKU, name, price, how
  // many are available, whether images and status are in order) and what they
  // do (Edit, Preview, and a menu for the less common Set Draft and Delete).
  function renderProductsTable() {
    const view = getProductListView();
    renderProductListControls(view);

    if (adminCache.isLoading) {
      elements.productsTable.innerHTML = `<tr><td colspan="8">${escapeHtml(t("products.loading"))}</td></tr>`;
      return;
    }

    if (adminCache.errors.products) {
      elements.productsTable.innerHTML = datasetErrorCell("products", 8);
      return;
    }

    // Roles that cannot delete do not see the item at all; the server refuses them too.
    const canDelete = adminCan("catalogue:delete");
    const rows = view.pageProducts
      .map((product) => {
        const code = getProductSku(product);
        const productId = product.id || "";
        const available = getAvailable(product);
        const status = normalizeProductStatus(product.status);
        const isLive = status === "active";
        const imageCount = getProductImageCount(product);
        const href = getProductPreviewHref(product.slug || code);
        const stockTitle = t("products.stockTitle", { real: Number(product.stockQty) || 0, reserved: Number(product.reservedQty) || 0 });

        return `
          <tr>
            <td class="admin-sku-cell"><strong>${escapeHtml(code)}</strong></td>
            <td>${escapeHtml(getProductName(product))}</td>
            <td>${escapeHtml(getCollectionLabel(product.collection))}</td>
            <td>${escapeHtml(getProductPrice(product))}</td>
            <td title="${escapeHtml(stockTitle)}">${available}</td>
            <td>${imageCount ? imageCount : `<span class="admin-warn" title="${escapeHtml(t("products.noImagesYet"))}">0</span>`}</td>
            <td>${renderProductStatusBadge(status)}</td>
            <td class="admin-actions-cell">
              <div class="admin-row-actions">
                <button type="button" data-catalogue-edit="${escapeHtml(code)}" data-product-id="${escapeHtml(productId)}" data-requires="catalogue:write">${escapeHtml(t("common.edit"))}</button>
                <a class="admin-secondary" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("common.preview"))}</a>
                <details class="admin-row-menu">
                  <summary aria-label="${escapeHtml(t("products.moreActions", { sku: code }))}"><span aria-hidden="true">⋯</span></summary>
                  <div class="admin-row-menu-list">
                    <button type="button" data-toggle-status="${escapeHtml(productId)}" data-current-status="${escapeHtml(status)}" data-requires="catalogue:write">${escapeHtml(isLive ? t("products.setDraft") : t("products.makeLive"))}</button>
                    ${canDelete ? `<button class="admin-danger" type="button" data-catalogue-delete="${escapeHtml(code)}" data-product-id="${escapeHtml(productId)}">${escapeHtml(t("products.deleteEllipsis"))}</button>` : ""}
                  </div>
                </details>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    const emptyMessage = view.query
      ? t("products.noMatch", { query: view.searchLabel })
      : view.statusFilter !== "all"
        ? t("products.noneWithStatus", { status: PRODUCT_STATUS_LABELS[view.statusFilter].toLowerCase() })
        : t("products.noneYet");
    elements.productsTable.innerHTML = rows || `<tr><td colspan="8">${escapeHtml(emptyMessage)}</td></tr>`;
    applyAdminPermissions(elements.productsTable);
  }

  function formatSyncTimestamp(value) {
    if (!value) {
      return t("common.waiting");
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? t("common.waiting") : parsed.toLocaleString(adminLocale);
  }

  // The Dashboard's catalogue card reads the products this page has loaded,
  // not a global that nothing sets.
  function renderCatalogueOverview() {
    const products = getCachedProducts();
    const counts = { active: 0, draft: 0, archived: 0 };
    products.forEach((product) => {
      counts[normalizeProductStatus(product.status)] += 1;
    });

    let state = "ready";
    let statusText = tp("catalogue.loaded", products.length, { n: products.length, draft: counts.draft, archived: counts.archived });

    if (adminCache.isLoading) {
      state = "loading";
      statusText = t("common.loading");
    } else if (adminCache.errors.products) {
      state = "error";
      statusText = t("catalogue.couldNotLoad");
    } else if (!products.length) {
      state = "loading";
      statusText = t("products.noneYetShort");
    }

    if (elements.catalogueStatus) {
      elements.catalogueStatus.textContent = statusText;
      elements.catalogueStatus.dataset.catalogueState = state;
    }

    if (elements.catalogueLiveCount) {
      elements.catalogueLiveCount.textContent = String(counts.active);
    }

    if (elements.catalogueLastLoaded) {
      elements.catalogueLastLoaded.textContent = formatSyncTimestamp(adminCache.productsLoadedAt);
    }
  }

  function getActiveProducts() {
    return readProducts().filter((product) => product.status === "active");
  }

  function rememberProductSkus(products) {
    products.forEach((product) => {
      if (product?.id) {
        productSkuMemory.set(String(product.id), getProductSku(product));
      }
    });
  }

  function getBestSellerDraftIds() {
    return Array.isArray(bestSellerState.draftIds) ? bestSellerState.draftIds : getBestSellerProductIds();
  }

  function isBestSellerDirty() {
    return getBestSellerDraftIds().join("|") !== getBestSellerProductIds().join("|");
  }

  // What a slot holds: the product, its SKU (kept even when the product is no
  // longer live), and whether it can appear on the homepage.
  function describeBestSellerSlot(productId) {
    const product = readProducts().find((item) => item.id === productId);
    const sku = product ? getProductSku(product) : (productSkuMemory.get(String(productId)) || "");
    const isLive = Boolean(product && product.status === "active");
    let reason = "";

    if (!isLive) {
      reason = product
        ? t("bestSeller.hiddenUntilLive", { status: getProductStatusLabel(product.status) })
        : t("bestSeller.deleted");
    }

    return { product, sku, isLive, reason };
  }

  function setBestSellerDraftIds(productIds) {
    bestSellerState.draftIds = productIds.slice(0, BEST_SELLER_SLOT_COUNT);
    renderBestSellerSlots();
    renderBestSellerResults();
  }

  function discardBestSellerDraft() {
    bestSellerState.draftIds = null;
    renderBestSellerSlots();
    renderBestSellerResults();
  }

  function buildBestSellerThumb(product) {
    return product?.primaryImageUrl
      ? `<img src="${escapeHtml(product.primaryImageUrl)}" alt="" loading="lazy">`
      : `<span class="best-seller-admin-image-fallback">${escapeHtml(t("common.noImage"))}</span>`;
  }

  function renderBestSellerSlots() {
    const draftIds = getBestSellerDraftIds();
    const slots = draftIds.map((productId) => describeBestSellerSlot(productId));
    const liveCount = slots.filter((slot) => slot.isLive).length;
    const unavailableCount = slots.length - liveCount;

    if (elements.bestSellerCount) {
      elements.bestSellerCount.textContent = String(liveCount);
    }

    if (elements.bestSellerUnavailableNote) {
      elements.bestSellerUnavailableNote.hidden = unavailableCount === 0;
      elements.bestSellerUnavailableNote.textContent = unavailableCount
        ? `· ${t("bestSeller.unavailableNote", { n: unavailableCount })}`
        : "";
    }

    if (elements.bestSellerRemoveUnavailable) {
      elements.bestSellerRemoveUnavailable.hidden = unavailableCount === 0;
    }

    const isDirty = isBestSellerDirty();

    if (elements.bestSellerDirty) {
      elements.bestSellerDirty.hidden = !isDirty;
    }

    if (elements.bestSellerDiscard) {
      elements.bestSellerDiscard.hidden = !isDirty;
    }

    elements.bestSellerSlots.innerHTML = Array.from({ length: BEST_SELLER_SLOT_COUNT }, (_, index) => {
      const number = String(index + 1).padStart(2, "0");
      const productId = draftIds[index];

      if (!productId) {
        return `
          <li class="best-seller-admin-slot is-empty" data-best-seller-slot="${index}">
            <span class="best-seller-admin-slot-number">${number}</span>
            <span class="best-seller-admin-slot-empty">${escapeHtml(t("bestSeller.emptySlot"))}</span>
          </li>
        `;
      }

      const { product, sku: storedSku, isLive, reason } = slots[index];
      const sku = storedSku || t("bestSeller.unknownProduct");
      const name = isLive ? getProductName(product) : reason;

      return `
        <li class="best-seller-admin-slot${isLive ? "" : " is-unavailable"}" data-best-seller-slot="${index}">
          <span class="best-seller-admin-slot-number">${number}</span>
          ${buildBestSellerThumb(product)}
          <div class="best-seller-admin-slot-body">
            <span>${escapeHtml(sku)}</span>
            <strong>${escapeHtml(name)}</strong>
          </div>
          <div class="best-seller-admin-slot-actions">
            <button type="button" data-best-seller-move="-1" data-index="${index}" aria-label="${escapeHtml(t("bestSeller.moveUp", { sku }))}"${index === 0 ? " disabled" : ""}>&uarr;</button>
            <button type="button" data-best-seller-move="1" data-index="${index}" aria-label="${escapeHtml(t("bestSeller.moveDown", { sku }))}"${index === draftIds.length - 1 ? " disabled" : ""}>&darr;</button>
            <button type="button" data-best-seller-remove="${index}" aria-label="${escapeHtml(t("bestSeller.removeItem", { sku }))}">&times;</button>
          </div>
        </li>
      `;
    }).join("");
  }

  function renderBestSellerCollectionOptions(activeProducts) {
    if (!elements.bestSellerCollection) {
      return;
    }

    const collections = new Map();
    activeProducts.forEach((product) => {
      if (product.collection && !collections.has(product.collection)) {
        collections.set(product.collection, getCollectionLabel(product.collection));
      }
    });

    if (bestSellerState.collection && !collections.has(bestSellerState.collection)) {
      bestSellerState.collection = "";
    }

    elements.bestSellerCollection.innerHTML = `
      <option value="">${escapeHtml(t("common.allCollections"))}</option>
      ${Array.from(collections).map(([key, label]) => {
        const selected = key === bestSellerState.collection ? " selected" : "";
        return `<option value="${escapeHtml(key)}"${selected}>${escapeHtml(label)}</option>`;
      }).join("")}
    `;
  }

  // Only the first page of matches is drawn (each card carries an image); "Show
  // more" draws the next page.
  function renderBestSellerResults() {
    if (!elements.bestSellerResults) {
      return;
    }

    const activeProducts = getActiveProducts();
    const draftIds = getBestSellerDraftIds();
    const query = bestSellerState.searchTerm.trim().toLowerCase();
    const matches = activeProducts.filter((product) => (
      (!bestSellerState.collection || product.collection === bestSellerState.collection)
      && (!query || getProductSearchText(product).includes(query))
    ));
    const visible = matches.slice(0, bestSellerState.visibleCount);
    const truncated = visible.length < matches.length;

    if (elements.bestSellerResultsSummary) {
      const base = matches.length === activeProducts.length
        ? t("bestSeller.liveCount", { count: activeProducts.length })
        : t("bestSeller.liveCountOf", { matches: matches.length, count: activeProducts.length });
      elements.bestSellerResultsSummary.textContent = truncated ? t("bestSeller.showingN", { base, n: visible.length }) : base;
    }

    const cards = visible.map((product) => {
      const slotIndex = draftIds.indexOf(product.id);
      const isSelected = slotIndex !== -1;
      const badge = isSelected ? t("bestSeller.slotN", { n: slotIndex + 1 }) : t("bestSeller.addBadge");

      return `
        <button class="best-seller-picker-card${isSelected ? " is-selected" : ""}" type="button" data-best-seller-pick="${escapeHtml(product.id)}" aria-pressed="${isSelected}">
          ${buildBestSellerThumb(product)}
          <span class="best-seller-picker-badge">${escapeHtml(badge)}</span>
          <span class="best-seller-picker-body">
            <span>${escapeHtml(getProductSku(product))}</span>
            <strong>${escapeHtml(getProductName(product))}</strong>
            <small>${escapeHtml(getProductCollectionName(product) || getCollectionLabel(product.collection))}</small>
          </span>
        </button>
      `;
    }).join("");
    const remaining = matches.length - visible.length;
    const showMore = remaining > 0
      ? `<button class="admin-secondary best-seller-show-more" type="button" data-best-seller-show-more>${escapeHtml(t("bestSeller.showMore", { n: remaining }))}</button>`
      : "";

    elements.bestSellerResults.innerHTML = matches.length
      ? `${cards}${showMore}`
      : `<p class="admin-note">${escapeHtml(t("bestSeller.noMatch"))}</p>`;
  }

  function renderBestSellerSettings() {
    if (!elements.bestSellerSlots) {
      return;
    }

    const bestSellerError = adminCache.errors.products || adminCache.errors.bestSellers;
    const bestSellerErrorName = adminCache.errors.products ? "products" : "bestSellers";

    if (adminCache.isLoading || bestSellerError) {
      const message = adminCache.isLoading
        ? escapeHtml(t("bestSeller.loading"))
        : `${escapeHtml(t("error.couldNotLoadWhy", { label: ADMIN_DATASETS[bestSellerErrorName].label, message: bestSellerError }))} <button type="button" class="admin-secondary" data-retry-dataset="${bestSellerErrorName}">${escapeHtml(t("common.retry"))}</button>`;
      elements.bestSellerSlots.innerHTML = `<li class="admin-note">${message}</li>`;
      if (elements.bestSellerResults) {
        elements.bestSellerResults.innerHTML = `<p class="admin-note">${message}</p>`;
      }
      if (elements.bestSellerCount) {
        elements.bestSellerCount.textContent = "0";
      }
      return;
    }

    renderBestSellerCollectionOptions(getActiveProducts());
    renderBestSellerSlots();
    renderBestSellerResults();
  }

  // ── EDIT MODAL ──────────────────────────────────────────────────────────────

  function buildEditModal() {
    if (document.getElementById("maris-edit-modal")) return;

    const style = document.createElement("style");
    style.textContent = `
      #maris-edit-modal {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(16, 41, 35, 0.55);
        backdrop-filter: blur(4px);
        overflow-y: auto;
        padding: 40px 16px;
      }
      #maris-edit-modal.is-open { display: flex; align-items: flex-start; justify-content: center; }
      #maris-edit-modal-box {
        width: min(100%, 680px);
        background: #fffaf6;
        border: 1px solid rgba(221,164,165,0.38);
        box-shadow: 0 32px 80px rgba(0,73,58,0.18);
        padding: 36px;
        position: relative;
      }
      #maris-edit-modal-box h2 {
        font-size: 32px;
        font-weight: 300;
        color: #00493a;
        margin-bottom: 24px;
        line-height: 1;
      }
      .modal-kicker {
        display: block;
        color: var(--maris-gold-text, #856a22);
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      .modal-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-bottom: 14px;
      }
      .modal-grid.modal-full { grid-template-columns: 1fr; }
      .modal-label {
        display: grid;
        gap: 7px;
        color: #5c6d68;
        font-size: 12px;
        letter-spacing: 0.11em;
        text-transform: uppercase;
      }
      .modal-input, .modal-select {
        min-height: 44px;
        border: 1px solid rgba(0,73,58,0.2);
        background: rgba(255,255,255,0.8);
        color: #102923;
        font: inherit;
        font-size: 14px;
        padding: 0 12px;
        width: 100%;
        outline: none;
      }
      textarea.modal-input {
        padding: 10px 12px;
        line-height: 1.6;
        resize: vertical;
      }
      .modal-input:focus, .modal-select:focus {
        border-color: #00493a;
        box-shadow: 0 0 0 3px rgba(0,73,58,0.1);
      }
      .modal-divider {
        margin: 24px 0 18px;
        border: none;
        border-top: 1px solid rgba(221,164,165,0.34);
      }
      /* ── Main image ── */
      .modal-main-img-wrap { margin-top: 12px; margin-bottom: 20px; }
      .modal-main-img-wrap img,
      .modal-image-placeholder {
        width: 100%;
        max-height: 260px;
        object-fit: contain;
        background: #ececec;
        display: block;
        margin-bottom: 10px;
      }
      .modal-image-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #5c6d68;
        font-size: 12px;
        min-height: 120px;
      }
      .modal-file-input {
        width: 100%;
        font: inherit;
        font-size: 13px;
        color: #5c6d68;
      }
      /* ── Gallery grid ── */
      #modal-gallery-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
        gap: 10px;
        margin: 12px 0 16px;
        min-height: 40px;
      }
      .modal-gallery-item {
        position: relative;
        border: 2px solid transparent;
        cursor: grab;
        user-select: none;
        background: #ececec;
      }
      .modal-gallery-item.is-dragging {
        opacity: 0.45;
        border-color: #00493a;
        cursor: grabbing;
      }
      .modal-gallery-item.drag-over {
        border-color: #b9933a;
      }
      .modal-gallery-item img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        display: block;
      }
      .modal-gallery-item .gallery-badge {
        position: absolute;
        top: 4px;
        left: 4px;
        background: var(--maris-gold-text, #856a22);
        color: #fff;
        font-size: 9px;
        letter-spacing: 0.1em;
        padding: 2px 5px;
        text-transform: uppercase;
      }
      .modal-gallery-item .gallery-tag {
        display: grid;
        gap: 3px;
        padding: 4px;
        background: #fff;
      }
      .modal-gallery-item .gallery-tag select {
        width: 100%;
        min-height: 28px;
        border: 1px solid rgba(0,73,58,0.2);
        background: #fff;
        color: #102923;
        font: inherit;
        font-size: 11px;
        cursor: pointer;
      }
      .modal-gallery-delete {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 22px;
        height: 22px;
        background: rgba(217,74,90,0.9);
        border: none;
        color: #fff;
        font-size: 13px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal-gallery-delete:hover { background: #d94a5a; }
      /* ── Card images (cover & hover) ── */
      .modal-card-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 150px;
        gap: 16px;
        align-items: start;
        margin: 12px 0 8px;
      }
      #modal-card-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      .modal-card-slot img,
      .modal-card-slot .modal-image-placeholder {
        width: 100%;
        aspect-ratio: 1;
        object-fit: contain;
        background: #ececec;
        display: flex;
        margin-bottom: 6px;
        text-align: center;
        padding: 8px;
        box-sizing: border-box;
      }
      .modal-cover-label {
        display: block;
        color: #00493a;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .modal-slot-note {
        color: #5c6d68;
        font-size: 11px;
        line-height: 1.5;
        margin: 0 0 8px;
      }
      .modal-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
        min-height: 4px;
      }
      .modal-chip-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        border: 1px solid rgba(0,73,58,0.24);
        background: #fff;
        color: #00493a;
        font: inherit;
        font-size: 11px;
        padding: 4px 8px;
        cursor: pointer;
      }
      .modal-chip-btn:hover { background: rgba(0,73,58,0.06); }
      .modal-chip-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .modal-chip-btn:focus-within { outline: 2px solid rgba(185,147,58,0.9); outline-offset: 1px; }
      .modal-chip-btn.is-danger { color: #d94a5a; border-color: rgba(217,74,90,0.4); }
      .modal-hidden-input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
      }
      .modal-card-picker {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 4px;
        max-height: 180px;
        overflow-y: auto;
        padding: 4px;
        border: 1px solid rgba(0,73,58,0.14);
      }
      .modal-card-picker[hidden] { display: none; }
      .modal-card-picker button {
        padding: 0;
        border: 1px solid transparent;
        background: #ececec;
        cursor: pointer;
      }
      .modal-card-picker button:hover,
      .modal-card-picker button:focus-visible { border-color: #00493a; }
      .modal-card-picker img {
        display: block;
        width: 100%;
        aspect-ratio: 1;
        object-fit: contain;
      }
      /* A stand-in for the storefront card, so the swap can be checked here. */
      .modal-card-preview {
        display: grid;
        gap: 6px;
      }
      .modal-card-preview-frame {
        position: relative;
        display: block;
        aspect-ratio: 1;
        background: #f5f4f2;
        overflow: hidden;
      }
      .modal-card-preview-frame img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        padding: 10px;
        box-sizing: border-box;
        transition: opacity 0.3s ease;
      }
      .modal-card-preview-frame .is-hover { opacity: 0; }
      .modal-card-preview-frame.has-hover:hover .is-cover { opacity: 0; }
      .modal-card-preview-frame.has-hover:hover .is-hover { opacity: 1; }
      .modal-card-preview-code {
        color: #102923;
        font-size: 12px;
        letter-spacing: 0.06em;
      }
      /* ── Turntable video ── */
      .modal-video-current video,
      .modal-video-draft img {
        display: block;
        width: 180px;
        aspect-ratio: 1;
        object-fit: cover;
        background: #ececec;
        margin-bottom: 8px;
      }
      .modal-video-draft {
        display: flex;
        gap: 14px;
        align-items: flex-start;
        padding: 12px;
        margin: 8px 0;
        background: rgba(0,73,58,0.04);
      }
      .modal-video-warning {
        color: #9a5b00;
        font-size: 12px;
        margin: 0 0 8px;
      }
      #modal-video-progress {
        width: 100%;
        height: 8px;
        margin-top: 8px;
        accent-color: #00493a;
      }
      .modal-video-position {
        margin: 12px 0 0;
        font-size: 13px;
        color: #102923;
      }
      .modal-slot-strip {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
        gap: 8px;
        margin: 8px 0;
      }
      .modal-slot-tile {
        position: relative;
        aspect-ratio: 1;
        padding: 0;
        border: 2px solid transparent;
        background: #ececec;
        cursor: pointer;
      }
      .modal-slot-tile.is-video {
        border-color: #00493a;
        background: #00493a;
        cursor: grab;
      }
      .modal-slot-tile.drag-over { border-color: #b9933a; }
      .modal-slot-tile img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        pointer-events: none;
      }
      .modal-slot-tile.is-video img { opacity: 0.55; }
      .modal-slot-badge {
        position: absolute;
        top: 4px;
        left: 4px;
        background: var(--maris-gold-text, #856a22);
        color: #fff;
        font-size: 9px;
        letter-spacing: 0.1em;
        padding: 2px 5px;
        text-transform: uppercase;
      }
      .modal-slot-tile.is-video .modal-slot-badge { background: #fff; color: #00493a; }
      @media (max-width: 640px) {
        .modal-card-layout { grid-template-columns: 1fr; }
        .modal-card-preview { max-width: 180px; }
        .modal-video-draft { flex-direction: column; }
      }
      .modal-gallery-empty {
        color: #5c6d68;
        font-size: 13px;
        padding: 12px 0;
      }
      .modal-gallery-hint {
        color: var(--maris-gold-text, #856a22);
        font-size: 11px;
        letter-spacing: 0.08em;
        margin-bottom: 10px;
      }
      /* ── Actions ── */
      .modal-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      /* Save / Close stay in view however far the form is scrolled. */
      .modal-footer {
        position: sticky;
        bottom: 0;
        z-index: 3;
        margin: 28px -36px -36px;
        padding: 14px 36px 18px;
        background: #fffaf6;
        border-top: 1px solid rgba(221,164,165,0.38);
      }
      .modal-footer .modal-message { margin: 0 0 10px; }
      .modal-saves-now {
        display: inline-block;
        margin-left: 8px;
        padding: 2px 8px;
        border: 1px solid #00493a;
        color: #00493a;
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        vertical-align: middle;
      }
      .modal-gallery-move {
        position: absolute;
        bottom: 4px;
        width: 26px;
        height: 26px;
        border: 1px solid rgba(0,73,58,0.4);
        background: rgba(255,250,246,0.94);
        color: #00493a;
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
      }
      .modal-gallery-move[data-gallery-move="-1"] { left: 4px; }
      .modal-gallery-move[data-gallery-move="1"] { right: 4px; }
      .modal-gallery-move:disabled { opacity: 0.35; cursor: default; }
      #maris-edit-modal-title:focus { outline: none; }
      .modal-close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        border: 1px solid rgba(0,73,58,0.18);
        background: transparent;
        color: #5c6d68;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
      .modal-message {
        min-height: 20px;
        margin-top: 14px;
        font-size: 13px;
        color: #00493a;
      }
      .modal-message.is-error { color: #d94a5a; }
      .modal-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.4);
        border-top-color: #fff;
        border-radius: 50%;
        animation: modal-spin 0.7s linear infinite;
        margin-right: 6px;
        vertical-align: middle;
      }
      @keyframes modal-spin { to { transform: rotate(360deg); } }
      @media (max-width: 520px) {
        #maris-edit-modal-box { padding: 24px 18px; }
        .modal-grid { grid-template-columns: 1fr; }
        #modal-gallery-grid { grid-template-columns: repeat(3, 1fr); }
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "maris-edit-modal";
    modal.lang = window.MARIS_ADMIN_I18N?.lang || "en";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "maris-edit-modal-title");
    modal.innerHTML = `
      <div id="maris-edit-modal-box">
        <button class="modal-close-btn" id="maris-edit-modal-close" aria-label="${escapeHtml(t("common.close"))}">&#x2715;</button>
        <span class="modal-kicker">${escapeHtml(t("modal.editing"))}</span>
        <h2 id="maris-edit-modal-title" tabindex="-1">${escapeHtml(t("modal.title"))}</h2>

        <div class="modal-grid">
          <label class="modal-label">
            ${escapeHtml(t("modal.skuCode"))}
            <input class="modal-input" id="modal-field-sku" type="text">
          </label>
          <label class="modal-label">
            ${escapeHtml(t("modal.collectionRingType"))}
            <select class="modal-select" id="modal-field-collection">
              <option value="engagement-ring">${escapeHtml(t("collection.engagement-ring"))}</option>
              <option value="wedding-bands">${escapeHtml(t("collection.wedding-bands"))}</option>
              <option value="mens-wedding-bands">${escapeHtml(t("collection.mens-wedding-bands"))}</option>
              <option value="rings">${escapeHtml(t("collection.rings"))}</option>
              <option value="wedding-set">${escapeHtml(t("collection.wedding-set"))}</option>
              <option value="earrings">${escapeHtml(t("collection.earrings"))}</option>
              <option value="bracelets">${escapeHtml(t("collection.bracelets"))}</option>
              <option value="necklaces-pendants">${escapeHtml(t("collection.necklaces-pendants"))}</option>
            </select>
          </label>
        </div>

        <div class="modal-grid">
          <label class="modal-label">
            ${escapeHtml(t("form.productName"))}
            <input class="modal-input" id="modal-field-name" type="text" placeholder="${escapeHtml(t("modal.productNamePlaceholder"))}">
          </label>
          <label class="modal-label">
            ${escapeHtml(t("form.price"))}
            <input class="modal-input" id="modal-field-price" type="text" placeholder="${escapeHtml(t("product.priceOnRequest"))}">
          </label>
        </div>

        <div class="modal-grid modal-full">
          <label class="modal-label">
            ${escapeHtml(t("form.collectionName"))}
            <input class="modal-input" id="modal-field-collection-name" type="text" placeholder="The One Aura Collection">
          </label>
        </div>

        <div class="modal-grid">
          <label class="modal-label">
            ${escapeHtml(t("form.status"))}
            <select class="modal-select" id="modal-field-status">
              <option value="active">${escapeHtml(t("modal.statusLive"))}</option>
              <option value="draft">${escapeHtml(t("modal.statusDraft"))}</option>
              <option value="archived">${escapeHtml(t("status.product.archived"))}</option>
            </select>
          </label>
          <label class="modal-label">
            ${escapeHtml(t("form.realStock"))}
            <input class="modal-input" id="modal-field-stock" type="number" min="0">
          </label>
        </div>

        <p class="modal-gallery-hint">${escapeHtml(t("modal.readyToShipHint"))}</p>
        <div class="modal-grid">
          <label class="modal-label">
            ${escapeHtml(t("modal.priceBeforeDiscount"))}
            <input class="modal-input" id="modal-field-compare-price" type="text" placeholder="${escapeHtml(t("modal.priceBeforeDiscountPlaceholder"))}">
          </label>
          <label class="modal-label">
            ${escapeHtml(t("modal.readyToShip"))}
            <select class="modal-select" id="modal-field-ready-to-ship">
              <option value="no">${escapeHtml(t("common.no"))}</option>
              <option value="yes">${escapeHtml(t("modal.readyToShipYes"))}</option>
            </select>
          </label>
        </div>

        <p class="modal-gallery-hint">${escapeHtml(t("modal.specsHint"))}</p>
        <div class="modal-grid">
          ${PRODUCT_SPEC_FIELDS.map(({ modalId, label, placeholder }) => `
          <label class="modal-label">
            ${label}
            <input class="modal-input" id="${modalId}" type="text" placeholder="${placeholder}">
          </label>`).join("")}
        </div>
        <div class="modal-grid modal-full">
          <label class="modal-label">
            ${escapeHtml(t("form.gemReport"))}
            <input class="modal-file-input" id="modal-field-gem-report" type="file" accept="${GEM_REPORT_FILE_ACCEPT}" aria-describedby="modal-gem-report-preview">
          </label>
          <div class="admin-gem-report" id="modal-gem-report-preview" aria-live="polite"></div>
        </div>

        <div class="modal-grid modal-full">
          <label class="modal-label">
            ${escapeHtml(t("form.description"))}
            <textarea class="modal-input" id="modal-field-description" rows="4" placeholder="${escapeHtml(t("form.descriptionPlaceholder"))}"></textarea>
          </label>
        </div>

        <hr class="modal-divider">
        <span class="modal-kicker">${escapeHtml(t("modal.step1"))}<span class="modal-saves-now">${escapeHtml(t("modal.savesImmediately"))}</span></span>
        <p class="modal-gallery-hint" style="margin-top:6px">${escapeHtml(t("modal.step1Hint"))}</p>
        <div class="modal-card-layout">
          <div id="modal-card-grid"></div>
          <div id="modal-card-preview" class="modal-card-preview" aria-label="${escapeHtml(t("modal.cardPreviewLabel"))}"></div>
        </div>

        <hr class="modal-divider">
        <span class="modal-kicker">${escapeHtml(t("modal.step2"))}<span class="modal-saves-now">${escapeHtml(t("modal.savesImmediately"))}</span></span>
        <p class="modal-gallery-hint" style="margin-top:6px">${escapeHtml(t("modal.step2Hint"))}</p>
        <div id="modal-video-block"></div>

        <hr class="modal-divider">
        <span class="modal-kicker">${escapeHtml(t("modal.step3"))}<span class="modal-saves-now">${escapeHtml(t("modal.step3Saves"))}</span></span>
        <p id="modal-gallery-count" class="modal-gallery-count">${escapeHtml(t("gallery.none"))}</p>
        <p class="modal-gallery-hint" style="margin-top:6px">${escapeHtml(t("modal.step3Hint"))}</p>
        <div id="modal-gallery-grid"></div>
        <label class="modal-label" style="margin-top:4px">
          ${escapeHtml(t("modal.addGallery"))}
          <input class="modal-file-input" id="modal-field-gallery" type="file" accept="${GALLERY_IMAGE_TYPES.join(",")}" multiple aria-describedby="modal-gallery-file-hint">
          <span class="admin-file-hint" id="modal-gallery-file-hint">${escapeHtml(GALLERY_IMAGE_HINT)}</span>
        </label>
        <p class="modal-gallery-hint" style="margin-top:6px">${escapeHtml(t("modal.tagHint"))}</p>
        <div class="modal-grid">
          <label class="modal-label">
            ${escapeHtml(t("modal.metal"))}
            <select class="modal-select" id="modal-field-image-metal">
              <option value="">${escapeHtml(t("modal.autoFromFileName"))}</option>
              <option value="White Gold">${escapeHtml(t("metal.WG"))}</option>
              <option value="Rose Gold">${escapeHtml(t("metal.RG"))}</option>
              <option value="Yellow Gold">${escapeHtml(t("metal.YG"))}</option>
            </select>
          </label>
          <label class="modal-label">
            ${escapeHtml(t("modal.view"))}
            <select class="modal-select" id="modal-field-image-view">
              <option value="">${escapeHtml(t("modal.autoFromFileName"))}</option>
              <option value="Hero view">${escapeHtml(t("imageView.heroOption"))}</option>
              <option value="Top view">${escapeHtml(t("imageView.top"))}</option>
              <option value="Front view">${escapeHtml(t("imageView.front"))}</option>
              <option value="Side view">${escapeHtml(t("imageView.side"))}</option>
              <option value="Back view">${escapeHtml(t("imageView.back"))}</option>
            </select>
          </label>
        </div>

        <div class="modal-footer">
          <p class="modal-message" id="modal-message" role="status" aria-live="polite"></p>
          <div class="modal-actions">
            <button class="admin-primary" id="modal-save-btn" type="button" data-requires="catalogue:write">${escapeHtml(t("modal.saveText"))}</button>
            <button class="admin-secondary" id="maris-edit-modal-cancel" type="button">${escapeHtml(t("common.close"))}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("maris-edit-modal-close").addEventListener("click", () => closeEditModal());
    document.getElementById("maris-edit-modal-cancel").addEventListener("click", () => closeEditModal());
    modal.addEventListener("click", (e) => { if (e.target === modal) closeEditModal(); });
    document.addEventListener("keydown", (e) => {
      if (!modal.classList.contains("is-open")) return;

      if (e.key === "Escape") {
        closeEditModal();
        return;
      }

      if (e.key === "Tab") {
        trapModalTab(e, modal);
      }
    });
    document.getElementById("modal-save-btn").addEventListener("click", saveEditModal);
    modalGemReport = createGemReportControl({
      input: document.getElementById("modal-field-gem-report"),
      preview: document.getElementById("modal-gem-report-preview"),
      emptyText: t("gem.emptyModal"),
      removedText: t("gem.removedModal"),
      setSpecField: (key, value) => {
        const field = PRODUCT_SPEC_FIELDS.find((spec) => spec.key === key);
        if (field) document.getElementById(field.modalId).value = value;
      }
    });
    const cardGrid = document.getElementById("modal-card-grid");
    cardGrid.addEventListener("click", handleModalCardClick);
    cardGrid.addEventListener("change", handleModalCardChange);
    const videoBlock = document.getElementById("modal-video-block");
    videoBlock.addEventListener("click", handleModalVideoClick);
    videoBlock.addEventListener("change", handleModalVideoChange);
    videoBlock.addEventListener("dragstart", handleModalVideoDragStart);
    videoBlock.addEventListener("dragover", handleModalVideoDragOver);
    videoBlock.addEventListener("dragleave", handleModalVideoDragLeave);
    videoBlock.addEventListener("drop", handleModalVideoDrop);
    const galleryFileInput = document.getElementById("modal-field-gallery");
    galleryFileInput.addEventListener("change", () => {
      const problem = findImageFileProblem(Array.from(galleryFileInput.files || []), validateGalleryImageFile);

      galleryFileInput.setAttribute("aria-invalid", problem ? "true" : "false");

      if (problem) {
        setModalMessage(problem, true);
      }
    });

    const galleryGrid = document.getElementById("modal-gallery-grid");
    galleryGrid.addEventListener("click", handleModalGalleryClick);
    galleryGrid.addEventListener("change", handleModalGalleryTagChange);
    galleryGrid.addEventListener("dragstart", handleModalGalleryDragStart);
    galleryGrid.addEventListener("dragover", handleModalGalleryDragOver);
    galleryGrid.addEventListener("dragleave", handleModalGalleryDragLeave);
    galleryGrid.addEventListener("drop", handleModalGalleryDrop);
    galleryGrid.addEventListener("dragend", handleModalGalleryDragEnd);
  }

  function normalizeModalProductStatus(value) {
    const status = String(value ?? "").trim().toLowerCase();
    if (status === "active" || status === "ready" || status === "preorder" || status === "sold out") return "active";
    if (status === "archived" || status === "hidden") return "archived";
    return "draft";
  }

  // Text the admin can lose by closing: the fields that wait for Save, plus
  // files picked for upload. Media actions save on their own and are not part of it.
  let modalSnapshot = "";
  let modalOpener = null;

  function captureModalFormState() {
    const modal = document.getElementById("maris-edit-modal");
    if (!modal) return "";

    const values = Array.from(modal.querySelectorAll("[id^='modal-field-']"))
      .map((field) => (field.type === "file"
        ? `${field.id}:${Array.from(field.files || []).map((file) => `${file.name}/${file.size}`).join(",")}`
        : `${field.id}:${field.value}`));

    try {
      values.push(`gem:${JSON.stringify(modalGemReport?.getPayload() ?? null)}`);
    } catch {
      // The gem report control is optional for this comparison.
    }

    return values.join("|");
  }

  function isModalDirty() {
    return captureModalFormState() !== modalSnapshot;
  }

  function trapModalTab(event, modal) {
    const focusable = Array.from(modal.querySelectorAll(
      "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    )).filter((element) => !element.disabled && element.type !== "hidden" && element.offsetParent !== null);

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!modal.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement.id === "maris-edit-modal-title")) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openEditModal(product, opener) {
    buildEditModal();

    const modal = document.getElementById("maris-edit-modal");
    const title = document.getElementById("maris-edit-modal-title");

    // Store product id on modal
    modal.dataset.productId = product.id;
    modal.dataset.productCode = getProductSku(product);
    modal.dataset.productMetadata = JSON.stringify(getProductMetadata(product));

    // Fill fields
    document.getElementById("modal-field-sku").value = getProductSku(product);
    document.getElementById("modal-field-collection").value = product.collection || "engagement-ring";
    document.getElementById("modal-field-name").value = getProductName(product);
    document.getElementById("modal-field-collection-name").value = getProductCollectionName(product);
    document.getElementById("modal-field-price").value =
      product.basePrice != null ? String(product.basePrice) : (product.price || "");
    // Map legacy values so the select is never blank, and remember the opening
    // value so Save only sends `status` when the admin actually changed it.
    const initialStatus = normalizeModalProductStatus(product.status);
    document.getElementById("modal-field-status").value = initialStatus;
    modal.dataset.initialStatus = initialStatus;
    document.getElementById("modal-field-stock").value = String(product.stockQty ?? product.totalStock ?? 0);
    document.getElementById("modal-field-compare-price").value =
      product.compareAtPrice != null ? String(product.compareAtPrice) : "";
    document.getElementById("modal-field-ready-to-ship").value = product.readyToShip ? "yes" : "no";
    document.getElementById("modal-field-description").value = product.description || "";
    PRODUCT_SPEC_FIELDS.forEach(({ key, modalId }) => {
      document.getElementById(modalId).value = product.specs?.[key] || "";
    });
    modalGemReport.reset(product.gemReport || null);

    // Title
    title.textContent = t("modal.titleWithSku", { sku: getProductSku(product) });

    revokeModalVideoDraftUrls();
    modalVideoDraft = null;
    modalVideoUploading = false;
    renderModalProductImages(product);

    // Reset file inputs & message (media inputs are rebuilt by renderModalProductImages)
    document.getElementById("modal-field-gallery").value = "";
    document.getElementById("modal-field-image-metal").value = "";
    document.getElementById("modal-field-image-view").value = "";
    setModalMessage("", false);

    applyAdminPermissions(modal);
    modalOpener = opener || (document.activeElement !== document.body ? document.activeElement : null);
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    modalSnapshot = captureModalFormState();
    document.getElementById("maris-edit-modal-title").focus();
  }

  function closeEditModal(force = false) {
    const modal = document.getElementById("maris-edit-modal");
    if (!modal) return;

    if (force !== true && isModalDirty() && !confirm(t("modal.confirmDiscard"))) {
      return;
    }

    if (modalVideoUploading && !confirm(t("modal.confirmCloseUploading"))) {
      return;
    }

    revokeModalVideoDraftUrls();
    modalVideoDraft = null;
    const productId = modal.dataset.productId;
    modal.classList.remove("is-open");
    document.body.style.overflow = "";

    // Back to the Edit button that opened it (the table may have been redrawn since).
    const returnTo = modalOpener && modalOpener.isConnected
      ? modalOpener
      : document.querySelector(`[data-catalogue-edit][data-product-id="${CSS.escape(productId || "")}"]`);
    modalOpener = null;
    returnTo?.focus();
  }

  function setModalMessage(text, isError = false) {
    const el = document.getElementById("modal-message");
    if (!el) return;
    el.textContent = text;
    el.className = "modal-message" + (isError ? " is-error" : "");
  }

  async function saveEditModal() {
    const modal = document.getElementById("maris-edit-modal");
    const productId = modal?.dataset.productId;
    if (!productId || !ensureAdminCan("catalogue:write")) return;

    const saveBtn = document.getElementById("modal-save-btn");
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="modal-spinner"></span>${escapeHtml(t("common.saving"))}`;
    setModalMessage("", false);

    try {
      // 1. PATCH text fields
      const sku = document.getElementById("modal-field-sku").value.trim().toUpperCase();
      const name = document.getElementById("modal-field-name").value.trim();
      const collectionName = document.getElementById("modal-field-collection-name").value.trim();
      const collection = document.getElementById("modal-field-collection").value;
      const price = document.getElementById("modal-field-price").value.trim() || "Price on request";
      const statusValue = document.getElementById("modal-field-status").value;
      const statusChanged = Boolean(statusValue) && statusValue !== modal.dataset.initialStatus;
      const stockQty = Math.max(0, Number(document.getElementById("modal-field-stock").value) || 0);
      const compareAtPrice = document.getElementById("modal-field-compare-price").value.trim();
      const readyToShip = document.getElementById("modal-field-ready-to-ship").value === "yes";
      const description = document.getElementById("modal-field-description").value.trim();
      const specs = Object.fromEntries(PRODUCT_SPEC_FIELDS.map(({ key, modalId }) => [
        key,
        document.getElementById(modalId).value.trim()
      ]));
      const metadata = buildProductMetadata(
        { metadata: parseModalMetadata(modal.dataset.productMetadata) },
        collectionName
      );

      if (!sku || !name) {
        setModalMessage(t("modal.skuNameRequired"), true);
        return;
      }

      if (getCachedProducts().some((item) => item.id !== productId && getProductSku(item).toLowerCase() === sku.toLowerCase())) {
        setModalMessage(t("modal.skuExists", { sku }), true);
        return;
      }

      const pendingGalleryFiles = Array.from(document.getElementById("modal-field-gallery").files);
      const galleryProblem = findImageFileProblem(pendingGalleryFiles, validateGalleryImageFile);

      if (galleryProblem) {
        setModalMessage(galleryProblem, true);
        return;
      }

      await fetchAdminApi(`/products?id=${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          sku,
          name,
          collectionName,
          collection,
          category: getBroadCategoryLabel(collection),
          price,
          compareAtPrice,
          readyToShip,
          ...(statusChanged ? { status: statusValue } : {}),
          stockQty,
          description,
          specs,
          gemReport: modalGemReport.getPayload(),
          metadata
        })
      });

      // 2. Upload new gallery images (if selected)
      const galleryFiles = Array.from(document.getElementById("modal-field-gallery").files);
      if (galleryFiles.length) {
        const nextSortOrder = modalGalleryImages.reduce(
          (highest, image) => Math.max(highest, image.sortOrder + 1),
          0
        );
        await Promise.all(galleryFiles.map((file, index) =>
          uploadProductImage(productId, file, {
            altText: buildModalImageAltText(name, file, `gallery image ${index + 1}`),
            sortOrder: nextSortOrder + index
          })
        ));
      }

      setModalMessage(t("modal.saved"));
      await loadAdminBackendData();
      loadDatabaseCatalogue();
      renderAll();

      modalSnapshot = captureModalFormState();
      setTimeout(() => closeEditModal(true), 800);

    } catch (error) {
      setModalMessage(error instanceof Error ? error.message : t("modal.saveFailed"), true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = t("modal.saveText");
    }
  }

  // ── TABLE ACTIONS ────────────────────────────────────────────────────────────

  function handleCatalogueTableActions(event) {
    const editBtn = event.target.closest("[data-catalogue-edit]");
    const deleteBtn = event.target.closest("[data-catalogue-delete]");

    if (editBtn || deleteBtn) {
      closeRowMenus();
    }

    if (editBtn) {
      const productId = editBtn.dataset.productId;
      const product = getCachedProducts().find((p) => p.id === productId);
      if (product) {
        openEditModal(product, editBtn);
      } else {
        setMessage(t("products.notFound"), true);
      }
      return;
    }

    if (deleteBtn) {
      const code = deleteBtn.dataset.catalogueDelete;
      const productId = deleteBtn.dataset.productId;
      if (!ensureAdminCan("catalogue:delete")) {
        return;
      }
      if (!productId) {
        setMessage(t("products.idNotFound"), true);
        return;
      }
      const product = getCachedProducts().find((item) => item.id === productId);
      confirmProductDeletion(code, product ? getProductName(product) : "", () => deleteSupabaseProduct(productId, code, deleteBtn));
    }
  }

  // Deleting is permanent, so the owner types the product's SKU first. Spaces and
  // letter case are ignored. The server separately allows only owners and admins.
  function normalizeTypedSku(value) {
    return String(value || "").replace(/\s+/g, "").toLowerCase();
  }

  function confirmProductDeletion(code, name, onConfirm) {
    const dialog = document.querySelector("[data-delete-dialog]");

    if (!dialog || typeof dialog.showModal !== "function") {
      setMessage(t("products.deleteDialogFailed"), true);
      return;
    }

    const input = dialog.querySelector("[data-delete-input]");
    const confirmButton = dialog.querySelector("[data-delete-confirm]");
    const cancelButton = dialog.querySelector("[data-delete-cancel]");

    dialog.querySelectorAll("[data-delete-sku]").forEach((node) => {
      node.textContent = code;
    });
    dialog.querySelector("[data-delete-product]").textContent = name ? `${code} (${name})` : code;
    input.value = "";
    confirmButton.disabled = true;

    const update = () => {
      const expected = normalizeTypedSku(code);
      confirmButton.disabled = !expected || normalizeTypedSku(input.value) !== expected;
    };
    const cleanup = () => {
      input.removeEventListener("input", update);
      confirmButton.removeEventListener("click", accept);
      cancelButton.removeEventListener("click", cancel);
      form.removeEventListener("submit", submit);
      dialog.removeEventListener("close", cleanup);
    };
    const accept = () => {
      update();
      if (confirmButton.disabled) return;
      dialog.close("confirmed");
      onConfirm();
    };
    const cancel = () => dialog.close("cancelled");
    const form = dialog.querySelector("form");
    // Enter in the box confirms only when the SKU matches; it never just closes the dialog.
    const submit = (event) => {
      event.preventDefault();
      accept();
    };

    form.addEventListener("submit", submit);
    input.addEventListener("input", update);
    confirmButton.addEventListener("click", accept);
    cancelButton.addEventListener("click", cancel);
    dialog.addEventListener("close", cleanup);
    dialog.showModal();
    input.focus();
  }

  async function deleteSupabaseProduct(productId, code, button) {
    await withSubmitLock(button, button, t("products.deleting"), async () => {
      try {
        await fetchAdminApi(`/products?id=${encodeURIComponent(productId)}`, { method: "DELETE" });
        await loadAdminBackendData();
        loadDatabaseCatalogue();
        renderAll();
        setMessage(t("products.deleted", { code }));
      } catch (error) {
        setMessage(t("products.deleteFailed", { code, message: error instanceof Error ? error.message : t("common.unknownError") }), true);
      }
    });
  }

  function getDatabaseStatusLabel() {
    if (databaseStatusState.isLoading) {
      return t("system.checking");
    }

    if (databaseStatusState.error) {
      return t("system.checkFailed");
    }

    if (!databaseStatusState.isConfigured) {
      return t("system.needsEnv");
    }

    const tables = Array.isArray(databaseStatusState.tables) ? databaseStatusState.tables : [];
    const hasTableErrors = tables.some((table) => !table.isReachable);

    return hasTableErrors ? t("system.partialAccess") : t("system.connected");
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
        elements.databaseSummary.textContent = t("system.summaryChecking");
      } else if (databaseStatusState.error) {
        elements.databaseSummary.textContent = databaseStatusState.error;
      } else if (!databaseStatusState.isConfigured) {
        elements.databaseSummary.textContent = t("system.summarySetEnv", { names: missingEnv.join(t("common.andJoin")) });
      } else {
        elements.databaseSummary.textContent = t("system.summaryOk");
      }
    }

    if (databaseStatusState.isLoading) {
      elements.databaseTableStatus.innerHTML = `<tr><td colspan="4">${escapeHtml(t("system.tablesChecking"))}</td></tr>`;
      return;
    }

    if (databaseStatusState.error) {
      elements.databaseTableStatus.innerHTML = `<tr><td colspan="4">${escapeHtml(databaseStatusState.error)}</td></tr>`;
      return;
    }

    if (!databaseStatusState.isConfigured) {
      elements.databaseTableStatus.innerHTML = `<tr><td colspan="4">${escapeHtml(t("system.missingEnv", { names: missingEnv.join(", ") }))}</td></tr>`;
      return;
    }

    elements.databaseTableStatus.innerHTML = tables
      .map((table) => `
        <tr>
          <td><strong>${escapeHtml(table.name)}</strong></td>
          <td class="${table.isReachable ? "stock-ok" : "stock-low"}">${escapeHtml(table.isReachable ? t("system.reachable") : t("system.needsAttention"))}</td>
          <td>${table.rowCount === null || table.rowCount === undefined ? "-" : escapeHtml(table.rowCount)}</td>
          <td>${escapeHtml(table.error || t("system.tableReady"))}</td>
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
          ? (payload.error || t("system.statusRequestHttp", { status: response.status }))
          : null
      };
    } catch (error) {
      databaseStatusState = {
        isLoading: false,
        isConfigured: false,
        missingEnv: [],
        tables: [],
        error: error instanceof Error ? error.message : t("system.statusRequestFailed")
      };
    }

    renderDatabaseStatus();
  }

  function formatDatabasePrice(product) {
    if (product.priceAmount === null || product.priceAmount === undefined) {
      return t("product.priceOnRequest");
    }

    const amount = Number(product.priceAmount);
    const formattedAmount = Number.isFinite(amount) ? amount.toLocaleString(adminLocale) : String(product.priceAmount);

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
        elements.databaseProductsSummary.textContent = t("system.productsChecking");
      } else if (databaseCatalogueState.error) {
        elements.databaseProductsSummary.textContent = databaseCatalogueState.error;
      } else if (!databaseCatalogueState.isConfigured) {
        elements.databaseProductsSummary.textContent = t("system.productsSetEnv", { names: missingEnv.join(t("common.andJoin")) });
      } else {
        elements.databaseProductsSummary.textContent = t("system.productsLoaded", { n: products.length });
      }
    }

    if (databaseCatalogueState.isLoading) {
      elements.databaseProductsTable.innerHTML = `<tr><td colspan="8">${escapeHtml(t("system.productsCheckingRow"))}</td></tr>`;
      return;
    }

    if (databaseCatalogueState.error) {
      elements.databaseProductsTable.innerHTML = `<tr><td colspan="8">${escapeHtml(databaseCatalogueState.error)}</td></tr>`;
      return;
    }

    if (!databaseCatalogueState.isConfigured) {
      elements.databaseProductsTable.innerHTML = `<tr><td colspan="8">${escapeHtml(t("system.missingEnv", { names: missingEnv.join(", ") }))}</td></tr>`;
      return;
    }

    const rows = products
      .map((product) => {
        const imageLink = product.primaryImageUrl
          ? `<a class="admin-link-inline" href="${escapeHtml(product.primaryImageUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("system.openImage"))}</a>`
          : "-";

        return `
          <tr>
            <td><strong>${escapeHtml(product.productCode || product.id)}</strong></td>
            <td>
              <strong>${escapeHtml(product.nameEn || product.productCode)}</strong>
              <div>${escapeHtml(product.category || "-")}</div>
            </td>
            <td>${renderProductStatusBadge(product.status)}</td>
            <td>${escapeHtml(formatDatabasePrice(product))}</td>
            <td>${escapeHtml(product.variantCount || 0)}</td>
            <td>${escapeHtml(product.imageCount || 0)}</td>
            <td>${escapeHtml(product.totalStock || 0)}</td>
            <td>${imageLink}</td>
          </tr>
        `;
      })
      .join("");

    elements.databaseProductsTable.innerHTML = rows || `<tr><td colspan="8">${escapeHtml(t("system.productsNone"))}</td></tr>`;
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
          ? (payload.error || t("system.catalogueRequestHttp", { status: response.status }))
          : null
      };
    } catch (error) {
      databaseCatalogueState = {
        isLoading: false,
        isConfigured: false,
        missingEnv: [],
        products: [],
        error: error instanceof Error ? error.message : t("system.catalogueRequestFailed")
      };
    }

    renderDatabaseProducts();
  }

  function renderLogsTable() {
    if (adminCache.isLoading) {
      elements.logsTable.innerHTML = `<tr><td colspan="5">${escapeHtml(t("inventory.loading"))}</td></tr>`;
      return;
    }

    if (adminCache.errors.logs) {
      elements.logsTable.innerHTML = datasetErrorCell("logs", 5);
      return;
    }

    const rows = readLogs()
      .map((log) => {
        const createdAt = log.createdAt ? new Date(log.createdAt).toLocaleString(adminLocale) : "-";
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

    elements.logsTable.innerHTML = rows || `<tr><td colspan="5">${escapeHtml(t("inventory.none"))}</td></tr>`;
  }

  function renderOrdersTable() {
    const products = readProducts();
    const productById = new Map(products.map((product) => [product.id, product]));

    if (adminCache.isLoading) {
      elements.ordersTable.innerHTML = `<tr><td colspan="7">${escapeHtml(t("orders.loading"))}</td></tr>`;
      return;
    }

    if (adminCache.errors.orders) {
      elements.ordersTable.innerHTML = datasetErrorCell("orders", 7);
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
            <td>${escapeHtml(order.customerName || t("orders.guest"))}</td>
            <td>${escapeHtml(product ? getProductSku(product) : (order.productCode || order.productId))}</td>
            <td>${order.qty}</td>
            <td>${renderStatusBadge(formatStatusLabel(ORDER_STATUS_LABELS, orderStatus), orderStatus)}</td>
            <td>${renderStatusBadge(formatStatusLabel(PAYMENT_STATUS_LABELS, order.paymentStatus || order.payment_status || "unpaid"), order.paymentStatus || order.payment_status || "unpaid")}</td>
            <td>
              <div class="admin-row-actions">
                <button type="button" data-order-cancel="${escapeHtml(order.id)}" data-requires="operations:write" ${canCancel ? "" : "disabled"}>${escapeHtml(t("common.cancel"))}</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    elements.ordersTable.innerHTML = rows || `<tr><td colspan="7">${escapeHtml(t("orders.none"))}</td></tr>`;
  }

  function renderCustomRequestSummary() {
    const requests = getCachedCustomRequests();
    const counts = Object.fromEntries(customRequestStatuses.map((status) => [status, 0]));

    requests.forEach((request) => {
      counts[getCustomRequestStatus(request)] += 1;
    });

    elements.customRequestCounts.forEach((element) => {
      element.textContent = String(counts[element.dataset.customRequestCount] || 0);
    });

    elements.customRequestStatusFilters.forEach((button) => {
      const isActive = customRequestListState.status === button.dataset.customRequestStatusFilter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (elements.customRequestStatus) {
      elements.customRequestStatus.value = customRequestListState.status;
    }
  }

  function renderCustomRequestDetail() {
    if (!elements.customRequestDetail) {
      return;
    }

    const request = getCachedCustomRequests().find((item) => item.id === customRequestListState.selectedId);

    if (!request) {
      elements.customRequestDetail.hidden = true;
      elements.customRequestDetail.innerHTML = "";
      return;
    }

    const status = getCustomRequestStatus(request);
    const email = request.customerEmail || request.email || "";
    const phone = request.customerPhone || request.contactNumber || "";
    const phoneHref = String(phone).replace(/[^\d+]/g, "");
    const ringDesign = request.ringDesign || {};
    const history = getCustomRequestHistory(request).slice().reverse();
    const details = [
      [t("request.productRequest"), `${request.productCode || "-"} · ${request.id || "-"}`],
      [t("request.metal"), [request.metalPurity, customRequestMetalLabels[request.metal] || request.metal].filter(Boolean).join(" ") || t("common.notSpecified")],
      [t("request.ringSize"), request.ringSizeLabel || (request.ringSize ? `US ${request.ringSize}` : t("common.notSpecified"))],
      [t("request.style"), ringDesign.style || t("common.notSpecified")],
      [t("request.stoneShape"), ringDesign.stoneShape || t("common.notSpecified")],
      [t("request.setting"), ringDesign.setting || t("common.notSpecified")],
      [t("request.stone"), [request.stoneCarat ? `${request.stoneCarat} ct` : "", request.stoneColor, request.stoneClarity, request.stoneCut].filter(Boolean).join(" ") || t("common.notSpecified")],
      [t("request.origin"), request.origin || t("common.notSpecified")],
      [t("request.engraving"), ringDesign.engravingEnabled ? (ringDesign.engravingText || t("request.engravingRequested")) : t("common.none")]
    ];
    const statusOptions = customRequestStatuses.map((value) => (
      `<option value="${value}" ${value === status ? "selected" : ""}>${escapeHtml(getCustomRequestStatusLabel(value))}</option>`
    )).join("");
    const historyMarkup = history.length > 0
      ? history.map((event) => {
          const fromStatus = getCustomRequestStatusLabel(event.fromStatus);
          const toStatus = getCustomRequestStatusLabel(event.toStatus);
          const action = event.fromStatus === event.toStatus
            ? t("request.followUpNote")
            : t("request.statusChange", { from: fromStatus, to: toStatus });

          return `
            <li>
              <strong>${escapeHtml(action)}</strong>
              <span>${escapeHtml(formatCustomRequestDate(event.at))} · ${escapeHtml(event.actor || t("common.adminActor"))}</span>
              ${event.note ? `<p>${escapeHtml(event.note)}</p>` : ""}
            </li>
          `;
        }).join("")
      : `<li class="is-empty"><p>${escapeHtml(t("request.noFollowUp"))}</p></li>`;

    elements.customRequestDetail.hidden = false;
    elements.customRequestDetail.innerHTML = `
      <div class="custom-request-detail-head">
        <div>
          <p class="admin-kicker">${escapeHtml(t("request.activeRequest"))}</p>
          <h3>${escapeHtml(request.customerName || request.fullName || t("request.clientFallback"))}</h3>
          <p>${escapeHtml(t("request.received", { date: formatCustomRequestDate(request.createdAt) }))}</p>
        </div>
        <button type="button" class="admin-secondary" data-custom-request-close>${escapeHtml(t("request.closeDetail"))}</button>
      </div>

      <div class="custom-request-contact-actions">
        ${email ? `<a href="mailto:${encodeURIComponent(email)}">${escapeHtml(t("request.email", { email }))}</a>` : ""}
        ${phoneHref ? `<a href="tel:${escapeHtml(phoneHref)}">${escapeHtml(t("request.call", { phone }))}</a>` : ""}
      </div>

      <dl class="custom-request-specs">
        ${details.map(([label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `).join("")}
      </dl>

      <div class="custom-request-workflow">
        <form data-custom-request-update data-request-id="${escapeHtml(request.id)}">
          <div>
            <p class="admin-kicker">${escapeHtml(t("request.nextAction"))}</p>
            <h4>${escapeHtml(t("request.updateFollowUp"))}</h4>
          </div>
          <label>
            ${escapeHtml(t("request.workflowStatus"))}
            <select name="status">${statusOptions}</select>
          </label>
          <label class="custom-request-note-field">
            ${escapeHtml(t("request.followUpNoteLabel"))}
            <textarea name="note" maxLength="1000" placeholder="${escapeHtml(t("request.notePlaceholder"))}"></textarea>
          </label>
          <button class="admin-primary" type="submit" data-requires="operations:write">${escapeHtml(t("request.saveUpdate"))}</button>
        </form>

        <div class="custom-request-history">
          <div>
            <p class="admin-kicker">${escapeHtml(t("request.auditTrail"))}</p>
            <h4>${escapeHtml(t("request.followUpHistory"))}</h4>
          </div>
          <ol>${historyMarkup}</ol>
        </div>
      </div>
    `;
    applyAdminPermissions(elements.customRequestDetail);
  }

  function renderCustomRequestsTable() {
    renderAttention();
    renderCustomRequestSummary();

    if (adminCache.isLoading) {
      elements.customRequestsTable.innerHTML = `<tr><td colspan="6">${escapeHtml(t("request.loading"))}</td></tr>`;
      elements.customRequestListSummary.textContent = t("request.loading");
      renderCustomRequestDetail();
      return;
    }

    if (adminCache.errors.customRequests) {
      elements.customRequestsTable.innerHTML = datasetErrorCell("customRequests", 6);
      elements.customRequestListSummary.textContent = t("request.unavailable");
      renderCustomRequestDetail();
      return;
    }

    const filteredRequests = getFilteredCustomRequests();
    const rows = filteredRequests
      .map((request) => {
        const status = getCustomRequestStatus(request);
        const age = getCustomRequestAge(request.createdAt);
        const history = getCustomRequestHistory(request);
        const lastAction = request.tracking?.lastActionAt || request.updatedAt;
        const needsFollowUp = status === "pending" && age.isOverdue;

        return `
          <tr data-custom-request-row="${escapeHtml(request.id)}">
            <td>
              <strong>${escapeHtml(formatCustomRequestDate(request.createdAt))}</strong><br>
              <span class="custom-request-age ${needsFollowUp ? "is-overdue" : ""}">${escapeHtml(needsFollowUp ? t("request.needsFollowUp", { age: age.label }) : age.label)}</span>
            </td>
            <td>
              <strong>${escapeHtml(request.customerName || request.fullName || t("request.clientFallback"))}</strong><br>
              <span>${escapeHtml(request.customerEmail || request.email || "-")}</span><br>
              <span>${escapeHtml(request.customerPhone || request.contactNumber || "-")}</span>
            </td>
            <td>
              <strong>${escapeHtml(request.productCode || "-")}</strong><br>
              <span class="custom-request-id">${escapeHtml(request.id || "-")}</span>
            </td>
            <td>${escapeHtml(buildCustomRequestDesignSummary(request))}</td>
            <td>
              <span class="custom-request-status" data-status="${escapeHtml(status)}">${escapeHtml(getCustomRequestStatusLabel(status))}</span><br>
              <span>${escapeHtml(history.length > 0 ? tp("request.actions", history.length, { n: history.length }) : t("request.noActionYet"))}</span>
              ${lastAction && history.length > 0 ? `<br><span>${escapeHtml(formatCustomRequestDate(lastAction))}</span>` : ""}
            </td>
            <td>
              <div class="admin-row-actions">
                <button type="button" data-custom-request-open="${escapeHtml(request.id)}">${escapeHtml(t("common.open"))}</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    const hasFilters = Boolean(customRequestListState.searchTerm.trim()) || customRequestListState.status !== "all";
    elements.customRequestsTable.innerHTML = rows || `<tr><td colspan="6">${escapeHtml(hasFilters ? t("request.noMatch") : t("request.none"))}</td></tr>`;
    elements.customRequestListSummary.textContent = t("request.showing", { shown: filteredRequests.length, total: getCachedCustomRequests().length });
    renderCustomRequestDetail();
  }

  // ── Inquiries (Contact Us / Request a Quote) ──────────────────────────────
  const INQUIRY_STATUSES = ["new", "read", "replied", "closed"];
  const INQUIRY_STATUS_LABELS = {
    new: t("status.inquiry.new"),
    read: t("status.inquiry.read"),
    replied: t("status.inquiry.replied"),
    closed: t("status.inquiry.closed")
  };
  const inquiryListState = { status: "all", searchTerm: "", selectedId: "" };

  function getCachedInquiries() {
    return Array.isArray(adminCache.inquiries) ? adminCache.inquiries : [];
  }

  function getInquiryStatus(inquiry) {
    return INQUIRY_STATUSES.includes(inquiry?.status) ? inquiry.status : "new";
  }

  function getFilteredInquiries() {
    const searchTerm = inquiryListState.searchTerm.trim().toLowerCase();

    return getCachedInquiries().filter((inquiry) => {
      if (inquiryListState.status !== "all" && getInquiryStatus(inquiry) !== inquiryListState.status) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return [
        inquiry.fullName,
        inquiry.email,
        inquiry.phone,
        inquiry.message,
        inquiry.sourcePage,
        ...Object.values(inquiry.fields || {})
      ].some((value) => String(value || "").toLowerCase().includes(searchTerm));
    });
  }

  function renderInquiryCounts() {
    const all = getCachedInquiries();
    elements.inquiryCounts.forEach((node) => {
      const status = node.dataset.inquiryCount;
      node.textContent = String(all.filter((item) => getInquiryStatus(item) === status).length);
    });
    elements.inquiryStatusFilters.forEach((button) => {
      const isActive = button.dataset.inquiryStatusFilter === inquiryListState.status;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (elements.inquiryStatus) {
      elements.inquiryStatus.value = inquiryListState.status;
    }
  }

  function renderInquiriesTable() {
    renderAttention();

    if (!elements.inquiriesTable) {
      return;
    }

    if (adminCache.isLoading) {
      elements.inquiriesTable.innerHTML = `<tr><td colspan="6">${escapeHtml(t("inquiry.loading"))}</td></tr>`;
      return;
    }

    if (adminCache.errors.inquiries) {
      elements.inquiriesTable.innerHTML = datasetErrorCell("inquiries", 6);
      if (elements.inquiryListSummary) {
        elements.inquiryListSummary.textContent = t("inquiry.unavailable");
      }
      return;
    }

    renderInquiryCounts();

    const filtered = getFilteredInquiries();
    const rows = filtered.map((inquiry) => {
      const status = getInquiryStatus(inquiry);
      const message = inquiry.message || Object.values(inquiry.fields || {})[0] || "-";

      return `
        <tr data-inquiry-row="${escapeHtml(inquiry.id)}">
          <td><strong>${escapeHtml(formatCustomRequestDate(inquiry.createdAt))}</strong></td>
          <td>
            <strong>${escapeHtml(inquiry.fullName || t("request.clientFallback"))}</strong><br>
            <span>${escapeHtml(inquiry.email || "-")}</span><br>
            <span>${escapeHtml(inquiry.phone || "-")}</span>
          </td>
          <td>
            <strong>${escapeHtml(inquiry.kind === "quote" ? t("inquiry.typeQuote") : t("inquiry.typeContact"))}</strong><br>
            <span class="custom-request-id">${escapeHtml(inquiry.sourcePage || "-")}</span>
          </td>
          <td>${escapeHtml(String(message).slice(0, 120))}</td>
          <td><span class="custom-request-status" data-status="${escapeHtml(status)}">${escapeHtml(INQUIRY_STATUS_LABELS[status])}</span></td>
          <td>
            <div class="admin-row-actions">
              <button type="button" data-inquiry-open="${escapeHtml(inquiry.id)}">${escapeHtml(t("common.open"))}</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    const isFiltering = inquiryListState.status !== "all" || Boolean(inquiryListState.searchTerm.trim());
    elements.inquiriesTable.innerHTML = rows
      || `<tr><td colspan="6">${escapeHtml(isFiltering ? t("inquiry.noMatch") : t("inquiry.none"))}</td></tr>`;

    if (elements.inquiryListSummary) {
      elements.inquiryListSummary.textContent = t("inquiry.showing", { shown: filtered.length, total: getCachedInquiries().length });
    }
  }

  function renderInquiryDetail(inquiryId) {
    const detail = elements.inquiryDetail;
    if (!detail) return;

    const inquiry = getCachedInquiries().find((item) => item.id === inquiryId);

    if (!inquiry) {
      inquiryListState.selectedId = "";
      detail.hidden = true;
      detail.innerHTML = "";
      return;
    }

    const entries = [
      [t("inquiry.received"), formatCustomRequestDate(inquiry.createdAt)],
      [t("inquiry.type"), inquiry.kind === "quote" ? t("inquiry.typeQuote") : t("inquiry.typeContactInquiry")],
      [t("inquiry.name"), inquiry.fullName],
      [t("inquiry.email"), inquiry.email],
      [t("inquiry.phone"), inquiry.phone],
      [t("inquiry.page"), inquiry.sourcePage],
      ...Object.entries(inquiry.fields || {})
    ].filter(([, value]) => Boolean(value));
    const currentStatus = getInquiryStatus(inquiry);
    const email = String(inquiry.email || "").trim();

    detail.hidden = false;
    detail.innerHTML = `
      <div class="admin-panel-head">
        <div>
          <p class="admin-kicker">${escapeHtml(t("inquiry.kicker"))}</p>
          <h3>${escapeHtml(inquiry.fullName || t("request.clientFallback"))}</h3>
        </div>
        <button type="button" data-inquiry-close>${escapeHtml(t("common.close"))}</button>
      </div>
      <dl class="custom-request-detail-grid">
        ${entries.map(([label, value]) => `
          <div><dt>${escapeHtml(String(label).replaceAll("_", " "))}</dt><dd>${escapeHtml(String(value))}</dd></div>
        `).join("")}
      </dl>
      ${inquiry.message ? `<p class="admin-note admin-note-wide">${escapeHtml(inquiry.message)}</p>` : ""}
      <div class="admin-row-actions">
        ${INQUIRY_STATUSES.map((status) => `
          <button type="button" data-inquiry-set-status="${escapeHtml(status)}" data-inquiry-id="${escapeHtml(inquiry.id)}" data-requires="operations:write"${status === currentStatus ? " disabled" : ""}>
            ${escapeHtml(t("inquiry.markAs", { status: INQUIRY_STATUS_LABELS[status] }))}
          </button>
        `).join("")}
        ${email ? `<a class="admin-secondary" href="mailto:${escapeHtml(email)}">${escapeHtml(t("inquiry.replyByEmail"))}</a>` : ""}
      </div>
    `;
    applyAdminPermissions(detail);
  }

  function scrollIntoViewGently(element) {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    element?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  // Saves a new status and puts the saved inquiry back into the list.
  async function saveInquiryStatus(inquiryId, status) {
    const payload = await fetchAdminApi(`/api/admin/inquiries?id=${encodeURIComponent(inquiryId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    if (payload.inquiry) {
      adminCache.inquiries = getCachedInquiries().map((item) => (item.id === inquiryId ? payload.inquiry : item));
      renderInquiriesTable();
    }

    return payload.inquiry || null;
  }

  // Opening a New inquiry marks it Read, so the New count and the badge in the
  // menu mean "not looked at yet".
  async function openInquiry(inquiryId) {
    inquiryListState.selectedId = inquiryId;
    renderInquiryDetail(inquiryId);
    scrollIntoViewGently(elements.inquiryDetail);

    const inquiry = getCachedInquiries().find((item) => item.id === inquiryId);

    if (!inquiry || getInquiryStatus(inquiry) !== "new" || !adminCan("operations:write")) {
      return;
    }

    try {
      await saveInquiryStatus(inquiryId, "read");

      if (inquiryListState.selectedId === inquiryId) {
        renderInquiryDetail(inquiryId);
      }
    } catch (error) {
      setMessage(t("inquiry.markReadFailed", { message: error instanceof Error ? error.message : t("common.tryAgain") }), true);
    }
  }

  elements.inquiryStatusFilters.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.inquiryStatusFilter;
      inquiryListState.status = inquiryListState.status === next ? "all" : next;
      renderInquiriesTable();
    });
  });

  elements.inquiryStatus?.addEventListener("change", (event) => {
    inquiryListState.status = String(event.currentTarget.value || "all");
    renderInquiriesTable();
  });

  elements.inquirySearch?.addEventListener("input", debounce((event) => {
    inquiryListState.searchTerm = String(event.target.value || "");
    renderInquiriesTable();
  }, SEARCH_DEBOUNCE_MS));

  elements.inquiriesTable?.addEventListener("click", (event) => {
    const open = event.target.closest("[data-inquiry-open]");
    if (open) openInquiry(open.dataset.inquiryOpen);
  });

  elements.inquiryDetail?.addEventListener("click", async (event) => {
    if (event.target.closest("[data-inquiry-close]")) {
      inquiryListState.selectedId = "";
      elements.inquiryDetail.hidden = true;
      elements.inquiryDetail.innerHTML = "";
      return;
    }

    const setStatus = event.target.closest("[data-inquiry-set-status]");
    if (!setStatus || !ensureAdminCan("operations:write")) return;

    const inquiryId = setStatus.dataset.inquiryId;
    const status = setStatus.dataset.inquirySetStatus;

    await withSubmitLock(setStatus, setStatus, t("common.saving"), async () => {
      try {
        await saveInquiryStatus(inquiryId, status);
        renderInquiryDetail(inquiryId);
        setMessage(t("inquiry.marked", { status: INQUIRY_STATUS_LABELS[status] }));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t("inquiry.updateFailed"), true);
      }
    });
  });

  // ── Needs attention (Dashboard) and the counts on the menu ───────────────
  // Waiting items only count once their data set has loaded; "-" means unknown.
  function renderAttention() {
    const requestsKnown = !adminCache.isLoading && !adminCache.errors.customRequests;
    const inquiriesKnown = !adminCache.isLoading && !adminCache.errors.inquiries;
    const pendingRequests = requestsKnown
      ? getCachedCustomRequests().filter((request) => getCustomRequestStatus(request) === "pending")
      : [];
    const counts = {
      newRequests: requestsKnown ? pendingRequests.length : null,
      overdueRequests: requestsKnown
        ? pendingRequests.filter((request) => getCustomRequestAge(request.createdAt).isOverdue).length
        : null,
      newInquiries: inquiriesKnown
        ? getCachedInquiries().filter((inquiry) => getInquiryStatus(inquiry) === "new").length
        : null
    };

    document.querySelectorAll("[data-attention-count]").forEach((node) => {
      const value = counts[node.dataset.attentionCount];
      node.textContent = value === null || value === undefined ? "-" : String(value);
      node.closest("li")?.classList.toggle("has-items", Number(value) > 0);
    });

    [["custom-requests", counts.newRequests], ["inquiries", counts.newInquiries]].forEach(([tab, count]) => {
      const badge = document.querySelector(`[data-nav-badge="${tab}"]`);

      if (!badge) {
        return;
      }

      badge.hidden = !(count > 0);
      badge.innerHTML = count > 0 ? `${count}<span class="admin-sr-only"> ${escapeHtml(t("common.newSr"))}</span>` : "";
    });

    const clear = document.querySelector("[data-attention-clear]");

    if (clear) {
      clear.hidden = !(requestsKnown && inquiriesKnown && Object.values(counts).every((value) => value === 0));
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-attention-link]");

    if (!link) {
      return;
    }

    event.preventDefault();

    if (link.dataset.attentionLink === "custom-requests") {
      customRequestListState.status = link.dataset.attentionFilter || "all";
      renderCustomRequestsTable();
    } else if (link.dataset.attentionLink === "inquiries") {
      inquiryListState.status = link.dataset.attentionFilter || "all";
      renderInquiriesTable();
    }

    navigateToPanel(link.dataset.attentionLink);
  });

  // The product list is the only thing that shows these; filters, sorting,
  // paging and a single changed product redraw it without touching other tabs.
  function renderProductTables() {
    renderProductsTable();
    renderCatalogueOverview();
  }

  function renderAll() {
    renderStats();
    renderSelects();
    renderProductsTable();
    renderCatalogueOverview();
    renderBestSellerSettings();
    renderDatabaseStatus();
    renderDatabaseProducts();
    renderLogsTable();
    renderOrdersTable();
    renderCustomRequestsTable();
    renderInquiriesTable();
    renderAttention();
    applyAdminPermissions();
  }

  // ── PANELS, ADDRESS AND SCROLL HINTS ─────────────────────────────────────────
  // The open tab lives in location.hash (#products), so a reload or Back returns
  // to it and a link can point straight at it. Old links to #database now reach
  // System status, which moved under Settings.
  const PANEL_ALIASES = { database: "settings", "system-status": "settings" };
  const panelNames = new Set(elements.panels.map((panel) => panel.dataset.adminPanel));

  function resolvePanelName(raw) {
    const name = String(raw || "").replace(/^#/, "").trim().toLowerCase();
    const mapped = PANEL_ALIASES[name] || name;
    return panelNames.has(mapped) ? mapped : "";
  }

  // Each panel heading can take focus when its tab is chosen.
  elements.panels.forEach((panel) => {
    panel.querySelector(":scope > .admin-panel-head h2")?.setAttribute("tabindex", "-1");
  });

  function activatePanel(name, { focus = false } = {}) {
    elements.tabs.forEach((button) => {
      const isActive = button.dataset.adminTab === name;
      button.classList.toggle("is-active", isActive);

      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    elements.panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.adminPanel === name);
    });

    if (name === "best-seller") {
      // Images may have changed on the Products tab since this was drawn.
      renderBestSellerSettings();
    }

    const panel = elements.panels.find((item) => item.dataset.adminPanel === name);
    window.dispatchEvent(new CustomEvent("maris:admin-panel-shown", { detail: { name } }));

    if (!focus || !panel) {
      return;
    }

    // System status is a section of Settings: go straight to it when asked.
    const wantsSystemStatus = /^#(database|system-status)$/i.test(window.location.hash);
    const heading = wantsSystemStatus
      ? panel.querySelector("#admin-system-status-title")
      : panel.querySelector(":scope > .admin-panel-head h2");

    scrollIntoViewGently(wantsSystemStatus ? panel.querySelector("#admin-system-status") : panel);
    heading?.focus({ preventScroll: true });
  }

  // Changes the address, which activates the panel; Back and Forward then work.
  function navigateToPanel(name) {
    const target = resolvePanelName(name) || "dashboard";

    if (window.location.hash === `#${target}`) {
      activatePanel(target, { focus: true });
      return;
    }

    window.location.hash = target;
  }

  window.addEventListener("hashchange", () => {
    activatePanel(resolvePanelName(window.location.hash) || "dashboard", { focus: true });
  });

  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      navigateToPanel(button.dataset.adminTab);
    });
  });

  // A tab named in the address opens on load (without moving focus).
  {
    const initialPanel = resolvePanelName(window.location.hash);

    if (initialPanel) {
      activatePanel(initialPanel);
    }
  }

  // Tables wider than their box scroll sideways; say so, and drop the hint once
  // the right-hand edge is reached.
  function setupTableScrollHints() {
    document.querySelectorAll(".admin-table-wrap").forEach((wrap) => {
      const hint = document.createElement("p");
      hint.className = "admin-scroll-hint";
      hint.setAttribute("aria-hidden", "true");
      hint.hidden = true;
      hint.textContent = t("table.scrollHint");
      wrap.before(hint);

      const update = () => {
        hint.hidden = !(wrap.scrollWidth > wrap.clientWidth + 2
          && wrap.scrollLeft + wrap.clientWidth < wrap.scrollWidth - 2);
      };

      wrap.addEventListener("scroll", update, { passive: true });

      if (typeof ResizeObserver === "function") {
        const observer = new ResizeObserver(update);
        observer.observe(wrap);
        const table = wrap.querySelector("table");
        if (table) observer.observe(table);
      } else {
        window.addEventListener("resize", update);
      }

      update();
    });
  }

  setupTableScrollHints();

  elements.customRequestSearch?.addEventListener("input", (event) => {
    customRequestListState.searchTerm = String(event.currentTarget.value || "");
    renderCustomRequestsTable();
  });

  elements.customRequestStatus?.addEventListener("change", (event) => {
    customRequestListState.status = String(event.currentTarget.value || "all");
    renderCustomRequestsTable();
  });

  elements.customRequestStatusFilters.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedStatus = String(button.dataset.customRequestStatusFilter || "all");
      customRequestListState.status = customRequestListState.status === selectedStatus ? "all" : selectedStatus;
      renderCustomRequestsTable();
    });
  });

  elements.customRequestsTable?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-custom-request-open]");
    const requestId = button?.dataset.customRequestOpen;

    if (!requestId) {
      return;
    }

    customRequestListState.selectedId = requestId;
    renderCustomRequestDetail();
    elements.customRequestDetail?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elements.customRequestDetail?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-custom-request-close]")) {
      return;
    }

    customRequestListState.selectedId = "";
    renderCustomRequestDetail();
  });

  elements.customRequestDetail?.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-custom-request-update]");

    if (!form) {
      return;
    }

    event.preventDefault();

    if (!ensureAdminCan("operations:write") || !ensureAdminDataReady("customRequests")) {
      return;
    }

    const requestId = String(form.dataset.requestId || "");
    const currentRequest = getCachedCustomRequests().find((request) => request.id === requestId);
    const formData = new FormData(form);
    const status = String(formData.get("status") || "pending");
    const note = String(formData.get("note") || "").trim();

    if (currentRequest && getCustomRequestStatus(currentRequest) === status && !note) {
      setMessage(t("request.changeOrNote"), true);
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = t("common.saving");
    setMessage(t("request.savingFollowUp"));

    try {
      const payload = await fetchAdminApi(`/custom-order-requests?id=${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note })
      });
      adminCache.customRequests = getCachedCustomRequests().map((request) => (
        request.id === payload.request?.id ? payload.request : request
      ));
      renderCustomRequestsTable();
      renderAttention();
      setMessage(t("request.followUpSaved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("request.updateFailed"), true);
      submitButton.disabled = false;
      submitButton.textContent = t("request.saveUpdate");
    }
  });

  elements.productForm?.elements?.namedItem("imageGroupFiles")?.addEventListener("change", () => {
    applyImageGroupToProductForm(elements.productForm);
  });

  elements.productForm?.elements?.namedItem("category")?.addEventListener("change", () => {
    syncRingTypeFieldVisibility(elements.productForm);
  });

  if (elements.productForm) {
    syncRingTypeFieldVisibility(elements.productForm);
  }

  const productFormGemReportInput = elements.productForm?.querySelector("[data-gem-report-file]");
  const productFormGemReportPreview = elements.productForm?.querySelector("[data-gem-report-preview]");
  const productFormGemReport = productFormGemReportInput && productFormGemReportPreview
    ? createGemReportControl({
      input: productFormGemReportInput,
      preview: productFormGemReportPreview,
      emptyText: productFormGemReportPreview.textContent.trim(),
      removedText: productFormGemReportPreview.textContent.trim(),
      setSpecField: (key, value) => setFormValue(elements.productForm, key, value, { force: true })
    })
    : null;

  // A product whose images did not all upload. Pressing Add Product again (or
  // "Retry failed images") re-sends only those files instead of failing on
  // "This SKU already exists".
  let productCreateRetry = null;
  const productCreateRetryPanel = elements.productForm?.querySelector("[data-product-create-retry]");

  function hideProductCreateRetry() {
    productCreateRetry = null;

    if (productCreateRetryPanel) {
      productCreateRetryPanel.hidden = true;
    }
  }

  function showProductCreateRetry() {
    if (!productCreateRetryPanel || !productCreateRetry) {
      return;
    }

    const { sku, failed, total } = productCreateRetry;
    const names = failed.map(({ task }) => task.name).join(", ");
    const text = productCreateRetryPanel.querySelector("[data-product-create-retry-text]");

    if (text) {
      text.textContent = t("create.partialDetail", { sku, failed: failed.length, total, names, message: failed[0].message });
    }

    productCreateRetryPanel.hidden = false;
    setProductFormOpen(true);
  }

  function resetProductForm(form) {
    hideProductCreateRetry();
    form.reset();
    updateImageGroupSummary(form, null);
    productFormGemReport?.reset();
    syncRingTypeFieldVisibility(form);
  }

  async function retryProductCreateUploads(form, submitButton) {
    const state = productCreateRetry;

    if (!state) {
      return;
    }

    await withSubmitLock(form, submitButton, t("create.retrying"), async () => {
      const failed = await runProductImageUploadTasks(
        state.failed.map(({ task }) => task),
        (done, total) => {
          submitButton.textContent = t("create.uploadingImage", { done, total });
        }
      );

      await loadAdminBackendData();
      renderAll();

      if (failed.length) {
        state.failed = failed;
        showProductCreateRetry();
        setMessage(tp("create.stillFailed", failed.length, { n: failed.length, sku: state.sku }), true);
        return;
      }

      resetProductForm(form);
      setProductFormOpen(false);
      setMessage(t("create.savedAllImages", { sku: state.sku }));
    });
  }

  elements.productForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    // Image uploads make this slow; ignore re-submits so the same SKU is not inserted twice.
    if (form.dataset.submitting === "true") {
      return;
    }

    if (!ensureAdminCan("catalogue:write") || !ensureAdminDataReady("products")) {
      return;
    }

    const formData = new FormData(form);
    const sku = String(formData.get("sku")).trim().toUpperCase();
    const submitButton = form.querySelector("button[type='submit']");

    if (productCreateRetry && productCreateRetry.sku === sku) {
      await retryProductCreateUploads(form, submitButton);
      return;
    }

    // The admin moved on to a different product; the earlier one stays in the list.
    hideProductCreateRetry();

    const name = String(formData.get("name")).trim();
    const collectionName = String(formData.get("collectionName") || "").trim();
    const category = String(formData.get("category"));
    const ringType = String(formData.get("ringType") || "");
    const stockQty = Math.max(0, Number(formData.get("stockQty")) || 0);
    const reservedQty = Math.max(0, Number(formData.get("reservedQty")) || 0);
    const imageUploadDraft = buildProductImageUploadDraft(formData, { code: sku, name });
    const imageGroup = imageUploadDraft.smartGroup;
    const collection = imageGroup?.collectionKey || getProductFormCollectionKey(category, ringType);
    const products = readProducts();

    if (!sku || !name) {
      setMessage(t("modal.skuNameRequired"), true);
      return;
    }

    if (products.some((product) => getProductSku(product).toLowerCase() === sku.toLowerCase())) {
      setMessage(t("create.skuExists"), true);
      return;
    }

    if (reservedQty > stockQty) {
      setMessage(t("create.reservedTooHigh"), true);
      return;
    }

    // Turn a wrong file away before the product exists, not halfway through saving it.
    const galleryFiles = [imageUploadDraft.mainImageFile, ...imageUploadDraft.galleryImageFiles].filter(isSelectedFile);
    const fileProblem = findImageFileProblem(imageUploadDraft.coverImageFiles, validateCardImageFile)
      || findImageFileProblem(galleryFiles, validateGalleryImageFile);

    if (fileProblem) {
      setMessage(fileProblem, true);
      return;
    }

    const product = {
      sku,
      name,
      collectionName,
      category: getBroadCategoryLabel(collection, category),
      collection: collection || null,
      price: String(formData.get("price")).trim() || "Price on request",
      stockQty,
      reservedQty,
      status: String(formData.get("status")),
      description: String(formData.get("description") || "").trim(),
      specs: Object.fromEntries(PRODUCT_SPEC_FIELDS.map(({ key }) => [
        key,
        String(formData.get(key) || "").trim()
      ])),
      gemReport: productFormGemReport?.getPayload(),
      metadata: buildProductMetadata(null, collectionName),
      createdAt: new Date().toISOString()
    };

    await withSubmitLock(form, submitButton, t("create.creating"), async () => {
      try {
        const payload = await fetchAdminApi("/products", {
          method: "POST",
          body: JSON.stringify(product)
        });
        const tasks = buildProductImageUploadTasks(payload.product, imageUploadDraft, name || sku);
        const failed = await runProductImageUploadTasks(tasks, (done, total) => {
          submitButton.textContent = t("create.uploadingImage", { done, total });
        });

        await loadAdminBackendData();
        renderAll();

        if (failed.length) {
          productCreateRetry = { sku, product: payload.product, failed, total: tasks.length };
          showProductCreateRetry();
          setMessage(t("create.partial", { sku, failed: failed.length, total: tasks.length }), true);
          return;
        }

        resetProductForm(form);
        setProductFormOpen(false);
        setMessage(
          tasks.length
            ? tp("create.addedWithImages", tasks.length, { sku, n: tasks.length })
            : t("create.added", { sku })
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t("create.failed"), true);
      }
    });
  });

  productCreateRetryPanel?.querySelector("[data-product-create-retry-run]")?.addEventListener("click", () => {
    retryProductCreateUploads(elements.productForm, elements.productForm.querySelector("button[type='submit']"));
  });

  productCreateRetryPanel?.querySelector("[data-product-create-open]")?.addEventListener("click", (event) => {
    const productId = productCreateRetry?.product?.id;
    const product = getCachedProducts().find((item) => item.id === productId);

    if (product) {
      openEditModal(product, event.currentTarget);
    } else {
      setMessage(t("products.notFoundShort"), true);
    }
  });

  productCreateRetryPanel?.querySelector("[data-product-create-dismiss]")?.addEventListener("click", () => {
    resetProductForm(elements.productForm);
  });

  // Say what is wrong with a picked file straight away.
  [
    ["coverImageFiles", validateCardImageFile],
    ["imageGroupFiles", validateGalleryImageFile]
  ].forEach(([fieldName, validate]) => {
    const input = elements.productForm?.elements?.namedItem(fieldName);

    input?.addEventListener("change", () => {
      const problem = findImageFileProblem(Array.from(input.files || []).filter(isSelectedFile), validate);

      input.setAttribute("aria-invalid", problem ? "true" : "false");

      if (problem) {
        setMessage(problem, true);
      }
    });
  });

  elements.bestSellerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (event.currentTarget.dataset.submitting === "true" || !ensureAdminCan("settings:write") || !ensureAdminDataReady("products", "bestSellers")) {
      return;
    }

    const productIds = getBestSellerDraftIds()
      .map((productId) => String(productId || "").trim())
      .filter(Boolean);
    const uniqueProductIds = Array.from(new Set(productIds));

    if (uniqueProductIds.length !== productIds.length) {
      setMessage(t("bestSeller.onlyOnce"), true);
      return;
    }

    await withSubmitLock(event.currentTarget, event.currentTarget.querySelector("button[type='submit']"), t("common.saving"), async () => {
      setMessage(t("bestSeller.saving"));

      try {
        const payload = await fetchAdminApi("/best-sellers", {
          method: "PATCH",
          body: JSON.stringify({ productIds: uniqueProductIds })
        });
        adminCache.bestSellerProductIds = Array.isArray(payload.productIds) ? payload.productIds : [];
        bestSellerState.draftIds = null;
        renderAll();
        setMessage(t("bestSeller.saved"));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t("bestSeller.saveFailed"), true);
      }
    });
  });

  elements.bestSellerResults?.addEventListener("click", (event) => {
    if (event.target.closest("[data-best-seller-show-more]")) {
      bestSellerState.visibleCount += BEST_SELLER_RESULTS_PAGE_SIZE;
      renderBestSellerResults();
      return;
    }

    const card = event.target.closest("[data-best-seller-pick]");
    if (!card) {
      return;
    }

    const productId = card.dataset.bestSellerPick;
    const draftIds = getBestSellerDraftIds();

    if (draftIds.includes(productId)) {
      setBestSellerDraftIds(draftIds.filter((id) => id !== productId));
      return;
    }

    if (draftIds.length >= BEST_SELLER_SLOT_COUNT) {
      setMessage(`All ${BEST_SELLER_SLOT_COUNT} Best Seller slots are full. Remove one before adding another.`, true);
      return;
    }

    setBestSellerDraftIds([...draftIds, productId]);
  });

  elements.bestSellerSlots?.addEventListener("click", (event) => {
    const moveButton = event.target.closest("[data-best-seller-move]");
    const removeButton = event.target.closest("[data-best-seller-remove]");
    const draftIds = [...getBestSellerDraftIds()];

    if (moveButton && !moveButton.disabled) {
      const from = Number(moveButton.dataset.index);
      const to = from + Number(moveButton.dataset.bestSellerMove);
      if (to < 0 || to >= draftIds.length) {
        return;
      }
      [draftIds[from], draftIds[to]] = [draftIds[to], draftIds[from]];
      setBestSellerDraftIds(draftIds);
      elements.bestSellerSlots.querySelector(`[data-best-seller-move="${moveButton.dataset.bestSellerMove}"][data-index="${to}"]:not(:disabled)`)?.focus();
      return;
    }

    if (removeButton) {
      draftIds.splice(Number(removeButton.dataset.bestSellerRemove), 1);
      setBestSellerDraftIds(draftIds);
    }
  });

  elements.bestSellerSearch?.addEventListener("input", debounce((event) => {
    bestSellerState.searchTerm = String(event.target.value || "");
    bestSellerState.visibleCount = BEST_SELLER_RESULTS_PAGE_SIZE;
    renderBestSellerResults();
  }, SEARCH_DEBOUNCE_MS));

  elements.bestSellerCollection?.addEventListener("change", (event) => {
    bestSellerState.collection = String(event.currentTarget.value || "");
    bestSellerState.visibleCount = BEST_SELLER_RESULTS_PAGE_SIZE;
    renderBestSellerResults();
  });

  elements.bestSellerDiscard?.addEventListener("click", () => {
    discardBestSellerDraft();
    setMessage(t("bestSeller.discarded"));
  });

  elements.bestSellerRemoveUnavailable?.addEventListener("click", () => {
    const liveIds = getBestSellerDraftIds().filter((productId) => describeBestSellerSlot(productId).isLive);
    setBestSellerDraftIds(liveIds);
    setMessage(t("bestSeller.unavailableRemoved"));
  });

  elements.inventoryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (event.currentTarget.dataset.submitting === "true" || !ensureAdminCan("operations:write") || !ensureAdminDataReady("products")) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const pickedProduct = resolvePickedProduct(formData.get("productPick"));
    const productId = pickedProduct?.id || "";
    const pickedSku = pickedProduct ? getProductSku(pickedProduct) : "";
    const type = String(formData.get("type"));
    const qty = Number(formData.get("qty"));
    const note = String(formData.get("note")).trim();

    if (!productId || !qty || qty < 1) {
      setMessage(
        productId ? t("inventory.invalidQty") : t("inventory.chooseProduct"),
        true
      );
      return;
    }

    await withSubmitLock(form, form.querySelector("button[type='submit']"), t("common.saving"), async () => {
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
        form.elements.note.value = "";
        form.elements.productPick.value = "";
        renderAll();
        setMessage(t("inventory.saved", { sku: pickedSku }));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t("inventory.saveFailed"), true);
      }
    });
  });

  elements.orderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (form.dataset.submitting === "true" || !ensureAdminCan("operations:write") || !ensureAdminDataReady("products")) {
      return;
    }

    const formData = new FormData(form);
    const pickedProduct = resolvePickedProduct(formData.get("productPick"));
    const productId = pickedProduct?.id || "";
    const pickedSku = pickedProduct ? getProductSku(pickedProduct) : "";
    const qty = Math.max(1, Number(formData.get("qty")) || 1);

    if (!productId) {
      setMessage(t("orders.chooseProduct"), true);
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

    await withSubmitLock(form, form.querySelector("button[type='submit']"), t("create.creating"), async () => {
      try {
        await fetchAdminApi("/orders", {
          method: "POST",
          body: JSON.stringify(newOrder)
        });
        await loadAdminBackendData();
        form.reset();
        renderAll();
        setMessage(t("orders.created", { sku: pickedSku, qty }));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t("orders.createFailed"), true);
      }
    });
  });

  elements.ordersTable?.addEventListener("click", async (event) => {
    const cancelButton = event.target.closest("[data-order-cancel]");
    const orderId = cancelButton?.dataset.orderCancel;

    if (!orderId) {
      return;
    }

    if (!ensureAdminCan("operations:write") || !ensureAdminDataReady("orders")) {
      return;
    }

    const orders = readOrders();
    const order = orders.find((item) => item.id === orderId);
    const orderStatus = order?.orderStatus || order?.status;

    if (!order || (orderStatus !== "Pending" && orderStatus !== "draft" && orderStatus !== "quoted")) {
      return;
    }

    const orderLabel = order.orderNumber || order.id;
    const releasedQty = Number(order.qty) || 0;

    if (!confirm(tp("orders.confirmCancel", releasedQty, { order: orderLabel, n: releasedQty }))) {
      return;
    }

    await withSubmitLock(cancelButton, cancelButton, t("orders.cancelling"), async () => {
      try {
        await fetchAdminApi(`/orders?id=${encodeURIComponent(orderId)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled", paymentStatus: "cancelled" })
        });
        await loadAdminBackendData();
        renderAll();
        setMessage(t("orders.cancelled", { order: orderLabel, n: releasedQty }));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t("orders.cancelFailed"), true);
      }
    });
  });

  // Column sorting: first click sorts ascending, a second click descending.
  document.querySelectorAll("[data-products-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.productsSort;

      if (productListState.sortKey === key) {
        productListState.sortDir = productListState.sortDir === "asc" ? "desc" : "asc";
      } else {
        productListState.sortKey = key;
        productListState.sortDir = "asc";
      }

      productListState.page = 1;
      renderProductTables();
    });
  });

  // The "..." menu on each product row. The list is fixed-positioned so the
  // table's sideways scrolling cannot clip it.
  function closeRowMenus(except = null) {
    document.querySelectorAll("details.admin-row-menu[open]").forEach((menu) => {
      if (menu !== except) {
        menu.open = false;
      }
    });
  }

  function positionRowMenu(menu) {
    const summary = menu.querySelector("summary");
    const list = menu.querySelector(".admin-row-menu-list");

    if (!summary || !list) {
      return;
    }

    const rect = summary.getBoundingClientRect();
    const height = list.offsetHeight;
    const below = rect.bottom + 4;
    const fitsBelow = below + height <= window.innerHeight;

    list.style.top = `${Math.round(fitsBelow || rect.top - 4 - height < 0 ? below : rect.top - 4 - height)}px`;
    list.style.right = `${Math.max(8, Math.round(window.innerWidth - rect.right))}px`;
  }

  document.addEventListener("toggle", (event) => {
    const menu = event.target;

    if (menu instanceof HTMLDetailsElement && menu.classList.contains("admin-row-menu") && menu.open) {
      closeRowMenus(menu);
      positionRowMenu(menu);
    }
  }, true);

  document.addEventListener("click", (event) => {
    if (!event.target.closest("details.admin-row-menu")) {
      closeRowMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    const openMenu = event.key === "Escape" ? document.querySelector("details.admin-row-menu[open]") : null;

    if (openMenu) {
      openMenu.open = false;
      openMenu.querySelector("summary")?.focus();
    }
  });

  window.addEventListener("scroll", () => closeRowMenus(), true);
  window.addEventListener("resize", () => closeRowMenus());

  // The Add product form starts collapsed behind its button.
  const productFormPanel = document.querySelector("[data-product-form-panel]");
  const productFormToggle = document.querySelector("[data-product-form-toggle]");

  function setProductFormOpen(open, { focus = false } = {}) {
    if (!productFormPanel || !productFormToggle) {
      return;
    }

    productFormPanel.hidden = !open;
    productFormToggle.setAttribute("aria-expanded", String(open));
    productFormToggle.textContent = open ? t("form.hideForm") : t("products.addProduct");

    if (open && focus) {
      elements.productForm?.elements?.namedItem("sku")?.focus();
    }
  }

  productFormToggle?.addEventListener("click", () => {
    setProductFormOpen(productFormPanel.hidden, { focus: true });
  });

  // Typing only redraws the product list, and only once typing pauses.
  elements.productSearch?.addEventListener("input", debounce((event) => {
    productListState.searchTerm = String(event.target.value || "");
    productListState.page = 1;
    renderProductTables();
  }, SEARCH_DEBOUNCE_MS));

  document.querySelectorAll("[data-products-status]").forEach((button) => {
    button.addEventListener("click", () => {
      productListState.status = button.dataset.productsStatus || "all";
      productListState.page = 1;
      renderProductTables();
    });
  });

  elements.productsPagination?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-products-page]");
    if (!button || button.disabled) {
      return;
    }

    productListState.page = Number(button.dataset.productsPage) || 1;
    renderProductTables();
  });

  elements.resetDemo?.addEventListener("click", async () => {
    await loadAdminBackendData();
    renderAll();
    setMessage(adminCache.error ? t("data.refreshPartial", { message: adminCache.error }) : t("data.refreshed"), Boolean(adminCache.error));
  });

  // Retry button inside a failed table: reload just that data set.
  document.addEventListener("click", async (event) => {
    const retry = event.target.closest("[data-retry-dataset]");
    const name = retry?.dataset.retryDataset;

    if (!name || !ADMIN_DATASETS[name]) {
      return;
    }

    retry.disabled = true;
    await loadAdminBackendData([name]);
    renderAll();
    setMessage(
      adminCache.errors[name] ? t("data.stillFailed", { label: ADMIN_DATASETS[name].label, message: adminCache.errors[name] }) : t("data.loaded", { label: ADMIN_DATASETS[name].label }),
      Boolean(adminCache.errors[name])
    );
  });

  async function setProductStatus(productId, nextStatus) {
    await fetchAdminApi(`/products?id=${encodeURIComponent(productId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus })
    });
    await loadAdminBackendData();
    renderAll();
  }

  async function handleToggleStatus(productId, currentStatus, button) {
    if (!productId || !ensureAdminCan("catalogue:write")) return;
    const nextStatus = currentStatus === "active" ? "draft" : "active";
    const product = getCachedProducts().find((item) => item.id === productId);
    const sku = product ? getProductSku(product) : t("products.thisProduct");

    if (nextStatus === "draft" && !confirm(t("products.confirmHide", { sku }))) {
      return;
    }

    await withSubmitLock(button, button, t("products.updating"), async () => {
      setMessage(t("products.updatingStatus"));
      try {
        await setProductStatus(productId, nextStatus);

        if (nextStatus === "draft") {
          setMessageWithAction(t("products.nowDraft", { sku }), t("common.undo"), async () => {
            try {
              await setProductStatus(productId, currentStatus);
              setMessage(t("products.liveAgain", { sku }));
            } catch (error) {
              setMessage(error instanceof Error ? error.message : t("products.undoFailed"), true);
            }
          });
        } else {
          setMessage(t("products.nowLive", { sku }));
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t("products.statusFailed"), true);
      }
    });
  }

  document.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-toggle-status]");
    if (!btn) return;
    const productId = btn.dataset.toggleStatus;
    const currentStatus = btn.dataset.currentStatus;
    closeRowMenus();
    await handleToggleStatus(productId, currentStatus, btn);
  });

  if (elements.productsTable) {
    elements.productsTable.addEventListener("click", handleCatalogueTableActions);
  }

  // Anything typed but not saved: the Best Seller order, the edit modal's text
  // fields, or a turntable that is picked or still uploading.
  function hasUnsavedAdminWork() {
    const modal = document.getElementById("maris-edit-modal");
    const modalIsOpen = Boolean(modal?.classList.contains("is-open"));

    return isBestSellerDirty()
      || (modalIsOpen && (isModalDirty() || modalVideoUploading || Boolean(modalVideoDraft)));
  }

  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsavedAdminWork()) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
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
