import NotFoundView from "../../../components/NotFoundView";

export const metadata = {
  title: { absolute: "ชิ้นงานนี้ไม่ได้วางจำหน่ายแล้ว | Maris Jewelry" }
};

export default function ProductThaiNotFound() {
  return <NotFoundView variant="product" />;
}
