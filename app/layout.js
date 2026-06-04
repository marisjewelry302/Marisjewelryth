export const metadata = {
  title: "Maris Jewelry",
  description: "Fine jewelry, engagement rings, wedding bands, and custom designs."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
