import WholesaleClient from "../../wholesale/WholesaleClient";
import { buildPageMetadata } from "../../lib/seo";

export const metadata = buildPageMetadata({
  title: "พอร์ทัลขายส่ง | Maris Jewelry",
  description: "สมัครบัญชีขายส่ง Maris Jewelry ดูราคาพาร์ทเนอร์ และส่งใบสั่งซื้อ",
  path: "/wholesale",
  locale: "th",
  noindex: true
});

export default function WholesaleThaiPage() {
  return <WholesaleClient />;
}
