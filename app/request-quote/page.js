import { Suspense } from "react";
import RequestQuoteClient from "./RequestQuoteClient";

export const metadata = {
  title: "Request Quote | Maris Jewelry",
  description: "Request pricing and availability for selected Maris Jewelry pieces, from engagement rings to custom fine jewelry."
};

export default function RequestQuotePage() {
  return (
    <Suspense fallback={<main className="placeholder-main site-main" />}>
      <RequestQuoteClient />
    </Suspense>
  );
}
