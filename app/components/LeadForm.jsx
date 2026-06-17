"use client";

import { useState } from "react";

const LEAD_KEY = "marisLeadInbox";

const messages = {
  contact: {
    status: "Saved to this browser. Copy the summary and send it through your preferred Maris contact channel.",
    title: "Your message is ready",
    body: "Maris Jewelry can review your inquiry and reply through your preferred contact channel."
  },
  quote: {
    status: "Saved to this browser. Copy the summary and send it through your preferred Maris contact channel.",
    title: "Your quote request is ready",
    body: "Maris Jewelry can review your selected pieces, confirm availability, and reply with pricing direction."
  },
  newsletter: {
    status: "Saved to this browser. Copy the summary and send it through your preferred Maris contact channel.",
    title: "You're on the Maris list",
    body: "Maris Jewelry can use this request for future collection and custom design updates."
  }
};

function readLeads() {
  try {
    const value = JSON.parse(window.localStorage.getItem(LEAD_KEY));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function writeLeads(items) {
  window.localStorage.setItem(LEAD_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("maris:leadchange"));
}

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

  function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedPieces = String(formData.get("selected_pieces") || "").trim();

    if (requireSelectedPieces && !selectedPieces) {
      setStatus("Please select at least one piece before sending a quote request.");
      return;
    }

    const data = collectData(formData);
    const nextSummary = buildSummary(type, data);

    try {
      writeLeads([
        {
          id: `${type}-${Date.now()}`,
          type,
          submittedAt: new Date().toISOString(),
          path: window.location.pathname,
          data
        },
        ...readLeads()
      ]);

      setStatus(messages[type]?.status || "Saved to this browser.");
      setResult(messages[type]);
      setSummary(nextSummary);
      setCopied(false);

      if (resetOnSuccess) {
        form.reset();
      }
    } catch (error) {
      setStatus("This browser could not save the preview submission. Please try again.");
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
        <button className="inquiry-submit" type="submit">
          {type === "quote" ? "Send Quote Request" : type === "newsletter" ? "Join Newsletter" : "Send Inquiry"}
        </button>
      </form>

      {result && (
        <div className="submission-result">
          <h2>{result.title}</h2>
          <p>{result.body}</p>
          <div className="page-actions">
            <button type="button" onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</button>
            <a href={type === "quote" ? "/contact-us" : "/request-quote"}>
              {type === "quote" ? "Contact Maris directly" : "Request a quote instead"}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
