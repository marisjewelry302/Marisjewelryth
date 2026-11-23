import UnsubscribeView from "./UnsubscribeView";

export const metadata = {
  title: "Unsubscribe | Maris Jewelry",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ searchParams }) {
  const params = await searchParams;
  return <UnsubscribeView token={String(params?.token || "")} locale="en" />;
}
