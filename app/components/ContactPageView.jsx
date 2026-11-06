import LeadForm from "./LeadForm";
import { THAI_LOCALE, localizePath } from "../lib/i18n";

// Option values are what the atelier receives in the inquiry email, so they stay
// in English for both languages; only the visible labels are translated.
const copy = {
  en: {
    eyebrow: "Maris Service",
    title: "Let's plan your piece",
    lead: "Reach out for engagement rings, wedding bands, custom work, gifts, OEM development, or wholesale conversations.",
    directTitle: "Direct contact",
    email: "Email",
    phone: "Phone",
    address: "Address",
    addressValue: "302/9-10 Surawong Road, Si Phraya, Bang Rak, Bangkok, Thailand 10500",
    tags: ["Private appointments", "Custom design", "OEM & Wholesale"],
    helpTitle: "How we usually help",
    help: [
      { title: "Product guidance", text: "Help choosing a design direction, comparing pieces, or narrowing down styles before you commit." },
      { title: "Custom development", text: "Discuss reference images, metal tone, stone options, proportions, and event timing for made-to-order work." },
      { title: "Business inquiries", text: "Start conversations about OEM production, selective retail, or wholesale support in a more structured way." }
    ],
    formTitle: "Send an inquiry",
    formLead: "Use the form below if you want a reply with product guidance, custom advice, or a business conversation starting point.",
    fullName: "Full name",
    emailField: "Email",
    phoneField: "Phone",
    interested: "Interested in",
    services: [
      ["Engagement Rings", "Engagement Rings"],
      ["Wedding Bands", "Wedding Bands"],
      ["Custom Design", "Custom Design"],
      ["OEM Jewelry Service", "OEM Jewelry Service"],
      ["Wholesale & Retail", "Wholesale & Retail"],
      ["General Inquiry", "General Inquiry"]
    ],
    preferred: "Preferred contact",
    contacts: [
      ["Email", "Email"],
      ["Phone", "Phone"],
      ["Line", "Line"],
      ["WhatsApp", "WhatsApp"]
    ],
    timing: "Timing",
    timings: [
      ["As soon as possible", "As soon as possible"],
      ["Within 2 weeks", "Within 2 weeks"],
      ["Within this month", "Within this month"],
      ["Just researching", "Just researching"]
    ],
    notes: "Notes",
    notesPlaceholder: "Tell us what you are looking for, which collection you like, or what kind of support you need.",
    formNote: "If you already know a category, target date, or budget direction, adding it here will help Maris Jewelry reply more precisely.",
    requestPricing: "Request pricing",
    readArticles: "Read Maris articles"
  },
  th: {
    eyebrow: "บริการ Maris",
    title: "มาวางแผนเครื่องประดับของคุณกัน",
    lead: "ติดต่อเราเรื่องแหวนหมั้น แหวนแถว งานสั่งทำ ของขวัญ การพัฒนา OEM หรือการขายส่ง",
    directTitle: "ติดต่อโดยตรง",
    email: "อีเมล",
    phone: "โทรศัพท์",
    address: "ที่อยู่",
    addressValue: "302/9-10 ถ. สุรวงศ์ แขวงสี่พระยา เขตบางรัก กรุงเทพมหานคร 10500",
    tags: ["นัดหมายส่วนตัว", "ออกแบบตามสั่ง", "OEM และขายส่ง"],
    helpTitle: "เราช่วยอะไรได้บ้าง",
    help: [
      { title: "คำแนะนำเรื่องสินค้า", text: "ช่วยเลือกทิศทางการออกแบบ เปรียบเทียบชิ้นงาน หรือคัดสไตล์ให้แคบลงก่อนตัดสินใจ" },
      { title: "พัฒนางานสั่งทำ", text: "พูดคุยเรื่องภาพอ้างอิง โทนโลหะ ตัวเลือกพลอย สัดส่วน และกำหนดเวลาของงานสั่งผลิต" },
      { title: "สอบถามสำหรับธุรกิจ", text: "เริ่มต้นพูดคุยเรื่องการผลิต OEM ค้าปลีกแบบคัดสรร หรือการสนับสนุนการขายส่งอย่างเป็นระบบ" }
    ],
    formTitle: "ส่งข้อความสอบถาม",
    formLead: "ใช้แบบฟอร์มด้านล่างหากต้องการให้เราตอบกลับพร้อมคำแนะนำเรื่องสินค้า คำปรึกษางานสั่งทำ หรือจุดเริ่มต้นของการคุยเรื่องธุรกิจ",
    fullName: "ชื่อ-นามสกุล",
    emailField: "อีเมล",
    phoneField: "เบอร์โทรศัพท์",
    interested: "สนใจเรื่อง",
    services: [
      ["Engagement Rings", "แหวนหมั้น"],
      ["Wedding Bands", "แหวนแถว"],
      ["Custom Design", "ออกแบบตามสั่ง"],
      ["OEM Jewelry Service", "บริการผลิตเครื่องประดับ OEM"],
      ["Wholesale & Retail", "ขายส่งและขายปลีก"],
      ["General Inquiry", "สอบถามทั่วไป"]
    ],
    preferred: "ช่องทางติดต่อที่สะดวก",
    contacts: [
      ["Email", "อีเมล"],
      ["Phone", "โทรศัพท์"],
      ["Line", "Line"],
      ["WhatsApp", "WhatsApp"]
    ],
    timing: "ช่วงเวลา",
    timings: [
      ["As soon as possible", "โดยเร็วที่สุด"],
      ["Within 2 weeks", "ภายใน 2 สัปดาห์"],
      ["Within this month", "ภายในเดือนนี้"],
      ["Just researching", "กำลังหาข้อมูล"]
    ],
    notes: "รายละเอียดเพิ่มเติม",
    notesPlaceholder: "บอกเราว่าคุณมองหาอะไร ชอบคอลเลกชันไหน หรือต้องการความช่วยเหลือแบบใด",
    formNote: "หากคุณทราบหมวดหมู่ วันที่ต้องการ หรือแนวงบประมาณแล้ว การใส่ไว้ที่นี่จะช่วยให้ Maris Jewelry ตอบได้ตรงจุดยิ่งขึ้น",
    requestPricing: "ขอราคา",
    readArticles: "อ่านบทความของ Maris"
  }
};

export default function ContactPageView({ locale = "en", defaultService }) {
  const c = copy[locale === THAI_LOCALE ? "th" : "en"];
  const link = (path) => localizePath(path, locale);

  return (
    <main id="main-content" className="placeholder-main content-page site-main">
      <section className="placeholder-card placeholder-card--editorial">
        <div className="subpage-intro">
          <p className="eyebrow">{c.eyebrow}</p>
          <h1>{c.title}</h1>
          <p className="lead">{c.lead}</p>
        </div>

        <div className="inquiry-layout">
          <div className="inquiry-column">
            <section className="inquiry-card inquiry-card--accent">
              <h2>{c.directTitle}</h2>
              <div className="inquiry-list">
                <article>
                  <strong>{c.email}</strong>
                  <p><a href="mailto:marisjewelryth@gmail.com">marisjewelryth@gmail.com</a></p>
                </article>
                <article>
                  <strong>{c.phone}</strong>
                  <p><a href="tel:0958792659">095-879-2659</a></p>
                </article>
                <article>
                  <strong>{c.address}</strong>
                  <p>{c.addressValue}</p>
                </article>
              </div>

              <div className="inquiry-tags">
                {c.tags.map((tag) => (
                  <span className="inquiry-tag" key={tag}>{tag}</span>
                ))}
              </div>
            </section>

            <section className="inquiry-card">
              <h2>{c.helpTitle}</h2>
              <div className="inquiry-list">
                {c.help.map((item) => (
                  <article key={item.title}>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </article>
                ))}
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
              <h2>{c.formTitle}</h2>
              <p>{c.formLead}</p>

              <LeadForm
                formName="maris-contact"
                sourcePage="contact-us"
                subject="Maris Website Contact Inquiry"
                type="contact"
              >
                <div className="inquiry-field-grid">
                  <label>
                    <span>{c.fullName}</span>
                    <input type="text" name="name" autoComplete="name" required />
                  </label>
                  <label>
                    <span>{c.emailField}</span>
                    <input type="email" name="email" autoComplete="email" required />
                  </label>
                  <label>
                    <span>{c.phoneField}</span>
                    <input type="tel" name="phone" autoComplete="tel" />
                  </label>
                  <label>
                    <span>{c.interested}</span>
                    <select name="service" defaultValue={c.services.some(([value]) => value === defaultService) ? defaultService : "Engagement Rings"}>
                      {c.services.map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{c.preferred}</span>
                    <select name="preferred_contact" defaultValue="Email">
                      {c.contacts.map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{c.timing}</span>
                    <select name="timeline" defaultValue="Just researching">
                      {c.timings.map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  <span>{c.notes}</span>
                  <textarea name="message" placeholder={c.notesPlaceholder} />
                </label>

                <p className="inquiry-form-note">{c.formNote}</p>
              </LeadForm>
            </section>
          </div>
        </div>

        <div className="page-actions">
          <a className="primary-link" href={link("/request-quote")}>{c.requestPricing}</a>
          <a href={link("/journal")}>{c.readArticles}</a>
        </div>
      </section>
    </main>
  );
}
