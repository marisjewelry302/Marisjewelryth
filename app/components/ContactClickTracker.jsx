"use client";

import { useEffect } from "react";

import { contactMethodFromHref, trackEvent } from "../lib/track";

// One delegated listener for every LINE, WhatsApp, tel: and mailto: link in the
// storefront, so no individual link needs wiring. Sends the method only, never
// the number, address or LINE ID in the href. trackEvent applies the consent and
// /admin checks.
export default function ContactClickTracker() {
  useEffect(() => {
    function handleClick(event) {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link) return;

      const method = contactMethodFromHref(link.getAttribute("href"));
      if (method) trackEvent("contact_click", { contact_method: method });
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
