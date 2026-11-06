// Wholesale (B2B) contract: pricing rules, input validation, the database
// module's calls, customer route guards, admin wiring, and the migration.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { register } from "node:module";

// Route files import "next/server" the way the Next.js bundler resolves it;
// plain Node needs the file name, so map it for the route imports below.
register(`data:text/javascript,${encodeURIComponent(`
  export async function resolve(specifier, context, next) {
    return next(specifier === "next/server" ? "next/server.js" : specifier, context);
  }
`)}`, import.meta.url);

const { NextRequest } = await import("next/server.js");

const wholesale = await import("../app/lib/wholesale.js");
const {
  computeWholesaleUnitPrice,
  getWholesaleListPrice,
  mapWholesaleDatabaseError,
  normalizeAdminAccountUpdate,
  normalizeAdminOrderAction,
  normalizeWholesaleApplication,
  normalizeWholesaleOrder,
  normalizeWholesaleOrderInput,
  normalizeWholesalePricingInput,
  snapWholesaleQuantity,
  summarizeWholesaleCart,
  validateWholesaleQuantity,
  WHOLESALE_ADMIN_ACTIONS
} = wholesale;

// ─── Pricing ───────────────────────────────────────────────────────────────

const breaks = [
  { minQuantity: 20, unitPrice: 7000 },
  { min_quantity: 5, unit_price: "8,000" },
  { minQuantity: 0, unitPrice: 1 },
  { minQuantity: 50, unitPrice: -5 }
];

assert.equal(getWholesaleListPrice({ priceBreaks: breaks, basePrice: 10000, quantity: 1 }), 10000, "Below every break uses the retail price");
assert.equal(getWholesaleListPrice({ priceBreaks: breaks, basePrice: 10000, quantity: 5 }), 8000);
assert.equal(getWholesaleListPrice({ priceBreaks: breaks, basePrice: 10000, quantity: 19 }), 8000);
assert.equal(getWholesaleListPrice({ priceBreaks: breaks, basePrice: 10000, quantity: 25 }), 7000, "Invalid breaks are ignored");
assert.equal(getWholesaleListPrice({ priceBreaks: [], basePrice: null, quantity: 5 }), null, "No price at all is price on request");
assert.equal(getWholesaleListPrice({ priceBreaks: [], basePrice: 0, quantity: 5 }), null);

// Same case as the SQL check: 25 pcs at 7,000 with a 10% account discount.
assert.equal(computeWholesaleUnitPrice({ priceBreaks: breaks, basePrice: 10000, quantity: 25, discountPercent: 10 }), 6300);
assert.equal(computeWholesaleUnitPrice({ priceBreaks: [], basePrice: 999.99, quantity: 1, discountPercent: 12.5 }), 874.99);
assert.equal(computeWholesaleUnitPrice({ priceBreaks: [], basePrice: 100, quantity: 1, discountPercent: 500 }), 10, "Discount is capped at 90%");
assert.equal(computeWholesaleUnitPrice({ priceBreaks: [], basePrice: null, quantity: 1, discountPercent: 10 }), null);

assert.equal(validateWholesaleQuantity({ quantity: 10, minimumOrderQuantity: 5, casePack: 5 }), null);
assert.equal(validateWholesaleQuantity({ quantity: 3, minimumOrderQuantity: 5, casePack: 1 }), "below_moq");
assert.equal(validateWholesaleQuantity({ quantity: 7, minimumOrderQuantity: 5, casePack: 5 }), "case_pack");
assert.equal(validateWholesaleQuantity({ quantity: "", minimumOrderQuantity: 1 }), "invalid_quantity");
assert.equal(validateWholesaleQuantity({ quantity: 2.5 }), "invalid_quantity");
assert.equal(validateWholesaleQuantity({ quantity: 100001 }), "invalid_quantity");
assert.equal(snapWholesaleQuantity({ quantity: 7, minimumOrderQuantity: 5, casePack: 5 }), 10);
assert.equal(snapWholesaleQuantity({ quantity: 1, minimumOrderQuantity: 6, casePack: 4 }), 8);
assert.equal(snapWholesaleQuantity({ quantity: "", minimumOrderQuantity: 3, casePack: 1 }), 3);

assert.deepEqual(
  summarizeWholesaleCart([{ quantity: 10, unitPrice: 100.1 }, { quantity: 3, unitPrice: null }, { quantity: 2, unitPrice: 0.05 }]),
  { subtotal: 1001.1, pieces: 15, unpricedLines: 1 }
);

// ─── Input normalization ───────────────────────────────────────────────────

const goodApplication = {
  companyName: "  Siam   Gems Co.  ",
  businessType: "retailer",
  businessAddress: "99 Silom Road, Bang Rak, Bangkok 10500",
  contactName: "Somchai",
  contactPhone: "+66 81 234 5678",
  website: "https://siamgems.example",
  interestedCategories: ["real-gold", "real-gold", "not-a-category", "real-diamond"]
};
const application = normalizeWholesaleApplication(goodApplication);
assert.deepEqual(application.errors, []);
assert.equal(application.application.companyName, "Siam Gems Co.");
assert.deepEqual(application.application.interestedCategories, ["real-gold", "real-diamond"]);
assert.equal(application.application.country, "Thailand");

const badApplication = normalizeWholesaleApplication({ ...goodApplication, businessType: "pirate", contactPhone: "call me", website: "javascript:alert(1)" });
assert.deepEqual(badApplication.errors.sort(), ["businessType", "contactPhone", "website"]);

const productId = "3f2a1c9e-1111-4222-8333-444455556666";
const orderInput = normalizeWholesaleOrderInput({
  items: [{ productId, quantity: "10", unitPrice: 1 }],
  shippingAddress: "99 Silom Road, Bangkok 10500",
  requestedShipDate: "2026-12-01",
  idempotencyKey: "key-1"
});
assert.deepEqual(orderInput.errors, []);
assert.deepEqual(orderInput.order.items, [{ productId, quantity: 10 }], "Browser prices are dropped before the order reaches the database");
assert.deepEqual(normalizeWholesaleOrderInput({ items: [], shippingAddress: "x" }).errors.sort(), ["items", "shippingAddress"]);
assert.ok(normalizeWholesaleOrderInput({ items: [{ productId: "nope", quantity: 1 }], shippingAddress: "99 Silom Road, Bangkok" }).errors.includes("items"));
assert.ok(normalizeWholesaleOrderInput({ items: Array.from({ length: 101 }, () => ({ productId, quantity: 1 })), shippingAddress: "99 Silom Road, Bangkok" }).errors.includes("items"));
assert.ok(normalizeWholesaleOrderInput({ items: [{ productId, quantity: 1 }], shippingAddress: "99 Silom Road, Bangkok", requestedShipDate: "next week" }).errors.includes("requestedShipDate"));

const pricing = normalizeWholesalePricingInput({
  isEnabled: true,
  minimumOrderQuantity: "5",
  casePack: "5",
  leadTimeDays: "",
  priceBreaks: [{ minQuantity: "20", unitPrice: "7000" }, { minQuantity: "5", unitPrice: "8,000" }, { minQuantity: "", unitPrice: "" }]
});
assert.deepEqual(pricing.errors, []);
assert.equal(pricing.pricing.leadTimeDays, null);
assert.deepEqual(pricing.pricing.priceBreaks, [{ minQuantity: 5, unitPrice: 8000 }, { minQuantity: 20, unitPrice: 7000 }]);
assert.ok(normalizeWholesalePricingInput({ priceBreaks: [{ minQuantity: 5, unitPrice: 100 }, { minQuantity: 10, unitPrice: 120 }] }).errors.includes("priceBreaksOrder"),
  "A bigger quantity must not cost more per piece");
assert.ok(normalizeWholesalePricingInput({ priceBreaks: [{ minQuantity: 5, unitPrice: 100 }, { minQuantity: 5, unitPrice: 90 }] }).errors.includes("priceBreaksDuplicate"));
assert.ok(normalizeWholesalePricingInput({ minimumOrderQuantity: 0 }).errors.includes("minimumOrderQuantity"));
assert.ok(normalizeWholesalePricingInput({ priceBreaks: Array.from({ length: 11 }, (_, i) => ({ minQuantity: i + 1, unitPrice: 100 - i })) }).errors.includes("priceBreaks"));

assert.deepEqual(normalizeAdminAccountUpdate({ status: "approved", discountPercent: "12.5", paymentTerms: "net_30" }).update,
  { status: "approved", discountPercent: 12.5, paymentTerms: "net_30" });
assert.deepEqual(normalizeAdminAccountUpdate({ discountPercent: 95 }).errors, ["discountPercent", "empty"]);
assert.deepEqual(normalizeAdminAccountUpdate({ status: "vip" }).errors, ["status", "empty"]);

assert.deepEqual(normalizeAdminOrderAction({ action: "delete" }).errors, ["action"]);
assert.deepEqual(normalizeAdminOrderAction({ action: "note" }).errors, ["note"]);
const quote = normalizeAdminOrderAction({ action: "quote", items: [{ id: productId, unitPrice: "1,250.5" }], shippingAmount: "300", quoteValidUntil: "2026-12-31" });
assert.deepEqual(quote.errors, []);
assert.deepEqual(quote.command.items, [{ id: productId, unitPrice: 1250.5 }]);
assert.equal(quote.command.discountAmount, 0);
assert.ok(normalizeAdminOrderAction({ action: "quote", items: [{ id: productId, unitPrice: -1 }] }).errors.includes("items"));
assert.equal(normalizeAdminOrderAction({ action: "ship", trackingNumber: " TH123 " }).command.trackingNumber, "TH123");
assert.deepEqual(WHOLESALE_ADMIN_ACTIONS.ship, ["ready"]);

// Customers see status changes, never internal notes or staff usernames.
const orderRow = {
  id: "o1",
  order_number: "WHS-1",
  status: "quoted",
  shipping_address: "addr",
  subtotal_amount: "100.00",
  total_amount: "100.00",
  currency: "THB",
  metadata: {
    history: [
      { at: "2026-11-01", actor: "customer", fromStatus: "", toStatus: "submitted", note: "PO" },
      { at: "2026-11-02", actor: "manager.nok", fromStatus: "submitted", toStatus: "submitted", note: "Credit check pending" },
      { at: "2026-11-03", actor: "manager.nok", fromStatus: "submitted", toStatus: "quoted", note: "Includes 18K" }
    ]
  },
  wholesale_order_items: [
    { id: "i2", product_sku: "R2", product_name: "Band", quantity: 2, unit_price: null, line_total: null },
    { id: "i1", product_sku: "R1", product_name: "Ring", quantity: 5, unit_price: "20.00", line_total: "100.00" }
  ],
  wholesale_accounts: { company_name: "Siam Gems", customers: { email: "a@x.test" } }
};
const customerView = normalizeWholesaleOrder(orderRow, { forCustomer: true });
assert.deepEqual(customerView.history.map((entry) => entry.note), ["PO", "Includes 18K"]);
assert.deepEqual(customerView.history.map((entry) => entry.actor), ["customer", "atelier"]);
assert.equal(customerView.companyName, undefined);
assert.equal(customerView.hasUnpricedItems, true);
assert.deepEqual(customerView.items.map((item) => item.sku), ["R1", "R2"]);
const adminView = normalizeWholesaleOrder(orderRow);
assert.equal(adminView.history.length, 3);
assert.equal(adminView.companyName, "Siam Gems");
assert.equal(adminView.customerEmail, "a@x.test");

assert.equal(mapWholesaleDatabaseError({ code: "42501", message: "Wholesale account is not approved." }).statusCode, 403);
assert.equal(mapWholesaleDatabaseError({ code: "23514", message: "Only a quoted order can be accepted." }).message, "Only a quoted order can be accepted.");
assert.equal(mapWholesaleDatabaseError({ code: "XX000", message: "internal detail" }).message, "Wholesale request could not be completed.",
  "Unexpected database errors are not shown to customers");

// ─── Database module ───────────────────────────────────────────────────────

const db = await import("../app/lib/maris-database.js");
const env = { SUPABASE_URL: "https://maris-test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-role-secret" };

for (const table of ["wholesale_accounts", "product_wholesale_settings", "product_wholesale_price_breaks", "wholesale_orders", "wholesale_order_items"]) {
  assert.ok(db.MARIS_DATABASE_TABLES.includes(table), `${table} should be in the table contract`);
}

const notConfigured = await db.readWholesaleCatalogue({ env: {} });
assert.equal(notConfigured.isConfigured, false);

const rpcCalls = [];
const fakeClient = {
  rpc: async (name, args) => {
    rpcCalls.push([name, args]);
    if (name === "maris_submit_wholesale_order") return { data: { orderId: "o1", idempotent: false }, error: null };
    if (name === "maris_customer_update_wholesale_order") return { data: null, error: { code: "23514", message: "Only a quoted order can be accepted." } };
    return { data: {}, error: null };
  }
};

const submitted = await db.submitWholesaleOrder("customer-1", orderInput.order, { env, client: fakeClient });
assert.equal(submitted.result.orderId, "o1");
assert.deepEqual(rpcCalls[0], ["maris_submit_wholesale_order", {
  p_customer_id: "customer-1",
  p_items: [{ productId, quantity: 10 }],
  p_shipping_address: "99 Silom Road, Bangkok 10500",
  p_customer_reference: null,
  p_requested_ship_date: "2026-12-01",
  p_customer_note: null,
  p_idempotency_key: "key-1"
}]);

await assert.rejects(
  db.customerUpdateWholesaleOrder("customer-1", "o1", "accept", "", { env, client: fakeClient }),
  (error) => error instanceof db.WholesaleError && error.statusCode === 400 && /quoted/.test(error.message)
);

// Catalogue hides products that are not switched on for wholesale.
const catalogueClient = {
  from(table) {
    assert.equal(table, "products");
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: async () => ({
        data: [
          { id: "p1", sku: "R1", name: "Ring", base_price: "10000", status: "active",
            product_wholesale_settings: { is_enabled: true, minimum_order_quantity: 5, case_pack: 5, lead_time_days: 21, note: null },
            product_wholesale_price_breaks: [{ min_quantity: 20, unit_price: "7000" }, { min_quantity: 5, unit_price: "8000" }] },
          { id: "p2", sku: "R2", name: "Hidden", base_price: "5000", status: "active",
            product_wholesale_settings: [{ is_enabled: false }], product_wholesale_price_breaks: [] },
          { id: "p3", sku: "R3", name: "No terms", base_price: "5000", status: "active",
            product_wholesale_settings: null, product_wholesale_price_breaks: [] }
        ],
        error: null
      })
    };
    return chain;
  }
};
const catalogue = await db.readWholesaleCatalogue({ env, client: catalogueClient });
assert.deepEqual(catalogue.products.map((product) => product.sku), ["R1"]);
assert.deepEqual(catalogue.products[0].wholesale, {
  isEnabled: true,
  minimumOrderQuantity: 5,
  casePack: 5,
  leadTimeDays: 21,
  note: "",
  priceBreaks: [{ minQuantity: 5, unitPrice: 8000 }, { minQuantity: 20, unitPrice: 7000 }]
});

// ─── Email ─────────────────────────────────────────────────────────────────

const { buildWholesaleOrderEmail, sendWholesaleEmail } = await import("../app/lib/wholesale-email.js");
const email = buildWholesaleOrderEmail({ order: { ...adminView, companyName: "<script>x</script>" } });
assert.ok(!email.html.includes("<script>"), "Partner-supplied text is escaped in the atelier email");
assert.match(email.text, /Price on request/);
assert.equal((await sendWholesaleEmail(email, { env: {} })).status, "not_configured");

// ─── Customer route guards ─────────────────────────────────────────────────

process.env.MARIS_CUSTOMER_SESSION_SECRET = "test-customer-session-secret-0123456789";
const accountRoute = await import("../app/api/wholesale/account/route.js");
const catalogueRoute = await import("../app/api/wholesale/catalogue/route.js");
const ordersRoute = await import("../app/api/wholesale/orders/route.js");

const signedOut = await catalogueRoute.GET(new NextRequest("http://localhost/api/wholesale/catalogue"));
assert.equal(signedOut.status, 401, "Wholesale prices need a signed-in customer");
assert.equal(signedOut.headers.get("cache-control"), "private, no-store");
assert.equal((await accountRoute.GET(new NextRequest("http://localhost/api/wholesale/account"))).status, 401);

const crossSite = await ordersRoute.POST(new NextRequest("http://localhost/api/wholesale/orders", {
  method: "POST",
  headers: { origin: "https://evil.example", "content-type": "application/json" },
  body: JSON.stringify({ items: [] })
}));
assert.equal(crossSite.status, 403, "Cross-site purchase orders are blocked");

const forgedCookie = await ordersRoute.GET(new NextRequest("http://localhost/api/wholesale/orders", {
  headers: { cookie: "maris_customer_session=forged.signature" }
}));
assert.equal(forgedCookie.status, 401);

// ─── Source contracts ──────────────────────────────────────────────────────

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const adminPage = await read("app/admin/page.js");
const adminScript = await read("assets/js/admin-wholesale.js");
assert.match(adminPage, /data-admin-tab="wholesale"/);
assert.match(adminPage, /data-admin-panel="wholesale"/);
assert.match(adminPage, /buildAdminScriptSrc\("\/assets\/js\/admin-wholesale\.js"\)/, "The wholesale admin script is cache-busted like the others");
assert.match(adminScript, /\/api\/admin\/wholesale/);
assert.match(adminScript, /function escapeHtml\(/, "Admin wholesale markup escapes partner-supplied text");

const accountsRoute = await read("app/api/admin/wholesale/accounts/route.js");
const pricingRoute = await read("app/api/admin/wholesale/pricing/route.js");
const adminOrdersRoute = await read("app/api/admin/wholesale/orders/route.js");
assert.match(accountsRoute, /requireAdminPermission\(request, ADMIN_PERMISSIONS\.CATALOGUE_WRITE\)/, "Approving partners and discounts needs catalogue write");
assert.match(pricingRoute, /requireAdminPermission\(request, ADMIN_PERMISSIONS\.CATALOGUE_WRITE\)/);
assert.match(adminOrdersRoute, /requireAdminPermission\(request, ADMIN_PERMISSIONS\.OPERATIONS_WRITE\)/);
assert.match(adminOrdersRoute, /action === "quote" && !adminRoleHasPermission\(authorization\.user\.role, ADMIN_PERMISSIONS\.CATALOGUE_WRITE\)/,
  "Staff can move orders but only managers can set quoted prices");

const i18n = await import("../app/lib/i18n.js");
assert.equal(i18n.localizePath("/wholesale", "th"), "/th/wholesale");
const portalPage = await read("app/wholesale/page.js");
assert.match(portalPage, /noindex: true/, "The signed-in portal stays out of search results");

const migrationFiles = await readdir(new URL("../supabase/migrations/", import.meta.url));
const migrationFile = migrationFiles.find((name) => name.endsWith("_create_wholesale_program.sql"));
assert.ok(migrationFile, "A migration should create the wholesale program");
const migration = await read(`supabase/migrations/${migrationFile}`);
for (const table of ["wholesale_accounts", "product_wholesale_settings", "product_wholesale_price_breaks", "wholesale_orders", "wholesale_order_items"]) {
  assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
  assert.match(migration, new RegExp(`alter table public\\.${table}\\s+enable row level security`, "i"));
}
assert.doesNotMatch(migration, /create\s+policy/i, "Wholesale tables stay server-only: no RLS policies for anon or authenticated");
for (const fn of ["maris_submit_wholesale_order", "maris_customer_update_wholesale_order", "maris_admin_update_wholesale_order", "maris_admin_set_product_wholesale_pricing"]) {
  assert.match(migration, new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated`), `${fn} is not callable by the public`);
  assert.match(migration, new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role`));
}
assert.match(migration, /security definer\s+set search_path = ''/i);
assert.doesNotMatch(migration, /(insert into|update) public\.(orders|payments|products)\b|maris_apply_inventory_movement/i,
  "Wholesale orders are made to order and never touch retail stock or payments");

console.log("Wholesale contract checks passed.");
