// Wholesale (B2B) rules shared by the server, the portal and the tests.
//
// Pricing here only *displays* prices. The amount a customer is charged is
// computed again by public.maris_submit_wholesale_order() in
// supabase/migrations/20261106000000_create_wholesale_program.sql, from the
// database, so the two must stay in step: change one, change both.

export const WHOLESALE_ACCOUNT_STATUSES = Object.freeze(["pending", "approved", "rejected", "suspended"]);

export const WHOLESALE_BUSINESS_TYPES = Object.freeze([
  "retailer",
  "online_store",
  "private_label",
  "distributor",
  "corporate_gifting",
  "other"
]);

export const WHOLESALE_PAYMENT_TERMS = Object.freeze(["prepaid", "deposit_50", "net_15", "net_30"]);

export const WHOLESALE_CATEGORIES = Object.freeze([
  "fine-jewelry",
  "real-gold",
  "real-diamond",
  "real-gemstone"
]);

export const WHOLESALE_ORDER_STATUSES = Object.freeze([
  "submitted",
  "quoted",
  "confirmed",
  "in_production",
  "ready",
  "shipped",
  "completed",
  "cancelled"
]);

// Admin action -> the statuses it may start from. Mirrors the SQL guard.
export const WHOLESALE_ADMIN_ACTIONS = Object.freeze({
  quote: ["submitted", "quoted"],
  confirm: ["submitted", "quoted"],
  start_production: ["confirmed"],
  mark_ready: ["confirmed", "in_production"],
  ship: ["ready"],
  complete: ["shipped"],
  cancel: ["submitted", "quoted", "confirmed", "in_production", "ready"],
  note: WHOLESALE_ORDER_STATUSES
});

export const WHOLESALE_CUSTOMER_ACTIONS = Object.freeze({
  accept: ["quoted"],
  cancel: ["submitted", "quoted"]
});

export const WHOLESALE_MAX_ORDER_LINES = 100;
export const WHOLESALE_MAX_QUANTITY = 100000;
export const WHOLESALE_MAX_PRICE_BREAKS = 10;
export const WHOLESALE_MAX_DISCOUNT_PERCENT = 90;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_PATTERN.test(String(value || ""));
}

function cleanText(value, maxLength) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMultiline(value, maxLength) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function toInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function toMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// ─── Pricing ───────────────────────────────────────────────────────────────

// Breaks sorted by min quantity, ascending. Invalid rows are dropped.
export function sortPriceBreaks(breaks) {
  return (Array.isArray(breaks) ? breaks : [])
    .map((entry) => ({
      minQuantity: toInteger(entry?.minQuantity ?? entry?.min_quantity),
      unitPrice: toMoney(entry?.unitPrice ?? entry?.unit_price)
    }))
    .filter((entry) => entry.minQuantity >= 1 && entry.unitPrice > 0)
    .sort((left, right) => left.minQuantity - right.minQuantity);
}

// The list price before the account discount, or null for price on request.
export function getWholesaleListPrice({ priceBreaks, basePrice, quantity }) {
  const qty = Number(quantity) || 0;
  const applicable = sortPriceBreaks(priceBreaks).filter((entry) => entry.minQuantity <= qty).at(-1);

  if (applicable) {
    return applicable.unitPrice;
  }

  const base = toMoney(basePrice);
  return base > 0 ? base : null;
}

export function computeWholesaleUnitPrice({ priceBreaks, basePrice, quantity, discountPercent = 0 }) {
  const list = getWholesaleListPrice({ priceBreaks, basePrice, quantity });

  if (list === null) {
    return null;
  }

  const discount = Math.min(Math.max(Number(discountPercent) || 0, 0), WHOLESALE_MAX_DISCOUNT_PERCENT);
  return roundMoney((list * (100 - discount)) / 100);
}

// Returns null when the quantity is acceptable, or an error code.
export function validateWholesaleQuantity({ quantity, minimumOrderQuantity = 1, casePack = 1 }) {
  const qty = toInteger(quantity);
  const moq = Math.max(toInteger(minimumOrderQuantity) || 1, 1);
  const pack = Math.max(toInteger(casePack) || 1, 1);

  if (qty === null || qty < 1 || qty > WHOLESALE_MAX_QUANTITY) return "invalid_quantity";
  if (qty < moq) return "below_moq";
  if (qty % pack !== 0) return "case_pack";
  return null;
}

// The smallest valid quantity at or above `quantity`.
export function snapWholesaleQuantity({ quantity, minimumOrderQuantity = 1, casePack = 1 }) {
  const moq = Math.max(toInteger(minimumOrderQuantity) || 1, 1);
  const pack = Math.max(toInteger(casePack) || 1, 1);
  const wanted = Math.max(toInteger(quantity) || moq, moq);
  return Math.min(Math.ceil(wanted / pack) * pack, Math.floor(WHOLESALE_MAX_QUANTITY / pack) * pack);
}

// Cart totals for display. Lines without a price are counted separately.
export function summarizeWholesaleCart(lines) {
  let subtotal = 0;
  let pieces = 0;
  let unpricedLines = 0;

  for (const line of Array.isArray(lines) ? lines : []) {
    const qty = toInteger(line?.quantity) || 0;
    pieces += qty;

    if (line?.unitPrice === null || line?.unitPrice === undefined) {
      unpricedLines += 1;
    } else {
      subtotal += Number(line.unitPrice) * qty;
    }
  }

  return { subtotal: roundMoney(subtotal), pieces, unpricedLines };
}

// ─── Input normalization ───────────────────────────────────────────────────

export function normalizeWholesaleApplication(input = {}) {
  const errors = [];
  const application = {
    companyName: cleanText(input.companyName, 160),
    businessType: cleanText(input.businessType, 40),
    taxId: cleanText(input.taxId, 40),
    businessAddress: cleanMultiline(input.businessAddress, 600),
    country: cleanText(input.country, 80) || "Thailand",
    website: cleanText(input.website, 200),
    contactName: cleanText(input.contactName, 120),
    contactPhone: cleanText(input.contactPhone, 40),
    lineId: cleanText(input.lineId, 60),
    expectedMonthlyVolume: cleanText(input.expectedMonthlyVolume, 120),
    interestedCategories: Array.from(new Set(
      (Array.isArray(input.interestedCategories) ? input.interestedCategories : [])
        .map((value) => cleanText(value, 40))
        .filter((value) => WHOLESALE_CATEGORIES.includes(value))
    )),
    applicantNote: cleanMultiline(input.applicantNote, 2000)
  };

  if (application.companyName.length < 2) errors.push("companyName");
  if (!WHOLESALE_BUSINESS_TYPES.includes(application.businessType)) errors.push("businessType");
  if (application.businessAddress.length < 10) errors.push("businessAddress");
  if (application.contactName.length < 2) errors.push("contactName");
  if (!/^[+0-9][0-9\s\-()]{6,}$/.test(application.contactPhone)) errors.push("contactPhone");
  if (application.website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(application.website)) errors.push("website");

  return { application, errors };
}

export function normalizeWholesaleOrderInput(input = {}) {
  const errors = [];
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = rawItems.map((item) => ({
    productId: String(item?.productId || ""),
    quantity: toInteger(item?.quantity)
  }));

  if (items.length < 1 || items.length > WHOLESALE_MAX_ORDER_LINES) errors.push("items");
  if (items.some((item) => !isUuid(item.productId) || !(item.quantity >= 1 && item.quantity <= WHOLESALE_MAX_QUANTITY))) {
    errors.push("items");
  }

  const shippingAddress = cleanMultiline(input.shippingAddress, 600);
  if (shippingAddress.length < 10) errors.push("shippingAddress");

  const requestedShipDate = cleanText(input.requestedShipDate, 10);
  if (requestedShipDate && !/^\d{4}-\d{2}-\d{2}$/.test(requestedShipDate)) errors.push("requestedShipDate");

  const idempotencyKey = cleanText(input.idempotencyKey, 120);

  return {
    order: {
      items,
      shippingAddress,
      customerReference: cleanText(input.customerReference, 80),
      requestedShipDate: requestedShipDate || null,
      customerNote: cleanMultiline(input.customerNote, 2000),
      idempotencyKey: idempotencyKey || null
    },
    errors: Array.from(new Set(errors))
  };
}

// Admin input for one product's wholesale terms.
export function normalizeWholesalePricingInput(input = {}) {
  const errors = [];
  const minimumOrderQuantity = toInteger(input.minimumOrderQuantity) ?? 1;
  const casePack = toInteger(input.casePack) ?? 1;
  const leadTimeDays = input.leadTimeDays === "" || input.leadTimeDays === null || input.leadTimeDays === undefined
    ? null
    : toInteger(input.leadTimeDays);
  const rawBreaks = Array.isArray(input.priceBreaks) ? input.priceBreaks : [];
  const priceBreaks = rawBreaks
    .filter((entry) => entry && (entry.minQuantity !== "" || entry.unitPrice !== ""))
    .map((entry) => ({ minQuantity: toInteger(entry.minQuantity), unitPrice: toMoney(entry.unitPrice) }));

  if (!(minimumOrderQuantity >= 1 && minimumOrderQuantity <= WHOLESALE_MAX_QUANTITY)) errors.push("minimumOrderQuantity");
  if (!(casePack >= 1 && casePack <= 10000)) errors.push("casePack");
  if (leadTimeDays !== null && !(leadTimeDays >= 0 && leadTimeDays <= 365)) errors.push("leadTimeDays");
  if (priceBreaks.length > WHOLESALE_MAX_PRICE_BREAKS) errors.push("priceBreaks");
  if (priceBreaks.some((entry) => !(entry.minQuantity >= 1 && entry.minQuantity <= WHOLESALE_MAX_QUANTITY) || !(entry.unitPrice > 0))) {
    errors.push("priceBreaks");
  }

  const sorted = [...priceBreaks].sort((left, right) => left.minQuantity - right.minQuantity);
  if (new Set(sorted.map((entry) => entry.minQuantity)).size !== sorted.length) errors.push("priceBreaksDuplicate");
  // A bigger order must never cost more per piece.
  if (sorted.some((entry, index) => index > 0 && entry.unitPrice > sorted[index - 1].unitPrice)) {
    errors.push("priceBreaksOrder");
  }

  return {
    pricing: {
      isEnabled: input.isEnabled === true || input.isEnabled === "true" || input.isEnabled === "on",
      minimumOrderQuantity,
      casePack,
      leadTimeDays,
      note: cleanText(input.note, 500),
      priceBreaks: sorted
    },
    errors: Array.from(new Set(errors))
  };
}

export function normalizeAdminAccountUpdate(input = {}) {
  const errors = [];
  const update = {};

  if (input.status !== undefined) {
    if (WHOLESALE_ACCOUNT_STATUSES.includes(input.status)) update.status = input.status;
    else errors.push("status");
  }

  if (input.discountPercent !== undefined) {
    const discount = toMoney(input.discountPercent);
    if (discount !== null && discount >= 0 && discount <= WHOLESALE_MAX_DISCOUNT_PERCENT) update.discountPercent = discount;
    else errors.push("discountPercent");
  }

  if (input.paymentTerms !== undefined) {
    if (WHOLESALE_PAYMENT_TERMS.includes(input.paymentTerms)) update.paymentTerms = input.paymentTerms;
    else errors.push("paymentTerms");
  }

  if (input.adminNote !== undefined) {
    update.adminNote = cleanMultiline(input.adminNote, 1000);
  }

  if (Object.keys(update).length === 0) errors.push("empty");

  return { update, errors };
}

export function normalizeAdminOrderAction(input = {}) {
  const errors = [];
  const action = String(input.action || "");

  if (!Object.hasOwn(WHOLESALE_ADMIN_ACTIONS, action)) {
    return { command: null, errors: ["action"] };
  }

  const command = {
    action,
    note: cleanMultiline(input.note, 1000),
    items: null,
    shippingAmount: null,
    discountAmount: null,
    quoteValidUntil: null,
    trackingNumber: null
  };

  if (action === "quote") {
    if (Array.isArray(input.items)) {
      command.items = input.items.map((item) => ({ id: String(item?.id || ""), unitPrice: toMoney(item?.unitPrice) }));
      if (command.items.some((item) => !isUuid(item.id) || item.unitPrice === null || item.unitPrice < 0)) errors.push("items");
    }
    command.shippingAmount = toMoney(input.shippingAmount) ?? 0;
    command.discountAmount = toMoney(input.discountAmount) ?? 0;
    if (command.shippingAmount < 0) errors.push("shippingAmount");
    if (command.discountAmount < 0) errors.push("discountAmount");
    const validUntil = cleanText(input.quoteValidUntil, 10);
    if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) errors.push("quoteValidUntil");
    command.quoteValidUntil = validUntil || null;
  }

  if (action === "ship") {
    command.trackingNumber = cleanText(input.trackingNumber, 120) || null;
  }

  if (action === "note" && !command.note) errors.push("note");

  return { command, errors };
}

// ─── Row shaping ───────────────────────────────────────────────────────────

export function normalizeWholesaleAccount(row, { forCustomer = false } = {}) {
  if (!row) return null;

  const account = {
    id: row.id,
    customerId: row.customer_id || null,
    companyName: row.company_name || "",
    businessType: row.business_type || "",
    taxId: row.tax_id || "",
    businessAddress: row.business_address || "",
    country: row.country || "",
    website: row.website || "",
    contactName: row.contact_name || "",
    contactPhone: row.contact_phone || "",
    lineId: row.line_id || "",
    expectedMonthlyVolume: row.expected_monthly_volume || "",
    interestedCategories: Array.isArray(row.interested_categories) ? row.interested_categories : [],
    applicantNote: row.applicant_note || "",
    status: row.status || "pending",
    discountPercent: Number(row.discount_percent) || 0,
    paymentTerms: row.payment_terms || "prepaid",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };

  if (forCustomer) {
    return account;
  }

  return {
    ...account,
    adminNote: row.admin_note || "",
    reviewedBy: row.reviewed_by || "",
    reviewedAt: row.reviewed_at || null,
    customerEmail: row.customers?.email || "",
    customerName: row.customers?.full_name || ""
  };
}

function toNumberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

export function normalizeWholesaleOrder(row, { forCustomer = false } = {}) {
  if (!row) return null;

  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  // A note added without a status change is an internal atelier note, so
  // clients see only status changes (and the note written with each).
  const history = Array.isArray(metadata.history)
    ? metadata.history
      .filter((entry) => !forCustomer || entry?.actor === "customer" || entry?.fromStatus !== entry?.toStatus)
      .map((entry) => ({
        at: entry?.at || null,
        actor: forCustomer ? (entry?.actor === "customer" ? "customer" : "atelier") : String(entry?.actor || ""),
        fromStatus: String(entry?.fromStatus || ""),
        toStatus: String(entry?.toStatus || ""),
        note: String(entry?.note || "")
      }))
    : [];
  const items = (Array.isArray(row.wholesale_order_items) ? row.wholesale_order_items : [])
    .map((item) => ({
      id: item.id,
      productId: item.product_id || null,
      sku: item.product_sku || "",
      name: item.product_name || "",
      quantity: Number(item.quantity) || 0,
      listUnitPrice: toNumberOrNull(item.list_unit_price),
      unitPrice: toNumberOrNull(item.unit_price),
      lineTotal: toNumberOrNull(item.line_total)
    }))
    .sort((left, right) => left.sku.localeCompare(right.sku));

  const order = {
    id: row.id,
    orderNumber: row.order_number || "",
    status: row.status || "submitted",
    customerReference: row.customer_reference || "",
    requestedShipDate: row.requested_ship_date || null,
    shippingAddress: row.shipping_address || "",
    customerNote: row.customer_note || "",
    discountPercent: Number(row.discount_percent) || 0,
    subtotalAmount: Number(row.subtotal_amount) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    shippingAmount: Number(row.shipping_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    currency: String(row.currency || "THB").trim(),
    paymentTerms: row.payment_terms || "prepaid",
    quoteValidUntil: row.quote_valid_until || null,
    trackingNumber: row.tracking_number || "",
    submittedAt: row.submitted_at || row.created_at || null,
    updatedAt: row.updated_at || null,
    hasUnpricedItems: items.some((item) => item.unitPrice === null),
    items,
    history
  };

  if (forCustomer) {
    return order;
  }

  const account = row.wholesale_accounts || {};
  return {
    ...order,
    accountId: row.wholesale_account_id || null,
    companyName: account.company_name || "",
    contactName: account.contact_name || "",
    contactPhone: account.contact_phone || "",
    customerEmail: account.customers?.email || ""
  };
}

// Supabase/PostgREST errors raised by the wholesale functions carry a SQLSTATE.
// Business-rule messages are written for customers, so they pass through.
export function mapWholesaleDatabaseError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");

  if (code === "42501") return { statusCode: 403, message };
  if (code === "P0002") return { statusCode: 404, message };
  if (code === "22023" || code === "23514") return { statusCode: 400, message };
  if (code === "23505") return { statusCode: 409, message: "This record already exists." };
  return { statusCode: 500, message: "Wholesale request could not be completed." };
}
