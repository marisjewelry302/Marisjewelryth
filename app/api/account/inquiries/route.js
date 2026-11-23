import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyCustomerSession, SESSION_COOKIE_NAME } from "@/app/lib/customer-auth";
import { readCustomerInquiries } from "@/app/lib/maris-database";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

// GET /api/account/inquiries
// The signed-in customer's own enquiries and quote requests, newest first. The
// customer comes from the verified session cookie; there is no id or email
// parameter, so nobody can ask for someone else's records.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = verifyCustomerSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

    if (!session.isValid) {
      return NextResponse.json({ error: "Not signed in.", code: "not_signed_in" }, { status: 401, headers: NO_STORE });
    }

    const result = await readCustomerInquiries(session.customerId);

    if (result.status === "not_configured") {
      return NextResponse.json({ error: "Service unavailable.", code: "service_unavailable" }, { status: 503, headers: NO_STORE });
    }

    return NextResponse.json(
      { inquiries: result.inquiries, quoteCount: result.quoteCount, total: result.total },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("Account inquiries error:", error?.message);
    return NextResponse.json({ error: "Something went wrong.", code: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
