import ResetPasswordView from "../../../account/reset-password/ResetPasswordView";
import { buildPageMetadata } from "../../../lib/seo";
import { shopTh } from "../../../lib/ui-text-shop";

export const metadata = {
  ...buildPageMetadata({
    title: shopTh.account.reset.metaTitle,
    description: shopTh.account.reset.lead,
    path: "/account/reset-password",
    noindex: true,
    locale: "th"
  }),
  referrer: "no-referrer"
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordThaiPage({ searchParams }) {
  const params = await searchParams;
  return <ResetPasswordView token={String(params?.token || "")} locale="th" />;
}
