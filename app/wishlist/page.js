import WishlistClient from "./WishlistClient";

export const metadata = {
  title: "Wishlist | Maris Jewelry",
  description: "Review saved Maris Jewelry pieces and move from wishlist to a quote request whenever you are ready."
};

export default function WishlistPage() {
  return <WishlistClient />;
}
