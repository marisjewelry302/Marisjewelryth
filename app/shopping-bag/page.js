import ShoppingBagClient from "./ShoppingBagClient";
import { buildPageMetadata } from "../lib/seo";

export const metadata = buildPageMetadata({
  title: "Shopping Bag | Maris Jewelry",
  description: "Review your selected Maris Jewelry pieces before requesting pricing and availability.",
  path: "/shopping-bag"
});

export default function ShoppingBagPage() {
  return <ShoppingBagClient />;
}
