import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyCustomerSession, SESSION_COOKIE_NAME } from "@/app/lib/customer-auth";
import { getCustomerById } from "@/app/lib/customer-users";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = verifyCustomerSession(sessionToken);

    if (!session.isValid) {
      return NextResponse.json({ customer: null });
    }

    const customer = await getCustomerById(session.customerId);

    if (!customer) {
      return NextResponse.json({ customer: null });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ customer: null });
  }
}
