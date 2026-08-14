"use client";

import { useState } from "react";

const INQUIRY_ENDPOINT = "/api/inquiries";

const messages = {
  contact: {
    status: "Your inquiry has been sent to the Maris atelier.",
    title: "Your inquiry is with us",
    body: "The atelier has received your message and will reply through your preferred contact channel."
  },
  quote: {
    status: "Your quote request has been sent to the Maris atelier.",
    title: "Your quote request is with us",
    body: "The atelier will confirm availability for your selected pieces and reply with pricing direction."
  },
  newsletter: {
    status: "Your details have been sent to the Maris atelier.",
    title: "You're on the Maris list",
    body: "The atelier will use these details for future collection and custom design updates."
  }
};

// Shown when the submission never reached the server. The summary and copy
// button below give the visitor a way to send it themselves rather than losing
// what they typed.
const FAILURE_RESULT = {
  title: "We could not send that",
  body: "Your message did not reach the atelier. Copy the summary below and send it through Line, email, or phone, and we will pick it up from there."
};

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
      setStatus("Please select at least one piece before sending a quote request.");
      return;
    }

    const data = collectData(formData);
    const nextSummary = buildSummary(type, data);

    setSending(true);
    setStatus("Sending...");

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
          fields: data
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        // "duplicate" means this exact message is already with the atelier, so
        // from the visitor's point of view it went through.
        setStatus(messages[type]?.status || "Your message has been sent.");
        setResult(messages[type]);
        setFailed(false);

        if (resetOnSuccess) {
          form.reset();
        }

        return;
      }

      if (response.status === 400 && Array.isArray(payload.errors) && payload.errors.length) {
        setStatus(payload.errors[0].message || "Please check the form details.");
        setResult(null);
        setFailed(false);
        return;
      }

      setStatus(payload.error || "Your message could not be sent.");
      setResult(FAILURE_RESULT);
      setFailed(true);
    } catch {
      setStatus("Your message could not be sent. Please check your connection.");
      setResult(FAILURE_RESULT);
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
            ? "Sending..."
            : type === "quote" ? "Send Quote Request" : type === "newsletter" ? "Join Newsletter" : "Send Inquiry"}
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
              <button type="button" onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</button>
            )}
            <a href={type === "quote" ? "/contact-us" : "/request-quote"}>
              {type === "quote" ? "Contact Maris directly" : "Request a quote instead"}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
