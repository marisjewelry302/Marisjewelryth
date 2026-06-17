import LeadForm from "../components/LeadForm";

export const metadata = {
  title: "Contact Us | Maris Jewelry",
  description: "Contact Maris Jewelry for catalogue questions, custom design, OEM service, wholesale support, or private consultation."
};

export default function ContactUsPage() {
  return (
    <main className="placeholder-main content-page site-main">
      <section className="placeholder-card placeholder-card--editorial">
        <div className="subpage-intro">
          <p className="eyebrow">Maris Service</p>
          <h1>Let's plan your piece</h1>
          <p className="lead">
            Reach out for engagement rings, wedding bands, custom work, gifts, OEM development, or wholesale conversations.
          </p>
        </div>

        <div className="inquiry-layout">
          <div className="inquiry-column">
            <section className="inquiry-card inquiry-card--accent">
              <h2>Direct contact</h2>
              <div className="inquiry-list">
                <article>
                  <strong>Email</strong>
                  <p><a href="mailto:marisjewelryth@gmail.com">marisjewelryth@gmail.com</a></p>
                </article>
                <article>
                  <strong>Phone</strong>
                  <p><a href="tel:0958792659">095-879-2659</a></p>
                </article>
                <article>
                  <strong>Address</strong>
                  <p>302/9-10 Surawong Road, Si Phraya, Bang Rak, Bangkok, Thailand 10500</p>
                </article>
              </div>

              <div className="inquiry-tags">
                <span className="inquiry-tag">Private appointments</span>
                <span className="inquiry-tag">Custom design</span>
                <span className="inquiry-tag">OEM & Wholesale</span>
              </div>
            </section>

            <section className="inquiry-card">
              <h2>How we usually help</h2>
              <div className="inquiry-list">
                <article>
                  <strong>Product guidance</strong>
                  <p>Help choosing a design direction, comparing pieces, or narrowing down styles before you commit.</p>
                </article>
                <article>
                  <strong>Custom development</strong>
                  <p>Discuss reference images, metal tone, stone options, proportions, and event timing for made-to-order work.</p>
                </article>
                <article>
                  <strong>Business inquiries</strong>
                  <p>Start conversations about OEM production, selective retail, or wholesale support in a more structured way.</p>
                </article>
              </div>

              <div className="contact-social">
                <a href="https://www.instagram.com/maris_jewelry_th?igsh=MXNoeHpxN2VkaTU0NA==" target="_blank" rel="noopener noreferrer">Instagram</a>
                <a href="https://www.facebook.com/share/1JH2idcjPM/" target="_blank" rel="noopener noreferrer">Facebook</a>
                <a href="https://pin.it/5pKmV7MKf" target="_blank" rel="noopener noreferrer">Pinterest</a>
              </div>
            </section>
          </div>

          <div className="inquiry-column">
            <section className="inquiry-card">
              <h2>Send an inquiry</h2>
              <p>Use the form below if you want a reply with product guidance, custom advice, or a business conversation starting point.</p>

              <LeadForm
                formName="maris-contact"
                sourcePage="contact-us"
                subject="Maris Website Contact Inquiry"
                type="contact"
              >
                <div className="inquiry-field-grid">
                  <label>
                    <span>Full name</span>
                    <input type="text" name="name" autoComplete="name" required />
                  </label>
                  <label>
                    <span>Email</span>
                    <input type="email" name="email" autoComplete="email" required />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input type="tel" name="phone" autoComplete="tel" />
                  </label>
                  <label>
                    <span>Interested in</span>
                    <select name="service" defaultValue="Engagement Rings">
                      <option value="Engagement Rings">Engagement Rings</option>
                      <option value="Wedding Bands">Wedding Bands</option>
                      <option value="Custom Design">Custom Design</option>
                      <option value="OEM Jewelry Service">OEM Jewelry Service</option>
                      <option value="Wholesale & Retail">Wholesale & Retail</option>
                      <option value="General Inquiry">General Inquiry</option>
                    </select>
                  </label>
                  <label>
                    <span>Preferred contact</span>
                    <select name="preferred_contact" defaultValue="Email">
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                      <option value="Line">Line</option>
                      <option value="WhatsApp">WhatsApp</option>
                    </select>
                  </label>
                  <label>
                    <span>Timing</span>
                    <select name="timeline" defaultValue="Just researching">
                      <option value="As soon as possible">As soon as possible</option>
                      <option value="Within 2 weeks">Within 2 weeks</option>
                      <option value="Within this month">Within this month</option>
                      <option value="Just researching">Just researching</option>
                    </select>
                  </label>
                </div>

                <label>
                  <span>Notes</span>
                  <textarea name="message" placeholder="Tell us what you are looking for, which collection you like, or what kind of support you need." />
                </label>

                <p className="inquiry-form-note">
                  If you already know a category, target date, or budget direction, adding it here will help Maris Jewelry reply more precisely.
                </p>
              </LeadForm>
            </section>
          </div>
        </div>

        <div className="page-actions">
          <a className="primary-link" href="/request-quote">Request pricing</a>
          <a href="/journal">Read Maris articles</a>
        </div>
      </section>
    </main>
  );
}
