import AccountClient from "./AccountClient";
import { buildPageMetadata } from "../lib/seo";
import { uiText } from "../lib/ui-text";

export const metadata = buildPageMetadata({
  title: uiText.en.account.metaTitle,
  description: uiText.en.account.metaDescription,
  path: "/account",
  noindex: true
});

export default function AccountPage() {
  return <AccountClient />;
}
