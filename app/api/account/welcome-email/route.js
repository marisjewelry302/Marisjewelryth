import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyCustomerSession } from "@/app/lib/customer-auth";
import { sendWelcomeEmail } from "@/app/lib/customer-email";
import { markWelcomeEmailSent, upsertEmailSubscriber } from "@/app/lib/customer-subscribers";
import { getCustomerById } from "@/app/lib/customer-users";
import { isSameOriginRequest } from "@/app/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store"
    }
  });
}

async function getSignedInCustomer() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = verifyCustomerSession(sessionToken);

  if (!session.isValid) {
    return null;
  }

  return getCustomerById(session.customerId);
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Cross-origin request blocked." }, 403);
  }

  const customer = await getSignedInCustomer();

  if (!customer) {
    return json({ error: "Not signed in." }, 401);
  }

  let body = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const subscriberResult = await upsertEmailSubscriber({
      email: customer.email,
      source: body?.source || "account",
      customerId: customer.id
    });

    if (subscriberResult.status === "not_configured") {
      return json({ error: "Subscriber service unavailable." }, 503);
    }

    if (subscriberResult.status !== "ready") {
      return json({ error: "Subscriber could not be saved." }, 400);
    }

    if (subscriberResult.subscriber?.welcomeEmailSentAt) {
      return json({ status: "already_sent" });
    }

    const emailResult = await sendWelcomeEmail(customer);

    if (emailResult.status === "not_configured") {
      return json({ error: "Email service unavailable." }, 503);
    }

    if (emailResult.status !== "sent") {
      return json({ error: "Welcome email could not be sent." }, 400);
    }

    await markWelcomeEmailSent(customer.email, {
      customerId: customer.id,
      resendEmailId: emailResult.id
    });

    return json({ status: "sent", id: emailResult.id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Welcome email could not be sent." }, 500);
  }
}
