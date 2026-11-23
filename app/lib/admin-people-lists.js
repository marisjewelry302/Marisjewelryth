// Pure helpers for the read-only Customers and Newsletter lists in the admin:
// query parsing, search / filter / sort / pagination, and CSV output. No
// database access here, so the rules can be tested without Supabase.

import { createAdminT, normalizeAdminLang } from "./admin-i18n.js";

export const PEOPLE_PAGE_SIZE = 25;
export const PEOPLE_MAX_PAGE_SIZE = 100;

export const CUSTOMER_SORTS = Object.freeze(["newest", "oldest", "name", "email"]);
export const NEWSLETTER_SORTS = Object.freeze(["newest", "oldest", "email"]);
export const NEWSLETTER_STATUSES = Object.freeze(["all", "subscribed", "unsubscribed"]);

// The only fields that may leave the server for each list. Rows are rebuilt from
// these names, so a new database column (or a password hash) can never ride along.
export const CUSTOMER_LIST_FIELDS = Object.freeze([
  "id", "fullName", "email", "phone", "createdAt", "marketing", "bagCount", "wishlistCount"
]);
export const NEWSLETTER_LIST_FIELDS = Object.freeze([
  "id", "email", "status", "subscribedAt", "source", "hasAccount"
]);

function pick(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, row?.[field] ?? null]));
}

export function toPublicCustomerRow(row) {
  return pick(row, CUSTOMER_LIST_FIELDS);
}

export function toPublicSubscriberRow(row) {
  return pick(row, NEWSLETTER_LIST_FIELDS);
}

function text(value) {
  return String(value ?? "").trim();
}

function positiveInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export function parsePeopleQuery(searchParams, { sorts, statuses = null } = {}) {
  const get = (name) => (typeof searchParams?.get === "function" ? searchParams.get(name) : searchParams?.[name]);
  const sort = text(get("sort")).toLowerCase();
  const status = text(get("status")).toLowerCase();

  return {
    search: text(get("q")).slice(0, 120),
    sort: sorts.includes(sort) ? sort : "newest",
    status: statuses && statuses.includes(status) ? status : "all",
    page: positiveInt(get("page"), 1),
    pageSize: Math.min(positiveInt(get("pageSize"), PEOPLE_PAGE_SIZE), PEOPLE_MAX_PAGE_SIZE)
  };
}

function matchesSearch(row, fields, search) {
  const needle = search.toLowerCase();
  return !needle || fields.some((field) => String(row[field] ?? "").toLowerCase().includes(needle));
}

function byDate(field, direction) {
  return (a, b) => {
    const left = Date.parse(a[field]) || 0;
    const right = Date.parse(b[field]) || 0;
    return direction === "asc" ? left - right : right - left;
  };
}

function byText(field) {
  return (a, b) => String(a[field] || "").localeCompare(String(b[field] || ""), undefined, { sensitivity: "base" });
}

export function filterCustomers(customers, { search = "", sort = "newest" } = {}) {
  const rows = customers.filter((row) => matchesSearch(row, ["fullName", "email", "phone"], search));
  const sorters = {
    newest: byDate("createdAt", "desc"),
    oldest: byDate("createdAt", "asc"),
    name: byText("fullName"),
    email: byText("email")
  };
  return rows.sort(sorters[sort] || sorters.newest);
}

export function filterSubscribers(subscribers, { search = "", sort = "newest", status = "all" } = {}) {
  const rows = subscribers
    .filter((row) => status === "all" || row.status === status)
    .filter((row) => matchesSearch(row, ["email", "source"], search));
  const sorters = {
    newest: byDate("subscribedAt", "desc"),
    oldest: byDate("subscribedAt", "asc"),
    email: byText("email")
  };
  return rows.sort(sorters[sort] || sorters.newest);
}

export function paginate(rows, { page = 1, pageSize = PEOPLE_PAGE_SIZE } = {}) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    total,
    page: currentPage,
    pageSize,
    pageCount
  };
}

// ── CSV ──────────────────────────────────────────────────────────────────────

export const CSV_BOM = "﻿";

// A spreadsheet runs a cell that starts with = + - or @ (or a tab / carriage
// return) as a formula. Prefixing an apostrophe makes it plain text.
export function neutraliseCsvCell(value) {
  const cell = String(value ?? "");
  return /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
}

export function escapeCsvCell(value) {
  const cell = neutraliseCsvCell(value);
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

// UTF-8 with a byte order mark so Excel opens Thai text correctly, and CRLF rows.
export function buildCsv(headers, rows) {
  const lines = [headers, ...rows].map((line) => line.map(escapeCsvCell).join(","));
  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
}

// The language of the CSV headers and labels (the admin page's language, "en"
// or "th"). The BOM and the formula neutralising above apply in both.
export function parseCsvLang(searchParams) {
  const value = typeof searchParams?.get === "function" ? searchParams.get("lang") : searchParams?.lang;
  return normalizeAdminLang(value);
}

function csvDate(value) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? "" : new Date(time).toISOString().slice(0, 10);
}

export function customersToCsv(customers, lang = "en") {
  const { t } = createAdminT(lang);
  const marketing = { subscribed: t("people.marketing.subscribed"), unsubscribed: t("people.marketing.unsubscribed"), none: t("people.marketing.none") };

  return buildCsv(
    [
      t("csv.customers.name"),
      t("csv.customers.email"),
      t("csv.customers.phone"),
      t("csv.customers.created"),
      t("csv.customers.marketing"),
      t("csv.customers.bag"),
      t("csv.customers.wishlist")
    ],
    customers.map((row) => [
      row.fullName,
      row.email,
      row.phone,
      csvDate(row.createdAt),
      marketing[row.marketing] || "",
      row.bagCount ?? "",
      row.wishlistCount ?? ""
    ])
  );
}

export function subscribersToCsv(subscribers, lang = "en") {
  const { t } = createAdminT(lang);
  const status = { subscribed: t("people.status.subscribed"), unsubscribed: t("people.status.unsubscribed") };

  return buildCsv(
    [
      t("csv.newsletter.email"),
      t("csv.newsletter.status"),
      t("csv.newsletter.subscribed"),
      t("csv.newsletter.source"),
      t("csv.newsletter.hasAccount")
    ],
    subscribers.map((row) => [
      row.email,
      status[row.status] || "",
      csvDate(row.subscribedAt),
      row.source,
      row.hasAccount ? t("common.yes") : t("common.no")
    ])
  );
}

export function csvFilename(kind, now = new Date()) {
  return `maris-${kind}-${now.toISOString().slice(0, 10)}.csv`;
}
