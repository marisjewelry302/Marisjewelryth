import { normalizeMarketingEmail } from "./customer-email.js";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const RESEND_API_KEY_ENV = "RESEND_API_KEY";
const MARIS_EMAIL_FROM_ENV = "MARIS_EMAIL_FROM";
const MARIS_ORDER_EMAIL_TO_ENV = "MARIS_ORDER_EMAIL_TO";

function cleanEnvValue(value) {
  const cleanValue = String(value || "").trim();

  if (
    !cleanValue
    || /^replace-with-/i.test(cleanValue)
    || /^your[_-]/i.test(cleanValue)
  ) {
    return "";
  }

  return cleanValue;
}

function readCustomOrderEmailEnv(env = process.env) {
  return {
    apiKey: cleanEnvValue(env[RESEND_API_KEY_ENV]),
    from: cleanEnvValue(env[MARIS_EMAIL_FROM_ENV]),
    orderEmailTo: normalizeMarketingEmail(cleanEnvValue(env[MARIS_ORDER_EMAIL_TO_ENV]))
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatValue(value) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function buildOptionLines(order, optionSummary) {
  return [
    `Selected options: ${optionSummary || "-"}`,
    `Metal: ${formatValue(order.metal)}`,
    `Metal purity: ${formatValue(order.metalPurity)}`,
    `Ring size: ${formatValue(order.ringSize)}`,
    `Stone carat: ${formatValue(order.stoneCarat)}`,
    `Stone color: ${formatValue(order.stoneColor)}`,
    `Stone clarity: ${formatValue(order.stoneClarity)}`,
    `Stone cut: ${formatValue(order.stoneCut)}`,
    `Origin: ${formatValue(order.origin)}`
  ];
}

function buildHtmlList(lines) {
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}

export function getCustomOrderEmailConfig(env = process.env) {
  const { apiKey, from, orderEmailTo } = readCustomOrderEmailEnv(env);
  const missingEnv = [];

  if (!apiKey) {
    missingEnv.push(RESEND_API_KEY_ENV);
  }

  if (!from) {
    missingEnv.push(MARIS_EMAIL_FROM_ENV);
  }

  if (!orderEmailTo) {
    missingEnv.push(MARIS_ORDER_EMAIL_TO_ENV);
  }

  return {
    isConfigured: missingEnv.length === 0,
    missingEnv,
    from,
    orderEmailTo
  };
}

export function buildCustomerCustomOrderEmail({ order, request, optionSummary }) {
  const subject = `Maris Jewelry received your custom request for ${order.productCode}`;
  const lines = [
    `Hello ${order.fullName || "Maris Client"},`,
    "",
    `Thank you for sending a custom jewellery request for product ${order.productCode}.`,
    "The Maris team will review your preferences and contact you directly with the next consultation details.",
    "",
    `Request ID: ${request.id}`,
    ...buildOptionLines(order, optionSummary),
    "",
    "This message confirms that your enquiry was received. Final availability, production details, and any next steps are confirmed directly by the Maris team."
  ];
  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #2f2924; line-height: 1.6;">
      <p style="font-size: 13px; letter-spacing: .18em; text-transform: uppercase; color: #9b7c52;">Maris Jewelry</p>
      <h1 style="font-size: 26px; font-weight: 400; margin: 0 0 16px;">Custom request received</h1>
      <p>Hello ${escapeHtml(order.fullName || "Maris Client")},</p>
      <p>Thank you for sending a custom jewellery request for product ${escapeHtml(order.productCode)}.</p>
      <p>The Maris team will review your preferences and contact you directly with the next consultation details.</p>
      <p><strong>Request ID:</strong> ${escapeHtml(request.id)}</p>
      ${buildHtmlList(buildOptionLines(order, optionSummary))}
      <p>This message confirms that your enquiry was received. Final availability, production details, and any next steps are confirmed directly by the Maris team.</p>
    </div>
  `;

  return {
    subject,
    html,
    text: lines.join("\n")
  };
}

export function buildAdminCustomOrderEmail({ order, request, customer, optionSummary }) {
  const subject = `New Maris custom request: ${order.productCode}`;
  const lines = [
    `Request ID: ${request.id}`,
    `Created at: ${request.created_at || "-"}`,
    `Product code: ${order.productCode}`,
    `Full name: ${order.fullName}`,
    `Company: ${order.companyName || "-"}`,
    `Email: ${order.email}`,
    `Contact number: ${order.contactNumber}`,
    ...buildOptionLines(order, optionSummary),
    `Customer ID: ${customer?.id || "-"}`
  ];
  const html = `
    <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
      <h1 style="font-size: 22px; margin: 0 0 16px;">New custom order request</h1>
      ${buildHtmlList(lines)}
    </div>
  `;

  return {
    subject,
    html,
    text: lines.join("\n")
  };
}

async function sendResendEmail({ apiKey, from, to, message, idempotencyKey, fetchImpl }) {
  const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "maris-jewelry/1.0",
      "Idempotency-Key": idempotencyKey.slice(0, 256)
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: message.subject,
      html: message.html,
      text: message.text
    })
  });

  if (!response.ok) {
    const error = new Error(`Resend email request failed with status ${response.status}.`);
    error.statusCode = response.status;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  return payload.id || null;
}

export async function sendCustomOrderEmails(context, { env = process.env, fetchImpl = fetch } = {}) {
  const config = getCustomOrderEmailConfig(env);
  const { apiKey } = readCustomOrderEmailEnv(env);

  if (!config.isConfigured) {
    return {
      status: "not_configured",
      missingEnv: config.missingEnv
    };
  }

  const customerEmailTo = normalizeMarketingEmail(context?.order?.email);
  const adminEmailTo = normalizeMarketingEmail(config.orderEmailTo);

  if (!customerEmailTo || !adminEmailTo) {
    return { status: "invalid" };
  }

  const requestId = context?.request?.id || "unknown";
  const customerMessage = buildCustomerCustomOrderEmail(context);
  const adminMessage = buildAdminCustomOrderEmail(context);
  const customerEmailId = await sendResendEmail({
    apiKey,
    from: config.from,
    to: customerEmailTo,
    message: customerMessage,
    idempotencyKey: `custom-order-${requestId}-customer`,
    fetchImpl
  });
  const adminEmailId = await sendResendEmail({
    apiKey,
    from: config.from,
    to: adminEmailTo,
    message: adminMessage,
    idempotencyKey: `custom-order-${requestId}-admin`,
    fetchImpl
  });

  return {
    status: "sent",
    customerEmailId,
    adminEmailId
  };
}
