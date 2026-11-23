import UnsubscribeView from "../../unsubscribe/UnsubscribeView";

export const metadata = {
  title: "ยกเลิกการรับอีเมล | Maris Jewelry",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function UnsubscribeThaiPage({ searchParams }) {
  const params = await searchParams;
  return <UnsubscribeView token={String(params?.token || "")} locale="th" />;
}
