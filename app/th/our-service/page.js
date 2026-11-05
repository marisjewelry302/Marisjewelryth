import ContentPage from "../../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../../lib/static-pages";

export const metadata = getStaticPageMetadata("our-service", "th");

export default function OurServiceThaiPage() {
  const page = getStaticPage("our-service", "th");

  return <ContentPage page={{ ...page, heroImages: [] }} locale="th" />;
}
