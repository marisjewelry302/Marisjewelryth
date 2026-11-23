// Maris Admin -> Customers and Newsletter: read-only lists with search, sort,
// paging and a CSV download. Talks only to /api/admin/customers and
// /api/admin/newsletter (and their /export routes); the server decides who may
// see the list and who may download it.
(() => {
  const roots = Array.from(document.querySelectorAll("[data-people-root]"));
  if (!roots.length) return;

  // Text and formats come from the server-injected dictionary
  // (app/lib/admin-i18n.js -> window.MARIS_ADMIN_I18N, window.marisAdminT).
  const t = window.marisAdminT || ((key) => key);
  const locale = window.MARIS_ADMIN_I18N?.locale || "en-GB";
  const adminLang = window.MARIS_ADMIN_I18N?.lang === "th" ? "th" : "en";

  const PAGE_SIZE = 25;
  const SEARCH_DEBOUNCE_MS = 250;
  const SESSION_ENDED_MESSAGE = t("error.sessionEnded");
  const FORBIDDEN_MESSAGE = t("error.forbidden");
  const MARKETING_LABELS = { subscribed: t("people.marketing.subscribed"), unsubscribed: t("people.marketing.unsubscribed"), none: t("people.marketing.none") };
  const STATUS_LABELS = { subscribed: t("people.status.subscribed"), unsubscribed: t("people.status.unsubscribed") };

  const messageElement = document.querySelector("[data-admin-message]");
  let messageTimer = null;

  function setMessage(text, isError = false) {
    if (!messageElement) return;
    window.clearTimeout(messageTimer);
    messageElement.classList.remove("has-action");
    messageElement.textContent = text;
    messageElement.classList.toggle("is-error", isError);
    messageElement.classList.toggle("is-visible", Boolean(text));
    if (text) {
      messageTimer = window.setTimeout(() => messageElement.classList.remove("is-visible"), isError ? 8000 : 4000);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    const time = Date.parse(value);
    if (Number.isNaN(time)) return "-";
    return new Date(time).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  }

  function describeFailure(status, fallback) {
    if (status === 401) {
      const banner = document.querySelector("[data-admin-session-banner]");
      if (banner) {
        const link = banner.querySelector("[data-admin-session-banner-link]");
        const text = banner.querySelector("[data-admin-session-banner-text]");
        const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (link) link.href = `/admin/login?next=${encodeURIComponent(target)}`;
        if (text) text.textContent = SESSION_ENDED_MESSAGE;
        banner.hidden = false;
      }
      return SESSION_ENDED_MESSAGE;
    }
    if (status === 403) return FORBIDDEN_MESSAGE;
    return fallback || t("error.server", { status });
  }

  function cells(kind, row) {
    if (kind === "customers") {
      const count = (value) => (value === null || value === undefined ? "-" : String(value));
      return [
        escapeHtml(row.fullName) || `<span class="admin-people-muted">${escapeHtml(t("people.noName"))}</span>`,
        escapeHtml(row.email),
        escapeHtml(row.phone) || '<span class="admin-people-muted">-</span>',
        escapeHtml(formatDate(row.createdAt)),
        escapeHtml(MARKETING_LABELS[row.marketing] || "-"),
        count(row.bagCount),
        count(row.wishlistCount)
      ];
    }

    return [
      escapeHtml(row.email),
      escapeHtml(STATUS_LABELS[row.status] || "-"),
      escapeHtml(formatDate(row.subscribedAt)),
      escapeHtml(row.source) || '<span class="admin-people-muted">-</span>',
      escapeHtml(row.hasAccount ? t("common.yes") : t("common.no"))
    ];
  }

  function setupList(root) {
    const kind = root.dataset.peopleRoot;
    const rowsKey = kind === "customers" ? "customers" : "subscribers";
    const noun = t(kind === "customers" ? "people.noun.customers" : "people.noun.subscribers");
    const els = {
      search: root.querySelector("[data-people-search]"),
      status: root.querySelector("[data-people-status]"),
      sort: root.querySelector("[data-people-sort]"),
      exportButton: root.querySelector("[data-people-export]"),
      summary: root.querySelector("[data-people-summary]"),
      table: root.querySelector("[data-people-table]"),
      pagination: root.querySelector("[data-people-pagination]")
    };
    const columnCount = root.querySelectorAll("thead th").length;
    const state = { page: 1, loaded: false, requestId: 0 };

    function queryString(extra = {}) {
      const params = new URLSearchParams();
      const term = els.search.value.trim();
      if (term) params.set("q", term);
      if (els.status && els.status.value !== "all") params.set("status", els.status.value);
      if (els.sort.value && els.sort.value !== "newest") params.set("sort", els.sort.value);
      Object.entries(extra).forEach(([key, value]) => params.set(key, String(value)));
      return params.toString();
    }

    function showRow(text) {
      els.table.innerHTML = `<tr><td colspan="${columnCount}">${escapeHtml(text)}</td></tr>`;
      els.pagination.innerHTML = "";
    }

    function renderPagination(payload) {
      if (payload.pageCount <= 1) {
        els.pagination.innerHTML = "";
        return;
      }

      const buttons = Array.from({ length: payload.pageCount }, (_, index) => {
        const page = index + 1;
        return `<button type="button" data-people-page="${page}"${page === payload.page ? ' aria-current="page"' : ""}>${page}</button>`;
      }).join("");

      els.pagination.innerHTML = `
        <button type="button" data-people-page="${Math.max(1, payload.page - 1)}"${payload.page === 1 ? " disabled" : ""}>${escapeHtml(t("common.prev"))}</button>
        ${buttons}
        <button type="button" data-people-page="${Math.min(payload.pageCount, payload.page + 1)}"${payload.page === payload.pageCount ? " disabled" : ""}>${escapeHtml(t("common.next"))}</button>
      `;
    }

    function render(payload) {
      const rows = Array.isArray(payload[rowsKey]) ? payload[rowsKey] : [];
      const filtered = payload.total !== payload.overallTotal;

      state.page = payload.page;

      if (!rows.length) {
        showRow(filtered ? t("people.noMatch", { noun }) : t("people.none", { noun }));
        els.summary.textContent = filtered ? t("people.zeroOf", { total: payload.overallTotal, noun }) : t("people.zero", { noun });
        return;
      }

      const first = (payload.page - 1) * payload.pageSize + 1;
      const last = first + rows.length - 1;
      els.summary.textContent = t(filtered ? "people.showingFiltered" : "people.showing", { first, last, total: payload.total, noun, overall: payload.overallTotal })
        + (payload.truncated ? ` ${t("people.truncated")}` : "");
      els.table.innerHTML = rows
        .map((row) => `<tr>${cells(kind, row).map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
        .join("");
      renderPagination(payload);
    }

    async function load(page = 1) {
      const requestId = ++state.requestId;
      els.summary.textContent = t("common.loading");

      try {
        const response = await fetch(`/api/admin/${kind}?${queryString({ page, pageSize: PAGE_SIZE })}`, {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" }
        });
        const payload = await response.json().catch(() => ({}));

        if (requestId !== state.requestId) return;

        if (!response.ok) {
          const message = describeFailure(response.status, payload.error);
          showRow(t("people.loadFailedWhy", { noun, message }));
          els.summary.textContent = t("people.loadFailedShort");
          return;
        }

        state.loaded = true;
        render(payload);
      } catch {
        if (requestId !== state.requestId) return;
        showRow(t("people.loadFailedConnection", { noun }));
        els.summary.textContent = t("people.loadFailedShort");
      }
    }

    async function download() {
      if (els.exportButton.dataset.submitting === "true") return;

      els.exportButton.dataset.submitting = "true";
      const label = els.exportButton.textContent;
      els.exportButton.disabled = true;
      els.exportButton.textContent = t("people.preparing");

      try {
        // The CSV headers follow the language of the page.
        const response = await fetch(`/api/admin/${kind}/export?${queryString({ lang: adminLang })}`, {
          credentials: "same-origin",
          cache: "no-store"
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setMessage(describeFailure(response.status, payload.error), true);
          return;
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition") || "";
        const name = /filename="([^"]+)"/.exec(disposition)?.[1] || `maris-${kind}.csv`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage(t("people.downloaded", { name }));
      } catch {
        setMessage(t("people.downloadFailed"), true);
      } finally {
        delete els.exportButton.dataset.submitting;
        els.exportButton.textContent = label;
        // Put back the role-based lock the page applied before this click.
        els.exportButton.disabled = false;
        window.MARIS_ADMIN_PERMISSIONS?.apply(root);
      }
    }

    const reload = () => load(1);
    const debouncedReload = (() => {
      let timer = null;
      return () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(reload, SEARCH_DEBOUNCE_MS);
      };
    })();

    els.search.addEventListener("input", debouncedReload);
    els.status?.addEventListener("change", reload);
    els.sort.addEventListener("change", reload);
    els.exportButton.addEventListener("click", download);
    els.pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-people-page]");
      if (button && !button.disabled) load(Number(button.dataset.peoplePage));
    });

    window.MARIS_ADMIN_PERMISSIONS?.apply(root);

    return { load: () => { if (!state.loaded) load(1); }, name: kind, root };
  }

  const lists = roots.map(setupList);

  // Load on first visit to the tab, so the rest of the admin is not slowed down.
  function loadVisible(name) {
    lists.filter((list) => list.name === name).forEach((list) => list.load());
  }

  window.addEventListener("maris:admin-panel-shown", (event) => loadVisible(event.detail?.name));
  lists.forEach((list) => {
    if (list.root.classList.contains("is-active")) list.load();
  });
})();
