import WholesaleClient from "./WholesaleClient";
import { buildPageMetadata } from "../lib/seo";

// The signed-out view is the public explainer for the wholesale programme (it
// replaced /wholesale-retail), so it is indexable; partner prices only render
// after sign-in and never appear in the server HTML.
export const metadata = buildPageMetadata({
  title: "Wholesale | Maris Jewelry",
  description: "Wholesale fine jewelry from the Maris atelier for retailers and brands. Send an inquiry, then apply for a wholesale account to see partner pricing and send purchase orders.",
  path: "/wholesale"
});

export default function WholesalePage() {
  return <WholesaleClient />;
}
