import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyCustomerSession, SESSION_COOKIE_NAME } from "@/app/lib/customer-auth";
import { updateCustomerProfile, changeCustomerPassword } from "@/app/lib/customer-users";
import { consumeAuthAttempt } from "@/app/lib/auth-rate-limit";
import { isSameOriginRequest } from "@/app/lib/request-security";

// PATCH /api/account/profile
// Body: { fullName?, phone?, lineId?, service? }
export async function PATCH(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = verifyCustomerSession(sessionToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await request.json();
    const result = await updateCustomerProfile(session.customerId, body);

    if (result.status === "not_configured") {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    return NextResponse.json({ customer: result.customer });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// POST /api/account/profile (change password)
// Body: { currentPassword, newPassword }
export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = verifyCustomerSession(sessionToken);

    if (!session.isValid) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const rateLimit = await consumeAuthAttempt({
      request,
      action: "customer_password_change",
      identifier: session.customerId,
      maxAttempts: 5,
      blockSeconds: 60 * 60
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many password attempts. Please try again later." },
        {
          status: rateLimit.status === "not_configured" ? 503 : 429,
          headers: rateLimit.retryAfterSeconds
            ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
            : undefined
        }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    const result = await changeCustomerPassword(session.customerId, currentPassword, newPassword);

    if (result.status === "wrong_password") {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    if (result.status === "invalid") {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    await consumeAuthAttempt({
      request,
      action: "customer_password_change",
      identifier: session.customerId,
      maxAttempts: 5,
      blockSeconds: 60 * 60,
      success: true
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
