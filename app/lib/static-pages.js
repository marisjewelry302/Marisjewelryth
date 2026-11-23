import { THAI_LOCALE } from "./i18n";
import { BRAND_CONTACT, buildPageMetadata } from "./seo";
import { staticPagesTh } from "./static-pages-th";

const serviceHeroImage = "/assets/images/service/custom-jewelry-service-hero.webp";
const serviceSeamlessHeroImage = "/assets/images/service/custom-jewelry-service-hero-02-seamless.webp";

export const staticPages = {
  "about-us": {
    introAction: true,
    title: "About Us",
    eyebrow: "Family Craft, Modern Spirit",
    lead: "Maris Jewelry was born from a family rooted in jewelry craftsmanship, where knowledge, technique, and a love for fine detail have been passed down through generations.",
    description: "Learn about Maris Jewelry, a family-rooted fine jewelry brand shaped by more than 40 years of craftsmanship and a modern new-generation point of view.",
    features: [
      { title: "Family heritage", text: "Our story begins with a family background in jewelry, carrying forward skill, standards, and an eye for detail from one generation to the next." },
      { title: "40+ years of craftsmanship", text: "Behind Maris is hands-on experience from skilled artisans who understand proportion, finishing, setting, and the quiet discipline behind fine jewelry." },
      { title: "Modern young generation", text: "Maris brings that foundation into a fresh lifestyle direction: refined, current, wearable, and thoughtfully in tune with today's style." }
    ],
    detail: {
      title: "What Maris stands for",
      items: [
        { title: "Rooted in real craft", text: "Every piece starts from respect for the makers, the materials, and the small decisions that make jewelry feel beautifully finished." },
        { title: "Designed for modern life", text: "The Maris style is elegant without feeling distant, made for people who want fine jewelry that feels personal, current, and easy to wear." },
        { title: "Built with care", text: "From a personal custom piece to a partner brief, we keep the process thoughtful, detail-focused, and guided by practical production knowledge." }
      ]
    },
    aside: {
      title: "At a glance",
      items: [
        { label: "Heritage", value: "Family jewelry knowledge passed through generations" },
        { label: "Craft", value: "More than 40 years of hands-on artisan experience" },
        { label: "Direction", value: "Modern fine jewelry for personal clients, custom projects, and partner conversations" }
      ]
    },
    actions: [
      { href: "/contact-us", label: "Contact Us" },
      { href: "/our-service", label: "View Our Service" }
    ]
  },
  "our-service": {
    introAction: true,
    title: "Our Service",
    eyebrow: "Our Expertise",
    layout: "wide",
    lead: "A guided custom jewelry process, from first sketch to CAD approval, casting, setting, finishing, and careful handover.",
    description: "Explore the Maris Jewelry custom service workflow, from pencil sketch and MatrixGold CAD design to casting, finishing, diamond setting, and final packaging.",
    heroImages: [
      {
        src: serviceHeroImage,
        alt: "Finished custom diamond ring displayed with a plain green ring box, sketch paper, tools, and a soft CAD design screen"
      },
      {
        src: serviceSeamlessHeroImage,
        alt: "Custom jewelry service ring and pendant scene on soft satin"
      }
    ],
    features: [
      { title: "Design with a clear brief", text: "We begin with references, proportion, lifestyle, metal direction, stone ideas, and budget range so the design has a practical foundation." },
      { title: "Technical development", text: "Sketches and 3D CAD support the conversation before production, helping clients review scale, structure, and setting direction with confidence." },
      { title: "Atelier coordination", text: "After approval, each stage is coordinated through casting, bench work, stone selection, setting, finishing, quality review, and delivery preparation." }
    ],
    detail: {
      title: "What we confirm before production",
      items: [
        { title: "Design scope", text: "Stone shape, metal tone, ring size, profile, setting style, and any personal details are aligned before the final approval stage." },
        { title: "Material direction", text: "We review diamond or gemstone direction, metal preference, finishing, and practical wear considerations before moving into production." },
        { title: "Timeline and handover", text: "Preparation time depends on design complexity, stone sourcing, casting, setting, and final inspection. We confirm the expected schedule directly." }
      ]
    },
    aside: {
      title: "Best for",
      items: [
        { label: "Custom pieces", value: "Engagement rings, wedding bands, anniversary pieces, and meaningful one-of-one jewelry" },
        { label: "Design support", value: "Clients who want visual approval before production begins" },
        { label: "Production style", value: "Sketch, CAD, casting, finishing, stone setting, packaging, and coordinated delivery" }
      ]
    },
    stepsTitle: "How your piece is made",
    steps: [
      {
        title: "Brief & pencil sketch",
        text: "We translate your reference, story, stone direction, and preferred proportion into an initial pencil sketch and design direction.",
        image: { src: "/assets/images/service/custom-jewelry-process-01-sketch.webp", alt: "Pencil sketch of a custom ring design" }
      },
      {
        title: "3D CAD in MatrixGold",
        text: "The approved direction is developed into a technical 3D CAD model with attention to scale, structure, stone placement, and production feasibility.",
        image: { src: "/assets/images/service/custom-jewelry-process-02-cad.webp", alt: "3D CAD jewelry design on a workstation" }
      },
      {
        title: "Client approval",
        text: "We share the design view for review, refine details if needed, and move forward only after the final direction is confirmed.",
        image: { src: "/assets/images/service/custom-jewelry-process-03-approval.webp", alt: "Client reviewing a jewelry design presentation" }
      },
      {
        title: "Casting preparation",
        text: "Once approved, the piece moves into casting preparation so the design can become a precious metal form ready for bench work.",
        image: { src: "/assets/images/service/custom-jewelry-process-04-casting.webp", alt: "Jewelry casting preparation with wax forms" }
      },
      {
        title: "Bench finishing",
        text: "The cast piece is cleaned, shaped, refined, and polished by hand so the surface, symmetry, and comfort feel properly resolved.",
        image: { src: "/assets/images/service/custom-jewelry-process-05-bench.webp", alt: "Artisan finishing a cast ring at the bench" }
      },
      {
        title: "Diamond selection",
        text: "Diamonds or gemstones are selected and checked for size, match, brightness, and suitability for the setting plan.",
        image: { src: "/assets/images/service/custom-jewelry-process-06-diamond-selection.webp", alt: "Diamonds selected with tweezers and a loupe" }
      },
      {
        title: "Stone setting",
        text: "Stones are set with careful pressure and alignment, then reviewed for security, balance, and the final face-up look.",
        image: { src: "/assets/images/service/custom-jewelry-process-07-setting.webp", alt: "Diamond being set into a ring under magnification" }
      },
      {
        title: "Packaging & handover",
        text: "The finished piece is inspected, cleaned, packed with care, and prepared for handover or delivery to the client.",
        image: { src: "/assets/images/service/custom-jewelry-process-08-handover.webp", alt: "Finished ring presented in premium packaging" }
      }
    ],
    aftercare: {
      title: "After your piece is delivered",
      items: [
        { title: "Lifelong cleaning service", text: "We clean and care for your piece for as long as Maris Jewelry remains in business." },
        { title: "Ask the atelier", text: "Other after-care, such as inspection or adjustment, is confirmed with the atelier when you enquire." }
      ]
    },
    note: "Custom orders are confirmed directly before production. Final timing, material details, stone availability, and quotation depend on the approved brief.",
    actions: [
      { href: "/contact-us?service=Custom%20Design", label: "Start a custom inquiry" },
      { href: "/oem-jewelry", label: "View OEM service" }
    ]
  },
  "oem-jewelry": {
    introAction: true,
    title: "OEM Jewelry Service",
    eyebrow: "Our Expertise",
    lead: "Prepared for brands, boutiques, and project-based clients who need jewelry development and production support under their own direction.",
    description: "Learn how Maris Jewelry supports OEM development, sampling, private-label programs, and production planning.",
    features: [
      { title: "Product development", text: "Start from a sketch, reference image, CAD direction, or sample revision and shape it into a production-ready design." },
      { title: "Material flexibility", text: "Prepare options for metal color, stone type, finishing, and specification details according to the project brief." },
      { title: "Private-label support", text: "Suitable for collections, capsule drops, event pieces, or small-batch branded jewelry programs." }
    ],
    stepsTitle: "Suggested workflow",
    steps: [
      { title: "Brief & direction", text: "Share references, sizing, materials, and target range so the project scope is clear from the start." },
      { title: "Development review", text: "Refine design details, confirm feasibility, and align the piece with brand or client expectations." },
      { title: "Sampling or approval", text: "Finalize sample direction, production quantity, and finishing details before launch or order confirmation." },
      { title: "Production support", text: "Move into coordinated production timing, updates, and delivery planning once approval is complete." }
    ],
    actions: [
      { href: "/contact-us?service=OEM%20Jewelry%20Service", label: "Contact for OEM" },
      { href: "/our-service", label: "View custom process" }
    ]
  },
  shipping: {
    title: "Shipping",
    eyebrow: "Client Care",
    lead: "Shipping details depend on item availability, sizing, production timing, and destination. Maris Jewelry confirms timing before final order commitment.",
    description: "Read Maris Jewelry shipping guidance for availability, timing, and delivery planning.",
    policySections: [
      { id: "worldwide-shipment", title: "Worldwide shipment", text: "We ship worldwide. The destination, carrier, and delivery window are confirmed with you before the order is finalized, and every piece is carefully packed for the journey." },
      { id: "availability", title: "Availability first", text: "Ready pieces, made-to-order items, and custom projects may have different preparation timelines. We confirm the current status before payment or final order details." },
      { id: "delivery-timing", title: "Delivery timing", text: "Estimated delivery windows are shared after product confirmation. Public holidays, special sizing, or custom work can affect the final schedule." },
      { id: "address-review", title: "Address review", text: "Clients are responsible for providing complete delivery details. We may pause dispatch if an address needs clarification." }
    ],
    actions: [
      { href: "/contact-us", label: "Ask about delivery" },
      { href: "/returns", label: "Read returns" }
    ]
  },
  returns: {
    title: "Returns",
    eyebrow: "Client Care",
    lead: "Fine jewelry purchases require careful confirmation. Return and adjustment options depend on the piece type, condition, customization, and order status.",
    description: "Read Maris Jewelry return guidance for ready pieces, custom work, and order adjustments.",
    policySections: [
      { id: "ready-pieces", title: "Ready pieces", text: "Return eligibility for ready pieces is reviewed case by case and may depend on condition, timing, packaging, and whether the item has been worn." },
      { id: "custom-and-resized", title: "Custom and resized pieces", text: "Made-to-order, engraved, resized, or customized items are usually final sale once production or alteration has begun." },
      { id: "contact-quickly", title: "Contact quickly", text: "If something is incorrect or damaged on arrival, contact Maris Jewelry as soon as possible with photos and order details so we can review the case." }
    ],
    actions: [
      { href: "/contact-us", label: "Contact support" },
      { href: "/terms-of-service", label: "Terms of service" }
    ]
  },
  "privacy-policy": {
    title: "Privacy Policy",
    eyebrow: "Privacy",
    lead: "This policy explains what personal data Maris Jewelry collects through this website, why, who receives it, how long we keep it, and the rights you have under Thailand's Personal Data Protection Act B.E. 2562 (PDPA).",
    effectiveDate: "20 November 2026",
    description: "Read how Maris Jewelry collects, uses, shares, and protects personal data, and how to use your PDPA rights.",
    policySections: [
      { id: "who-we-are", title: "Who we are", text: ["The data controller for this website is Maris Jewelry, located at 302/9-10 Surawong Road, Si Phraya Subdistrict, Bang Rak District, Bangkok 10500, Thailand (302/9-10 ถ. สุรวงศ์ แขวงสี่พระยา เขตบางรัก กรุงเทพมหานคร 10500). You can contact us about your personal data at ", { href: `mailto:${BRAND_CONTACT.email}`, label: "marisjewelryth@gmail.com" }, " or ", { href: `tel:${BRAND_CONTACT.phone}`, label: "+66 95 879 2659" }, ". We have not appointed a Data Protection Officer; please send any privacy request or question to the contact details above."] },
      { id: "data-we-collect", title: "Personal data we collect", items: [{ label: "Account", text: "name, email address, optional phone number, and a password stored only as a one-way hash." }, { label: "Wishlist and bag", text: "the pieces you save, kept in your account while you are signed in." }, { label: "Enquiries", text: "the details you enter in the Contact, Request a Quote, and custom order forms, such as name, email, phone, company, message, budget, and ring size." }, { label: "Newsletter", text: "your email address." }, { label: "Security", text: "a one-way hash of your network address and a fingerprint of form submissions, used only to limit spam and repeated attempts." }], after: "We do not intentionally collect sensitive personal data. Name, email, and a password are needed to create an account, and name and email are needed to answer an enquiry; without them we cannot provide those services. Everything else is optional." },
      { id: "legal-basis", title: "Why we use your data and our legal basis", text: "To run your account and saved items, we rely on performing our agreement with you. To answer enquiries, prepare quotes, and make custom orders, we rely on taking steps at your request before a contract and on performing it. To send marketing emails, we rely on your consent, which you may withdraw at any time. To measure how the website is used with Google Analytics, we rely on your consent, which you may withdraw at any time. To protect the website from spam and abuse, we rely on our legitimate interest in keeping it secure. To meet tax, accounting, and other legal duties for confirmed orders, we rely on legal obligation." },
      { id: "marketing-emails", title: "Marketing emails", text: ["If you subscribe through the newsletter form or the 10% offer pop-up, we use your email address to send collection news and offers, and you tick a separate box or press the join button to say yes. Creating an account does not subscribe you: the sign-up form has its own unticked box for marketing emails, and the welcome email with the 10% offer is sent only if you tick it. Every marketing email contains an unsubscribe link, and you can also withdraw your consent by contacting us at the email address in the ", { href: "#who-we-are", label: "\"Who we are\"" }, " section. You can use the website and make enquiries without subscribing."] },
      { id: "cookies", title: "Cookies", text: ["We use strictly necessary cookies, which are always on: one keeps you signed in for up to 7 days and one remembers your cookie choice for 180 days. We also use your browser's local storage for your wishlist, bag, and pop-up preference. The website does not use advertising cookies. Cookies for website analytics are described in the next section and are used only if you allow them in the cookie banner. You can change your choice at any time from \"", { action: "cookie-settings", label: "Cookie settings" }, "\" in the footer."] },
      { id: "analytics", title: "Analytics (Google Analytics 4)", text: "We use Google Analytics 4, a service of Google LLC and Google Ireland Limited, to understand how visitors use the website. It runs only if you allow analytics in the cookie banner; until then no Google Analytics script is loaded and nothing is sent to Google.", items: [{ label: "What it collects", text: "the pages you visit, your approximate location, your device and browser type, and how you interact with the site. We do not send your name or email address to Google Analytics." }, { label: "Cookies used", text: "_ga and _ga_<ID>, which tell visits apart so we can count them." }, { label: "Purpose", text: "to improve the website and our catalogue. We do not use it for advertising, and we turn off advertising and personalization signals." }, { label: "Google's role", text: "Google acts as our service provider and processes this data for us. Google may process it outside Thailand, including in countries whose data protection rules differ from Thailand's." }, { label: "How long it is kept", text: "according to the data retention setting we have chosen in our Google Analytics account." }, { label: "How to withdraw", text: ["you can change your choice at any time from \"", { action: "cookie-settings", label: "Cookie settings" }, "\" in the footer. If you turn analytics off, we stop sending data to Google Analytics and delete the _ga cookies from your browser."] }], after: ["You can read how Google handles data in ", { href: "https://policies.google.com/privacy", label: "Google's Privacy Policy" }, "."] },
      { id: "recipients-and-transfers", title: "Who receives your data and transfers abroad", text: "We do not sell your personal data. We share it with providers who process it for us: Supabase (database and file storage), Vercel (hosting), and Resend (email), and, only if you allow analytics, Google (website analytics). At present we do not share personal data with any other recipients. Our database is hosted in Seoul, South Korea, and Vercel, Resend, and Google may process data in other countries. When we send personal data abroad, we do so only as sections 28 and 29 of the Personal Data Protection Act B.E. 2562 allow, relying on the data processing terms of these providers and appropriate security safeguards. We may also disclose data where the law requires it." },
      { id: "retention", title: "How long we keep data", text: "We keep personal data only as long as needed for the purposes above. Account data: we keep it while your account is active and delete it if you have not signed in for 2 years, or immediately when you delete your account from the Account page. Analytics data: we keep it according to the data retention setting in our Google Analytics account. When the period ends we delete or anonymize the data." },
      { id: "security", title: "How we protect data", text: "Passwords are stored hashed, sign-in cookies are signed and hidden from page scripts, the database is reachable only from our servers, and sign-in and form attempts are rate limited. No system is completely secure; where the law requires, we will notify you and the authority of a data breach." },
      { id: "your-rights", title: "Your rights", text: "Under the Personal Data Protection Act you may:", items: ["ask to access your personal data and receive a copy", "receive it in a portable format", "object to its use", "ask us to delete or anonymize it", "ask us to restrict its use", "ask us to correct it", "withdraw consent at any time without affecting earlier lawful use"], after: ["You can delete your account yourself from the Account page (we ask for your password to confirm); this removes your account, saved wishlist and bag, and email subscription, while enquiry, quote, order, and payment records we are required or entitled to keep are kept for the periods in this policy. For any other request, contact us at the email address in the ", { href: "#who-we-are", label: "\"Who we are\"" }, " section. We may need to confirm your identity first. We aim to reply within 30 days. If we refuse a request we will tell you why in writing. You may also complain to the Personal Data Protection Committee (", { href: "https://www.pdpc.or.th", label: "pdpc.or.th" }, ")."] },
      { id: "children-and-changes", title: "Children and changes to this policy", text: "The website is not directed at children, and we do not knowingly collect their personal data. We may update this policy; the effective date above shows the current version, and we will post a notice of material changes and ask for consent again where the law requires it." }
    ],
    actions: [
      { href: "/contact-us", label: "Contact Maris" },
      { href: "/terms-of-service", label: "Terms of service" }
    ]
  },
  "terms-of-service": {
    title: "Terms of Service",
    eyebrow: "Terms",
    lead: "These terms summarize how to use the Maris Jewelry website, catalogue, quote flow, and customer accounts.",
    description: "Read Maris Jewelry terms for catalogue browsing, quote requests, and customer accounts.",
    policySections: [
      { id: "catalogue-information", title: "Catalogue information", text: "Product photos, descriptions, prices, and availability are presented for guidance and may change until confirmed directly by Maris Jewelry." },
      { id: "quote-requests", title: "Quote requests", text: "Submitting a quote request does not create a confirmed order. Orders begin only after details, pricing, timing, and payment instructions are agreed." },
      { id: "accounts-wishlist-bag", title: "Accounts, wishlist, and bag", text: ["You can create an account to save a wishlist and shopping bag. While you are signed in these are saved to your account on our servers; otherwise they stay in your browser. Adding a piece to your bag or wishlist does not reserve it or create an order. You are responsible for keeping your password confidential. How we handle your data is described in our ", { href: "/privacy-policy", label: "Privacy Policy" }, "."] }
    ],
    actions: [
      { href: "/contact-us", label: "Contact us" },
      { href: "/privacy-policy", label: "Privacy policy" }
    ]
  },
  newsletter: {
    title: "Newsletter",
    eyebrow: "Maris Updates",
    lead: "Join the Maris Jewelry list for collection notes, custom design updates, and quiet announcements as the catalogue grows.",
    description: "Join the Maris Jewelry newsletter for catalogue and custom design updates.",
    features: [
      { title: "Collection notes", text: "Receive occasional updates when new pieces, categories, or editorial guides are added." },
      { title: "Custom design ideas", text: "See inspiration for stone choices, metal tone, proportions, and made-to-order direction." },
      { title: "Service updates", text: "Follow future OEM, wholesale, and appointment announcements as the brand expands." }
    ],
    actions: [
      { href: "/contact-us", label: "Contact Maris directly" },
      { href: "/journal", label: "Read the blog" }
    ]
  }
};

// Thai pages reuse the English entry for layout and images and replace the
// words, so a new image or layout change only has to be made once.
function localizePage(page, thai) {
  return {
    ...page,
    ...thai,
    heroImages: page.heroImages?.map((image, index) => ({ ...image, alt: thai.heroAlts?.[index] ?? image.alt })),
    steps: thai.steps?.map((step, index) => {
      const source = page.steps?.[index];
      return {
        ...step,
        image: source?.image ? { ...source.image, alt: step.imageAlt ?? source.image.alt } : undefined
      };
    })
  };
}

export function getStaticPage(slug, locale = "en") {
  const page = staticPages[slug] || null;

  if (page && locale === THAI_LOCALE && staticPagesTh[slug]) {
    return localizePage(page, staticPagesTh[slug]);
  }

  return page;
}

export function getStaticPageMetadata(slug, locale = "en") {
  const page = getStaticPage(slug, locale);

  if (!page) {
    return buildPageMetadata({ title: "Maris Jewelry" });
  }

  return buildPageMetadata({
    title: `${page.title} | Maris Jewelry`,
    description: page.description || page.lead,
    path: `/${slug}`,
    image: page.heroImages?.[0]?.src || page.heroImage?.src,
    locale
  });
}
