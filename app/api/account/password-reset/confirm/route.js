import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getCustomerAuthConfig } from "@/app/lib/customer-auth";
import { PASSWORD_MIN_LENGTH } from "@/app/lib/customer-password-reset";
import { resetCustomerPasswordWithToken } from "@/app/lib/customer-users";
import { consumeAuthAttempt } from "@/app/lib/auth-rate-limit";
import { isSameOriginRequest } from "@/app/lib/request-security";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

const TOKEN_ERRORS = {
  expired: "This reset link has expired.",
  invalid: "This reset link is not valid.",
  used: "This reset link has already been used."
};

// POST /api/account/password-reset/confirm
// Body: { token, newPassword }
export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Cross-origin request blocked.", code: "cross_origin" }, { status: 403, headers: NO_STORE });
    }

    if (!getCustomerAuthConfig().isConfigured) {
      return NextResponse.json({ error: "Service unavailable.", code: "service_unavailable" }, { status: 503, headers: NO_STORE });
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || "");
    const newPassword = String(body?.newPassword || "");

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, code: "password_too_short" },
        { status: 400, headers: NO_STORE }
      );
    }

    // Per caller: guessing signed tokens is hopeless, this only caps abuse.
    const rateLimit = await consumeAuthAttempt({
      request,
      action: "customer_password_reset_confirm",
      identifier: "confirm",
      maxAttempts: 10,
      blockSeconds: 30 * 60
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

    const result = await resetCustomerPasswordWithToken(token, newPassword);

    if (result.status === "not_configured") {
      return NextResponse.json({ error: "Service unavailable.", code: "service_unavailable" }, { status: 503, headers: NO_STORE });
    }

    if (result.status === "invalid_password") {
      return NextResponse.json({ error: "Password is too short.", code: "password_too_short" }, { status: 400, headers: NO_STORE });
    }

    if (result.status !== "reset") {
      const code = TOKEN_ERRORS[result.status] ? `token_${result.status}` : "token_invalid";
      return NextResponse.json(
        { error: TOKEN_ERRORS[result.status] || TOKEN_ERRORS.invalid, code },
        { status: 400, headers: NO_STORE }
      );
    }

    await consumeAuthAttempt({
      request,
      action: "customer_password_reset_confirm",
      identifier: "confirm",
      maxAttempts: 10,
      blockSeconds: 30 * 60,
      success: true
    });

    // Sessions are stateless signed cookies with no server-side record, so a
    // session on another device cannot be revoked. Sign this browser out so the
    // person lands on the sign-in form and uses the new password.
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error("Password reset confirm error:", error?.message);
    return NextResponse.json({ error: "Something went wrong.", code: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
