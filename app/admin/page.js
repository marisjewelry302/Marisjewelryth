import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "../lib/admin-auth";
import {
  authorizeAdminSessionValue,
  getAdminRoleLabel,
  getAdminRolePermissions,
  normalizeAdminRole
} from "../lib/admin-authorization";
import { buildAdminScriptSrc } from "../lib/admin-script-src";
import { createAdminT } from "../lib/admin-i18n";
import { readAdminLang } from "../lib/admin-lang";
import Script from "next/script";
import AdminBodyClass from "./AdminBodyClass";
import AdminI18nScript from "./AdminI18nScript";
import AdminLangSwitch, { AdminLangToggleScript } from "./AdminLangSwitch";
import "./admin.css";

export const dynamic = "force-dynamic";

// A read-only list with search, sort, paging and a CSV download. The behaviour
// lives in assets/js/admin-people.js; the list itself comes from /api/admin/<kind>.
function PeoplePanel({ t, kind, kicker, title, note, searchLabel, searchPlaceholder, sorts, statuses, columns, exportLabel }) {
  return (
    <section className="admin-panel" data-admin-panel={kind} data-people-root={kind} aria-labelledby={`admin-heading-${kind}`}>
      <div className="admin-panel-head">
        <div>
          <p className="admin-kicker">{kicker}</p>
          <h2 id={`admin-heading-${kind}`} tabIndex={-1}>{title}</h2>
        </div>
        <p className="admin-note">{note}</p>
      </div>

      <div className="custom-request-tools admin-people-tools">
        <label>
          {searchLabel}
          <input type="search" placeholder={searchPlaceholder} data-people-search />
        </label>
        {statuses ? (
          <label>
            {t("people.statusLabel")}
            <select defaultValue="all" data-people-status>
              {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        ) : null}
        <label>
          {t("people.sortBy")}
          <select defaultValue="newest" data-people-sort>
            {sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="admin-secondary" type="button" data-people-export data-requires="personal-data:export">{exportLabel}</button>
        <p data-people-summary aria-live="polite">{t("common.loading")}</p>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-people-table">
          <thead>
            <tr>
              {columns.map((column) => <th key={column} scope="col">{column}</th>)}
            </tr>
          </thead>
          <tbody data-people-table>
            <tr><td colSpan={columns.length}>{t("common.loading")}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="admin-pagination" data-people-pagination aria-label={t("people.pagesLabel", { title })}></div>
    </section>
  );
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const lang = await readAdminLang();
  const { t, tp } = createAdminT(lang);

  const authorization = await authorizeAdminSessionValue(session);

  if (!authorization.ok) {
    redirect("/admin/login");
  }

  // Who is signed in, and what their role may do, so the page can say so and
  // disable controls the API would refuse anyway.
  const adminUser = authorization.user || {};
  const adminName = adminUser.displayName || adminUser.username || t("page.adminFallbackName");
  // Roles the dictionary knows are shown in the active language; any other
  // stored role falls back to its English label.
  const roleKey = normalizeAdminRole(adminUser.role);
  const adminRoleLabel = roleKey && t.has(`role.${roleKey}`) ? t(`role.${roleKey}`) : getAdminRoleLabel(adminUser.role);
  const adminPermissionList = getAdminRolePermissions(adminUser.role);
  const adminPermissions = adminPermissionList.join(" ");
  // Buttons the role cannot use are turned off; say so up front, not only in a tooltip.
  const canReadCustomers = adminPermissionList.includes("customers:read");
  const canReadNewsletter = adminPermissionList.includes("newsletter:read");
  const hasLimitedAccess = ["catalogue:write", "catalogue:delete", "operations:write", "settings:write"]
    .some((permission) => !adminPermissionList.includes(permission));

  const [imageGroupParserSrc, gemReportParserSrc, adminPageScriptSrc, adminWholesaleScriptSrc, adminPeopleScriptSrc] = await Promise.all([
    buildAdminScriptSrc("/assets/js/admin-image-group-parser.js"),
    buildAdminScriptSrc("/assets/js/admin-gem-report-parser.js"),
    buildAdminScriptSrc("/assets/js/admin-page.js"),
    buildAdminScriptSrc("/assets/js/admin-wholesale.js"),
    buildAdminScriptSrc("/assets/js/admin-people.js")
  ]);

  return (
    <>
      <AdminBodyClass />
      <AdminI18nScript lang={lang} />
      <div
        className="admin-page-shell"
        lang={lang}
        data-admin-lang={lang}
        data-admin-role={adminUser.role || ""}
        data-admin-role-label={adminRoleLabel}
        data-admin-permissions={adminPermissions}
      >
        <header className="admin-topbar">
          <a className="admin-logo" href="/" aria-label={t("page.goStorefront")}>
            {/* .admin-logo img sets both dimensions and crops the square PNG's empty band. */}
            <Image src="/assets/images/logo.png" alt={t("page.logoAlt")} width={118} height={118} priority />
          </a>

          <h1>{t("page.title")}</h1>

          <div className="admin-actions">
            <AdminLangSwitch lang={lang} t={t} />
            <p className="admin-user" data-admin-user>
              <span className="admin-user-name">{adminName}</span>
              <span className="admin-user-role">{adminRoleLabel}</span>
            </p>
            <a href="/">{t("page.viewStorefront")}</a>
            <form method="post" action="/api/admin/logout">
              <button className="admin-logout" type="submit">{t("page.logout")}</button>
            </form>
          </div>
        </header>

        {hasLimitedAccess ? (
          <p className="admin-role-banner" data-admin-role-banner>
            {t("page.roleBanner", { role: adminRoleLabel })}
          </p>
        ) : null}

        <div className="admin-session-banner" data-admin-session-banner role="alert" hidden>
          <span data-admin-session-banner-text></span>
          <a href="/admin/login" target="_blank" rel="noopener" data-admin-session-banner-link>{t("page.signInAgain")}</a>
        </div>

        <main className="admin-shell" id="main-content">
          <aside className="admin-sidebar" aria-label={t("page.navLabel")}>
            <button className="is-active" type="button" data-admin-tab="dashboard">{t("nav.dashboard")}</button>
            <button type="button" data-admin-tab="products">{t("nav.products")}</button>
            <button type="button" data-admin-tab="best-seller">{t("nav.bestSeller")}</button>
            <button type="button" data-admin-tab="inventory">{t("nav.inventory")}</button>
            <button type="button" data-admin-tab="orders">{t("nav.orders")}</button>
            <button type="button" data-admin-tab="custom-requests">{t("nav.customRequests")} <span className="admin-nav-badge" data-nav-badge="custom-requests" hidden></span></button>
            <button type="button" data-admin-tab="inquiries">{t("nav.inquiries")} <span className="admin-nav-badge" data-nav-badge="inquiries" hidden></span></button>
            <button type="button" data-admin-tab="wholesale">{t("nav.wholesale")}</button>
            {canReadCustomers ? <button type="button" data-admin-tab="customers">{t("nav.customers")}</button> : null}
            {canReadNewsletter ? <button type="button" data-admin-tab="newsletter">{t("nav.newsletter")}</button> : null}
            <button type="button" data-admin-tab="settings">{t("nav.settings")}</button>
          </aside>

          <section className="admin-content">

            {/* ── DASHBOARD ── */}
            <section className="admin-panel is-active" data-admin-panel="dashboard" aria-labelledby="admin-heading-dashboard">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">{t("dash.kicker")}</p>
                  <h2 id="admin-heading-dashboard" tabIndex={-1}>{t("nav.dashboard")}</h2>
                </div>
                <p className="admin-note">{t("dash.note")}</p>
              </div>

              <section className="admin-attention" aria-labelledby="admin-attention-title" data-needs-attention>
                <h3 id="admin-attention-title">{t("dash.needsAttention")}</h3>
                <ul className="admin-attention-list">
                  <li>
                    <a href="#custom-requests" data-attention-link="custom-requests" data-attention-filter="pending">
                      <strong data-attention-count="newRequests">-</strong>
                      <span>{t("dash.newRequests")}</span>
                    </a>
                  </li>
                  <li>
                    <a href="#custom-requests" data-attention-link="custom-requests" data-attention-filter="pending">
                      <strong data-attention-count="overdueRequests">-</strong>
                      <span>{t("dash.overdueRequests")}</span>
                    </a>
                  </li>
                  <li>
                    <a href="#inquiries" data-attention-link="inquiries" data-attention-filter="new">
                      <strong data-attention-count="newInquiries">-</strong>
                      <span>{t("dash.unreadInquiries")}</span>
                    </a>
                  </li>
                </ul>
                <p className="admin-note" data-attention-clear hidden>{t("dash.allClear")}</p>
              </section>

              <div className="admin-stats">
                <article>
                  <span data-total-products>0</span>
                  <p>{t("dash.totalProducts")}</p>
                </article>
                <article>
                  <span data-total-stock>0</span>
                  <p>{t("form.realStock")}</p>
                </article>
                <article>
                  <span data-total-reserved>0</span>
                  <p>{t("dash.reservedStock")}</p>
                </article>
              </div>

              <div className="admin-explainer">
                <h3>{t("dash.stockRule")}</h3>
                <p>{t("dash.stockFormula")}</p>
                <p>{t("dash.stockRuleNote")}</p>
              </div>

              <div className="admin-grid admin-feed-grid">
                <article className="admin-card admin-feed-card">
                  <p className="admin-kicker">{t("dash.website")}</p>
                  <h3>{t("dash.catalogueOverview")}</h3>
                  <p className="admin-note admin-note-wide">{t("dash.catalogueNote")}</p>
                  <div className="admin-feed-meta">
                    <div>
                      <span>{t("form.status")}</span>
                      <strong data-catalogue-status data-catalogue-state="loading">{t("common.loading")}</strong>
                    </div>
                    <div>
                      <span>{t("dash.liveOnWebsite")}</span>
                      <strong data-catalogue-live-count>0</strong>
                    </div>
                    <div>
                      <span>{t("dash.lastRefreshed")}</span>
                      <strong data-catalogue-last-loaded>{t("common.waiting")}</strong>
                    </div>
                  </div>
                </article>

                <article className="admin-card admin-feed-card">
                  <p className="admin-kicker">{t("dash.howTo")}</p>
                  <h3>{t("dash.addIn3Steps")}</h3>
                  <ol className="admin-steps">
                    <li>{t("dash.step1")}</li>
                    <li>{t("dash.step2")}</li>
                    <li>{t("dash.step3")}</li>
                  </ol>
                  <p className="admin-mini-label">{t("dash.detailsYouCanFill")}</p>
                  <div className="admin-pill-row">
                    <span>{t("dash.pill.collection")}</span>
                    <span>{t("dash.pill.code")}</span>
                    <span>{t("dash.pill.name")}</span>
                    <span>{t("dash.pill.price")}</span>
                    <span>{t("dash.pill.carat")}</span>
                    <span>{t("dash.pill.stone")}</span>
                    <span>{t("dash.pill.gemReport")}</span>
                    <span>{t("dash.pill.description")}</span>
                    <span>{t("dash.pill.cover")}</span>
                    <span>{t("dash.pill.info")}</span>
                    <span>{t("dash.pill.status")}</span>
                    <span>{t("dash.pill.visible")}</span>
                  </div>
                </article>
              </div>
            </section>

            {/* ── PRODUCTS ── */}
            <section className="admin-panel" data-admin-panel="products" aria-labelledby="admin-heading-products">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">{t("products.kicker")}</p>
                  <h2 id="admin-heading-products" tabIndex={-1}>{t("nav.products")}</h2>
                </div>
                <div className="admin-head-actions">
                  <button
                    className="admin-primary"
                    type="button"
                    aria-expanded="false"
                    aria-controls="admin-product-add-panel"
                    data-product-form-toggle
                    data-requires="catalogue:write"
                  >{t("products.addProduct")}</button>
                  <button className="admin-secondary" type="button" data-reset-demo>{t("products.refreshData")}</button>
                </div>
              </div>

              <div id="admin-product-add-panel" data-product-form-panel hidden>
              <form className="admin-form product-form" data-product-form>
                <p className="admin-note admin-span-2"><span className="admin-required" aria-hidden="true">*</span> {t("form.requiredNote")}</p>
                <label>
                  <span>SKU <span className="admin-required" aria-hidden="true">*</span></span>
                  <input name="sku" type="text" placeholder="MR-RNG-001" required />
                </label>
                <label>
                  <span>{t("form.productName")} <span className="admin-required" aria-hidden="true">*</span></span>
                  <input name="name" type="text" placeholder="Maris Diamond Halo Ring" required />
                </label>
                <label>
                  {t("form.collectionName")}
                  <input name="collectionName" type="text" placeholder="The One Aura Collection" />
                </label>
                <label>
                  <span>{t("form.category")} <span className="admin-required" aria-hidden="true">*</span></span>
                  <select name="category" required>
                    <option value="Rings">{t("collection.rings")}</option>
                    <option value="Wedding Set">{t("collection.wedding-set")}</option>
                    <option value="Earrings">{t("collection.earrings")}</option>
                    <option value="Bracelets">{t("collection.bracelets")}</option>
                    <option value="Necklaces & Pendants">{t("collection.necklaces-pendants")}</option>
                  </select>
                </label>
                <label data-ring-type-field>
                  {t("form.ringType")}
                  <select name="ringType">
                    <option value="engagement-ring">{t("collection.engagement-ring")}</option>
                    <option value="wedding-bands">{t("collection.wedding-bands")}</option>
                    <option value="mens-wedding-bands">{t("collection.mens-wedding-bands")}</option>
                    <option value="rings">{t("collection.rings")}</option>
                  </select>
                </label>
                <label>
                  {t("form.price")}
                  <input name="price" type="text" placeholder="18,900" />
                </label>
                <label>
                  {t("form.realStock")}
                  <input name="stockQty" type="number" min="0" defaultValue="1" />
                </label>
                <label>
                  {t("form.reserved")}
                  <input name="reservedQty" type="number" min="0" defaultValue="0" />
                </label>
                <label>
                  {t("form.status")}
                  <select name="status">
                    <option value="Ready">{t("form.statusReady")}</option>
                    <option value="Sold Out">{t("form.statusSoldOut")}</option>
                    <option value="Preorder">{t("form.statusPreorder")}</option>
                    <option value="Hidden">{t("form.statusHidden")}</option>
                  </select>
                </label>
                <p className="admin-note admin-span-2">{t("form.specsNote")}</p>
                <label className="admin-span-2">
                  {t("form.gemReport")}
                  <input
                    name="gemReportFile"
                    type="file"
                    accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                    aria-describedby="product-gem-report-preview product-gem-report-file-hint"
                    data-gem-report-file
                  />
                  <span className="admin-file-hint" id="product-gem-report-file-hint">{t("hint.gemReportFile")}</span>
                </label>
                <div
                  className="admin-gem-report admin-span-2"
                  id="product-gem-report-preview"
                  aria-live="polite"
                  data-gem-report-preview
                >
                  {t("form.gemReportOptional")}
                </div>
                <label>
                  {t("spec.caratWeight")}
                  <input name="caratWeight" type="text" placeholder="0.50 ct" />
                </label>
                <label>
                  {t("spec.stoneType")}
                  <input name="stoneType" type="text" placeholder="Natural Diamond" />
                </label>
                <label>
                  {t("spec.stoneShape")}
                  <input name="stoneShape" type="text" placeholder="Round Brilliant" />
                </label>
                <label className="admin-span-2">
                  {t("form.description")}
                  <textarea name="description" rows="4" placeholder={t("form.descriptionPlaceholder")} />
                </label>
                <label className="admin-span-2">
                  {t("form.cardImages")}
                  <input name="coverImageFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple data-cover-image-files aria-describedby="product-cover-file-hint" />
                  <span className="admin-file-hint" id="product-cover-file-hint">{t("hint.cardImages")}</span>
                </label>
                <label className="admin-span-2">
                  {t("form.galleryImages")}
                  <input name="imageGroupFiles" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple data-image-group-files aria-describedby="product-gallery-file-hint" />
                  <span className="admin-file-hint" id="product-gallery-file-hint">{t("hint.galleryImages")}</span>
                </label>
                <div className="admin-image-group-summary admin-span-2" data-image-group-summary>
                  {t("images.noneSelected")}
                </div>
                <div className="admin-create-retry admin-span-2" data-product-create-retry role="alert" hidden>
                  <p data-product-create-retry-text></p>
                  <div className="admin-create-retry-actions">
                    <button className="admin-secondary" type="button" data-product-create-retry-run>{t("form.retryImages")}</button>
                    <button className="admin-secondary" type="button" data-product-create-open>{t("form.openProduct")}</button>
                    <button className="admin-secondary" type="button" data-product-create-dismiss>{t("form.doneNewProduct")}</button>
                  </div>
                </div>
                <button className="admin-primary" type="submit" data-requires="catalogue:write">{t("form.addProductSubmit")}</button>
              </form>
              </div>

              <div className="admin-list-tools" aria-label={t("products.listControls")}>
                <label className="admin-search-field" htmlFor="admin-products-search">
                  {t("products.searchLabel")}
                  <input
                    id="admin-products-search"
                    type="search"
                    placeholder={t("products.searchPlaceholder")}
                    data-products-search
                  />
                </label>
                <div className="admin-pagination admin-status-tabs" role="group" aria-label={t("products.filterByStatus")}>
                  <button type="button" data-products-status="all" aria-pressed="true">{t("products.tab.all")} (<span data-products-status-count="all">0</span>)</button>
                  <button type="button" data-products-status="active" aria-pressed="false">{t("status.product.active")} (<span data-products-status-count="active">0</span>)</button>
                  <button type="button" data-products-status="draft" aria-pressed="false">{t("status.product.draft")} (<span data-products-status-count="draft">0</span>)</button>
                  <button type="button" data-products-status="archived" aria-pressed="false">{t("status.product.archived")} (<span data-products-status-count="archived">0</span>)</button>
                </div>
                <p className="admin-page-summary" aria-live="polite" data-products-page-summary>{t("products.showing0")}</p>
                <div className="admin-pagination" data-products-pagination aria-label={t("products.pagesLabel")}></div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-products-table">
                  <thead>
                    <tr>
                      <th scope="col" aria-sort="none"><button className="admin-sort-button" type="button" data-products-sort="sku">SKU</button></th>
                      <th scope="col" aria-sort="none"><button className="admin-sort-button" type="button" data-products-sort="name">{t("products.col.name")}</button></th>
                      <th scope="col" aria-sort="none"><button className="admin-sort-button" type="button" data-products-sort="collection">{t("products.col.collection")}</button></th>
                      <th scope="col" aria-sort="none"><button className="admin-sort-button" type="button" data-products-sort="price">{t("form.price")}</button></th>
                      <th scope="col" aria-sort="none"><button className="admin-sort-button" type="button" data-products-sort="available">{t("products.col.available")}</button></th>
                      <th scope="col" aria-sort="none"><button className="admin-sort-button" type="button" data-products-sort="images">{t("products.col.images")}</button></th>
                      <th scope="col" aria-sort="none"><button className="admin-sort-button" type="button" data-products-sort="status">{t("form.status")}</button></th>
                      <th scope="col">{t("products.col.actions")}</th>
                    </tr>
                  </thead>
                  <tbody data-products-table></tbody>
                </table>
              </div>
            </section>

            {/* ── BEST SELLER ── */}
            <section className="admin-panel" data-admin-panel="best-seller">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">{t("bs.kicker")}</p>
                  <h2>{t("nav.bestSeller")}</h2>
                </div>
                <p className="admin-note">{t("bs.note")}</p>
              </div>

              <form className="admin-form best-seller-form" data-best-seller-form>
                <p className="admin-kicker">{t("bs.homepageOrder")}</p>
                <ol className="best-seller-admin-slots" data-best-seller-slots>
                  <li className="admin-note">{t("bs.loadingSlots")}</li>
                </ol>
                <div className="admin-form-actions best-seller-admin-actions">
                  <button className="admin-primary" type="submit" data-requires="settings:write">{t("bs.save")}</button>
                  <span className="admin-inline-note" aria-live="polite">
                    <strong data-best-seller-count>0</strong>
                    {t("bs.liveOf7")}
                    <span data-best-seller-unavailable-note hidden></span>
                  </span>
                  <span className="best-seller-admin-dirty" data-best-seller-dirty hidden>{t("bs.unsaved")}</span>
                  <button className="admin-secondary" type="button" data-best-seller-remove-unavailable hidden>{t("bs.removeUnavailable")}</button>
                  <button className="admin-secondary" type="button" data-best-seller-discard hidden>{t("bs.discard")}</button>
                </div>
              </form>

              <div className="admin-subsection">
                <div className="admin-subsection-head">
                  <div>
                    <p className="admin-kicker">{t("bs.pickKicker")}</p>
                    <h3>{t("bs.findProduct")}</h3>
                  </div>
                  <p className="admin-note">{t("bs.pickNote")}</p>
                </div>
                <div className="admin-list-tools best-seller-picker-tools" aria-label={t("bs.searchLabel")}>
                  <label className="admin-search-field" htmlFor="admin-best-seller-search">
                    {t("products.searchLabel")}
                    <input
                      id="admin-best-seller-search"
                      type="search"
                      placeholder={t("bs.searchPlaceholder")}
                      autoComplete="off"
                      data-best-seller-search
                    />
                  </label>
                  <label className="admin-search-field" htmlFor="admin-best-seller-collection">
                    {t("products.col.collection")}
                    <select id="admin-best-seller-collection" data-best-seller-collection>
                      <option value="">{t("common.allCollections")}</option>
                    </select>
                  </label>
                  <p className="admin-page-summary" aria-live="polite" data-best-seller-results-summary></p>
                </div>
                <div className="best-seller-picker-grid" data-best-seller-results>
                  <p className="admin-note">{t("products.loading")}</p>
                </div>
              </div>
            </section>

            {/* ── INVENTORY ── */}
            <section className="admin-panel" data-admin-panel="inventory">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">{t("inv.kicker")}</p>
                  <h2>{t("nav.inventory")}</h2>
                </div>
                <p className="admin-note">{t("inv.note")}</p>
              </div>

              <form className="admin-form" data-inventory-form>
                <label className="admin-span-2">
                  {t("form.product")}
                  <input
                    name="productPick"
                    type="text"
                    list="admin-inventory-product-list"
                    placeholder={t("form.productPickPlaceholder")}
                    autoComplete="off"
                    required
                    data-product-select
                  />
                  <datalist id="admin-inventory-product-list" data-product-datalist></datalist>
                </label>
                <label>
                  {t("inv.movementType")}
                  <select name="type">
                    <option value="receive">{t("inv.opt.receive")}</option>
                    <option value="reserve">{t("inv.opt.reserve")}</option>
                    <option value="release">{t("inv.opt.release")}</option>
                    <option value="sale">{t("inv.opt.sale")}</option>
                    <option value="damage">{t("inv.opt.damage")}</option>
                    <option value="return">{t("inv.opt.return")}</option>
                  </select>
                </label>
                <label>
                  {t("form.quantity")}
                  <input name="qty" type="number" min="1" defaultValue="1" required />
                </label>
                <label>
                  {t("form.note")}
                  <input name="note" type="text" placeholder={t("inv.notePlaceholder")} />
                </label>
                <button className="admin-primary" type="submit" data-requires="operations:write">{t("inv.save")}</button>
              </form>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("inv.col.time")}</th>
                      <th>SKU</th>
                      <th>{t("inv.col.type")}</th>
                      <th>{t("inv.col.qty")}</th>
                      <th>{t("form.note")}</th>
                    </tr>
                  </thead>
                  <tbody data-inventory-log-table></tbody>
                </table>
              </div>
            </section>

            {/* ── ORDERS ── */}
            <section className="admin-panel" data-admin-panel="orders">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">{t("orders.kicker")}</p>
                  <h2>{t("nav.orders")}</h2>
                </div>
                <p className="admin-note">{t("orders.note")}</p>
              </div>

              <form className="admin-form order-form" data-order-form>
                <label className="admin-span-2">
                  {t("form.product")}
                  <input
                    name="productPick"
                    type="text"
                    list="admin-order-product-list"
                    placeholder={t("form.productPickPlaceholder")}
                    autoComplete="off"
                    required
                    data-order-product-select
                  />
                  <datalist id="admin-order-product-list" data-order-product-datalist></datalist>
                </label>
                <label>
                  {t("form.quantity")}
                  <input name="qty" type="number" min="1" defaultValue="1" required />
                </label>
                <label>
                  {t("orders.customerName")}
                  <input name="customerName" type="text" placeholder={t("orders.customerPlaceholder")} />
                </label>
                <button className="admin-primary" type="submit" data-requires="operations:write">{t("orders.create")}</button>
              </form>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("orders.col.order")}</th>
                      <th>{t("orders.col.customer")}</th>
                      <th>SKU</th>
                      <th>{t("inv.col.qty")}</th>
                      <th>{t("orders.col.orderStatus")}</th>
                      <th>{t("orders.col.payment")}</th>
                      <th>{t("orders.col.action")}</th>
                    </tr>
                  </thead>
                  <tbody data-orders-table></tbody>
                </table>
              </div>
            </section>

            {/* ── CUSTOM REQUESTS ── */}
            <section className="admin-panel" data-admin-panel="custom-requests">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">{t("cr.kicker")}</p>
                  <h2>{t("nav.customRequests")}</h2>
                </div>
                <p className="admin-note">{t("cr.note")}</p>
              </div>

              <div className="custom-request-summary" aria-label={t("cr.summaryLabel")}>
                <button type="button" data-custom-request-status-filter="pending">
                  <span data-custom-request-count="pending">0</span>
                  <strong>{t("status.request.pending")}</strong>
                  <small>{t("cr.hint.pending")}</small>
                </button>
                <button type="button" data-custom-request-status-filter="contacted">
                  <span data-custom-request-count="contacted">0</span>
                  <strong>{t("status.request.contacted")}</strong>
                  <small>{t("cr.hint.contacted")}</small>
                </button>
                <button type="button" data-custom-request-status-filter="completed">
                  <span data-custom-request-count="completed">0</span>
                  <strong>{t("status.request.completed")}</strong>
                  <small>{t("cr.hint.completed")}</small>
                </button>
                <button type="button" data-custom-request-status-filter="cancelled">
                  <span data-custom-request-count="cancelled">0</span>
                  <strong>{t("status.request.cancelled")}</strong>
                  <small>{t("cr.hint.cancelled")}</small>
                </button>
              </div>

              <div className="custom-request-tools">
                <label>
                  {t("cr.searchLabel")}
                  <input type="search" placeholder={t("cr.searchPlaceholder")} data-custom-request-search />
                </label>
                <label>
                  {t("request.workflowStatus")}
                  <select defaultValue="all" data-custom-request-status>
                    <option value="all">{t("common.allStatuses")}</option>
                    <option value="pending">{t("status.request.pending")}</option>
                    <option value="contacted">{t("status.request.contacted")}</option>
                    <option value="completed">{t("status.request.completed")}</option>
                    <option value="cancelled">{t("status.request.cancelled")}</option>
                  </select>
                </label>
                <p data-custom-request-list-summary>{t("request.loading")}</p>
              </div>

              <div className="admin-table-wrap">
                <table className="custom-request-table">
                  <thead>
                    <tr>
                      <th>{t("cr.col.created")}</th>
                      <th>{t("cr.col.client")}</th>
                      <th>{t("cr.col.request")}</th>
                      <th>{t("cr.col.design")}</th>
                      <th>{t("form.status")}</th>
                      <th>{t("cr.col.followUp")}</th>
                    </tr>
                  </thead>
                  <tbody data-custom-requests-table>
                    <tr><td colSpan="6">{t("request.loading")}</td></tr>
                  </tbody>
                </table>
              </div>

              <section className="custom-request-detail" data-custom-request-detail hidden aria-live="polite"></section>
            </section>

            {/* ── WHOLESALE ── */}
            <section className="admin-panel" data-admin-panel="wholesale" data-wholesale-root>
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">{t("ws.kicker")}</p>
                  <h2>{t("nav.wholesale")}</h2>
                </div>
                <button className="admin-secondary" type="button" data-wholesale-refresh>{t("ws.refresh")}</button>
              </div>

              <p className="admin-note admin-note-wide">
                {t("ws.note")}
              </p>

              <div className="admin-wholesale-views" role="tablist" aria-label={t("ws.sectionsLabel")}>
                <button type="button" role="tab" aria-selected="true" className="is-active" data-wholesale-view="orders">
                  {t("ws.tab.orders")} <span data-wholesale-badge="orders"></span>
                </button>
                <button type="button" role="tab" aria-selected="false" data-wholesale-view="accounts">
                  {t("ws.tab.accounts")} <span data-wholesale-badge="accounts"></span>
                </button>
                <button type="button" role="tab" aria-selected="false" data-wholesale-view="pricing">{t("ws.tab.pricing")}</button>
              </div>

              <div data-wholesale-section="orders">
                <div className="custom-request-tools">
                  <label>
                    {t("ws.orders.search")}
                    <input type="search" placeholder={t("ws.orders.searchPlaceholder")} data-wholesale-order-search />
                  </label>
                  <label>
                    {t("form.status")}
                    <select defaultValue="open" data-wholesale-order-status>
                      <option value="open">{t("ws.orders.open")}</option>
                      <option value="all">{t("common.allStatuses")}</option>
                      <option value="submitted">{t("wholesale.status.submitted")}</option>
                      <option value="quoted">{t("wholesale.status.quoted")}</option>
                      <option value="confirmed">{t("wholesale.status.confirmed")}</option>
                      <option value="in_production">{t("wholesale.status.in_production")}</option>
                      <option value="ready">{t("wholesale.status.ready")}</option>
                      <option value="shipped">{t("wholesale.status.shipped")}</option>
                      <option value="completed">{t("wholesale.status.completed")}</option>
                      <option value="cancelled">{t("wholesale.status.cancelled")}</option>
                    </select>
                  </label>
                  <p data-wholesale-order-summary>{t("ws.orders.loadHint")}</p>
                </div>
                <div className="admin-table-wrap">
                  <table className="custom-request-table">
                    <thead>
                      <tr>
                        <th>{t("orders.col.order")}</th>
                        <th>{t("ws.col.partner")}</th>
                        <th>{t("ws.col.lines")}</th>
                        <th>{t("ws.col.total")}</th>
                        <th>{t("form.status")}</th>
                        <th>{t("orders.col.action")}</th>
                      </tr>
                    </thead>
                    <tbody data-wholesale-orders-table>
                      <tr><td colSpan="6">{t("ws.orders.loadHint")}</td></tr>
                    </tbody>
                  </table>
                </div>
                <section className="custom-request-detail" data-wholesale-order-detail hidden aria-live="polite"></section>
              </div>

              <div data-wholesale-section="accounts" hidden>
                <div className="custom-request-tools">
                  <label>
                    {t("ws.accounts.search")}
                    <input type="search" placeholder={t("ws.accounts.searchPlaceholder")} data-wholesale-account-search />
                  </label>
                  <label>
                    {t("form.status")}
                    <select defaultValue="all" data-wholesale-account-status>
                      <option value="all">{t("common.allStatuses")}</option>
                      <option value="pending">{t("wholesale.account.pending")}</option>
                      <option value="approved">{t("wholesale.account.approved")}</option>
                      <option value="rejected">{t("wholesale.account.rejected")}</option>
                      <option value="suspended">{t("wholesale.account.suspended")}</option>
                    </select>
                  </label>
                  <p data-wholesale-account-summary></p>
                </div>
                <div className="admin-table-wrap">
                  <table className="custom-request-table">
                    <thead>
                      <tr>
                        <th>{t("ws.col.applied")}</th>
                        <th>{t("ws.col.company")}</th>
                        <th>{t("wholesale.contact")}</th>
                        <th>{t("ws.col.terms")}</th>
                        <th>{t("form.status")}</th>
                        <th>{t("orders.col.action")}</th>
                      </tr>
                    </thead>
                    <tbody data-wholesale-accounts-table>
                      <tr><td colSpan="6">{t("ws.accounts.loadHint")}</td></tr>
                    </tbody>
                  </table>
                </div>
                <section className="custom-request-detail" data-wholesale-account-detail hidden aria-live="polite"></section>
              </div>

              <div data-wholesale-section="pricing" hidden>
                <div className="custom-request-tools">
                  <label>
                    {t("products.searchLabel")}
                    <input type="search" placeholder={t("ws.pricing.searchPlaceholder")} data-wholesale-pricing-search />
                  </label>
                  <label>
                    {t("ws.pricing.show")}
                    <select defaultValue="all" data-wholesale-pricing-filter>
                      <option value="all">{t("ws.pricing.all")}</option>
                      <option value="enabled">{t("ws.pricing.enabled")}</option>
                      <option value="disabled">{t("ws.pricing.disabled")}</option>
                    </select>
                  </label>
                  <p data-wholesale-pricing-summary></p>
                </div>
                <div className="admin-table-wrap">
                  <table className="custom-request-table">
                    <thead>
                      <tr>
                        <th>{t("form.product")}</th>
                        <th>{t("wholesale.retailPrice")}</th>
                        <th>{t("nav.wholesale")}</th>
                        <th>{t("ws.col.moq")}</th>
                        <th>{t("ws.col.breaks")}</th>
                        <th>{t("orders.col.action")}</th>
                      </tr>
                    </thead>
                    <tbody data-wholesale-pricing-table>
                      <tr><td colSpan="6">{t("ws.pricing.loadHint")}</td></tr>
                    </tbody>
                  </table>
                </div>
                <section className="custom-request-detail" data-wholesale-pricing-detail hidden aria-live="polite"></section>
              </div>
            </section>

            {/* ── INQUIRIES ── */}
            <section className="admin-panel" data-admin-panel="inquiries">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">{t("inq.kicker")}</p>
                  <h2>{t("nav.inquiries")}</h2>
                </div>
                <p className="admin-note">{t("inq.note")}</p>
              </div>

              <div className="custom-request-summary" aria-label={t("inq.summaryLabel")}>
                <button type="button" data-inquiry-status-filter="new" aria-pressed="false">
                  <span data-inquiry-count="new">0</span>
                  <strong>{t("status.inquiry.new")}</strong>
                  <small>{t("inq.hint.new")}</small>
                </button>
                <button type="button" data-inquiry-status-filter="read" aria-pressed="false">
                  <span data-inquiry-count="read">0</span>
                  <strong>{t("status.inquiry.read")}</strong>
                  <small>{t("inq.hint.read")}</small>
                </button>
                <button type="button" data-inquiry-status-filter="replied" aria-pressed="false">
                  <span data-inquiry-count="replied">0</span>
                  <strong>{t("status.inquiry.replied")}</strong>
                  <small>{t("inq.hint.replied")}</small>
                </button>
                <button type="button" data-inquiry-status-filter="closed" aria-pressed="false">
                  <span data-inquiry-count="closed">0</span>
                  <strong>{t("status.inquiry.closed")}</strong>
                  <small>{t("inq.hint.closed")}</small>
                </button>
              </div>

              <div className="custom-request-tools">
                <label>
                  {t("inq.searchLabel")}
                  <input type="search" placeholder={t("inq.searchPlaceholder")} data-inquiry-search />
                </label>
                <label>
                  {t("form.status")}
                  <select defaultValue="all" data-inquiry-status>
                    <option value="all">{t("common.allStatuses")}</option>
                    <option value="new">{t("status.inquiry.new")}</option>
                    <option value="read">{t("status.inquiry.read")}</option>
                    <option value="replied">{t("status.inquiry.replied")}</option>
                    <option value="closed">{t("status.inquiry.closed")}</option>
                  </select>
                </label>
                <p data-inquiry-list-summary aria-live="polite">{t("inquiry.loading")}</p>
              </div>

              <div className="admin-table-wrap">
                <table className="custom-request-table">
                  <thead>
                    <tr>
                      <th>{t("inq.col.received")}</th>
                      <th>{t("inq.col.from")}</th>
                      <th>{t("inquiry.type")}</th>
                      <th>{t("inq.col.message")}</th>
                      <th>{t("form.status")}</th>
                      <th>{t("orders.col.action")}</th>
                    </tr>
                  </thead>
                  <tbody data-inquiries-table>
                    <tr><td colSpan="6">{t("inquiry.loading")}</td></tr>
                  </tbody>
                </table>
              </div>

              <section className="custom-request-detail" data-inquiry-detail hidden aria-live="polite"></section>
            </section>

            {/* ── CUSTOMERS (read-only) ── */}
            {canReadCustomers ? (
              <PeoplePanel
                t={t}
                kind="customers"
                kicker={t("cust.kicker")}
                title={t("nav.customers")}
                note={t("cust.note")}
                searchLabel={t("cust.searchLabel")}
                searchPlaceholder={t("cust.searchPlaceholder")}
                sorts={[["newest", t("people.sort.newest")], ["oldest", t("people.sort.oldest")], ["name", t("people.sort.name")], ["email", t("people.sort.email")]]}
                columns={[t("cust.col.name"), t("cust.col.email"), t("cust.col.phone"), t("cust.col.joined"), t("cust.col.marketing"), t("cust.col.bag"), t("cust.col.wishlist")]}
                exportLabel={t("cust.export")}
              />
            ) : null}

            {/* ── NEWSLETTER (read-only) ── */}
            {canReadNewsletter ? (
              <PeoplePanel
                t={t}
                kind="newsletter"
                kicker={t("news.kicker")}
                title={t("nav.newsletter")}
                note={t("news.note")}
                searchLabel={t("news.searchLabel")}
                searchPlaceholder={t("news.searchPlaceholder")}
                sorts={[["newest", t("people.sort.newest")], ["oldest", t("people.sort.oldest")], ["email", t("people.sort.email")]]}
                statuses={[["all", t("news.allSubscribers")], ["subscribed", t("people.status.subscribed")], ["unsubscribed", t("people.status.unsubscribed")]]}
                columns={[t("cust.col.email"), t("form.status"), t("news.col.signedUp"), t("news.col.whereFrom"), t("news.col.hasAccount")]}
                exportLabel={t("news.export")}
              />
            ) : null}

            {/* ── SETTINGS (with System status) ── */}
            <section className="admin-panel" data-admin-panel="settings" aria-labelledby="admin-heading-settings">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">{t("set.kicker")}</p>
                  <h2 id="admin-heading-settings" tabIndex={-1}>{t("nav.settings")}</h2>
                </div>
              </div>

              <p className="admin-note admin-note-wide">{t("set.none")}</p>

              <div className="admin-explainer">
                <h3>{t("set.whatCanDo")}</h3>
                <p>{t("set.whatCanDoText")}</p>
              </div>

              {/* ── SYSTEM STATUS (was the Database tab) ── */}
              <section className="admin-subsection admin-system-status" id="admin-system-status" data-admin-section="system-status" aria-labelledby="admin-system-status-title">
                <div className="admin-subsection-head">
                  <div>
                    <p className="admin-kicker">{t("sys.kicker")}</p>
                    <h3 id="admin-system-status-title" tabIndex={-1}>{t("sys.title")}</h3>
                  </div>
                  <p className="admin-note">{t("sys.note")}</p>
                </div>

                <div className="admin-grid admin-feed-grid">
                  <article className="admin-card admin-feed-card">
                    <p className="admin-kicker">{t("sys.connection")}</p>
                    <h3>{t("sys.adminDatabase")}</h3>
                    <div className="admin-feed-meta admin-database-meta">
                      <div>
                        <span>{t("form.status")}</span>
                        <strong data-database-status data-database-state="loading">{t("system.checking")}</strong>
                      </div>
                      <div>
                        <span>{t("sys.project")}</span>
                        <strong data-database-project>{t("common.waiting")}</strong>
                      </div>
                      <div>
                        <span>{t("sys.lastCheck")}</span>
                        <strong data-database-checked>{t("common.waiting")}</strong>
                      </div>
                    </div>
                    <p className="admin-note admin-note-wide" data-database-summary>{t("sys.waitingApi")}</p>
                  </article>

                  <article className="admin-card admin-feed-card">
                    <p className="admin-kicker">{t("sys.dataSource")}</p>
                    <h3>{t("sys.currentRule")}</h3>
                    <p className="admin-note admin-note-wide">{t("sys.ruleText")}</p>
                    <a className="admin-feed-link" href="/api/catalogue/products" target="_blank" rel="noopener noreferrer">{t("sys.openApi")}</a>
                  </article>
                </div>

                <div className="admin-subsection">
                  <div className="admin-subsection-head">
                    <div>
                      <p className="admin-kicker">{t("sys.tableHealth")}</p>
                      <h3>{t("sys.supabaseTables")}</h3>
                    </div>
                    <p className="admin-note">{t("sys.expectedTables")}</p>
                  </div>
                  <div className="admin-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("sys.col.table")}</th>
                          <th>{t("form.status")}</th>
                          <th>{t("sys.col.rows")}</th>
                          <th>{t("form.note")}</th>
                        </tr>
                      </thead>
                      <tbody data-database-table-status>
                        <tr><td colSpan="4">{t("system.tablesChecking")}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="admin-subsection">
                  <div className="admin-subsection-head">
                    <div>
                      <p className="admin-kicker">{t("sys.catalogueKicker")}</p>
                      <h3>{t("sys.productsVariantsImages")}</h3>
                    </div>
                    <p className="admin-note" data-database-products-summary>{t("sys.waitingCatalogue")}</p>
                  </div>
                  <div className="admin-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("sys.col.code")}</th>
                          <th>{t("products.col.name")}</th>
                          <th>{t("form.status")}</th>
                          <th>{t("form.price")}</th>
                          <th>{t("sys.col.variants")}</th>
                          <th>{t("products.col.images")}</th>
                          <th>{t("sys.col.stock")}</th>
                          <th>{t("sys.col.primaryImage")}</th>
                        </tr>
                      </thead>
                      <tbody data-database-products-table>
                        <tr><td colSpan="8">{t("system.productsCheckingRow")}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </section>

            {adminPermissionList.includes("catalogue:delete") ? (
              <dialog className="admin-confirm-dialog" data-delete-dialog aria-labelledby="admin-delete-title">
                <form method="dialog">
                  <h2 id="admin-delete-title">{t("del.titleBefore")}<span data-delete-product></span>{t("del.titleAfter")}</h2>
                  <p>{t("del.intro")}</p>
                  <ul>
                    <li>{t("del.item1")}</li>
                    <li>{t("del.item2")}</li>
                    <li>{t("del.item3")}</li>
                    <li>{t("del.item4")}</li>
                  </ul>
                  <p>{t("del.keepNote")}</p>
                  <label>
                    <span>{t("del.typeBefore")}<strong data-delete-sku></strong>{t("del.typeAfter")}</span>
                    <input type="text" data-delete-input autoComplete="off" autoCapitalize="off" spellCheck="false" />
                  </label>
                  <div className="admin-confirm-actions">
                    <button className="admin-secondary" type="button" data-delete-cancel>{t("common.cancel")}</button>
                    <button className="admin-danger" type="button" data-delete-confirm disabled>{t("del.confirm")}</button>
                  </div>
                </form>
              </dialog>
            ) : null}

            <p className="admin-message" data-admin-message role="status" aria-live="polite"></p>
          </section>
        </main>

        <AdminLangToggleScript />
        <Script src={imageGroupParserSrc} strategy="afterInteractive" />
        <Script src={gemReportParserSrc} strategy="afterInteractive" />
        <Script src={adminPageScriptSrc} strategy="afterInteractive" />
        <Script src={adminWholesaleScriptSrc} strategy="afterInteractive" />
        <Script src={adminPeopleScriptSrc} strategy="afterInteractive" />
      </div>
    </>
  );
}
