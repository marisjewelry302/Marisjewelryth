import DesignYourRingClient from "./DesignYourRingClient";
import "../../assets/css/design-your-ring.css";
import { buildPageMetadata } from "../lib/seo";

export const metadata = buildPageMetadata({
  title: "Design Your Ring | Maris Jewelry",
  description: "Create a custom Maris ring design before submitting a signed-in custom order request.",
  path: "/design-your-ring"
});

export default function DesignYourRingPage() {
  return <DesignYourRingClient />;
}
