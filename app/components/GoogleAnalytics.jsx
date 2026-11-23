"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import {
  GA_SCRIPT_ORIGIN,
  buildAnalyticsPagePath,
  deleteGoogleAnalyticsCookies,
  initGoogleAnalytics,
  isAnalyticsExcludedPath,
  normalizeGaMeasurementId,
  sendPageView,
  setAnalyticsConsent
} from "../lib/analytics";
import { hasCookieConsent, onCookieConsentChange } from "../lib/cookie-consent";

// NEXT_PUBLIC_ variables are inlined at build time only when written out in full.
const MEASUREMENT_ID = normalizeGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

// Sends one page_view per navigation while analytics consent is granted.
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSentRef = useRef(null);
  const query = searchParams?.toString() || "";

  useEffect(() => {
    const path = buildAnalyticsPagePath(pathname, new URLSearchParams(query));
    if (lastSentRef.current === path) return undefined;

    // Next updates document.title just after the route commits. The timer is
    // cleared on cleanup, so Strict Mode's double effect still sends once.
    const timer = window.setTimeout(() => {
      if (lastSentRef.current === path) return;
      lastSentRef.current = path;
      sendPageView(window, {
        path,
        title: document.title,
        location: `${window.location.origin}${path}`
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname, query]);

  return null;
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const [granted, setGranted] = useState(false);
  // Once true the gtag.js tag stays mounted; later consent changes go through
  // gtag("consent", "update") instead of removing and re-adding the script.
  const [scriptRequested, setScriptRequested] = useState(false);
  const enabled = Boolean(MEASUREMENT_ID) && !isAnalyticsExcludedPath(pathname);

  useEffect(() => {
    if (!MEASUREMENT_ID) return undefined;

    setGranted(hasCookieConsent("analytics"));
    return onCookieConsentChange((consent) => setGranted(consent?.analytics === true));
  }, []);

  useEffect(() => {
    if (!MEASUREMENT_ID) return;

    if (granted) {
      initGoogleAnalytics(window, MEASUREMENT_ID);
      setAnalyticsConsent(window, MEASUREMENT_ID, true);
      setScriptRequested(true);
    } else if (scriptRequested) {
      setAnalyticsConsent(window, MEASUREMENT_ID, false);
      deleteGoogleAnalyticsCookies(document, window.location.hostname);
    }
  }, [granted, scriptRequested]);

  // /admin never loads analytics, and a visitor who reaches it by client-side
  // navigation sends nothing from it.
  if (!enabled || !granted || !scriptRequested) return null;

  return (
    <>
      <Script
        id="maris-ga4"
        src={`${GA_SCRIPT_ORIGIN}/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
