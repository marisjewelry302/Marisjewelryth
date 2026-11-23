import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expandAdminI18n } from "./lib/admin-i18n-source.mjs";

// Contract for the owner's decisions: guarded hard delete, read-only Customers
// and Newsletter lists with a CSV export, and no password data anywhere.

process.env.MARIS_ADMIN_SESSION_SECRET = "admin-people-test-secret";
const env = {
  MARIS_ADMIN_SESSION_SECRET: process.env.MARIS_ADMIN_SESSION_SECRET,
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};

const { SESSION_COOKIE_NAME, createAdminSession } = await import("../app/lib/admin-auth.js");
const { ADMIN_PERMISSIONS, adminRoleHasPermission, authorizeAdminRequest } = await import("../app/lib/admin-authorization.js");
const lists = await import("../app/lib/admin-people-lists.js");
const { createAdminPeopleHandlers } = await import("../app/lib/admin-people-api.js");
const { readAdminCustomerList, readAdminNewsletterSubscribers } = await import("../app/lib/maris-database.js");

const read = (path) => readFile(new URL(path, import.meta.url), "utf8").then(expandAdminI18n);

// ── 1. Delete: owner and admin only, enforced by the server ────────────────────
const ROLES = ["owner", "admin", "manager", "staff", "viewer"];

for (const role of ["owner", "admin"]) {
  assert.equal(adminRoleHasPermission(role, ADMIN_PERMISSIONS.CATALOGUE_DELETE), true, `${role} may delete products`);
}
for (const role of ["manager", "staff", "viewer"]) {
  assert.equal(adminRoleHasPermission(role, ADMIN_PERMISSIONS.CATALOGUE_DELETE), false, `${role} may not delete products`);
}
// ceo and developer are not roles the database accepts, but the code maps them to
// full access like the owner. That mapping is unchanged by this work.
assert.equal(adminRoleHasPermission("ceo", ADMIN_PERMISSIONS.CATALOGUE_DELETE), true);
assert.equal(adminRoleHasPermission("developer", ADMIN_PERMISSIONS.CATALOGUE_DELETE), true);

function adminUsersClient(role) {
  return {
    from(table) {
      assert.equal(table, "admin_users");
      const query = {
        select() { return query; },
        limit() { return query; },
        eq() { return query; },
        async maybeSingle() {
          return { data: { id: "user-1", username: "someone", display_name: "Someone", role, is_active: true }, error: null };
        }
      };
      return query;
    }
  };
}

function requestFor(url, { role = "owner", signedIn = true } = {}) {
  const session = signedIn ? createAdminSession({ userId: "user-1", username: "someone", role }) : "";
  return {
    url,
    method: "GET",
    headers: new Headers(),
    cookies: { get: (name) => (name === SESSION_COOKIE_NAME && session ? { value: session } : undefined) },
    // The role comes from the fake admin_users row below, never from the cookie.
    _role: role
  };
}

// The same session + admin_users lookup the real routes use, with a fake table.
async function requirePermission(request, permission) {
  const result = await authorizeAdminRequest(request, permission, { env, client: adminUsersClient(request._role) });
  return result.ok
    ? result
    : { ...result, response: new Response(JSON.stringify({ error: result.error }), { status: result.status }) };
}

for (const role of ["manager", "staff", "viewer"]) {
  const result = await requirePermission(requestFor("https://admin.test/x", { role }), ADMIN_PERMISSIONS.CATALOGUE_DELETE);
  assert.equal(result.status, 403, `The server refuses delete for ${role}`);
}
for (const role of ["owner", "admin"]) {
  const result = await requirePermission(requestFor("https://admin.test/x", { role }), ADMIN_PERMISSIONS.CATALOGUE_DELETE);
  assert.equal(result.ok, true, `The server allows delete for ${role}`);
}
assert.equal((await requirePermission(requestFor("https://admin.test/x", { signedIn: false }), ADMIN_PERMISSIONS.CATALOGUE_DELETE)).status, 401);

// Both delete routes ask for that permission before touching the database.
for (const path of ["../app/api/admin/products/route.js", "../app/api/admin/products/[id]/route.js"]) {
  const route = await read(path);
  const deleteHandler = route.slice(route.indexOf("export async function DELETE"));
  assert.match(deleteHandler, /requireAdminPermission\(request, ADMIN_PERMISSIONS\.CATALOGUE_DELETE\)/, `${path} DELETE needs catalogue:delete`);
  assert.ok(deleteHandler.indexOf("requireAdminPermission") < deleteHandler.indexOf("deleteAdminProduct"), `${path} checks permission before deleting`);
}

// UI: no Delete item for other roles, a typed-SKU dialog, no alert() or confirm() for delete.
const adminScript = await read("../assets/js/admin-page.js");
const adminPage = await read("../app/admin/page.js");
assert.match(adminScript, /const canDelete = adminCan\("catalogue:delete"\)/, "The row menu only offers Delete to roles that may delete");
assert.match(adminScript, /\$\{canDelete \? `<button class="admin-danger"[^`]*data-catalogue-delete/, "Delete is not rendered for other roles");
assert.match(adminPage, /adminPermissionList\.includes\("catalogue:delete"\) \? \(\s*<dialog/, "The dialog is only rendered for roles that may delete");
assert.match(adminPage, /Type <strong data-delete-sku>/, "The dialog asks for the SKU");
for (const lost of ["the gem report", "stock count and variants", "images and its turntable video", "page on the website"]) {
  assert.ok(adminPage.includes(lost), `The dialog lists what is lost: ${lost}`);
}
assert.match(adminPage, /data-delete-confirm disabled/, "Delete permanently starts disabled");
assert.ok(!adminScript.includes("alert("), "No alert()");
assert.doesNotMatch(adminScript, /confirm\(`Permanently delete/, "Delete no longer uses the browser confirm box");

// The typing rule, run exactly as the page defines it.
const normalizeSource = /function normalizeTypedSku\(value\) \{[\s\S]*?\n  \}/.exec(adminScript)?.[0];
assert.ok(normalizeSource, "normalizeTypedSku exists");
const normalizeTypedSku = new Function(`${normalizeSource}; return normalizeTypedSku;`)();
const matches = (typed, sku) => normalizeTypedSku(typed) === normalizeTypedSku(sku) && Boolean(normalizeTypedSku(sku));
assert.equal(matches("mr-rng-001", "MR-RNG-001"), true, "Case is ignored");
assert.equal(matches("  MR-RNG -001 ", "MR-RNG-001"), true, "Spaces are ignored");
assert.equal(matches("MR-RNG-00", "MR-RNG-001"), false, "A partial SKU does not unlock Delete");
assert.equal(matches("", ""), false, "An empty SKU never unlocks Delete");
assert.match(adminScript, /confirmButton\.disabled = !expected \|\| normalizeTypedSku\(input\.value\) !== expected/, "The Delete button enables only on a match");

// ── 2. Permissions for the lists ───────────────────────────────────────────────
const expectedRead = { owner: true, admin: true, manager: true, staff: false, viewer: false };
for (const role of ROLES) {
  assert.equal(adminRoleHasPermission(role, ADMIN_PERMISSIONS.CUSTOMERS_READ), expectedRead[role], `${role} customers:read`);
  assert.equal(adminRoleHasPermission(role, ADMIN_PERMISSIONS.NEWSLETTER_READ), expectedRead[role], `${role} newsletter:read`);
  assert.equal(adminRoleHasPermission(role, ADMIN_PERMISSIONS.PERSONAL_DATA_EXPORT), role === "owner" || role === "admin", `${role} personal-data:export`);
}

// ── 3. CSV rules ───────────────────────────────────────────────────────────────
assert.equal(lists.neutraliseCsvCell("=SUM(A1)"), "'=SUM(A1)");
assert.equal(lists.neutraliseCsvCell("+66 81 234 5678"), "'+66 81 234 5678");
assert.equal(lists.neutraliseCsvCell("-1+1"), "'-1+1");
assert.equal(lists.neutraliseCsvCell("@cmd"), "'@cmd");
assert.equal(lists.neutraliseCsvCell("ada@example.com"), "ada@example.com", "An @ inside the text is left alone");
assert.equal(lists.escapeCsvCell('say "hi", ok'), '"say ""hi"", ok"');
assert.equal(lists.escapeCsvCell("line\nbreak"), '"line\nbreak"');
assert.equal(lists.escapeCsvCell("=HYPERLINK(\"x\",\"y\")"), '"\'=HYPERLINK(""x"",""y"")"', "Neutralised before quoting");

const csvText = lists.customersToCsv([{ fullName: "=1+1", email: "a@b.co", phone: "+66 81", createdAt: "2026-01-02T00:00:00Z", marketing: "subscribed", bagCount: 2, wishlistCount: 0 }]);
assert.ok(csvText.startsWith("﻿Name,Email,Phone"), "UTF-8 byte order mark, then the header");
assert.ok(csvText.includes("'=1+1,a@b.co,'+66 81,2026-01-02,Subscribed,2,0"), "Cells are neutralised in the output");
assert.ok(csvText.endsWith("\r\n"));
assert.ok(lists.customersToCsv([{ fullName: "สมชาย ใจดี", email: "t@h.co" }]).includes("สมชาย ใจดี"), "Thai text is kept");

// ── 4. Handlers: auth, permission, field filtering ─────────────────────────────
const customerRows = [
  { id: "c1", full_name: "Ada Client", email: "ada@example.com", phone: "+66 1", created_at: "2026-03-01T00:00:00Z", password_hash: "scrypt:SECRET", metadata: { token: "t" } },
  { id: "c2", full_name: "Bo Buyer", email: "bo@example.com", phone: null, created_at: "2026-02-01T00:00:00Z", password_hash: "scrypt:SECRET2" },
  { id: "c3", full_name: "Cy Zed", email: "cy@example.com", phone: "", created_at: "2026-01-01T00:00:00Z" }
];
const subscriberRows = [
  { id: "s1", email: "ada@example.com", customer_id: "c1", source: "account", consent: true, created_at: "2026-03-01T00:00:00Z", metadata: { clientKey: "HASH" } },
  { id: "s2", email: "dee@example.com", customer_id: null, source: "newsletter", consent: false, created_at: "2026-02-15T00:00:00Z" },
  { id: "s3", email: "eve@example.com", customer_id: null, source: "newsletter", consent: true, created_at: "2026-02-20T00:00:00Z" }
];
const tableRows = {
  customers: customerRows,
  customer_email_subscribers: subscriberRows,
  customer_bags: [{ customer_id: "c1" }, { customer_id: "c1" }],
  customer_wishlists: [{ customer_id: "c2" }]
};
const selectedColumns = [];

function databaseClient() {
  return {
    from(table) {
      const query = {
        select(columns) {
          selectedColumns.push([table, columns]);
          // Like the real client, only the named columns come back.
          const names = columns.split(",").map((name) => name.trim());
          this.rows = tableRows[table].map((row) => Object.fromEntries(names.filter((n) => n in row).map((n) => [n, row[n]])));
          return this;
        },
        order() { return this; },
        range(from, to) { return Promise.resolve({ data: this.rows.slice(from, to + 1), error: null }); }
      };
      return query;
    }
  };
}

const handlerDeps = {
  requirePermission,
  readCustomers: () => readAdminCustomerList({ env, client: databaseClient() }),
  readSubscribers: () => readAdminNewsletterSubscribers({ env, client: databaseClient() }),
  now: () => new Date("2026-04-05T10:00:00Z")
};
const customers = createAdminPeopleHandlers("customers", handlerDeps);
const newsletter = createAdminPeopleHandlers("newsletter", handlerDeps);

// No session: 401. Viewer and staff: 403, and nothing is read.
let reads = 0;
const countingDeps = { ...handlerDeps, readCustomers: () => { reads += 1; return handlerDeps.readCustomers(); } };
const guarded = createAdminPeopleHandlers("customers", countingDeps);
assert.equal((await guarded.list(requestFor("https://admin.test/api/admin/customers", { signedIn: false }))).status, 401);
assert.equal((await guarded.list(requestFor("https://admin.test/api/admin/customers", { role: "viewer" }))).status, 403);
assert.equal((await guarded.list(requestFor("https://admin.test/api/admin/customers", { role: "staff" }))).status, 403);
assert.equal((await newsletter.list(requestFor("https://admin.test/api/admin/newsletter", { role: "viewer" }))).status, 403);
assert.equal(reads, 0, "A refused request never reads customer data");

// Manager can read the list...
const managerList = await customers.list(requestFor("https://admin.test/api/admin/customers", { role: "manager" }));
assert.equal(managerList.status, 200);
const managerBody = await managerList.json();
assert.equal(managerBody.total, 3);
assert.deepEqual(Object.keys(managerBody.customers[0]).sort(), [...lists.CUSTOMER_LIST_FIELDS].sort(), "Only the listed fields leave the server");
const raw = JSON.stringify(managerBody);
assert.doesNotMatch(raw, /password|scrypt|SECRET|token|clientKey|HASH/i, "No password hash, token or throttle key is returned");
const ada = managerBody.customers.find((row) => row.id === "c1");
assert.deepEqual([ada.bagCount, ada.wishlistCount, ada.marketing], [2, 0, "subscribed"]);
assert.equal(managerBody.customers.find((row) => row.id === "c3").marketing, "none");

for (const [table, columns] of selectedColumns) {
  assert.notEqual(columns.trim(), "*", `${table} is never read with select("*")`);
  assert.doesNotMatch(columns, /password|metadata/i, `${table} columns exclude password and metadata`);
}

// ...but cannot download it.
const managerExport = await customers.export(requestFor("https://admin.test/api/admin/customers/export", { role: "manager" }));
assert.equal(managerExport.status, 403, "Manager cannot export personal data");
assert.equal((await newsletter.export(requestFor("https://admin.test/api/admin/newsletter/export", { role: "manager" }))).status, 403);
assert.equal((await customers.export(requestFor("https://admin.test/api/admin/customers/export", { signedIn: false }))).status, 401);

// Search, sort, pagination.
const searched = await (await customers.list(requestFor("https://admin.test/api/admin/customers?q=BO%40", { role: "admin" }))).json();
assert.deepEqual(searched.customers.map((row) => row.id), ["c2"], "Search is case-insensitive over name, email and phone");
const byName = await (await customers.list(requestFor("https://admin.test/api/admin/customers?sort=name", { role: "admin" }))).json();
assert.deepEqual(byName.customers.map((row) => row.id), ["c1", "c2", "c3"]);
const oldest = await (await customers.list(requestFor("https://admin.test/api/admin/customers?sort=oldest", { role: "admin" }))).json();
assert.deepEqual(oldest.customers.map((row) => row.id), ["c3", "c2", "c1"]);
const paged = await (await customers.list(requestFor("https://admin.test/api/admin/customers?pageSize=2&page=2", { role: "admin" }))).json();
assert.deepEqual([paged.customers.length, paged.page, paged.pageCount, paged.total], [1, 2, 2, 3]);

const subscribed = await (await newsletter.list(requestFor("https://admin.test/api/admin/newsletter?status=subscribed", { role: "owner" }))).json();
assert.deepEqual(subscribed.subscribers.map((row) => row.id).sort(), ["s1", "s3"]);
assert.deepEqual(Object.keys(subscribed.subscribers[0]).sort(), [...lists.NEWSLETTER_LIST_FIELDS].sort());
assert.doesNotMatch(JSON.stringify(subscribed), /HASH|clientKey|metadata/);
const unsubscribed = await (await newsletter.list(requestFor("https://admin.test/api/admin/newsletter?status=unsubscribed", { role: "owner" }))).json();
assert.deepEqual(unsubscribed.subscribers.map((row) => [row.id, row.status]), [["s2", "unsubscribed"]]);

// Owner / admin export the current filter, with the right headers.
const exported = await newsletter.export(requestFor("https://admin.test/api/admin/newsletter/export?status=unsubscribed", { role: "admin" }));
assert.equal(exported.status, 200);
assert.equal(exported.headers.get("Content-Type"), "text/csv; charset=utf-8");
assert.equal(exported.headers.get("Content-Disposition"), 'attachment; filename="maris-newsletter-2026-04-05.csv"');
assert.equal(exported.headers.get("Cache-Control"), "private, no-store");
// text() would strip the byte order mark, so read the raw bytes.
const exportedBytes = Buffer.from(await exported.arrayBuffer());
assert.deepEqual([...exportedBytes.subarray(0, 3)], [0xEF, 0xBB, 0xBF], "The file starts with a UTF-8 byte order mark");
const exportedText = exportedBytes.toString("utf8");
assert.ok(exportedText.slice(1).startsWith("Email,Status,Subscribed on,Source,Has account"));
assert.ok(exportedText.includes("dee@example.com,Unsubscribed,2026-02-15,newsletter,No") && !exportedText.includes("ada@example.com"), "The export honours the current filter");

const customerExport = await customers.export(requestFor("https://admin.test/api/admin/customers/export?q=ada", { role: "owner" }));
assert.equal(customerExport.headers.get("Content-Disposition"), 'attachment; filename="maris-customers-2026-04-05.csv"');
const customerCsv = Buffer.from(await customerExport.arrayBuffer()).toString("utf8");
assert.ok(customerCsv.includes("Ada Client,ada@example.com,'+66 1,2026-03-01,Subscribed,2,0") && !customerCsv.includes("Bo Buyer"));
assert.doesNotMatch(customerCsv, /password|scrypt|SECRET/i);

// ── 5. Wiring ──────────────────────────────────────────────────────────────────
for (const [path, permission] of [
  ["../app/api/admin/customers/route.js", "list"],
  ["../app/api/admin/newsletter/route.js", "list"],
  ["../app/api/admin/customers/export/route.js", "export"],
  ["../app/api/admin/newsletter/export/route.js", "export"]
]) {
  const route = await read(path);
  assert.match(route, new RegExp(`handlers\\.${permission}\\(request\\)`), `${path} uses the shared handler`);
  assert.doesNotMatch(route, /export (async )?function (POST|PUT|PATCH|DELETE)|export const (POST|PUT|PATCH|DELETE)/, `${path} is read-only`);
}
const peopleApi = await read("../app/lib/admin-people-api.js");
assert.match(peopleApi, /PERSONAL_DATA_EXPORT/, "Export needs its own permission");
const peopleScript = await read("../assets/js/admin-people.js");
assert.doesNotMatch(peopleScript, /method:\s*"(POST|PUT|PATCH|DELETE)"/, "The Customers and Newsletter scripts only read");
assert.match(adminPage, /data-admin-tab="customers"/);
assert.match(adminPage, /data-admin-tab="newsletter"/);
assert.match(adminPage, /canReadCustomers \? <button/, "The tab is hidden from roles that cannot read it");
assert.doesNotMatch(adminPage, /Customer CRM|secure database/i, "The developer placeholder text is gone");

delete process.env.MARIS_ADMIN_SESSION_SECRET;
console.log("PASS: Guarded delete, read-only Customers and Newsletter lists, CSV export and field filtering.");
