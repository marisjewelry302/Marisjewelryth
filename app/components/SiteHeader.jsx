"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const LANGUAGE_KEY = "marisLanguage";
const LEGACY_LANGUAGE_KEY = "marisHomeLanguage";
const BAG_KEY = "marisShoppingBag";

const primaryNav = [
  { href: "/category/wedding-set", label: "Wedding set" },
  { href: "/category/engagement-ring", label: "Engagement rings" },
  { href: "/category/wedding-bands", label: "Wedding bands" },
  { href: "/category/mens-wedding-bands", label: "Men's Rings" }
];

const dropdownNav = [
  {
    label: "Gifts",
    items: [
      { href: "/category/necklaces-pendants", label: "Necklaces & Pendants" },
      { href: "/category/bracelets", label: "Bracelets" },
      { href: "/category/earrings", label: "Earrings" },
      { href: "/category/rings", label: "Rings" }
    ]
  },
  {
    label: "Our Expertise",
    items: [
      { href: "/oem-jewelry", label: "OEM Jewelry Service" },
      { href: "/wholesale-retail", label: "Wholesale & Retail" }
    ]
  },
  {
    label: "About Us",
    items: [
      { href: "/about-us", label: "About Us" },
      { href: "/contact-us", label: "Contact Us" },
      { href: "/journal", label: "Articles" }
    ]
  }
];

function readJsonArray(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function Icon({ name }) {
  const commonProps = {
    "aria-hidden": "true",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "1.7",
    viewBox: "0 0 24 24"
  };

  if (name === "user") {
    return (
      <svg {...commonProps}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...commonProps}>
        <path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 0 1 12 6a5 5 0 0 1 7.5 6.6Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M6 8h12l-1 13H7L6 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  );
}

function getInitialLanguage() {
  if (typeof window === "undefined") {
    return "en";
  }

  return window.localStorage.getItem(LANGUAGE_KEY)
    || window.localStorage.getItem(LEGACY_LANGUAGE_KEY)
    || document.documentElement.lang
    || "en";
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState("en");
  const [bagCount, setBagCount] = useState(0);

  const normalizedPathname = useMemo(() => pathname.replace(/\/$/, "") || "/", [pathname]);
  const isHome = normalizedPathname === "/";

  useEffect(() => {
    const initialLanguage = getInitialLanguage().toLowerCase().startsWith("th") ? "th" : "en";
    setLanguage(initialLanguage);
    document.documentElement.lang = initialLanguage;

    function updateScrollClass() {
      document.body.classList.toggle("is-page-scrolled", window.scrollY > 12);
    }

    function updateBagCount() {
      const count = readJsonArray(BAG_KEY).reduce((total, item) => total + (Number(item.quantity) || 1), 0);
      setBagCount(count);
    }

    updateScrollClass();
    updateBagCount();

    window.addEventListener("scroll", updateScrollClass, { passive: true });
    window.addEventListener("storage", updateBagCount);
    window.addEventListener("maris:bagchange", updateBagCount);

    return () => {
      window.removeEventListener("scroll", updateScrollClass);
      window.removeEventListener("storage", updateBagCount);
      window.removeEventListener("maris:bagchange", updateBagCount);
      document.body.classList.remove("is-page-scrolled", "is-mobile-menu-open");
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-mobile-menu-open", isOpen);
  }, [isOpen]);

  useEffect(() => {
    document.body.classList.toggle("is-home-page", isHome);

    return () => {
      document.body.classList.remove("is-home-page");
    };
  }, [isHome]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  function switchLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
    window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    window.localStorage.setItem(LEGACY_LANGUAGE_KEY, nextLanguage);
  }

  function isCurrent(href) {
    return normalizedPathname === href || normalizedPathname.startsWith(`${href}/`);
  }

  return (
    <header className={`site-header${isHome ? " site-header--home" : ""}`}>
      <div className="top-bar">
        <div className="top-left">
          <a href="mailto:marisjewelryth@gmail.com">marisjewelryth@gmail.com</a>
          <span className="top-note">Fine jewelry studio in Bangkok</span>
        </div>
        <div className="top-right">
          <div className="language-switch" aria-label="Language switcher">
            <button
              type="button"
              className={language === "en" ? "is-active" : ""}
              aria-pressed={language === "en"}
              onClick={() => switchLanguage("en")}
            >
              EN
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              className={language === "th" ? "is-active" : ""}
              aria-pressed={language === "th"}
              onClick={() => switchLanguage("th")}
            >
              TH
            </button>
          </div>
        </div>
      </div>

      <div className="navbar">
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="logo">
          <Link href="/" aria-label="Go to homepage">
            <img src="/assets/images/logo.png" alt="Maris Jewelry Logo" />
          </Link>
        </div>

        <nav className="nav" aria-label="Primary navigation">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}

          {dropdownNav.map((group) => {
            const current = group.items.some((item) => isCurrent(item.href));

            return (
              <div key={group.label} className={`nav-item-dropdown${current ? " is-current" : ""}`}>
                <button className="nav-dropdown-trigger" type="button" tabIndex={-1}>
                  {group.label}
                </button>
                <div className="nav-dropdown">
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="nav-mobile-actions">
            <Link href="/account">Account</Link>
            <Link href="/wishlist">Wishlist</Link>
            <Link href="/shopping-bag">Shopping bag</Link>
          </div>
        </nav>

        <div className="icons" aria-label="Account and shopping links">
          <Link href="/account" aria-label="Account" aria-current={isCurrent("/account") ? "page" : undefined}>
            <Icon name="user" />
          </Link>
          <Link href="/wishlist" aria-label="Wishlist" aria-current={isCurrent("/wishlist") ? "page" : undefined}>
            <Icon name="heart" />
          </Link>
          <Link href="/shopping-bag" aria-label="Shopping bag" aria-current={isCurrent("/shopping-bag") ? "page" : undefined}>
            <Icon name="bag" />
            <span className="bag-count-badge" data-bag-count-badge hidden={bagCount === 0}>
              {bagCount}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
