import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createCustomerSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/app/lib/customer-auth";
import { authenticateCustomer } from "@/app/lib/customer-users";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const result = await authenticateCustomer(email, password);

    if (result.status === "not_configured") {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    if (result.status !== "valid") {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const sessionToken = createCustomerSession(result.customer);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/"
    });

    return NextResponse.json({ customer: result.customer });
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
