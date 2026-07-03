import AccountClient from "./AccountClient";
import { buildPageMetadata } from "../lib/seo";

export const metadata = buildPageMetadata({
  title: "Account | Maris Jewelry",
  description: "View saved Maris Jewelry details, wishlist pieces, shopping bag selections, and quote requests in this browser-based client area.",
  path: "/account"
});

export default function AccountPage() {
  return <AccountClient />;
}
