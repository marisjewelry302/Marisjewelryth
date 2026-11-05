// Server-side view of every dictionary: the shared strings plus the storefront
// ones. Client components must not import this file (it would put both
// dictionaries in every page bundle); they use useLocale or useShopLocale.
import { baseText } from "./ui-text-base";
import { shopEn, shopTh } from "./ui-text-shop";

export const uiText = {
  en: { ...baseText.en, ...shopEn },
  th: { ...baseText.th, ...shopTh }
};
