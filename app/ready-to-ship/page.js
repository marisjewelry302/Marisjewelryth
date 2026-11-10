import ReadyToShipPageView, { buildReadyToShipMetadata } from "./ready-to-ship-page";

export const revalidate = 60;

export function generateMetadata() {
  return buildReadyToShipMetadata();
}

export default function ReadyToShipPage() {
  return <ReadyToShipPageView />;
}
