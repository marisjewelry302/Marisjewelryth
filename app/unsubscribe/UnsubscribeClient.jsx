"use client";

import { useState } from "react";

export default function UnsubscribeClient({ token }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleConfirm() {
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "You could not be unsubscribed. Please contact us.");
        return;
      }

      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <p className="subpage-note" role="status" aria-live="polite">
        You have been unsubscribed. You will not receive further marketing emails from Maris Jewelry.
      </p>
    );
  }

  return (
    <div className="page-actions">
      <button className="primary-link" type="button" onClick={handleConfirm} disabled={status === "sending"}>
        {status === "sending" ? "Unsubscribing..." : "Confirm unsubscribe"}
      </button>
      {message && <p className="subpage-note" role="alert">{message}</p>}
    </div>
  );
}
