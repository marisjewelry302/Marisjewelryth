import { buildPageMetadata } from "./seo";

const serviceProcessImage = "/assets/images/service/custom-jewelry-process-storyboard.png";
const serviceHeroImage = "/assets/images/service/custom-jewelry-service-hero.png";
const serviceSeamlessHeroImage = "/assets/images/service/custom-jewelry-service-hero-02-seamless.png";

export const staticPages = {
  "about-us": {
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
        image: { src: serviceProcessImage, alt: "Pencil sketch of a custom ring design", position: "0% 0%" }
      },
      {
        title: "3D CAD in MatrixGold",
        text: "The approved direction is developed into a technical 3D CAD model with attention to scale, structure, stone placement, and production feasibility.",
        image: { src: serviceProcessImage, alt: "3D CAD jewelry design on a workstation", position: "33.333% 0%" }
      },
      {
        title: "Client approval",
        text: "We share the design view for review, refine details if needed, and move forward only after the final direction is confirmed.",
        image: { src: serviceProcessImage, alt: "Client reviewing a jewelry design presentation", position: "66.666% 0%" }
      },
      {
        title: "Casting preparation",
        text: "Once approved, the piece moves into casting preparation so the design can become a precious metal form ready for bench work.",
        image: { src: serviceProcessImage, alt: "Jewelry casting preparation with wax forms", position: "100% 0%" }
      },
      {
        title: "Bench finishing",
        text: "The cast piece is cleaned, shaped, refined, and polished by hand so the surface, symmetry, and comfort feel properly resolved.",
        image: { src: serviceProcessImage, alt: "Artisan finishing a cast ring at the bench", position: "0% 100%" }
      },
      {
        title: "Diamond selection",
        text: "Diamonds or gemstones are selected and checked for size, match, brightness, and suitability for the setting plan.",
        image: { src: serviceProcessImage, alt: "Diamonds selected with tweezers and a loupe", position: "33.333% 100%" }
      },
      {
        title: "Stone setting",
        text: "Stones are set with careful pressure and alignment, then reviewed for security, balance, and the final face-up look.",
        image: { src: serviceProcessImage, alt: "Diamond being set into a ring under magnification", position: "66.666% 100%" }
      },
      {
        title: "Packaging & handover",
        text: "The finished piece is inspected, cleaned, packed with care, and prepared for handover or delivery to the client.",
        image: { src: serviceProcessImage, alt: "Finished ring presented in premium packaging", position: "100% 100%" }
      }
    ],
    note: "Custom orders are confirmed directly before production. Final timing, material details, stone availability, and quotation depend on the approved brief.",
    actions: [
      { href: "/contact-us?service=Custom%20Jewelry%20Service", label: "Start a custom inquiry" },
      { href: "/oem-jewelry", label: "View OEM service" }
    ]
  },
  "oem-jewelry": {
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
    note: "OEM details on the website are still draft-level and can be adjusted once your final service model, MOQ, and lead times are confirmed.",
    actions: [
      { href: "/contact-us?service=OEM%20Jewelry%20Service", label: "Contact for OEM" },
      { href: "/our-service", label: "View custom process" }
    ]
  },
  "wholesale-retail": {
    title: "Wholesale & Retail",
    eyebrow: "Partner Support",
    lead: "A structured starting point for selective retail partners, private labels, and business inquiries around fine jewelry supply.",
    description: "Learn how Maris Jewelry can support wholesale, retail, and partner conversations.",
    features: [
      { title: "Selective assortment", text: "Discuss pieces, categories, or capsule directions that suit your audience and store positioning." },
      { title: "Production planning", text: "Align quantity, material direction, timing, and specification needs before moving into a formal quote." },
      { title: "Brand-aware support", text: "Keep presentation, product notes, and launch needs clear for partner-facing programs." }
    ],
    detail: {
      title: "How collaboration can begin",
      items: [
        { title: "Share the sales context", text: "Tell us whether you are planning wholesale, retail, private label, event pieces, or a specific collection." },
        { title: "Define the range", text: "We can narrow down product type, price direction, finish, and quantity before preparing next steps." },
        { title: "Move into confirmation", text: "Once the direction is clear, Maris can support product details, availability checks, and production timing." }
      ]
    },
    aside: {
      title: "Useful details",
      items: [
        { label: "Categories", value: "Rings, wedding bands, earrings, necklaces, bracelets" },
        { label: "Projects", value: "Capsule collections, custom programs, selective retail" },
        { label: "Next step", value: "Send a partner inquiry with your preferred quantity and timing" }
      ]
    },
    actions: [
      { href: "/contact-us?service=Wholesale%20%26%20Retail", label: "Start a partner inquiry" },
      { href: "/our-service", label: "View custom process" }
    ]
  },
  shipping: {
    title: "Shipping",
    eyebrow: "Client Care",
    lead: "Shipping details depend on item availability, sizing, production timing, and destination. Maris Jewelry confirms timing before final order commitment.",
    description: "Read Maris Jewelry shipping guidance for availability, timing, and delivery planning.",
    policySections: [
      { title: "Availability first", text: "Ready pieces, made-to-order items, and custom projects may have different preparation timelines. We confirm the current status before payment or final order details." },
      { title: "Delivery timing", text: "Estimated delivery windows are shared after product confirmation. Public holidays, special sizing, or custom work can affect the final schedule." },
      { title: "Address review", text: "Clients are responsible for providing complete delivery details. We may pause dispatch if an address needs clarification." }
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
      { title: "Ready pieces", text: "Return eligibility for ready pieces is reviewed case by case and may depend on condition, timing, packaging, and whether the item has been worn." },
      { title: "Custom and resized pieces", text: "Made-to-order, engraved, resized, or customized items are usually final sale once production or alteration has begun." },
      { title: "Contact quickly", text: "If something is incorrect or damaged on arrival, contact Maris Jewelry as soon as possible with photos and order details so we can review the case." }
    ],
    actions: [
      { href: "/contact-us", label: "Contact support" },
      { href: "/terms-of-service", label: "Terms of service" }
    ]
  },
  "privacy-policy": {
    title: "Privacy Policy",
    eyebrow: "Privacy",
    lead: "This page explains how Maris Jewelry handles inquiry details, account prototype data, and saved browser selections.",
    description: "Read Maris Jewelry privacy guidance for inquiry data, local browser storage, and client communication.",
    policySections: [
      { title: "Inquiry information", text: "When you submit a form, we use the details you provide to respond to product questions, custom requests, appointments, or partner inquiries." },
      { title: "Local browser storage", text: "Wishlist, shopping bag, and prototype account details are stored in your browser using localStorage. They are not a secure replacement for production authentication." },
      { title: "Communication", text: "Maris Jewelry may reply by email, phone, or the preferred contact channel you share. We do not sell personal inquiry details." }
    ],
    actions: [
      { href: "/contact-us", label: "Contact Maris" },
      { href: "/terms-of-service", label: "Terms of service" }
    ]
  },
  "terms-of-service": {
    title: "Terms of Service",
    eyebrow: "Terms",
    lead: "These terms summarize how to use the Maris Jewelry website, catalogue, quote flow, and prototype client features.",
    description: "Read Maris Jewelry terms for catalogue browsing, quote requests, and prototype account features.",
    policySections: [
      { title: "Catalogue information", text: "Product photos, descriptions, prices, and availability are presented for guidance and may change until confirmed directly by Maris Jewelry." },
      { title: "Quote requests", text: "Submitting a quote request does not create a confirmed order. Orders begin only after details, pricing, timing, and payment instructions are agreed." },
      { title: "Prototype features", text: "Wishlist, shopping bag, and local account features help browsing in this browser. They are not secure production account services." }
    ],
    actions: [
      { href: "/request-quote", label: "Request a quote" },
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
      { href: "/contact-us?service=Newsletter", label: "Join via contact form" },
      { href: "/journal", label: "Read articles" }
    ]
  }
};

export function getStaticPage(slug) {
  return staticPages[slug] || null;
}

export function getStaticPageMetadata(slug) {
  const page = getStaticPage(slug);

  if (!page) {
    return buildPageMetadata({ title: "Maris Jewelry" });
  }

  return buildPageMetadata({
    title: `${page.title} | Maris Jewelry`,
    description: page.description || page.lead,
    path: `/${slug}`,
    image: page.heroImages?.[0]?.src || page.heroImage?.src
  });
}
