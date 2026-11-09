import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { normalizeInquiryInput } = await import("../app/lib/inquiries.js");
const {
  buildInquiryAcknowledgementEmail,
  sendInquiryEmails
} = await import("../app/lib/inquiry-email.js");

const ENV = {
  RESEND_API_KEY: "re_test_key",
  MARIS_EMAIL_FROM: "Maris Jewelry <hello@marisjewelry.com>",
  MARIS_ORDER_EMAIL_TO: "atelier@marisjewelry.com"
};

function context(overrides = {}) {
  return {
    inquiryId: "inq-123",
    inquiry: {
      kind: "contact",
      fullName: "Ada <b>Client</b>",
      email: "ada@example.com",
      phone: "0812345678",
      sourcePage: "contact-us",
      locale: "en",
      message: "PRIVATE-MESSAGE-TEXT",
      fields: {},
      ...overrides
    }
  };
}

function recordingFetch(results = []) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const next = results[calls.length - 1] ?? { ok: true };
    if (next.throws) throw new Error("network down");
    return { ok: next.ok, status: next.status ?? (next.ok ? 200 : 500), json: async () => ({ id: `email-${calls.length}` }) };
  };
  return { calls, fetchImpl };
}

// --- locale picks the language of the confirmation, defaulting to English ---
assert.equal(normalizeInquiryInput({ locale: "th", fields: { name: "A", email: "a@b.co" } }).locale, "th");
assert.equal(normalizeInquiryInput({ locale: "fr", fields: { name: "A", email: "a@b.co" } }).locale, "en");
assert.equal(normalizeInquiryInput({ fields: { name: "A", email: "a@b.co" } }).locale, "en");

// --- acknowledgement content ---
const en = buildInquiryAcknowledgementEmail(context());
assert.match(en.subject, /received your message/i);
assert.ok(en.text.includes("inq-123"), "reference number is included");
assert.ok(!en.html.includes("<b>Client</b>"), "customer name is HTML-escaped");
assert.ok(en.html.includes("&lt;b&gt;Client&lt;/b&gt;"));
assert.ok(!en.text.includes("PRIVATE-MESSAGE-TEXT") && !en.html.includes("PRIVATE-MESSAGE-TEXT"),
  "the visitor's own message is never echoed back to an address anyone could have typed");
assert.ok(!/checkout|paid|payment|discount|% off/i.test(en.text), "no unverified commerce claims");

const th = buildInquiryAcknowledgementEmail(context({ locale: "th", fullName: "" }));
assert.match(th.subject, /เราได้รับข้อความของคุณแล้ว/);
assert.ok(/[฀-๿]/.test(th.html), "Thai copy is used for the Thai site");
assert.ok(th.text.includes("เรียนคุณ ลูกค้า"), "falls back to a Thai generic name");

// --- sending: shop mail first, then customer mail, both through Resend ---
{
  const { calls, fetchImpl } = recordingFetch();
  const result = await sendInquiryEmails(context(), { env: ENV, fetchImpl });

  assert.equal(result.status, "sent");
  assert.equal(result.customer.status, "sent");
  assert.equal(calls.length, 2);

  const [shop, customer] = calls;
  assert.deepEqual(shop.body.to, ["atelier@marisjewelry.com"]);
  assert.equal(shop.body.reply_to, "ada@example.com");
  assert.equal(shop.init.headers["Idempotency-Key"], "inq-123");

  assert.deepEqual(customer.body.to, ["ada@example.com"]);
  assert.equal(customer.body.reply_to, "atelier@marisjewelry.com", "customer replies reach the atelier");
  assert.equal(customer.body.from, ENV.MARIS_EMAIL_FROM);
  assert.equal(customer.init.headers["Idempotency-Key"], "inq-123-customer");
  assert.notEqual(shop.init.headers["Idempotency-Key"], customer.init.headers["Idempotency-Key"]);
}

// --- a failed or crashing customer email never changes the shop outcome ---
{
  const failed = recordingFetch([{ ok: true }, { ok: false, status: 422 }]);
  const result = await sendInquiryEmails(context(), { env: ENV, fetchImpl: failed.fetchImpl });
  assert.equal(result.status, "sent");
  assert.equal(result.customer.status, "failed");

  const crashed = recordingFetch([{ ok: true }, { throws: true }]);
  const crashResult = await sendInquiryEmails(context(), { env: ENV, fetchImpl: crashed.fetchImpl });
  assert.equal(crashResult.status, "sent");
  assert.equal(crashResult.customer.status, "failed");
}

// --- shop mail failing is still reported as a failure ---
{
  const { fetchImpl } = recordingFetch([{ ok: false, status: 401 }, { ok: true }]);
  const result = await sendInquiryEmails(context(), { env: ENV, fetchImpl });
  assert.equal(result.status, "failed");
  assert.equal(result.statusCode, 401);
}

// --- missing configuration sends nothing at all ---
{
  const { calls, fetchImpl } = recordingFetch();
  const result = await sendInquiryEmails(context(), { env: { RESEND_API_KEY: "re_test_key" }, fetchImpl });
  assert.equal(result.status, "not_configured");
  assert.deepEqual(result.missingEnv, ["MARIS_EMAIL_FROM", "MARIS_ORDER_EMAIL_TO"]);
  assert.equal(calls.length, 0);
}

// --- the form tells the server which language the visitor was reading ---
const leadForm = await readFile(new URL("../app/components/LeadForm.jsx", import.meta.url), "utf8");
assert.match(leadForm, /const \{ t, href, locale \} = useLocale\(\)/);
assert.match(leadForm, /sourcePage,\s*locale,\s*fields: data/);

console.log("Inquiry email checks passed.");
