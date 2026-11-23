"use client";

import { useState } from "react";

import { useLocale } from "../hooks/useLocale";

export default function UnsubscribeClient({ token }) {
  const { t } = useLocale();
  const u = t.unsubscribe;
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
        // Mapped from the API's stable code; its English text is never shown.
        setStatus("error");
        setMessage(
          data.code === "invalid_token"
            ? u.invalidToken
            : response.status === 503
              ? u.unavailable
              : u.failed
        );
        return;
      }

      setStatus("done");
    } catch {
      setStatus("error");
      setMessage(u.wrong);
    }
  }

  if (status === "done") {
    return (
      <p className="subpage-note" role="status" aria-live="polite">
        {u.done}
      </p>
    );
  }

  return (
    <div className="page-actions">
      <button className="primary-link" type="button" onClick={handleConfirm} disabled={status === "sending"}>
        {status === "sending" ? u.working : u.confirm}
      </button>
      {message && <p className="subpage-note" role="alert">{message}</p>}
    </div>
  );
}
