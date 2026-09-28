import localFont from "next/font/local";
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

// Self-hosted from app/fonts, so neither the build nor the storefront makes a
// request to Google and the CSP needs no font exceptions. next/font/google fetched
// the CSS at build time, and when Google answered with /l/font?kit=... URLs the
// Turbopack build failed outright (vercel/next.js#99114). Urbanist carries Latin;
// Anuphan covers Thai glyphs. Both are the upstream variable fonts cut to 300-700
// and to the Google Fonts subsets the site used, and both expose a CSS variable
// that the --maris-font-* tokens resolve through.
const urbanist = localFont({
  src: "./fonts/Urbanist-Variable.woff2",
  weight: "300 700",
  display: "swap",
  variable: "--font-urbanist"
});

const anuphan = localFont({
  src: "./fonts/Anuphan-Variable.woff2",
  weight: "300 700",
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
