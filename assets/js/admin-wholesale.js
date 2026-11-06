// Maris Admin → Wholesale tab: partner accounts, product wholesale pricing,
// and purchase orders. Talks only to the protected /api/admin/wholesale/*
// routes; the database functions behind them decide prices and transitions.
(() => {
  const root = document.querySelector("[data-wholesale-root]");
  if (!root) return;

  const API = "/api/admin/wholesale";
  const ORDER_STATUS_LABELS = {
    submitted: "Submitted",
    quoted: "Quoted",
    confirmed: "Confirmed",
    in_production: "In production",
    ready: "Ready to ship",
    shipped: "Shipped",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  const OPEN_ORDER_STATUSES = ["submitted", "quoted", "confirmed", "in_production", "ready", "shipped"];
  const ACCOUNT_STATUS_LABELS = { pending: "Pending review", approved: "Approved", rejected: "Rejected", suspended: "Suspended" };
  const PAYMENT_TERMS_LABELS = {
    prepaid: "Full payment before production",
    deposit_50: "50% deposit, balance before shipping",
    net_15: "Net 15 days",
    net_30: "Net 30 days"
  };
  const BUSINESS_TYPE_LABELS = {
    retailer: "Jewelry store / retailer",
    online_store: "Online store",
    private_label: "Private label",
    distributor: "Distributor",
    corporate_gifting: "Corporate gifting",
    other: "Other"
  };
  // Action -> [button label, statuses it may start from]. Mirrors the SQL guard.
  const ORDER_ACTIONS = {
    confirm: ["Confirm order", ["submitted", "quoted"]],
    start_production: ["Start production", ["confirmed"]],
    mark_ready: ["Mark ready to ship", ["confirmed", "in_production"]],
    ship: ["Mark shipped", ["ready"]],
    complete: ["Mark completed", ["shipped"]],
    cancel: ["Cancel order", ["submitted", "quoted", "confirmed", "in_production", "ready"]]
  };
  const MAX_PRICE_BREAKS = 10;

  const $ = (selector) => root.querySelector(selector);
  const elements = {
    tab: document.querySelector('[data-admin-tab="wholesale"]'),
    refresh: $("[data-wholesale-refresh]"),
    views: Array.from(root.querySelectorAll("[data-wholesale-view]")),
    sections: Array.from(root.querySelectorAll("[data-wholesale-section]")),
    badges: {
      orders: $('[data-wholesale-badge="orders"]'),
      accounts: $('[data-wholesale-badge="accounts"]')
    },
    orderSearch: $("[data-wholesale-order-search]"),
    orderStatus: $("[data-wholesale-order-status]"),
    orderSummary: $("[data-wholesale-order-summary]"),
    ordersTable: $("[data-wholesale-orders-table]"),
    orderDetail: $("[data-wholesale-order-detail]"),
    accountSearch: $("[data-wholesale-account-search]"),
    accountStatus: $("[data-wholesale-account-status]"),
    accountSummary: $("[data-wholesale-account-summary]"),
    accountsTable: $("[data-wholesale-accounts-table]"),
    accountDetail: $("[data-wholesale-account-detail]"),
    pricingSearch: $("[data-wholesale-pricing-search]"),
    pricingFilter: $("[data-wholesale-pricing-filter]"),
    pricingSummary: $("[data-wholesale-pricing-summary]"),
    pricingTable: $("[data-wholesale-pricing-table]"),
    pricingDetail: $("[data-wholesale-pricing-detail]"),
    message: document.querySelector("[data-admin-message]")
  };

  const state = {
    loaded: false,
    loading: false,
    error: "",
    orders: [],
    accounts: [],
    products: [],
    openOrderId: "",
    openAccountId: "",
    openProductId: "",
    busy: false
  };

  // ─── Helpers ───────────────────────────────────────────────────────────

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const moneyFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (value, currency = "THB") => (
    value === null || value === undefined ? "On request" : `${moneyFormat.format(Number(value))} ${currency}`
  );
  const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
  const dayFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
  function formatDate(value, withTime = true) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : (withTime ? dateFormat : dayFormat).format(date);
  }

  let messageTimer = 0;
  function setMessage(text, isError = false) {
    if (!elements.message) return;
    window.clearTimeout(messageTimer);
    elements.message.textContent = text;
    elements.message.classList.toggle("is-error", isError);
    elements.message.classList.toggle("is-visible", Boolean(text));
    if (text && !isError) {
      messageTimer = window.setTimeout(() => setMessage(""), 4000);
    }
  }

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: options.body ? { "Content-Type": "application/json" } : undefined
    });
    const payload = await response.json().catch(() => ({}));

    if (response.status === 401) {
      window.location.assign("/admin/login");
      throw new Error("Session expired.");
    }

    if (!response.ok) {
      const detail = Array.isArray(payload.errors) && payload.errors.length ? ` (${payload.errors.join(", ")})` : "";
      throw new Error(`${payload.error || "Request failed."}${detail}`);
    }

    return payload;
  }

  function replaceById(list, item) {
    return list.map((entry) => (entry.id === item.id ? item : entry));
  }

  // ─── Loading ───────────────────────────────────────────────────────────

  async function loadAll() {
    if (state.loading) return;
    state.loading = true;
    state.error = "";
    renderAll();

    try {
      const [orders, accounts, pricing] = await Promise.all([
        api("/orders"),
        api("/accounts"),
        api("/pricing")
      ]);
      state.orders = orders.orders || [];
      state.accounts = accounts.accounts || [];
      state.products = pricing.products || [];
      state.loaded = true;
    } catch (error) {
      state.error = error.message || "Wholesale data could not be loaded.";
    } finally {
      state.loading = false;
      renderAll();
    }
  }

  function renderAll() {
    renderBadges();
    renderOrders();
    renderAccounts();
    renderPricing();
  }

  function renderBadges() {
    const pendingAccounts = state.accounts.filter((account) => account.status === "pending").length;
    const newOrders = state.orders.filter((order) => order.status === "submitted").length;
    if (elements.badges.accounts) elements.badges.accounts.textContent = pendingAccounts ? `(${pendingAccounts} new)` : "";
    if (elements.badges.orders) elements.badges.orders.textContent = newOrders ? `(${newOrders} new)` : "";
  }

  function placeholderRow(table, text) {
    table.innerHTML = `<tr><td colspan="6">${escapeHtml(text)}</td></tr>`;
  }

  function notReady(table, summary) {
    if (state.loading && !state.loaded) {
      placeholderRow(table, "Loading wholesale data...");
      summary.textContent = "Loading...";
      return true;
    }
    if (state.error) {
      placeholderRow(table, state.error);
      summary.textContent = "Wholesale data is unavailable.";
      return true;
    }
    if (!state.loaded) {
      placeholderRow(table, "Open the Wholesale tab to load data.");
      return true;
    }
    return false;
  }

  // ─── Orders ────────────────────────────────────────────────────────────

  function filteredOrders() {
    const term = String(elements.orderSearch?.value || "").trim().toLowerCase();
    const status = elements.orderStatus?.value || "open";
    return state.orders.filter((order) => {
      if (status === "open" && !OPEN_ORDER_STATUSES.includes(order.status)) return false;
      if (status !== "open" && status !== "all" && order.status !== status) return false;
      if (!term) return true;
      const haystack = [order.orderNumber, order.companyName, order.contactName, order.customerReference,
        ...order.items.map((item) => `${item.sku} ${item.name}`)].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }

  function renderOrders() {
    const table = elements.ordersTable;
    if (!table || notReady(table, elements.orderSummary)) {
      renderOrderDetail();
      return;
    }

    const list = filteredOrders();
    table.innerHTML = list.map((order) => `
      <tr>
        <td>
          <strong>${escapeHtml(order.orderNumber)}</strong><br>
          <span>${escapeHtml(formatDate(order.submittedAt))}</span>
          ${order.customerReference ? `<br><span>PO: ${escapeHtml(order.customerReference)}</span>` : ""}
        </td>
        <td>
          <strong>${escapeHtml(order.companyName || "-")}</strong><br>
          <span>${escapeHtml(order.contactName)} ${escapeHtml(order.contactPhone)}</span><br>
          <span>${escapeHtml(order.customerEmail)}</span>
        </td>
        <td>${order.items.length} line${order.items.length === 1 ? "" : "s"} · ${order.items.reduce((sum, item) => sum + item.quantity, 0)} pcs</td>
        <td>${order.hasUnpricedItems ? "<strong>Needs quote</strong>" : escapeHtml(money(order.totalAmount, order.currency))}</td>
        <td><span class="custom-request-status" data-status="${escapeHtml(order.status)}">${escapeHtml(ORDER_STATUS_LABELS[order.status] || order.status)}</span></td>
        <td><div class="admin-row-actions"><button type="button" data-wholesale-open-order="${escapeHtml(order.id)}">Open</button></div></td>
      </tr>
    `).join("") || `<tr><td colspan="6">No purchase orders match these filters.</td></tr>`;
    elements.orderSummary.textContent = `Showing ${list.length} of ${state.orders.length} orders`;
    renderOrderDetail();
  }

  function renderOrderDetail() {
    const panel = elements.orderDetail;
    if (!panel) return;
    const order = state.orders.find((entry) => entry.id === state.openOrderId);

    if (!order) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }

    const canQuote = ["submitted", "quoted"].includes(order.status);
    const actions = Object.entries(ORDER_ACTIONS)
      .filter(([, [, from]]) => from.includes(order.status))
      .map(([action, [label]]) => `<button type="button" class="${action === "cancel" ? "admin-secondary" : "admin-primary"}" data-wholesale-order-action="${action}">${escapeHtml(label)}</button>`)
      .join("");

    const itemRows = order.items.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.sku)}</strong><br><span>${escapeHtml(item.name)}</span></td>
        <td>${item.quantity}</td>
        <td>${escapeHtml(money(item.listUnitPrice, order.currency))}</td>
        <td>
          ${canQuote
            ? `<input type="number" min="0" step="0.01" inputmode="decimal" aria-label="Unit price for ${escapeHtml(item.sku)}" data-wholesale-quote-item="${escapeHtml(item.id)}" value="${item.unitPrice === null ? "" : escapeHtml(item.unitPrice)}" placeholder="Set price">`
            : escapeHtml(money(item.unitPrice, order.currency))}
        </td>
        <td>${escapeHtml(item.lineTotal === null ? "-" : money(item.lineTotal, order.currency))}</td>
      </tr>
    `).join("");

    const history = order.history.slice().reverse().map((entry) => `
      <li>
        <strong>${escapeHtml(entry.fromStatus === entry.toStatus ? "Internal note" : ORDER_STATUS_LABELS[entry.toStatus] || entry.toStatus)}</strong>
        <span>${escapeHtml(formatDate(entry.at))} · ${escapeHtml(entry.actor || "-")}</span>
        ${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ""}
      </li>
    `).join("");

    panel.hidden = false;
    panel.innerHTML = `
      <div class="custom-request-detail-head">
        <div>
          <p class="admin-kicker">Purchase order</p>
          <h3>${escapeHtml(order.orderNumber)} · ${escapeHtml(order.companyName)}</h3>
          <p><span class="custom-request-status" data-status="${escapeHtml(order.status)}">${escapeHtml(ORDER_STATUS_LABELS[order.status])}</span>
            · Account discount ${escapeHtml(order.discountPercent)}% · ${escapeHtml(PAYMENT_TERMS_LABELS[order.paymentTerms] || order.paymentTerms)}</p>
        </div>
        <button type="button" class="admin-secondary" data-wholesale-close="order">Close</button>
      </div>

      <dl class="admin-wholesale-facts">
        <div><dt>Contact</dt><dd>${escapeHtml(order.contactName)} · ${escapeHtml(order.contactPhone)}<br>${escapeHtml(order.customerEmail)}</dd></div>
        <div><dt>Ship to</dt><dd class="admin-wholesale-preline">${escapeHtml(order.shippingAddress)}</dd></div>
        <div><dt>Customer PO</dt><dd>${escapeHtml(order.customerReference || "-")}</dd></div>
        <div><dt>Requested ship date</dt><dd>${escapeHtml(order.requestedShipDate ? formatDate(order.requestedShipDate, false) : "-")}</dd></div>
        ${order.customerNote ? `<div class="admin-wholesale-wide"><dt>Customer note</dt><dd class="admin-wholesale-preline">${escapeHtml(order.customerNote)}</dd></div>` : ""}
        ${order.trackingNumber ? `<div><dt>Tracking</dt><dd>${escapeHtml(order.trackingNumber)}</dd></div>` : ""}
        ${order.quoteValidUntil ? `<div><dt>Quote valid until</dt><dd>${escapeHtml(formatDate(order.quoteValidUntil, false))}</dd></div>` : ""}
      </dl>

      <form data-wholesale-quote-form>
        <div class="admin-table-wrap">
          <table class="custom-request-table">
            <thead><tr><th>Piece</th><th>Qty</th><th>List price</th><th>Unit price (after discount)</th><th>Line total</th></tr></thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr><th colspan="4">Subtotal</th><td>${escapeHtml(money(order.subtotalAmount, order.currency))}</td></tr>
              <tr><th colspan="4">Discount</th><td>${canQuote ? `<input type="number" min="0" step="0.01" name="discountAmount" aria-label="Extra discount" value="${escapeHtml(order.discountAmount)}">` : escapeHtml(money(order.discountAmount, order.currency))}</td></tr>
              <tr><th colspan="4">Shipping</th><td>${canQuote ? `<input type="number" min="0" step="0.01" name="shippingAmount" aria-label="Shipping" value="${escapeHtml(order.shippingAmount)}">` : escapeHtml(money(order.shippingAmount, order.currency))}</td></tr>
              <tr><th colspan="4">Total</th><td><strong>${order.hasUnpricedItems ? "Needs quote" : escapeHtml(money(order.totalAmount, order.currency))}</strong></td></tr>
            </tfoot>
          </table>
        </div>
        ${canQuote ? `
          <div class="admin-wholesale-inline">
            <label>Quote valid until <input type="date" name="quoteValidUntil" value="${escapeHtml(order.quoteValidUntil || "")}"></label>
            <label class="admin-wholesale-grow">Message to partner (shown in their timeline)
              <input type="text" name="note" maxlength="1000" placeholder="e.g. Price includes 18K white gold, lead time 21 days">
            </label>
            <button type="submit" class="admin-primary">${order.status === "quoted" ? "Update quote" : "Send quote"}</button>
          </div>
          <p class="admin-inline-note">The partner accepts the quote in their portal, which confirms the order. Use "Confirm order" only when they agreed another way.</p>
        ` : ""}
      </form>

      <div class="admin-wholesale-inline">
        <label class="admin-wholesale-grow">Note for this step (shown to the partner with a status change)
          <input type="text" maxlength="1000" data-wholesale-action-note>
        </label>
        ${order.status === "ready" ? `<label>Tracking number <input type="text" maxlength="120" data-wholesale-tracking></label>` : ""}
      </div>
      <div class="admin-form-actions">${actions || "<span>No further status changes.</span>"}</div>

      <div class="admin-wholesale-inline">
        <label class="admin-wholesale-grow">Internal note (not shown to the partner)
          <input type="text" maxlength="1000" data-wholesale-internal-note>
        </label>
        <button type="button" class="admin-secondary" data-wholesale-order-action="note">Add note</button>
      </div>

      <h4>History</h4>
      <ol class="custom-request-history">${history || "<li>No history yet.</li>"}</ol>
    `;
  }

  async function runOrderAction(order, body, successText) {
    if (state.busy) return;
    state.busy = true;
    try {
      const payload = await api(`/orders?id=${encodeURIComponent(order.id)}`, { method: "PATCH", body: JSON.stringify(body) });
      if (payload.order) state.orders = replaceById(state.orders, payload.order);
      setMessage(successText);
      renderAll();
    } catch (error) {
      setMessage(error.message, true);
    } finally {
      state.busy = false;
    }
  }

  elements.ordersTable?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-wholesale-open-order]");
    if (!button) return;
    state.openOrderId = button.dataset.wholesaleOpenOrder;
    renderOrderDetail();
    elements.orderDetail.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elements.orderDetail?.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-wholesale-quote-form]");
    if (!form) return;
    event.preventDefault();
    const order = state.orders.find((entry) => entry.id === state.openOrderId);
    if (!order) return;

    const items = Array.from(form.querySelectorAll("[data-wholesale-quote-item]")).map((input) => ({
      id: input.dataset.wholesaleQuoteItem,
      unitPrice: input.value
    }));

    if (items.some((item) => item.unitPrice === "")) {
      setMessage("Set a unit price on every line before sending the quote.", true);
      return;
    }

    const data = new FormData(form);
    runOrderAction(order, {
      action: "quote",
      items,
      shippingAmount: data.get("shippingAmount"),
      discountAmount: data.get("discountAmount"),
      quoteValidUntil: data.get("quoteValidUntil"),
      note: data.get("note")
    }, `Quote saved for ${order.orderNumber}.`);
  });

  elements.orderDetail?.addEventListener("click", (event) => {
    if (event.target.closest('[data-wholesale-close="order"]')) {
      state.openOrderId = "";
      renderOrderDetail();
      return;
    }

    const button = event.target.closest("[data-wholesale-order-action]");
    if (!button) return;
    const order = state.orders.find((entry) => entry.id === state.openOrderId);
    if (!order) return;

    const action = button.dataset.wholesaleOrderAction;
    const panel = elements.orderDetail;
    const note = action === "note"
      ? panel.querySelector("[data-wholesale-internal-note]")?.value || ""
      : panel.querySelector("[data-wholesale-action-note]")?.value || "";

    if (action === "note" && !note.trim()) {
      setMessage("Write the note first.", true);
      return;
    }
    if (action === "cancel" && !window.confirm(`Cancel ${order.orderNumber}? The partner will see it as cancelled.`)) return;

    runOrderAction(order, {
      action,
      note,
      trackingNumber: panel.querySelector("[data-wholesale-tracking]")?.value || ""
    }, action === "note" ? "Note added." : `${order.orderNumber} updated.`);
  });

  // ─── Accounts ──────────────────────────────────────────────────────────

  function filteredAccounts() {
    const term = String(elements.accountSearch?.value || "").trim().toLowerCase();
    const status = elements.accountStatus?.value || "all";
    return state.accounts.filter((account) => (
      (status === "all" || account.status === status)
      && (!term || [account.companyName, account.contactName, account.contactPhone, account.customerEmail, account.taxId]
        .join(" ").toLowerCase().includes(term))
    ));
  }

  function renderAccounts() {
    const table = elements.accountsTable;
    if (!table || notReady(table, elements.accountSummary)) {
      renderAccountDetail();
      return;
    }

    const list = filteredAccounts();
    table.innerHTML = list.map((account) => `
      <tr>
        <td>${escapeHtml(formatDate(account.createdAt))}</td>
        <td><strong>${escapeHtml(account.companyName)}</strong><br><span>${escapeHtml(BUSINESS_TYPE_LABELS[account.businessType] || account.businessType)}</span></td>
        <td>${escapeHtml(account.contactName)}<br><span>${escapeHtml(account.customerEmail)}</span><br><span>${escapeHtml(account.contactPhone)}</span></td>
        <td>${escapeHtml(account.discountPercent)}% off<br><span>${escapeHtml(PAYMENT_TERMS_LABELS[account.paymentTerms] || account.paymentTerms)}</span></td>
        <td><span class="custom-request-status" data-status="${escapeHtml(account.status)}">${escapeHtml(ACCOUNT_STATUS_LABELS[account.status] || account.status)}</span></td>
        <td><div class="admin-row-actions"><button type="button" data-wholesale-open-account="${escapeHtml(account.id)}">Review</button></div></td>
      </tr>
    `).join("") || `<tr><td colspan="6">No accounts match these filters.</td></tr>`;
    elements.accountSummary.textContent = `Showing ${list.length} of ${state.accounts.length} accounts`;
    renderAccountDetail();
  }

  function renderAccountDetail() {
    const panel = elements.accountDetail;
    if (!panel) return;
    const account = state.accounts.find((entry) => entry.id === state.openAccountId);

    if (!account) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }

    const option = (map, value) => Object.entries(map)
      .map(([key, label]) => `<option value="${escapeHtml(key)}"${key === value ? " selected" : ""}>${escapeHtml(label)}</option>`)
      .join("");

    panel.hidden = false;
    panel.innerHTML = `
      <div class="custom-request-detail-head">
        <div>
          <p class="admin-kicker">Wholesale account</p>
          <h3>${escapeHtml(account.companyName)}</h3>
          <p>Applied ${escapeHtml(formatDate(account.createdAt))}${account.reviewedAt ? ` · Last reviewed ${escapeHtml(formatDate(account.reviewedAt))} by ${escapeHtml(account.reviewedBy || "-")}` : ""}</p>
        </div>
        <button type="button" class="admin-secondary" data-wholesale-close="account">Close</button>
      </div>

      <dl class="admin-wholesale-facts">
        <div><dt>Business type</dt><dd>${escapeHtml(BUSINESS_TYPE_LABELS[account.businessType] || account.businessType)}</dd></div>
        <div><dt>Tax ID</dt><dd>${escapeHtml(account.taxId || "-")}</dd></div>
        <div><dt>Contact</dt><dd>${escapeHtml(account.contactName)} · ${escapeHtml(account.contactPhone)}${account.lineId ? `<br>LINE: ${escapeHtml(account.lineId)}` : ""}<br>${escapeHtml(account.customerEmail)}</dd></div>
        <div><dt>Country</dt><dd>${escapeHtml(account.country)}</dd></div>
        <div><dt>Website</dt><dd>${account.website ? `<a href="${escapeHtml(account.website)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(account.website)}</a>` : "-"}</dd></div>
        <div><dt>Expected volume</dt><dd>${escapeHtml(account.expectedMonthlyVolume || "-")}</dd></div>
        <div><dt>Categories</dt><dd>${escapeHtml(account.interestedCategories.join(", ") || "-")}</dd></div>
        <div class="admin-wholesale-wide"><dt>Address</dt><dd class="admin-wholesale-preline">${escapeHtml(account.businessAddress)}</dd></div>
        ${account.applicantNote ? `<div class="admin-wholesale-wide"><dt>Applicant note</dt><dd class="admin-wholesale-preline">${escapeHtml(account.applicantNote)}</dd></div>` : ""}
      </dl>

      <form class="admin-form" data-wholesale-account-form>
        <label>Status<select name="status">${option(ACCOUNT_STATUS_LABELS, account.status)}</select></label>
        <label>Account discount (%)<input type="number" name="discountPercent" min="0" max="90" step="0.5" value="${escapeHtml(account.discountPercent)}"></label>
        <label>Payment terms<select name="paymentTerms">${option(PAYMENT_TERMS_LABELS, account.paymentTerms)}</select></label>
        <label class="admin-wholesale-wide">Internal note<textarea name="adminNote" rows="3" maxlength="1000">${escapeHtml(account.adminNote)}</textarea></label>
        <div class="admin-form-actions"><button type="submit" class="admin-primary">Save account</button></div>
        <p class="admin-inline-note">The discount applies to every wholesale price this partner sees, on top of price breaks. Only approved accounts can see prices and order.</p>
      </form>
    `;
  }

  elements.accountsTable?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-wholesale-open-account]");
    if (!button) return;
    state.openAccountId = button.dataset.wholesaleOpenAccount;
    renderAccountDetail();
    elements.accountDetail.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elements.accountDetail?.addEventListener("click", (event) => {
    if (event.target.closest('[data-wholesale-close="account"]')) {
      state.openAccountId = "";
      renderAccountDetail();
    }
  });

  elements.accountDetail?.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-wholesale-account-form]");
    if (!form || state.busy) return;
    event.preventDefault();
    const account = state.accounts.find((entry) => entry.id === state.openAccountId);
    if (!account) return;

    const data = new FormData(form);
    state.busy = true;
    try {
      const payload = await api(`/accounts?id=${encodeURIComponent(account.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: data.get("status"),
          discountPercent: data.get("discountPercent"),
          paymentTerms: data.get("paymentTerms"),
          adminNote: data.get("adminNote")
        })
      });
      state.accounts = replaceById(state.accounts, payload.account);
      setMessage(`${payload.account.companyName} saved.`);
      renderAll();
    } catch (error) {
      setMessage(error.message, true);
    } finally {
      state.busy = false;
    }
  });

  // ─── Pricing ───────────────────────────────────────────────────────────

  function filteredProducts() {
    const term = String(elements.pricingSearch?.value || "").trim().toLowerCase();
    const filter = elements.pricingFilter?.value || "all";
    return state.products.filter((product) => (
      (filter === "all" || (filter === "enabled") === product.wholesale.isEnabled)
      && (!term || `${product.sku} ${product.name} ${product.collectionName}`.toLowerCase().includes(term))
    ));
  }

  function breaksSummary(product) {
    const breaks = product.wholesale.priceBreaks;
    if (!breaks.length) return product.basePrice ? "Retail price" : "On request";
    return breaks.map((entry) => `${entry.minQuantity}+ → ${moneyFormat.format(entry.unitPrice)}`).join("<br>");
  }

  function renderPricing() {
    const table = elements.pricingTable;
    if (!table || notReady(table, elements.pricingSummary)) {
      renderPricingDetail();
      return;
    }

    const list = filteredProducts();
    table.innerHTML = list.map((product) => `
      <tr>
        <td><strong>${escapeHtml(product.sku)}</strong><br><span>${escapeHtml(product.name)}</span>${product.status !== "active" ? `<br><span>(${escapeHtml(product.status)})</span>` : ""}</td>
        <td>${escapeHtml(money(product.basePrice))}</td>
        <td><span class="custom-request-status" data-status="${product.wholesale.isEnabled ? "completed" : "cancelled"}">${product.wholesale.isEnabled ? "On" : "Off"}</span></td>
        <td>${product.wholesale.minimumOrderQuantity} / ${product.wholesale.casePack}</td>
        <td>${breaksSummary(product)}</td>
        <td><div class="admin-row-actions"><button type="button" data-wholesale-open-product="${escapeHtml(product.id)}">Edit</button></div></td>
      </tr>
    `).join("") || `<tr><td colspan="6">No products match.</td></tr>`;
    const enabled = state.products.filter((product) => product.wholesale.isEnabled).length;
    elements.pricingSummary.textContent = `Showing ${list.length} of ${state.products.length} products · ${enabled} sold wholesale`;
    renderPricingDetail();
  }

  function breakRow(entry = {}) {
    return `
      <div class="admin-wholesale-break" data-wholesale-break>
        <label>From qty<input type="number" min="1" step="1" data-break-qty value="${escapeHtml(entry.minQuantity ?? "")}"></label>
        <label>Unit price (THB)<input type="number" min="0.01" step="0.01" data-break-price value="${escapeHtml(entry.unitPrice ?? "")}"></label>
        <button type="button" class="admin-secondary" data-wholesale-remove-break aria-label="Remove price break">Remove</button>
      </div>
    `;
  }

  function renderPricingDetail() {
    const panel = elements.pricingDetail;
    if (!panel) return;
    const product = state.products.find((entry) => entry.id === state.openProductId);

    if (!product) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }

    const terms = product.wholesale;
    panel.hidden = false;
    panel.innerHTML = `
      <div class="custom-request-detail-head">
        <div>
          <p class="admin-kicker">Wholesale terms</p>
          <h3>${escapeHtml(product.sku)} · ${escapeHtml(product.name)}</h3>
          <p>Retail price: ${escapeHtml(money(product.basePrice))}</p>
        </div>
        <button type="button" class="admin-secondary" data-wholesale-close="product">Close</button>
      </div>

      <form class="admin-form" data-wholesale-pricing-form>
        <label class="admin-wholesale-check"><input type="checkbox" name="isEnabled"${terms.isEnabled ? " checked" : ""}> Sell this piece wholesale</label>
        <label>Minimum order quantity<input type="number" name="minimumOrderQuantity" min="1" step="1" value="${escapeHtml(terms.minimumOrderQuantity)}" required></label>
        <label>Case pack (order in multiples of)<input type="number" name="casePack" min="1" step="1" value="${escapeHtml(terms.casePack)}" required></label>
        <label>Lead time (days)<input type="number" name="leadTimeDays" min="0" max="365" step="1" value="${escapeHtml(terms.leadTimeDays ?? "")}"></label>
        <label class="admin-wholesale-wide">Note shown to partners<input type="text" name="note" maxlength="500" value="${escapeHtml(terms.note)}" placeholder="e.g. Price for 18K; platinum quoted on request"></label>

        <fieldset class="admin-wholesale-wide admin-wholesale-breaks">
          <legend>Price breaks (before the partner's account discount)</legend>
          <p class="admin-inline-note">Leave empty to use the retail price. With no retail price either, partners see "Price on request" and you quote each order.</p>
          <div data-wholesale-breaks>${terms.priceBreaks.map(breakRow).join("")}</div>
          <button type="button" class="admin-secondary" data-wholesale-add-break>Add price break</button>
        </fieldset>

        <div class="admin-form-actions"><button type="submit" class="admin-primary">Save wholesale terms</button></div>
      </form>
    `;
  }

  elements.pricingTable?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-wholesale-open-product]");
    if (!button) return;
    state.openProductId = button.dataset.wholesaleOpenProduct;
    renderPricingDetail();
    elements.pricingDetail.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elements.pricingDetail?.addEventListener("click", (event) => {
    if (event.target.closest('[data-wholesale-close="product"]')) {
      state.openProductId = "";
      renderPricingDetail();
      return;
    }

    const container = elements.pricingDetail.querySelector("[data-wholesale-breaks]");

    if (event.target.closest("[data-wholesale-add-break]")) {
      if (container.querySelectorAll("[data-wholesale-break]").length >= MAX_PRICE_BREAKS) {
        setMessage(`At most ${MAX_PRICE_BREAKS} price breaks.`, true);
        return;
      }
      container.insertAdjacentHTML("beforeend", breakRow());
      container.lastElementChild?.querySelector("input")?.focus();
      return;
    }

    const remove = event.target.closest("[data-wholesale-remove-break]");
    if (remove) remove.closest("[data-wholesale-break]")?.remove();
  });

  elements.pricingDetail?.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-wholesale-pricing-form]");
    if (!form || state.busy) return;
    event.preventDefault();
    const product = state.products.find((entry) => entry.id === state.openProductId);
    if (!product) return;

    const data = new FormData(form);
    const priceBreaks = Array.from(form.querySelectorAll("[data-wholesale-break]"))
      .map((row) => ({
        minQuantity: row.querySelector("[data-break-qty]").value,
        unitPrice: row.querySelector("[data-break-price]").value
      }))
      .filter((entry) => entry.minQuantity !== "" || entry.unitPrice !== "");

    state.busy = true;
    try {
      const payload = await api(`/pricing?productId=${encodeURIComponent(product.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          isEnabled: data.get("isEnabled") === "on",
          minimumOrderQuantity: data.get("minimumOrderQuantity"),
          casePack: data.get("casePack"),
          leadTimeDays: data.get("leadTimeDays"),
          note: data.get("note"),
          priceBreaks
        })
      });
      if (payload.product) state.products = replaceById(state.products, payload.product);
      setMessage(`Wholesale terms saved for ${product.sku}.`);
      renderAll();
    } catch (error) {
      const hints = {
        priceBreaksOrder: "a bigger quantity cannot have a higher unit price",
        priceBreaksDuplicate: "each break needs a different quantity"
      };
      const text = Object.entries(hints).reduce((message, [code, hint]) => message.replace(code, hint), error.message);
      setMessage(text, true);
    } finally {
      state.busy = false;
    }
  });

  // ─── Views and wiring ──────────────────────────────────────────────────

  function showView(name) {
    elements.views.forEach((button) => {
      const isActive = button.dataset.wholesaleView === name;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    elements.sections.forEach((section) => {
      section.hidden = section.dataset.wholesaleSection !== name;
    });
  }

  elements.views.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.wholesaleView));
  });

  elements.orderSearch?.addEventListener("input", renderOrders);
  elements.orderStatus?.addEventListener("change", renderOrders);
  elements.accountSearch?.addEventListener("input", renderAccounts);
  elements.accountStatus?.addEventListener("change", renderAccounts);
  elements.pricingSearch?.addEventListener("input", renderPricing);
  elements.pricingFilter?.addEventListener("change", renderPricing);
  elements.refresh?.addEventListener("click", loadAll);

  // Load on first visit to the tab, so the rest of the admin is not slowed down.
  elements.tab?.addEventListener("click", () => {
    if (!state.loaded && !state.loading) loadAll();
  });
})();
