import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: projectRoot
  },
  async headers() {
    return [
      {
        source: "/assets/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000"
          }
        ]
      },
      {
        source: "/assets/css/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400"
          }
        ]
      },
      {
        source: "/assets/js/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400"
          }
        ]
      }
    ];
  },
  async redirects() {
    return [
      {
        source: "/index.html",
        destination: "/",
        permanent: true
      },
      {
        source: "/404.html",
        destination: "/",
        permanent: false
      },
      {
        source: "/pages/admin.html",
        destination: "/admin",
        permanent: false
      },
      {
        source: "/pages/admin",
        destination: "/admin",
        permanent: false
      },
      {
        source: "/admin.html",
        destination: "/admin",
        permanent: false
      },
      {
        source: "/pages/product.html",
        destination: "/category/engagement-ring",
        permanent: false
      },
      ...[
        ["wedding-set", "/category/wedding-set"],
        ["engagement-ring", "/category/engagement-ring"],
        ["wedding-bands", "/category/wedding-bands"],
        ["mens-wedding-bands", "/category/mens-wedding-bands"],
        ["necklaces-pendants", "/category/necklaces-pendants"],
        ["bracelets", "/category/bracelets"],
        ["earrings", "/category/earrings"],
        ["rings", "/category/rings"],
        ["about-us", "/about-us"],
        ["contact-us", "/contact-us"],
        ["articles", "/journal"],
        ["privacy-policy", "/privacy-policy"],
        ["terms-of-service", "/terms-of-service"],
        ["returns", "/returns"],
        ["shipping", "/shipping"],
        ["oem-jewelry", "/oem-jewelry"],
        ["wholesale-retail", "/wholesale-retail"],
        ["newsletter", "/newsletter"],
        ["request-quote", "/request-quote"],
        ["shopping-bag", "/shopping-bag"],
        ["wishlist", "/wishlist"],
        ["account", "/account"]
      ].map(([source, destination]) => ({
        source: `/pages/${source}.html`,
        destination,
        permanent: true
      })),
      ...[
        "journal-diamond-4c-guide",
        "journal-diamond-real-vs-fake",
        "journal-diamond-ring-care-guide",
        "journal-diamond-ring-shapes-guide",
        "journal-engagement-ring-budget-guide",
        "journal-engagement-vs-wedding-rings",
        "journal-gold-white-gold-platinum-guide",
        "journal-lab-grown-vs-natural-diamond",
        "journal-online-vs-store-ring-shopping",
        "journal-ring-size-guide"
      ].map((slug) => ({
        source: `/pages/${slug}.html`,
        destination: `/journal/${slug}`,
        permanent: true
      })),
      {
        source: "/pages/facebook.html",
        destination: "https://www.facebook.com/share/1JH2idcjPM/",
        permanent: false
      },
      {
        source: "/pages/instagram.html",
        destination: "https://www.instagram.com/maris_jewelry_th?igsh=MXNoeHpxN2VkaTU0NA==",
        permanent: false
      }
    ];
  }
};

export default nextConfig;
