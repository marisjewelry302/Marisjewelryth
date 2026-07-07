import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "../lib/admin-auth";
import Script from "next/script";
import AdminBodyClass from "./AdminBodyClass";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!verifyAdminSession(session).isValid) {
    redirect("/admin/login");
  }

  return (
    <>
      <AdminBodyClass />
      <div className="admin-page-shell">
        <header className="admin-topbar">
          <a className="admin-logo" href="/" aria-label="Go to storefront">
            <img src="/assets/images/logo.png" alt="Maris Jewelry Logo" />
          </a>

          <div>
            <p className="admin-kicker">Protected Back Office Gate</p>
            <h1>Maris Admin</h1>
          </div>

          <div className="admin-actions">
            <div className="language-switch" aria-label="Language selector">
              <button className="is-active" type="button" data-lang-switch="en">EN</button>
              <span>/</span>
              <button type="button" data-lang-switch="th">TH</button>
            </div>
            <a href="/">View Storefront</a>
            <form method="post" action="/api/admin/logout">
              <button className="admin-logout" type="submit">Log Out</button>
            </form>
          </div>
        </header>

        <main className="admin-shell">
          <aside className="admin-sidebar" aria-label="Admin navigation">
            <button className="is-active" type="button" data-admin-tab="dashboard">Dashboard</button>
            <button type="button" data-admin-tab="products">Products</button>
            <button type="button" data-admin-tab="best-seller">Best Seller</button>
            <button type="button" data-admin-tab="inventory">Inventory</button>
            <button type="button" data-admin-tab="orders">Orders</button>
            <button type="button" data-admin-tab="custom-requests">Custom Requests</button>
            <button type="button" data-admin-tab="customers">Customers</button>
            <button type="button" data-admin-tab="database">Database</button>
            <button type="button" data-admin-tab="settings">Settings</button>
          </aside>

          <section className="admin-content">

            {/* ── DASHBOARD ── */}
            <section className="admin-panel is-active" data-admin-panel="dashboard">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">Supabase catalogue source</p>
                  <h2>Dashboard</h2>
                </div>
                <p className="admin-note">Supabase is now the storefront catalogue source. Admin products, images, inventory, and order figures load through protected Supabase APIs.</p>
              </div>

              <div className="admin-stats">
                <article>
                  <span data-total-products>0</span>
                  <p>Total Products</p>
                </article>
                <article>
                  <span data-total-stock>0</span>
                  <p>Real Stock</p>
                </article>
                <article>
                  <span data-total-reserved>0</span>
                  <p>Reserved Stock</p>
                </article>
                <article>
                  <span data-low-stock>0</span>
                  <p>Low Stock Alerts</p>
                </article>
              </div>

              <div className="admin-explainer">
                <h3>Stock Rule</h3>
                <p>Available Stock = Real Stock - Reserved Stock</p>
                <p>Orders reserve stock first. Real stock is reduced only after payment is marked as paid.</p>
              </div>

              <div className="admin-grid admin-feed-grid">
                <article className="admin-card admin-feed-card">
                  <p className="admin-kicker">Live Storefront Source</p>
                  <h3>Supabase Catalogue</h3>
                  <p className="admin-note admin-note-wide">Add or edit products in this admin workspace. The storefront reads published Supabase products through the public catalogue API.</p>
                  <div className="admin-feed-meta">
                    <div>
                      <span>Status</span>
                      <strong data-sheet-status>Loading...</strong>
                    </div>
                    <div>
                      <span>Products On Storefront</span>
                      <strong data-sheet-product-count>0</strong>
                    </div>
                    <div>
                      <span>Last Sync</span>
                      <strong data-sheet-last-sync>Waiting...</strong>
                    </div>
                  </div>
                  <a className="admin-feed-link" href="/api/catalogue/products" target="_blank" rel="noopener noreferrer" data-sheet-feed-link>Open Catalogue API</a>
                </article>

                <article className="admin-card admin-feed-card">
                  <p className="admin-kicker">Manager Workflow</p>
                  <h3>Add Product In 3 Steps</h3>
                  <ol className="admin-steps">
                    <li>Create the product in the Supabase entry form and choose its collection, price, status, and visibility.</li>
                    <li>Upload the main product image and optional gallery images directly from this admin page.</li>
                    <li>Refresh the catalogue page and the new item appears in its collection automatically.</li>
                  </ol>
                  <p className="admin-mini-label">Supabase catalogue fields</p>
                  <div className="admin-pill-row">
                    <span>Collection</span>
                    <span>code</span>
                    <span>name</span>
                    <span>price</span>
                    <span>description</span>
                    <span>details</span>
                    <span>main image</span>
                    <span>gallery images</span>
                    <span>status</span>
                    <span>visible</span>
                  </div>
                </article>
              </div>
            </section>

            {/* ── PRODUCTS ── */}
            <section className="admin-panel" data-admin-panel="products">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">Catalogue source</p>
                  <h2>Products</h2>
                </div>
                <button className="admin-secondary" type="button" data-reset-demo>Refresh Supabase Data</button>
              </div>

              <form className="admin-form product-form" data-product-form>
                <label>
                  SKU
                  <input name="sku" type="text" placeholder="MR-RNG-001" required />
                </label>
                <label>
                  Product Name
                  <input name="name" type="text" placeholder="Maris Diamond Halo Ring" required />
                </label>
                <label>
                  Collection Name
                  <input name="collectionName" type="text" placeholder="The One Aura Collection" />
                </label>
                <label>
                  Category
                  <select name="category" required>
                    <option value="Rings">Rings</option>
                    <option value="Wedding Set">Wedding Set</option>
                    <option value="Earrings">Earrings</option>
                    <option value="Bracelets">Bracelets</option>
                    <option value="Necklaces & Pendants">Necklaces &amp; Pendants</option>
                  </select>
                </label>
                <label>
                  Ring Type
                  <select name="ringType">
                    <option value="engagement-ring">Engagement Rings</option>
                    <option value="wedding-bands">Wedding Bands</option>
                    <option value="mens-wedding-bands">Men&apos;s Wedding Bands</option>
                    <option value="rings">Rings</option>
                  </select>
                </label>
                <label>
                  Price
                  <input name="price" type="text" placeholder="18,900" />
                </label>
                <label>
                  Real Stock
                  <input name="stockQty" type="number" min="0" defaultValue="1" />
                </label>
                <label>
                  Reserved
                  <input name="reservedQty" type="number" min="0" defaultValue="0" />
                </label>
                <label>
                  Status
                  <select name="status">
                    <option value="Ready">Ready</option>
                    <option value="Sold Out">Sold Out</option>
                    <option value="Preorder">Preorder</option>
                    <option value="Hidden">Hidden</option>
                  </select>
                </label>
                <label className="admin-span-2">
                  Product Images
                  <input name="imageGroupFiles" type="file" accept="image/*" multiple data-image-group-files />
                </label>
                <div className="admin-image-group-summary admin-span-2" data-image-group-summary>
                  No product images selected.
                </div>
                <button className="admin-primary" type="submit">Add Product</button>
              </form>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Real</th>
                      <th>Reserved</th>
                      <th>Available</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody data-products-table></tbody>
                </table>
              </div>

              <div className="admin-subsection">
                <div className="admin-subsection-head">
                  <div>
                    <p className="admin-kicker">Supabase live source</p>
                    <h3>Storefront Catalogue</h3>
                  </div>
                  <p className="admin-note">This view mirrors the products the storefront receives from Supabase.</p>
                </div>
                <div className="admin-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Collection</th>
                        <th>Name / Price</th>
                        <th>Primary Image</th>
                        <th>Gallery</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody data-sheet-catalogue-table></tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ── BEST SELLER ── */}
            <section className="admin-panel" data-admin-panel="best-seller">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">Homepage carousel</p>
                  <h2>Best Seller</h2>
                </div>
                <p className="admin-note">Select the products shown in the Best Seller carousel on the homepage.</p>
              </div>

              <form className="admin-form best-seller-form" data-best-seller-form>
                <div className="best-seller-admin-slots" data-best-seller-slots>
                  <p className="admin-note">Loading Best Seller slots...</p>
                </div>
                <div className="admin-form-actions best-seller-admin-actions">
                  <button className="admin-primary" type="submit">Save Best Seller</button>
                  <span className="admin-inline-note">
                    <strong data-best-seller-count>0</strong>
                    selected
                  </span>
                </div>
              </form>

              <div className="admin-subsection">
                <div className="admin-subsection-head">
                  <div>
                    <p className="admin-kicker">Preview</p>
                    <h3>Homepage Order</h3>
                  </div>
                  <p className="admin-note">Only active products appear publicly.</p>
                </div>
                <div className="best-seller-admin-preview" data-best-seller-preview>
                  <p className="admin-note">No Best Seller products selected yet.</p>
                </div>
              </div>
            </section>

            {/* ── INVENTORY ── */}
            <section className="admin-panel" data-admin-panel="inventory">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">Stock movements</p>
                  <h2>Inventory</h2>
                </div>
                <p className="admin-note">Log stock movements to keep real and reserved quantities accurate.</p>
              </div>

              <form className="admin-form" data-inventory-form>
                <label>
                  Product
                  <select name="productId" data-product-select required></select>
                </label>
                <label>
                  Movement Type
                  <select name="type">
                    <option value="receive">Receive (+real)</option>
                    <option value="reserve">Reserve (+reserved)</option>
                    <option value="release">Release (-reserved)</option>
                    <option value="sale">Sale (-real / -reserved)</option>
                    <option value="damage">Damage (-real)</option>
                    <option value="return">Return (+real)</option>
                  </select>
                </label>
                <label>
                  Quantity
                  <input name="qty" type="number" min="1" defaultValue="1" required />
                </label>
                <label>
                  Note
                  <input name="note" type="text" placeholder="Reason or reference" />
                </label>
                <button className="admin-primary" type="submit">Save Movement</button>
              </form>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>SKU</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody data-inventory-log-table></tbody>
                </table>
              </div>
            </section>

            {/* ── ORDERS ── */}
            <section className="admin-panel" data-admin-panel="orders">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">Order workflow</p>
                  <h2>Orders</h2>
                </div>
                <p className="admin-note">Create a test order to reserve stock, then mark it paid or cancel it.</p>
              </div>

              <form className="admin-form order-form" data-order-form>
                <label>
                  Product
                  <select name="productId" data-order-product-select required></select>
                </label>
                <label>
                  Quantity
                  <input name="qty" type="number" min="1" defaultValue="1" required />
                </label>
                <label>
                  Customer Name
                  <input name="customerName" type="text" placeholder="Customer name" />
                </label>
                <button className="admin-primary" type="submit">Create Reserved Order</button>
              </form>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>SKU</th>
                      <th>Qty</th>
                      <th>Order Status</th>
                      <th>Payment</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody data-orders-table></tbody>
                </table>
              </div>
            </section>

            {/* ── CUSTOM REQUESTS ── */}
            <section className="admin-panel" data-admin-panel="custom-requests">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">Design Your Ring</p>
                  <h2>Custom Requests</h2>
                </div>
                <p className="admin-note">Review custom order enquiries from the product CTA and Design Your Ring page.</p>
              </div>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Created</th>
                      <th>Client</th>
                      <th>Request</th>
                      <th>Design</th>
                      <th>Contact</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody data-custom-requests-table>
                    <tr><td colSpan="6">Loading custom requests...</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── CUSTOMERS ── */}
            <section className="admin-panel" data-admin-panel="customers">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">Client records</p>
                  <h2>Customers</h2>
                </div>
                <p className="admin-note">This section is ready for real account and checkout data later.</p>
              </div>
              <div className="admin-empty">
                <h3>Customer CRM will connect after real checkout.</h3>
                <p>For production, this should store name, phone, email, address, order history, VIP tags, and total spend in a secure database.</p>
              </div>
            </section>

            {/* ── DATABASE ── */}
            <section className="admin-panel" data-admin-panel="database">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">Supabase foundation</p>
                  <h2>Database</h2>
                </div>
                <p className="admin-note">This checks the server-side Supabase connection that powers admin data and the public storefront catalogue.</p>
              </div>

              <div className="admin-grid admin-feed-grid">
                <article className="admin-card admin-feed-card">
                  <p className="admin-kicker">Connection</p>
                  <h3>Admin Database</h3>
                  <div className="admin-feed-meta admin-database-meta">
                    <div>
                      <span>Status</span>
                      <strong data-database-status data-database-state="loading">Checking...</strong>
                    </div>
                    <div>
                      <span>Project</span>
                      <strong data-database-project>Waiting...</strong>
                    </div>
                    <div>
                      <span>Last Check</span>
                      <strong data-database-checked>Waiting...</strong>
                    </div>
                  </div>
                  <p className="admin-note admin-note-wide" data-database-summary>Waiting for the protected database status API.</p>
                </article>

                <article className="admin-card admin-feed-card">
                  <p className="admin-kicker">Migration boundary</p>
                  <h3>Current Rule</h3>
                  <p className="admin-note admin-note-wide">Supabase is now the production catalogue source for shared products, variants, images, stock movements, customers, orders, and settings.</p>
                </article>
              </div>

              <div className="admin-subsection">
                <div className="admin-subsection-head">
                  <div>
                    <p className="admin-kicker">Table health</p>
                    <h3>Supabase Tables</h3>
                  </div>
                  <p className="admin-note">Expected tables: admin users, customers, inventory movements, order items, orders, product images, product variants, products, and settings.</p>
                </div>
                <div className="admin-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Table</th>
                        <th>Status</th>
                        <th>Rows</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody data-database-table-status>
                      <tr><td colSpan="4">Checking database tables...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="admin-subsection">
                <div className="admin-subsection-head">
                  <div>
                    <p className="admin-kicker">Supabase catalogue</p>
                    <h3>Products, Variants, Images</h3>
                  </div>
                  <p className="admin-note" data-database-products-summary>Waiting for Supabase catalogue data.</p>
                </div>
                <div className="admin-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Price</th>
                        <th>Variants</th>
                        <th>Images</th>
                        <th>Stock</th>
                        <th>Primary image</th>
                      </tr>
                    </thead>
                    <tbody data-database-products-table>
                      <tr><td colSpan="8">Checking Supabase products...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ── SETTINGS ── */}
            <section className="admin-panel" data-admin-panel="settings">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-kicker">Admin settings</p>
                  <h2>Settings</h2>
                </div>
              </div>

              <form className="admin-form settings-form" data-settings-form>
                <label>
                  Low Stock Threshold
                  <input name="lowStockThreshold" type="number" min="0" defaultValue="2" />
                </label>
                <button className="admin-primary" type="submit">Save Settings</button>
              </form>

              <div className="admin-explainer">
                <h3>Current Boundary</h3>
                <p>Catalogue, image uploads, inventory, and order records use protected Supabase APIs. Public checkout, payment capture, and role-based permissions are not live yet.</p>
              </div>
            </section>

            <p className="admin-message" data-admin-message role="status" aria-live="polite"></p>
          </section>
        </main>

        <Script src="/assets/js/admin-image-group-parser.js" strategy="afterInteractive" />
        <Script src="/assets/js/admin-page.js" strategy="afterInteractive" />
      </div>
    </>
  );
}
