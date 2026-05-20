(() => {
  const articles = Array.isArray(window.MARIS_ARTICLE_LIBRARY) ? window.MARIS_ARTICLE_LIBRARY : [];
  const listContainer = document.querySelector("[data-article-list]");
  const detailContainer = document.querySelector("[data-article-detail]");
  const metaContainer = document.querySelector("[data-article-library-meta]");
  const noteContainer = document.querySelector("[data-article-library-note]");

  function getLanguage() {
    return document.documentElement.lang.toLowerCase().startsWith("th") ? "th" : "en";
  }

  function byLanguage(entry, language) {
    if (!entry || typeof entry !== "object") {
      return "";
    }

    return entry[language] || entry.en || "";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function updateMetaTag(selector, value) {
    const element = document.querySelector(selector);

    if (element && value) {
      element.setAttribute("content", value);
    }
  }

  function renderLibraryMeta(language) {
    if (!metaContainer) {
      return;
    }

    metaContainer.textContent = language === "th"
      ? "10 หัวข้อบทความสำหรับคนกำลังเลือกเพชร แหวนหมั้น และไฟน์จิวเวลรี่ พร้อมอ่านต่อแบบเจาะประเด็น"
      : "10 practical reads for buyers researching diamonds, engagement rings, and fine jewelry with more confidence.";
  }

  function renderLibraryNote(language) {
    if (!noteContainer) {
      return;
    }

    noteContainer.textContent = language === "th"
      ? "คอลเลกชันนี้ออกแบบให้เป็นจุดเริ่มต้นสำหรับคอนเทนต์สายแบรนด์และ SEO ของ Maris Jewelry โดยเน้นหัวข้อที่ลูกค้าถามจริงและค้นหาจริง"
      : "This journal collection is built as a strong starting point for Maris Jewelry brand content and search visibility, focusing on questions real buyers actually ask.";
  }

  function renderLibrary(language) {
    if (!listContainer) {
      return;
    }

    if (!articles.length) {
      listContainer.innerHTML = `<div class="journal-empty">${language === "th" ? "ยังไม่มีบทความในคลัง" : "No articles are available yet."}</div>`;
      return;
    }

    listContainer.innerHTML = articles.map((article, index) => `
      <a class="subpage-article-card journal-card-link" href="${escapeHtml(article.url)}">
        <span class="journal-card-number">${String(index + 1).padStart(2, "0")}</span>
        <div class="journal-card-meta-row">
          <p class="subpage-article-meta">${escapeHtml(byLanguage(article.category, language))}</p>
          <span class="journal-card-read-time">${escapeHtml(byLanguage(article.readTime, language))}</span>
        </div>
        <h2>${escapeHtml(byLanguage(article.title, language))}</h2>
        <p>${escapeHtml(byLanguage(article.excerpt, language))}</p>
        <span class="journal-card-cta">${language === "th" ? "อ่านบทความ" : "Read article"}</span>
      </a>
    `).join("");
  }

  function renderFacts(article, language) {
    return byLanguage(article.facts, language).map((item) => `
      <div>
        <p class="journal-fact-label">${escapeHtml(item[0])}</p>
        <p class="journal-fact-value">${escapeHtml(item[1])}</p>
      </div>
    `).join("");
  }

  function renderSections(article, language) {
    return byLanguage(article.sections, language).map((section) => `
      <section class="journal-section">
        <h2>${escapeHtml(section.title)}</h2>
        ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        <ul class="journal-bullets">
          ${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}
        </ul>
      </section>
    `).join("");
  }

  function renderDetail(language) {
    if (!detailContainer) {
      return;
    }

    const slug = detailContainer.dataset.articleDetail;
    const article = articles.find((entry) => entry.slug === slug);

    if (!article) {
      detailContainer.innerHTML = `<div class="journal-empty">${language === "th" ? "ไม่พบบทความที่ต้องการ" : "The requested article could not be found."}</div>`;
      return;
    }

    const title = byLanguage(article.title, language);
    const excerpt = byLanguage(article.excerpt, language);

    document.title = `${title} | Maris Jewelry`;
    updateMetaTag('meta[name="description"]', excerpt);
    updateMetaTag('meta[property="og:title"]', `${title} | Maris Jewelry`);
    updateMetaTag('meta[property="og:description"]', excerpt);
    updateMetaTag('meta[name="twitter:title"]', `${title} | Maris Jewelry`);
    updateMetaTag('meta[name="twitter:description"]', excerpt);

    detailContainer.innerHTML = `
      <header class="journal-article-header">
        <p class="eyebrow">${escapeHtml(byLanguage(article.category, language))}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="journal-article-dek">${escapeHtml(excerpt)}</p>
      </header>

      <div class="journal-article-layout">
        <div class="journal-article-content">
          ${renderSections(article, language)}
        </div>

        <aside class="journal-article-sidebar">
          <section class="journal-fact-card">
            <h2>${language === "th" ? "สรุปเร็ว" : "Quick notes"}</h2>
            <div class="journal-fact-list">
              ${renderFacts(article, language)}
            </div>
          </section>

          <section class="journal-note-card">
            <h2>${language === "th" ? "ข้อคิดก่อนตัดสินใจ" : "Final thought"}</h2>
            <p>${escapeHtml(byLanguage(article.note, language))}</p>
          </section>
        </aside>
      </div>

      <div class="page-actions journal-page-actions">
        <a class="primary-link" href="engagement-ring.html">${language === "th" ? "ชมแหวนหมั้น" : "View engagement rings"}</a>
        <a href="contact-us.html">${language === "th" ? "ติดต่อ Maris" : "Contact Maris"}</a>
        <a href="articles.html">${language === "th" ? "กลับไปหน้าบทความ" : "Back to articles"}</a>
      </div>
    `;
  }

  function renderAll() {
    const language = getLanguage();
    renderLibraryMeta(language);
    renderLibraryNote(language);
    renderLibrary(language);
    renderDetail(language);
  }

  const observer = new MutationObserver((mutations) => {
    const changed = mutations.some((mutation) => mutation.type === "attributes" && mutation.attributeName === "lang");

    if (changed) {
      renderAll();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll, { once: true });
  } else {
    renderAll();
  }
})();
