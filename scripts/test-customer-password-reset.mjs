// Contract tests for the customer password reset and the account "requests" list.
// No network, no real database: an in-memory Supabase stand-in and source checks.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createCustomerSession, hashCustomerPassword, verifyCustomerPassword } from "../app/lib/customer-auth.js";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_TTL_SECONDS,
  createPasswordResetToken,
  fingerprintPasswordHash,
  isPasswordResetConfigured,
  verifyPasswordResetToken
} from "../app/lib/customer-password-reset.js";
import {
  buildPasswordResetEmail,
  buildPasswordResetUrl,
  sendPasswordResetEmail
} from "../app/lib/customer-email.js";
import { createUnsubscribeToken } from "../app/lib/email-unsubscribe.js";
import {
  changeCustomerPassword,
  inspectPasswordResetToken,
  requestCustomerPasswordReset,
  resetCustomerPasswordWithToken
} from "../app/lib/customer-users.js";
import { createInquiry } from "../app/lib/inquiries.js";
import { normalizeCustomerInquiry, readCustomerInquiries } from "../app/lib/maris-database.js";
import { TRANSLATED_ROUTES, hasThaiVersion } from "../app/lib/i18n.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const SECRET = "test-customer-secret-value-not-real";
const env = {
  MARIS_CUSTOMER_SESSION_SECRET: SECRET,
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
  RESEND_API_KEY: "re_test_key",
  MARIS_EMAIL_FROM: "Maris <hello@example.com>"
};
const NOW = new Date("2026-11-20T10:00:00.000Z");
const minutes = (count) => new Date(NOW.getTime() + count * 60 * 1000);

// ─── In-memory Supabase stand-in ────────────────────────────────────────────

function readColumn(row, column) {
  const [base, key] = String(column).split("->>");
  return key ? row[base]?.[key] : row[base];
}

function createFakeClient(tables) {
  const state = { queries: [] };

  function from(name) {
    const rows = tables[name];
    assert.ok(rows, `unexpected table ${name}`);
    const query = { name, filters: [], columns: "", op: "select", head: false, patch: null, payload: null };
    state.queries.push(query);

    const run = () => {
      let matched = rows.filter((row) => query.filters.every(([kind, column, value]) => {
        const actual = readColumn(row, column);
        return kind === "eq" ? actual === value : String(actual) >= String(value);
      }));

      if (query.op === "insert") {
        const row = { id: `${name}-${rows.length + 1}`, status: "new", created_at: NOW.toISOString(), ...query.payload };
        rows.push(row);
        return { data: row, error: null };
      }

      if (query.op === "update") {
        matched.forEach((row) => Object.assign(row, query.patch));
        return { data: matched.map((row) => ({ id: row.id })), error: null };
      }

      if (query.head) {
        return { count: matched.length, data: null, error: null };
      }

      if (query.order) {
        matched = [...matched].sort((a, b) => String(b[query.order]).localeCompare(String(a[query.order])));
      }

      return { data: matched, error: null };
    };

    const builder = {
      select(columns, options) { query.columns = columns; query.head = Boolean(options?.head); return builder; },
      insert(payload) { query.op = "insert"; query.payload = payload; return builder; },
      update(patch) { query.op = "update"; query.patch = patch; return builder; },
      eq(column, value) { query.filters.push(["eq", column, value]); return builder; },
      gte(column, value) { query.filters.push(["gte", column, value]); return builder; },
      order(column) { query.order = column; return builder; },
      limit() { return builder; },
      async maybeSingle() { const { data, error } = run(); return { data: data?.[0] || null, error }; },
      async single() { const { data, error } = run(); return { data: Array.isArray(data) ? data[0] : data, error }; },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); }
    };

    return builder;
  }

  return { from, state };
}

function createCustomerRow(overrides = {}) {
  return {
    id: "customer-1",
    full_name: "Test Client",
    email: "client@example.com",
    phone: "",
    password_hash: hashCustomerPassword("original-password-12"),
    metadata: {},
    ...overrides
  };
}

// ─── Token: signature, expiry, no leakage ───────────────────────────────────

assert.equal(PASSWORD_MIN_LENGTH, 12, "Reset uses the shared 12-character minimum");
assert.ok(PASSWORD_RESET_TTL_SECONDS >= 30 * 60 && PASSWORD_RESET_TTL_SECONDS <= 60 * 60, "Reset links live 30-60 minutes");
assert.equal(isPasswordResetConfigured(env), true);
assert.equal(isPasswordResetConfigured({}), false);
assert.equal(isPasswordResetConfigured({ MARIS_CUSTOMER_SESSION_SECRET: "replace-with-a-long-random-customer-secret" }), false, "A placeholder secret is a blocker");

const customerHash = hashCustomerPassword("original-password-12");
const token = createPasswordResetToken({ customerId: "customer-1", passwordHash: customerHash }, { env, now: NOW });

assert.ok(token.includes("."), "Token is payload.signature");
assert.equal(verifyPasswordResetToken(token, { env, now: minutes(1) }).status, "valid");
assert.equal(verifyPasswordResetToken(token, { env, now: minutes(1) }).customerId, "customer-1");
assert.equal(verifyPasswordResetToken(token, { env, now: minutes(PASSWORD_RESET_TTL_SECONDS / 60 - 1) }).status, "valid");
assert.equal(verifyPasswordResetToken(token, { env, now: minutes(PASSWORD_RESET_TTL_SECONDS / 60 + 1) }).status, "expired", "Token expires");

const [payload, signature] = token.split(".");
const forgedPayload = Buffer.from(JSON.stringify({
  ...JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
  sub: "customer-2",
  exp: minutes(600).getTime()
})).toString("base64url");

assert.equal(verifyPasswordResetToken(`${forgedPayload}.${signature}`, { env, now: minutes(1) }).status, "invalid", "A changed payload fails the signature check");
assert.equal(verifyPasswordResetToken(`${payload}.${signature.slice(0, -2)}AA`, { env, now: minutes(1) }).status, "invalid", "A changed signature is rejected");
assert.equal(verifyPasswordResetToken(`${payload}.${signature}.extra`, { env, now: minutes(1) }).status, "invalid");
assert.equal(verifyPasswordResetToken("", { env }).status, "invalid");
assert.equal(verifyPasswordResetToken("not-a-token", { env }).status, "invalid");
assert.equal(
  verifyPasswordResetToken(token, { env: { MARIS_CUSTOMER_SESSION_SECRET: "another-secret-value" }, now: minutes(1) }).status,
  "invalid",
  "A token signed under another secret is rejected"
);
assert.equal(verifyPasswordResetToken(token, { env: {}, now: minutes(1) }).status, "not_configured", "No secret disables the feature instead of falling back");
assert.equal(createPasswordResetToken({ customerId: "customer-1", passwordHash: customerHash }, { env: {} }), "", "No token is issued without a secret");

// A signature made for another purpose must not verify as a reset token.
process.env.MARIS_CUSTOMER_SESSION_SECRET = SECRET;
const sessionToken = createCustomerSession({ id: "customer-1", email: "client@example.com" }, NOW);
assert.equal(verifyPasswordResetToken(sessionToken, { env, now: NOW }).status, "invalid", "A session cookie is not a reset token");
assert.equal(verifyPasswordResetToken(createUnsubscribeToken("client@example.com", { env }), { env, now: NOW }).status, "invalid", "An unsubscribe token is not a reset token");

// The token carries no email, hash or secret.
const decoded = Buffer.from(payload, "base64url").toString("utf8");
assert.ok(!decoded.includes("client@example.com"), "Token carries no email");
assert.ok(!decoded.includes(customerHash) && !token.includes(customerHash), "Token carries no password hash");
assert.ok(!token.includes(SECRET) && !decoded.includes(SECRET), "Token carries no secret");
assert.notEqual(fingerprintPasswordHash(customerHash, { env }), fingerprintPasswordHash(customerHash, { env: { MARIS_CUSTOMER_SESSION_SECRET: "another-secret-value" } }), "Fingerprint is keyed");

// ─── Single use, bound to the current password ──────────────────────────────

{
  const tables = { customers: [createCustomerRow()] };
  const client = createFakeClient(tables);
  const issued = createPasswordResetToken({ customerId: "customer-1", passwordHash: tables.customers[0].password_hash }, { env, now: NOW });

  assert.deepEqual(
    await inspectPasswordResetToken(issued, { env, client, now: minutes(5) }).then(({ status }) => status),
    "valid"
  );
  assert.equal((await inspectPasswordResetToken(issued, { env, client, now: minutes(99) })).status, "expired");
  assert.equal((await inspectPasswordResetToken("garbage", { env, client })).status, "invalid");

  // The 12-character minimum is enforced and nothing changes on failure.
  const before = tables.customers[0].password_hash;
  const tooShort = await resetCustomerPasswordWithToken(issued, "x".repeat(PASSWORD_MIN_LENGTH - 1), { env, client, now: minutes(5) });
  assert.equal(tooShort.status, "invalid_password");
  assert.equal(tooShort.code, "password_too_short");
  assert.equal(tables.customers[0].password_hash, before, "A rejected password changes nothing");

  const exactly = "y".repeat(PASSWORD_MIN_LENGTH);
  const reset = await resetCustomerPasswordWithToken(issued, exactly, { env, client, now: minutes(5) });
  assert.equal(reset.status, "reset");
  assert.ok(verifyCustomerPassword(exactly, tables.customers[0].password_hash), "The new password is stored with the existing scrypt hashing");
  assert.ok(!verifyCustomerPassword("original-password-12", tables.customers[0].password_hash), "The old password stops working");
  assert.ok(tables.customers[0].password_hash.startsWith("scrypt:v1:"));

  // Used: the same link now fails, for inspection and for a second reset.
  assert.equal((await inspectPasswordResetToken(issued, { env, client, now: minutes(6) })).status, "used");
  assert.equal((await resetCustomerPasswordWithToken(issued, "z".repeat(16), { env, client, now: minutes(6) })).status, "used");
  assert.ok(verifyCustomerPassword(exactly, tables.customers[0].password_hash), "A used link cannot overwrite the password");

  // A link issued before a normal password change is dead too.
  const second = createPasswordResetToken({ customerId: "customer-1", passwordHash: tables.customers[0].password_hash }, { env, now: minutes(10) });
  assert.equal((await inspectPasswordResetToken(second, { env, client, now: minutes(11) })).status, "valid");
  const changed = await changeCustomerPassword("customer-1", exactly, "a-different-password", { env, client });
  assert.equal(changed.status, "updated");
  assert.equal((await inspectPasswordResetToken(second, { env, client, now: minutes(12) })).status, "used", "A token stops working once the password changes");

  // A deleted account looks like any other bad link.
  tables.customers.length = 0;
  assert.equal((await inspectPasswordResetToken(second, { env, client, now: minutes(12) })).status, "invalid");
}

// ─── Request: same outcome for unknown emails, email only when it exists ────

{
  const tables = { customers: [createCustomerRow()] };
  const client = createFakeClient(tables);
  const sent = [];
  const sendEmail = async (customer) => { sent.push(customer); return { status: "sent" }; };

  const unknown = await requestCustomerPasswordReset("nobody@example.com", { env, client, now: NOW, sendEmail });
  assert.equal(unknown.status, "no_account");
  assert.equal(sent.length, 0, "No email goes to an address without an account");

  const known = await requestCustomerPasswordReset(" Client@Example.com ", { env, client, now: NOW, locale: "th", sendEmail });
  assert.equal(known.status, "sent");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, "client@example.com");
  assert.equal(sent[0].locale, "th");
  assert.equal(verifyPasswordResetToken(sent[0].token, { env, now: minutes(1) }).customerId, "customer-1");

  assert.equal((await requestCustomerPasswordReset("not-an-email", { env, client, now: NOW, sendEmail })).status, "no_account");
  assert.equal((await requestCustomerPasswordReset("client@example.com", { env: { ...env, MARIS_CUSTOMER_SESSION_SECRET: "" }, client, now: NOW, sendEmail })).status, "not_configured");
}

// ─── Email ──────────────────────────────────────────────────────────────────

{
  const resetUrl = buildPasswordResetUrl("abc.def", { locale: "en" });
  const resetUrlTh = buildPasswordResetUrl("abc.def", { locale: "th" });
  assert.match(resetUrl, /^https:\/\/[^/]+\/account\/reset-password\?token=abc\.def$/);
  assert.match(resetUrlTh, /^https:\/\/[^/]+\/th\/account\/reset-password\?token=abc\.def$/);

  const en = buildPasswordResetEmail({ fullName: "A <b>Client</b>", resetUrl, locale: "en" });
  const th = buildPasswordResetEmail({ fullName: "ลูกค้า", resetUrl: resetUrlTh, locale: "th" });
  assert.match(en.subject, /Reset your Maris Jewelry password/);
  assert.match(th.subject, /รหัสผ่าน/);
  assert.ok(en.html.includes(resetUrl) && en.text.includes(resetUrl));
  assert.ok(th.html.includes(resetUrlTh) && th.text.includes(resetUrlTh));
  assert.ok(!en.html.includes("<b>Client</b>"), "Names are escaped in HTML");
  assert.ok(!/unsubscribe/i.test(en.html + en.text), "A transactional reset email carries no marketing footer");
  assert.match(en.text, /45 minutes/);
  assert.match(th.text, /45 นาที/);

  const requests = [];
  const fetchImpl = async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({ id: "email-1" }) }; };
  const result = await sendPasswordResetEmail({ email: "client@example.com", fullName: "Client", token: "abc.def", locale: "en" }, { env, fetchImpl });
  assert.equal(result.status, "sent");
  assert.equal(requests.length, 1);
  const body = JSON.parse(requests[0].options.body);
  assert.deepEqual(body.to, ["client@example.com"]);
  assert.ok(!("headers" in body), "No List-Unsubscribe header on a reset email");
  assert.ok(!requests[0].options.body.includes(SECRET) && !requests[0].options.body.includes("re_test_key"), "Request body leaks no secret");

  assert.deepEqual(
    await sendPasswordResetEmail({ email: "client@example.com", token: "abc.def" }, { env: {}, fetchImpl }),
    { status: "not_configured", missingEnv: ["RESEND_API_KEY", "MARIS_EMAIL_FROM"] }
  );
  assert.equal(requests.length, 1, "Nothing is sent without email configuration");

  await assert.rejects(
    sendPasswordResetEmail({ email: "client@example.com", token: "secret-token-value", locale: "en" }, {
      env,
      fetchImpl: async () => ({ ok: false, status: 422, text: async () => "echo secret-token-value" })
    }),
    (error) => error.statusCode === 422 && !error.message.includes("secret-token-value"),
    "Provider errors never repeat the reset link"
  );
}

// ─── Routes and pages (source contract) ─────────────────────────────────────

const requestRoute = await read("app/api/account/password-reset/request/route.js");
const confirmRoute = await read("app/api/account/password-reset/confirm/route.js");

assert.match(requestRoute, /isSameOriginRequest/);
assert.match(requestRoute, /consumeAuthAttempt/, "Request route is rate limited with the shared helper");
assert.match(requestRoute, /after\(/, "Lookup and email run after the response so timing does not reveal accounts");
assert.ok(requestRoute.indexOf("consumeAuthAttempt") < requestRoute.indexOf("await requestCustomerPasswordReset"), "Rate limit runs before the lookup");
assert.equal(requestRoute.match(/NextResponse\.json\(\{ ok: true \}/g)?.length, 1, "Exactly one success response");
assert.ok(!/result\.status|no_account|already|exists/i.test(requestRoute.replace(/\/\/.*$/gm, "")), "Request route never branches on or mentions whether an account exists");
assert.ok(!/NextResponse\.json\([^)]*(token|customer|email:)/.test(requestRoute.replace(/\{ error: [^}]*\}/g, "")), "Request route returns no token or customer data");

assert.match(confirmRoute, /isSameOriginRequest/);
assert.match(confirmRoute, /consumeAuthAttempt/);
assert.match(confirmRoute, /resetCustomerPasswordWithToken/);
assert.match(confirmRoute, /PASSWORD_MIN_LENGTH/);
assert.match(confirmRoute, /cookieStore\.delete\(SESSION_COOKIE_NAME\)/, "This browser's session is cleared after a reset");
assert.match(confirmRoute, /token_expired|token_\$\{result\.status\}/, "Confirm route reports expired, invalid and used states");

for (const [name, source] of [["request", requestRoute], ["confirm", confirmRoute]]) {
  assert.ok(!/console\.\w+\([^)]*\b(token|body|newPassword)\b/.test(source.replace(/"[^"]*"/g, '""')),`${name} route never logs the token or a password`);
  assert.ok(!/MARIS_CUSTOMER_SESSION_SECRET|sessionSecret/.test(source), `${name} route never touches the secret directly`);
}

const resetLib = await read("app/lib/customer-password-reset.js");
assert.match(resetLib, /MARIS_CUSTOMER_SESSION_SECRET/, "Reuses the existing customer secret, no new env var");
assert.ok(!/process\.env\.[A-Z_]*RESET/.test(resetLib), "No new secret is introduced");

for (const path of ["app/account/reset-password/page.js", "app/th/account/reset-password/page.js"]) {
  const page = await read(path);
  assert.match(page, /noindex: true/, `${path} is noindex`);
  assert.match(page, /referrer: "no-referrer"/, `${path} does not leak the token in the Referer header`);
  assert.match(page, /ResetPasswordView/);
}

assert.ok(TRANSLATED_ROUTES.includes("/account/reset-password"), "Reset page is in the i18n path list");
assert.equal(hasThaiVersion("/account/reset-password"), true);

const resetClient = await read("app/account/reset-password/ResetPasswordClient.jsx");
assert.match(resetClient, /minLength=\{PASSWORD_MIN_LENGTH\}/);
assert.match(resetClient, /\/api\/account\/password-reset\/confirm/);
assert.match(resetClient, /\?reset=success/);

const { shopEn, shopTh } = await import("../app/lib/ui-text-shop.js");

function keysOf(value, prefix = "") {
  return Object.entries(value).flatMap(([key, entry]) =>
    entry && typeof entry === "object" && !Array.isArray(entry) ? keysOf(entry, `${prefix}${key}.`) : [`${prefix}${key}`]);
}

for (const section of ["reset", "requests", "msg"]) {
  assert.deepEqual(keysOf(shopEn.account[section]).sort(), keysOf(shopTh.account[section]).sort(), `account.${section} has the same keys in EN and TH`);
}

for (const key of ["forgotLink", "signInInstead", "backToSignIn", "forgotTitle", "forgotLead", "sendResetLink", "sendingReset"]) {
  assert.ok(shopEn.account[key] && shopTh.account[key], `account.${key} exists in EN and TH`);
}

const accountClient = await read("app/account/AccountClient.jsx");
assert.match(accountClient, /\/api\/account\/password-reset\/request/);
assert.match(accountClient, /duplicateEmail/, "Duplicate sign-up offers Sign in instead and Forgot password");
assert.match(accountClient, /a\.signInInstead/);
assert.match(accountClient, /mode === "forgot"/);
assert.match(accountClient, /reset"\) === "success"/);

// ─── Account requests: linkage and privacy ──────────────────────────────────

assert.ok(!/marisLeadInbox|LEAD_KEY/.test(accountClient), "The dead marisLeadInbox code is gone");
assert.match(accountClient, /\/api\/account\/inquiries/);
assert.ok(!/href=\{href\("\/request-quote"\)\}/.test(accountClient), "The quotes tile no longer points at /request-quote");

const inquiriesRoute = await read("app/api/account/inquiries/route.js");
assert.match(inquiriesRoute, /verifyCustomerSession/);
assert.ok(inquiriesRoute.indexOf("not_signed_in") < inquiriesRoute.indexOf("await readCustomerInquiries"), "Auth is checked before any read");
assert.match(inquiriesRoute, /status: 401/);
assert.match(inquiriesRoute, /readCustomerInquiries\(session\.customerId\)/, "The customer id comes only from the verified session");
assert.ok(!/searchParams|request\.url|\.json\(\)|params/.test(inquiriesRoute.replace(/NextResponse\.json/g, "")), "The route accepts no id or email from the caller");
assert.match(inquiriesRoute, /Cache-Control/);

const inquiriesModule = await read("app/lib/maris-database/inquiries.js");
const customerSection = inquiriesModule.slice(inquiriesModule.indexOf("// ─── Customer account"));
assert.match(customerSection, /\.eq\("customer_id", id\)/);
assert.ok(!/\.eq\("email"|ilike|lower\(email\)|\.or\(/.test(customerSection), "Nothing is matched by email, which is unverified");

{
  const tables = {
    inquiries: [
      { id: "i-1", customer_id: "customer-1", kind: "quote", email: "client@example.com", phone: "0812345678", subject: "Maris Website Quote Request", message: "I would like a quote\nfor two rings. ".repeat(20), status: "replied", fields: { service: "Wedding Bands", selected_pieces: "1. Halo Ring | Engagement | Qty 1 | 18K | /product/halo\n2. Plain Band | Wedding | Qty 2 | | /product/band", budget_range: "private" }, metadata: { requestFingerprint: "x", phoneDigits: "0812345678" }, created_at: "2026-11-01T00:00:00.000Z" },
      { id: "i-2", customer_id: "customer-1", kind: "contact", email: "client@example.com", message: "Hello", status: "new", fields: {}, metadata: {}, created_at: "2026-11-02T00:00:00.000Z" },
      { id: "i-3", customer_id: "customer-2", kind: "quote", email: "other@example.com", message: "Not yours", status: "new", fields: {}, metadata: {}, created_at: "2026-11-03T00:00:00.000Z" },
      // Same email as customer-1 but sent while signed out: must never be listed.
      { id: "i-4", customer_id: null, kind: "quote", email: "client@example.com", message: "Anonymous, same email", status: "new", fields: {}, metadata: {}, created_at: "2026-11-04T00:00:00.000Z" }
    ]
  };
  const client = createFakeClient(tables);
  const result = await readCustomerInquiries("customer-1", { env, client });

  assert.equal(result.status, "ready");
  assert.deepEqual(result.inquiries.map((row) => row.id), ["i-2", "i-1"], "Only this customer's rows, newest first");
  assert.equal(result.quoteCount, 1);
  assert.equal(result.total, 2);
  assert.ok(!result.inquiries.some((row) => row.id === "i-3" || row.id === "i-4"), "Another customer's rows and same-email anonymous rows are excluded");

  const query = client.state.queries.find((entry) => entry.name === "inquiries");
  assert.deepEqual(query.filters, [["eq", "customer_id", "customer-1"]], "The only filter is customer_id");
  assert.ok(!/email|phone|metadata/.test(query.columns), "The query never selects contact details or metadata");

  const first = result.inquiries.find((row) => row.id === "i-1");
  assert.deepEqual(Object.keys(first).sort(), ["createdAt", "excerpt", "id", "kind", "pieces", "service", "status"]);
  assert.deepEqual(first.pieces, ["Halo Ring", "Plain Band"]);
  assert.equal(first.service, "Wedding Bands");
  assert.equal(first.status, "replied");
  assert.ok(first.excerpt.length <= 160, "Excerpt is short");
  assert.ok(!JSON.stringify(result).includes("0812345678") && !JSON.stringify(result).includes("client@example.com"), "No contact details in the payload");
  assert.equal(normalizeCustomerInquiry(null), null);

  assert.equal((await readCustomerInquiries("", { env, client })).status, "invalid", "No customer id, no rows");
  assert.equal((await readCustomerInquiries("customer-1", { env: {} })).status, "not_configured");

  // createInquiry links to the signed-in customer only through its option.
  const submit = (extra = {}, options = {}) => createInquiry(
    { kind: "quote", fields: { name: "Client", email: "client@example.com", message: `Hi ${Math.random()}`, ...extra } },
    { env, client: createFakeClient({ inquiries: tables.inquiries, customers: [{ id: "customer-1" }] }), now: () => NOW, ...options }
  );

  await submit({}, { customerId: "customer-1" });
  assert.equal(tables.inquiries.at(-1).customer_id, "customer-1", "A signed-in submission is linked to the customer");

  await submit({}, {});
  assert.equal(tables.inquiries.at(-1).customer_id, null, "A signed-out submission is not linked");

  await createInquiry(
    { kind: "quote", customerId: "customer-1", customer_id: "customer-1", fields: { name: "Client", email: "client@example.com", message: "forged", customer_id: "customer-1", customerId: "customer-1" } },
    { env, client: createFakeClient({ inquiries: tables.inquiries, customers: [{ id: "customer-1" }] }), now: () => NOW }
  );
  assert.equal(tables.inquiries.at(-1).customer_id, null, "A customer id sent in the request body is ignored");

  await submit({}, { customerId: "deleted-customer" });
  assert.equal(tables.inquiries.at(-1).customer_id, null, "A stale session for a deleted customer does not break or mislink the enquiry");
}

const inquiryRoute = await read("app/api/inquiries/route.js");
assert.match(inquiryRoute, /verifyCustomerSession\(request\.cookies\.get\(SESSION_COOKIE_NAME\)\?\.value\)/, "The inquiry route reads the verified session cookie");
assert.match(inquiryRoute, /customerId: session\.isValid \? session\.customerId : null/);

const accountPage = await read("app/account/page.js");
assert.ok(!/browser-based/i.test(accountPage + shopEn.account.metaDescription), "The account description no longer claims a browser-only area");
assert.match(shopEn.account.metaDescription, /quote requests/i);

console.log("customer password reset and account requests contract passed");
