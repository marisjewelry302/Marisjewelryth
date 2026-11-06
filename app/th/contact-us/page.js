import ContactPageView from "../../components/ContactPageView";
import { buildPageMetadata } from "../../lib/seo";

export const metadata = buildPageMetadata({
  title: "ติดต่อเรา | Maris Jewelry",
  description: "ติดต่อ Maris Jewelry เรื่องคำถามเกี่ยวกับแคตตาล็อก งานออกแบบตามสั่ง บริการ OEM การขายส่ง หรือขอคำปรึกษาส่วนตัว",
  path: "/contact-us",
  locale: "th"
});

export default async function ContactUsThaiPage({ searchParams }) {
  const { service } = await searchParams;
  return <ContactPageView locale="th" defaultService={typeof service === "string" ? service : undefined} />;
}
