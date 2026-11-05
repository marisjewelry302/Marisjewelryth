// The root layout owns <html lang="en">, which the header corrects to "th" in the
// browser. This wrapper marks the Thai page content itself as Thai in the HTML
// the server sends, so crawlers and screen readers see the right language
// before any script runs. `display: contents` keeps it out of the page layout.
export default function ThaiLayout({ children }) {
  return (
    <div lang="th" style={{ display: "contents" }}>
      {children}
    </div>
  );
}
