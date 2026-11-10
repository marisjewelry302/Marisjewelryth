import ReadyToShipPageView, { buildReadyToShipMetadata } from "../../ready-to-ship/ready-to-ship-page";

export const revalidate = 60;

export function generateMetadata() {
  return buildReadyToShipMetadata("th");
}

export default function ReadyToShipThaiPage() {
  return <ReadyToShipPageView locale="th" />;
}
