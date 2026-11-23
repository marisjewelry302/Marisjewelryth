import NotFoundView from "../../components/NotFoundView";

export const metadata = {
  title: { absolute: "This piece is no longer listed | Maris Jewelry" }
};

export default function ProductNotFound() {
  return <NotFoundView variant="product" />;
}
