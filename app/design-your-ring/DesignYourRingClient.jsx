"use client";

import { useEffect, useMemo, useState } from "react";

const DESIGN_RING_DRAFT_KEY = "maris-design-your-ring-draft-v1";
const PRODUCT_CODE = "DESIGN-YOUR-RING";
const SIGNIN_PATH = "/account?mode=signin&next=/design-your-ring";
const SIGNUP_PATH = "/account?mode=signup&next=/design-your-ring";

const STEPS = [
  "Style",
  "Stone / Diamond",
  "Metal",
  "Ring Customize",
  "Review",
  "Submit Custom Order"
];

const RING_STYLES = ["Solitaire", "Pavé", "Halo", "Hidden Halo", "Side Stone", "Natural"];
const STONE_SHAPES = ["Round", "Oval", "Pear", "Emerald", "Princess", "Marquise", "Heart", "Radiant", "Cushion", "Baguette"];
const STONE_COLORS = ["D", "E", "F", "G", "H", "I", "J"];
const STONE_CLARITIES = ["VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2"];
const STONE_CUTS = ["Excellent", "Very Good", "Good", "Fair"];
const ORIGINS = ["Lab-grown", "Natural"];
const GOLD_METALS = new Set(["WG", "YG", "RG"]);
const METALS = [
  { value: "WG", label: "White Gold" },
  { value: "YG", label: "Yellow Gold" },
  { value: "RG", label: "Rose Gold" },
  { value: "PN", label: "Platinum" },
  { value: "Pd", label: "Palladium" }
];

const DEFAULT_DESIGN = {
  style: "Solitaire",
  stone_shape: "Round",
  carat: "1.00",
  colour: "D",
  clarity: "VS1",
  cut: "Excellent",
  origin: "Lab-grown",
  metal: "WG",
  metal_purity: "18K",
  ring_size: "6.5",
  engraving_enabled: false,
  engraving_text: "",
  contact_number: ""
};

function getSafeDraft(value) {
  if (!value || typeof value !== "object") {
    return DEFAULT_DESIGN;
  }

  return {
    ...DEFAULT_DESIGN,
    ...Object.fromEntries(
      Object.entries(value).filter(([, item]) => (
        typeof item === "string" || typeof item === "number" || typeof item === "boolean"
      ))
    )
  };
}

function getMetalLabel(value) {
  return METALS.find((metal) => metal.value === value)?.label || value;
}

function getPhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function ChoiceGrid({ legend, options, value, onChange, className = "" }) {
  return (
    <fieldset className={`design-ring-choice ${className}`}>
      <legend>{legend}</legend>
      <div className="design-ring-choice-grid">
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;

          return (
            <button
              key={optionValue}
              className={value === optionValue ? "is-selected" : ""}
              type="button"
              aria-pressed={value === optionValue}
              onClick={() => onChange(optionValue)}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function DesignYourRingClient() {
  const [step, setStep] = useState(0);
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [customer, setCustomer] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [draftReady, setDraftReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "", requestId: "" });
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    try {
      const draft = window.localStorage.getItem(DESIGN_RING_DRAFT_KEY);
      if (draft) {
        setDesign(getSafeDraft(JSON.parse(draft)));
      }
    } catch {
      setDesign(DEFAULT_DESIGN);
    } finally {
      setDraftReady(true);
    }

    fetch("/api/account/me", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((payload) => setCustomer(payload.customer || false))
      .catch(() => setCustomer(false))
      .finally(() => setAccountLoading(false));
  }, []);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    localStorage.setItem(DESIGN_RING_DRAFT_KEY, JSON.stringify({
      ...design,
      updatedAt: new Date().toISOString()
    }));
  }, [design, draftReady]);

  const selectedMetal = getMetalLabel(design.metal);
  const contactNumber = String(design.contact_number || customer?.phone || "").trim();
  const phoneDigits = getPhoneDigits(contactNumber);
  const reviewLines = useMemo(() => ([
    ["Style", design.style],
    ["Stone", `${design.stone_shape}, ${design.carat} ct, ${design.colour} ${design.clarity} ${design.cut}`],
    ["Origin", design.origin],
    ["Metal", [design.metal_purity, selectedMetal].filter(Boolean).join(" ")],
    ["Ring size", design.ring_size],
    ["Engraving", design.engraving_enabled ? design.engraving_text : "No engraving"]
  ]), [design, selectedMetal]);

  function updateDesign(key, value) {
    setStatus({ type: "", message: "", requestId: "" });
    setAuthRequired(false);
    setDesign((current) => {
      const next = { ...current, [key]: value };

      if (key === "metal") {
        next.metal_purity = GOLD_METALS.has(value) ? (current.metal_purity || "18K") : "";
      }

      if (key === "engraving_enabled" && !value) {
        next.engraving_text = "";
      }

      return next;
    });
  }

  function canMoveForward() {
    if (step === 3 && design.engraving_enabled && !String(design.engraving_text || "").trim()) {
      setStatus({ type: "error", message: "Engraving text is required when engraving is selected.", requestId: "" });
      return false;
    }

    return true;
  }

  function goNext() {
    if (!canMoveForward()) {
      return;
    }

    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStatus({ type: "", message: "", requestId: "" });
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submitDesign() {
    setStatus({ type: "", message: "", requestId: "" });
    setAuthRequired(false);

    if (design.engraving_enabled && !String(design.engraving_text || "").trim()) {
      setStatus({ type: "error", message: "Engraving text is required when engraving is selected.", requestId: "" });
      setStep(3);
      return;
    }

    if (!customer) {
      localStorage.setItem(DESIGN_RING_DRAFT_KEY, JSON.stringify({
        ...design,
        updatedAt: new Date().toISOString()
      }));
      setAuthRequired(true);
      setStep(5);
      return;
    }

    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      setStatus({ type: "error", message: "Add a contact number with 9 to 15 digits before submitting.", requestId: "" });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/custom-order-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          product_code: PRODUCT_CODE,
          full_name: customer.fullName || "Maris Client",
          company_name: "",
          email: customer.email,
          contact_number: contactNumber,
          custom_options: {
            metal: design.metal,
            metal_purity: GOLD_METALS.has(design.metal) ? design.metal_purity : "",
            ring_size: design.ring_size,
            choose_stone: {
              carat: design.carat,
              color: design.colour,
              clarity: design.clarity,
              cut: design.cut
            },
            origin: design.origin,
            ring_design: {
              style: design.style,
              stone_shape: design.stone_shape,
              engraving_enabled: design.engraving_enabled,
              engraving_text: design.engraving_enabled ? design.engraving_text.trim() : ""
            }
          }
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok && payload.status !== "email_failed") {
        const fieldMessage = Array.isArray(payload.errors) && payload.errors[0]?.message
          ? payload.errors[0].message
          : payload.error;
        setStatus({ type: "error", message: fieldMessage || "Custom request could not be sent.", requestId: "" });
        return;
      }

      localStorage.removeItem(DESIGN_RING_DRAFT_KEY);
      setStep(5);
      setStatus({
        type: payload.status === "email_failed" ? "warning" : "success",
        message: payload.status === "email_failed"
          ? "Your design was saved. The team notification email needs manual follow-up."
          : "Your design request has been sent to Maris.",
        requestId: payload.requestId || ""
      });
    } catch {
      setStatus({ type: "error", message: "Custom request could not be sent. Please try again.", requestId: "" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="site-main design-ring-page">
      <section className="design-ring-hero" aria-labelledby="design-ring-title">
        <div className="design-ring-hero-copy">
          <p className="design-ring-kicker">Our Expertise</p>
          <h1 id="design-ring-title">Design Your Ring</h1>
          <p>
            Shape a custom Maris ring before the private consultation. Your draft stays on this device until you submit it through your Maris account.
          </p>
        </div>
        <div className="design-ring-stone" aria-hidden="true">
          <span />
          <strong>{design.stone_shape}</strong>
          <small>{design.style}</small>
        </div>
      </section>

      <section className="design-ring-workbench" aria-label="Design Your Ring builder">
        <nav className="design-ring-steps" aria-label="Design steps">
          {STEPS.map((label, index) => (
            <button
              key={label}
              className={index === step ? "is-active" : index < step ? "is-complete" : ""}
              type="button"
              disabled={index > step}
              onClick={() => setStep(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="design-ring-panel">
          {step === 0 && (
            <div className="design-ring-step">
              <p className="design-ring-kicker">Style</p>
              <h2>Choose the ring silhouette</h2>
              <ChoiceGrid
                legend="Ring style"
                options={RING_STYLES}
                value={design.style}
                onChange={(value) => updateDesign("style", value)}
              />
            </div>
          )}

          {step === 1 && (
            <div className="design-ring-step">
              <p className="design-ring-kicker">Stone / Diamond</p>
              <h2>Set the center stone language</h2>
              <ChoiceGrid
                legend="Stone shape"
                options={STONE_SHAPES}
                value={design.stone_shape}
                onChange={(value) => updateDesign("stone_shape", value)}
              />
              <div className="design-ring-fields">
                <label>
                  Carat
                  <input
                    type="number"
                    min="0.2"
                    max="5"
                    step="0.05"
                    value={design.carat}
                    onChange={(event) => updateDesign("carat", event.target.value)}
                  />
                </label>
                <label>
                  Colour
                  <select value={design.colour} onChange={(event) => updateDesign("colour", event.target.value)}>
                    {STONE_COLORS.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label>
                  Clarity
                  <select value={design.clarity} onChange={(event) => updateDesign("clarity", event.target.value)}>
                    {STONE_CLARITIES.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label>
                  Cut
                  <select value={design.cut} onChange={(event) => updateDesign("cut", event.target.value)}>
                    {STONE_CUTS.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label>
                  Origin
                  <select value={design.origin} onChange={(event) => updateDesign("origin", event.target.value)}>
                    {ORIGINS.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="design-ring-step">
              <p className="design-ring-kicker">Metal</p>
              <h2>Choose the setting material</h2>
              <ChoiceGrid
                legend="Metal"
                options={METALS}
                value={design.metal}
                onChange={(value) => updateDesign("metal", value)}
              />
              {GOLD_METALS.has(design.metal) && (
                <ChoiceGrid
                  className="design-ring-choice-compact"
                  legend="Gold purity"
                  options={["9K", "14K", "18K"]}
                  value={design.metal_purity}
                  onChange={(value) => updateDesign("metal_purity", value)}
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="design-ring-step">
              <p className="design-ring-kicker">Ring Customize</p>
              <h2>Finish the personal details</h2>
              <div className="design-ring-fields design-ring-fields-tight">
                <label>
                  Ring size
                  <input
                    type="number"
                    min="5"
                    max="16"
                    step="0.5"
                    value={design.ring_size}
                    onChange={(event) => updateDesign("ring_size", event.target.value)}
                  />
                </label>
                <label className="design-ring-toggle">
                  <input
                    type="checkbox"
                    checked={design.engraving_enabled}
                    onChange={(event) => updateDesign("engraving_enabled", event.target.checked)}
                  />
                  Add engraving
                </label>
                <label className="design-ring-field-wide">
                  Engraving text
                  <input
                    name="engraving_text"
                    type="text"
                    maxLength={40}
                    value={design.engraving_text}
                    disabled={!design.engraving_enabled}
                    onChange={(event) => updateDesign("engraving_text", event.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="design-ring-step">
              <p className="design-ring-kicker">Review</p>
              <h2>Review your custom ring request</h2>
              <div className="design-ring-review">
                {reviewLines.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value || "-"}</strong>
                  </div>
                ))}
              </div>
              <div className="design-ring-account">
                <h3>Customer Account / Email</h3>
                {accountLoading ? (
                  <p>Checking account...</p>
                ) : customer ? (
                  <>
                    <p>{customer.fullName || "Maris Client"} · {customer.email}</p>
                    <label>
                      Contact number
                      <input
                        type="tel"
                        value={design.contact_number}
                        placeholder={customer.phone || "+66"}
                        onChange={(event) => updateDesign("contact_number", event.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <p>Sign in or create an account at submission. Your ring draft remains saved.</p>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="design-ring-step design-ring-submit-state">
              <p className="design-ring-kicker">Submit Custom Order</p>
              {authRequired ? (
                <>
                  <h2>Sign in to submit this design</h2>
                  <p>Your draft is saved. Return after account access to send it to the Maris team.</p>
                  <div className="design-ring-auth-actions">
                    <a href={SIGNIN_PATH}>Sign In</a>
                    <a href={SIGNUP_PATH}>Create Account</a>
                  </div>
                </>
              ) : (
                <>
                  <h2>{status.type === "success" || status.type === "warning" ? "Request received" : "Ready for a private review"}</h2>
                  <p>{status.message || "Submit this design as a custom order request for the Maris team."}</p>
                  {status.requestId && <strong className="design-ring-request-id">Request ID: {status.requestId}</strong>}
                </>
              )}
            </div>
          )}

          {status.message && step !== 5 && (
            <p className={`design-ring-message is-${status.type || "info"}`} role={status.type === "error" ? "alert" : "status"} aria-live="polite">
              {status.message}
            </p>
          )}

          <div className="design-ring-controls">
            <button type="button" onClick={goBack} disabled={step === 0 || submitting}>Back</button>
            {step < 4 && (
              <button type="button" onClick={goNext}>Next</button>
            )}
            {step === 4 && (
              <button type="button" onClick={submitDesign} disabled={submitting || accountLoading}>
                {submitting ? "Sending..." : "Submit Custom Order"}
              </button>
            )}
            {step === 5 && (
              <button type="button" onClick={() => setStep(0)}>Edit Design</button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
