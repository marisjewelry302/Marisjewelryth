"use client";

import { useState } from "react";

import { useLocale } from "../hooks/useLocale";

const INQUIRY_ENDPOINT = "/api/inquiries";

function collectData(formData) {
  const ignored = new Set(["form-name", "subject"]);
  const data = {};

  for (const [name, rawValue] of formData.entries()) {
    if (ignored.has(name)) {
      continue;
    }

    const value = String(rawValue).trim();

    if (value) {
      data[name] = value;
    }
  }

  return data;
}

function buildSummary(type, data) {
  const titleMap = {
    contact: "Contact Inquiry",
    newsletter: "Newsletter Signup",
    quote: "Quote Request"
  };

  return [
    `Type: ${titleMap[type] || "Website Form"}`,
    ...Object.entries(data).map(([key, value]) => {
      const label = key.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
      return `${label}: ${value}`;
    })
  ];
}

export default function LeadForm({
  children,
  formName,
  sourcePage,
  subject,
  type = "contact",
  resetOnSuccess = true,
  requireSelectedPieces = false
}) {
  const { t, href, locale } = useLocale();
  const copy = t.lead;
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [summary, setSummary] = useState([]);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (sending) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedPieces = String(formData.get("selected_pieces") || "").trim();

    if (requireSelectedPieces && !selectedPieces) {
      setStatus(copy.selectPiece);
      return;
    }

    const data = collectData(formData);
    const nextSummary = buildSummary(type, data);

    setSending(true);
    setStatus(copy.sending);

    // Keep the summary ready either way: on success it is a receipt, on failure
    // it is what the visitor copies instead of retyping everything.
    setSummary(nextSummary);
    setCopied(false);

    try {
      const response = await fetch(INQUIRY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          kind: type === "quote" ? "quote" : "contact",
          subject,
          sourcePage,
          locale,
          fields: data
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        // "duplicate" means this exact message is already with the atelier, so
        // from the visitor's point of view it went through.
        setStatus(copy.messages[type]?.status || copy.sent);
        setResult(copy.messages[type]);
        setFailed(false);

        if (resetOnSuccess) {
          form.reset();
        }

        return;
      }

      if (response.status === 400 && Array.isArray(payload.errors) && payload.errors.length) {
        setStatus(payload.errors[0].message || copy.checkForm);
        setResult(null);
        setFailed(false);
        return;
      }

      setStatus(payload.error || copy.notSent);
      setResult(copy.failure);
      setFailed(true);
    } catch {
      setStatus(copy.notSentConnection);
      setResult(copy.failure);
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary.join("\n"));
      setCopied(true);
    } catch (error) {
      setCopied(false);
    }
  }

  return (
    <>
      <form className="inquiry-form" name={formName} method="POST" onSubmit={handleSubmit}>
        <input type="hidden" name="form-name" value={formName} />
        <input type="hidden" name="subject" value={subject} />
        <input type="hidden" name="source_page" value={sourcePage} />
        {children}
        <p className="form-status" role="status" aria-live="polite">{status}</p>
        <button className="inquiry-submit" type="submit" disabled={sending}>
          {sending
            ? copy.sending
            : type === "quote" ? copy.submitQuote : type === "newsletter" ? copy.submitNewsletter : copy.submitContact}
        </button>
      </form>

      {result && (
        <div className="submission-result">
          <h2>{result.title}</h2>
          <p>{result.body}</p>
          <div className="page-actions">
            {/* Only worth offering when the send failed; on success the atelier
                already has the message and copying it serves no purpose. */}
            {failed && (
              <button type="button" onClick={copySummary}>{copied ? copy.copied : copy.copy}</button>
            )}
            <a href={href(type === "quote" ? "/contact-us" : "/request-quote")}>
              {type === "quote" ? copy.contactDirect : copy.quoteInstead}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
