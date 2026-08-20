"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const BAG_KEY = "marisShoppingBag";

const primaryNav = [
  { href: "/category/wedding-set", label: "Wedding set" },
  { href: "/category/engagement-ring", label: "Engagement ring" }
];

const dropdownNav = [
  {
    label: "Wedding band",
    items: [
      { href: "/category/wedding-bands", label: "Wedding Bands" },
      { href: "/category/mens-wedding-bands", label: "Men's Wedding Bands" }
    ]
  },
  {
    label: "Gift",
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
      { href: "/design-your-ring", label: "Design Your Ring" },
      { href: "/our-service", label: "Our Service" },
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

const socialNav = [
  { href: "https://www.facebook.com/share/1JH2idcjPM/", label: "Facebook", icon: "facebook" },
  { href: "https://www.instagram.com/maris_jewelry_th?igsh=MXNoeHpxN2VkaTU0NA==", label: "Instagram", icon: "instagram" },
  { href: "https://pin.it/5pKmV7MKf", label: "Pinterest", icon: "pinterest" }
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

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function SocialIcon({ name }) {
  const commonProps = {
    "aria-hidden": "true",
    fill: "currentColor",
    viewBox: "0 0 24 24"
  };

  if (name === "instagram") {
    return (
      <svg {...commonProps}>
        <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16.7" cy="7.3" r="1.2" />
      </svg>
    );
  }

  if (name === "facebook") {
    return (
      <svg {...commonProps}>
        <path d="M13.8 21v-8h2.7l.5-3h-3.2V8.1c0-.9.4-1.5 1.7-1.5H17V3.9c-.8-.1-1.7-.2-2.5-.2-2.6 0-4.4 1.6-4.4 4.5V10H7.2v3h2.9v8h3.7Z" />
      </svg>
    );
  }

  if (name === "youtube") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="6.5" width="18" height="11" rx="3" />
        <path d="m10.3 9.5 5 2.5-5 2.5v-5Z" fill="white" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12.1 3.2c-4.1 0-6.3 2.7-6.3 5.6 0 1.7.8 3 2.1 3.5.2.1.4 0 .5-.3l.2-.9c.1-.3.1-.4-.1-.7-.5-.6-.8-1.3-.8-2.2 0-2.4 1.8-4.5 4.6-4.5 2.5 0 3.9 1.5 3.9 3.6 0 2.7-1.2 5-3 5-1 0-1.8-.8-1.5-1.9.3-1.2.9-2.4.9-3.3 0-.8-.4-1.4-1.2-1.4-1 0-1.8 1-1.8 2.4 0 .9.3 1.5.3 1.5l-1.2 5.1c-.4 1.5-.1 3.4 0 3.6 0 .1.2.2.3.1.1-.1 1.7-2.1 2.2-3.9.2-.5.8-3 .8-3 .4.8 1.4 1.4 2.5 1.4 3.3 0 5.5-3 5.5-7 0-3-2.6-5.9-6.6-5.9Z" />
    </svg>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bagCount, setBagCount] = useState(0);
  const menuButtonRef = useRef(null);
  const navRef = useRef(null);

  const normalizedPathname = useMemo(() => pathname.replace(/\/$/, "") || "/", [pathname]);
  const isHome = normalizedPathname === "/";
  const isAdminRoute = normalizedPathname === "/admin" || normalizedPathname.startsWith("/admin/");

  useEffect(() => {
    document.documentElement.lang = "en";
    try {
      window.localStorage.removeItem("marisLanguage");
      window.localStorage.removeItem("marisHomeLanguage");
    } catch (error) {
      // Storage can be unavailable in stricter browser modes.
    }

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
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const updateMobileState = () => setIsMobile(mediaQuery.matches);

    updateMobileState();
    mediaQuery.addEventListener("change", updateMobileState);
    return () => mediaQuery.removeEventListener("change", updateMobileState);
  }, []);

  useEffect(() => {
    if (!isMobile || !isOpen || !navRef.current) return undefined;

    const nav = navRef.current;
    const focusable = [...nav.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    focusable[0]?.focus();

    function handleMenuKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleMenuKeydown);
    return () => document.removeEventListener("keydown", handleMenuKeydown);
  }, [isMobile, isOpen]);

  useEffect(() => {
    document.body.classList.toggle("is-home-page", isHome);

    return () => {
      document.body.classList.remove("is-home-page");
    };
  }, [isHome]);

  useEffect(() => {
    if (!isHome) {
      document.body.classList.remove("is-home-header-compact");
      return undefined;
    }

    // The homepage header is absolutely positioned over a full height hero and
    // used to scroll away for good, leaving the rest of the page with no
    // navigation. It now pins itself once the hero is actually behind the
    // reader, so the full brand treatment survives for as long as it is the
    // thing being looked at. The shared is-page-scrolled class fires after
    // 12px, which is far too early for that.
    function updateHomeHeaderClass() {
      const hero = document.querySelector(".home-main .hero");
      const threshold = hero ? Math.max(160, hero.offsetHeight - 160) : window.innerHeight * 0.7;
      document.body.classList.toggle("is-home-header-compact", window.scrollY > threshold);
    }

    updateHomeHeaderClass();
    window.addEventListener("scroll", updateHomeHeaderClass, { passive: true });
    window.addEventListener("resize", updateHomeHeaderClass);

    return () => {
      window.removeEventListener("scroll", updateHomeHeaderClass);
      window.removeEventListener("resize", updateHomeHeaderClass);
      document.body.classList.remove("is-home-header-compact");
    };
  }, [isHome]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  function isCurrent(href) {
    return normalizedPathname === href || normalizedPathname.startsWith(`${href}/`);
  }

  if (isAdminRoute) {
    return null;
  }

  return (
    <header className={`site-header${isHome ? " site-header--home" : ""}`}>
      <div className="top-bar">
        <p className="top-announcement">
          Private consultation for confirmed Maris pieces.
          {" "}
          <Link href="/contact-us">Contact Maris</Link>
        </p>
        <div className="top-socials" aria-label="Social media links">
          {socialNav.map((item) => (
            item.href ? (
              <a key={item.label} href={item.href} aria-label={item.label} target="_blank" rel="noopener noreferrer">
                <SocialIcon name={item.icon} />
              </a>
            ) : (
              <span key={item.label} className="top-socials__placeholder" role="img" aria-label={`${item.label} link coming soon`} title={`${item.label} link coming soon`}>
                <SocialIcon name={item.icon} />
              </span>
            )
          ))}
        </div>
      </div>

      <div className="navbar">
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="maris-primary-navigation"
          ref={menuButtonRef}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="logo">
          <Link href="/" aria-label="Go to homepage">
            {/* CSS drives the width across scroll and breakpoints, so height must
                stay auto or the intrinsic height attribute would squash it. */}
            <Image
              src="/assets/images/logo.png"
              alt="Maris Jewelry Logo"
              width={122}
              height={122}
              priority
              style={{ height: "auto" }}
            />
          </Link>
        </div>

        <Link className="nav-search" href="/category/engagement-ring" aria-label="Browse jewelry">
          <SearchIcon />
        </Link>

        <nav
          id="maris-primary-navigation"
          className="nav"
          aria-label="Primary navigation"
          aria-hidden={isMobile && !isOpen}
          inert={isMobile && !isOpen}
          ref={navRef}
        >
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
