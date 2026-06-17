export default function NotFound() {
  return (
    <main className="not-found-shell site-main">
      <section className="placeholder-card">
        <p className="eyebrow">Page not found</p>
        <h1>We could not find that page.</h1>
        <p className="lead">The Maris Jewelry page may have moved into the new catalogue structure.</p>
        <div className="page-actions">
          <a className="primary-link" href="/">Go to Home</a>
          <a href="/contact-us">Contact Maris</a>
        </div>
      </section>
    </main>
  );
}
