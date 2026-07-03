import { Suspense } from "react";
import RequestQuoteClient from "./RequestQuoteClient";
import { buildPageMetadata } from "../lib/seo";

export const metadata = buildPageMetadata({
  title: "Request Quote | Maris Jewelry",
  description: "Request pricing and availability for selected Maris Jewelry pieces, from engagement rings to custom fine jewelry.",
  path: "/request-quote"
});

export default function RequestQuotePage() {
  return (
    <Suspense fallback={<main className="placeholder-main site-main" />}>
      <RequestQuoteClient />
    </Suspense>
  );
}
