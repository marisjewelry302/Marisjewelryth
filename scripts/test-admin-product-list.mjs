import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readAdminSource, expandAdminI18n } from "./lib/admin-i18n-source.mjs";

const adminPage = await readAdminSource("app/admin/page.js");
const adminScript = await readAdminSource("assets/js/admin-page.js");
const adminCss = await readFile(new URL("../app/admin/admin.css", import.meta.url), "utf8");

assert.match(
  adminPage,
  /data-products-search/,
  "Admin products panel should include a search input for filtering product lists"
);

assert.match(
  adminPage,
  /data-products-pagination/,
  "Admin products panel should include pagination controls for product lists"
);

assert.match(
  adminPage,
  /data-products-page-summary/,
  "Admin products panel should include a visible page summary for the product list"
);

assert.match(
  adminScript,
  /PRODUCT_LIST_PAGE_SIZE\s*=\s*5/,
  "Admin product list should show 5 products per page"
);

assert.match(
  adminScript,
  /function getProductSearchText\(/,
  "Admin script should build searchable text from each product"
);

assert.match(
  adminScript,
  /function getProductListView\(/,
  "Admin script should calculate the filtered and paginated product list view"
);

assert.match(
  adminScript,
  /renderProductListControls\(view\)/,
  "Admin script should render search result summary and page tabs from the current list view"
);

assert.match(
  adminScript,
  /elements\.productSearch\?\.addEventListener\("input"/,
  "Admin product search should update the list while typing"
);

assert.match(
  adminScript,
  /data-products-page/,
  "Admin pagination should use explicit product page buttons"
);

assert.match(
  adminScript,
  /view\.pageProducts\s*\.map\(/,
  "Admin product tables should render only products for the active page"
);

assert.match(
  adminCss,
  /\.admin-list-tools/,
  "Admin product list controls should have dedicated styling"
);

assert.match(
  adminCss,
  /\.admin-pagination/,
  "Admin product pagination tabs should have dedicated styling"
);

// E-01: the edit modal offers the stored status values, maps legacy values on
// open, and only sends status when the admin changed it.
for (const [value, label] of [["active", "Live on storefront"], ["draft", "Draft (hidden)"], ["archived", "Archived"]]) {
  assert.ok(
    adminScript.includes(`<option value="${value}">${label}</option>`),
    `Edit modal Status should offer ${value} as "${label}"`
  );
}
assert.match(adminScript, /function normalizeModalProductStatus\(/, "Edit modal should map legacy statuses when it opens");
assert.match(adminScript, /dataset\.initialStatus\s*=/, "Edit modal should remember the status it opened with");
assert.match(
  adminScript,
  /statusValue !== modal\.dataset\.initialStatus/,
  "Edit modal should compare the status with the opening value"
);
assert.match(
  adminScript,
  /\.\.\.\(statusChanged \? \{ status: statusValue \} : \{\}\)/,
  "Edit modal should send status only when it changed"
);
assert.doesNotMatch(adminScript, /modal-field-status"\)\.value \|\| "Ready"|product\.status \|\| "Ready"/, "Edit modal must not default status to Ready");

// E-05 .. E-08: shared submit lock, per-data-set loading, pickers, confirmations, modal behaviour.
const has = (text, message) => assert.ok(adminScript.includes(text), message || `admin-page.js should contain: ${text}`);
has("async function withSubmitLock(", "A shared submit lock helper exists");
assert.ok((adminScript.match(/await withSubmitLock\(/g) || []).length >= 6, "Save Movement, Create Reserved Order, Save Best Seller, Cancel, delete and set draft are all locked");
has("Promise.allSettled(", "Data sets load independently");
has("data-retry-dataset", "Each failed data set has its own Retry");
has("ensureAdminDataReady(...names)", "Actions only wait for the data they need");
assert.ok(adminPage.includes('placeholder="Choose a product'), "Product pickers start on a placeholder, not a real product");
assert.ok(adminPage.includes("<datalist"), "Product pickers are searchable");
has("function resolvePickedProduct(", "Picked product is resolved from SKU - Name");
has("setMessageWithAction(", "Set Draft offers Undo");
has("Hide {sku} from the storefront?", "Set Draft asks first (the wording is the products.confirmHide entry of the admin dictionary)");
has("Cancel order {order}?", "Order cancel asks first and names the order (orders.confirmCancel in the admin dictionary)");
has("function confirmProductDeletion(", "Delete asks for the typed SKU in a dialog");
assert.ok(adminPage.includes("data-delete-dialog") && adminPage.includes("permanently removes"), "The delete dialog says what is lost");
assert.ok(!adminScript.includes("alert("), "Admin script no longer uses alert()");
has('class="admin-danger"', "Delete has danger styling");
has("Discard your unsaved text changes?", "Closing the edit modal with edits asks first");
has("function trapModalTab(", "Edit modal traps Tab");
has("returnTo?.focus()", "Edit modal returns focus on close");
has("data-gallery-move", "Gallery images can be moved without dragging");
has("Saves immediately", "Media sections say they save immediately");
has('id="maris-edit-modal-cancel" type="button">Close</button>', "Cancel is renamed Close");
has(".modal-footer {", "Save/Close footer is sticky");
has("validateGalleryImageFile", "Gallery files are validated on the client");
has("productCreateRetry", "A created product with failed uploads can be retried");
assert.ok(adminPage.includes("max 5 MB each"), "Gallery input shows its limits");

// ── Admin UX part 2 (E-09 .. E-20) ──────────────────────────────────────────
const readSource = async (relativePath) => expandAdminI18n(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const wholesaleScript = await readSource("assets/js/admin-wholesale.js");
const adminLayout = await readSource("app/admin/layout.js");
const loginPage = await readSource("app/admin/login/page.js");
const setupPage = await readSource("app/admin/setup/page.js");
const adminAuthLib = await readSource("app/lib/admin-auth.js");
const adminUsersLib = await readSource("app/lib/admin-users.js");
const productsRoute = await readSource("app/api/admin/products/route.js");
const imagesRoute = await readSource("app/api/admin/product-images/route.js");
const mediaRoute = await readSource("app/api/admin/products/[id]/media/route.js");
const hasPage = (text, message) => assert.ok(adminPage.includes(text), message || `admin page.js should contain: ${text}`);

// E-12: the unsaved Best Seller order is kept across reloads, warned about, and counted by live slots.
assert.doesNotMatch(
  adminScript.slice(adminScript.indexOf("bestSellers: { path:"), adminScript.indexOf("inquiries: { path:")),
  /draftIds\s*=\s*null/,
  "Reloading data must not clear the unsaved Best Seller order"
);
has("function discardBestSellerDraft(", "Best Seller has an explicit Discard");
has('addEventListener("beforeunload"', "Unsaved work triggers a beforeunload warning");
has("function hasUnsavedAdminWork(", "beforeunload covers the Best Seller order, the modal text and video uploads");
has("productSkuMemory", "An unavailable Best Seller slot keeps its SKU");
hasPage("data-best-seller-remove-unavailable", "Best Seller can remove unavailable slots");
hasPage("live / 7", "Best Seller counts live slots");
has("BEST_SELLER_RESULTS_PAGE_SIZE = 24", "The Best Seller picker draws 24 results at a time");
has("data-best-seller-show-more", "The Best Seller picker has Show more");

// E-13: one changed product is patched in; search is debounced.
has("async function refreshChangedProduct(", "Media changes patch one product");
assert.doesNotMatch(adminScript, /reloadEditModalProduct/, "Gallery and media actions no longer reload every data set");
has("SEARCH_DEBOUNCE_MS = 150", "Search is debounced by about 150 ms");
for (const [name, source] of [["product-images", imagesRoute], ["media", mediaRoute]]) {
  assert.match(source, /readAdminCatalogueProduct/, `The ${name} route returns the updated product`);
}
assert.match(productsRoute, /searchParams\.get\("id"\)[\s\S]*readAdminCatalogueProduct/, "GET /api/admin/products?id= returns one product");

// E-14: login and setup messages, shared password length, plain not-configured wording.
for (const code of ["rate_limit", "security"]) {
  assert.ok(loginPage.includes(`"${code}"`), `Login page handles error=${code}`);
}
assert.match(loginPage, /logged_out/, "Login page confirms a sign out");
assert.match(adminAuthLib, /export const ADMIN_PASSWORD_MIN_LENGTH = 12/, "One constant holds the minimum password length");
assert.match(setupPage, /ADMIN_PASSWORD_MIN_LENGTH/, "Setup shows and enforces the shared length");
assert.doesNotMatch(setupPage, /8 characters|minLength=\{12\}/, "Setup must not hard-code a length");
assert.match(adminUsersLib, /ADMIN_PASSWORD_MIN_LENGTH/, "The server check uses the same constant");
assert.doesNotMatch(loginPage + setupPage, /MARIS_ADMIN_SESSION_SECRET|SUPABASE_/, "Env var names are not shown to the shop owner");
assert.match(adminUsersLib, /console\.error\(`\[admin\]/, "Env var names go to the server log instead");

// E-10: one label map for status, an Archived filter, readable order and payment labels.
assert.match(
  adminScript,
  /const PRODUCT_STATUS_LABELS = \{\s*active: "Live",\s*draft: "Draft",\s*archived: "Archived"\s*\}/,
  "Product status uses Live / Draft / Archived (the English values of the status.product.* dictionary entries)"
);
hasPage('data-products-status="archived"', "The product list can filter Archived");
has("const ORDER_STATUS_LABELS", "Order statuses have readable labels");
has("const PAYMENT_STATUS_LABELS", "Payment statuses have readable labels");
hasPage('<option value="Ready">Ready</option>', "The Add form's Ready/Sold Out/Preorder/Hidden options are an owner decision and stay as they were");

// E-11: the overview card reads loaded data. (The low stock level was removed on the owner's decision.)
has("function renderCatalogueOverview(", "The Dashboard catalogue card uses the loaded products");
assert.doesNotMatch(adminScript, /MARIS_SHEET_STATUS/, "Nothing reads the global that nobody sets");
assert.doesNotMatch(adminScript, /lowStock/i, "There is no low stock level any more");

// E-09: one table, collapsed Add form, sorting, required markers; page size is unchanged.
hasPage("data-product-form-toggle", "Add product expands the form");
hasPage("data-products-sort=\"sku\"", "Product columns can be sorted");
hasPage('<span className="admin-required"', "Required fields are marked");
assert.doesNotMatch(adminPage, /data-sheet-catalogue-table/, "The second product table is gone");
has("details class=\"admin-row-menu\"", "Set Draft and Delete sit in a ... menu");
assert.match(adminCss, /\.admin-sku-cell\s*\{\s*white-space:\s*nowrap/, "SKUs do not wrap");

// E-15: single-row nav at tablet width, scroll hint, panel focus.
assert.match(adminCss, /grid-auto-flow:\s*column/, "The tablet nav is one row");
has("function setupTableScrollHints(", "Wide tables show a scroll hint");
has('heading?.focus({ preventScroll: true })', "Choosing a tab focuses its heading");

// E-16: the role's permissions reach the page.
hasPage("data-admin-permissions", "The page carries the signed-in role's permissions");
hasPage("data-admin-user", "The top bar shows who is signed in");
has("function applyAdminPermissions(", "Controls the role cannot use are disabled with a reason");
assert.match(wholesaleScript, /MARIS_ADMIN_PERMISSIONS/, "Wholesale controls follow the same permissions");

// E-17: address hash, Needs attention, badges, System status.
has("window.location.hash = target", "The open tab is kept in location.hash");
hasPage("data-needs-attention", "The Dashboard has a Needs attention row");
hasPage('data-nav-badge="custom-requests"', "The menu shows a count of new custom requests");
hasPage('data-nav-badge="inquiries"', "The menu shows a count of unread inquiries");
assert.doesNotMatch(adminPage, /data-admin-tab="database"/, "Database moved under Settings");

// E-18: Inquiries match Custom Requests.
hasPage("data-inquiry-search", "Inquiries can be searched");
has('button.setAttribute("aria-pressed", String(isActive))', "Filter cards report their state");
has("async function openInquiry(", "Opening an inquiry scrolls to it and marks it read");
has("email ? `<a class=\"admin-secondary\" href=\"mailto:", "Reply by email only appears with an address");

// E-20: admin metadata, skip target, wrapping values, readable gold labels.
assert.match(adminLayout, /title: "Admin · Maris"/);
assert.match(adminLayout, /robots: \{ index: false, follow: false \}/);
assert.doesNotMatch(adminLayout.replace(/\/\/.*$/gm, ""), /<body|<html|canonical:/, "The admin layout adds no body and no canonical link");
assert.match(adminPage, /<main className="admin-shell" id="main-content">/, "The skip link has a target");
assert.match(loginPage + setupPage, /id="main-content"/);
assert.match(adminCss, /\.admin-feed-meta strong\s*\{[^}]*overflow-wrap:\s*anywhere/, "Long project ids wrap inside the card");
assert.doesNotMatch(adminScript, /\.modal-kicker \{[^}]*#b9933a/, "The modal's small labels use the readable gold token");

console.log("PASS: Admin product list search and pagination contract is wired.");
