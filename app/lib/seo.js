export const SITE_URL = "https://marisjewelryth.vercel.app";
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
    question: "What does Maris Jewelry offer?",
    answer:
      "Maris Jewelry offers a fine jewelry catalogue, engagement rings, wedding bands, everyday diamond pieces, custom design support, and partner conversations for OEM or wholesale projects."
  },
  {
    question: "Can I order Maris Jewelry online?",
    answer:
      "The website works as a catalogue and inquiry path. Product availability, sizing, quotation, and final order details are confirmed directly with the Maris atelier before payment or production."
  },
  {
    question: "Where is Maris Jewelry located?",
    answer:
      "Maris Jewelry is based on Surawong Road in Bang Rak, Bangkok, Thailand, with private consultation and direct contact options for clients researching a piece."
  },
  {
    question: "Can Maris create a custom engagement ring?",
    answer:
      "Yes. Maris supports custom ring design from the first brief through stone direction, metal tone, CAD review, production planning, and final handover."
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
  type = "website"
} = {}) {
  const canonicalUrl = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: BRAND_NAME,
      type,
      locale: "en_US",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${BRAND_NAME} fine jewelry`
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

export function buildFaqPageJsonLd(faqs = HOME_FAQS) {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
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

export function buildBreadcrumbJsonLd(items = []) {
  const normalizedItems = items.length > 0 && items[0].path === "/"
    ? items
    : [{ name: "Home", path: "/" }, ...items];

  return {
    "@type": "BreadcrumbList",
    itemListElement: normalizedItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function buildCollectionPageJsonLd({ collection, products = [] }) {
  const path = `/category/${collection.slug}`;
  const itemListElement = products.slice(0, 24).map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: absoluteUrl(`/product/${product.slug || product.sku}`),
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

export function buildProductJsonLd({ product, displayName, collectionLabel }) {
  const productPath = `/product/${product.slug || product.sku}`;
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
    description: `${displayName || product.name || product.sku} from ${collectionLabel || BRAND_NAME}. Availability, sizing, and order details are confirmed directly with the atelier.`,
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
