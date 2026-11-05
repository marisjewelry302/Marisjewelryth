"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale } from "../../hooks/useLocale";
import { isOptimizableImageSrc } from "../../lib/image-source";

const METALS = ["WG", "YG", "RG", "PN", "Pd"];
const METAL_LABELS = {
  WG: "White Gold",
  YG: "Yellow Gold",
  RG: "Rose Gold",
  PN: "Platinum",
  Pd: "Palladium"
};
const GOLD_METALS = new Set(["WG", "YG", "RG"]);
const METAL_PURITIES = ["9K", "14K", "18K"];
const STONE_COLORS = [
  "",
  "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
  "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];
const STONE_CLARITIES = ["", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3"];
const STONE_CUTS = ["", "Excellent", "Very Good", "Good", "Fair", "Poor"];
const ORIGINS = ["Lab-grown", "Natural"];

const INITIAL_OPTIONS = Object.freeze({
  metal: "",
  metal_purity: "",
  ring_size: "",
  choose_stone: Object.freeze({
    carat: "",
    color: "",
    clarity: "",
    cut: ""
  }),
  origin: ""
});

function formText(formData, fieldName) {
  return String(formData.get(fieldName) || "").trim();
}

function buildCustomOptions(options) {
  const isGoldMetal = GOLD_METALS.has(options.metal);

  return {
    metal: options.metal,
    metal_purity: isGoldMetal ? options.metal_purity : "",
    ring_size: options.ring_size,
    choose_stone: {
      carat: options.choose_stone.carat,
      color: options.choose_stone.color,
      clarity: options.choose_stone.clarity,
      cut: options.choose_stone.cut
    },
    origin: options.origin
  };
}

function buildSelectedOptionSummary(options, copy) {
  const isGoldMetal = GOLD_METALS.has(options.metal);
  const metalText = [
    isGoldMetal ? options.metal_purity : "",
    options.metal ? copy.metals[options.metal] : ""
  ].filter(Boolean).join(" ");
  const stoneText = [
    options.choose_stone.carat ? `${options.choose_stone.carat} ct` : "",
    options.choose_stone.color,
    options.choose_stone.clarity,
    options.choose_stone.cut ? (copy.cuts[options.choose_stone.cut] || options.choose_stone.cut) : ""
  ].filter(Boolean).join(" ");

  return [
    metalText,
    options.ring_size ? `${copy.sizePrefix} ${options.ring_size}` : "",
    options.origin ? (copy.origins[options.origin] || options.origin) : "",
    stoneText
  ].filter(Boolean).join(" · ");
}

export default function CustomOrderForm({ productCode, productImage = null, initialMetal = "" }) {
  const { t } = useLocale();
  const o = t.order;
  const [options, setOptions] = useState(() => (
    initialMetal ? { ...INITIAL_OPTIONS, metal: initialMetal } : INITIAL_OPTIONS
  ));
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [statusTone, setStatusTone] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const optionTriggerRef = useRef(null);
  const modalRef = useRef(null);

  const selectedOptionSummary = useMemo(() => buildSelectedOptionSummary(options, o), [options, o]);

  const closeOptions = useCallback(() => {
    setIsOptionsOpen(false);
    window.requestAnimationFrame(() => {
      optionTriggerRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!isOptionsOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeOptions();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => {
      modalRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeOptions, isOptionsOpen]);

  function updateMetal(metal) {
    setOptions((current) => ({
      ...current,
      metal,
      metal_purity: GOLD_METALS.has(metal) ? current.metal_purity : ""
    }));
  }

  function updateOption(fieldName, value) {
    setOptions((current) => ({
      ...current,
      [fieldName]: value
    }));
  }

  function updateStone(fieldName, value) {
    setOptions((current) => ({
      ...current,
      choose_stone: {
        ...current.choose_stone,
        [fieldName]: value
      }
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      product_code: productCode,
      full_name: formText(formData, "full_name"),
      company_name: formText(formData, "company_name"),
      email: formText(formData, "email"),
      contact_number: formText(formData, "contact_number"),
      website_url: formText(formData, "website_url"),
      custom_options: buildCustomOptions(options)
    };

    setPending(true);
    setStatusTone("idle");
    setStatusMessage(o.sending);

    try {
      const response = await fetch("/api/custom-order-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && (result.status === "created" || result.status === "duplicate")) {
        setStatusTone("success");
        setStatusMessage(o.received);
        return;
      }

      const validationText = Array.isArray(result.errors) && result.errors.length > 0
        ? result.errors.map((error) => error.message).filter(Boolean).join(" ")
        : "";
      setStatusTone("error");
      setStatusMessage(validationText || result.error || o.failed);
    } catch {
      setStatusTone("error");
      setStatusMessage(o.noConnection);
    } finally {
      setPending(false);
    }
  }

  const isGoldMetal = GOLD_METALS.has(options.metal);

  return (
    <main id="main-content" className="custom-order-page">
      <section className="custom-order-shell" aria-labelledby="custom-order-title">
        <div
          className={`custom-order-visual${productImage ? " has-product-image" : ""}`}
          aria-hidden={productImage ? undefined : "true"}
        >
          {productImage && (
            <Image
              className="custom-order-visual__image"
              src={productImage.src}
              alt={productImage.alt}
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              preload
              unoptimized={!isOptimizableImageSrc(productImage.src)}
            />
          )}
          <div className="custom-order-visual__caption">
            <span>{o.atelier}</span>
            <strong>{productCode}</strong>
          </div>
        </div>

        <div className="custom-order-workspace">
          <div className="custom-order-heading">
            <p>{o.eyebrow}</p>
            <h1 id="custom-order-title">{o.title}</h1>
            <span>{o.lead}</span>
          </div>

          <form className="custom-order-form" onSubmit={handleSubmit}>
            <label className="custom-order-field">
              <span>{o.productCode}</span>
              <input name="product_code" value={productCode} readOnly />
            </label>

            <label className="custom-order-field">
              <span>{o.fullName}</span>
              <input name="full_name" type="text" autoComplete="name" required />
            </label>

            <label className="custom-order-field">
              <span>{o.company}</span>
              <input name="company_name" type="text" autoComplete="organization" />
            </label>

            <label className="custom-order-field">
              <span>{o.email}</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>

            <label className="custom-order-field">
              <span>{o.contactNumber}</span>
              <input name="contact_number" type="tel" autoComplete="tel" required />
            </label>

            <label className="custom-order-honeypot" aria-hidden="true" tabIndex={-1}>
              <span>{o.websiteUrl}</span>
              <input name="website_url" type="text" autoComplete="off" tabIndex={-1} />
            </label>

            <div className="custom-order-options-row">
              <button
                className="custom-order-options-trigger"
                type="button"
                onClick={() => setIsOptionsOpen(true)}
                ref={optionTriggerRef}
              >
                {o.additional}
              </button>
              {selectedOptionSummary ? (
                <p className="custom-order-selected">{selectedOptionSummary}</p>
              ) : (
                <p className="custom-order-selected is-empty">{o.noneSelected}</p>
              )}
            </div>

            <p className={`custom-order-status is-${statusTone}`} aria-live="polite">
              {statusMessage}
            </p>

            <button className="custom-order-submit" type="submit" disabled={pending}>
              {pending ? o.sendingShort : o.send}
            </button>
          </form>
        </div>
      </section>

      {isOptionsOpen ? (
        <div className="custom-order-modal-layer">
          <button className="custom-order-modal-backdrop" type="button" aria-label={o.closeOptions} onClick={closeOptions} />
          <section
            className="custom-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-order-options-title"
            tabIndex={-1}
            ref={modalRef}
          >
            <div className="custom-order-modal__header">
              <div>
                <p>{o.optionalDetails}</p>
                <h2 id="custom-order-options-title">{o.productOptions}</h2>
              </div>
              <button className="custom-order-modal__close" type="button" onClick={closeOptions} aria-label={o.closeOptions}>
                {o.close}
              </button>
            </div>

            <div className="custom-order-option-group">
              <span className="custom-order-option-label">{o.metal}</span>
              <div className="custom-order-segmented" role="group" aria-label={o.metal}>
                {METALS.map((metal) => (
                  <button
                    key={metal}
                    type="button"
                    className={options.metal === metal ? "is-selected" : ""}
                    aria-pressed={options.metal === metal}
                    onClick={() => updateMetal(metal)}
                  >
                    {o.metals[metal]}
                  </button>
                ))}
              </div>
            </div>

            <div className="custom-order-option-group">
              <span className="custom-order-option-label">{o.purity}</span>
              <div className="custom-order-segmented" role="group" aria-label={o.purity}>
                {METAL_PURITIES.map((purity) => (
                  <button
                    key={purity}
                    type="button"
                    className={options.metal_purity === purity ? "is-selected" : ""}
                    aria-pressed={options.metal_purity === purity}
                    disabled={!isGoldMetal}
                    onClick={() => updateOption("metal_purity", purity)}
                  >
                    {purity}
                  </button>
                ))}
              </div>
              {!isGoldMetal && options.metal ? (
                <small>{o.purityNote}</small>
              ) : null}
            </div>

            <label className="custom-order-field">
              <span>{o.ringSize}</span>
              <input
                name="ring_size"
                type="number"
                min="5"
                max="16"
                step="0.5"
                value={options.ring_size}
                onChange={(event) => updateOption("ring_size", event.target.value)}
              />
            </label>

            <div className="custom-order-stone-grid">
              <label className="custom-order-field">
                <span>{o.carat}</span>
                <input
                  name="carat"
                  type="number"
                  min="0.2"
                  max="5"
                  step="0.1"
                  value={options.choose_stone.carat}
                  onChange={(event) => updateStone("carat", event.target.value)}
                />
              </label>

              <label className="custom-order-field">
                <span>{o.color}</span>
                <select name="color" value={options.choose_stone.color} onChange={(event) => updateStone("color", event.target.value)}>
                  {STONE_COLORS.map((color) => (
                    <option key={color || "empty-color"} value={color}>{color || o.select}</option>
                  ))}
                </select>
              </label>

              <label className="custom-order-field">
                <span>{o.clarity}</span>
                <select name="clarity" value={options.choose_stone.clarity} onChange={(event) => updateStone("clarity", event.target.value)}>
                  {STONE_CLARITIES.map((clarity) => (
                    <option key={clarity || "empty-clarity"} value={clarity}>{clarity || o.select}</option>
                  ))}
                </select>
              </label>

              <label className="custom-order-field">
                <span>{o.cut}</span>
                <select name="cut" value={options.choose_stone.cut} onChange={(event) => updateStone("cut", event.target.value)}>
                  {STONE_CUTS.map((cut) => (
                    <option key={cut || "empty-cut"} value={cut}>{cut ? (o.cuts[cut] || cut) : o.select}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="custom-order-option-group">
              <span className="custom-order-option-label">{o.origin}</span>
              <div className="custom-order-segmented" role="group" aria-label={o.stoneOrigin}>
                {ORIGINS.map((origin) => (
                  <button
                    key={origin}
                    type="button"
                    className={options.origin === origin ? "is-selected" : ""}
                    aria-pressed={options.origin === origin}
                    onClick={() => updateOption("origin", origin)}
                  >
                    {o.origins[origin] || origin}
                  </button>
                ))}
              </div>
            </div>

            {selectedOptionSummary ? (
              <div className="custom-order-modal__summary">
                <span>{o.summary}</span>
                <p>{selectedOptionSummary}</p>
              </div>
            ) : null}

            <button className="custom-order-modal__apply" type="button" onClick={closeOptions}>
              {o.saveOptions}
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
