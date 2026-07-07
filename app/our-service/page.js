import ContentPage from "../components/ContentPage";
import { getStaticPage, getStaticPageMetadata } from "../lib/static-pages";

export const metadata = getStaticPageMetadata("our-service");

export default function OurServicePage() {
  const page = getStaticPage("our-service");

  return <ContentPage page={{ ...page, heroImages: [] }} />;
}
