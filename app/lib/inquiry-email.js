// Emails around a website enquiry: a notification to the atelier, and a short
// acknowledgement to the customer.
//
// The acknowledgement only says the message was received and who will reply. It
// never repeats what the visitor typed, because the form is public and anyone can
// type any address into it; the per-email throttle in inquiries.js and the
// same-origin check in the route keep it from being used as a mail relay.

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

const ACK_COPY = {
  en: {
    subject: "We received your message — Maris Jewelry",
    greeting: (name) => `Dear ${name},`,
    title: "Thank you for contacting Maris",
    lines: [
      "We have received your message, and the Maris atelier will reply to you personally, usually within one business day.",
      "If your question is urgent, you can also reach us on LINE or by phone from the contact page.",
      "This is an automatic confirmation that your enquiry arrived. Availability, pricing and production details are confirmed directly by the atelier."
    ],
    reference: "Reference",
    ignore: "If you did not send this message, you can safely ignore this email.",
    signoff: "Maris Jewelry · Bangkok"
  },
  th: {
    subject: "เราได้รับข้อความของคุณแล้ว — Maris Jewelry",
    greeting: (name) => `เรียนคุณ ${name}`,
    title: "ขอบคุณที่ติดต่อ Maris",
    lines: [
      "เราได้รับข้อความของคุณเรียบร้อยแล้ว ทีมงาน Maris จะตอบกลับคุณโดยตรง โดยปกติภายใน 1 วันทำการ",
      "หากเป็นเรื่องเร่งด่วน สามารถติดต่อเราทาง LINE หรือโทรศัพท์ได้จากหน้าติดต่อเรา",
      "อีเมลนี้เป็นการยืนยันอัตโนมัติว่าเราได้รับข้อความแล้ว ส่วนความพร้อมของสินค้า ราคา และรายละเอียดการผลิต ทีมงานจะยืนยันกับคุณโดยตรง"
    ],
    reference: "เลขอ้างอิง",
    ignore: "หากคุณไม่ได้เป็นผู้ส่งข้อความนี้ สามารถละเว้นอีเมลฉบับนี้ได้",
    signoff: "Maris Jewelry · กรุงเทพฯ"
  }
};

export function buildInquiryAcknowledgementEmail({ inquiry, inquiryId }) {
  const copy = ACK_COPY[inquiry.locale === "th" ? "th" : "en"];
  const name = inquiry.fullName || (inquiry.locale === "th" ? "ลูกค้า" : "Maris Client");

  const text = [
    copy.greeting(name),
    "",
    ...copy.lines.flatMap((line) => [line, ""]),
    `${copy.reference}: ${inquiryId}`,
    "",
    copy.ignore,
    "",
    copy.signoff
  ].join("\n");

  const html = `
    <div style="font-family:Urbanist,Anuphan,system-ui,-apple-system,'Segoe UI',sans-serif;color:#2f2924;line-height:1.7;max-width:560px">
      <p style="margin:0 0 6px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#9b7c52">Maris Jewelry</p>
      <h1 style="margin:0 0 18px;font-size:26px;font-weight:400">${escapeHtml(copy.title)}</h1>
      <p style="margin:0 0 14px">${escapeHtml(copy.greeting(name))}</p>
      ${copy.lines.map((line) => `<p style="margin:0 0 14px">${escapeHtml(line)}</p>`).join("")}
      <p style="margin:18px 0 0;color:#7a6f63;font-size:12px">${escapeHtml(copy.reference)}: ${escapeHtml(inquiryId)}</p>
      <p style="margin:6px 0 0;color:#7a6f63;font-size:12px">${escapeHtml(copy.ignore)}</p>
      <p style="margin:22px 0 0;color:#7a6f63;font-size:12px">${escapeHtml(copy.signoff)}</p>
    </div>
  `;

  return { subject: copy.subject, html, text };
}

async function postToResend({ config, message, to, replyTo, idempotencyKey, fetchImpl }) {
  const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "maris-jewelry/1.0",
      // Retrying the same enquiry must not send the same email twice.
      "Idempotency-Key": String(idempotencyKey).slice(0, 256)
    },
    body: JSON.stringify({
      from: config.from,
      to: [to],
      reply_to: replyTo,
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

export async function sendInquiryEmails(context, { env = process.env, fetchImpl = fetch } = {}) {
  const config = getInquiryEmailConfig(env);

  if (!config.isConfigured) {
    return { status: "not_configured", missingEnv: config.missingEnv };
  }

  const shop = await postToResend({
    config,
    message: buildInquiryEmail(context),
    to: config.to,
    replyTo: context.inquiry.email,
    idempotencyKey: context.inquiryId,
    fetchImpl
  });

  // The customer's acknowledgement is a courtesy: whatever happens here must not
  // change the outcome of the shop notification, so it is attempted separately
  // and reported on its own.
  let customer;
  try {
    customer = await postToResend({
      config,
      message: buildInquiryAcknowledgementEmail(context),
      to: context.inquiry.email,
      // A reply goes to the atelier, not to the no-reply style sender address.
      replyTo: config.to,
      idempotencyKey: `${context.inquiryId}-customer`,
      fetchImpl
    });
  } catch {
    customer = { status: "failed" };
  }

  return { ...shop, customer };
}
