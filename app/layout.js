import { Anuphan, Urbanist } from "next/font/google";
import "../assets/css/style.css";
import "../assets/css/engagement-ring.css";
import "../assets/css/placeholder.css";
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

// Self-hosted at build time, so the storefront makes no request to Google and the
// CSP needs no font exceptions. Urbanist carries Latin; Anuphan covers Thai glyphs.
// Both expose a CSS variable that the --maris-font-* tokens resolve through.
const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-urbanist"
});

const anuphan = Anuphan({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-anuphan"
});

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
    <html lang="en" translate="no" className={`notranslate ${urbanist.variable} ${anuphan.variable}`}>
      <head>
        <meta name="google" content="notranslate" />
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
