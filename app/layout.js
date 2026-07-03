import "../assets/css/style.css";
import "../assets/css/engagement-ring.css";
import "../assets/css/category.css";
import "../assets/css/product.css";
import "../assets/css/custom-order.css";
import "../assets/css/design-your-ring.css";
import "../assets/css/placeholder.css";
import "../assets/css/articles.css";
import "../assets/css/site-header.css";
import "../assets/css/footer.css";
import "./react-migration.css";
import JsonLd from "./components/JsonLd";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import {
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildPageMetadata,
  buildWebsiteJsonLd
} from "./lib/seo";

export const metadata = {
  ...buildPageMetadata({
    title: "Maris Jewelry | Bangkok Fine Jewelry Atelier",
    description:
      "Explore Maris Jewelry for engagement rings, wedding bands, fine jewelry, custom design guidance, and atelier-led availability review in Bangkok.",
    path: "/"
  }),
  icons: {
    icon: "/assets/images/favicon.svg",
    apple: "/assets/images/logo.png"
  },
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }) {
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationJsonLd(),
      buildWebsiteJsonLd(),
      buildLocalBusinessJsonLd()
    ]
  };

  return (
    <html lang="en" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anuphan:wght@300;400;500;600;700&family=Urbanist:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="has-maris-footer notranslate" translate="no" suppressHydrationWarning>
        <JsonLd data={siteJsonLd} />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
