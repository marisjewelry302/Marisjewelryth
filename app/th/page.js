import HomeView from "../components/HomeView";
import { homeCopy } from "../lib/home-copy";
import { buildPageMetadata } from "../lib/seo";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: homeCopy.th.title,
  description: homeCopy.th.description,
  path: "/",
  locale: "th"
});

export default function HomeThaiPage() {
  return <HomeView locale="th" />;
}
