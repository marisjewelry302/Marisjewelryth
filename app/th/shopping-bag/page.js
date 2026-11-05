import ShoppingBagClient from "../../shopping-bag/ShoppingBagClient";
import { buildPageMetadata } from "../../lib/seo";

export const metadata = buildPageMetadata({
  title: "ตะกร้าสินค้า | Maris Jewelry",
  description: "ตรวจดูชิ้นงาน Maris Jewelry ที่เลือกไว้ ก่อนขอราคาและตรวจสอบความพร้อมของสินค้า",
  path: "/shopping-bag",
  noindex: true,
  locale: "th"
});

export default function ShoppingBagThaiPage() {
  return <ShoppingBagClient />;
}
