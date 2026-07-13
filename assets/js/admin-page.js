(() => {
  const fallbackCollectionMeta = {
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
  const settingsState = {
    lowStockThreshold: 2
  };

  const elements = {
    panels: Array.from(document.querySelectorAll("[data-admin-panel]")),
    tabs: Array.from(document.querySelectorAll("[data-admin-tab]")),
    productForm: document.querySelector("[data-product-form]"),
    productSearch: document.querySelector("[data-products-search]"),
    bestSellerForm: document.querySelector("[data-best-seller-form]"),
    inventoryForm: document.querySelector("[data-inventory-form]"),
    orderForm: document.querySelector("[data-order-form]"),
    settingsForm: document.querySelector("[data-settings-form]"),
    productsTable: document.querySelector("[data-products-table]"),
    productsPagination: document.querySelector("[data-products-pagination]"),
    productsPageSummary: document.querySelector("[data-products-page-summary]"),
    catalogueDraftTable: document.querySelector("[data-catalogue-draft-table]"),
    logsTable: document.querySelector("[data-inventory-log-table]"),
    ordersTable: document.querySelector("[data-orders-table]"),
    customRequestsTable: document.querySelector("[data-custom-requests-table]"),
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
    bestSellerSlots: document.querySelector("[data-best-seller-slots]"),
    bestSellerPreview: document.querySelector("[data-best-seller-preview]"),
    bestSellerCount: document.querySelector("[data-best-seller-count]"),
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
  const ADMIN_PRODUCT_IMAGES_PATH = "/product-images";
  const BEST_SELLER_SLOT_COUNT = 7;
  const PRODUCT_LIST_PAGE_SIZE = 5;
  const adminCache = {
    products: [],
    bestSellerProductIds: [],
    orders: [],
    customRequests: [],
    logs: [],
    isLoading: true,
    isReady: false,
    error: ""
  };
  const productListState = {
    searchTerm: "",
    page: 1
  };
  let modalGalleryImages = [];
  let modalGalleryDragIndex = null;

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
      const [productsPayload, ordersPayload, logsPayload, customRequestsPayload, bestSellersPayload] = await Promise.all([
        fetchAdminApi("/products"),
        fetchAdminApi("/orders"),
        fetchAdminApi("/inventory-logs"),
        fetchAdminApi("/api/admin/custom-order-requests"),
        fetchAdminApi("/best-sellers")
      ]);

      adminCache.products = Array.isArray(productsPayload.products) ? productsPayload.products : [];
      adminCache.bestSellerProductIds = Array.isArray(bestSellersPayload.productIds) ? bestSellersPayload.productIds : [];
      adminCache.orders = Array.isArray(ordersPayload.orders) ? ordersPayload.orders : [];
      adminCache.logs = Array.isArray(logsPayload.logs) ? logsPayload.logs : [];
      adminCache.customRequests = Array.isArray(customRequestsPayload.requests) ? customRequestsPayload.requests : [];
      adminCache.isReady = true;
    } catch (error) {
      adminCache.products = [];
      adminCache.bestSellerProductIds = [];
      adminCache.orders = [];
      adminCache.logs = [];
      adminCache.customRequests = [];
      adminCache.isReady = false;
      adminCache.error = error instanceof Error ? error.message : "Supabase admin data could not be loaded.";
    } finally {
      adminCache.isLoading = false;
    }
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

  function readCustomRequests() {
    return getCachedCustomRequests();
  }

  function readCatalogueDrafts() {
    return [];
  }

  function getProductSearchText(product) {
    return [
      getProductSku(product),
      getProductName(product),
      getProductCategory(product),
      getProductCollectionName(product),
      getProductPrice(product),
      product?.status,
      product?.slug,
      product?.description
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function getProductListView() {
    const products = readProducts();
    const searchLabel = productListState.searchTerm.trim();
    const query = searchLabel.toLowerCase();
    const filteredProducts = query
      ? products.filter((product) => getProductSearchText(product).includes(query))
      : products;
    const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PRODUCT_LIST_PAGE_SIZE));
    const currentPage = Math.min(Math.max(Number(productListState.page) || 1, 1), pageCount);
    const startIndex = (currentPage - 1) * PRODUCT_LIST_PAGE_SIZE;

    productListState.page = currentPage;

    return {
      query,
      searchLabel,
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
    if (elements.productsPageSummary) {
      if (adminCache.isLoading) {
        elements.productsPageSummary.textContent = "Loading Supabase products...";
      } else if (!adminCache.isReady) {
        elements.productsPageSummary.textContent = adminCache.error || "Connect Supabase before managing admin products.";
      } else if (!view.filteredCount && view.query) {
        elements.productsPageSummary.textContent = `No products match "${view.searchLabel}".`;
      } else if (!view.filteredCount) {
        elements.productsPageSummary.textContent = "No Supabase products yet.";
      } else if (view.query) {
        elements.productsPageSummary.textContent = `Showing ${view.startItem}-${view.endItem} of ${view.filteredCount} matches for "${view.searchLabel}" (${view.totalProducts} total).`;
      } else {
        elements.productsPageSummary.textContent = `Showing ${view.startItem}-${view.endItem} of ${view.filteredCount} products.`;
      }
    }

    if (!elements.productsPagination) {
      return;
    }

    if (adminCache.isLoading || !adminCache.isReady || view.pageCount <= 1) {
      elements.productsPagination.innerHTML = "";
      return;
    }

    const pageButtons = Array.from({ length: view.pageCount }, (_, index) => {
      const page = index + 1;
      const isCurrent = page === view.currentPage;
      return `<button type="button" data-products-page="${page}"${isCurrent ? ' aria-current="page"' : ""}>${page}</button>`;
    }).join("");

    elements.productsPagination.innerHTML = `
      <button type="button" data-products-page="${Math.max(1, view.currentPage - 1)}"${view.currentPage === 1 ? " disabled" : ""}>Prev</button>
      ${pageButtons}
      <button type="button" data-products-page="${Math.min(view.pageCount, view.currentPage + 1)}"${view.currentPage === view.pageCount ? " disabled" : ""}>Next</button>
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
    return product.category || getCollectionLabel(product.collection) || "Fine Jewelry";
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

  function getBroadCategoryLabel(collectionKey, fallbackCategory = "") {
    if (collectionKey === "wedding-set") {
      return "Wedding Set";
    }

    if (ringCollectionKeys.has(collectionKey)) {
      return "Rings";
    }

    return getCollectionLabel(collectionKey) || fallbackCategory || "Unassigned";
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

  function updateImageGroupSummary(form, group) {
    const summary = form?.querySelector("[data-image-group-summary]");

    if (!summary) {
      return;
    }

    if (!group) {
      summary.textContent = "No product images selected.";
      return;
    }

    const orderedNames = group.orderedImages
      .map((image, index) => `${index + 1}. ${escapeHtml(image.fileName)}`)
      .join("<br>");

    summary.innerHTML = `
      <strong>${escapeHtml(group.summary || "Image group ready")}</strong>
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

  function buildProductImageUploadDraft(formData, product) {
    const smartGroup = getSmartImageGroupFromFormData(formData);
    const selectedFiles = formData.getAll("imageGroupFiles").filter(isSelectedFile);
    const orderedFiles = smartGroup?.orderedImages?.length
      ? smartGroup.orderedImages.map((image) => image.file)
      : selectedFiles;

    return {
      product,
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

  async function uploadProductImages(product, result) {
    const productName = result.product.name || result.product.code;
    const files = [result.mainImageFile, ...result.galleryImageFiles].filter(isSelectedFile);

    for (const [index, file] of files.entries()) {
      const smartImage = findSmartImageMetadata(file, result.smartGroup);
      await uploadProductImage(product.id, file, {
        altText: smartImage?.altText || `${productName} ${index === 0 ? "primary image" : `gallery image ${index}`}`,
        sortOrder: index,
        isPrimary: index === 0
      });
    }
  }

  function getModalProductId() {
    return document.getElementById("maris-edit-modal")?.dataset.productId || "";
  }

  function getModalProductImages(product) {
    const images = Array.isArray(product?.images) ? product.images : [];

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

  function updateModalMainImagePreview(product) {
    const previewEl = document.getElementById("modal-main-image-preview");
    if (!previewEl) return;

    const primaryImageUrl = product?.primaryImageUrl || modalGalleryImages[0]?.imageUrl || "";
    if (primaryImageUrl) {
      previewEl.outerHTML = `<img id="modal-main-image-preview" class="modal-image-preview" src="${escapeHtml(primaryImageUrl)}" alt="Current main image">`;
      return;
    }

    previewEl.outerHTML = `<div id="modal-main-image-preview" class="modal-image-placeholder">No main image</div>`;
  }

  function updateModalGalleryCount() {
    const galleryCountEl = document.getElementById("modal-gallery-count");
    if (!galleryCountEl) return;

    const galleryCount = modalGalleryImages.length;
    galleryCountEl.textContent =
      galleryCount ? `${galleryCount} image${galleryCount > 1 ? "s" : ""} in gallery` : "No gallery images yet";
  }

  function renderModalGalleryImages(images = modalGalleryImages) {
    const grid = document.getElementById("modal-gallery-grid");
    if (!grid) return;

    modalGalleryImages = Array.isArray(images) ? images : [];
    updateModalGalleryCount();

    if (!modalGalleryImages.length) {
      grid.innerHTML = `<p class="modal-gallery-empty">No existing gallery images to manage.</p>`;
      return;
    }

    grid.innerHTML = modalGalleryImages
      .map((image, index) => `
        <div class="modal-gallery-item" draggable="true" data-gallery-index="${index}" data-image-id="${escapeHtml(image.id)}">
          <img src="${escapeHtml(image.imageUrl)}" alt="${escapeHtml(image.altText || `Gallery image ${index + 1}`)}">
          <span class="gallery-badge">${image.isPrimary ? "Main" : index + 1}</span>
          <button class="modal-gallery-delete" type="button" data-gallery-delete="${escapeHtml(image.id)}" aria-label="Delete image">&times;</button>
        </div>
      `)
      .join("");
  }

  function renderModalProductImages(product) {
    modalGalleryImages = getModalProductImages(product);
    updateModalMainImagePreview(product);
    renderModalGalleryImages(modalGalleryImages);
  }

  async function reloadEditModalProduct(productId) {
    await loadAdminBackendData();
    loadDatabaseCatalogue();
    renderAll();

    const updatedProduct = getCachedProducts().find((product) => product.id === productId);
    if (updatedProduct) {
      renderModalProductImages(updatedProduct);
    }
  }

  async function deleteModalGalleryImage(imageId) {
    const productId = getModalProductId();
    const image = modalGalleryImages.find((item) => item.id === imageId);
    if (!productId || !imageId) return;

    if (!confirm(`Delete this ${image?.isPrimary ? "main" : "gallery"} image?`)) {
      return;
    }

    setModalMessage("Deleting image...", false);

    try {
      await fetchAdminApi(`${ADMIN_PRODUCT_IMAGES_PATH}?productId=${encodeURIComponent(productId)}&imageId=${encodeURIComponent(imageId)}`, {
        method: "DELETE"
      });
      await reloadEditModalProduct(productId);
      setModalMessage("Image deleted.");
    } catch (error) {
      setModalMessage(error instanceof Error ? error.message : "Could not delete image.", true);
    }
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
    updateModalMainImagePreview({ primaryImageUrl: modalGalleryImages[0]?.imageUrl || "" });
    setModalMessage("Saving image order...", false);

    try {
      await fetchAdminApi(ADMIN_PRODUCT_IMAGES_PATH, {
        method: "PATCH",
        body: JSON.stringify({
          productId,
          imageIds: modalGalleryImages.map((image) => image.id)
        })
      });
      await reloadEditModalProduct(productId);
      setModalMessage("Image order updated.");
    } catch (error) {
      await reloadEditModalProduct(productId).catch(() => {});
      setModalMessage(error instanceof Error ? error.message : "Could not update image order.", true);
    }
  }

  function handleModalGalleryClick(event) {
    const deleteBtn = event.target.closest("[data-gallery-delete]");
    if (!deleteBtn) return;

    deleteModalGalleryImage(deleteBtn.dataset.galleryDelete);
  }

  function handleModalGalleryDragStart(event) {
    const item = event.target.closest(".modal-gallery-item");
    if (!item) return;

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
    const view = getProductListView();
    renderProductListControls(view);

    if (adminCache.isLoading) {
      elements.productsTable.innerHTML = `<tr><td colspan="8">Loading Supabase products...</td></tr>`;
      return;
    }

    if (!adminCache.isReady) {
      elements.productsTable.innerHTML = `<tr><td colspan="8">${escapeHtml(adminCache.error || "Connect Supabase before managing admin products.")}</td></tr>`;
      return;
    }

    const rows = view.pageProducts
      .map((product) => {
        const available = getAvailable(product);
        const stockClass = available <= settings.lowStockThreshold ? "stock-low" : "stock-ok";
        const isActive = product.status === "active";
        const toggleLabel = isActive ? "Set Draft" : "Set Active";
        const statusClass = isActive ? "status-active" : "status-draft";

        return `
          <tr>
            <td><strong>${escapeHtml(getProductSku(product))}</strong></td>
            <td>${escapeHtml(getProductName(product))}</td>
            <td>${escapeHtml(getProductCategory(product))}</td>
            <td>${escapeHtml(getProductPrice(product))}</td>
            <td>${product.stockQty}</td>
            <td>${product.reservedQty}</td>
            <td class="${stockClass}">${available}</td>
            <td>
              <span class="${statusClass}">${escapeHtml(product.status)}</span>
              <button class="admin-status-toggle" type="button"
                data-toggle-status="${escapeHtml(product.id || "")}"
                data-current-status="${escapeHtml(product.status)}">${toggleLabel}</button>
            </td>
          </tr>
        `;
      })
      .join("");

    const emptyMessage = view.query
      ? `No products match "${view.searchLabel}".`
      : "No Supabase products yet.";
    elements.productsTable.innerHTML = rows || `<tr><td colspan="8">${escapeHtml(emptyMessage)}</td></tr>`;
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
        const href = getProductPreviewHref(product.code);

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
      loading: "Loading catalogue...",
      ready: "Connected",
      empty: "No products",
      error: "Catalogue unavailable"
    }[sheetStatus.status] || "Waiting...";
    const storefrontProducts = Array.isArray(window.MARIS_PRODUCTS) ? window.MARIS_PRODUCTS : [];
    const sheetCount = Number.isFinite(Number(sheetStatus.productCount))
      ? Number(sheetStatus.productCount)
      : storefrontProducts.length;
    const feedUrl = "/api/catalogue/products";

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

    if (adminCache.isLoading) {
      elements.sheetCatalogueTable.innerHTML = `<tr><td colspan="6">Loading Supabase products...</td></tr>`;
      return;
    }

    const view = getProductListView();
    const sheetProducts = view.pageProducts;

    if (!adminCache.isReady || !getCachedProducts().length) {
      const emptyMessage = !adminCache.isReady
        ? (adminCache.error || "Supabase catalogue is unavailable right now. No catalogue products can be loaded.")
        : "No Supabase catalogue products are available yet.";
      elements.sheetCatalogueTable.innerHTML = `<tr><td colspan="6">${escapeHtml(emptyMessage)}</td></tr>`;
      return;
    }

    const rows = sheetProducts
      .map((product) => {
        const code = getProductSku(product);
        const collectionKey = product.collection || "";
        const href = getProductPreviewHref(product.slug || code);
        const galleryCount = Array.isArray(product.images) ? product.images.length : (Number(product.imageCount) || 0);
        const imageLabel = product.primaryImageUrl
          ? `<a class="admin-link-inline" href="${escapeHtml(product.primaryImageUrl)}" target="_blank" rel="noopener noreferrer">Open image</a>`
          : "-";
        const isActive = product.status === "active";
        const toggleLabel = isActive ? "Set Draft" : "Set Active";
        const statusClass = isActive ? "status-active" : "status-draft";

        return `
          <tr>
            <td><strong>${escapeHtml(code)}</strong></td>
            <td>${escapeHtml(getCollectionLabel(collectionKey))}</td>
            <td>
              <strong>${escapeHtml(getProductName(product))}</strong>
              <div>${escapeHtml(getProductPrice(product))}</div>
            </td>
            <td>${imageLabel}</td>
            <td>${galleryCount}</td>
            <td>
              <div class="admin-row-actions">
                <span class="${statusClass}">${escapeHtml(product.status)}</span>
                <button class="admin-status-toggle" type="button"
                  data-toggle-status="${escapeHtml(product.id || "")}"
                  data-current-status="${escapeHtml(product.status)}">${toggleLabel}</button>
                <button type="button" data-catalogue-edit="${escapeHtml(code)}" data-product-id="${escapeHtml(product.id || "")}">Edit</button>
                <button type="button" data-catalogue-delete="${escapeHtml(code)}" data-product-id="${escapeHtml(product.id || "")}">Delete</button>
                <a class="admin-secondary" href="${href}" target="_blank" rel="noopener noreferrer">Preview</a>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    const emptyMessage = view.query
      ? `No catalogue products match "${view.searchLabel}".`
      : "No Supabase catalogue products are available yet.";
    elements.sheetCatalogueTable.innerHTML = rows || `<tr><td colspan="6">${escapeHtml(emptyMessage)}</td></tr>`;
  }

  function getActiveProducts() {
    return readProducts().filter((product) => product.status === "active");
  }

  function getBestSellerProductsByIds(productIds) {
    const products = getActiveProducts();

    return productIds
      .map((productId) => products.find((product) => product.id === productId))
      .filter(Boolean);
  }

  function renderBestSellerSettings() {
    if (!elements.bestSellerSlots) {
      return;
    }

    if (adminCache.isLoading) {
      elements.bestSellerSlots.innerHTML = `<p class="admin-note">Loading Best Seller slots...</p>`;
      if (elements.bestSellerPreview) {
        elements.bestSellerPreview.innerHTML = `<p class="admin-note">Loading Best Seller preview...</p>`;
      }
      return;
    }

    if (!adminCache.isReady) {
      const message = escapeHtml(adminCache.error || "Connect Supabase before managing Best Seller products.");
      elements.bestSellerSlots.innerHTML = `<p class="admin-note">${message}</p>`;
      if (elements.bestSellerPreview) {
        elements.bestSellerPreview.innerHTML = `<p class="admin-note">${message}</p>`;
      }
      if (elements.bestSellerCount) {
        elements.bestSellerCount.textContent = "0";
      }
      return;
    }

    const activeProducts = getActiveProducts();
    const selectedIds = getBestSellerProductIds();
    const selectedProducts = getBestSellerProductsByIds(selectedIds);

    if (elements.bestSellerCount) {
      elements.bestSellerCount.textContent = String(selectedProducts.length);
    }

    const buildOptions = (selectedId) => {
      const hasSelectedProduct = activeProducts.some((product) => product.id === selectedId);
      const unavailableOption = selectedId && !hasSelectedProduct
        ? `<option value="${escapeHtml(selectedId)}" selected disabled>Unavailable selected product</option>`
        : "";

      return `
        <option value="">Empty slot</option>
        ${unavailableOption}
        ${activeProducts.map((product) => {
          const productId = product.id || "";
          const label = `${getProductSku(product)} - ${getProductName(product)}`;
          const selected = productId === selectedId ? " selected" : "";

          return `<option value="${escapeHtml(productId)}"${selected}>${escapeHtml(label)}</option>`;
        }).join("")}
      `;
    };

    elements.bestSellerSlots.innerHTML = Array.from({ length: BEST_SELLER_SLOT_COUNT }, (_, index) => {
      const selectedId = selectedIds[index] || "";

      return `
        <label class="best-seller-admin-slot">
          <span>Slot ${index + 1}</span>
          <select name="slot-${index + 1}" data-best-seller-slot="${index}">
            ${buildOptions(selectedId)}
          </select>
        </label>
      `;
    }).join("");

    if (!elements.bestSellerPreview) {
      return;
    }

    elements.bestSellerPreview.innerHTML = selectedProducts.length
      ? selectedProducts.map((product, index) => {
        const image = product.primaryImageUrl
          ? `<img src="${escapeHtml(product.primaryImageUrl)}" alt="${escapeHtml(getProductName(product))}">`
          : `<span class="best-seller-admin-image-fallback">Image coming soon</span>`;

        return `
          <article class="best-seller-admin-card">
            ${image}
            <div class="best-seller-admin-card-body">
              <span>${String(index + 1).padStart(2, "0")} · ${escapeHtml(getProductSku(product))}</span>
              <strong>${escapeHtml(getProductName(product))}</strong>
            </div>
          </article>
        `;
      }).join("")
      : `<p class="admin-note">No Best Seller products selected yet.</p>`;
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
        color: #b9933a;
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
        background: #b9933a;
        color: #fff;
        font-size: 9px;
        letter-spacing: 0.1em;
        padding: 2px 5px;
        text-transform: uppercase;
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
      .modal-gallery-empty {
        color: #5c6d68;
        font-size: 13px;
        padding: 12px 0;
      }
      .modal-gallery-hint {
        color: #b9933a;
        font-size: 11px;
        letter-spacing: 0.08em;
        margin-bottom: 10px;
      }
      /* ── Actions ── */
      .modal-actions {
        display: flex;
        gap: 10px;
        margin-top: 28px;
        flex-wrap: wrap;
      }
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
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "maris-edit-modal-title");
    modal.innerHTML = `
      <div id="maris-edit-modal-box">
        <button class="modal-close-btn" id="maris-edit-modal-close" aria-label="Close">&#x2715;</button>
        <span class="modal-kicker">Editing product</span>
        <h2 id="maris-edit-modal-title">Edit Product</h2>

        <div class="modal-grid">
          <label class="modal-label">
            SKU / Code
            <input class="modal-input" id="modal-field-sku" type="text">
          </label>
          <label class="modal-label">
            Collection / Ring Type
            <select class="modal-select" id="modal-field-collection">
              <option value="engagement-ring">Engagement Rings</option>
              <option value="wedding-bands">Wedding Bands</option>
              <option value="mens-wedding-bands">Men's Wedding Bands</option>
              <option value="rings">Rings</option>
              <option value="wedding-set">Wedding Set</option>
              <option value="earrings">Earrings</option>
              <option value="bracelets">Bracelets</option>
              <option value="necklaces-pendants">Necklaces &amp; Pendants</option>
            </select>
          </label>
        </div>

        <div class="modal-grid">
          <label class="modal-label">
            Product Name
            <input class="modal-input" id="modal-field-name" type="text" placeholder="Product name">
          </label>
          <label class="modal-label">
            Price
            <input class="modal-input" id="modal-field-price" type="text" placeholder="Price on request">
          </label>
        </div>

        <div class="modal-grid modal-full">
          <label class="modal-label">
            Collection Name
            <input class="modal-input" id="modal-field-collection-name" type="text" placeholder="The One Aura Collection">
          </label>
        </div>

        <div class="modal-grid">
          <label class="modal-label">
            Status
            <select class="modal-select" id="modal-field-status">
              <option value="Ready">Ready</option>
              <option value="Sold Out">Sold Out</option>
              <option value="Preorder">Preorder</option>
              <option value="Hidden">Hidden</option>
            </select>
          </label>
          <label class="modal-label">
            Real Stock
            <input class="modal-input" id="modal-field-stock" type="number" min="0">
          </label>
        </div>

        <div class="modal-grid modal-full">
          <label class="modal-label">
            Description
            <input class="modal-input" id="modal-field-description" type="text" placeholder="Short description">
          </label>
        </div>

        <hr class="modal-divider">
        <span class="modal-kicker">Main Image</span>
        <div class="modal-main-img-wrap">
          <div id="modal-main-image-preview" class="modal-image-placeholder">No main image</div>
          <label class="modal-label" style="margin-top:4px">
            Replace Main Image
            <input class="modal-file-input" id="modal-field-main-image" type="file" accept="image/*">
          </label>
        </div>

        <hr class="modal-divider">
        <span class="modal-kicker">Gallery Images</span>
        <p id="modal-gallery-count" class="modal-gallery-count">No gallery images yet</p>
        <p class="modal-gallery-hint" style="margin-top:6px">Drag to reorder · Press ✕ to delete an image</p>
        <div id="modal-gallery-grid"></div>
        <label class="modal-label" style="margin-top:4px">
          Add More Images
          <input class="modal-file-input" id="modal-field-gallery" type="file" accept="image/*" multiple>
        </label>

        <div class="modal-actions">
          <button class="admin-primary" id="modal-save-btn" type="button">Save Changes</button>
          <button class="admin-secondary" id="maris-edit-modal-cancel" type="button">Cancel</button>
        </div>
        <p class="modal-message" id="modal-message"></p>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("maris-edit-modal-close").addEventListener("click", closeEditModal);
    document.getElementById("maris-edit-modal-cancel").addEventListener("click", closeEditModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeEditModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEditModal(); });
    document.getElementById("modal-save-btn").addEventListener("click", saveEditModal);
    const galleryGrid = document.getElementById("modal-gallery-grid");
    galleryGrid.addEventListener("click", handleModalGalleryClick);
    galleryGrid.addEventListener("dragstart", handleModalGalleryDragStart);
    galleryGrid.addEventListener("dragover", handleModalGalleryDragOver);
    galleryGrid.addEventListener("dragleave", handleModalGalleryDragLeave);
    galleryGrid.addEventListener("drop", handleModalGalleryDrop);
    galleryGrid.addEventListener("dragend", handleModalGalleryDragEnd);
  }

  function openEditModal(product) {
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
    document.getElementById("modal-field-status").value = product.status || "Ready";
    document.getElementById("modal-field-stock").value = String(product.stockQty ?? product.totalStock ?? 0);
    document.getElementById("modal-field-description").value = product.description || "";

    // Title
    title.textContent = `Edit — ${getProductSku(product)}`;

    renderModalProductImages(product);

    // Reset file inputs & message
    document.getElementById("modal-field-main-image").value = "";
    document.getElementById("modal-field-gallery").value = "";
    setModalMessage("", false);

    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeEditModal() {
    const modal = document.getElementById("maris-edit-modal");
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
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
    if (!productId) return;

    const saveBtn = document.getElementById("modal-save-btn");
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="modal-spinner"></span>Saving...`;
    setModalMessage("", false);

    try {
      // 1. PATCH text fields
      const sku = document.getElementById("modal-field-sku").value.trim().toUpperCase();
      const name = document.getElementById("modal-field-name").value.trim();
      const collectionName = document.getElementById("modal-field-collection-name").value.trim();
      const collection = document.getElementById("modal-field-collection").value;
      const price = document.getElementById("modal-field-price").value.trim() || "Price on request";
      const status = document.getElementById("modal-field-status").value;
      const stockQty = Math.max(0, Number(document.getElementById("modal-field-stock").value) || 0);
      const description = document.getElementById("modal-field-description").value.trim();
      const metadata = buildProductMetadata(
        { metadata: parseModalMetadata(modal.dataset.productMetadata) },
        collectionName
      );

      if (!sku || !name) {
        setModalMessage("SKU and product name are required.", true);
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
          status,
          stockQty,
          description,
          metadata
        })
      });

      // 2. Upload new main image (if selected)
      const mainImageFile = document.getElementById("modal-field-main-image").files[0];
      if (mainImageFile) {
        await uploadProductImage(productId, mainImageFile, {
          altText: `${name} primary image`,
          sortOrder: 0,
          isPrimary: true
        });
      }

      // 3. Upload new gallery images (if selected)
      const galleryFiles = Array.from(document.getElementById("modal-field-gallery").files);
      if (galleryFiles.length) {
        const nextSortOrder = modalGalleryImages.length;
        await Promise.all(galleryFiles.map((file, index) =>
          uploadProductImage(productId, file, {
            altText: `${name} gallery image ${index + 1}`,
            sortOrder: nextSortOrder + index,
            isPrimary: false
          })
        ));
      }

      setModalMessage("Saved successfully.");
      await loadAdminBackendData();
      loadDatabaseCatalogue();
      renderAll();

      setTimeout(closeEditModal, 800);

    } catch (error) {
      setModalMessage(error instanceof Error ? error.message : "Could not save changes.", true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  }

  // ── TABLE ACTIONS ────────────────────────────────────────────────────────────

  function handleCatalogueTableActions(event) {
    const editBtn = event.target.closest("[data-catalogue-edit]");
    const deleteBtn = event.target.closest("[data-catalogue-delete]");

    if (editBtn) {
      const productId = editBtn.dataset.productId;
      const product = getCachedProducts().find((p) => p.id === productId);
      if (product) {
        openEditModal(product);
      } else {
        setMessage("Product data not found. Try refreshing.", true);
      }
      return;
    }

    if (deleteBtn) {
      const code = deleteBtn.dataset.catalogueDelete;
      const productId = deleteBtn.dataset.productId;
      if (!productId) {
        alert("Product ID not found. Cannot delete.");
        return;
      }
      if (!confirm(`Delete product ${code}? This cannot be undone.`)) {
        return;
      }
      deleteSupabaseProduct(productId, code);
    }
  }

  async function deleteSupabaseProduct(productId, code) {
    try {
      const response = await fetch(`/api/admin/products?id=${encodeURIComponent(productId)}`, {
        method: "DELETE",
        credentials: "same-origin"
      });

      if (response.ok) {
        alert(`Product ${code} deleted.`);
        await loadAdminBackendData();
        loadDatabaseCatalogue();
        renderAll();
      } else {
        const payload = await response.json().catch(() => ({}));
        alert(`Delete failed: ${payload.error || response.statusText}`);
      }
    } catch (error) {
      alert(`Delete error: ${error.message}`);
    }
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
        elements.databaseProductsSummary.textContent = `${products.length} Supabase products loaded. Supabase drives the live storefront catalogue.`;
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
              <strong>${escapeHtml(product.nameEn || product.productCode)}</strong>
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

  function renderCustomRequestsTable() {
    if (adminCache.isLoading) {
      elements.customRequestsTable.innerHTML = `<tr><td colspan="6">Loading custom requests...</td></tr>`;
      return;
    }

    if (!adminCache.isReady) {
      elements.customRequestsTable.innerHTML = `<tr><td colspan="6">${escapeHtml(adminCache.error || "Connect Supabase before reviewing custom requests.")}</td></tr>`;
      return;
    }

    const rows = readCustomRequests()
      .map((request) => {
        const createdAt = request.createdAt ? new Date(request.createdAt).toLocaleString() : "-";
        const ringDesign = request.ringDesign || {};
        const designSummary = [
          ringDesign.style,
          ringDesign.stoneShape,
          ringDesign.setting,
          request.metadata?.optionSummary
        ].filter(Boolean).join(" · ");
        const stoneSummary = [
          request.stoneCarat ? `${request.stoneCarat} ct` : "",
          request.stoneColor,
          request.stoneClarity,
          request.stoneCut
        ].filter(Boolean).join(" ");

        return `
          <tr>
            <td>${escapeHtml(createdAt)}</td>
            <td>
              <strong>${escapeHtml(request.customerName || request.fullName || "Maris Client")}</strong><br>
              <span>${escapeHtml(request.customerEmail || request.email || "-")}</span>
            </td>
            <td>
              <strong>${escapeHtml(request.productCode || "-")}</strong><br>
              <span>${escapeHtml(request.id || "-")}</span>
            </td>
            <td>${escapeHtml([designSummary, stoneSummary].filter(Boolean).join(" · ") || "-")}</td>
            <td>${escapeHtml(request.customerPhone || request.contactNumber || "-")}</td>
            <td>${escapeHtml(request.status || "pending")}</td>
          </tr>
        `;
      })
      .join("");

    elements.customRequestsTable.innerHTML = rows || `<tr><td colspan="6">No custom requests yet.</td></tr>`;
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
    renderBestSellerSettings();
    renderCatalogueDraftTable();
    renderDatabaseStatus();
    renderDatabaseProducts();
    renderLogsTable();
    renderOrdersTable();
    renderCustomRequestsTable();
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

  elements.productForm?.elements?.namedItem("imageGroupFiles")?.addEventListener("change", () => {
    applyImageGroupToProductForm(elements.productForm);
  });

  elements.productForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!ensureAdminDataReady()) {
      return;
    }

    const formData = new FormData(form);
    const sku = String(formData.get("sku")).trim().toUpperCase();
    const name = String(formData.get("name")).trim();
    const collectionName = String(formData.get("collectionName")).trim();
    const category = String(formData.get("category")).trim();
    const ringType = String(formData.get("ringType")).trim();
    const stockQty = Math.max(0, Number(formData.get("stockQty")) || 0);
    const reservedQty = Math.max(0, Number(formData.get("reservedQty")) || 0);
    const imageUploadDraft = buildProductImageUploadDraft(formData, { code: sku, name });
    const imageGroup = imageUploadDraft.smartGroup;
    const collection = imageGroup?.collectionKey || getProductFormCollectionKey(category, ringType);
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
      collectionName,
      category: getBroadCategoryLabel(collection, category),
      collection: collection || null,
      price: String(formData.get("price")).trim() || "Price on request",
      stockQty,
      reservedQty,
      status: String(formData.get("status")),
      metadata: buildProductMetadata(null, collectionName),
      createdAt: new Date().toISOString()
    };

    try {
      const payload = await fetchAdminApi("/products", {
        method: "POST",
        body: JSON.stringify(product)
      });
      await uploadProductImages(payload.product, imageUploadDraft);
      await loadAdminBackendData();
      form.reset();
      updateImageGroupSummary(form, null);
      renderAll();
      setMessage(imageUploadDraft.mainImageFile ? "Product and images saved in Supabase." : "Product saved in Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save product and images in Supabase.", true);
    }
  });

  elements.bestSellerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!ensureAdminDataReady()) {
      return;
    }

    const slotSelects = Array.from(elements.bestSellerSlots?.querySelectorAll("[data-best-seller-slot]") || []);
    const productIds = slotSelects
      .map((select) => String(select.value || "").trim())
      .filter(Boolean);
    const uniqueProductIds = Array.from(new Set(productIds));

    if (uniqueProductIds.length !== productIds.length) {
      setMessage("Choose each Best Seller product only once.", true);
      return;
    }

    setMessage("Saving Best Seller products...");

    try {
      const payload = await fetchAdminApi("/best-sellers", {
        method: "PATCH",
        body: JSON.stringify({ productIds: uniqueProductIds })
      });
      adminCache.bestSellerProductIds = Array.isArray(payload.productIds) ? payload.productIds : [];
      renderAll();
      setMessage("Best Seller carousel updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save Best Seller products.", true);
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
    const form = event.currentTarget;

    if (!ensureAdminDataReady()) {
      return;
    }

    const formData = new FormData(form);
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
      form.reset();
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

  elements.productSearch?.addEventListener("input", (event) => {
    productListState.searchTerm = String(event.currentTarget.value || "");
    productListState.page = 1;
    renderAll();
  });

  elements.productsPagination?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-products-page]");
    if (!button || button.disabled) {
      return;
    }

    productListState.page = Number(button.dataset.productsPage) || 1;
    renderAll();
  });

  elements.resetDemo?.addEventListener("click", async () => {
    await loadAdminBackendData();
    renderAll();
    setMessage(adminCache.isReady ? "Supabase admin data refreshed." : (adminCache.error || "Supabase admin data could not be refreshed."), !adminCache.isReady);
  });

  async function handleToggleStatus(productId, currentStatus) {
    if (!productId) return;
    const nextStatus = currentStatus === "active" ? "draft" : "active";
    setMessage("Updating status...");
    try {
      await fetchAdminApi(`/products?id=${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      await loadAdminBackendData();
      renderAll();
      setMessage(`Product set to ${nextStatus}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update status.", true);
    }
  }

  document.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-toggle-status]");
    if (!btn) return;
    const productId = btn.dataset.toggleStatus;
    const currentStatus = btn.dataset.currentStatus;
    await handleToggleStatus(productId, currentStatus);
  });

  if (elements.sheetCatalogueTable) {
    elements.sheetCatalogueTable.addEventListener("click", handleCatalogueTableActions);
  }

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
