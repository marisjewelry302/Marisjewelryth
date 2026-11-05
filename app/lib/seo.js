import { THAI_LOCALE, hasThaiVersion, localizePath } from "./i18n.js";
import { getPublicProductPath } from "./product-display.js";

export const SITE_URL = "https://marisjewelry.com";
export const BRAND_NAME = "Maris Jewelry";
export const DEFAULT_OG_IMAGE = "/assets/images/home/optimized/home-hero-optimized.webp";

export const BRAND_CONTACT = {
  email: "marisjewelryth@gmail.com",
  phone: "+66958792659",
  displayPhone: "095-879-2659",
  address: {
    streetAddress: "302/9-10 Surawong Road",
    addressLocality: "Bang Rak",
    addressRegion: "Bangkok",
    postalCode: "10500",
    addressCountry: "TH"
  },
  sameAs: [
    "https://www.instagram.com/maris_jewelry_th",
    "https://www.facebook.com/share/1JH2idcjPM/",
    "https://pin.it/5pKmV7MKf"
  ]
};

export const HOME_FAQS = [
  {
    question: "How do I order a piece from the collections?",
    answer:
      "Choose a piece from our catalogue and send an inquiry with its product code and your preferred options. Our team will confirm availability, sizing, pricing, and order details with you."
  },
  {
    question: "Can I create custom jewelry or wedding rings?",
    answer:
      "Yes. Share your ideas, reference images, approximate budget, and preferred date for a custom piece, engagement ring, or wedding bands. We will discuss design options, materials, and timing before you confirm the project."
  },
  {
    question: "How do I start an OEM or wholesale inquiry?",
    answer:
      "Tell us about your brand or store, the jewelry you need, estimated quantities, and your target schedule. Include designs or references if available. Our team will review your requirements and discuss production or wholesale options, minimum quantities, and quotation details."
  },
  {
    question: "What should I confirm before placing an order?",
    answer:
      "Confirm the materials, dimensions or sizing, quantities, final quotation, and expected delivery timing with our team. Availability and project requirements are reviewed individually before payment or production."
  }
];

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(String(path))) {
    return String(path);
  }

  return new URL(path || "/", SITE_URL).toString();
}

export function buildPageMetadata({
  title = BRAND_NAME,
  description = "Fine jewelry, engagement rings, wedding bands, and custom design support from Bangkok.",
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  locale = "en"
} = {}) {
  // `path` is always the English path; the Thai page lives under /th.
  const isThai = locale === THAI_LOCALE;
  const canonicalUrl = absoluteUrl(localizePath(path, locale));
  const languages = hasThaiVersion(path)
    ? {
        en: absoluteUrl(path),
        th: absoluteUrl(localizePath(path, THAI_LOCALE)),
        "x-default": absoluteUrl(path)
      }
    : undefined;
  const imageUrl = absoluteUrl(image);

  return {
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      ...(languages ? { languages } : {})
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: BRAND_NAME,
      type,
      locale: isThai ? "th_TH" : "en_US",
      ...(languages ? { alternateLocale: [isThai ? "en_US" : "th_TH"] } : {}),
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: isThai ? `${BRAND_NAME} เครื่องประดับชั้นดี` : `${BRAND_NAME} fine jewelry`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/assets/images/logo.png"),
    email: BRAND_CONTACT.email,
    telephone: BRAND_CONTACT.phone,
    sameAs: BRAND_CONTACT.sameAs
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: BRAND_NAME,
    url: SITE_URL,
    publisher: {
      "@id": `${SITE_URL}/#organization`
    },
    inLanguage: ["en", "th-TH"]
  };
}

export function buildLocalBusinessJsonLd() {
  return {
    "@type": "JewelryStore",
    "@id": `${SITE_URL}/#localbusiness`,
    name: BRAND_NAME,
    url: SITE_URL,
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    email: BRAND_CONTACT.email,
    telephone: BRAND_CONTACT.phone,
    address: {
      "@type": "PostalAddress",
      ...BRAND_CONTACT.address
    },
    areaServed: [
      {
        "@type": "City",
        name: "Bangkok"
      },
      {
        "@type": "Country",
        name: "Thailand"
      }
    ],
    parentOrganization: {
      "@id": `${SITE_URL}/#organization`
    },
    sameAs: BRAND_CONTACT.sameAs
  };
}

export function buildFaqPageJsonLd(faqs = HOME_FAQS, locale = "en") {
  return {
    "@type": "FAQPage",
    "@id": `${absoluteUrl(localizePath("/", locale))}#faq`,
    inLanguage: locale === THAI_LOCALE ? "th-TH" : "en",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };
}

export function buildBreadcrumbJsonLd(items = [], locale = "en") {
  const normalizedItems = items.length > 0 && items[0].path === "/"
    ? items
    : [{ name: locale === THAI_LOCALE ? "หน้าแรก" : "Home", path: "/" }, ...items];

  return {
    "@type": "BreadcrumbList",
    itemListElement: normalizedItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localizePath(item.path, locale))
    }))
  };
}

export function buildCollectionPageJsonLd({ collection, products = [], locale = "en" }) {
  const path = localizePath(`/category/${collection.slug}`, locale);
  const itemListElement = products.slice(0, 24).map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: absoluteUrl(localizePath(getPublicProductPath(product), locale)),
    name: product.name || product.sku
  }));

  return {
    "@type": "CollectionPage",
    "@id": `${absoluteUrl(path)}#collection`,
    name: `${collection.title} | ${BRAND_NAME}`,
    description: collection.lead,
    url: absoluteUrl(path),
    isPartOf: {
      "@id": `${SITE_URL}/#website`
    },
    mainEntity: itemListElement.length
      ? {
          "@type": "ItemList",
          itemListElement
        }
      : undefined
  };
}

export function buildProductJsonLd({ product, displayName, collectionLabel, locale = "en" }) {
  const productPath = localizePath(getPublicProductPath(product), locale);
  const imageUrls = [
    product.primaryImageUrl,
    ...(Array.isArray(product.images) ? product.images.map((image) => image.imageUrl || image.url || image.src) : [])
  ].filter(Boolean).map(absoluteUrl);
  const price = Number(product.basePrice);
  const hasPrice = Number.isFinite(price) && price > 0;

  return {
    "@type": "Product",
    "@id": `${absoluteUrl(productPath)}#product`,
    name: displayName || product.name || product.sku,
    sku: product.sku,
    brand: {
      "@id": `${SITE_URL}/#organization`,
      name: BRAND_NAME
    },
    category: collectionLabel || product.collection || product.category,
    description: locale === THAI_LOCALE
      ? `${displayName || product.name || product.sku} จาก ${collectionLabel || BRAND_NAME} ความพร้อมของสินค้า ไซส์ และรายละเอียดการสั่งซื้อ ยืนยันโดยตรงกับห้องทำงาน`
      : `${displayName || product.name || product.sku} from ${collectionLabel || BRAND_NAME}. Availability, sizing, and order details are confirmed directly with the atelier.`,
    inLanguage: locale === THAI_LOCALE ? "th-TH" : "en",
    image: [...new Set(imageUrls)],
    url: absoluteUrl(productPath),
    offers: hasPrice
      ? {
          "@type": "Offer",
          url: absoluteUrl(productPath),
          priceCurrency: "THB",
          price,
          availability: "https://schema.org/LimitedAvailability",
          itemCondition: "https://schema.org/NewCondition",
          seller: {
            "@type": "Organization",
            name: BRAND_NAME,
            "@id": `${SITE_URL}/#organization`
          }
        }
      : undefined
  };
}
