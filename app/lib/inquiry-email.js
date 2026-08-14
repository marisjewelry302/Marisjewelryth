// Notifies the atelier that a website enquiry arrived.
//
// Deliberately one-way: only the shop is mailed. Replying to the customer needs
// a verified sending domain on Resend, which this project does not have yet, so
// promising the customer an email would be a promise the site cannot keep.

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const RESEND_API_KEY_ENV = "RESEND_API_KEY";
const MARIS_EMAIL_FROM_ENV = "MARIS_EMAIL_FROM";
const MARIS_ORDER_EMAIL_TO_ENV = "MARIS_ORDER_EMAIL_TO";

const KIND_LABELS = {
  contact: "Contact inquiry",
  quote: "Quote request"
};

function cleanEnvValue(value) {
  const clean = String(value || "").trim();

  if (!clean || /^replace-with-/i.test(clean) || /^your[_-]/i.test(clean)) {
    return "";
  }

  return clean;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function labelFor(key) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getInquiryEmailConfig(env = process.env) {
  const apiKey = cleanEnvValue(env[RESEND_API_KEY_ENV]);
  const from = cleanEnvValue(env[MARIS_EMAIL_FROM_ENV]);
  const to = cleanEnvValue(env[MARIS_ORDER_EMAIL_TO_ENV]);
  const missingEnv = [];

  if (!apiKey) missingEnv.push(RESEND_API_KEY_ENV);
  if (!from) missingEnv.push(MARIS_EMAIL_FROM_ENV);
  if (!to) missingEnv.push(MARIS_ORDER_EMAIL_TO_ENV);

  return { apiKey, from, to, missingEnv, isConfigured: missingEnv.length === 0 };
}

export function buildInquiryEmail({ inquiry, inquiryId }) {
  const kindLabel = KIND_LABELS[inquiry.kind] || "Website inquiry";
  const rows = [
    ["Name", inquiry.fullName],
    ["Email", inquiry.email],
    ["Phone", inquiry.phone],
    ["Page", inquiry.sourcePage],
    ...Object.entries(inquiry.fields || {}).map(([key, value]) => [labelFor(key), value])
  ].filter(([, value]) => Boolean(value));

  const lines = [
    `${kindLabel} — ${inquiry.fullName}`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(inquiry.message ? ["", "Message:", inquiry.message] : []),
    "",
    `Reference: ${inquiryId}`
  ];

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#102923;line-height:1.6">
      <h2 style="margin:0 0 4px;font-weight:500">${escapeHtml(kindLabel)}</h2>
      <p style="margin:0 0 18px;color:#5c6d68">from ${escapeHtml(inquiry.fullName)}</p>
      <table style="border-collapse:collapse">
        ${rows.map(([label, value]) => `
          <tr>
            <td style="padding:4px 16px 4px 0;color:#5c6d68;vertical-align:top">${escapeHtml(label)}</td>
            <td style="padding:4px 0">${escapeHtml(value)}</td>
          </tr>`).join("")}
      </table>
      ${inquiry.message ? `<p style="margin:18px 0 0;white-space:pre-wrap">${escapeHtml(inquiry.message)}</p>` : ""}
      <p style="margin:22px 0 0;color:#5c6d68;font-size:12px">Reference: ${escapeHtml(inquiryId)}</p>
    </div>
  `;

  return {
    subject: `${kindLabel}: ${inquiry.fullName}`,
    html,
    text: lines.join("\n")
  };
}

export async function sendInquiryEmails(context, { env = process.env, fetchImpl = fetch } = {}) {
  const config = getInquiryEmailConfig(env);

  if (!config.isConfigured) {
    return { status: "not_configured", missingEnv: config.missingEnv };
  }

  const message = buildInquiryEmail(context);
  const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "maris-jewelry/1.0",
      // Retrying the same enquiry must not mail the atelier twice.
      "Idempotency-Key": String(context.inquiryId).slice(0, 256)
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      reply_to: context.inquiry.email,
      subject: message.subject,
      html: message.html,
      text: message.text
    })
  });

  if (!response.ok) {
    return { status: "failed", statusCode: response.status };
  }

  const payload = await response.json().catch(() => ({}));
  return { status: "sent", emailId: payload.id || null };
}
