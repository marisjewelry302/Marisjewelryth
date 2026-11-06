"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useLocale } from "../hooks/useLocale";
import { THAI_LOCALE, hasThaiVersion, localizePath, stripLocale } from "../lib/i18n";

const BAG_KEY = "marisShoppingBag";

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
  const { locale, t, href: localHref } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bagCount, setBagCount] = useState(0);
  const [openGroup, setOpenGroup] = useState(null);
  const menuButtonRef = useRef(null);
  const navRef = useRef(null);
  const headerRef = useRef(null);
  const swipeStartRef = useRef(null);
  // The query string only exists in the browser, so it is added to the language link after mount.
  const [languageSuffix, setLanguageSuffix] = useState("");

  const normalizedPathname = useMemo(() => stripLocale(pathname).replace(/\/$/, "") || "/", [pathname]);
  const isHome = normalizedPathname === "/";
  const isAdminRoute = normalizedPathname === "/admin" || normalizedPathname.startsWith("/admin/");

  useEffect(() => {
    document.documentElement.lang = locale;
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
  }, [locale]);

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
    // Collapsed accordion panels are inert, so the list is read fresh each time.
    const readFocusable = () => [...nav.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((node) => !node.closest("[inert]"));
    readFocusable()[0]?.focus();

    function handleMenuKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      const focusable = readFocusable();
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

    // React does not repair a className that differs between the server HTML
    // and the first client render, it only warns, and isHome never changes
    // afterwards so nothing re-renders to correct it. The homepage has been
    // served prerendered as a plain .site-header, which left it wearing the
    // inline logo-left header instead of the centred brand one. Setting the
    // class straight on the node makes the browser agree with the route no
    // matter what the cached HTML said.
    headerRef.current?.classList.toggle("site-header--home", isHome);

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
    setLanguageSuffix(`${window.location.search}${window.location.hash}`);
  }, [pathname]);

  // The drawer closes from its X button, by tapping the dimmed page, by dragging
  // it back toward the left edge, or with Escape.
  function closeMenu() {
    setIsOpen(false);
  }

  function toggleOpen() {
    setIsOpen((current) => {
      const next = !current;
      // Opening lands on the group the reader is already in, so they see where they are.
      if (next) {
        const here = t.header.groups.find((group) => group.items.some((item) => isCurrent(item.href)));
        setOpenGroup(here ? here.label : null);
      }
      return next;
    });
  }

  function resetNavDrag() {
    const nav = navRef.current;
    if (!nav) return;
    nav.style.transition = "";
    nav.style.transform = "";
  }

  function handleNavTouchStart(event) {
    const touch = event.touches[0];
    swipeStartRef.current = touch ? { x: touch.clientX, y: touch.clientY, dragging: false } : null;
  }

  // The drawer follows the finger while it is dragged left, then either closes or
  // springs back on release. Vertical movement is left to normal scrolling.
  function handleNavTouchMove(event) {
    const start = swipeStartRef.current;
    const touch = event.touches[0];
    const nav = navRef.current;
    if (!isMobile || !start || !touch || !nav) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (!start.dragging) {
      if (dx < -10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        start.dragging = true;
        nav.style.transition = "none";
      } else {
        return;
      }
    }

    nav.style.transform = `translateX(${Math.min(0, dx)}px)`;
  }

  function handleNavTouchEnd(event) {
    const start = swipeStartRef.current;
    const touch = event.changedTouches[0];
    swipeStartRef.current = null;
    if (!isMobile || !start || !touch) return;

    const dx = touch.clientX - start.x;
    const wasDragging = start.dragging;
    resetNavDrag();
    if (wasDragging && dx < -80) {
      closeMenu();
    }
  }

  // The other language's version of this page; a page without one falls back to that language's home.
  const languageSwitch = locale === THAI_LOCALE
    ? { href: normalizedPathname, label: "English", lang: "en" }
    : {
        href: hasThaiVersion(normalizedPathname) ? localizePath(normalizedPathname, THAI_LOCALE) : "/th",
        label: "ภาษาไทย",
        lang: "th"
      };

  function isCurrent(href) {
    return normalizedPathname === href || normalizedPathname.startsWith(`${href}/`);
  }

  if (isAdminRoute) {
    return null;
  }

  return (
    <header ref={headerRef} className={`site-header${isHome ? " site-header--home" : ""}`}>
      <div className="top-bar">
        <p className="top-announcement">
          {t.header.announcement}
          {" "}
          <Link href={localHref("/contact-us")}>{t.header.contactLink}</Link>
        </p>
        <div className="top-socials" aria-label={t.header.socialLabel}>
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
          <a
            className="top-lang"
            href={`${languageSwitch.href}${languageSuffix}`}
            lang={languageSwitch.lang}
            hrefLang={languageSwitch.lang}
            onClick={(event) => {
              // Read the address at click time so a query changed without a route change is kept too.
              event.currentTarget.href = `${languageSwitch.href}${window.location.search}${window.location.hash}`;
            }}
          >
            {languageSwitch.label}
          </a>
        </div>
      </div>

      <div className="navbar">
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label={isOpen ? t.header.closeMenu : t.header.openMenu}
          aria-expanded={isOpen}
          aria-controls="maris-primary-navigation"
          ref={menuButtonRef}
          onClick={toggleOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="logo">
          <Link href={localHref("/")} aria-label={t.header.homeLabel}>
            {/* CSS drives the width across scroll and breakpoints, so height must
                stay auto or the intrinsic height attribute would squash it.
                `sizes` must match the widest CSS width (home hero: 342px) or
                next/image only serves a 128/256px file and the logo blurs. */}
            <Image
              src="/assets/images/logo.png"
              alt={t.header.logoAlt}
              width={122}
              height={122}
              sizes="(max-width: 767px) 250px, 342px"
              priority
              style={{ height: "auto" }}
            />
          </Link>
        </div>

        <Link className="nav-search" href={localHref("/category/engagement-ring")} aria-label={t.header.browse}>
          <SearchIcon />
        </Link>

        {isMobile && isOpen ? (
          <button
            type="button"
            className="mobile-menu-backdrop"
            aria-label={t.header.closeMenu}
            tabIndex={-1}
            onClick={closeMenu}
          />
        ) : null}

        <nav
          id="maris-primary-navigation"
          className="nav"
          aria-label={t.header.primaryNav}
          aria-hidden={isMobile && !isOpen}
          inert={isMobile && !isOpen}
          ref={navRef}
          onTouchStart={handleNavTouchStart}
          onTouchMove={handleNavTouchMove}
          onTouchEnd={handleNavTouchEnd}
          onTouchCancel={() => {
            swipeStartRef.current = null;
            resetNavDrag();
          }}
        >
          <button type="button" className="nav-mobile-close" aria-label={t.header.closeMenu} onClick={() => {
            closeMenu();
            menuButtonRef.current?.focus();
          }}>
            <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          {t.header.primary.map((item) => (
            <Link key={item.href} href={localHref(item.href)} aria-current={isCurrent(item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}

          {t.header.groups.map((group, index) => {
            const current = group.items.some((item) => isCurrent(item.href));

            // A group with a single entry is just a link on a phone; a heading
            // that repeats its only child costs a tap and says nothing new.
            if (isMobile && group.items.length === 1) {
              const only = group.items[0];
              return (
                <Link key={group.label} href={localHref(only.href)} className="nav-single-link" aria-current={isCurrent(only.href) ? "page" : undefined}>
                  {group.label}
                </Link>
              );
            }

            const expanded = isMobile && openGroup === group.label;
            const panelId = `maris-nav-group-${index}`;

            return (
              <div key={group.label} className={`nav-item-dropdown${current ? " is-current" : ""}${expanded ? " is-expanded" : ""}`}>
                <button
                  className="nav-dropdown-trigger"
                  type="button"
                  tabIndex={isMobile ? 0 : -1}
                  aria-expanded={isMobile ? expanded : undefined}
                  aria-controls={isMobile ? panelId : undefined}
                  onClick={() => {
                    if (isMobile) setOpenGroup((currentGroup) => (currentGroup === group.label ? null : group.label));
                  }}
                >
                  {group.label}
                </button>
                <div className="nav-dropdown" id={panelId} inert={isMobile && !expanded}>
                  <div className="nav-dropdown__inner">
                    {group.items.map((item) => (
                      <Link key={item.href} href={localHref(item.href)} aria-current={isCurrent(item.href) ? "page" : undefined}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="nav-mobile-actions">
            <Link href="/account">{t.header.account}</Link>
            <Link href="/wishlist">{t.header.wishlist}</Link>
            <Link href="/shopping-bag">{t.header.bag}</Link>
          </div>
        </nav>

        <div className="icons" aria-label={t.header.iconsLabel}>
          <Link href="/account" aria-label={t.header.account} aria-current={isCurrent("/account") ? "page" : undefined}>
            <Icon name="user" />
          </Link>
          <Link href="/wishlist" aria-label={t.header.wishlist} aria-current={isCurrent("/wishlist") ? "page" : undefined}>
            <Icon name="heart" />
          </Link>
          <Link href="/shopping-bag" aria-label={t.header.bag} aria-current={isCurrent("/shopping-bag") ? "page" : undefined}>
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
