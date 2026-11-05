import { Suspense } from "react";
import RequestQuoteClient from "../../request-quote/RequestQuoteClient";
import { buildPageMetadata } from "../../lib/seo";
import { uiText } from "../../lib/ui-text";

export const metadata = buildPageMetadata({
  title: uiText.th.quote.metaTitle,
  description: uiText.th.quote.metaDescription,
  path: "/request-quote",
  locale: "th"
});

export default function RequestQuoteThaiPage() {
  return (
    <Suspense fallback={<main id="main-content" className="placeholder-main site-main" />}>
      <RequestQuoteClient />
    </Suspense>
  );
}
