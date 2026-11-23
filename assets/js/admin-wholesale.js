// Maris Admin → Wholesale tab: partner accounts, product wholesale pricing,
// and purchase orders. Talks only to the protected /api/admin/wholesale/*
// routes; the database functions behind them decide prices and transitions.
(() => {
  const root = document.querySelector("[data-wholesale-root]");
  if (!root) return;

  // Text and formats come from the server-injected dictionary
  // (app/lib/admin-i18n.js -> window.MARIS_ADMIN_I18N, window.marisAdminT).
  const t = window.marisAdminT || ((key) => key);
  const tp = window.marisAdminT?.plural || ((key) => key);
  const locale = window.MARIS_ADMIN_I18N?.locale || "en-GB";

  const API = "/api/admin/wholesale";
  const ORDER_STATUS_LABELS = {
    submitted: t("wholesale.status.submitted"),
    quoted: t("wholesale.status.quoted"),
    confirmed: t("wholesale.status.confirmed"),
    in_production: t("wholesale.status.in_production"),
    ready: t("wholesale.status.ready"),
    shipped: t("wholesale.status.shipped"),
    completed: t("wholesale.status.completed"),
    cancelled: t("wholesale.status.cancelled")
  };
  const OPEN_ORDER_STATUSES = ["submitted", "quoted", "confirmed", "in_production", "ready", "shipped"];
  const ACCOUNT_STATUS_LABELS = {
    pending: t("wholesale.account.pending"),
    approved: t("wholesale.account.approved"),
    rejected: t("wholesale.account.rejected"),
    suspended: t("wholesale.account.suspended")
  };
  const PAYMENT_TERMS_LABELS = {
    prepaid: t("wholesale.terms.prepaid"),
    deposit_50: t("wholesale.terms.deposit_50"),
    net_15: t("wholesale.terms.net_15"),
    net_30: t("wholesale.terms.net_30")
  };
  const BUSINESS_TYPE_LABELS = {
    retailer: t("wholesale.business.retailer"),
    online_store: t("wholesale.business.online_store"),
    private_label: t("wholesale.business.private_label"),
    distributor: t("wholesale.business.distributor"),
    corporate_gifting: t("wholesale.business.corporate_gifting"),
    other: t("wholesale.business.other")
  };
  // Action -> [button label, statuses it may start from]. Mirrors the SQL guard.
  const ORDER_ACTIONS = {
    confirm: [t("wholesale.action.confirm"), ["submitted", "quoted"]],
    start_production: [t("wholesale.action.start_production"), ["confirmed"]],
    mark_ready: [t("wholesale.action.mark_ready"), ["confirmed", "in_production"]],
    ship: [t("wholesale.action.ship"), ["ready"]],
    complete: [t("wholesale.action.complete"), ["shipped"]],
    cancel: [t("wholesale.action.cancel"), ["submitted", "quoted", "confirmed", "in_production", "ready"]]
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
    errors: {},
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

  const moneyFormat = new Intl.NumberFormat(locale === "th-TH" ? locale : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (value, currency = "THB") => (
    value === null || value === undefined ? t("wholesale.onRequest") : `${moneyFormat.format(Number(value))} ${currency}`
  );
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const dayFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
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

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: options.body ? { "Content-Type": "application/json" } : undefined
    });
    const payload = await response.json().catch(() => ({}));

    const authMessage = describeAuthFailure(response.status);
    if (authMessage) {
      const authError = new Error(authMessage);
      authError.status = response.status;
      throw authError;
    }

    if (!response.ok) {
      const detail = Array.isArray(payload.errors) && payload.errors.length ? ` (${payload.errors.join(", ")})` : "";
      throw new Error(`${payload.error || t("wholesale.requestFailed")}${detail}`);
    }

    return payload;
  }

  // Disables the controls the signed-in role cannot use (shared with admin-page.js).
  function applyRolePermissions(container) {
    window.MARIS_ADMIN_PERMISSIONS?.apply(container);
  }

  function replaceById(list, item) {
    return list.map((entry) => (entry.id === item.id ? item : entry));
  }

  // ─── Loading ───────────────────────────────────────────────────────────

  // Each section loads on its own: one failing endpoint leaves the other two usable.
  const SECTIONS = {
    orders: { label: t("wholesale.section.orders"), load: async () => { state.orders = (await api("/orders")).orders || []; } },
    accounts: { label: t("wholesale.section.accounts"), load: async () => { state.accounts = (await api("/accounts")).accounts || []; } },
    pricing: { label: t("wholesale.section.pricing"), load: async () => { state.products = (await api("/pricing")).products || []; } }
  };

  async function loadAll(names = Object.keys(SECTIONS)) {
    if (state.loading) return;
    const wanted = Array.isArray(names) ? names : Object.keys(SECTIONS);
    state.loading = true;
    renderAll();

    try {
      const results = await Promise.allSettled(wanted.map((name) => SECTIONS[name].load()));
      results.forEach((result, index) => {
        const name = wanted[index];
        state.errors[name] = result.status === "fulfilled"
          ? ""
          : (result.reason?.message || t("wholesale.couldNotBeLoaded", { label: SECTIONS[name].label }));
      });
      state.loaded = true;
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
    if (elements.badges.accounts) elements.badges.accounts.textContent = pendingAccounts ? t("wholesale.badgeNew", { n: pendingAccounts }) : "";
    if (elements.badges.orders) elements.badges.orders.textContent = newOrders ? t("wholesale.badgeNew", { n: newOrders }) : "";
  }

  function productStatusLabel(status) {
    const key = `status.product.${status}`;
    const label = t(key);
    return label === key ? status : label;
  }

  function placeholderRow(table, text) {
    table.innerHTML = `<tr><td colspan="6">${escapeHtml(text)}</td></tr>`;
  }

  function notReady(table, summary, section) {
    if (state.loading && !state.loaded) {
      placeholderRow(table, t("wholesale.loading"));
      summary.textContent = t("common.loading");
      return true;
    }
    if (state.errors[section]) {
      const label = SECTIONS[section].label;
      table.innerHTML = `<tr><td colspan="6">${escapeHtml(t("wholesale.loadFailed", { label, message: state.errors[section] }))} <button type="button" class="admin-secondary" data-wholesale-retry="${section}">${escapeHtml(t("common.retry"))}</button></td></tr>`;
      summary.textContent = t("wholesale.unavailable", { label });
      return true;
    }
    if (!state.loaded) {
      placeholderRow(table, t("wholesale.openTab"));
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
    if (!table || notReady(table, elements.orderSummary, "orders")) {
      renderOrderDetail();
      return;
    }

    const list = filteredOrders();
    table.innerHTML = list.map((order) => `
      <tr>
        <td>
          <strong>${escapeHtml(order.orderNumber)}</strong><br>
          <span>${escapeHtml(formatDate(order.submittedAt))}</span>
          ${order.customerReference ? `<br><span>${escapeHtml(t("wholesale.po", { ref: order.customerReference }))}</span>` : ""}
        </td>
        <td>
          <strong>${escapeHtml(order.companyName || "-")}</strong><br>
          <span>${escapeHtml(order.contactName)} ${escapeHtml(order.contactPhone)}</span><br>
          <span>${escapeHtml(order.customerEmail)}</span>
        </td>
        <td>${escapeHtml(tp("wholesale.lines", order.items.length, { n: order.items.length }))} · ${escapeHtml(t("wholesale.pcs", { n: order.items.reduce((sum, item) => sum + item.quantity, 0) }))}</td>
        <td>${order.hasUnpricedItems ? `<strong>${escapeHtml(t("wholesale.needsQuote"))}</strong>` : escapeHtml(money(order.totalAmount, order.currency))}</td>
        <td><span class="custom-request-status" data-status="${escapeHtml(order.status)}">${escapeHtml(ORDER_STATUS_LABELS[order.status] || order.status)}</span></td>
        <td><div class="admin-row-actions"><button type="button" data-wholesale-open-order="${escapeHtml(order.id)}">${escapeHtml(t("common.open"))}</button></div></td>
      </tr>
    `).join("") || `<tr><td colspan="6">${escapeHtml(t("wholesale.orders.noMatch"))}</td></tr>`;
    elements.orderSummary.textContent = t("wholesale.orders.showing", { shown: list.length, total: state.orders.length });
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
      .map(([action, [label]]) => `<button type="button" class="${action === "cancel" ? "admin-secondary" : "admin-primary"}" data-wholesale-order-action="${action}" data-requires="operations:write">${escapeHtml(label)}</button>`)
      .join("");

    const itemRows = order.items.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.sku)}</strong><br><span>${escapeHtml(item.name)}</span></td>
        <td>${item.quantity}</td>
        <td>${escapeHtml(money(item.listUnitPrice, order.currency))}</td>
        <td>
          ${canQuote
            ? `<input type="number" min="0" step="0.01" inputmode="decimal" aria-label="${escapeHtml(t("wholesale.unitPriceFor", { sku: item.sku }))}" data-wholesale-quote-item="${escapeHtml(item.id)}" value="${item.unitPrice === null ? "" : escapeHtml(item.unitPrice)}" placeholder="${escapeHtml(t("wholesale.setPrice"))}">`
            : escapeHtml(money(item.unitPrice, order.currency))}
        </td>
        <td>${escapeHtml(item.lineTotal === null ? "-" : money(item.lineTotal, order.currency))}</td>
      </tr>
    `).join("");

    const history = order.history.slice().reverse().map((entry) => `
      <li>
        <strong>${escapeHtml(entry.fromStatus === entry.toStatus ? t("wholesale.internalNote") : ORDER_STATUS_LABELS[entry.toStatus] || entry.toStatus)}</strong>
        <span>${escapeHtml(formatDate(entry.at))} · ${escapeHtml(entry.actor || "-")}</span>
        ${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ""}
      </li>
    `).join("");

    panel.hidden = false;
    panel.innerHTML = `
      <div class="custom-request-detail-head">
        <div>
          <p class="admin-kicker">${escapeHtml(t("wholesale.purchaseOrder"))}</p>
          <h3>${escapeHtml(order.orderNumber)} · ${escapeHtml(order.companyName)}</h3>
          <p><span class="custom-request-status" data-status="${escapeHtml(order.status)}">${escapeHtml(ORDER_STATUS_LABELS[order.status])}</span>
            · ${escapeHtml(t("wholesale.accountDiscount", { percent: order.discountPercent }))} · ${escapeHtml(PAYMENT_TERMS_LABELS[order.paymentTerms] || order.paymentTerms)}</p>
        </div>
        <button type="button" class="admin-secondary" data-wholesale-close="order">${escapeHtml(t("common.close"))}</button>
      </div>

      <dl class="admin-wholesale-facts">
        <div><dt>${escapeHtml(t("wholesale.contact"))}</dt><dd>${escapeHtml(order.contactName)} · ${escapeHtml(order.contactPhone)}<br>${escapeHtml(order.customerEmail)}</dd></div>
        <div><dt>${escapeHtml(t("wholesale.shipTo"))}</dt><dd class="admin-wholesale-preline">${escapeHtml(order.shippingAddress)}</dd></div>
        <div><dt>${escapeHtml(t("wholesale.customerPo"))}</dt><dd>${escapeHtml(order.customerReference || "-")}</dd></div>
        <div><dt>${escapeHtml(t("wholesale.requestedShipDate"))}</dt><dd>${escapeHtml(order.requestedShipDate ? formatDate(order.requestedShipDate, false) : "-")}</dd></div>
        ${order.customerNote ? `<div class="admin-wholesale-wide"><dt>${escapeHtml(t("wholesale.customerNote"))}</dt><dd class="admin-wholesale-preline">${escapeHtml(order.customerNote)}</dd></div>` : ""}
        ${order.trackingNumber ? `<div><dt>${escapeHtml(t("wholesale.tracking"))}</dt><dd>${escapeHtml(order.trackingNumber)}</dd></div>` : ""}
        ${order.quoteValidUntil ? `<div><dt>${escapeHtml(t("wholesale.quoteValidUntil"))}</dt><dd>${escapeHtml(formatDate(order.quoteValidUntil, false))}</dd></div>` : ""}
      </dl>

      <form data-wholesale-quote-form>
        <div class="admin-table-wrap">
          <table class="custom-request-table">
            <thead><tr><th>${escapeHtml(t("wholesale.col.piece"))}</th><th>${escapeHtml(t("wholesale.col.qty"))}</th><th>${escapeHtml(t("wholesale.col.listPrice"))}</th><th>${escapeHtml(t("wholesale.col.unitPrice"))}</th><th>${escapeHtml(t("wholesale.col.lineTotal"))}</th></tr></thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr><th colspan="4">${escapeHtml(t("wholesale.subtotal"))}</th><td>${escapeHtml(money(order.subtotalAmount, order.currency))}</td></tr>
              <tr><th colspan="4">${escapeHtml(t("wholesale.discount"))}</th><td>${canQuote ? `<input type="number" min="0" step="0.01" name="discountAmount" aria-label="${escapeHtml(t("wholesale.extraDiscount"))}" value="${escapeHtml(order.discountAmount)}">` : escapeHtml(money(order.discountAmount, order.currency))}</td></tr>
              <tr><th colspan="4">${escapeHtml(t("wholesale.shipping"))}</th><td>${canQuote ? `<input type="number" min="0" step="0.01" name="shippingAmount" aria-label="${escapeHtml(t("wholesale.shipping"))}" value="${escapeHtml(order.shippingAmount)}">` : escapeHtml(money(order.shippingAmount, order.currency))}</td></tr>
              <tr><th colspan="4">${escapeHtml(t("wholesale.total"))}</th><td><strong>${order.hasUnpricedItems ? escapeHtml(t("wholesale.needsQuote")) : escapeHtml(money(order.totalAmount, order.currency))}</strong></td></tr>
            </tfoot>
          </table>
        </div>
        ${canQuote ? `
          <div class="admin-wholesale-inline">
            <label>${escapeHtml(t("wholesale.quoteValidUntil"))} <input type="date" name="quoteValidUntil" value="${escapeHtml(order.quoteValidUntil || "")}"></label>
            <label class="admin-wholesale-grow">${escapeHtml(t("wholesale.messageToPartner"))}
              <input type="text" name="note" maxlength="1000" placeholder="${escapeHtml(t("wholesale.messagePlaceholder"))}">
            </label>
            <button type="submit" class="admin-primary" data-requires="catalogue:write">${escapeHtml(order.status === "quoted" ? t("wholesale.updateQuote") : t("wholesale.sendQuote"))}</button>
          </div>
          <p class="admin-inline-note">${escapeHtml(t("wholesale.quoteNote"))}</p>
        ` : ""}
      </form>

      <div class="admin-wholesale-inline">
        <label class="admin-wholesale-grow">${escapeHtml(t("wholesale.stepNote"))}
          <input type="text" maxlength="1000" data-wholesale-action-note>
        </label>
        ${order.status === "ready" ? `<label>${escapeHtml(t("wholesale.trackingNumber"))} <input type="text" maxlength="120" data-wholesale-tracking></label>` : ""}
      </div>
      <div class="admin-form-actions">${actions || `<span>${escapeHtml(t("wholesale.noFurtherChanges"))}</span>`}</div>

      <div class="admin-wholesale-inline">
        <label class="admin-wholesale-grow">${escapeHtml(t("wholesale.internalNoteLabel"))}
          <input type="text" maxlength="1000" data-wholesale-internal-note>
        </label>
        <button type="button" class="admin-secondary" data-wholesale-order-action="note" data-requires="operations:write">${escapeHtml(t("wholesale.addNote"))}</button>
      </div>

      <h4>${escapeHtml(t("wholesale.history"))}</h4>
      <ol class="custom-request-history">${history || `<li>${escapeHtml(t("wholesale.noHistory"))}</li>`}</ol>
    `;
    applyRolePermissions(panel);
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
      setMessage(t("wholesale.setEveryPrice"), true);
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
    }, t("wholesale.quoteSaved", { order: order.orderNumber }));
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
      setMessage(t("wholesale.writeNoteFirst"), true);
      return;
    }
    if (action === "cancel" && !window.confirm(t("wholesale.confirmCancel", { order: order.orderNumber }))) return;

    runOrderAction(order, {
      action,
      note,
      trackingNumber: panel.querySelector("[data-wholesale-tracking]")?.value || ""
    }, action === "note" ? t("wholesale.noteAdded") : t("wholesale.orderUpdated", { order: order.orderNumber }));
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
    if (!table || notReady(table, elements.accountSummary, "accounts")) {
      renderAccountDetail();
      return;
    }

    const list = filteredAccounts();
    table.innerHTML = list.map((account) => `
      <tr>
        <td>${escapeHtml(formatDate(account.createdAt))}</td>
        <td><strong>${escapeHtml(account.companyName)}</strong><br><span>${escapeHtml(BUSINESS_TYPE_LABELS[account.businessType] || account.businessType)}</span></td>
        <td>${escapeHtml(account.contactName)}<br><span>${escapeHtml(account.customerEmail)}</span><br><span>${escapeHtml(account.contactPhone)}</span></td>
        <td>${escapeHtml(t("wholesale.percentOff", { percent: account.discountPercent }))}<br><span>${escapeHtml(PAYMENT_TERMS_LABELS[account.paymentTerms] || account.paymentTerms)}</span></td>
        <td><span class="custom-request-status" data-status="${escapeHtml(account.status)}">${escapeHtml(ACCOUNT_STATUS_LABELS[account.status] || account.status)}</span></td>
        <td><div class="admin-row-actions"><button type="button" data-wholesale-open-account="${escapeHtml(account.id)}">${escapeHtml(t("wholesale.review"))}</button></div></td>
      </tr>
    `).join("") || `<tr><td colspan="6">${escapeHtml(t("wholesale.accounts.noMatch"))}</td></tr>`;
    elements.accountSummary.textContent = t("wholesale.accounts.showing", { shown: list.length, total: state.accounts.length });
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
          <p class="admin-kicker">${escapeHtml(t("wholesale.account.kicker"))}</p>
          <h3>${escapeHtml(account.companyName)}</h3>
          <p>${escapeHtml(t("wholesale.account.applied", { date: formatDate(account.createdAt) }))}${account.reviewedAt ? ` · ${escapeHtml(t("wholesale.account.reviewed", { date: formatDate(account.reviewedAt), by: account.reviewedBy || "-" }))}` : ""}</p>
        </div>
        <button type="button" class="admin-secondary" data-wholesale-close="account">${escapeHtml(t("common.close"))}</button>
      </div>

      <dl class="admin-wholesale-facts">
        <div><dt>${escapeHtml(t("wholesale.account.businessType"))}</dt><dd>${escapeHtml(BUSINESS_TYPE_LABELS[account.businessType] || account.businessType)}</dd></div>
        <div><dt>${escapeHtml(t("wholesale.account.taxId"))}</dt><dd>${escapeHtml(account.taxId || "-")}</dd></div>
        <div><dt>${escapeHtml(t("wholesale.contact"))}</dt><dd>${escapeHtml(account.contactName)} · ${escapeHtml(account.contactPhone)}${account.lineId ? `<br>${escapeHtml(t("wholesale.account.line", { id: account.lineId }))}` : ""}<br>${escapeHtml(account.customerEmail)}</dd></div>
        <div><dt>${escapeHtml(t("wholesale.account.country"))}</dt><dd>${escapeHtml(account.country)}</dd></div>
        <div><dt>${escapeHtml(t("wholesale.account.website"))}</dt><dd>${account.website ? `<a href="${escapeHtml(account.website)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(account.website)}</a>` : "-"}</dd></div>
        <div><dt>${escapeHtml(t("wholesale.account.expectedVolume"))}</dt><dd>${escapeHtml(account.expectedMonthlyVolume || "-")}</dd></div>
        <div><dt>${escapeHtml(t("wholesale.account.categories"))}</dt><dd>${escapeHtml(account.interestedCategories.join(", ") || "-")}</dd></div>
        <div class="admin-wholesale-wide"><dt>${escapeHtml(t("wholesale.account.address"))}</dt><dd class="admin-wholesale-preline">${escapeHtml(account.businessAddress)}</dd></div>
        ${account.applicantNote ? `<div class="admin-wholesale-wide"><dt>${escapeHtml(t("wholesale.account.applicantNote"))}</dt><dd class="admin-wholesale-preline">${escapeHtml(account.applicantNote)}</dd></div>` : ""}
      </dl>

      <form class="admin-form" data-wholesale-account-form>
        <label>${escapeHtml(t("wholesale.status"))}<select name="status">${option(ACCOUNT_STATUS_LABELS, account.status)}</select></label>
        <label>${escapeHtml(t("wholesale.account.discountLabel"))}<input type="number" name="discountPercent" min="0" max="90" step="0.5" value="${escapeHtml(account.discountPercent)}"></label>
        <label>${escapeHtml(t("wholesale.account.paymentTerms"))}<select name="paymentTerms">${option(PAYMENT_TERMS_LABELS, account.paymentTerms)}</select></label>
        <label class="admin-wholesale-wide">${escapeHtml(t("wholesale.account.internalNote"))}<textarea name="adminNote" rows="3" maxlength="1000">${escapeHtml(account.adminNote)}</textarea></label>
        <div class="admin-form-actions"><button type="submit" class="admin-primary" data-requires="catalogue:write">${escapeHtml(t("wholesale.account.save"))}</button></div>
        <p class="admin-inline-note">${escapeHtml(t("wholesale.account.discountNote"))}</p>
      </form>
    `;
    applyRolePermissions(panel);
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
      setMessage(t("wholesale.account.saved", { company: payload.account.companyName }));
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
    if (!breaks.length) return product.basePrice ? t("wholesale.retailPrice") : t("wholesale.onRequest");
    return breaks.map((entry) => `${entry.minQuantity}+ → ${moneyFormat.format(entry.unitPrice)}`).join("<br>");
  }

  function renderPricing() {
    const table = elements.pricingTable;
    if (!table || notReady(table, elements.pricingSummary, "pricing")) {
      renderPricingDetail();
      return;
    }

    const list = filteredProducts();
    table.innerHTML = list.map((product) => `
      <tr>
        <td><strong>${escapeHtml(product.sku)}</strong><br><span>${escapeHtml(product.name)}</span>${product.status !== "active" ? `<br><span>(${escapeHtml(productStatusLabel(product.status))})</span>` : ""}</td>
        <td>${escapeHtml(money(product.basePrice))}</td>
        <td><span class="custom-request-status" data-status="${product.wholesale.isEnabled ? "completed" : "cancelled"}">${escapeHtml(product.wholesale.isEnabled ? t("common.on") : t("common.off"))}</span></td>
        <td>${product.wholesale.minimumOrderQuantity} / ${product.wholesale.casePack}</td>
        <td>${breaksSummary(product)}</td>
        <td><div class="admin-row-actions"><button type="button" data-wholesale-open-product="${escapeHtml(product.id)}">${escapeHtml(t("common.edit"))}</button></div></td>
      </tr>
    `).join("") || `<tr><td colspan="6">${escapeHtml(t("wholesale.pricing.noMatch"))}</td></tr>`;
    const enabled = state.products.filter((product) => product.wholesale.isEnabled).length;
    elements.pricingSummary.textContent = t("wholesale.pricing.showing", { shown: list.length, total: state.products.length, enabled });
    renderPricingDetail();
  }

  function breakRow(entry = {}) {
    return `
      <div class="admin-wholesale-break" data-wholesale-break>
        <label>${escapeHtml(t("wholesale.break.fromQty"))}<input type="number" min="1" step="1" data-break-qty value="${escapeHtml(entry.minQuantity ?? "")}"></label>
        <label>${escapeHtml(t("wholesale.break.unitPrice"))}<input type="number" min="0.01" step="0.01" data-break-price value="${escapeHtml(entry.unitPrice ?? "")}"></label>
        <button type="button" class="admin-secondary" data-wholesale-remove-break aria-label="${escapeHtml(t("wholesale.break.removeLabel"))}">${escapeHtml(t("common.remove"))}</button>
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
          <p class="admin-kicker">${escapeHtml(t("wholesale.pricing.kicker"))}</p>
          <h3>${escapeHtml(product.sku)} · ${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(t("wholesale.pricing.retail", { price: money(product.basePrice) }))}</p>
        </div>
        <button type="button" class="admin-secondary" data-wholesale-close="product">${escapeHtml(t("common.close"))}</button>
      </div>

      <form class="admin-form" data-wholesale-pricing-form>
        <label class="admin-wholesale-check"><input type="checkbox" name="isEnabled"${terms.isEnabled ? " checked" : ""}> ${escapeHtml(t("wholesale.pricing.sellWholesale"))}</label>
        <label>${escapeHtml(t("wholesale.pricing.moq"))}<input type="number" name="minimumOrderQuantity" min="1" step="1" value="${escapeHtml(terms.minimumOrderQuantity)}" required></label>
        <label>${escapeHtml(t("wholesale.pricing.casePack"))}<input type="number" name="casePack" min="1" step="1" value="${escapeHtml(terms.casePack)}" required></label>
        <label>${escapeHtml(t("wholesale.pricing.leadTime"))}<input type="number" name="leadTimeDays" min="0" max="365" step="1" value="${escapeHtml(terms.leadTimeDays ?? "")}"></label>
        <label class="admin-wholesale-wide">${escapeHtml(t("wholesale.pricing.noteToPartners"))}<input type="text" name="note" maxlength="500" value="${escapeHtml(terms.note)}" placeholder="${escapeHtml(t("wholesale.pricing.notePlaceholder"))}"></label>

        <fieldset class="admin-wholesale-wide admin-wholesale-breaks">
          <legend>${escapeHtml(t("wholesale.pricing.breaksLegend"))}</legend>
          <p class="admin-inline-note">${escapeHtml(t("wholesale.pricing.breaksNote"))}</p>
          <div data-wholesale-breaks>${terms.priceBreaks.map(breakRow).join("")}</div>
          <button type="button" class="admin-secondary" data-wholesale-add-break>${escapeHtml(t("wholesale.pricing.addBreak"))}</button>
        </fieldset>

        <div class="admin-form-actions"><button type="submit" class="admin-primary" data-requires="catalogue:write">${escapeHtml(t("wholesale.pricing.save"))}</button></div>
      </form>
    `;
    applyRolePermissions(panel);
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
        setMessage(t("wholesale.pricing.maxBreaks", { n: MAX_PRICE_BREAKS }), true);
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
      setMessage(t("wholesale.pricing.saved", { sku: product.sku }));
      renderAll();
    } catch (error) {
      // The server sends these stable codes inside its message.
      const hints = {
        priceBreaksOrder: t("wholesale.hint.priceBreaksOrder"),
        priceBreaksDuplicate: t("wholesale.hint.priceBreaksDuplicate")
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
  elements.refresh?.addEventListener("click", () => loadAll());
  root.addEventListener("click", (event) => {
    const retry = event.target.closest("[data-wholesale-retry]");
    if (retry && SECTIONS[retry.dataset.wholesaleRetry]) {
      loadAll([retry.dataset.wholesaleRetry]);
    }
  });

  // Load on first visit to the tab, so the rest of the admin is not slowed down.
  // The tab can also be reached by a link, Back or a saved #wholesale address.
  function loadOnFirstVisit() {
    if (!state.loaded && !state.loading) loadAll();
  }

  elements.tab?.addEventListener("click", loadOnFirstVisit);
  window.addEventListener("maris:admin-panel-shown", (event) => {
    if (event.detail?.name === "wholesale") loadOnFirstVisit();
  });
  if (root.classList.contains("is-active")) loadOnFirstVisit();
})();
