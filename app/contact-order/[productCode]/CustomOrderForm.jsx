"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function buildSelectedOptionSummary(options) {
  const isGoldMetal = GOLD_METALS.has(options.metal);
  const metalText = [
    isGoldMetal ? options.metal_purity : "",
    options.metal ? METAL_LABELS[options.metal] : ""
  ].filter(Boolean).join(" ");
  const stoneText = [
    options.choose_stone.carat ? `${options.choose_stone.carat} ct` : "",
    options.choose_stone.color,
    options.choose_stone.clarity,
    options.choose_stone.cut
  ].filter(Boolean).join(" ");

  return [
    metalText,
    options.ring_size ? `Size ${options.ring_size}` : "",
    options.origin,
    stoneText
  ].filter(Boolean).join(" · ");
}

export default function CustomOrderForm({ productCode }) {
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [statusTone, setStatusTone] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const optionTriggerRef = useRef(null);
  const modalRef = useRef(null);

  const selectedOptionSummary = useMemo(() => buildSelectedOptionSummary(options), [options]);

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
    setStatusMessage("กำลังส่งคำขอติดต่อกลับ");

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
        setStatusMessage("ติดต่อกลับสำเร็จ ทีม Maris จะติดต่อกลับเพื่อยืนยันรายละเอียดสินค้า");
        return;
      }

      const validationText = Array.isArray(result.errors) && result.errors.length > 0
        ? result.errors.map((error) => error.message).filter(Boolean).join(" ")
        : "";
      setStatusTone("error");
      setStatusMessage(validationText || result.error || "ไม่สามารถส่งคำขอได้ในขณะนี้ กรุณาตรวจสอบข้อมูลอีกครั้ง");
    } catch {
      setStatusTone("error");
      setStatusMessage("ไม่สามารถเชื่อมต่อเพื่อส่งคำขอได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setPending(false);
    }
  }

  const isGoldMetal = GOLD_METALS.has(options.metal);

  return (
    <main className="custom-order-page">
      <section className="custom-order-shell" aria-labelledby="custom-order-title">
        <div className="custom-order-visual" aria-hidden="true">
          <div className="custom-order-visual__caption">
            <span>Maris atelier</span>
            <strong>{productCode}</strong>
          </div>
        </div>

        <div className="custom-order-workspace">
          <div className="custom-order-heading">
            <p>Contact order request</p>
            <h1 id="custom-order-title">ติดต่อสั่งสินค้า</h1>
            <span>Share your contact details and optional preferences. Our atelier will confirm availability before any next step.</span>
          </div>

          <form className="custom-order-form" onSubmit={handleSubmit}>
            <label className="custom-order-field">
              <span>Product code</span>
              <input name="product_code" value={productCode} readOnly />
            </label>

            <label className="custom-order-field">
              <span>Full name</span>
              <input name="full_name" type="text" autoComplete="name" required />
            </label>

            <label className="custom-order-field">
              <span>Company name</span>
              <input name="company_name" type="text" autoComplete="organization" />
            </label>

            <label className="custom-order-field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>

            <label className="custom-order-field">
              <span>Contact number</span>
              <input name="contact_number" type="tel" autoComplete="tel" required />
            </label>

            <label className="custom-order-honeypot" aria-hidden="true" tabIndex={-1}>
              <span>Website URL</span>
              <input name="website_url" type="text" autoComplete="off" tabIndex={-1} />
            </label>

            <div className="custom-order-options-row">
              <button
                className="custom-order-options-trigger"
                type="button"
                onClick={() => setIsOptionsOpen(true)}
                ref={optionTriggerRef}
              >
                ตัวเลือกเพิ่มเติม
              </button>
              {selectedOptionSummary ? (
                <p className="custom-order-selected">{selectedOptionSummary}</p>
              ) : (
                <p className="custom-order-selected is-empty">No optional details selected</p>
              )}
            </div>

            <p className={`custom-order-status is-${statusTone}`} aria-live="polite">
              {statusMessage}
            </p>

            <button className="custom-order-submit" type="submit" disabled={pending}>
              {pending ? "กำลังส่งคำขอ" : "ส่งคำขอติดต่อกลับ"}
            </button>
          </form>
        </div>
      </section>

      {isOptionsOpen ? (
        <div className="custom-order-modal-layer">
          <button className="custom-order-modal-backdrop" type="button" aria-label="Close options" onClick={closeOptions} />
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
                <p>Optional details</p>
                <h2 id="custom-order-options-title">ตัวเลือกสินค้า</h2>
              </div>
              <button className="custom-order-modal__close" type="button" onClick={closeOptions} aria-label="Close options">
                Close
              </button>
            </div>

            <div className="custom-order-option-group">
              <span className="custom-order-option-label">Metal</span>
              <div className="custom-order-segmented" role="group" aria-label="Metal">
                {METALS.map((metal) => (
                  <button
                    key={metal}
                    type="button"
                    className={options.metal === metal ? "is-selected" : ""}
                    aria-pressed={options.metal === metal}
                    onClick={() => updateMetal(metal)}
                  >
                    {metal}
                  </button>
                ))}
              </div>
            </div>

            <div className="custom-order-option-group">
              <span className="custom-order-option-label">Metal purity</span>
              <div className="custom-order-segmented" role="group" aria-label="Metal purity">
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
                <small>Purity is available only for WG, YG, or RG.</small>
              ) : null}
            </div>

            <label className="custom-order-field">
              <span>Ring size</span>
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
                <span>Stone carat</span>
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
                <span>Color</span>
                <select name="color" value={options.choose_stone.color} onChange={(event) => updateStone("color", event.target.value)}>
                  {STONE_COLORS.map((color) => (
                    <option key={color || "empty-color"} value={color}>{color || "Select"}</option>
                  ))}
                </select>
              </label>

              <label className="custom-order-field">
                <span>Clarity</span>
                <select name="clarity" value={options.choose_stone.clarity} onChange={(event) => updateStone("clarity", event.target.value)}>
                  {STONE_CLARITIES.map((clarity) => (
                    <option key={clarity || "empty-clarity"} value={clarity}>{clarity || "Select"}</option>
                  ))}
                </select>
              </label>

              <label className="custom-order-field">
                <span>Cut</span>
                <select name="cut" value={options.choose_stone.cut} onChange={(event) => updateStone("cut", event.target.value)}>
                  {STONE_CUTS.map((cut) => (
                    <option key={cut || "empty-cut"} value={cut}>{cut || "Select"}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="custom-order-option-group">
              <span className="custom-order-option-label">Origin</span>
              <div className="custom-order-segmented" role="group" aria-label="Stone origin">
                {ORIGINS.map((origin) => (
                  <button
                    key={origin}
                    type="button"
                    className={options.origin === origin ? "is-selected" : ""}
                    aria-pressed={options.origin === origin}
                    onClick={() => updateOption("origin", origin)}
                  >
                    {origin}
                  </button>
                ))}
              </div>
            </div>

            {selectedOptionSummary ? (
              <div className="custom-order-modal__summary">
                <span>Selected summary</span>
                <p>{selectedOptionSummary}</p>
              </div>
            ) : null}

            <button className="custom-order-modal__apply" type="button" onClick={closeOptions}>
              Save options
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
