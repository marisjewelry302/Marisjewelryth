import WholesaleClient from "../../wholesale/WholesaleClient";
import { buildPageMetadata } from "../../lib/seo";

export const metadata = buildPageMetadata({
  title: "ขายส่ง | Maris Jewelry",
  description: "เครื่องประดับ Fine Jewelry ขายส่งจากอะเทลิเยร์ Maris สำหรับร้านค้าและแบรนด์ ส่งคำสอบถามก่อน แล้วสมัครบัญชีขายส่งเพื่อดูราคาพาร์ทเนอร์และส่งใบสั่งซื้อ",
  path: "/wholesale",
  locale: "th"
});

export default function WholesaleThaiPage() {
  return <WholesaleClient />;
}
