import { PASSWORD_RESET_TTL_SECONDS } from "./customer-password-reset.js";
import { buildOneClickUnsubscribeUrl, buildUnsubscribeUrl } from "./email-unsubscribe.js";
import { DEFAULT_LOCALE, THAI_LOCALE, localizePath } from "./i18n.js";
import { absoluteUrl } from "./seo.js";

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

export function buildWelcomeEmail(customer, { unsubscribeUrl = "" } = {}) {
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
      ${unsubscribeUrl ? `<p style="margin-top: 32px; font-size: 12px; color: #7a6f63;">You are receiving this email because you agreed to receive Maris Jewelry marketing emails. <a href="${escapeHtml(unsubscribeUrl)}" style="color: #7a6f63;">Unsubscribe</a> at any time.</p>` : ""}
    </div>
  `;
  const text = [
    `Welcome, ${name}`,
    "",
    preview,
    "",
    "Member offer: 10% off your first confirmed Maris order.",
    "This offer is confirmed directly by the Maris team before payment or production begins.",
    ...(unsubscribeUrl ? ["", `You are receiving this email because you agreed to receive Maris Jewelry marketing emails. Unsubscribe at any time: ${unsubscribeUrl}`] : [])
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

  // A marketing email must not go out without a working way to opt out, so a
  // missing signing secret stops the send rather than dropping the link.
  const unsubscribeUrl = buildUnsubscribeUrl(email, { env });
  const oneClickUrl = buildOneClickUnsubscribeUrl(email, { env });

  if (!unsubscribeUrl || !oneClickUrl) {
    return {
      status: "not_configured",
      missingEnv: ["MARIS_CUSTOMER_SESSION_SECRET"]
    };
  }

  const message = buildWelcomeEmail(customer, { unsubscribeUrl });
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
      text: message.text,
      headers: {
        "List-Unsubscribe": `<${oneClickUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
      }
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

// ─── Password reset ────────────────────────────────────────────────────────
// A transactional message: the person asked for it, so it carries no marketing
// content and no unsubscribe link. It follows the language of the page the
// request came from.

const RESET_COPY = {
  en: {
    subject: "Reset your Maris Jewelry password",
    greeting: (name) => `Hello ${name},`,
    intro: "We received a request to reset the password for your Maris Jewelry account.",
    action: "Choose a new password",
    expiry: (minutes) => `This link works once and expires in ${minutes} minutes.`,
    ignore: "If you did not ask for this, you can ignore this email. Your password will not change.",
    fallback: "If the button does not work, copy this address into your browser:"
  },
  th: {
    subject: "ตั้งรหัสผ่านใหม่สำหรับบัญชี Maris Jewelry",
    greeting: (name) => `เรียนคุณ ${name}`,
    intro: "เราได้รับคำขอให้ตั้งรหัสผ่านใหม่สำหรับบัญชี Maris Jewelry ของคุณ",
    action: "ตั้งรหัสผ่านใหม่",
    expiry: (minutes) => `ลิงก์นี้ใช้ได้ครั้งเดียวและหมดอายุใน ${minutes} นาที`,
    ignore: "หากคุณไม่ได้เป็นผู้ขอ โปรดละเว้นอีเมลนี้ รหัสผ่านของคุณจะไม่เปลี่ยนแปลง",
    fallback: "หากปุ่มใช้งานไม่ได้ ให้คัดลอกที่อยู่นี้ไปวางในเบราว์เซอร์:"
  }
};

export function buildPasswordResetUrl(token, { locale = "en" } = {}) {
  const path = localizePath("/account/reset-password", locale === "th" ? THAI_LOCALE : DEFAULT_LOCALE);
  return absoluteUrl(`${path}?token=${encodeURIComponent(token)}`);
}

export function buildPasswordResetEmail({ fullName, resetUrl, locale = "en" } = {}) {
  const copy = RESET_COPY[locale === "th" ? "th" : "en"];
  const name = String(fullName || "").trim() || (locale === "th" ? "ลูกค้า Maris" : "Maris Client");
  const minutes = Math.round(PASSWORD_RESET_TTL_SECONDS / 60);
  const safeUrl = escapeHtml(resetUrl);
  const html = `
    <div style="font-family: Urbanist, Anuphan, Arial, sans-serif; color: #2f2924; line-height: 1.6;">
      <p style="font-size: 13px; letter-spacing: .18em; text-transform: uppercase; color: #9b7c52;">Maris Jewelry</p>
      <p>${escapeHtml(copy.greeting(name))}</p>
      <p>${escapeHtml(copy.intro)}</p>
      <p style="margin: 28px 0;"><a href="${safeUrl}" style="background: #2f2924; color: #ffffff; padding: 12px 22px; text-decoration: none; letter-spacing: .08em;">${escapeHtml(copy.action)}</a></p>
      <p>${escapeHtml(copy.expiry(minutes))}</p>
      <p style="font-size: 13px; color: #7a6f63;">${escapeHtml(copy.fallback)}<br><a href="${safeUrl}" style="color: #7a6f63; word-break: break-all;">${safeUrl}</a></p>
      <p style="font-size: 13px; color: #7a6f63;">${escapeHtml(copy.ignore)}</p>
    </div>
  `;
  const text = [
    copy.greeting(name),
    "",
    copy.intro,
    "",
    `${copy.action}: ${resetUrl}`,
    "",
    copy.expiry(minutes),
    copy.ignore
  ].join("\n");

  return { subject: copy.subject, html, text };
}

// `customer` is { email, fullName, token, locale }. The token is built by the
// caller from the account's current password hash (see customer-password-reset.js).
export async function sendPasswordResetEmail(customer, { env = process.env, fetchImpl = fetch } = {}) {
  const config = getCustomerEmailConfig(env);
  const { apiKey } = readCustomerEmailEnv(env);

  if (!config.isConfigured) {
    return { status: "not_configured", missingEnv: config.missingEnv };
  }

  const email = normalizeMarketingEmail(customer?.email);

  if (!email || !customer?.token) {
    return { status: "invalid" };
  }

  const message = buildPasswordResetEmail({
    fullName: customer.fullName,
    resetUrl: buildPasswordResetUrl(customer.token, { locale: customer.locale }),
    locale: customer.locale
  });
  const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "maris-jewelry/1.0"
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
    // The status is enough for logs; the body is not echoed because it can
    // repeat the request, including the reset link.
    const error = new Error(`Resend password reset email failed with status ${response.status}.`);
    error.statusCode = response.status;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  return { status: "sent", id: payload.id || null };
}
