import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createCustomerSession, getCustomerAuthConfig, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/app/lib/customer-auth";
import { createCustomer } from "@/app/lib/customer-users";
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
    const { fullName, email, phone, password } = body;
    const rateLimit = await consumeAuthAttempt({
      request,
      action: "customer_signup",
      identifier: email,
      maxAttempts: 4,
      windowSeconds: 60 * 60,
      blockSeconds: 60 * 60
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many account creation attempts. Please try again later." },
        {
          status: rateLimit.status === "not_configured" ? 503 : 429,
          headers: rateLimit.retryAfterSeconds
            ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
            : undefined
        }
      );
    }

    const result = await createCustomer({ fullName, email, phone, password });

    if (result.status === "invalid") {
      return NextResponse.json({ error: result.message || "Invalid input." }, { status: 400 });
    }

    if (result.status === "duplicate_email") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    if (result.status === "not_configured") {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    if (result.status !== "created") {
      return NextResponse.json({ error: "Could not create account." }, { status: 500 });
    }

    await consumeAuthAttempt({
      request,
      action: "customer_signup",
      identifier: email,
      maxAttempts: 4,
      windowSeconds: 60 * 60,
      blockSeconds: 60 * 60,
      success: true
    });

    // Create session cookie
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

    return NextResponse.json({ customer: result.customer }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
