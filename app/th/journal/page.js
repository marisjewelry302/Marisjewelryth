import { JournalListView } from "../../components/JournalViews";
import { buildPageMetadata } from "../../lib/seo";
import { uiText } from "../../lib/ui-text";

export const metadata = buildPageMetadata({
  title: uiText.th.journal.metaTitle,
  description: uiText.th.journal.metaDescription,
  path: "/journal",
  locale: "th"
});

export default function JournalThaiPage() {
  return <JournalListView locale="th" />;
}
