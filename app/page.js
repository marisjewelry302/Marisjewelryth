import HomeView from "./components/HomeView";
import { homeCopy } from "./lib/home-copy";
import { buildPageMetadata } from "./lib/seo";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: homeCopy.en.title,
  description: homeCopy.en.description,
  path: "/"
});

export default function HomePage() {
  return <HomeView />;
}
