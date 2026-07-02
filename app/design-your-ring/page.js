import DesignYourRingClient from "./DesignYourRingClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Design Your Ring | Maris Jewelry",
  description: "Create a custom Maris ring design before submitting a signed-in custom order request."
};

export default function DesignYourRingPage() {
  return <DesignYourRingClient />;
}
