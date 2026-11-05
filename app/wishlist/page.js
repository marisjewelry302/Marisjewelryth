import WishlistClient from "./WishlistClient";
import { buildPageMetadata } from "../lib/seo";

export const metadata = buildPageMetadata({
  title: "Wishlist | Maris Jewelry",
  description: "Review saved Maris Jewelry pieces and move from wishlist to a quote request whenever you are ready.",
  path: "/wishlist",
  noindex: true
});

export default function WishlistPage() {
  return <WishlistClient />;
}
