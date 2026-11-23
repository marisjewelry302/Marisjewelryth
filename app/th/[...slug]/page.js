import { notFound } from "next/navigation";

// The root not-found boundary cannot tell it is under /th, so its metadata (the
// tab title) stays English there. Any /th path without a real page lands here and
// renders app/th/not-found.js instead, which carries the Thai title.
export default function ThaiUnmatchedPage() {
  notFound();
}
