import NotFoundView from "./components/NotFoundView";

// The English default; NotFoundView swaps the title and copy for Thai paths.
export const metadata = {
  title: { absolute: "Page not found | Maris Jewelry" }
};

export default function NotFound() {
  return <NotFoundView />;
}
