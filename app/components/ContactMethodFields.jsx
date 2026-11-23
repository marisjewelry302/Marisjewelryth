"use client";

import { useState } from "react";

import { useLocale } from "../hooks/useLocale";

// Phone, preferred contact and Line ID for the contact and quote forms. The
// phone number becomes required when Phone or WhatsApp is chosen, and a Line ID
// field appears for Line, so the atelier always has a way to reply on the
// channel the visitor picked. Option values stay English (they are what the
// atelier receives); only labels are translated.
export default function ContactMethodFields({ phoneLabel, preferredLabel, contacts }) {
  const { t } = useLocale();
  const copy = t.lead;
  const [method, setMethod] = useState("Email");
  const phoneRequired = method === "Phone" || method === "WhatsApp";

  return (
    <>
      <label>
        <span>
          {phoneRequired ? copy.phoneForContact : `${phoneLabel} ${copy.optional}`}
        </span>
        <input
          type="tel"
          name="phone"
          autoComplete="tel"
          inputMode="tel"
          required={phoneRequired}
        />
      </label>
      <label>
        <span>{preferredLabel}</span>
        <select
          name="preferred_contact"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        >
          {contacts.map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
      {method === "Line" && (
        <label>
          <span>{copy.lineId}</span>
          <input
            type="text"
            name="line_id"
            autoComplete="off"
            placeholder={copy.lineIdPlaceholder}
            required
          />
        </label>
      )}
    </>
  );
}
