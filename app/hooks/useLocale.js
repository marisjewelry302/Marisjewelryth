"use client";

import { usePathname } from "next/navigation";

import { getLocale, localizePath } from "../lib/i18n";
import { baseText } from "../lib/ui-text-base";

// Client components share one layout for both languages, so they read the
// language from the URL instead of receiving it as a prop.
export function useLocale() {
  const locale = getLocale(usePathname());

  return {
    locale,
    t: baseText[locale],
    href: (path) => localizePath(path, locale)
  };
}
