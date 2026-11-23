"use client";

import { useId, useState } from "react";

import { useLocale } from "../hooks/useLocale";
import { trackEvent } from "../lib/track";

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
  const [statusType, setStatusType] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);
  const errorListId = useId();

  // Marks a field as invalid and ties it to the error list. Fields are
  // uncontrolled, so this sets the attributes directly on the element.
  function flagField(form, fieldName) {
    const element = form.elements.namedItem(fieldName);

    if (!element || typeof element.setAttribute !== "function") {
      return null;
    }

    element.setAttribute("aria-invalid", "true");
    element.setAttribute("aria-describedby", errorListId);
    return element;
  }

  function clearFieldFlags(form) {
    for (const element of form.querySelectorAll("[aria-invalid]")) {
      element.removeAttribute("aria-invalid");

      if (element.getAttribute("aria-describedby") === errorListId) {
        element.removeAttribute("aria-describedby");
      }
    }
  }

  function handleInput(event) {
    const element = event.target;

    if (element?.getAttribute?.("aria-invalid")) {
      element.removeAttribute("aria-invalid");

      if (element.getAttribute("aria-describedby") === errorListId) {
        element.removeAttribute("aria-describedby");
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (sending) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedPieces = String(formData.get("selected_pieces") || "").trim();

    clearFieldFlags(form);
    setFieldErrors([]);

    if (requireSelectedPieces && !selectedPieces) {
      setStatus(copy.selectPiece);
      setStatusType("error");
      return;
    }

    const data = collectData(formData);
    const nextSummary = buildSummary(type, data);

    setSending(true);
    setStatus(copy.sending);
    setStatusType("");

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
        setStatusType("success");
        setResult(copy.messages[type]);
        setFailed(false);
        trackEvent("generate_lead", { form_type: type === "quote" ? "quote" : "contact" });

        if (resetOnSuccess) {
          form.reset();
        }

        return;
      }

      if (response.status === 400 && Array.isArray(payload.errors) && payload.errors.length) {
        // Show every problem, in the visitor's language, and take them to the first field.
        const problems = payload.errors.map((problem) => ({
          field: problem.field,
          text: copy.errors?.[problem.code] || copy.checkForm
        }));
        let firstInvalid = null;

        for (const problem of problems) {
          const element = flagField(form, problem.field);
          firstInvalid = firstInvalid || element;
        }

        setStatus(copy.checkForm);
        setStatusType("error");
        setFieldErrors(problems);
        setResult(null);
        setFailed(false);
        firstInvalid?.focus();
        return;
      }

      // Never print payload.error: the API answers in English only.
      setStatus(
        response.status === 429
          ? copy.errors.rate_limited
          : response.status === 503
            ? copy.errors.service_unavailable
            : copy.notSent
      );
      setStatusType("error");
      setResult(copy.failure);
      setFailed(true);
    } catch {
      setStatus(copy.notSentConnection);
      setStatusType("error");
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
      <form className="inquiry-form" name={formName} method="POST" onSubmit={handleSubmit} onInput={handleInput}>
        <input type="hidden" name="form-name" value={formName} />
        <input type="hidden" name="subject" value={subject} />
        <input type="hidden" name="source_page" value={sourcePage} />
        {children}
        <p className="form-status" role="status" aria-live="polite" data-type={statusType || undefined}>{status}</p>
        {fieldErrors.length > 0 && (
          <ul className="form-status-list" id={errorListId}>
            {fieldErrors.map((problem) => (
              <li key={`${problem.field}-${problem.text}`}>{problem.text}</li>
            ))}
          </ul>
        )}
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
            <a href={href(type === "quote" ? "/contact-us" : "/collections")}>
              {type === "quote" ? copy.contactDirect : copy.quoteInstead}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
