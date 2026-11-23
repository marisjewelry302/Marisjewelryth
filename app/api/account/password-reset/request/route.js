import { after, NextResponse } from "next/server";
import { getCustomerAuthConfig } from "@/app/lib/customer-auth";
import { getCustomerEmailConfig } from "@/app/lib/customer-email";
import { requestCustomerPasswordReset } from "@/app/lib/customer-users";
import { consumeAuthAttempt } from "@/app/lib/auth-rate-limit";
import { isSameOriginRequest } from "@/app/lib/request-security";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

// POST /api/account/password-reset/request
// Body: { email, locale? }
//
// Every request for a well-formed address gets the same answer and takes the
// same time, whether or not an account exists: the lookup and the email run
// after the response is sent. Rate limiting is keyed on the address and the
// caller, never on whether the account exists.
export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Cross-origin request blocked.", code: "cross_origin" }, { status: 403, headers: NO_STORE });
    }

    // Deployment state, identical for every visitor, so it reveals nothing about accounts.
    if (!getCustomerAuthConfig().isConfigured || !getCustomerEmailConfig().isConfigured) {
      return NextResponse.json({ error: "Service unavailable.", code: "service_unavailable" }, { status: 503, headers: NO_STORE });
    }

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const locale = body?.locale === "th" ? "th" : "en";

    if (!email) {
      return NextResponse.json({ error: "Please enter a valid email address.", code: "invalid_email" }, { status: 400, headers: NO_STORE });
    }

    const rateLimit = await consumeAuthAttempt({
      request,
      action: "customer_password_reset_request",
      identifier: email,
      maxAttempts: 3,
      windowSeconds: 60 * 60,
      blockSeconds: 60 * 60
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", code: "rate_limited" },
        {
          status: rateLimit.status === "not_configured" ? 503 : 429,
          headers: {
            ...NO_STORE,
            ...(rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : {})
          }
        }
      );
    }

    after(async () => {
      try {
        await requestCustomerPasswordReset(email, { locale });
      } catch (error) {
        // Logged without the address or any link.
        console.error("Password reset request failed:", error?.statusCode || error?.message);
      }
    });

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error("Password reset request error:", error?.message);
    return NextResponse.json({ error: "Something went wrong.", code: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
