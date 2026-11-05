import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyCustomerSession } from "@/app/lib/customer-auth";
import { deleteCustomerAccount } from "@/app/lib/customer-users";
import { consumeAuthAttempt } from "@/app/lib/auth-rate-limit";
import { isSameOriginRequest } from "@/app/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/account/delete
// Body: { password }
// The password is asked for again so a signed-in browser left open on someone
// else's screen cannot erase the account.
export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
    }

    const cookieStore = await cookies();
    const session = verifyCustomerSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

    if (!session.isValid) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const rateLimit = await consumeAuthAttempt({
      request,
      action: "customer_account_delete",
      identifier: session.customerId,
      maxAttempts: 5,
      blockSeconds: 60 * 60
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: rateLimit.status === "not_configured" ? 503 : 429,
          headers: rateLimit.retryAfterSeconds
            ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
            : undefined
        }
      );
    }

    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result = await deleteCustomerAccount(session.customerId, String(body?.password || ""));

    if (result.status === "not_configured") {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    if (result.status === "wrong_password") {
      return NextResponse.json({ error: "Password is incorrect." }, { status: 400 });
    }

    if (result.status !== "deleted") {
      return NextResponse.json({ error: "Could not delete account." }, { status: 404 });
    }

    await consumeAuthAttempt({
      request,
      action: "customer_account_delete",
      identifier: session.customerId,
      maxAttempts: 5,
      blockSeconds: 60 * 60,
      success: true
    });

    cookieStore.delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
