import WishlistClient from "../../wishlist/WishlistClient";
import { buildPageMetadata } from "../../lib/seo";

export const metadata = buildPageMetadata({
  title: "รายการโปรด | Maris Jewelry",
  description: "ดูชิ้นงาน Maris Jewelry ที่บันทึกไว้ และไปขอใบเสนอราคาได้ทุกเมื่อที่คุณพร้อม",
  path: "/wishlist",
  noindex: true,
  locale: "th"
});

export default function WishlistThaiPage() {
  return <WishlistClient />;
}
