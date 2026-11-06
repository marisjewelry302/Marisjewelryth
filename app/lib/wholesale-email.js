// Tells the atelier about new wholesale applications and purchase orders.
//
// One-way, like inquiry-email.js: only the shop is mailed, because writing to
// customers needs a verified Resend sending domain this project does not have
// yet. The portal shows customers their status instead.
//
// A failed email never undoes the saved record; callers log and move on.

import { getInquiryEmailConfig } from "./inquiry-email.js";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(value, currency = "THB") {
  if (value === null || value === undefined) return "Price on request";
  return `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function renderTable(rows) {
  return `<table style="border-collapse:collapse">${rows
    .filter(([, value]) => value !== "" && value !== null && value !== undefined)
    .map(([label, value]) => `
      <tr>
        <td style="padding:4px 16px 4px 0;color:#5c6d68;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(value)}</td>
      </tr>`).join("")}</table>`;
}

function wrap(title, subtitle, body) {
  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#102923;line-height:1.6">
      <h2 style="margin:0 0 4px;font-weight:500">${escapeHtml(title)}</h2>
      <p style="margin:0 0 18px;color:#5c6d68">${escapeHtml(subtitle)}</p>
      ${body}
      <p style="margin:22px 0 0;color:#5c6d68;font-size:12px">Review it in Maris Admin → Wholesale.</p>
    </div>`;
}

export function buildWholesaleApplicationEmail({ account, customerEmail, isNew }) {
  const rows = [
    ["Company", account.companyName],
    ["Business type", account.businessType.replaceAll("_", " ")],
    ["Tax ID", account.taxId],
    ["Contact", account.contactName],
    ["Phone", account.contactPhone],
    ["LINE", account.lineId],
    ["Email", customerEmail],
    ["Country", account.country],
    ["Website", account.website],
    ["Expected volume", account.expectedMonthlyVolume],
    ["Categories", account.interestedCategories.join(", ")],
    ["Address", account.businessAddress],
    ["Note", account.applicantNote]
  ];
  const title = isNew ? "New wholesale application" : "Wholesale application updated";

  return {
    subject: `${title}: ${account.companyName}`,
    html: wrap(title, account.companyName, renderTable(rows)),
    text: [title, "", ...rows.filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`)].join("\n")
  };
}

export function buildWholesaleOrderEmail({ order }) {
  const lines = order.items.map((item) => [
    `${item.sku} — ${item.name}`,
    `${item.quantity} × ${formatMoney(item.unitPrice, order.currency)}`
  ]);
  const rows = [
    ["Order", order.orderNumber],
    ["Company", order.companyName],
    ["Contact", `${order.contactName} ${order.contactPhone}`.trim()],
    ["Email", order.customerEmail],
    ["Customer PO", order.customerReference],
    ["Requested ship date", order.requestedShipDate],
    ["Ship to", order.shippingAddress],
    ["Note", order.customerNote],
    ["Subtotal (priced lines)", formatMoney(order.subtotalAmount, order.currency)],
    ["Needs a quote", order.hasUnpricedItems ? "Yes — some lines are price on request" : "No"]
  ];

  return {
    subject: `Wholesale PO ${order.orderNumber}: ${order.companyName}`,
    html: wrap("New wholesale purchase order", order.companyName, `${renderTable(rows)}
      <h3 style="margin:20px 0 6px;font-weight:500">Lines</h3>${renderTable(lines)}`),
    text: [
      "New wholesale purchase order",
      "",
      ...rows.filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`),
      "",
      ...lines.map(([l, v]) => `${l}: ${v}`)
    ].join("\n")
  };
}

export async function sendWholesaleEmail(message, { idempotencyKey, replyTo, env = process.env, fetchImpl = fetch } = {}) {
  const config = getInquiryEmailConfig(env);

  if (!config.isConfigured) {
    return { status: "not_configured", missingEnv: config.missingEnv };
  }

  const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "maris-jewelry/1.0",
      ...(idempotencyKey ? { "Idempotency-Key": String(idempotencyKey).slice(0, 256) } : {})
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text
    })
  });

  return response.ok ? { status: "sent" } : { status: "failed", statusCode: response.status };
}
