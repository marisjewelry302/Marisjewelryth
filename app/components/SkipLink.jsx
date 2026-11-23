"use client";

import { useLocale } from "../hooks/useLocale";

// A client component so the skip link reads in the language of the page (the
// root layout is a server component and does not know the route).
export default function SkipLink() {
  const { t } = useLocale();

  return <a className="skip-link" href="#main-content">{t.header.skipToContent}</a>;
}
