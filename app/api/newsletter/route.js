import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { subscribeToNewsletter } from "../../lib/customer-subscribers.js";
import { normalizeMarketingEmail } from "../../lib/customer-email.js";
import { isSameOriginRequest } from "../../lib/request-security.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `source` is only a label for where the signup came from, but it is written to
// the row, so it is matched against a known set rather than stored verbatim.
// Must cover every place NewsletterSignup is mounted, or that signup is
// recorded under the fallback and the source column stops meaning anything.
const ALLOWED_SOURCES = new Set(["footer", "newsletter-page", "popup"]);
const DEFAULT_SOURCE = "newsletter";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store"
    }
  });
}

// The subscriber table keys on email, so one address is one row no matter how
// often it is submitted. The flood worth stopping is a script cycling through
// many addresses, which this key groups by caller rather than by address.
// Same reasoning as app/lib/auth-rate-limit.js: only the deployment proxy may
// decide who the caller is, so the client-settable chain is a last resort read
// from the right.
function getClientKey(request) {
  const trusted = request.headers.get("x-vercel-forwarded-for")
    || request.headers.get("x-real-ip");
  const chain = String(request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const caller = trusted?.trim() || chain.at(-1) || "unknown";

  // Hashed before it is stored: the throttle only needs to tell callers apart,
  // and a mailing list is no place to keep visitor IP addresses.
  return createHash("sha256").update(caller).digest("hex");
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Cross-origin request blocked." }, 403);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  // Checked here as well as inside subscribeToNewsletter so a bad address is
  // refused before any database round trip.
  const email = normalizeMarketingEmail(body?.email);

  if (!email) {
    return json({ status: "invalid", error: "Please enter a valid email address." }, 400);
  }

  const source = ALLOWED_SOURCES.has(body?.source) ? body.source : DEFAULT_SOURCE;

  try {
    const result = await subscribeToNewsletter({
      email,
      source,
      clientKey: getClientKey(request)
    });

    if (result.status === "ready") {
      return json({ status: "subscribed" }, 201);
    }

    if (result.status === "invalid") {
      return json({ status: "invalid", error: "Please enter a valid email address." }, 400);
    }

    if (result.status === "rate_limited") {
      return json({ status: "rate_limited", error: "Too many signups from here. Please try again later." }, 429);
    }

    if (result.status === "not_configured") {
      return json({ status: "not_configured", error: "Service unavailable." }, 503);
    }

    return json({ error: "You could not be added to the list." }, 500);
  } catch (error) {
    console.error("Newsletter signup failed", error);
    return json({ error: "You could not be added to the list." }, 500);
  }
}
