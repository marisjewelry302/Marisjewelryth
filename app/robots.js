export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"]
    },
    sitemap: "https://marisjewelryth.vercel.app/sitemap.xml"
  };
}
