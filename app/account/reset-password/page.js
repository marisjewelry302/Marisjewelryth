import ResetPasswordView from "./ResetPasswordView";
import { buildPageMetadata } from "../../lib/seo";
import { shopEn } from "../../lib/ui-text-shop";

// The link carries a secret, so the page is never indexed and does not leak it
// to other sites through the Referer header.
export const metadata = {
  ...buildPageMetadata({
    title: shopEn.account.reset.metaTitle,
    description: shopEn.account.reset.lead,
    path: "/account/reset-password",
    noindex: true
  }),
  referrer: "no-referrer"
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  return <ResetPasswordView token={String(params?.token || "")} locale="en" />;
}
