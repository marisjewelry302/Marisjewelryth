import DesignYourRingClient from "./DesignYourRingClient";
import { buildPageMetadata } from "../lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Design Your Ring | Maris Jewelry",
  description: "Create a custom Maris ring design before submitting a signed-in custom order request.",
  path: "/design-your-ring"
});

export default function DesignYourRingPage() {
  return <DesignYourRingClient />;
}
