import { JournalListView } from "../components/JournalViews";
import { buildPageMetadata } from "../lib/seo";
import { uiText } from "../lib/ui-text";

export const metadata = buildPageMetadata({
  title: uiText.en.journal.metaTitle,
  description: uiText.en.journal.metaDescription,
  path: "/journal"
});

export default function JournalPage() {
  return <JournalListView />;
}
