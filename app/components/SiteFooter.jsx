"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const footerSections = [
  {
    title: "Maris Jewelry",
    body: "Fine jewelry, engagement rings, wedding bands, and custom design support from Bangkok.",
    links: [
      { href: "/about-us", label: "About Us" },
      { href: "/contact-us", label: "Contact Us" },
      { href: "/journal", label: "Articles" }
    ]
  },
  {
    title: "Collections",
    links: [
      { href: "/category/engagement-ring", label: "Engagement Rings" },
      { href: "/category/wedding-bands", label: "Wedding Bands" },
      { href: "/category/necklaces-pendants", label: "Necklaces & Pendants" },
      { href: "/category/rings", label: "Rings" }
    ]
  },
  {
    title: "Support",
    links: [
      { href: "/terms-of-service", label: "Terms of Service" },
      { href: "/shipping", label: "Shipping" },
      { href: "/returns", label: "Returns" },
      { href: "/privacy-policy", label: "Privacy Policy" }
    ]
  },
  {
    title: "Newsletter",
    body: "Receive collection notes, custom design updates, and Maris Jewelry announcements.",
    newsletter: true
  }
];

function SocialIcon({ label }) {
  const commonProps = {
    "aria-hidden": "true",
    fill: "currentColor",
    viewBox: "0 0 24 24"
  };

  if (label === "Facebook") {
    return (
      <svg {...commonProps}>
        <path d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.3l.7-3h-3V9c0-.6.4-1 1-1Z" />
      </svg>
    );
  }

  if (label === "Pinterest") {
    return (
      <svg {...commonProps}>
        <path d="M12.2 3.2a8.4 8.4 0 0 0-3.1 16.2c-.1-.7-.2-1.8.1-2.6l1-4.1s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.7 1.3 1.5 0 .9-.6 2.3-.9 3.5-.2 1 .5 1.9 1.6 1.9 1.9 0 3.4-2 3.4-5 0-2.6-1.9-4.4-4.6-4.4-3.1 0-5 2.3-5 4.8 0 1 .4 2 1 2.6.1.1.1.2.1.4l-.4 1.5c-.1.2-.2.3-.5.2-1.4-.7-2.3-2.8-2.3-4.5 0-3.7 2.7-7.1 7.7-7.1 4 0 7.2 2.9 7.2 6.7 0 4-2.5 7.2-6 7.2-1.2 0-2.3-.6-2.7-1.3l-.7 2.8c-.3.9-1 2.1-1.5 2.8a8.4 8.4 0 1 0 2.8-19.3Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 2A2.8 2.8 0 1 1 9.2 12 2.8 2.8 0 0 1 12 9.2Zm5.1-2.5a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1Z" />
    </svg>
  );
}

function SocialLinks() {
  const links = [
    { href: "https://www.instagram.com/maris_jewelry_th?igsh=MXNoeHpxN2VkaTU0NA==", label: "Instagram" },
    { href: "https://www.facebook.com/share/1JH2idcjPM/", label: "Facebook" },
    { href: "https://pin.it/5pKmV7MKf", label: "Pinterest" }
  ];

  return links.map((item) => (
    <a key={item.label} href={item.href} aria-label={item.label} target="_blank" rel="noopener noreferrer">
      <SocialIcon label={item.label} />
    </a>
  ));
}

function FooterSection({ section, index }) {
  const [isOpen, setIsOpen] = useState(index === 0);

  return (
    <section className={`maris-footer__section${isOpen ? " is-open" : ""}`}>
      <button className="maris-footer__toggle" type="button" onClick={() => setIsOpen((current) => !current)}>
        <span className="maris-footer__toggle-label">{section.title}</span>
        <span className="maris-footer__chevron" aria-hidden="true" />
      </button>
      <div className="maris-footer__panel" style={{ maxHeight: isOpen ? 320 : 0 }}>
        <div className="maris-footer__panel-inner">
          {section.body && <p>{section.body}</p>}
          {section.links && (
            <div className="maris-footer__links">
              {section.links.map((item) => (
                <Link key={item.href} href={item.href}>{item.label}</Link>
              ))}
            </div>
          )}
          {section.newsletter && <NewsletterForm />}
        </div>
      </div>
    </section>
  );
}

function NewsletterForm() {
  return (
    <form className="maris-footer__email-box" action="/newsletter" method="get">
      <label className="maris-footer__sr-only" htmlFor="footer-email">Email address</label>
      <input id="footer-email" name="email" type="email" placeholder="Email address" />
      <button type="submit" aria-label="Join newsletter">Join</button>
    </form>
  );
}

export default function SiteFooter() {
  const pathname = usePathname();
  const normalizedPathname = pathname.replace(/\/$/, "") || "/";

  if (normalizedPathname === "/admin" || normalizedPathname.startsWith("/admin/")) {
    return null;
  }

  return (
    <footer data-maris-footer>
      <div className="maris-footer__inner">
        <div className="maris-footer__desktop">
          {footerSections.map((section) => (
            <section className="maris-footer__desktop-col" key={section.title}>
              <h3>{section.title}</h3>
              {section.body && <p>{section.body}</p>}
              {section.links && (
                <ul>
                  {section.links.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href}>{item.label}</Link>
                    </li>
                  ))}
                </ul>
              )}
              {section.newsletter && <NewsletterForm />}
              {section.title === "Maris Jewelry" && (
                <div className="maris-footer__social">
                  <SocialLinks />
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="maris-footer__mobile">
          <div className="maris-footer__mobile-head">
            <div className="maris-footer__mobile-social">
              <SocialLinks />
            </div>
          </div>
          <div className="maris-footer__sections">
            {footerSections.map((section, index) => (
              <FooterSection key={section.title} section={section} index={index} />
            ))}
          </div>
        </div>

        <div className="maris-footer__bottom">
          <p className="maris-footer__copyright">© 2026 Maris Jewelry. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
