(() => {
  const storageKey = "marisLanguage";
  const legacyStorageKey = "marisHomeLanguage";
  const scrolledClassName = "is-page-scrolled";
  const mobileMenuClassName = "is-mobile-menu-open";
  const bagStorageKey = "marisShoppingBag";
  const script = document.currentScript || Array.from(document.scripts).find((item) => item.src && item.src.includes("/assets/js/site-language.js"));
  const scriptUrl = script?.src ? new URL(script.src, window.location.href) : new URL(window.location.href);
  const siteRoot = new URL("../../", scriptUrl);
  const headerStylesheet = new URL("../css/site-header.css", scriptUrl);
  const pageName = window.location.pathname.split("/").pop() || "index.html";
  const searchParams = new URLSearchParams(window.location.search);

  headerStylesheet.search = "v=20260515-mobile-fit";

  function buildUrl(path) {
    return new URL(path, siteRoot).href;
  }

  function injectSharedHeaderStylesheet() {
    if (document.querySelector('link[data-maris-header-styles="true"]')) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = headerStylesheet.href;
    link.dataset.marisHeaderStyles = "true";
    document.head.appendChild(link);
  }

  function resolveCurrentSection() {
    const productCollection = searchParams.get("collection");

    if (pageName === "product.html" && productCollection) {
      const supportedCollections = new Set([
        "wedding-set",
        "engagement-ring",
        "wedding-bands",
        "mens-wedding-bands",
        "necklaces-pendants",
        "bracelets",
        "earrings",
        "rings"
      ]);

      if (supportedCollections.has(productCollection)) {
        return `${productCollection}.html`;
      }
    }

    if (pageName.startsWith("journal-")) {
      return "articles.html";
    }

    if (["request-quote.html", "newsletter.html", "facebook.html", "instagram.html"].includes(pageName)) {
      return "contact-us.html";
    }

    return pageName;
  }

  const currentSection = resolveCurrentSection();

  function isCurrentSection(...pages) {
    return pages.includes(currentSection);
  }

  function currentPageAttribute(...pages) {
    return isCurrentSection(...pages) ? ' aria-current="page"' : "";
  }

  function shouldRenderSharedHeader() {
    if (["index.html", ""].includes(pageName)) {
      return false;
    }

    if (document.body.classList.contains("admin-page") || document.body.classList.contains("not-found-page")) {
      return false;
    }

    return Boolean(document.querySelector(".site-header, .top-bar, .navbar"));
  }

  function renderSharedHeader() {
    const isGiftsCurrent = isCurrentSection("necklaces-pendants.html", "bracelets.html", "earrings.html", "rings.html");
    const isExpertiseCurrent = isCurrentSection("oem-jewelry.html", "wholesale-retail.html");
    const isAboutCurrent = isCurrentSection("about-us.html", "contact-us.html", "articles.html");
    const userIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 12a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Zm0 2.3c-4.3 0-7.8 2.2-7.8 4.9 0 .5.4.8.9.8h13.8c.5 0 .9-.3.9-.8 0-2.7-3.5-4.9-7.8-4.9Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const heartIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20s-6.8-4.6-8.8-8.2C1.7 9.3 2.3 5.9 5.5 4.6c2.1-.9 4.5-.2 6 1.5 1.5-1.7 3.9-2.4 6-1.5 3.2 1.3 3.8 4.7 2.3 7.2C18.8 15.4 12 20 12 20Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const bagIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 8h12l-1 11H7L6 8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 8V6.9A3.1 3.1 0 0 1 12.1 3.8h-.2A3.1 3.1 0 0 1 15 6.9V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    return `
      <div class="top-bar" data-maris-shared-header="true">
        <div class="top-left">
          <a href="tel:0958792659">095-879-2659</a>
          <a href="mailto:marisjewelryth@gmail.com">marisjewelryth@gmail.com</a>
          <span class="top-note" data-i18n="utility.custom">Custom Design Available</span>
        </div>
        <div class="top-right">
          <div class="language-switch" aria-label="Language selector">
            <button type="button" data-lang-switch="en">EN</button>
            <span>/</span>
            <button type="button" data-lang-switch="th">TH</button>
          </div>
        </div>
      </div>

      <header class="navbar" data-maris-shared-header="true">
        <div class="logo">
          <a href="${buildUrl("index.html")}" aria-label="Go to homepage">
            <img src="${buildUrl("assets/images/logo.png")}" alt="Maris Jewelry Logo">
          </a>
        </div>

        <nav class="nav" id="primary-navigation" aria-label="Main navigation">
          <a href="${buildUrl("pages/wedding-set.html")}" data-i18n="nav.weddingSet"${currentPageAttribute("wedding-set.html")}>Wedding set</a>
          <a href="${buildUrl("pages/engagement-ring.html")}" data-i18n="nav.engagement"${currentPageAttribute("engagement-ring.html")}>Engagement rings</a>
          <a href="${buildUrl("pages/wedding-bands.html")}" data-i18n="nav.wedding"${currentPageAttribute("wedding-bands.html")}>Wedding bands</a>
          <a href="${buildUrl("pages/mens-wedding-bands.html")}" data-i18n="nav.mens"${currentPageAttribute("mens-wedding-bands.html")}>Men's Rings</a>

          <div class="nav-item-dropdown${isGiftsCurrent ? " is-current" : ""}">
            <button class="nav-dropdown-trigger" type="button" data-i18n="nav.gift">Gifts</button>
            <div class="nav-dropdown" aria-label="Gifts categories">
              <a href="${buildUrl("pages/necklaces-pendants.html")}" data-i18n="collection.necklaces"${currentPageAttribute("necklaces-pendants.html")}>Necklaces &amp; Pendants</a>
              <a href="${buildUrl("pages/bracelets.html")}" data-i18n="collection.bracelets"${currentPageAttribute("bracelets.html")}>Bracelets</a>
              <a href="${buildUrl("pages/earrings.html")}" data-i18n="collection.earrings"${currentPageAttribute("earrings.html")}>Earrings</a>
              <a href="${buildUrl("pages/rings.html")}" data-i18n="collection.rings"${currentPageAttribute("rings.html")}>Rings</a>
            </div>
          </div>

          <div class="nav-item-dropdown${isExpertiseCurrent ? " is-current" : ""}">
            <button class="nav-dropdown-trigger" type="button" data-i18n="nav.expertise">Our expertise</button>
            <div class="nav-dropdown" aria-label="Our expertise">
              <a href="${buildUrl("pages/oem-jewelry.html")}" data-i18n="nav.oem"${currentPageAttribute("oem-jewelry.html")}>OEM Jewelry Service</a>
              <a href="${buildUrl("pages/wholesale-retail.html")}" data-i18n="nav.wholesaleRetail"${currentPageAttribute("wholesale-retail.html")}>Wholesale &amp; Retail</a>
            </div>
          </div>

          <div class="nav-item-dropdown${isAboutCurrent ? " is-current" : ""}">
            <a href="${buildUrl("pages/about-us.html")}" data-i18n="nav.about"${currentPageAttribute("about-us.html", "contact-us.html", "articles.html")}>About Us</a>
            <div class="nav-dropdown" aria-label="About Maris">
              <a href="${buildUrl("pages/contact-us.html")}" data-i18n="nav.contact"${currentPageAttribute("contact-us.html")}>Contact Us</a>
              <a href="${buildUrl("pages/articles.html")}" data-i18n="nav.articles"${currentPageAttribute("articles.html")}>Articles</a>
            </div>
          </div>
        </nav>

        <div class="icons" aria-label="Client links">
          <a href="${buildUrl("pages/account.html")}" aria-label="Account"${currentPageAttribute("account.html")}>${userIcon}</a>
          <a href="${buildUrl("pages/wishlist.html")}" aria-label="Wishlist"${currentPageAttribute("wishlist.html")}>${heartIcon}</a>
          <a href="${buildUrl("pages/shopping-bag.html")}" aria-label="Shopping bag"${currentPageAttribute("shopping-bag.html")}>${bagIcon}<span class="bag-count-badge" data-bag-count-badge hidden>0</span></a>
        </div>
      </header>
    `;
  }

  function normalizeSharedHeader() {
    if (!shouldRenderSharedHeader() || document.querySelector("[data-maris-shared-header]")) {
      return;
    }

    injectSharedHeaderStylesheet();

    const template = document.createElement("template");
    template.innerHTML = renderSharedHeader().trim();

    const siteHeader = document.querySelector(".site-header");
    const topBar = document.querySelector(".top-bar");
    const navbar = document.querySelector(".navbar");

    if (topBar && navbar) {
      topBar.before(template.content);
      topBar.remove();
      navbar.remove();
    } else if (siteHeader) {
      siteHeader.replaceWith(template.content);
    } else if (navbar) {
      navbar.replaceWith(template.content);
    }
  }

  function updateScrollState() {
    document.body.classList.toggle(scrolledClassName, window.scrollY > 24);
  }

  normalizeSharedHeader();
  updateScrollState();
  window.addEventListener("scroll", updateScrollState, { passive: true });

  function createMobileMenuButton() {
    const button = document.createElement("button");
    button.className = "mobile-menu-toggle";
    button.type = "button";
    button.setAttribute("aria-label", "Open navigation menu");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = "<span></span><span></span><span></span>";
    return button;
  }

  function setupMobileMenu() {
    const primaryNavigation = document.querySelector("#primary-navigation") || document.querySelector(".navbar .nav");

    if (!primaryNavigation) {
      return;
    }

    const header = primaryNavigation.closest(".hero-header, .navbar");
    let mobileMenuToggle = document.querySelector(".mobile-menu-toggle");

    if (!header) {
      return;
    }

    if (!primaryNavigation.id) {
      primaryNavigation.id = "primary-navigation";
    }

    if (!mobileMenuToggle && header.classList.contains("navbar")) {
      mobileMenuToggle = createMobileMenuButton();
      header.prepend(mobileMenuToggle);
    }

    if (!mobileMenuToggle) {
      return;
    }

    mobileMenuToggle.setAttribute("aria-controls", primaryNavigation.id);

    const closeMobileMenu = () => {
      document.body.classList.remove(mobileMenuClassName);
      mobileMenuToggle.setAttribute("aria-expanded", "false");
    };

    mobileMenuToggle.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle(mobileMenuClassName);
      mobileMenuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    primaryNavigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMobileMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    });
  }

  function setupSharedBagBadges() {
    function readBag() {
      try {
        return JSON.parse(localStorage.getItem(bagStorageKey)) || [];
      } catch (error) {
        return [];
      }
    }

    function updateBadges() {
      const items = readBag();
      const totalQuantity = Array.isArray(items)
        ? items.reduce((total, item) => total + (Number(item.quantity) || 1), 0)
        : 0;

      document.querySelectorAll("[data-bag-count-badge]").forEach((badge) => {
        badge.textContent = String(totalQuantity);
        badge.hidden = totalQuantity === 0;
      });
    }

    window.addEventListener("maris:bagchange", updateBadges);
    window.addEventListener("storage", (event) => {
      if (event.key === bagStorageKey) {
        updateBadges();
      }
    });

    updateBadges();
  }

  setupMobileMenu();
  setupSharedBagBadges();

  const keyedTranslations = {
    en: {
      "nav.weddingSet": "Wedding set",
      "nav.engagement": "Engagement rings",
      "nav.wedding": "Wedding bands",
      "nav.mens": "Men's Rings",
      "nav.gift": "Gifts",
      "nav.expertise": "Our expertise",
      "nav.oem": "OEM Jewelry Service",
      "nav.wholesaleRetail": "Wholesale & Retail",
      "nav.about": "About Us",
      "nav.contact": "Contact Us",
      "nav.articles": "Articles",
      "nav.account": "Account",
      "nav.wishlist": "Wishlist",
      "nav.bag": "Shopping bag",
      "hero.eyebrow": "Fine Jewelry • Bangkok",
      "hero.title": "Crafted for the moments that become forever.",
      "hero.tagline": "Quiet diamond jewelry for proposals, vows, and moments that stay.",
      "hero.primary": "Find Your Ring",
      "hero.secondary": "About Maris",
      "utility.custom": "Custom Design Available",
      "utility.trade": "OEM & Wholesale",
      "collection.eyebrow": "Maris Edit",
      "collection.title": "Shop by Category",
      "collection.intro": "Browse by occasion and style.",
      "collection.cta": "View",
      "collection.necklaces": "Necklaces & Pendants",
      "collection.bracelets": "Bracelets",
      "collection.earrings": "Earrings",
      "collection.rings": "Rings",
      "collection.feature.label": "For proposals",
      "collection.feature.title": "Engagement Rings",
      "collection.feature.cta": "View pieces",
      "atelier.eyebrow": "Atelier Preview",
      "atelier.title": "A quiet tray of Maris pieces.",
      "atelier.text": "Browse selected pieces, then enquire before ordering.",
      "atelier.primary": "View catalogue",
      "atelier.secondary": "Confirm availability",
      "value.lead.eyebrow": "Maris Standard",
      "value.lead.title": "A quieter kind of precision.",
      "value.lead.text": "Each piece is shaped for proportion, comfort, and a refined finish.",
      "value.ethical.title": "Ethically Crafted",
      "value.ethical.text": "Designed with care and made to feel timeless.",
      "value.craft.title": "Expert Craftsmanship",
      "value.craft.text": "Refined by skilled artisans with a meticulous eye.",
      "value.bespoke.title": "Bespoke Design",
      "value.bespoke.text": "Custom jewelry shaped around your vision.",
      "value.oem.title": "OEM & Wholesale",
      "value.oem.text": "Flexible production for private label and retail partners.",
      "footer.contact": "Contact",
      "footer.hours": "Mon - Fri, 08.30 - 18:00",
      "footer.information": "Information",
      "footer.terms": "Terms of Service",
      "footer.shipping": "Shipping",
      "footer.returns": "Returns",
      "footer.privacy": "Privacy Policy",
      "footer.join": "Join Us",
      "footer.joinText": "Receive Maris updates",
      "footer.emailPlaceholder": "Your email",
      "about.eyebrow": "Maris Jewelry",
      "about.title": "About Us",
      "about.lead": "Maris Jewelry brings together elegant design, custom development, and dependable production support for clients looking for meaningful fine jewelry.",
      "about.card1.title": "Quiet elegance",
      "about.card1.text": "The visual direction stays refined, wearable, and balanced so each piece feels personal rather than overdesigned.",
      "about.card2.title": "Custom-ready",
      "about.card2.text": "We can build from reference images, adapt proportions, and refine details around the final mood you want to achieve.",
      "about.card3.title": "Partner-minded",
      "about.card3.text": "The brand structure is also prepared to support OEM, wholesale, and selective retail conversations as the project grows.",
      "about.detailTitle": "What defines Maris",
      "about.point1.title": "Design with clarity",
      "about.point1.text": "We focus on clean silhouettes, thoughtful proportions, and details that still feel beautiful after trends move on.",
      "about.point2.title": "Flexible collaboration",
      "about.point2.text": "From one personal custom piece to a structured partner brief, the process can scale according to the type of project.",
      "about.point3.title": "Built to expand",
      "about.point3.text": "This website is a pre-launch foundation, ready to grow into a fuller catalogue, inquiry system, and service presentation.",
      "about.sidebarTitle": "At a glance",
      "about.focus.label": "Focus",
      "about.focus.value": "Engagement rings, wedding bands, gifts, and custom fine jewelry",
      "about.clients.label": "Best for",
      "about.clients.value": "Personal clients, private labels, and selective retail partners",
      "about.location.label": "Based in",
      "about.location.value": "Bangkok, Thailand",
      "about.ctaPrimary": "Contact Us",
      "about.ctaSecondary": "View Our Expertise",
      "oem.eyebrow": "Our Expertise",
      "oem.title": "OEM Jewelry Service",
      "oem.lead": "Prepared for brands, boutiques, and project-based clients who need jewelry development and production support under their own direction.",
      "oem.card1.title": "Product development",
      "oem.card1.text": "Start from a sketch, reference image, CAD direction, or sample revision and shape it into a production-ready design.",
      "oem.card2.title": "Material flexibility",
      "oem.card2.text": "Prepare options for metal color, stone type, finishing, and specification details according to the project brief.",
      "oem.card3.title": "Private-label support",
      "oem.card3.text": "Suitable for collections, capsule drops, event pieces, or small-batch branded jewelry programs.",
      "oem.processTitle": "Suggested workflow",
      "oem.step1.title": "Brief & direction",
      "oem.step1.text": "Share references, sizing, materials, and target range so the project scope is clear from the start.",
      "oem.step2.title": "Development review",
      "oem.step2.text": "Refine design details, confirm feasibility, and align the piece with brand or client expectations.",
      "oem.step3.title": "Sampling or approval",
      "oem.step3.text": "Finalize sample direction, production quantity, and finishing details before launch or order confirmation.",
      "oem.step4.title": "Production support",
      "oem.step4.text": "Move into coordinated production timing, updates, and delivery planning once approval is complete.",
      "oem.note": "OEM details can be tailored around sampling, MOQ, lead times, and finishing requirements once your project brief is clear.",
      "oem.ctaPrimary": "Contact for OEM",
      "oem.ctaSecondary": "Wholesale & Retail",
      "wholesale.eyebrow": "Our Expertise",
      "wholesale.title": "Wholesale & Retail",
      "wholesale.lead": "A flexible page structure for serving stockists, selective partners, and private clients with different order sizes and buying needs.",
      "wholesale.card1.title": "For retail partners",
      "wholesale.card1.text": "Useful for curated stores or brand partners that need a clean introduction to available categories and order discussion.",
      "wholesale.card2.title": "For direct clients",
      "wholesale.card2.text": "Can also support private shoppers looking for gifts, wedding pieces, or custom jewelry with guided consultation.",
      "wholesale.card3.title": "Ready to adapt",
      "wholesale.card3.text": "This page can later expand into pricing logic, MOQ, lead times, and category-specific information.",
      "wholesale.detailTitle": "What this page can grow into",
      "wholesale.point1.title": "Inquiry flow",
      "wholesale.point1.text": "A clear way for partners or clients to send category interest, quantity, timeline, and budget expectations.",
      "wholesale.point2.title": "Collection overview",
      "wholesale.point2.text": "A simple structure for separating ready-to-order pieces from custom, seasonal, or business-only items.",
      "wholesale.point3.title": "Support details",
      "wholesale.point3.text": "Future sections can include shipping, sample requests, ordering terms, and account-based access if needed.",
      "wholesale.ctaPrimary": "Contact Maris",
      "wholesale.ctaSecondary": "OEM Jewelry Service",
      "journal.eyebrow": "Maris Journal",
      "journal.title": "Articles",
      "journal.lead": "A curated journal of 10 practical reads on diamonds, engagement rings, metals, jewelry care, and smarter buying decisions.",
      "journal.card1.meta": "Buying Guide",
      "journal.card1.title": "How to choose an engagement ring that still feels like you",
      "journal.card1.text": "A future article space for shape, metal tone, and setting ideas that stay personal rather than generic.",
      "journal.card2.meta": "Craft & Care",
      "journal.card2.title": "Jewelry care notes for pieces you wear often",
      "journal.card2.text": "A place for care routines, storage guidance, and small habits that help fine jewelry stay beautiful longer.",
      "journal.card3.meta": "Brand Story",
      "journal.card3.title": "Behind custom design, gifting, and made-to-order work",
      "journal.card3.text": "A future editorial section for telling the story behind the way Maris works with clients and partner briefs.",
      "journal.note": "This page is intentionally lightweight for now so you can add real article covers, excerpts, and links later without rebuilding the whole layout.",
      "journal.ctaPrimary": "Contact Us",
      "journal.ctaSecondary": "About Us",
      "contact.eyebrow": "Maris Service",
      "contact.title": "Let's plan your piece",
      "contact.lead": "Reach out for engagement rings, wedding bands, custom work, gifts, OEM development, or wholesale conversations. We can guide the next step clearly and quietly.",
      "contact.directTitle": "Direct contact",
      "contact.emailTitle": "Email",
      "contact.phoneTitle": "Phone",
      "contact.addressTitle": "Address",
      "contact.addressValue": "302/9-10 Surawong Road, Si Phraya, Bang Rak, Bangkok, Thailand 10500",
      "contact.tag1": "Private appointments",
      "contact.tag2": "Custom design",
      "contact.tag3": "OEM & Wholesale",
      "contact.supportTitle": "How we usually help",
      "contact.support1.title": "Product guidance",
      "contact.support1.text": "Help choosing a design direction, comparing pieces, or narrowing down styles before you commit.",
      "contact.support2.title": "Custom development",
      "contact.support2.text": "Discuss reference images, metal tone, stone options, proportions, and event timing for made-to-order work.",
      "contact.support3.title": "Business inquiries",
      "contact.support3.text": "Start conversations about OEM production, selective retail, or wholesale support in a more structured way.",
      "contact.formTitle": "Send an inquiry",
      "contact.formLead": "Use the form below if you want a reply with product guidance, custom advice, or a business conversation starting point.",
      "contact.preferredContact": "Preferred contact",
      "contact.notesPlaceholder": "Tell us what you are looking for, which collection you like, or what kind of support you need.",
      "contact.formNote": "If you already know a category, target date, or budget direction, adding it here will help Maris Jewelry reply more precisely.",
      "contact.submit": "Send Inquiry",
      "contact.resultCta": "Request a quote instead",
      "contact.quoteCta": "Request pricing",
      "contact.articleCta": "Read Maris articles",
      "newsletter.eyebrow": "Maris Updates",
      "newsletter.title": "Join the Maris list",
      "newsletter.lead": "Receive thoughtful updates on new pieces, diamond guidance, custom projects, and the quieter side of Maris Jewelry.",
      "newsletter.benefitsTitle": "What you will receive",
      "newsletter.benefit1.title": "Curated launches",
      "newsletter.benefit1.text": "New engagement ring edits, everyday fine jewelry, and selected highlights without daily noise.",
      "newsletter.benefit2.title": "Helpful guidance",
      "newsletter.benefit2.text": "Simple notes on diamonds, ring sizing, gifting, and how to compare options more confidently.",
      "newsletter.benefit3.title": "Service updates",
      "newsletter.benefit3.text": "Occasional news on custom design, OEM development, and wholesale or retail support as the brand grows.",
      "newsletter.noteTitle": "A light-touch list",
      "newsletter.noteText": "This is meant to stay thoughtful and low-volume. The goal is to send useful updates rather than constant promotions.",
      "newsletter.tag1": "Jewelry launches",
      "newsletter.tag2": "Diamond tips",
      "newsletter.tag3": "Custom work",
      "newsletter.formTitle": "Subscribe",
      "newsletter.formLead": "Tell us a little about your interest so future updates feel more relevant from the start.",
      "newsletter.interest": "Main interest",
      "newsletter.language": "Preferred language",
      "newsletter.notes": "Anything specific you want to hear about?",
      "newsletter.notesPlaceholder": "Tell us if you care more about diamond education, new launches, custom work, or business updates.",
      "newsletter.formNote": "You can use this list as a way to keep track of Maris updates before requesting a quote or consultation later.",
      "newsletter.submit": "Join the list",
      "newsletter.resultCta": "Read the journal",
      "newsletter.quoteCta": "Request pricing",
      "newsletter.contactCta": "Contact Maris",
      "quote.eyebrow": "Quote Request",
      "quote.title": "Request pricing and availability",
      "quote.lead": "Share the piece you are considering or send your saved bag, and Maris Jewelry will confirm pricing direction, availability, and the next best step.",
      "quote.processTitle": "What happens next",
      "quote.process1.title": "1. Review your selection",
      "quote.process1.text": "We look at the selected pieces, requested timing, and whether you need ready-to-order guidance or custom development.",
      "quote.process2.title": "2. Confirm price direction",
      "quote.process2.text": "We reply with pricing range, metal or stone notes, and any details that affect the final quote.",
      "quote.process3.title": "3. Plan the next step",
      "quote.process3.text": "Depending on the piece, we can move into sizing, custom adjustments, appointment planning, or order confirmation.",
      "quote.formTitle": "Tell us what you need",
      "quote.formLead": "Leave your details below so Maris Jewelry can return with the right pricing direction and availability notes.",
      "quote.preferredContact": "Preferred contact",
      "quote.budget": "Budget range",
      "quote.budgetPlaceholder": "e.g. 30,000 - 60,000 THB",
      "quote.ringSize": "Ring size (if known)",
      "quote.ringSizePlaceholder": "e.g. US 6 / EU 52",
      "quote.formNote": "If you already know your event date or target budget, adding it here will help Maris Jewelry give a more useful first reply.",
      "quote.submit": "Send Quote Request",
      "quote.resultCta": "Contact Maris directly",
      "quote.backToSelection": "Return to selection",
      "quote.browse": "Browse Engagement Rings",
      "quote.emptyBody": "Start from a product page or your shopping bag to bring selected items into this request form.",
      "social.instagram.eyebrow": "Maris Social",
      "social.instagram.title": "Follow Maris on Instagram",
      "social.instagram.lead": "Instagram is the best place to see new pieces, quiet editorial moments, and how different Maris designs feel in everyday styling.",
      "social.instagram.card1.title": "What to expect",
      "social.instagram.card1.point1.title": "New launches",
      "social.instagram.card1.point1.text": "Fresh ring edits, gifts, and pieces worth seeing before they arrive in the full catalogue.",
      "social.instagram.card1.point2.title": "Custom work",
      "social.instagram.card1.point2.text": "Reference directions, material choices, and quiet behind-the-scenes looks at bespoke development.",
      "social.instagram.card2.title": "Official account",
      "social.instagram.card2.text": "Open the live profile to browse the latest posts, reels, and saved highlights from Maris Jewelry.",
      "social.instagram.open": "Open Instagram",
      "social.instagram.contact": "Contact Maris",
      "social.facebook.eyebrow": "Maris Social",
      "social.facebook.title": "Connect with Maris on Facebook",
      "social.facebook.lead": "Facebook is a simple place to stay close to brand updates, announcements, and conversations when you want a more familiar social format.",
      "social.facebook.card1.title": "Why follow there",
      "social.facebook.card1.point1.title": "Brand updates",
      "social.facebook.card1.point1.text": "See practical announcements, shared articles, and highlights that are easy to revisit later.",
      "social.facebook.card1.point2.title": "Direct reach-out",
      "social.facebook.card1.point2.text": "Use Facebook as another lightweight way to connect with Maris before moving into email or a quote request.",
      "social.facebook.card2.title": "Official page",
      "social.facebook.card2.text": "Open the live Facebook destination to keep track of the latest posts and stay connected with Maris Jewelry.",
      "social.facebook.open": "Open Facebook",
      "social.facebook.contact": "Contact Maris",
      "form.name": "Full name",
      "form.email": "Email",
      "form.phone": "Phone",
      "form.service": "Interested in",
      "form.notes": "Notes",
      "form.timeline": "Timing",
      "form.contact.email": "Email",
      "form.contact.phone": "Phone",
      "form.contact.line": "Line",
      "form.contact.whatsapp": "WhatsApp",
      "form.timeline.asap": "As soon as possible",
      "form.timeline.twoWeeks": "Within 2 weeks",
      "form.timeline.thisMonth": "Within this month",
      "form.timeline.research": "Just researching",
      "form.service.custom": "Custom Design",
      "form.service.general": "General Inquiry",
      "product.request": "Request This Piece",
      "bag.summaryTitle": "Start your quote request",
      "bag.summaryNote": "Use this selection to request pricing, check availability, or begin a custom conversation before final order details are confirmed.",
      "bag.primaryAction": "Continue to Quote Request",
      "bag.contactAction": "Contact Maris directly",
      "account.quoteRequests": "Quote Requests"
    },
    th: {
      "nav.weddingSet": "แหวนแต่งงาน",
      "nav.engagement": "แหวนหมั้น",
      "nav.wedding": "แหวนแถว",
      "nav.mens": "แหวนผู้ชาย",
      "nav.gift": "ของขวัญ",
      "nav.expertise": "ความเชี่ยวชาญของเรา",
      "nav.oem": "บริการผลิต OEM",
      "nav.wholesaleRetail": "ขายส่งและขายปลีก",
      "nav.about": "เกี่ยวกับเรา",
      "nav.contact": "ติดต่อเรา",
      "nav.articles": "บทความ",
      "nav.account": "บัญชี",
      "nav.wishlist": "รายการโปรด",
      "nav.bag": "ตะกร้าสินค้า",
      "hero.eyebrow": "เครื่องประดับเพชร • กรุงเทพฯ",
      "hero.title": "สร้างขึ้นเพื่อช่วงเวลาสำคัญที่คุณจะจดจำตลอดไป",
      "hero.tagline": "เครื่องประดับเพชรสำหรับคำขอแต่งงาน วันแต่งงาน และช่วงเวลาที่มีความหมาย",
      "hero.primary": "ค้นหาแหวนของคุณ",
      "hero.secondary": "เกี่ยวกับ Maris",
      "utility.custom": "รับออกแบบตามแบบ",
      "utility.trade": "OEM และขายส่ง",
      "collection.eyebrow": "คัดสรรโดย Maris",
      "collection.title": "เลือกชมตามหมวดหมู่",
      "collection.intro": "เลือกตามโอกาสและสไตล์ของคุณ",
      "collection.cta": "เลือกชม",
      "collection.necklaces": "สร้อยคอและจี้",
      "collection.bracelets": "สร้อยข้อมือ",
      "collection.earrings": "ต่างหู",
      "collection.rings": "แหวน",
      "collection.feature.label": "สำหรับคำขอแต่งงาน",
      "collection.feature.title": "แหวนหมั้น",
      "collection.feature.cta": "ดูแบบ",
      "atelier.eyebrow": "เปิดถาด Atelier",
      "atelier.title": "ถาดชิ้นงานของ Maris",
      "atelier.text": "เลือกชมชิ้นงานที่คัดไว้ แล้วสอบถามก่อนสั่งทำ",
      "atelier.primary": "ดูแคตตาล็อก",
      "atelier.secondary": "สอบถามสถานะสินค้า",
      "value.lead.eyebrow": "มาตรฐาน Maris",
      "value.lead.title": "ความประณีตที่ไม่ต้องส่งเสียงดัง",
      "value.lead.text": "ทุกชิ้นถูกดูแลเรื่องสัดส่วน ความสบาย และผิวงาน",
      "value.ethical.title": "งานที่ใส่ใจทุกขั้นตอน",
      "value.ethical.text": "ออกแบบอย่างประณีต เพื่อความเรียบหรูที่อยู่ได้นาน",
      "value.craft.title": "ช่างผู้เชี่ยวชาญ",
      "value.craft.text": "งานละเอียดที่ผ่านสายตาและประสบการณ์ของช่างฝีมือ",
      "value.bespoke.title": "ออกแบบเฉพาะคุณ",
      "value.bespoke.text": "ปรับดีไซน์ให้เหมาะกับสไตล์และเรื่องราวของคุณ",
      "value.oem.title": "OEM และขายส่ง",
      "value.oem.text": "รองรับงานผลิตให้แบรนด์และคู่ค้าทั้งขายส่งและขายปลีก",
      "footer.contact": "ติดต่อเรา",
      "footer.hours": "จันทร์ - ศุกร์, 08.30 - 18.00 น.",
      "footer.information": "ข้อมูล",
      "footer.terms": "เงื่อนไขการให้บริการ",
      "footer.shipping": "การจัดส่ง",
      "footer.returns": "การคืนสินค้า",
      "footer.privacy": "นโยบายความเป็นส่วนตัว",
      "footer.join": "ร่วมติดตาม",
      "footer.joinText": "รับข่าวสารจาก Maris",
      "footer.emailPlaceholder": "อีเมลของคุณ",
      "about.eyebrow": "Maris Jewelry",
      "about.title": "เกี่ยวกับเรา",
      "about.lead": "Maris Jewelry รวมงานดีไซน์ที่เรียบหรู งานพัฒนาตามแบบ และการดูแลงานผลิตไว้ในที่เดียว สำหรับลูกค้าที่มองหาไฟน์จิวเวลรี่ที่มีความหมาย",
      "about.card1.title": "เรียบหรูอย่างพอดี",
      "about.card1.text": "ทิศทางงานดีไซน์เน้นความสมดุล ใส่ง่าย และดูมีรสนิยม โดยไม่รู้สึกเยอะเกินความจำเป็น",
      "about.card2.title": "พร้อมต่อยอดตามแบบ",
      "about.card2.text": "สามารถเริ่มจากภาพอ้างอิง ปรับสัดส่วน และเก็บรายละเอียดต่อให้ได้อารมณ์ของชิ้นงานตามที่ต้องการ",
      "about.card3.title": "พร้อมคุยงานกับคู่ค้า",
      "about.card3.text": "โครงของแบรนด์และเว็บไซต์ถูกเตรียมไว้ให้รองรับทั้งงาน OEM งานขายส่ง และพาร์ตเนอร์รีเทลในอนาคต",
      "about.detailTitle": "สิ่งที่เป็น Maris",
      "about.point1.title": "ดีไซน์ที่ชัดเจน",
      "about.point1.text": "เราให้ความสำคัญกับทรงที่สะอาด สัดส่วนที่สมดุล และรายละเอียดที่ยังดูดีได้แม้เวลาผ่านไป",
      "about.point2.title": "ทำงานได้ยืดหยุ่น",
      "about.point2.text": "ตั้งแต่งาน custom ชิ้นเดียว ไปจนถึงบรีฟที่เป็นระบบสำหรับคู่ค้า กระบวนการสามารถปรับตามรูปแบบของโปรเจกต์ได้",
      "about.point3.title": "พร้อมขยายต่อ",
      "about.point3.text": "เว็บไซต์นี้เป็นโครงสร้างก่อนเปิดใช้งานจริง และพร้อมต่อยอดไปเป็นแคตตาล็อก ระบบสอบถาม และหน้าบริการที่ครบมากขึ้น",
      "about.sidebarTitle": "ภาพรวมแบบสั้นๆ",
      "about.focus.label": "โฟกัสหลัก",
      "about.focus.value": "แหวนหมั้น แหวนแต่งงาน ของขวัญ และไฟน์จิวเวลรี่สั่งทำ",
      "about.clients.label": "เหมาะกับ",
      "about.clients.value": "ลูกค้าทั่วไป แบรนด์ส่วนตัว และพาร์ตเนอร์รีเทลที่คัดเลือกแล้ว",
      "about.location.label": "ประจำอยู่ที่",
      "about.location.value": "กรุงเทพฯ ประเทศไทย",
      "about.ctaPrimary": "ติดต่อเรา",
      "about.ctaSecondary": "ดูบริการของเรา",
      "oem.eyebrow": "ความเชี่ยวชาญของเรา",
      "oem.title": "บริการผลิต OEM",
      "oem.lead": "เตรียมไว้สำหรับแบรนด์ บูติก และโปรเจกต์ที่ต้องการงานพัฒนาและงานผลิตเครื่องประดับในทิศทางของตัวเอง",
      "oem.card1.title": "พัฒนาสินค้า",
      "oem.card1.text": "เริ่มได้จากสเก็ตช์ ภาพอ้างอิง แนวทาง CAD หรือการแก้ตัวอย่าง เพื่อพัฒนาไปสู่ชิ้นงานที่พร้อมผลิตจริง",
      "oem.card2.title": "วัสดุยืดหยุ่น",
      "oem.card2.text": "สามารถวางตัวเลือกเรื่องสีทอง ประเภทอัญมณี งานผิว และสเปกต่างๆ ให้ตรงกับบรีฟของโปรเจกต์",
      "oem.card3.title": "รองรับ private label",
      "oem.card3.text": "เหมาะกับคอลเลกชันย่อย งานออกคอลเลกชันพิเศษ งานอีเวนต์ หรือโปรแกรมเครื่องประดับสำหรับแบรนด์ขนาดเล็ก",
      "oem.processTitle": "ลำดับงานที่แนะนำ",
      "oem.step1.title": "รับบรีฟและทิศทาง",
      "oem.step1.text": "ส่งภาพอ้างอิง ขนาด วัสดุ และช่วงราคาที่ต้องการ เพื่อให้ขอบเขตของงานชัดตั้งแต่ต้น",
      "oem.step2.title": "ทบทวนและพัฒนา",
      "oem.step2.text": "เก็บรายละเอียดดีไซน์ เช็กความเป็นไปได้ในการผลิต และปรับให้ชิ้นงานตรงกับความคาดหวังของแบรนด์หรือลูกค้า",
      "oem.step3.title": "ตัวอย่างหรืออนุมัติ",
      "oem.step3.text": "ยืนยันทิศทางตัวอย่าง จำนวนผลิต และรายละเอียดงานผิวก่อนเริ่มขายหรือคอนเฟิร์มออเดอร์",
      "oem.step4.title": "ดูแลการผลิต",
      "oem.step4.text": "หลังอนุมัติแล้วจึงเดินงานต่อในเรื่องระยะเวลา อัปเดตความคืบหน้า และแผนการส่งมอบ",
      "oem.note": "รายละเอียดงาน OEM สามารถปรับให้เหมาะกับการทำตัวอย่าง MOQ ระยะเวลาผลิต และงานเก็บผิวได้ เมื่อบรีฟของโปรเจกต์ชัดเจนแล้ว",
      "oem.ctaPrimary": "สอบถามงาน OEM",
      "oem.ctaSecondary": "ขายส่งและขายปลีก",
      "wholesale.eyebrow": "ความเชี่ยวชาญของเรา",
      "wholesale.title": "ขายส่งและขายปลีก",
      "wholesale.lead": "เป็นโครงหน้าที่รองรับทั้งร้านค้า พาร์ตเนอร์ที่คัดเลือก และลูกค้าทั่วไปที่มีขนาดออเดอร์หรือรูปแบบการซื้อแตกต่างกัน",
      "wholesale.card1.title": "สำหรับพาร์ตเนอร์รีเทล",
      "wholesale.card1.text": "เหมาะกับร้านหรือพาร์ตเนอร์แบรนด์ที่ต้องการหน้าแนะนำหมวดสินค้าและเริ่มต้นคุยเรื่องออเดอร์ได้ง่าย",
      "wholesale.card2.title": "สำหรับลูกค้าโดยตรง",
      "wholesale.card2.text": "รองรับลูกค้าที่มองหาของขวัญ ชิ้นงานแต่งงาน หรือเครื่องประดับสั่งทำ พร้อมคำแนะนำแบบเป็นกันเอง",
      "wholesale.card3.title": "พร้อมปรับต่อ",
      "wholesale.card3.text": "หน้านี้สามารถขยายต่อได้ภายหลังทั้งเรื่องราคา MOQ ระยะเวลา และข้อมูลแยกตามหมวดสินค้า",
      "wholesale.detailTitle": "หน้านี้ต่อยอดได้เป็นอะไรบ้าง",
      "wholesale.point1.title": "ระบบสอบถามงาน",
      "wholesale.point1.text": "เป็นช่องทางให้พาร์ตเนอร์หรือลูกค้าระบุหมวดสินค้า จำนวน ระยะเวลา และงบประมาณที่สนใจได้ชัดเจน",
      "wholesale.point2.title": "ภาพรวมคอลเลกชัน",
      "wholesale.point2.text": "ใช้แยกสินค้าพร้อมสั่งออกจากงาน custom งานตามฤดูกาล หรือสินค้าที่เปิดให้เฉพาะคู่ค้าได้",
      "wholesale.point3.title": "รายละเอียดการดูแล",
      "wholesale.point3.text": "ในอนาคตสามารถเพิ่มเรื่องจัดส่ง ตัวอย่างสินค้า เงื่อนไขการสั่ง และการเข้าถึงสำหรับคู่ค้าได้",
      "wholesale.ctaPrimary": "ติดต่อ Maris",
      "wholesale.ctaSecondary": "บริการผลิต OEM",
      "journal.eyebrow": "Maris Journal",
      "journal.title": "บทความ",
      "journal.lead": "รวม 10 บทความอ่านง่ายแต่ใช้ได้จริง ครอบคลุมเรื่องเพชร แหวนหมั้น โลหะมีค่า การดูแลจิวเวลรี่ และการตัดสินใจซื้ออย่างมั่นใจ",
      "journal.card1.meta": "Buying Guide",
      "journal.card1.title": "เลือกแหวนหมั้นยังไงให้ยังเป็นตัวคุณ",
      "journal.card1.text": "พื้นที่สำหรับบทความในอนาคตเกี่ยวกับทรงเพชร สีทอง และดีไซน์ตัวเรือนที่ยังดูเป็นคุณ ไม่ใช่แค่ตามกระแส",
      "journal.card2.meta": "Craft & Care",
      "journal.card2.title": "วิธีดูแลเครื่องประดับชิ้นที่หยิบใส่บ่อย",
      "journal.card2.text": "ใช้สำหรับรวม routine การดูแล วิธีเก็บรักษา และรายละเอียดเล็กๆ ที่ช่วยให้ไฟน์จิวเวลรี่สวยได้นานขึ้น",
      "journal.card3.meta": "Brand Story",
      "journal.card3.title": "เบื้องหลังงาน custom, gifting และ made-to-order",
      "journal.card3.text": "พื้นที่เล่าเรื่องการทำงานของ Maris ทั้งฝั่งลูกค้าทั่วไปและฝั่งบรีฟสำหรับพาร์ตเนอร์",
      "journal.note": "หน้านี้ตั้งใจทำให้เบาไว้ก่อน เพื่อให้คุณใส่ภาพปกบทความ ข้อความเกริ่น และลิงก์จริงเพิ่มภายหลังได้ง่ายโดยไม่ต้องรื้อ layout ใหม่",
      "journal.ctaPrimary": "ติดต่อเรา",
      "journal.ctaSecondary": "เกี่ยวกับเรา",
      "contact.eyebrow": "บริการของ Maris",
      "contact.title": "มาวางแผนชิ้นงานของคุณกัน",
      "contact.lead": "ติดต่อเราได้สำหรับแหวนหมั้น แหวนแต่งงาน งานสั่งทำ ของขวัญ งานพัฒนา OEM หรือการพูดคุยด้านขายส่ง เราพร้อมช่วยพาคุณไปต่ออย่างชัดเจนและเป็นกันเอง",
      "contact.directTitle": "ช่องทางติดต่อโดยตรง",
      "contact.emailTitle": "อีเมล",
      "contact.phoneTitle": "โทรศัพท์",
      "contact.addressTitle": "ที่อยู่",
      "contact.addressValue": "302/9-10 ถนนสุรวงศ์ แขวงสี่พระยา เขตบางรัก กรุงเทพมหานคร 10500",
      "contact.tag1": "นัดหมายส่วนตัว",
      "contact.tag2": "ออกแบบตามแบบ",
      "contact.tag3": "OEM และขายส่ง",
      "contact.supportTitle": "เราช่วยเรื่องอะไรได้บ้าง",
      "contact.support1.title": "แนะนำสินค้า",
      "contact.support1.text": "ช่วยเลือกทิศทางดีไซน์ เปรียบเทียบชิ้นงาน หรือคัดสไตล์ให้แคบลงก่อนตัดสินใจ",
      "contact.support2.title": "พัฒนางานสั่งทำ",
      "contact.support2.text": "คุยเรื่องภาพอ้างอิง สีทอง ตัวเลือกอัญมณี สัดส่วน และช่วงเวลาสำหรับงาน made-to-order",
      "contact.support3.title": "สอบถามเชิงธุรกิจ",
      "contact.support3.text": "เริ่มต้นคุยเรื่องงานผลิต OEM รีเทลแบบคัดเลือก หรือการดูแลงานขายส่งอย่างเป็นระบบ",
      "contact.formTitle": "ส่งคำถามถึงเรา",
      "contact.formLead": "ใช้ฟอร์มด้านล่างหากคุณต้องการคำตอบเรื่องสินค้า งานสั่งทำ หรือการเริ่มต้นพูดคุยเชิงธุรกิจ",
      "contact.preferredContact": "ช่องทางที่สะดวก",
      "contact.notesPlaceholder": "บอกเราว่าคุณกำลังมองหาอะไร ชอบคอลเลกชันไหน หรืออยากให้ช่วยเรื่องใด",
      "contact.formNote": "หากคุณรู้หมวดสินค้า วันที่ต้องการใช้ หรือช่วงงบแล้ว การใส่ข้อมูลตรงนี้จะช่วยให้ Maris ตอบกลับได้ตรงขึ้น",
      "contact.submit": "ส่งคำถาม",
      "contact.resultCta": "เปลี่ยนเป็นขอใบเสนอราคา",
      "contact.quoteCta": "ขอราคา",
      "contact.articleCta": "อ่านบทความ Maris",
      "newsletter.eyebrow": "อัปเดตจาก Maris",
      "newsletter.title": "เข้าร่วมรายชื่อ Maris",
      "newsletter.lead": "รับอัปเดตแบบตั้งใจคัดเรื่องสินค้าใหม่ ความรู้เรื่องเพชร งานสั่งทำ และอีกมุมที่สงบกว่าของ Maris Jewelry",
      "newsletter.benefitsTitle": "สิ่งที่คุณจะได้รับ",
      "newsletter.benefit1.title": "สินค้าใหม่ที่คัดแล้ว",
      "newsletter.benefit1.text": "อัปเดตแหวนหมั้น ไฟน์จิวเวลรี่ใส่ง่าย และชิ้นเด่นที่อยากให้เห็นโดยไม่ส่งรบกวนทุกวัน",
      "newsletter.benefit2.title": "คำแนะนำที่ใช้ได้จริง",
      "newsletter.benefit2.text": "โน้ตสั้น ๆ เรื่องเพชร ไซซ์แหวน การเลือกของขวัญ และการเปรียบเทียบตัวเลือกให้มั่นใจขึ้น",
      "newsletter.benefit3.title": "ความเคลื่อนไหวของบริการ",
      "newsletter.benefit3.text": "ข่าวคราวเป็นครั้งคราวเกี่ยวกับงานสั่งทำ การพัฒนา OEM และการดูแลงานขายส่งหรือรีเทลเมื่อแบรนด์เติบโตขึ้น",
      "newsletter.noteTitle": "เป็นลิสต์ที่ไม่รบกวนเกินไป",
      "newsletter.noteText": "เราตั้งใจให้เป็นการอัปเดตที่เบาและมีประโยชน์ มากกว่าการส่งโปรโมชั่นถี่ ๆ ตลอดเวลา",
      "newsletter.tag1": "สินค้าใหม่",
      "newsletter.tag2": "ทิปเรื่องเพชร",
      "newsletter.tag3": "งานสั่งทำ",
      "newsletter.formTitle": "สมัครรับข่าวสาร",
      "newsletter.formLead": "บอกความสนใจของคุณสักเล็กน้อย เพื่อให้อัปเดตจาก Maris ตรงกับสิ่งที่คุณอยากติดตามมากขึ้นตั้งแต่แรก",
      "newsletter.interest": "ความสนใจหลัก",
      "newsletter.language": "ภาษาที่สะดวก",
      "newsletter.notes": "มีเรื่องไหนที่อยากติดตามเป็นพิเศษไหม",
      "newsletter.notesPlaceholder": "บอกเราได้ว่าคุณสนใจความรู้เรื่องเพชร สินค้าใหม่ งานสั่งทำ หรืออัปเดตเชิงธุรกิจมากกว่าแบบไหน",
      "newsletter.formNote": "คุณสามารถใช้ลิสต์นี้เพื่อติดตามความเคลื่อนไหวของ Maris ก่อนค่อยขอราคา หรือนัดปรึกษาในภายหลังได้",
      "newsletter.submit": "เข้าร่วมรายชื่อ",
      "newsletter.resultCta": "อ่านบทความ",
      "newsletter.quoteCta": "ขอราคา",
      "newsletter.contactCta": "ติดต่อ Maris",
      "quote.eyebrow": "ขอใบเสนอราคา",
      "quote.title": "ขอราคาและเช็กสถานะสินค้า",
      "quote.lead": "ส่งชิ้นงานที่คุณกำลังสนใจ หรือส่งรายการจากตะกร้าที่บันทึกไว้ แล้ว Maris Jewelry จะช่วยยืนยันทิศทางราคา สถานะสินค้า และขั้นตอนถัดไปที่เหมาะที่สุด",
      "quote.processTitle": "หลังจากนี้จะเกิดอะไรขึ้น",
      "quote.process1.title": "1. ตรวจสอบรายการที่เลือก",
      "quote.process1.text": "เราจะดูสินค้าที่คุณเลือก ระยะเวลาที่ต้องการ และประเมินว่าควรแนะนำแบบพร้อมสั่งหรือคุยต่อในงานสั่งทำ",
      "quote.process2.title": "2. ยืนยันทิศทางราคา",
      "quote.process2.text": "เราจะตอบกลับพร้อมช่วงราคา หมายเหตุเรื่องวัสดุหรืออัญมณี และรายละเอียดที่มีผลต่อใบเสนอราคาสุดท้าย",
      "quote.process3.title": "3. วางแผนขั้นตอนถัดไป",
      "quote.process3.text": "ขึ้นอยู่กับชิ้นงาน เราสามารถคุยต่อเรื่องไซซ์ การปรับดีไซน์ การนัดหมาย หรือการยืนยันออเดอร์ได้ทันที",
      "quote.formTitle": "บอกสิ่งที่คุณต้องการ",
      "quote.formLead": "ฝากรายละเอียดไว้ด้านล่าง เพื่อให้ Maris Jewelry ตอบกลับพร้อมแนวทางราคาและข้อมูลสถานะที่เหมาะกับคุณมากที่สุด",
      "quote.preferredContact": "ช่องทางที่สะดวก",
      "quote.budget": "ช่วงงบประมาณ",
      "quote.budgetPlaceholder": "เช่น 30,000 - 60,000 บาท",
      "quote.ringSize": "ไซซ์แหวน (ถ้าทราบ)",
      "quote.ringSizePlaceholder": "เช่น US 6 / EU 52",
      "quote.formNote": "หากคุณมีวันใช้งานหรือช่วงงบในใจอยู่แล้ว การใส่ข้อมูลตรงนี้จะช่วยให้ Maris Jewelry ตอบครั้งแรกได้มีประโยชน์มากขึ้น",
      "quote.submit": "ส่งคำขอใบเสนอราคา",
      "quote.resultCta": "ติดต่อ Maris โดยตรง",
      "quote.backToSelection": "กลับไปยังรายการที่เลือก",
      "quote.browse": "ชมแหวนหมั้น",
      "quote.emptyBody": "เริ่มจากหน้าสินค้าหรือตะกร้าสินค้า เพื่อส่งรายการที่เลือกเข้ามาในฟอร์มนี้",
      "social.instagram.eyebrow": "Maris Social",
      "social.instagram.title": "ติดตาม Maris บน Instagram",
      "social.instagram.lead": "Instagram คือที่ที่เหมาะที่สุดสำหรับดูสินค้าใหม่ ช่วงเวลา editorial แบบเงียบ ๆ และบรรยากาศของชิ้นงาน Maris เวลาอยู่ในสไตล์จริง",
      "social.instagram.card1.title": "สิ่งที่คุณจะเห็น",
      "social.instagram.card1.point1.title": "สินค้าใหม่",
      "social.instagram.card1.point1.text": "อัปเดตแหวน ของขวัญ และชิ้นงานที่น่าสนใจก่อนเข้าหน้าแคตตาล็อกเต็ม",
      "social.instagram.card1.point2.title": "งานสั่งทำ",
      "social.instagram.card1.point2.text": "ดูทิศทางภาพอ้างอิง การเลือกวัสดุ และมุมเบื้องหลังแบบสงบ ๆ ของงาน bespoke",
      "social.instagram.card2.title": "บัญชีทางการ",
      "social.instagram.card2.text": "เปิดโปรไฟล์จริงเพื่อดูโพสต์ล่าสุด รีล และไฮไลต์ที่ Maris Jewelry บันทึกไว้",
      "social.instagram.open": "เปิด Instagram",
      "social.instagram.contact": "ติดต่อ Maris",
      "social.facebook.eyebrow": "Maris Social",
      "social.facebook.title": "เชื่อมต่อกับ Maris บน Facebook",
      "social.facebook.lead": "Facebook เป็นอีกพื้นที่ที่ติดตามข่าว อัปเดต และบทสนทนาได้ง่าย หากคุณชอบรูปแบบโซเชียลที่คุ้นเคยมากกว่า",
      "social.facebook.card1.title": "ทำไมถึงน่าติดตาม",
      "social.facebook.card1.point1.title": "อัปเดตจากแบรนด์",
      "social.facebook.card1.point1.text": "ติดตามประกาศที่ใช้งานได้จริง บทความที่แชร์ และไฮไลต์ที่กลับมาอ่านซ้ำได้ง่าย",
      "social.facebook.card1.point2.title": "ทักคุยได้ตรงขึ้น",
      "social.facebook.card1.point2.text": "ใช้ Facebook เป็นอีกทางเบา ๆ ในการเริ่มต้นคุยกับ Maris ก่อนต่อไปยังอีเมลหรือคำขอใบเสนอราคา",
      "social.facebook.card2.title": "เพจทางการ",
      "social.facebook.card2.text": "เปิดปลายทาง Facebook จริงเพื่อติดตามโพสต์ล่าสุดและเชื่อมต่อกับ Maris Jewelry",
      "social.facebook.open": "เปิด Facebook",
      "social.facebook.contact": "ติดต่อ Maris",
      "form.name": "ชื่อ-นามสกุล",
      "form.email": "อีเมล",
      "form.phone": "เบอร์โทรศัพท์",
      "form.service": "สนใจ",
      "form.notes": "รายละเอียดเพิ่มเติม",
      "form.timeline": "ช่วงเวลา",
      "form.contact.email": "อีเมล",
      "form.contact.phone": "โทรศัพท์",
      "form.contact.line": "Line",
      "form.contact.whatsapp": "WhatsApp",
      "form.timeline.asap": "เร็วที่สุด",
      "form.timeline.twoWeeks": "ภายใน 2 สัปดาห์",
      "form.timeline.thisMonth": "ภายในเดือนนี้",
      "form.timeline.research": "กำลังหาข้อมูลอยู่",
      "form.service.custom": "งานออกแบบตามแบบ",
      "form.service.general": "สอบถามทั่วไป",
      "product.request": "ขอราคาชิ้นนี้",
      "bag.summaryTitle": "เริ่มคำขอใบเสนอราคาของคุณ",
      "bag.summaryNote": "ใช้รายการนี้เพื่อขอราคา เช็กสถานะสินค้า หรือเริ่มคุยงานสั่งทำก่อนยืนยันรายละเอียดออเดอร์จริง",
      "bag.primaryAction": "ไปยังหน้าขอใบเสนอราคา",
      "bag.contactAction": "ติดต่อ Maris โดยตรง",
      "account.quoteRequests": "คำขอใบเสนอราคา"
    }
  };

  const enToTh = {
    "Home": "หน้าหลัก",
    "Go to Home": "กลับหน้าหลัก",
    "Wedding set": "แหวนแต่งงาน",
    "Wedding Set": "แหวนแต่งงาน",
    "Engagement Ring": "แหวนหมั้น",
    "Engagement Rings": "แหวนหมั้น",
    "Engagement rings": "แหวนหมั้น",
    "Wedding Band": "แหวนแถว",
    "Wedding Bands": "แหวนแถว",
    "Wedding bands": "แหวนแถว",
    "Men's Wedding Band": "แหวนแต่งงานผู้ชาย",
    "Men's Wedding Bands": "แหวนแต่งงานผู้ชาย",
    "Men's Rings": "แหวนผู้ชาย",
    "Gifts": "ของขวัญ",
    "Gift": "ของขวัญ",
    "Our Expertise": "ความเชี่ยวชาญของเรา",
    "Our expertise": "ความเชี่ยวชาญของเรา",
    "OEM Jewelry Service": "บริการผลิต OEM",
    "Wholesale & Retail": "ขายส่งและขายปลีก",
    "About Us": "เกี่ยวกับเรา",
    "Contact Us": "ติดต่อเรา",
    "Articles": "บทความ",
    "Fine Jewelry • Bangkok": "เครื่องประดับเพชร • กรุงเทพฯ",
    "Crafted for the moment that becomes forever.": "สร้างขึ้นเพื่อช่วงเวลาที่จะอยู่ตลอดไป",
    "Crafted for the moments that become forever.": "สร้างขึ้นเพื่อช่วงเวลาสำคัญที่คุณจะจดจำตลอดไป",
    "Diamond pieces with quiet elegance, made for proposals, vows, and every private celebration.": "เครื่องประดับเพชรที่งดงามอย่างสงบ สำหรับคำขอแต่งงาน คำมั่นสัญญา และทุกช่วงเวลาสำคัญส่วนตัว",
    "Quiet diamond jewelry for proposals, vows, and moments that stay.": "เครื่องประดับเพชรสำหรับคำขอแต่งงาน วันแต่งงาน และช่วงเวลาที่มีความหมาย",
    "Quietly elegant diamond jewelry for proposals, vows, and the intimate milestones held closest to the heart.": "เครื่องประดับเพชรที่เรียบหรูอย่างพอดี สำหรับคำขอแต่งงาน วันแต่งงาน และทุกช่วงเวลาพิเศษที่มีความหมายกับคุณ",
    "Shop Engagement Rings": "เลือกชมแหวนหมั้น",
    "Explore Engagement Rings": "ชมแหวนหมั้น",
    "Find Your Ring": "ค้นหาแหวนของคุณ",
    "About Maris": "เกี่ยวกับ Maris",
    "Discover Maris": "รู้จัก Maris",
    "Shop by Category": "เลือกชมตามหมวดหมู่",
    "Necklaces & Pendants": "สร้อยคอและจี้",
    "Bracelets": "สร้อยข้อมือ",
    "Earrings": "ต่างหู",
    "Rings": "แหวน",
    "A first catalogue structure for necklaces and pendants, ready for real product photography and final descriptions later.": "โครงหน้าแคตตาล็อกแรกสำหรับสร้อยคอและจี้ พร้อมรอใส่ภาพสินค้าจริงและคำอธิบายสุดท้ายภายหลัง",
    "A wedding-set catalogue structure built for future collection growth, starting with The Infinite Hold and a multi-angle product detail view.": "โครงหน้าแคตตาล็อก wedding set ที่เตรียมไว้สำหรับขยายคอลเลกชันในอนาคต โดยเริ่มจาก The Infinite Hold พร้อมหน้าสินค้าที่ดูภาพได้หลายมุม",
    "A bracelet catalogue foundation with clean product cards, wishlist support, and product-detail links ready for the final collection.": "โครงหน้าแคตตาล็อกสร้อยข้อมือพร้อมการ์ดสินค้าสะอาดตา รองรับ wishlist และลิงก์เข้าหน้าสินค้า สำหรับคอลเลกชันจริงในอนาคต",
    "A polished earring category page with sample product cards, hover images, and direct product-page navigation.": "หน้าหมวดต่างหูที่จัดโครงไว้เรียบร้อย พร้อมการ์ดตัวอย่าง รูป hover และลิงก์เข้าหน้าสินค้าโดยตรง",
    "A clean ring category page for everyday rings, stackable designs, and future fine jewelry pieces beyond engagement collections.": "หน้าหมวดแหวนสำหรับแหวนใส่ประจำวัน งานใส่ซ้อน และไฟน์จิวเวลรี่ในอนาคตนอกเหนือจากแหวนหมั้น",
    "Contact": "ติดต่อเรา",
    "Information": "ข้อมูล",
    "Join Us": "ร่วมติดตาม",
    "Receive exclusive updates & offers": "รับข่าวสารและข้อเสนอพิเศษ",
    "Terms of Service": "เงื่อนไขการให้บริการ",
    "Shipping": "การจัดส่ง",
    "Returns": "การคืนสินค้า",
    "Privacy Policy": "นโยบายความเป็นส่วนตัว",
    "Mon - Fri, 08.30 - 18:00": "จันทร์ - ศุกร์, 08.30 - 18.00 น.",
    "Mon - fri, 08.30 : - 18:00": "จันทร์ - ศุกร์, 08.30 - 18.00 น.",
    "Your email": "อีเมลของคุณ",
    "Sort by": "เรียงตาม",
    "Featured": "แนะนำ",
    "Product Code A-Z": "รหัสสินค้า A-Z",
    "Carat: High to Low": "กะรัต: มากไปน้อย",
    "Carat: Low to High": "กะรัต: น้อยไปมาก",
    "Filter": "ตัวกรอง",
    "All Pieces": "สินค้าทั้งหมด",
    "White Gold": "ทองคำขาว",
    "Yellow Gold": "ทองคำเหลือง",
    "Rose Gold": "โรสโกลด์",
    "Bridal Set": "ชุดแหวนแต่งงาน",
    "Pear Shape": "ทรงหยดน้ำ",
    "Halo Setting": "ตัวเรือนฮาโล",
    "Solitaire": "เม็ดเดี่ยว",
    "Band": "แหวนแถว",
    "Pendants": "จี้",
    "Chains": "สร้อยโซ่",
    "Tennis": "เทนนิส",
    "Studs": "ต่างหูติดหู",
    "Drops": "ต่างหูระย้า",
    "Stackable": "ใส่ซ้อนได้",
    "Round Brilliant Cut": "เพชรทรงกลม Brilliant Cut",
    "Round Brilliant Cut (Halo)": "เพชรทรงกลม Brilliant Cut (Halo)",
    "Cushion Cut": "เพชรทรง Cushion",
    "Emerald Cut": "เพชรทรง Emerald",
    "Pear Cut": "เพชรทรงหยดน้ำ",
    "Oval Cut": "เพชรทรง Oval",
    "Marquise Cut": "เพชรทรง Marquise",
    "Diamond Eternity Band": "แหวนเพชร Eternity Band",
    "18K Gold": "ทอง 18K",
    "14K White Gold": "ทองคำขาว 14K",
    "18K White Gold": "ทองคำขาว 18K",
    "18K Yellow Gold": "ทองคำเหลือง 18K",
    "18K Rose Gold": "โรสโกลด์ 18K",
    "Price on request": "สอบถามราคา",
    "Add to Bag": "เพิ่มลงตะกร้า",
    "Added to Bag": "อยู่ในตะกร้าแล้ว",
    "Primary View": "มุมหลัก",
    "White Gold View": "มุม White Gold",
    "Top View": "มุมด้านบน",
    "Front View": "มุมด้านหน้า",
    "Side View": "มุมด้านข้าง",
    "Yellow Gold View": "มุม Yellow Gold",
    "Rose Gold View": "มุม Rose Gold",
    "Select a view to compare angle and metal tone.": "เลือกมุมภาพเพื่อเปรียบเทียบรูปทรงและโทนสีของตัวเรือน",
    "Buy Now": "ซื้อทันที",
    "Also You May Like": "สินค้าแนะนำเพิ่มเติม",
    "Selected Pieces": "รายการที่เลือก",
    "Shopping Bag": "ตะกร้าสินค้า",
    "Review the pieces you are considering. Final pricing and availability will be confirmed by the Maris team.": "ตรวจสอบสินค้าที่คุณสนใจ ราคาและสถานะสินค้าจะได้รับการยืนยันโดยทีม Maris",
    "Your Bag Is Empty": "ตะกร้าของคุณยังว่าง",
    "No pieces selected yet.": "ยังไม่มีสินค้าที่เลือก",
    "Choose a catalogue piece and press Add to Bag. The item will appear here for review.": "เลือกสินค้าจากแคตตาล็อกแล้วกดเพิ่มลงตะกร้า สินค้าจะมาแสดงที่นี่ให้ตรวจสอบ",
    "Browse Engagement Rings": "เลือกชมแหวนหมั้น",
    "Summary": "สรุป",
    "Request a Quote": "ขอใบเสนอราคา",
    "Total Pieces": "จำนวนทั้งหมด",
    "Pricing": "ราคา",
    "On request": "สอบถามราคา",
    "Diamond and jewelry pricing can change by stone, size, metal, and availability. This prototype bag prepares a selection list before real checkout is added.": "ราคาเพชรและเครื่องประดับอาจเปลี่ยนตามเม็ดเพชร ขนาด วัสดุ และสถานะสินค้า ตะกร้าต้นแบบนี้ใช้เพื่อเตรียมรายการก่อนเพิ่มระบบชำระเงินจริง",
    "Continue Shopping": "เลือกชมต่อ",
    "Clear Bag": "ล้างตะกร้า",
    "View Collection": "ดูคอลเลกชัน",
    "Remove": "ลบ",
    "Wishlist": "รายการโปรด",
    "Saved Pieces": "สินค้าที่บันทึกไว้",
    "Keep the pieces you love in one quiet place. Tap the heart on any catalogue item, then come back here to review it.": "เก็บชิ้นที่คุณชอบไว้ในที่เดียว กดหัวใจบนสินค้าในแคตตาล็อก แล้วกลับมาดูที่นี่ได้เสมอ",
    "Nothing Saved Yet": "ยังไม่มีรายการที่บันทึก",
    "Your wishlist is waiting.": "Wishlist ของคุณพร้อมรออยู่",
    "Start from the catalogue and press the heart beside any piece you want to keep for later.": "เริ่มจากแคตตาล็อกแล้วกดหัวใจข้างสินค้าที่อยากเก็บไว้ดูภายหลัง",
    "Account": "บัญชี",
    "Client Access": "พื้นที่ลูกค้า",
    "A quiet place for saved details, wishlist pieces, and future private appointments.": "พื้นที่สำหรับเก็บข้อมูล รายการโปรด และการนัดหมายส่วนตัวในอนาคต",
    "Sign In": "เข้าสู่ระบบ",
    "Create Account": "สร้างบัญชี",
    "Welcome back": "ยินดีต้อนรับกลับ",
    "Prototype login for this browser. Your password is only checked as a filled field and is not saved.": "ระบบเข้าสู่ระบบต้นแบบสำหรับเบราว์เซอร์นี้ รหัสผ่านจะถูกตรวจว่าใส่ครบเท่านั้นและจะไม่ถูกบันทึก",
    "Email": "อีเมล",
    "Password": "รหัสผ่าน",
    "Create your Maris account": "สร้างบัญชี Maris ของคุณ",
    "This creates a local prototype account only. For the real site, this will need secure backend authentication.": "นี่เป็นบัญชีต้นแบบในเครื่องเท่านั้น สำหรับเว็บจริงจำเป็นต้องมีระบบยืนยันตัวตนที่ปลอดภัย",
    "Full name": "ชื่อ-นามสกุล",
    "Phone": "เบอร์โทรศัพท์",
    "My Maris": "My Maris",
    "Welcome": "ยินดีต้อนรับ",
    "Sign Out": "ออกจากระบบ",
    "Wishlist Pieces": "รายการโปรด",
    "Catalogue Items": "สินค้าในแคตตาล็อก",
    "Profile details": "ข้อมูลโปรไฟล์",
    "Interested in": "สนใจ",
    "Private Consultation": "ปรึกษาส่วนตัว",
    "Save Details": "บันทึกข้อมูล",
    "Please add your name, email, and a password with at least 6 characters.": "กรุณากรอกชื่อ อีเมล และรหัสผ่านอย่างน้อย 6 ตัวอักษร",
    "This browser blocked local saving. Please check privacy settings and try again.": "เบราว์เซอร์นี้ปิดกั้นการบันทึกข้อมูลในเครื่อง กรุณาตรวจสอบการตั้งค่าความเป็นส่วนตัวแล้วลองอีกครั้ง",
    "Account created. Password was not stored in this prototype.": "สร้างบัญชีแล้ว รหัสผ่านไม่ได้ถูกบันทึกในต้นแบบนี้",
    "Please enter your email and password.": "กรุณากรอกอีเมลและรหัสผ่าน",
    "No local account found for this email yet. Please create an account first.": "ยังไม่พบบัญชีในเครื่องสำหรับอีเมลนี้ กรุณาสร้างบัญชีก่อน",
    "Signed in. This is a local prototype session.": "เข้าสู่ระบบแล้ว นี่เป็น session ต้นแบบในเครื่อง",
    "Name and email are required.": "จำเป็นต้องกรอกชื่อและอีเมล",
    "Could not save details in this browser.": "ไม่สามารถบันทึกข้อมูลในเบราว์เซอร์นี้ได้",
    "Profile details saved.": "บันทึกข้อมูลโปรไฟล์แล้ว",
    "Signed out from this browser.": "ออกจากระบบจากเบราว์เซอร์นี้แล้ว",
    "Go to homepage": "กลับหน้าหลัก",
    "Product": "สินค้า",
    "Product | Maris Jewelry": "สินค้า | Maris Jewelry",
    "Maris Jewelry product": "สินค้า Maris Jewelry",
    "Maris Jewelry product large preview": "ตัวอย่างสินค้า Maris Jewelry ขนาดใหญ่",
    "Open product image": "เปิดรูปสินค้า",
    "Close image preview": "ปิดรูปตัวอย่าง",
    "Click to view": "กดเพื่อดูภาพ",
    "Back Office Prototype": "ต้นแบบระบบหลังบ้าน",
    "Maris Admin": "Maris Admin",
    "View Storefront": "ดูหน้าร้าน",
    "Log Out": "ออกจากระบบ",
    "Admin navigation": "เมนูหลังบ้าน",
    "Dashboard": "แดชบอร์ด",
    "Products": "สินค้า",
    "Inventory": "สต๊อก",
    "Orders": "ออเดอร์",
    "Customers": "ลูกค้า",
    "Settings": "ตั้งค่า",
    "Stock-safe foundation": "โครงสร้างสต๊อกที่ปลอดภัย",
    "Prototype only. Data is saved in this browser with localStorage, not in a real server database.": "เป็นระบบต้นแบบเท่านั้น ข้อมูลถูกบันทึกในเบราว์เซอร์นี้ด้วย localStorage ไม่ใช่ฐานข้อมูลเซิร์ฟเวอร์จริง",
    "Total Products": "จำนวนสินค้า",
    "Real Stock": "สต๊อกจริง",
    "Reserved Stock": "สต๊อกที่จองไว้",
    "Low Stock Alerts": "แจ้งเตือนใกล้หมด",
    "Stock Rule": "กฎของสต๊อก",
    "Available Stock = Real Stock - Reserved Stock": "สต๊อกที่ขายได้ = สต๊อกจริง - สต๊อกที่จองไว้",
    "Orders reserve stock first. Real stock is reduced only after payment is marked as paid.": "ออเดอร์จะจองสต๊อกก่อน สต๊อกจริงจะถูกตัดเมื่อทำเครื่องหมายว่าชำระเงินแล้วเท่านั้น",
    "Catalogue management": "จัดการแคตตาล็อก",
    "Reset Demo Data": "รีเซ็ตข้อมูลตัวอย่าง",
    "SKU": "รหัส SKU",
    "Product Name": "ชื่อสินค้า",
    "Category": "หมวดหมู่",
    "Price": "ราคา",
    "Real Stock": "สต๊อกจริง",
    "Reserved": "จองไว้",
    "Status": "สถานะ",
    "Ready": "พร้อมขาย",
    "Sold Out": "หมด",
    "Preorder": "พรีออเดอร์",
    "Hidden": "ซ่อน",
    "Add Product": "เพิ่มสินค้า",
    "Name": "ชื่อ",
    "Real": "จริง",
    "Available": "ขายได้",
    "Stock movements": "ความเคลื่อนไหวสต๊อก",
    "Every stock change is logged so you can trace what happened later.": "ทุกการเปลี่ยนสต๊อกจะถูกบันทึกไว้ เพื่อย้อนดูได้ว่ามีอะไรเกิดขึ้น",
    "Product": "สินค้า",
    "Movement Type": "ประเภทการเคลื่อนไหว",
    "Receive Stock (+ real)": "รับสินค้าเข้า (+ สต๊อกจริง)",
    "Reserve Order (+ reserved)": "จองออเดอร์ (+ จองไว้)",
    "Release Reservation (- reserved)": "ปล่อยจอง (- จองไว้)",
    "Paid Sale (- real, - reserved)": "ขายสำเร็จ (- จริง, - จองไว้)",
    "Damaged Item (- real)": "สินค้าเสีย (- จริง)",
    "Customer Return (+ real)": "ลูกค้าคืนสินค้า (+ จริง)",
    "Quantity": "จำนวน",
    "Note": "หมายเหตุ",
    "Save Movement": "บันทึกสต๊อก",
    "Time": "เวลา",
    "Type": "ประเภท",
    "Qty": "จำนวน",
    "No stock movement yet.": "ยังไม่มีประวัติสต๊อก",
    "Order workflow": "ขั้นตอนออเดอร์",
    "Create a test order to reserve stock, then mark it paid or cancel it.": "สร้างออเดอร์ทดสอบเพื่อจองสต๊อก จากนั้นทำเครื่องหมายว่าจ่ายแล้วหรือยกเลิกได้",
    "Customer Name": "ชื่อลูกค้า",
    "Create Reserved Order": "สร้างออเดอร์จอง",
    "Order": "ออเดอร์",
    "Customer": "ลูกค้า",
    "Order Status": "สถานะออเดอร์",
    "Payment": "การชำระเงิน",
    "Action": "การทำงาน",
    "Mark Paid": "จ่ายแล้ว",
    "Cancel": "ยกเลิก",
    "No orders yet.": "ยังไม่มีออเดอร์",
    "Client records": "ข้อมูลลูกค้า",
    "This section is ready for real account and checkout data later.": "ส่วนนี้เตรียมไว้สำหรับข้อมูลบัญชีและ checkout จริงในภายหลัง",
    "Customer CRM will connect after real checkout.": "ระบบ CRM ลูกค้าจะเชื่อมต่อหลังมี checkout จริง",
    "For production, this should store name, phone, email, address, order history, VIP tags, and total spend in a secure database.": "สำหรับระบบจริง ควรเก็บชื่อ เบอร์โทร อีเมล ที่อยู่ ประวัติออเดอร์ แท็กลูกค้า VIP และยอดซื้อรวมในฐานข้อมูลที่ปลอดภัย",
    "Admin settings": "ตั้งค่าหลังบ้าน",
    "Low Stock Threshold": "เกณฑ์สินค้าใกล้หมด",
    "Save Settings": "บันทึกการตั้งค่า",
    "Current Boundary": "ขอบเขตปัจจุบัน",
    "Catalogue, image uploads, inventory, and order records use protected Supabase APIs. Public checkout, payment capture, and role-based permissions are not live yet.": "แคตตาล็อก การอัปโหลดรูป สต๊อก และออเดอร์ใช้ API Supabase ที่ป้องกันแล้ว ส่วน checkout สาธารณะ การรับชำระเงินจริง และสิทธิ์ตามบทบาทยังไม่เปิดใช้งาน",
    "Please choose a product and valid quantity.": "กรุณาเลือกสินค้าและจำนวนที่ถูกต้อง",
    "Not enough available stock to reserve.": "สต๊อกที่ขายได้ไม่พอสำหรับการจอง",
    "Reserved stock is lower than this quantity.": "จำนวนที่จองไว้ต่ำกว่าจำนวนนี้",
    "Paid sale needs enough real and reserved stock.": "การขายสำเร็จต้องมีทั้งสต๊อกจริงและสต๊อกที่จองไว้เพียงพอ",
    "Real stock is lower than this quantity.": "สต๊อกจริงต่ำกว่าจำนวนนี้",
    "Inventory movement saved.": "บันทึกความเคลื่อนไหวสต๊อกแล้ว",
    "SKU and product name are required.": "จำเป็นต้องกรอก SKU และชื่อสินค้า",
    "This SKU already exists.": "SKU นี้มีอยู่แล้ว",
    "Reserved stock cannot be more than real stock.": "จำนวนที่จองไว้ต้องไม่มากกว่าสต๊อกจริง",
    "Product added.": "เพิ่มสินค้าแล้ว",
    "Reserved order created.": "สร้างออเดอร์จองแล้ว",
    "Order marked as paid. Real stock was reduced.": "ทำเครื่องหมายว่าจ่ายแล้ว และตัดสต๊อกจริงแล้ว",
    "Order cancelled. Reserved stock was released.": "ยกเลิกออเดอร์แล้ว และคืนสต๊อกที่จองไว้แล้ว",
    "Settings saved.": "บันทึกการตั้งค่าแล้ว",
    "Demo admin data reset.": "รีเซ็ตข้อมูลตัวอย่างหลังบ้านแล้ว",
    "Final price, diamond availability, ring size, and delivery timing will be confirmed by Maris Jewelry before checkout.": "ราคาสุดท้าย สถานะเพชร ไซซ์แหวน และกำหนดส่งจะได้รับการยืนยันโดย Maris Jewelry ก่อนชำระเงินจริง",
    "Request Quote": "ขอใบเสนอราคา",
    "Join newsletter": "สมัครรับข่าวสาร",
    "Shopping bag": "ตะกร้าสินค้า",
    "Bag summary": "สรุปตะกร้า",
    "Saved wishlist items": "รายการโปรดที่บันทึกไว้",
    "Account system": "ระบบบัญชี",
    "Account forms": "แบบฟอร์มบัญชี",
    "Qty": "จำนวน",
    "Wishlist item": "สินค้าในรายการโปรด",
    "Shopping bag item": "สินค้าในตะกร้า",
    "Maris Piece": "ชิ้นงาน Maris",
    "0.50 ct. | D Color | VS1": "0.50 กะรัต | สี D | VS1",
    "0.70 ct. | D Color | VS1": "0.70 กะรัต | สี D | VS1",
    "1.00 ct. | E Color | VS2": "1.00 กะรัต | สี E | VS2",
    "1.20 ct. | E Color | VS2": "1.20 กะรัต | สี E | VS2",
    "0.80 ct. | D Color | VS1": "0.80 กะรัต | สี D | VS1",
    "0.90 ct. | D Color | VS1": "0.90 กะรัต | สี D | VS1",
    "1.00 ct. (Total) | E Color | VS2": "1.00 กะรัต (รวม) | สี E | VS2",
    "0.30 ct. | D Color | VS1": "0.30 กะรัต | สี D | VS1",
    "A clean round brilliant design with a refined white gold setting, created as a timeless piece for a proposal or private appointment.": "แหวนเพชรทรงกลมดีไซน์สะอาดตา บนตัวเรือนทองคำขาวที่เรียบหรู เหมาะสำหรับคำขอแต่งงานหรือการนัดหมายส่วนตัว",
    "A halo-style ring that frames the center stone with a brighter, more dimensional silhouette.": "แหวนสไตล์ฮาโลที่ล้อมเพชรเม็ดกลางให้ดูสว่างและมีมิติมากขึ้น",
    "A soft cushion-cut profile with elegant proportions and a calm, classic presence.": "เพชรทรงคุชชั่นที่นุ่มนวล ได้สัดส่วนหรูหรา และให้ความรู้สึกคลาสสิกอย่างสงบ",
    "An emerald-cut design with crisp geometry and a polished, architectural feel.": "ดีไซน์เพชรทรงเอเมอรัลด์ที่มีเส้นสายคมชัด ให้ความรู้สึกเนี้ยบและมีโครงสร้างแบบงานสถาปัตย์",
    "A pear-cut ring with a graceful drop silhouette, balancing softness with a striking point of focus.": "แหวนเพชรทรงหยดน้ำที่มีซิลูเอตอ่อนช้อย ผสมความนุ่มนวลกับจุดเด่นที่สะดุดตา",
    "An oval-cut piece with elongated proportions designed to feel delicate and bright on hand.": "เพชรทรงโอวัลที่มีสัดส่วนเรียวยาว ออกแบบให้ดูละมุนและสว่างเมื่อสวมใส่",
    "A marquise-cut design with a dramatic tapered shape and a refined white gold finish.": "ดีไซน์เพชรทรงมาคีส์ที่เรียวยาวโดดเด่น พร้อมตัวเรือนทองคำขาวที่ขัดเกลาอย่างเรียบหรู",
    "A full diamond band designed for stacking, wedding styling, or a clean standalone shine.": "แหวนเพชรรอบวงสำหรับใส่ซ้อน จัดลุคแต่งงาน หรือใส่เดี่ยวให้เปล่งประกายอย่างเรียบสะอาด",
    "A warm yellow gold round brilliant design with a quiet, classic character.": "แหวนเพชรทรงกลมบนทองคำเหลืองโทนอุ่น ให้บุคลิกคลาสสิกอย่างนุ่มนวล",
    "A yellow gold halo setting with extra brightness around the center stone.": "ตัวเรือนฮาโลทองคำเหลืองที่ช่วยเพิ่มประกายรอบเพชรเม็ดกลาง",
    "A rose gold round brilliant ring with a soft, romantic tone.": "แหวนเพชรทรงกลมบนโรสโกลด์ ให้โทนอ่อนหวานและโรแมนติก",
    "A delicate rose gold ring with a smaller round brilliant center, suited for subtle everyday elegance.": "แหวนโรสโกลด์ขนาดละมุนพร้อมเพชรทรงกลมเม็ดกลาง เหมาะกับความหรูหราแบบเบา ๆ ในทุกวัน",
    "The Infinite Hold Collection": "The Infinite Hold Collection",
    "Pear Shaped Diamond Wedding Set": "ชุดแหวนแต่งงานเพชรทรงหยดน้ำ",
    "Available in White, Yellow, and Rose Gold": "มีให้เลือกทั้ง White Gold, Yellow Gold และ Rose Gold",
    "SKU SR 0033 from the Infinite Hold collection. Type WS (Wedding set / แหวนแต่งงาน) with a center stone of Rd 1.00 ct., Malee rd 42 pcs / 0.61 ct, and 14K White Gold weight 3.47 g.": "SKU SR 0033 จากคอลเลกชัน Infinite Hold ประเภท WS (Wedding set / แหวนแต่งงาน) ใช้เพชรเม็ดกลาง Rd 1.00 ct., Malee rd 42 pcs / 0.61 ct และน้ำหนักทองคำขาว 14K 3.47 g.",
    "Diamond Drop Pendant": "จี้เพชรทรงหยดน้ำ",
    "Solitaire Diamond Pendant": "จี้เพชรเม็ดเดี่ยว",
    "Pave Bar Pendant": "จี้เพชรบาร์ Pavé",
    "Maris Signature Pendant": "จี้ซิกเนเจอร์ Maris",
    "Diamond Tennis Bracelet": "สร้อยข้อมือเพชร Tennis",
    "Petite Diamond Bracelet": "สร้อยข้อมือเพชร Petite",
    "Bezel Chain Bracelet": "สร้อยข้อมือโซ่ Bezel",
    "Maris Charm Bracelet": "สร้อยข้อมือชาร์ม Maris",
    "Diamond Stud Earrings": "ต่างหูเพชรติดหู",
    "Pear Diamond Drops": "ต่างหูเพชรทรงหยดน้ำ",
    "Halo Diamond Earrings": "ต่างหูเพชร Halo",
    "Maris Pearl Earrings": "ต่างหูมุก Maris",
    "Solitaire Diamond Ring": "แหวนเพชรเม็ดเดี่ยว",
    "Stackable Diamond Ring": "แหวนเพชรใส่ซ้อน",
    "Bezel Diamond Ring": "แหวนเพชร Bezel",
    "Maris Signet Ring": "แหวน Signet Maris",
    "Diamond pendant": "จี้เพชร",
    "Adjustable chain": "สร้อยปรับระดับได้",
    "Diamond line detail": "รายละเอียดเพชรเรียงเส้น",
    "Soft rose tone": "โทนโรสโกลด์นุ่มนวล",
    "Diamond bracelet": "สร้อยข้อมือเพชร",
    "Adjustable bracelet": "สร้อยข้อมือปรับระดับได้",
    "Bezel diamond detail": "รายละเอียดเพชร Bezel",
    "Signature charm": "ชาร์มซิกเนเจอร์",
    "Pair of earrings": "ต่างหูหนึ่งคู่",
    "Drop earrings": "ต่างหูระย้า",
    "Halo setting": "ตัวเรือน Halo",
    "Pearl accent": "รายละเอียดมุก",
    "Solitaire setting": "ตัวเรือนเม็ดเดี่ยว",
    "Stackable band": "แหวนใส่ซ้อนได้",
    "Bezel setting": "ตัวเรือน Bezel",
    "Signature profile": "รูปทรงซิกเนเจอร์",
    "A refined diamond drop pendant designed to sit lightly on the neckline with a quiet, polished sparkle.": "จี้เพชรทรงหยดน้ำที่ออกแบบให้วางบนลำคออย่างเบาและให้ประกายขัดเงาแบบสงบหรู",
    "A warm solitaire pendant with a clean setting, made for everyday wear and private gifting moments.": "จี้เพชรเม็ดเดี่ยวโทนอุ่นในตัวเรือนสะอาดตา เหมาะกับการใส่ทุกวันและเป็นของขวัญส่วนตัว",
    "A slim pave bar pendant with a bright linear finish, designed for layering or a minimal standalone look.": "จี้บาร์ Pavé ทรงเรียวพร้อมประกายแบบเส้นตรง ออกแบบให้ใส่ซ้อนหรือใส่เดี่ยวแบบมินิมอลได้",
    "A soft rose gold pendant concept with gentle proportions, ready to become a signature Maris piece.": "คอนเซปต์จี้โรสโกลด์โทนนุ่มในสัดส่วนละมุน พร้อมต่อยอดเป็นชิ้นซิกเนเจอร์ของ Maris",
    "A clean tennis bracelet concept with continuous diamond brightness and a refined everyday profile.": "คอนเซปต์สร้อยข้อมือ Tennis ที่สะอาดตา พร้อมประกายเพชรต่อเนื่องและรูปทรงที่ใส่ได้ทุกวัน",
    "A petite yellow gold bracelet with a delicate diamond accent, suited for subtle daily shine.": "สร้อยข้อมือทองคำเหลืองขนาดละมุนพร้อมเพชรประดับบางเบา เหมาะกับประกายในชีวิตประจำวัน",
    "A bezel-set chain bracelet with a neat, modern silhouette and a calm diamond focus.": "สร้อยข้อมือโซ่ฝังเพชรแบบ Bezel ในซิลูเอตเนี้ยบโมเดิร์นและมีจุดเด่นที่เพชรอย่างสงบ",
    "A rose gold charm bracelet concept with a soft branded detail, designed for personal styling.": "คอนเซปต์สร้อยข้อมือชาร์มโรสโกลด์พร้อมรายละเอียดแบรนด์ที่นุ่มนวล ออกแบบเพื่อการจัดสไตล์ส่วนตัว",
    "A pair of classic diamond studs with a clean white gold setting and timeless everyday balance.": "ต่างหูเพชรติดหูคลาสสิกในตัวเรือนทองคำขาวสะอาดตา ให้สมดุลที่ใส่ได้ทุกวันอย่างไม่ตกยุค",
    "A pear-inspired drop earring concept with warm gold tone and a graceful hanging profile.": "คอนเซปต์ต่างหูระย้าที่ได้แรงบันดาลใจจากทรงหยดน้ำในโทนทองอุ่นและรูปทรงห้อยที่อ่อนช้อย",
    "A halo earring concept that frames each center stone with extra brightness and soft dimension.": "คอนเซปต์ต่างหู Halo ที่ล้อมเพชรเม็ดกลางแต่ละข้างให้สว่างขึ้นและมีมิติอย่างนุ่มนวล",
    "A rose gold pearl earring concept with a romantic softness and a modern Maris finish.": "คอนเซปต์ต่างหูมุกโรสโกลด์ที่มีความอ่อนหวานโรแมนติก พร้อมงานจบแบบ Maris ที่ร่วมสมัย",
    "A simple solitaire ring concept with clear proportions and a quiet diamond presence.": "คอนเซปต์แหวนเพชรเม็ดเดี่ยวที่เรียบง่าย สัดส่วนชัดเจน และมีตัวตนของเพชรแบบสงบ",
    "A yellow gold diamond ring designed for stacking, layering, or a soft standalone glow.": "แหวนเพชรทองคำเหลืองที่ออกแบบให้ใส่ซ้อน เลเยอร์ หรือใส่เดี่ยวให้ประกายนุ่มได้",
    "A modern bezel ring concept with a smooth outline and a secure diamond-focused setting.": "คอนเซปต์แหวน Bezel โมเดิร์นพร้อมเส้นขอบลื่นตาและตัวเรือนที่เน้นเพชรอย่างมั่นคง",
    "A rose gold signet-inspired ring concept with a polished surface and a distinctive Maris mood.": "คอนเซปต์แหวนสไตล์ Signet โรสโกลด์พร้อมผิวขัดเงาและอารมณ์ Maris ที่ชัดเจน",
    "This page is set up as a clean placeholder for your brand story, craftsmanship details, showroom information, or founder message.": "หน้านี้เตรียมไว้เป็นโครงสะอาดสำหรับเรื่องราวแบรนด์ รายละเอียดงานฝีมือ ข้อมูลโชว์รูม หรือข้อความจากผู้ก่อตั้ง",
    "Temporary placeholder page. Easy to expand into a full editorial brand page later.": "หน้าต้นแบบชั่วคราว สามารถต่อยอดเป็นหน้าเล่าแบรนด์แบบเต็มได้ภายหลัง",
    "This placeholder is ready for the real Instagram link or a styled social landing section when you decide how you want the brand to connect out.": "หน้านี้เตรียมไว้สำหรับลิงก์ Instagram จริง หรือหน้า social landing ที่ออกแบบให้เข้ากับแบรนด์เมื่อกำหนดรูปแบบแล้ว",
    "This page is in place for your future Facebook destination, whether that becomes a direct external link or a small branded social hub.": "หน้านี้เตรียมไว้สำหรับปลายทาง Facebook ในอนาคต จะใช้เป็นลิงก์ภายนอกโดยตรงหรือเป็น social hub ขนาดเล็กของแบรนด์ก็ได้",
    "The newsletter button now goes to a real page, ready for mailing list sign-up, exclusive offers, or campaign capture later.": "ปุ่มจดหมายข่าวเชื่อมมาที่หน้าจริงแล้ว พร้อมต่อยอดเป็นแบบสมัครข่าวสาร ข้อเสนอพิเศษ หรือหน้าเก็บข้อมูลแคมเปญในภายหลัง",
    "Temporary placeholder page for social destination handling.": "หน้าต้นแบบชั่วคราวสำหรับจัดการปลายทางโซเชียล",
    "Temporary placeholder page for newsletter and CRM sign-up flow.": "หน้าต้นแบบชั่วคราวสำหรับจดหมายข่าวและระบบสมัคร CRM",
    "Maris Jewelry respects your privacy. This page explains what information we may collect and how we use it when you interact with our website or contact us.": "Maris Jewelry เคารพความเป็นส่วนตัวของคุณ หน้านี้อธิบายข้อมูลที่เราอาจเก็บและวิธีใช้งานเมื่อคุณใช้งานเว็บไซต์หรือติดต่อเรา",
    "Information We Collect": "ข้อมูลที่เราเก็บ",
    "We may collect information you choose to provide, such as your name, phone number, email address, delivery details, product preferences, and messages submitted through our website or contact channels.": "เราอาจเก็บข้อมูลที่คุณเลือกให้ไว้ เช่น ชื่อ เบอร์โทร อีเมล รายละเอียดการจัดส่ง ความสนใจสินค้า และข้อความที่ส่งผ่านเว็บไซต์หรือช่องทางติดต่อของเรา",
    "How We Use Information": "วิธีที่เราใช้ข้อมูล",
    "Your information may be used to respond to inquiries, process orders, arrange delivery, provide customer support, share updates, and improve our products and services.": "ข้อมูลของคุณอาจถูกใช้เพื่อตอบคำถาม ดำเนินการคำสั่งซื้อ จัดส่งสินค้า ให้บริการลูกค้า ส่งข่าวสาร และปรับปรุงสินค้าและบริการของเรา",
    "Sharing Information": "การแบ่งปันข้อมูล",
    "We do not sell personal information. We may share necessary details with trusted service providers, such as couriers or payment-related partners, only when needed to complete a service.": "เราไม่ขายข้อมูลส่วนบุคคล แต่อาจแบ่งปันข้อมูลที่จำเป็นกับผู้ให้บริการที่เชื่อถือได้ เช่น บริษัทขนส่งหรือพันธมิตรด้านการชำระเงิน เฉพาะเมื่อจำเป็นต่อการให้บริการ",
    "Contact & Updates": "การติดต่อและการอัปเดต",
    "If you would like to update your information, ask a privacy question, or request that we remove your contact details from our records, please contact us directly.": "หากต้องการอัปเดตข้อมูล สอบถามเรื่องความเป็นส่วนตัว หรือขอให้ลบข้อมูลติดต่อออกจากบันทึกของเรา กรุณาติดต่อเราโดยตรง",
    "This privacy policy is draft content for the project prototype and should be reviewed before public launch.": "นโยบายความเป็นส่วนตัวนี้เป็นเนื้อหาร่างสำหรับโครงโปรเจกต์ และควรตรวจสอบอีกครั้งก่อนเปิดใช้งานจริง",
    "Welcome to Maris Jewelry. By browsing our website, contacting us, or placing an order, you agree to the terms below.": "ยินดีต้อนรับสู่ Maris Jewelry เมื่อคุณใช้งานเว็บไซต์ ติดต่อเรา หรือสั่งซื้อสินค้า ถือว่าคุณยอมรับเงื่อนไขด้านล่างนี้",
    "Product Information": "ข้อมูลสินค้า",
    "We do our best to present every piece accurately, including design, metal, stone details, and product imagery. Some details may vary slightly due to lighting, screen settings, handmade production, or natural stone characteristics.": "เราพยายามนำเสนอสินค้าแต่ละชิ้นให้ถูกต้องที่สุด ทั้งดีไซน์ วัสดุ รายละเอียดอัญมณี และภาพสินค้า รายละเอียดบางอย่างอาจแตกต่างเล็กน้อยจากแสง การตั้งค่าหน้าจอ งานผลิตด้วยมือ หรือคุณลักษณะธรรมชาติของอัญมณี",
    "Orders & Custom Pieces": "คำสั่งซื้อและงานสั่งทำ",
    "Custom and made-to-order jewelry may require confirmation of design, sizing, materials, and production timeline before work begins. Once a custom order has started, changes may affect the final price and delivery schedule.": "เครื่องประดับสั่งทำอาจต้องยืนยันดีไซน์ ขนาด วัสดุ และระยะเวลาผลิตก่อนเริ่มงาน เมื่อเริ่มคำสั่งซื้อแบบสั่งทำแล้ว การเปลี่ยนแปลงอาจมีผลต่อราคาสุดท้ายและกำหนดส่ง",
    "Pricing & Payment": "ราคาและการชำระเงิน",
    "Prices may change depending on material costs, diamond or gemstone specifications, exchange rates, and custom requirements. Final pricing will be confirmed before payment or production.": "ราคาอาจเปลี่ยนตามต้นทุนวัสดุ รายละเอียดเพชรหรืออัญมณี อัตราแลกเปลี่ยน และความต้องการเฉพาะ ราคาสุดท้ายจะได้รับการยืนยันก่อนชำระเงินหรือเริ่มผลิต",
    "Care & Responsibility": "การดูแลและความรับผิดชอบ",
    "Fine jewelry should be worn and stored with care. We recommend removing jewelry before exercise, swimming, heavy work, or exposure to chemicals. Maris Jewelry is not responsible for damage caused by misuse or improper care.": "เครื่องประดับไฟน์จิวเวลรี่ควรสวมใส่และเก็บรักษาด้วยความระมัดระวัง เราแนะนำให้ถอดเครื่องประดับก่อนออกกำลังกาย ว่ายน้ำ ทำงานหนัก หรือสัมผัสสารเคมี Maris Jewelry ไม่รับผิดชอบความเสียหายจากการใช้งานผิดวิธีหรือดูแลไม่เหมาะสม",
    "This page is a draft for project structure and should be reviewed before the website is used commercially.": "หน้านี้เป็นเนื้อหาร่างสำหรับโครงสร้างโปรเจกต์ และควรตรวจสอบก่อนนำเว็บไซต์ไปใช้งานเชิงพาณิชย์",
    "We carefully prepare each order before delivery to help ensure your jewelry arrives safely and beautifully packaged.": "เราเตรียมคำสั่งซื้อแต่ละรายการอย่างพิถีพิถันก่อนจัดส่ง เพื่อให้เครื่องประดับถึงมือคุณอย่างปลอดภัยและอยู่ในบรรจุภัณฑ์ที่สวยงาม",
    "Processing Time": "ระยะเวลาดำเนินการ",
    "Ready-to-ship pieces are prepared after order confirmation. Made-to-order or custom jewelry may require additional production time depending on design complexity, material availability, and sizing requirements.": "สินค้าพร้อมส่งจะถูกเตรียมหลังยืนยันคำสั่งซื้อ ส่วนงานสั่งทำหรือแบบเฉพาะอาจต้องใช้เวลาผลิตเพิ่มเติมตามความซับซ้อนของดีไซน์ วัสดุ และขนาดที่ต้องการ",
    "Domestic Delivery": "การจัดส่งภายในประเทศ",
    "Shipping within Thailand can be arranged after payment confirmation. Delivery timing may vary by destination, courier schedule, and public holidays.": "การจัดส่งภายในประเทศไทยสามารถดำเนินการหลังยืนยันการชำระเงิน ระยะเวลาจัดส่งอาจแตกต่างตามปลายทาง ตารางขนส่ง และวันหยุดราชการ",
    "International Delivery": "การจัดส่งต่างประเทศ",
    "International shipping may be available upon request. Import duties, taxes, customs fees, and local delivery charges are the responsibility of the recipient unless otherwise agreed in writing.": "การจัดส่งต่างประเทศอาจให้บริการได้ตามคำขอ ภาษีนำเข้า ภาษี ค่าธรรมเนียมศุลกากร และค่าจัดส่งภายในประเทศปลายทางเป็นความรับผิดชอบของผู้รับ เว้นแต่ตกลงเป็นลายลักษณ์อักษรไว้เป็นอย่างอื่น",
    "Tracking & Address Details": "เลขติดตามและรายละเอียดที่อยู่",
    "Please provide complete and accurate contact information before shipment. Once an order has been dispatched, tracking details will be shared when available.": "กรุณาให้ข้อมูลติดต่อที่ครบถ้วนและถูกต้องก่อนจัดส่ง เมื่อคำสั่งซื้อถูกส่งออกแล้ว เราจะแจ้งเลขติดตามเมื่อมีข้อมูลพร้อม",
    "Shipping details are currently draft content and can be adjusted once final delivery partners and policies are confirmed.": "รายละเอียดการจัดส่งยังเป็นเนื้อหาร่าง และสามารถปรับได้เมื่อยืนยันพาร์ทเนอร์จัดส่งและนโยบายจริงแล้ว",
    "We want every client to feel confident with their purchase. Please contact us as soon as possible if there is an issue with your order.": "เราอยากให้ลูกค้าทุกคนมั่นใจกับการซื้อ หากพบปัญหากับคำสั่งซื้อ กรุณาติดต่อเราโดยเร็วที่สุด",
    "Return Eligibility": "เงื่อนไขการคืนสินค้า",
    "Returns or exchanges may be considered for eligible ready-to-ship items that are unused, unworn, undamaged, and returned with original packaging and documentation.": "การคืนหรือเปลี่ยนอาจพิจารณาได้สำหรับสินค้าพร้อมส่งที่เข้าเงื่อนไข โดยต้องยังไม่ผ่านการใช้งาน ไม่สวมใส่ ไม่เสียหาย และส่งคืนพร้อมบรรจุภัณฑ์และเอกสารเดิม",
    "Custom & Made-to-Order Items": "สินค้าสั่งทำและงานเฉพาะ",
    "Custom pieces, resized pieces, engraved items, and made-to-order jewelry are generally final sale because they are created specifically for the client.": "สินค้าสั่งทำ สินค้าที่ปรับขนาด สินค้าแกะสลัก และเครื่องประดับแบบ made-to-order โดยทั่วไปถือเป็นการขายขาด เพราะผลิตขึ้นเฉพาะสำหรับลูกค้าแต่ละราย",
    "Damaged or Incorrect Items": "สินค้าชำรุดหรือไม่ตรงคำสั่งซื้อ",
    "If an item arrives damaged or does not match the confirmed order details, please contact us with photos and order information so we can review the case and assist with the next steps.": "หากสินค้าเสียหายเมื่อได้รับหรือไม่ตรงกับรายละเอียดคำสั่งซื้อที่ยืนยัน กรุณาติดต่อเราพร้อมรูปถ่ายและข้อมูลคำสั่งซื้อ เพื่อให้เราตรวจสอบและช่วยดำเนินการขั้นต่อไป",
    "How to Request Support": "วิธีขอรับการดูแล",
    "To request return or after-sales support, contact us by phone or email with your name, order details, and a short description of the issue.": "หากต้องการขอคืนสินค้าหรือรับบริการหลังการขาย กรุณาติดต่อเราทางโทรศัพท์หรืออีเมล พร้อมชื่อ รายละเอียดคำสั่งซื้อ และคำอธิบายปัญหาโดยย่อ",
    "Return terms are draft content and should be finalized before accepting real orders online.": "เงื่อนไขการคืนสินค้ายังเป็นเนื้อหาร่าง และควรสรุปให้ชัดเจนก่อนรับคำสั่งซื้อจริงบนออนไลน์",
    "Maris Jewelry": "Maris Jewelry",
    "Temporary placeholder page for future account flows.": "หน้าต้นแบบสำหรับระบบบัญชีในอนาคต",
    "Temporary placeholder page for shopping bag and checkout content.": "หน้าต้นแบบสำหรับตะกร้าและระบบชำระเงินในอนาคต",
    "Temporary placeholder page for a future wishlist experience.": "หน้าต้นแบบสำหรับ Wishlist ในอนาคต",
    "About Us": "เกี่ยวกับเรา",
    "Newsletter": "จดหมายข่าว",
    "Instagram": "Instagram",
    "Facebook": "Facebook"
  };

  const thToEn = Object.fromEntries(Object.entries(enToTh).map(([english, thai]) => [thai, english]));
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  let currentLanguage = "en";
  let isApplying = false;

  function formatCatalogueCount(count) {
    return currentLanguage === "th" ? `${count} ชิ้น` : `${count} pieces`;
  }

  function setupCatalogueCount() {
    const toolbar = document.querySelector(".catalogue-toolbar");
    const products = document.querySelector(".products");

    if (!toolbar || !products) {
      return;
    }

    let countElement = toolbar.querySelector(".catalogue-count");

    if (!countElement) {
      countElement = document.createElement("p");
      countElement.className = "catalogue-count";
      countElement.setAttribute("aria-live", "polite");
      countElement.setAttribute("data-no-translate", "");

      const rightGroup = toolbar.querySelector(".toolbar-group-right");
      toolbar.insertBefore(countElement, rightGroup || null);
    }

    const updateCount = () => {
      const visibleCount = Array.from(products.querySelectorAll(".product-card"))
        .filter((card) => !card.hidden)
        .length;

      const nextText = formatCatalogueCount(visibleCount);

      if (countElement.textContent !== nextText) {
        countElement.textContent = nextText;
      }
    };

    updateCount();

    if (products.dataset.catalogueCountReady === "true") {
      return;
    }

    products.dataset.catalogueCountReady = "true";

    toolbar.querySelectorAll("select").forEach((control) => {
      control.addEventListener("change", () => {
        window.requestAnimationFrame(updateCount);
      });
    });

    const observer = new MutationObserver(updateCount);
    observer.observe(products, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"]
    });
  }

  function createLanguageSwitch() {
    const switcher = document.createElement("div");
    switcher.className = "language-switch";
    switcher.setAttribute("aria-label", "Language selector");
    switcher.innerHTML = `
      <button type="button" data-lang-switch="en">EN</button>
      <span>/</span>
      <button type="button" data-lang-switch="th">TH</button>
    `;
    return switcher;
  }

  function ensureLanguageSwitch() {
    if (document.querySelector("[data-lang-switch]")) {
      return;
    }

    const topRight = document.querySelector(".top-right");

    if (topRight) {
      topRight.textContent = "";
      topRight.appendChild(createLanguageSwitch());
      return;
    }

    const siteHeader = document.querySelector(".site-header");

    if (siteHeader) {
      siteHeader.appendChild(createLanguageSwitch());
    }
  }

  function getTranslation(text, language) {
    if (language === "th") {
      return enToTh[text] || text;
    }

    return thToEn[text] || text;
  }

  function translatePattern(text, language) {
    const savedPieces = text.match(/^(\d+) saved pieces$/);
    const savedPiece = text.match(/^(\d+) saved piece$/);
    const selectedPieces = text.match(/^(\d+) pieces selected$/);
    const selectedPiece = text.match(/^(\d+) piece selected$/);
    const welcomeName = text.match(/^Welcome,\s*(.+)$/);

    if (language === "th") {
      if (savedPieces || savedPiece) {
        return `${(savedPieces || savedPiece)[1]} รายการที่บันทึกไว้`;
      }

      if (selectedPieces || selectedPiece) {
        return `${(selectedPieces || selectedPiece)[1]} รายการที่เลือก`;
      }

      if (welcomeName) {
        return `ยินดีต้อนรับ, ${welcomeName[1]}`;
      }
    }

    const thSaved = text.match(/^(\d+) รายการที่บันทึกไว้$/);
    const thSelected = text.match(/^(\d+) รายการที่เลือก$/);
    const thWelcome = text.match(/^ยินดีต้อนรับ,\s*(.+)$/);

    if (language === "en") {
      if (thSaved) {
        return thSaved[1] === "1" ? "1 saved piece" : `${thSaved[1]} saved pieces`;
      }

      if (thSelected) {
        return thSelected[1] === "1" ? "1 piece selected" : `${thSelected[1]} pieces selected`;
      }

      if (thWelcome) {
        return `Welcome, ${thWelcome[1]}`;
      }
    }

    return text;
  }

  function translateText(text, language) {
    const trimmed = text.trim();

    if (!trimmed) {
      return text;
    }

    const translated = translatePattern(getTranslation(trimmed, language), language);

    if (translated === trimmed) {
      return text;
    }

    return text.replace(trimmed, translated);
  }

  function translateTextNodes(root, language) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;

          if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

          if (parent.closest("[data-i18n], [data-no-translate]")) {
            return NodeFilter.FILTER_REJECT;
          }

          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      if (!originalText.has(node)) {
        originalText.set(node, node.textContent);
      }

      const sourceText = originalText.get(node);
      const nextText = language === "en" ? sourceText : translateText(sourceText, language);

      if (node.textContent !== nextText) {
        node.textContent = nextText;
      }
    });
  }

  function translateAttributes(language) {
    document.querySelectorAll("[placeholder], [aria-label], [alt], [title]").forEach((element) => {
      ["placeholder", "aria-label", "alt", "title"].forEach((attribute) => {
        const value = element.getAttribute(attribute);

        if (!value) {
          return;
        }

        if (element.hasAttribute("data-i18n-placeholder") && (attribute === "placeholder" || attribute === "aria-label")) {
          return;
        }

        if (!originalAttributes.has(element)) {
          originalAttributes.set(element, {});
        }

        const storedAttributes = originalAttributes.get(element);

        if (!storedAttributes[attribute]) {
          storedAttributes[attribute] = value;
        }

        const sourceValue = storedAttributes[attribute];
        const nextValue = language === "en" ? sourceValue : translateText(sourceValue, language);

        if (nextValue !== value) {
          element.setAttribute(attribute, nextValue);
        }
      });
    });
  }

  function applyKeyedTranslations(language) {
    const dictionary = keyedTranslations[language] || keyedTranslations.en;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;

      if (dictionary[key] && element.textContent !== dictionary[key]) {
        element.textContent = dictionary[key];
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.dataset.i18nPlaceholder;

      if (dictionary[key]) {
        if (element.getAttribute("placeholder") !== dictionary[key]) {
          element.setAttribute("placeholder", dictionary[key]);
        }

        if (element.getAttribute("aria-label") !== dictionary[key]) {
          element.setAttribute("aria-label", dictionary[key]);
        }
      }
    });
  }

  function setSwitchState(language) {
    document.querySelectorAll("[data-lang-switch]").forEach((button) => {
      const isActive = button.dataset.langSwitch === language;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function saveLanguage(language) {
    try {
      localStorage.setItem(storageKey, language);
      localStorage.setItem(legacyStorageKey, language);
    } catch (error) {
      return;
    }
  }

  function getSavedLanguage() {
    try {
      return localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey) || "en";
    } catch (error) {
      return "en";
    }
  }

  function applyLanguage(language) {
    currentLanguage = language === "th" ? "th" : "en";
    isApplying = true;

    document.documentElement.lang = currentLanguage;
    applyKeyedTranslations(currentLanguage);
    translateTextNodes(document.body, currentLanguage);
    translateAttributes(currentLanguage);
    setupCatalogueCount();
    setSwitchState(currentLanguage);
    saveLanguage(currentLanguage);

    isApplying = false;
  }

  ensureLanguageSwitch();

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-lang-switch]");

    if (!button) {
      return;
    }

    applyLanguage(button.dataset.langSwitch);
  });

  function isIgnorableMutation(mutation) {
    if (mutation.type === "characterData") {
      return Boolean(mutation.target.parentElement?.closest("[data-i18n], [data-no-translate]"));
    }

    if (mutation.type === "childList") {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target
        : mutation.target.parentElement;

      return Boolean(target?.closest("[data-i18n], [data-no-translate]"));
    }

    return false;
  }

  const observer = new MutationObserver((mutations) => {
    if (isApplying || currentLanguage !== "th") {
      return;
    }

    if (mutations.length > 0 && mutations.every(isIgnorableMutation)) {
      return;
    }

    applyLanguage(currentLanguage);
  });

  applyLanguage(getSavedLanguage());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
