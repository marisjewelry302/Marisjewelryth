"use client";

import { useState } from "react";
import { shopEn, shopTh } from "../../lib/ui-text-shop";

const TOKEN_CODE_STATUS = {
  token_expired: "expired",
  token_used: "used",
  token_invalid: "invalid"
};

const PASSWORD_MIN_LENGTH = 12;

export default function ResetPasswordClient({ token, initialStatus, locale = "en" }) {
  const a = (locale === "th" ? shopTh : shopEn).account;
  const r = a.reset;
  const prefix = locale === "th" ? "/th" : "";
  const accountPath = `${prefix}/account`;
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage({ text: "", type: "" });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = String(formData.get("newPassword") || "");
    const confirm = String(formData.get("confirmPassword") || "");

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setMessage({ text: a.msg.passwordShort, type: "error" });
      form.elements.namedItem("newPassword")?.focus();
      return;
    }

    if (newPassword !== confirm) {
      setMessage({ text: a.msg.mismatch, type: "error" });
      form.elements.namedItem("confirmPassword")?.focus();
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/account/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // The sign-in form shows the success message; the old session cookie is
        // already cleared by the API.
        window.location.assign(`${accountPath}?reset=success`);
        return;
      }

      if (response.status === 503) {
        setStatus("unavailable");
      } else if (TOKEN_CODE_STATUS[data?.code]) {
        setStatus(TOKEN_CODE_STATUS[data.code]);
      } else if (data?.code === "password_too_short") {
        setMessage({ text: a.msg.passwordShort, type: "error" });
      } else if (data?.code === "rate_limited") {
        setMessage({ text: a.msg.rateLimited, type: "error" });
      } else {
        setMessage({ text: a.msg.wrong, type: "error" });
      }
    } catch {
      setMessage({ text: a.msg.wrong, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const stateCopy = {
    expired: [r.expiredTitle, r.expired],
    invalid: [r.invalidTitle, r.invalid],
    used: [r.usedTitle, r.used],
    unavailable: [r.unavailableTitle, r.unavailable]
  }[status];

  return (
    <main id="main-content" className="account-main site-main">
      <section className="account-hero">
        <p className="eyebrow">{r.eyebrow}</p>
        <h1>{stateCopy ? stateCopy[0] : r.title}</h1>
        <p className="lead">{stateCopy ? stateCopy[1] : r.lead}</p>
      </section>

      <section className="account-shell" aria-label={a.systemLabel}>
        <div className="account-auth">
          {stateCopy ? (
            <div className="account-form">
              {status !== "unavailable" && (
                <a className="account-submit" href={`${accountPath}?mode=forgot`}>{r.requestNew}</a>
              )}
              <a className="account-link-button" href={accountPath}>{r.signIn}</a>
            </div>
          ) : (
            <form className="account-form" onSubmit={handleSubmit}>
              <label htmlFor="reset-new-password">{a.newPassword}</label>
              <input
                id="reset-new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                aria-describedby="reset-password-hint"
                required
              />
              <p className="account-field-hint" id="reset-password-hint">{a.passwordHint}</p>
              <label htmlFor="reset-confirm-password">{a.confirmPassword}</label>
              <input
                id="reset-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                required
              />
              <button className="account-submit" type="submit" disabled={submitting}>
                {submitting ? r.saving : r.button}
              </button>
              {message.text ? (
                <p
                  className="account-message"
                  data-type={message.type || undefined}
                  role={message.type === "error" ? "alert" : "status"}
                >
                  {message.text}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
