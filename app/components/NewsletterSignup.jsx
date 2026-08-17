"use client";

import { useId, useState } from "react";

const NEWSLETTER_ENDPOINT = "/api/newsletter";
const SUCCESS_MESSAGE = "You're on the Maris list.";
const FAILURE_MESSAGE = "Your email could not be saved.";

export default function NewsletterSignup({
  source = "footer",
  variant = "footer",
  defaultEmail = ""
}) {
  // Rendered once in the desktop footer and again in the mobile accordion, so
  // the label target has to be generated rather than hard-coded.
  const emailId = useId();
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [sending, setSending] = useState(false);

  function report(message, type = "") {
    setStatus(message);
    setStatusType(type);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (sending) {
      return;
    }

    setSending(true);
    report("Joining...");

    try {
      const response = await fetch(NEWSLETTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, source })
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        report(SUCCESS_MESSAGE, "success");
        setEmail("");
        return;
      }

      report(payload.error || FAILURE_MESSAGE, "error");
    } catch {
      report(`${FAILURE_MESSAGE} Please check your connection.`, "error");
    } finally {
      setSending(false);
    }
  }

  function handleChange(event) {
    setEmail(event.target.value);

    if (status) {
      report("");
    }
  }

  if (variant === "page") {
    return (
      <form className="inquiry-form newsletter-form" onSubmit={handleSubmit}>
        <label htmlFor={emailId}>
          Email address
          <input
            id={emailId}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={handleChange}
            disabled={sending}
          />
        </label>
        <p className="form-status" role="status" aria-live="polite" data-type={statusType || undefined}>{status}</p>
        <button className="inquiry-submit" type="submit" disabled={sending}>
          {sending ? "Joining..." : "Join Newsletter"}
        </button>
      </form>
    );
  }

  return (
    <div className="maris-footer__newsletter">
      <form className="maris-footer__email-box" onSubmit={handleSubmit}>
        <label className="maris-footer__sr-only" htmlFor={emailId}>Email address</label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          value={email}
          onChange={handleChange}
          disabled={sending}
        />
        <button type="submit" aria-label="Join newsletter" disabled={sending}>
          {sending ? "..." : "Join"}
        </button>
      </form>
      <p className="maris-footer__email-status" role="status" aria-live="polite" data-type={statusType || undefined}>{status}</p>
    </div>
  );
}
