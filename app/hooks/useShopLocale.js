"use client";

import { usePathname } from "next/navigation";

import { getLocale, localizePath } from "../lib/i18n";
import { shopEn, shopTh } from "../lib/ui-text-shop";

const shopText = { en: shopEn, th: shopTh };

// Like useLocale, for the storefront components (catalogue, product page, bag,
// wishlist, quote, account, order form) that need the larger dictionary.
export function useShopLocale() {
  const locale = getLocale(usePathname());

  return {
    locale,
    t: shopText[locale],
    href: (path) => localizePath(path, locale)
  };
}
