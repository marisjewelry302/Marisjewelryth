import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createCustomerSession, getCustomerAuthConfig, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/app/lib/customer-auth";
import { authenticateCustomer } from "@/app/lib/customer-users";
import { consumeAuthAttempt } from "@/app/lib/auth-rate-limit";
import { isSameOriginRequest } from "@/app/lib/request-security";

export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
    }

    const authConfig = getCustomerAuthConfig();

    if (!authConfig.isConfigured) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    const body = await request.json();
    const { email, password } = body;
    const rateLimit = await consumeAuthAttempt({
      request,
      action: "customer_signin",
      identifier: email
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again later." },
        {
          status: rateLimit.status === "not_configured" ? 503 : 429,
          headers: rateLimit.retryAfterSeconds
            ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
            : undefined
        }
      );
    }

    const result = await authenticateCustomer(email, password);

    if (result.status === "not_configured") {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    if (result.status !== "valid") {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    await consumeAuthAttempt({
      request,
      action: "customer_signin",
      identifier: email,
      success: true
    });

    const sessionToken = createCustomerSession(result.customer);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      priority: "high",
      path: "/"
    });

    return NextResponse.json({ customer: result.customer });
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
