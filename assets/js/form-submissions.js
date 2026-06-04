(() => {
  const storageKey = "marisLeadInbox";
  const previewHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const ignoredFieldNames = new Set(["form-name", "bot-field", "subject"]);
  const pageParams = new URLSearchParams(window.location.search);

  const copyLabels = {
    en: "Copy summary",
    th: "คัดลอกสรุป"
  };

  const formMessages = {
    contact: {
      success: {
        en: {
          status: "Inquiry prepared successfully.",
          title: "Your message is ready",
          body: "Maris Jewelry can now review your inquiry and reply through your preferred contact channel."
        },
        th: {
          status: "เตรียมคำขอเรียบร้อยแล้ว",
          title: "ข้อความของคุณพร้อมแล้ว",
          body: "ทีม Maris Jewelry สามารถตรวจสอบคำถามของคุณและตอบกลับผ่านช่องทางที่คุณสะดวกได้แล้ว"
        }
      },
      preview: {
        en: "Saved to this browser only. Copy the summary and send it through your preferred Maris contact channel.",
        th: "บันทึกไว้ในเบราว์เซอร์นี้เท่านั้น กรุณาคัดลอกสรุปและส่งต่อผ่านช่องทางติดต่อ Maris ที่คุณสะดวก"
      }
    },
    newsletter: {
      success: {
        en: {
          status: "Newsletter sign-up prepared successfully.",
          title: "You're on the Maris list",
          body: "Expect thoughtful updates on launches, custom work, and jewelry guidance from Maris Jewelry."
        },
        th: {
          status: "เตรียมการสมัครข่าวสารเรียบร้อยแล้ว",
          title: "คุณอยู่ในรายชื่อ Maris แล้ว",
          body: "คุณจะได้รับอัปเดตเรื่องสินค้าใหม่ งานสั่งทำ และเนื้อหาเกี่ยวกับจิวเวลรี่จาก Maris Jewelry"
        }
      },
      preview: {
        en: "Saved to this browser only. Copy the summary and send it through your preferred Maris contact channel.",
        th: "บันทึกไว้ในเบราว์เซอร์นี้เท่านั้น กรุณาคัดลอกสรุปและส่งต่อผ่านช่องทางติดต่อ Maris ที่คุณสะดวก"
      }
    },
    quote: {
      success: {
        en: {
          status: "Quote request prepared successfully.",
          title: "Your quote request is ready",
          body: "Maris Jewelry can now review your selected pieces, confirm availability, and reply with pricing direction."
        },
        th: {
          status: "เตรียมคำขอใบเสนอราคาเรียบร้อยแล้ว",
          title: "คำขอใบเสนอราคาของคุณพร้อมแล้ว",
          body: "ทีม Maris Jewelry สามารถตรวจสอบสินค้าที่คุณเลือก ยืนยันสถานะ และตอบกลับแนวทางราคาให้คุณได้แล้ว"
        }
      },
      preview: {
        en: "Saved to this browser only. Copy the summary and send it through your preferred Maris contact channel.",
        th: "บันทึกไว้ในเบราว์เซอร์นี้เท่านั้น กรุณาคัดลอกสรุปและส่งต่อผ่านช่องทางติดต่อ Maris ที่คุณสะดวก"
      },
      validation: {
        en: "Please select at least one piece before sending a quote request.",
        th: "กรุณาเลือกสินค้าอย่างน้อย 1 ชิ้นก่อนส่งคำขอใบเสนอราคา"
      }
    }
  };

  function getLanguage() {
    return document.documentElement.lang.toLowerCase().startsWith("th") ? "th" : "en";
  }

  function isLocalPreview() {
    return window.location.protocol === "file:" || previewHosts.has(window.location.hostname);
  }

  function readSubmissions() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch (error) {
      return [];
    }
  }

  function writeSubmissions(items) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("maris:leadchange"));
      return true;
    } catch (error) {
      return false;
    }
  }

  function collectData(formData) {
    const data = {};

    for (const [name, rawValue] of formData.entries()) {
      if (ignoredFieldNames.has(name)) {
        continue;
      }

      const value = String(rawValue).trim();

      if (!value) {
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(data, name)) {
        data[name] = Array.isArray(data[name])
          ? [...data[name], value]
          : [data[name], value];
      } else {
        data[name] = value;
      }
    }

    return data;
  }

  function encodeFormData(formData) {
    return new URLSearchParams(Array.from(formData.entries())).toString();
  }

  function setStatus(target, text, type = "info") {
    if (!target) {
      return;
    }

    target.textContent = text;
    target.dataset.type = type;
  }

  function formatSummaryValue(value) {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return String(value);
  }

  function buildSummaryLines(formType, data) {
    const titleMap = {
      contact: "Contact Inquiry",
      newsletter: "Newsletter Signup",
      quote: "Quote Request"
    };

    const lines = [`Type: ${titleMap[formType] || "Website Form"}`];

    Object.entries(data).forEach(([key, value]) => {
      const label = key
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());

      lines.push(`${label}: ${formatSummaryValue(value)}`);
    });

    return lines;
  }

  function renderResult(formType, resultTarget, summaryLines, previewMode) {
    if (!resultTarget) {
      return;
    }

    const language = getLanguage();
    const messageSet = formMessages[formType];
    const result = messageSet?.success?.[language];
    const title = resultTarget.querySelector("[data-form-result-title]");
    const body = resultTarget.querySelector("[data-form-result-body]");
    const copyButton = resultTarget.querySelector("[data-form-result-copy]");

    if (title && result) {
      title.textContent = result.title;
    }

    if (body && result) {
      body.textContent = previewMode ? messageSet.preview[language] : result.body;
    }

    if (copyButton) {
      copyButton.textContent = copyLabels[language];
      copyButton.hidden = false;
      copyButton.onclick = async () => {
        try {
          await navigator.clipboard.writeText(summaryLines.join("\n"));
          copyButton.textContent = language === "th" ? "คัดลอกแล้ว" : "Copied";
        } catch (error) {
          copyButton.textContent = language === "th" ? "คัดลอกไม่สำเร็จ" : "Copy failed";
        }
      };
    }

    resultTarget.hidden = false;
  }

  async function submitToConfiguredEndpoint(form, formData) {
    const endpoint = form.dataset.submitEndpoint || "";

    if (!endpoint || isLocalPreview()) {
      return false;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: encodeFormData(formData)
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  function applyQueryPrefill(form) {
    const serviceField = form.elements.namedItem("service");
    const serviceValue = pageParams.get("service");

    if (serviceField instanceof HTMLSelectElement && serviceValue) {
      const matchingOption = Array.from(serviceField.options).find((option) => option.value === serviceValue);

      if (matchingOption) {
        serviceField.value = matchingOption.value;
      }
    }
  }

  function validateBeforeSubmit(formType, formData) {
    if (formType !== "quote") {
      return null;
    }

    const selectedPieces = String(formData.get("selected_pieces") || "").trim();

    if (selectedPieces) {
      return null;
    }

    return formMessages.quote.validation[getLanguage()];
  }

  document.querySelectorAll("[data-maris-form]").forEach((form) => {
    applyQueryPrefill(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formType = form.dataset.marisForm || "contact";
      const statusTarget = form.querySelector("[data-form-status]");
      const resultTarget = form.parentElement?.querySelector("[data-form-result]") || form.querySelector("[data-form-result]");
      const submitButton = form.querySelector('[type="submit"]');
      const formData = new FormData(form);
      const validationError = validateBeforeSubmit(formType, formData);

      if (validationError) {
        setStatus(statusTarget, validationError, "error");
        return;
      }

      submitButton?.setAttribute("disabled", "disabled");

      const data = collectData(formData);
      const summaryLines = buildSummaryLines(formType, data);
      const saved = writeSubmissions([
        {
          id: `${formType}-${Date.now()}`,
          type: formType,
          submittedAt: new Date().toISOString(),
          path: window.location.pathname,
          data
        },
        ...readSubmissions()
      ]);
      const endpointAccepted = await submitToConfiguredEndpoint(form, formData);
      const language = getLanguage();
      const messageSet = formMessages[formType]?.success?.[language];

      if (!saved) {
        setStatus(
          statusTarget,
          language === "th"
            ? "เบราว์เซอร์นี้ไม่สามารถบันทึกข้อมูลชั่วคราวได้ กรุณาลองอีกครั้ง"
            : "This browser could not save the preview submission. Please try again.",
          "error"
        );
        submitButton?.removeAttribute("disabled");
        return;
      }

      setStatus(
        statusTarget,
        endpointAccepted
          ? messageSet.status
          : formMessages[formType].preview[language],
        endpointAccepted ? "success" : "info"
      );

      renderResult(formType, resultTarget, summaryLines, !endpointAccepted);

      if (form.dataset.resetOnSuccess !== "false") {
        form.reset();
        applyQueryPrefill(form);
        document.dispatchEvent(new CustomEvent("maris:formreset", { detail: { formType } }));
      }

      submitButton?.removeAttribute("disabled");
    });
  });
})();
