"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { onCookieConsentChange, readCookieConsent } from "../lib/cookie-consent";

const CONTAINER_ID = "GTM-M3PZSLMH";
const SCRIPT_ID = "maris-google-tag-manager";
let consentInitialized = false;

function sendConsent(command, analytics, marketing) {
  window.dataLayer = window.dataLayer || [];
  // Google consent commands use an Arguments object, like the gtag snippet.
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag("consent", command, {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied"
  });
}

export default function GoogleTagManager() {
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = pathname === "/admin" || pathname?.startsWith("/admin/");

    if (!consentInitialized) {
      sendConsent("default", false, false);
      consentInitialized = true;
    }

    function syncConsent(consent) {
      const analytics = !isAdmin && consent?.analytics === true;
      const marketing = !isAdmin && consent?.marketing === true;
      sendConsent("update", analytics, marketing);

      const existing = document.getElementById(SCRIPT_ID);
      if (!analytics) {
        // Removing a script cannot unload already running tags. Reload after
        // revocation (or entry to admin) so the next document has no GTM.
        if (existing) window.location.reload();
        return;
      }
      if (existing) return;

      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${CONTAINER_ID}`;
      // Permit a later consent update/navigation to retry a failed download.
      script.onerror = () => script.remove();
      document.head.appendChild(script);
    }

    const unsubscribe = onCookieConsentChange(syncConsent);
    syncConsent(readCookieConsent());
    return unsubscribe;
  }, [pathname]);

  // No noscript iframe: it would bypass the visitor's cookie choice.
  return null;
}
