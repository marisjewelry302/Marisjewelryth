const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const RESEND_API_KEY_ENV = "RESEND_API_KEY";
const MARIS_EMAIL_FROM_ENV = "MARIS_EMAIL_FROM";

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

export function normalizeMarketingEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function getCustomerEmailConfig(env = process.env) {
  const { apiKey, from } = readCustomerEmailEnv(env);
  const missingEnv = [];

  if (!apiKey) {
    missingEnv.push(RESEND_API_KEY_ENV);
  }

  if (!from) {
    missingEnv.push(MARIS_EMAIL_FROM_ENV);
  }

  return {
    isConfigured: missingEnv.length === 0,
    missingEnv,
    from
  };
}

function readCustomerEmailEnv(env = process.env) {
  return {
    apiKey: cleanEnvValue(env[RESEND_API_KEY_ENV]),
    from: cleanEnvValue(env[MARIS_EMAIL_FROM_ENV])
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

export function buildWelcomeEmail(customer) {
  const name = String(customer?.fullName || "Maris Client").trim() || "Maris Client";
  const safeName = escapeHtml(name);
  const subject = "Welcome to Maris Jewelry - your 10% first-purchase offer";
  const preview = "Thank you for joining Maris Jewelry. Your first confirmed order includes 10% off.";
  const html = `
    <div style="font-family: Urbanist, Anuphan, Arial, sans-serif; color: #2f2924; line-height: 1.6;">
      <p style="font-size: 13px; letter-spacing: .18em; text-transform: uppercase; color: #9b7c52;">Maris Jewelry</p>
      <h1 style="font-size: 28px; font-weight: 400; margin: 0 0 16px;">Welcome, ${safeName}</h1>
      <p>${preview}</p>
      <p>Use this welcome offer when you contact Maris Jewelry to confirm your first order, request a quote, or begin a private consultation.</p>
      <div style="border: 1px solid #d8c7ad; padding: 18px; margin: 24px 0; background: #fbf7ef;">
        <p style="margin: 0; font-size: 14px; letter-spacing: .14em; text-transform: uppercase;">Member offer</p>
        <p style="margin: 4px 0 0; font-size: 32px;">10% Off</p>
        <p style="margin: 4px 0 0;">your first confirmed Maris order</p>
      </div>
      <p>This offer is confirmed directly by the Maris team before payment or production begins.</p>
    </div>
  `;
  const text = [
    `Welcome, ${name}`,
    "",
    preview,
    "",
    "Member offer: 10% off your first confirmed Maris order.",
    "This offer is confirmed directly by the Maris team before payment or production begins."
  ].join("\n");

  return { subject, html, text };
}

export async function sendWelcomeEmail(customer, { env = process.env, fetchImpl = fetch } = {}) {
  const config = getCustomerEmailConfig(env);
  const { apiKey } = readCustomerEmailEnv(env);

  if (!config.isConfigured) {
    return {
      status: "not_configured",
      missingEnv: config.missingEnv
    };
  }

  const email = normalizeMarketingEmail(customer?.email);

  if (!email) {
    return { status: "invalid" };
  }

  const message = buildWelcomeEmail(customer);
  const idempotencyKey = `welcome-${customer?.id || email}`.slice(0, 256);
  const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "maris-jewelry/1.0",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: message.subject,
      html: message.html,
      text: message.text
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const error = new Error(errorText || `Resend email request failed with status ${response.status}.`);
    error.statusCode = response.status;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  return {
    status: "sent",
    id: payload.id || null
  };
}
