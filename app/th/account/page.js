import AccountClient from "../../account/AccountClient";
import { buildPageMetadata } from "../../lib/seo";
import { uiText } from "../../lib/ui-text";

export const metadata = buildPageMetadata({
  title: uiText.th.account.metaTitle,
  description: uiText.th.account.metaDescription,
  path: "/account",
  noindex: true,
  locale: "th"
});

export default function AccountThaiPage() {
  return <AccountClient />;
}
