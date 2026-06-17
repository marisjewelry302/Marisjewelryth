import { COLLECTION_ORDER } from "./lib/collections";
import { journalArticles } from "./lib/journal-data";

const BASE_URL = "https://marisjewelryth.vercel.app";

export default function sitemap() {
  const staticRoutes = [
    "",
    "about-us",
    "contact-us",
    "privacy-policy",
    "terms-of-service",
    "returns",
    "shipping",
    "oem-jewelry",
    "wholesale-retail",
    "newsletter",
    "request-quote",
    "shopping-bag",
    "wishlist",
    "account",
    "journal"
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${BASE_URL}/${route}`.replace(/\/$/, ""),
      lastModified: new Date("2026-06-17")
    })),
    ...COLLECTION_ORDER.map((collection) => ({
      url: `${BASE_URL}/category/${collection}`,
      lastModified: new Date("2026-06-17")
    })),
    ...journalArticles.map((article) => ({
      url: `${BASE_URL}/journal/${article.slug}`,
      lastModified: new Date("2026-06-17")
    }))
  ];
}
