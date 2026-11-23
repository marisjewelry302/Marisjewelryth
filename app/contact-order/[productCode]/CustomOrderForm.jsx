"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useShopLocale } from "../../hooks/useShopLocale";
import { isOptimizableImageSrc } from "../../lib/image-source";
import { fill } from "../../lib/i18n";
import { formatPublicProductCode } from "../../lib/product-display";
import { trackEvent } from "../../lib/track";
import { THAI_MAX, THAI_MIN, US_MAX, US_MIN, isValidThaiSize, isValidUsSize, thaiToUs, usToThai } from "../../lib/ring-size";

const METALS = ["WG", "YG", "RG", "PN", "Pd"];
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

// Where the server's `field` names live in the page. Order matters: the first
// failing field in this order is the one that gets focus. Fields inside the
// options dialog re-open it before they are focused.
const FIELD_TARGETS = {
  product_code: { selector: '[name="product_code"]' },
  full_name: { selector: '[name="full_name"]' },
  email: { selector: '[name="email"]' },
  contact_number: { selector: '[name="contact_number"]' },
  metal: { dialog: true, selector: '[data-field="metal"] button' },
  metal_purity: { dialog: true, selector: '[data-field="metal_purity"] button:not([disabled])' },
  ring_size: { dialog: true, selector: '[data-field="ring_size"]' },
  stone_carat: { dialog: true, selector: '[data-field="stone_carat"]' },
  stone_color: { dialog: true, selector: '[data-field="stone_color"]' },
  stone_clarity: { dialog: true, selector: '[data-field="stone_clarity"]' },
  stone_cut: { dialog: true, selector: '[data-field="stone_cut"]' },
  origin: { dialog: true, selector: '[data-field="origin"] button' }
};
const OPTION_FIELD_KEYS = { carat: "stone_carat", color: "stone_color", clarity: "stone_clarity", cut: "stone_cut" };
const OPTION_ERROR_KEYS = ["metal", "metal_purity", "ring_size", "stone_carat", "stone_color", "stone_clarity", "stone_cut", "origin"];
const SIZE_GUIDE_PATH = "/journal/journal-ring-size-guide";

// The API answers in English; the page shows its own wording for each field and
// never prints the server's text.
function getFieldErrorKey(error) {
  const field = String(error?.field || "");

  return FIELD_TARGETS[field] ? field : "other";
}

function getLocalizedFieldError(errors, error, ringSizeSystem = "us") {
  const key = getFieldErrorKey(error);

  if (key === "ring_size" && ringSizeSystem === "th") {
    return errors.ring_size_th;
  }

  if (key === "contact_number" && /required/i.test(String(error?.message || ""))) {
    return errors.contact_number_required;
  }

  if (errors[key]) {
    return errors[key];
  }

  return ["stone_color", "stone_clarity", "stone_cut", "origin"].includes(key) ? errors.option : errors.other;
}

function FieldError({ id, message }) {
  return message ? <small className="custom-order-field-error" id={id}>{message}</small> : null;
}

const INITIAL_OPTIONS = Object.freeze({
  metal: "",
  metal_purity: "",
  ring_size: "",
  ring_size_system: "us",
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
    ring_size_system: options.ring_size_system,
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
    options.ring_size ? `${copy.sizePrefix} ${options.ring_size_system === "th" ? `${copy.sizeThai} ${options.ring_size}` : `${copy.sizeUs} ${options.ring_size}`}` : "",
    options.origin ? (copy.origins[options.origin] || options.origin) : "",
    stoneText
  ].filter(Boolean).join(" · ");
}

export default function CustomOrderForm({ productCode, productImage = null, productPath = "", initialMetal = "" }) {
  const { t, href: localHref } = useShopLocale();
  const o = t.order;
  const [options, setOptions] = useState(() => (
    initialMetal ? { ...INITIAL_OPTIONS, metal: initialMetal } : INITIAL_OPTIONS
  ));
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const isThaiSize = options.ring_size_system === "th";
  // The same size in the other system, shown live while the customer types.
  const ringSizeNumber = Number(options.ring_size);
  const ringSizeEquivalent = options.ring_size === "" ? "" : (
    isThaiSize
      ? (isValidThaiSize(ringSizeNumber) ? fill(o.ringSizeIsUs, { size: thaiToUs(ringSizeNumber) }) : "")
      : (isValidUsSize(ringSizeNumber) ? fill(o.ringSizeIsThai, { size: usToThai(ringSizeNumber) }) : "")
  );
  const [pending, setPending] = useState(false);
  const [statusTone, setStatusTone] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const successHeadingRef = useRef(null);
  const optionTriggerRef = useRef(null);
  const modalRef = useRef(null);
  const formRef = useRef(null);
  // Selector of the dialog field to focus once the dialog has opened.
  const pendingFocusRef = useRef("");

  const selectedOptionSummary = useMemo(() => buildSelectedOptionSummary(options, o), [options, o]);

  // Once the request is in, the confirmation replaces the form; its heading
  // takes focus so a screen reader hears the outcome.
  useEffect(() => {
    if (isSubmitted) {
      successHeadingRef.current?.focus();
    }
  }, [isSubmitted]);

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
        return;
      }

      // Keep Tab inside the dialog: it is modal, so the form behind it must not
      // take focus. Wraps from the last control to the first and back.
      if (event.key === "Tab" && modalRef.current) {
        const focusable = [...modalRef.current.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )].filter((element) => element.offsetParent !== null || element === document.activeElement);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        const insideDialog = modalRef.current.contains(active);

        if (!first) {
          event.preventDefault();
          return;
        }

        if (event.shiftKey && (active === first || active === modalRef.current || !insideDialog)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !insideDialog)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => {
      const pending = pendingFocusRef.current;
      pendingFocusRef.current = "";
      const target = pending ? modalRef.current?.querySelector(pending) : null;

      (target || modalRef.current)?.focus();
    });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeOptions, isOptionsOpen]);

  function clearFieldError(key) {
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const { [key]: removed, ...rest } = current;
      return rest;
    });
  }

  function focusField(key) {
    const target = FIELD_TARGETS[key];

    if (!target) {
      return;
    }

    if (target.dialog) {
      pendingFocusRef.current = target.selector;
      setIsOptionsOpen(true);
      return;
    }

    window.requestAnimationFrame(() => {
      formRef.current?.querySelector(target.selector)?.focus();
    });
  }

  function updateMetal(metal) {
    clearFieldError("metal");
    setOptions((current) => ({
      ...current,
      metal,
      metal_purity: GOLD_METALS.has(metal) ? current.metal_purity : ""
    }));
  }

  function updateOption(fieldName, value) {
    clearFieldError(OPTION_FIELD_KEYS[fieldName] || fieldName);
    setOptions((current) => ({
      ...current,
      [fieldName]: value
    }));
  }

  // Switching system converts a valid entry so the customer sees the same size.
  function updateRingSizeSystem(system) {
    clearFieldError("ring_size");
    setOptions((current) => {
      if (current.ring_size_system === system) {
        return current;
      }

      const number = Number(current.ring_size);
      let converted = "";

      if (current.ring_size !== "") {
        if (system === "th" && isValidUsSize(number)) {
          converted = String(usToThai(number));
        } else if (system === "us" && isValidThaiSize(number)) {
          converted = String(thaiToUs(number));
        }
      }

      return { ...current, ring_size_system: system, ring_size: converted };
    });
  }

  function updateStone(fieldName, value) {
    clearFieldError(OPTION_FIELD_KEYS[fieldName] || fieldName);
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
    setFieldErrors({});
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
        setIsSubmitted(true);
        trackEvent("generate_lead", { form_type: "custom_order", item_id: formatPublicProductCode(productCode) });
        return;
      }

      const serverErrors = Array.isArray(result.errors) ? result.errors : [];

      if (serverErrors.length > 0) {
        const nextErrors = {};

        serverErrors.forEach((error) => {
          const key = getFieldErrorKey(error);

          if (!nextErrors[key]) {
            nextErrors[key] = getLocalizedFieldError(o.errors, error, options.ring_size_system);
          }
        });

        const firstKey = Object.keys(FIELD_TARGETS).find((key) => nextErrors[key]);

        setFieldErrors(nextErrors);
        setStatusTone("error");
        setStatusMessage(o.errors.summary);
        focusField(firstKey);
        return;
      }

      setFieldErrors({});
      setStatusTone("error");
      setStatusMessage(
        result.status === "rate_limited" ? o.errors.rateLimited
          : result.status === "not_configured" ? o.errors.unavailable
            : result.status === "email_failed" || result.status === "email_not_configured" ? o.errors.partial
              : o.failed
      );
    } catch {
      setStatusTone("error");
      setStatusMessage(o.noConnection);
    } finally {
      setPending(false);
    }
  }

  const isGoldMetal = GOLD_METALS.has(options.metal);
  const displayCode = formatPublicProductCode(productCode);

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
            {productPath ? (
              <strong><a href={localHref(productPath)}>{displayCode}</a></strong>
            ) : (
              <strong>{displayCode}</strong>
            )}
          </div>
        </div>

        <div className="custom-order-workspace">
          <div className="custom-order-heading">
            <p>{o.eyebrow}</p>
            <h1 id="custom-order-title">{o.title}</h1>
            <span>{o.lead}</span>
          </div>

          {isSubmitted ? (
            <div className="custom-order-success" role="status">
              <h2 tabIndex={-1} ref={successHeadingRef}>{o.successTitle}</h2>
              <p className="custom-order-success__code">{o.successCode} <strong>{displayCode}</strong></p>
              <p>{o.successText}</p>
              <div className="custom-order-success__links">
                {productPath ? (
                  <a className="custom-order-success__primary" href={localHref(productPath)}>
                    {fill(o.backToProduct, { code: displayCode })}
                  </a>
                ) : null}
                <a href={localHref("/collections")}>{o.browseCollections}</a>
              </div>
            </div>
          ) : (
          <form
            className="custom-order-form"
            onSubmit={handleSubmit}
            onChange={(event) => clearFieldError(event.target?.name)}
            ref={formRef}
          >
            <p className="custom-order-required-note">{o.requiredNote}</p>

            <label className="custom-order-field">
              <span>{o.productCode}</span>
              <input name="product_code" value={productCode} readOnly />
            </label>

            <div className="custom-order-field">
              <label htmlFor="custom-order-full-name"><span>{o.fullName} <span aria-hidden="true">*</span></span></label>
              <input
                id="custom-order-full-name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
                aria-invalid={fieldErrors.full_name ? "true" : undefined}
                aria-describedby={fieldErrors.full_name ? "custom-order-full-name-error" : undefined}
              />
              <FieldError id="custom-order-full-name-error" message={fieldErrors.full_name} />
            </div>

            <label className="custom-order-field">
              <span>{o.company} <span className="custom-order-optional">{o.optional}</span></span>
              <input name="company_name" type="text" autoComplete="organization" />
            </label>

            <div className="custom-order-field">
              <label htmlFor="custom-order-email"><span>{o.email} <span aria-hidden="true">*</span></span></label>
              <input
                id="custom-order-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={fieldErrors.email ? "true" : undefined}
                aria-describedby={fieldErrors.email ? "custom-order-email-error" : undefined}
              />
              <FieldError id="custom-order-email-error" message={fieldErrors.email} />
            </div>

            <div className="custom-order-field">
              <label htmlFor="custom-order-contact-number"><span>{o.contactNumber} <span aria-hidden="true">*</span></span></label>
              <input
                id="custom-order-contact-number"
                name="contact_number"
                type="tel"
                autoComplete="tel"
                required
                aria-invalid={fieldErrors.contact_number ? "true" : undefined}
                aria-describedby={fieldErrors.contact_number ? "custom-order-contact-number-error" : undefined}
              />
              <FieldError id="custom-order-contact-number-error" message={fieldErrors.contact_number} />
            </div>

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
              {OPTION_ERROR_KEYS.some((key) => fieldErrors[key]) ? (
                <p className="custom-order-field-error">{o.optionsNeedAttention}</p>
              ) : null}
            </div>

            <p className={`custom-order-status is-${statusTone}`} aria-live="polite">
              {statusMessage}
            </p>

            <button className="custom-order-submit" type="submit" disabled={pending}>
              {pending ? o.sendingShort : o.send}
            </button>
          </form>
          )}
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

            <div className="custom-order-option-group" data-field="metal">
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
              <FieldError id="custom-order-metal-error" message={fieldErrors.metal} />
            </div>

            <div className="custom-order-option-group" data-field="metal_purity">
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
              <FieldError id="custom-order-purity-error" message={fieldErrors.metal_purity} />
            </div>

            <div className="custom-order-option-group">
              <div className="custom-order-field">
                <label htmlFor="custom-order-ring-size"><span>{o.ringSize}</span></label>
                <div className="custom-order-segmented" role="group" aria-label={o.ringSizeSystem}>
                  {["us", "th"].map((system) => (
                    <button
                      type="button"
                      key={system}
                      className={options.ring_size_system === system ? "is-selected" : ""}
                      aria-pressed={options.ring_size_system === system}
                      onClick={() => updateRingSizeSystem(system)}
                    >
                      {system === "us" ? o.sizeUs : o.sizeThai}
                    </button>
                  ))}
                </div>
                <input
                  id="custom-order-ring-size"
                  name="ring_size"
                  data-field="ring_size"
                  type="number"
                  min={isThaiSize ? THAI_MIN : US_MIN}
                  max={isThaiSize ? THAI_MAX : US_MAX}
                  step={isThaiSize ? "1" : "0.5"}
                  inputMode="decimal"
                  value={options.ring_size}
                  onChange={(event) => updateOption("ring_size", event.target.value)}
                  aria-invalid={fieldErrors.ring_size ? "true" : undefined}
                  aria-describedby={`custom-order-ring-size-hint${fieldErrors.ring_size ? " custom-order-ring-size-error" : ""}`}
                />
              </div>
              <small id="custom-order-ring-size-hint">
                {isThaiSize ? fill(o.ringSizeHintTh, { min: THAI_MIN, max: THAI_MAX }) : o.ringSizeHint}{" "}
                <a href={localHref(SIZE_GUIDE_PATH)} target="_blank" rel="noopener">
                  {o.sizeGuide}
                  <span className="sr-only"> ({o.newTab})</span>
                </a>
              </small>
              {ringSizeEquivalent ? (
                <small className="custom-order-size-converter" role="status">{ringSizeEquivalent}</small>
              ) : null}
              <FieldError id="custom-order-ring-size-error" message={fieldErrors.ring_size} />
            </div>

            <div className="custom-order-stone-grid">
              <label className="custom-order-field">
                <span>{o.carat}</span>
                <input
                  name="carat"
                  data-field="stone_carat"
                  aria-invalid={fieldErrors.stone_carat ? "true" : undefined}
                  aria-describedby={fieldErrors.stone_carat ? "custom-order-carat-error" : undefined}
                  type="number"
                  min="0.2"
                  max="5"
                  step="0.1"
                  value={options.choose_stone.carat}
                  onChange={(event) => updateStone("carat", event.target.value)}
                />
                <FieldError id="custom-order-carat-error" message={fieldErrors.stone_carat} />
              </label>

              <label className="custom-order-field">
                <span>{o.color}</span>
                <select name="color" data-field="stone_color" aria-invalid={fieldErrors.stone_color ? "true" : undefined} value={options.choose_stone.color} onChange={(event) => updateStone("color", event.target.value)}>
                  {STONE_COLORS.map((color) => (
                    <option key={color || "empty-color"} value={color}>{color || o.select}</option>
                  ))}
                </select>
              </label>

              <label className="custom-order-field">
                <span>{o.clarity}</span>
                <select name="clarity" data-field="stone_clarity" aria-invalid={fieldErrors.stone_clarity ? "true" : undefined} value={options.choose_stone.clarity} onChange={(event) => updateStone("clarity", event.target.value)}>
                  {STONE_CLARITIES.map((clarity) => (
                    <option key={clarity || "empty-clarity"} value={clarity}>{clarity || o.select}</option>
                  ))}
                </select>
              </label>

              <label className="custom-order-field">
                <span>{o.cut}</span>
                <select name="cut" data-field="stone_cut" aria-invalid={fieldErrors.stone_cut ? "true" : undefined} value={options.choose_stone.cut} onChange={(event) => updateStone("cut", event.target.value)}>
                  {STONE_CUTS.map((cut) => (
                    <option key={cut || "empty-cut"} value={cut}>{cut ? (o.cuts[cut] || cut) : o.select}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="custom-order-option-group" data-field="origin">
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
              <FieldError id="custom-order-origin-error" message={fieldErrors.origin} />
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
