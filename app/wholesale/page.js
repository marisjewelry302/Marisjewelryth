import WholesaleClient from "./WholesaleClient";
import { buildPageMetadata } from "../lib/seo";

// The portal is behind sign-in and shows account-specific prices, so it stays
// out of search results; /wholesale-retail is the public page that explains it.
export const metadata = buildPageMetadata({
  title: "Wholesale Portal | Maris Jewelry",
  description: "Apply for a Maris Jewelry wholesale account, see partner pricing, and send purchase orders.",
  path: "/wholesale",
  noindex: true
});

export default function WholesalePage() {
  return <WholesaleClient />;
}
