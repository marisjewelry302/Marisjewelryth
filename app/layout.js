import "../assets/css/style.css";
import "../assets/css/engagement-ring.css";
import "../assets/css/category.css";
import "../assets/css/product.css";
import "../assets/css/placeholder.css";
import "../assets/css/articles.css";
import "../assets/css/site-header.css";
import "../assets/css/footer.css";
import "./react-migration.css";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";

export const metadata = {
  title: "Maris Jewelry",
  description: "Fine jewelry, engagement rings, wedding bands, and custom designs.",
  icons: {
    icon: "/assets/images/favicon.svg",
    apple: "/assets/images/logo.png"
  },
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }) {
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
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
