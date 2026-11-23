// Metadata for every /admin route. app/layout.js owns the one <body>, so this
// layout renders its children as they are: no <html>, no <body>.
//
// Next replaces (does not merge) nested metadata keys, so `alternates`,
// `openGraph` and `twitter` are set to empty here to drop the storefront's
// canonical link and share card from the back office.
export const metadata = {
  title: "Admin · Maris",
  description: "Maris Jewelry back office.",
  robots: { index: false, follow: false },
  alternates: {},
  openGraph: null,
  twitter: null
};

export default function AdminLayout({ children }) {
  return children;
}
