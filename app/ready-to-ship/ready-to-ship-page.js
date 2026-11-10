import "../../assets/css/category.css";
import ReadyToShipGrid from "./ReadyToShipGrid";
import JsonLd from "../components/JsonLd";
import { THAI_LOCALE } from "../lib/i18n";
import { readReadyToShipProducts } from "../lib/maris-database.js";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "../lib/seo";
import { uiText } from "../lib/ui-text";

export function buildReadyToShipMetadata(locale = "en") {
  const copy = uiText[locale === THAI_LOCALE ? "th" : "en"].readyToShip;

  return buildPageMetadata({
    title: `${copy.title} | Maris Jewelry`,
    description: copy.meta,
    path: "/ready-to-ship",
    locale
  });
}

async function getReadyToShipProducts() {
  try {
    const result = await readReadyToShipProducts();
    return result.products;
  } catch (error) {
    return [];
  }
}

export default async function ReadyToShipPageView({ locale = "en" }) {
  const copy = uiText[locale === THAI_LOCALE ? "th" : "en"].readyToShip;
  const products = await getReadyToShipProducts();

  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd([{ name: copy.title, path: "/ready-to-ship" }], locale)} />
      <main id="main-content" className="category-page site-main">
        <section className="page-header">
          <h1>{copy.title}</h1>
          <p className="category-lead">{copy.lead}</p>
        </section>

        <ReadyToShipGrid products={products} />
      </main>
    </>
  );
}
