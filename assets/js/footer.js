(() => {
  const script = document.currentScript || Array.from(document.scripts).find((item) => item.src && item.src.includes("/assets/js/footer.js"));
  const scriptUrl = script?.src ? new URL(script.src, window.location.href) : new URL(window.location.href);
  const siteRoot = new URL("../../", scriptUrl);
  const stylesheet = new URL("../css/footer.css", scriptUrl);
  stylesheet.search = "v=20260427-mobile-accordion-clean";
  const stylesheetUrl = stylesheet.href;
  const storageKeys = ["marisLanguage", "marisHomeLanguage"];

  const translations = {
    en: {
      contactTitle: "Contact",
      informationTitle: "Information",
      joinTitle: "Join Us",
      company: "Maris Jewelry Co., Ltd.",
      email: "marisjewelryth@gmail.com",
      phone: "Tel: 095-879-2659",
      address: "302/9-10 Surawong Road, Si Phraya, Bang Rak, Bangkok, Thailand 10500",
      hours: "Mon - Fri, 08.30 - 18:00",
      terms: "Terms of Service",
      shipping: "Shipping",
      returns: "Returns",
      privacy: "Privacy Policy",
      joinText: "Receive exclusive updates & offers",
      emailPlaceholder: "Your email",
      joinLabel: "Join newsletter",
      instagram: "Instagram",
      facebook: "Facebook",
      pinterest: "Pinterest",
      copyright: `© ${new Date().getFullYear()} Maris Jewelry`
    },
    th: {
      contactTitle: "ติดต่อเรา",
      informationTitle: "ข้อมูล",
      joinTitle: "ร่วมติดตาม",
      company: "บริษัท มาริส จิวเวลรี่ จำกัด",
      email: "marisjewelryth@gmail.com",
      phone: "โทร: 095-879-2659",
      address: "302/9-10 ถนนสุรวงศ์ แขวงสี่พระยา เขตบางรัก กรุงเทพมหานคร 10500",
      hours: "จันทร์ - ศุกร์, 08.30 - 18.00 น.",
      terms: "เงื่อนไขการให้บริการ",
      shipping: "การจัดส่ง",
      returns: "การคืนสินค้า",
      privacy: "นโยบายความเป็นส่วนตัว",
      joinText: "รับข่าวสารและข้อเสนอพิเศษ",
      emailPlaceholder: "อีเมลของคุณ",
      joinLabel: "สมัครรับข่าวสาร",
      instagram: "Instagram",
      facebook: "Facebook",
      pinterest: "Pinterest",
      copyright: `© ${new Date().getFullYear()} Maris Jewelry`
    }
  };

  const socials = [
    {
      key: "instagram",
      url: "https://www.instagram.com/maris_jewelry_th?igsh=MXNoeHpxN2VkaTU0NA==",
      icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="4" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/><circle cx="16.7" cy="7.4" r="1" fill="currentColor"/></svg>'
    },
    {
      key: "facebook",
      url: "https://www.facebook.com/share/1JH2idcjPM/",
      icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.1 8.1h2.1V5h-2.4c-2.7 0-4.2 1.7-4.2 4.4V11H7.4v3.1h2.2V20h3.3v-5.9h2.8l.5-3.1h-3.3V9.5c0-.9.4-1.4 1.2-1.4Z" fill="currentColor"/></svg>'
    },
    {
      key: "pinterest",
      url: "https://pin.it/5pKmV7MKf",
      icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12.1 4.5c-4 0-6.4 2.7-6.4 5.8 0 1.9 1 3.4 2.5 4 .3.1.6 0 .7-.4l.2-.9c.1-.3.1-.4-.1-.7-.5-.6-.8-1.2-.8-2.1 0-2.1 1.6-3.9 4.1-3.9 2.2 0 3.6 1.3 3.6 3.4 0 2.5-1.1 4.2-2.6 4.2-.8 0-1.5-.7-1.3-1.6.3-1 .8-2.1.8-2.8 0-.7-.4-1.3-1.1-1.3-.9 0-1.6.9-1.6 2.2 0 .8.3 1.4.3 1.4l-1.1 4.6c-.3 1.2-.2 2.8-.1 3.2 0 .2.3.3.4.1.2-.3 1.9-2.4 2.3-3.6.1-.4.6-2.1.6-2.1.3.6 1.2 1.1 2.2 1.1 2.9 0 5-2.7 5-6.1 0-3.2-2.6-5.6-6.2-5.6Z" fill="currentColor"/></svg>'
    }
  ];

  function injectStylesheet() {
    if (document.querySelector('link[data-maris-footer-styles="true"]')) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylesheetUrl;
    link.dataset.marisFooterStyles = "true";
    document.head.appendChild(link);
  }

  function getLanguage() {
    const htmlLang = document.documentElement.lang.toLowerCase();

    if (htmlLang.startsWith("th")) {
      return "th";
    }

    for (const key of storageKeys) {
      try {
        const saved = window.localStorage.getItem(key);
        if (saved === "th" || saved === "en") {
          return saved;
        }
      } catch (error) {
        break;
      }
    }

    return "en";
  }

  function buildUrl(path) {
    return new URL(path, siteRoot).href;
  }

  function socialLinks(t, className) {
    return socials.map((social) => `
      <a href="${social.url}" aria-label="${t[social.key]}" target="_blank" rel="noopener noreferrer">
        ${social.icon}
      </a>
    `).join("");
  }

  function mobileSocialLinks(t) {
    return socials.map((social) => `
      <a href="${social.url}" aria-label="${t[social.key]}" target="_blank" rel="noopener noreferrer">
        ${social.icon}
      </a>
    `).join("");
  }

  function contactPanel(t) {
    return `
      <p>${t.company}</p>
      <p>${t.address}</p>
      <p>${t.phone}</p>
      <p>${t.email}</p>
      <p>${t.hours}</p>
    `;
  }

  function informationLinks(t) {
    return `
      <a href="${buildUrl("pages/terms-of-service.html")}">${t.terms}</a>
      <a href="${buildUrl("pages/shipping.html")}">${t.shipping}</a>
      <a href="${buildUrl("pages/returns.html")}">${t.returns}</a>
      <a href="${buildUrl("pages/privacy-policy.html")}">${t.privacy}</a>
    `;
  }

  function signupPanel(t, suffix) {
    const emailId = `maris-footer-email-${suffix}`;

    return `
      <p>${t.joinText}</p>
      <form class="maris-footer__email-box" action="${buildUrl("pages/newsletter.html")}" method="get">
        <label class="maris-footer__sr-only" for="${emailId}">${t.joinLabel}</label>
        <input id="${emailId}" type="email" name="email" placeholder="${t.emailPlaceholder}" aria-label="${t.joinLabel}">
        <button type="submit" aria-label="${t.joinLabel}">→</button>
      </form>
    `;
  }

  function mobileSection(key, title, content) {
    return `
      <section class="maris-footer__section" data-footer-section="${key}">
        <button class="maris-footer__toggle" type="button" aria-expanded="false">
          <span class="maris-footer__toggle-label">${title}</span>
          <span class="maris-footer__chevron" aria-hidden="true"></span>
        </button>
        <div class="maris-footer__panel" aria-hidden="true">
          <div class="maris-footer__panel-inner">${content}</div>
        </div>
      </section>
    `;
  }

  function renderFooter(lang) {
    const t = translations[lang] || translations.en;
    const footerMarkup = `
      <footer class="maris-footer" data-maris-footer="true">
        <div class="maris-footer__inner">
          <div class="maris-footer__desktop">
            <div class="maris-footer__desktop-col">
              <h3>${t.contactTitle}</h3>
              ${contactPanel(t)}
            </div>

            <div class="maris-footer__desktop-col">
              <h3>${t.informationTitle}</h3>
              <ul>
                <li><a href="${buildUrl("pages/terms-of-service.html")}">${t.terms}</a></li>
                <li><a href="${buildUrl("pages/shipping.html")}">${t.shipping}</a></li>
                <li><a href="${buildUrl("pages/returns.html")}">${t.returns}</a></li>
                <li><a href="${buildUrl("pages/privacy-policy.html")}">${t.privacy}</a></li>
              </ul>
            </div>

            <div class="maris-footer__desktop-col">
              <h3>${t.joinTitle}</h3>
              ${signupPanel(t, "desktop")}
              <div class="maris-footer__social">${socialLinks(t)}</div>
            </div>
          </div>

          <div class="maris-footer__mobile">
            <div class="maris-footer__mobile-head">
              <div class="maris-footer__mobile-social" aria-label="Maris social links">${mobileSocialLinks(t)}</div>
            </div>
            <div class="maris-footer__sections">
              ${mobileSection("contact", t.contactTitle, contactPanel(t))}
              ${mobileSection("information", t.informationTitle, `<nav class="maris-footer__links" aria-label="${t.informationTitle}">${informationLinks(t)}</nav>`)}
              ${mobileSection("join", t.joinTitle, signupPanel(t, "mobile"))}
            </div>
          </div>

          <div class="maris-footer__bottom">
            <p class="maris-footer__copyright">${t.copyright}</p>
          </div>
        </div>
      </footer>
    `;

    const template = document.createElement("template");
    template.innerHTML = footerMarkup.trim();
    return template.content.firstElementChild;
  }

  function setSectionState(section, expanded) {
    const button = section.querySelector(".maris-footer__toggle");
    const panel = section.querySelector(".maris-footer__panel");
    section.classList.toggle("is-open", expanded);
    button?.setAttribute("aria-expanded", String(expanded));
    panel?.setAttribute("aria-hidden", String(!expanded));

    if (panel) {
      panel.style.maxHeight = expanded ? `${panel.scrollHeight}px` : "0px";
    }
  }

  function setupAccordion(footer) {
    const sections = Array.from(footer.querySelectorAll("[data-footer-section]"));

    sections.forEach((section) => {
      setSectionState(section, false);
    });

    sections.forEach((section) => {
      const button = section.querySelector(".maris-footer__toggle");
      if (!button) {
        return;
      }

      button.addEventListener("click", () => {
        const willOpen = !section.classList.contains("is-open");
        sections.forEach((item) => setSectionState(item, false));
        setSectionState(section, willOpen);
      });
    });
  }

  function mountFooter() {
    injectStylesheet();

    const existingFooter = document.querySelector("[data-maris-footer]") || document.querySelector("footer.footer");
    const footer = renderFooter(getLanguage());

    if (existingFooter) {
      existingFooter.replaceWith(footer);
    } else {
      document.body.appendChild(footer);
    }

    document.body.classList.add("has-maris-footer");
    setupAccordion(footer);
  }

  let currentLanguage = getLanguage();
  mountFooter();

  const observer = new MutationObserver(() => {
    const nextLanguage = getLanguage();

    if (nextLanguage === currentLanguage) {
      return;
    }

    currentLanguage = nextLanguage;
    mountFooter();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });
})();
