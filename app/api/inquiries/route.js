import { NextResponse } from "next/server";

import { createInquiry } from "../../lib/inquiries.js";
import { sendInquiryEmails } from "../../lib/inquiry-email.js";
import { isSameOriginRequest } from "../../lib/request-security.js";

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

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Cross-origin request blocked." }, 403);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const result = await createInquiry(body, {
      sendEmails: (context) => sendInquiryEmails(context)
    });

    if (result.status === "created") {
      return json({ status: "created", inquiryId: result.inquiryId }, 201);
    }

    // The row is already saved in both of these; the atelier can still see the
    // enquiry in the admin workspace, so the customer is told it went through.
    if (result.status === "email_not_configured" || result.status === "email_failed") {
      return json({ status: "created", inquiryId: result.inquiryId, notified: false }, 201);
    }

    if (result.status === "duplicate") {
      return json({ status: "duplicate", inquiryId: result.inquiryId }, 200);
    }

    if (result.status === "invalid") {
      return json({
        status: "invalid",
        error: "Please check the form details.",
        errors: result.errors || []
      }, 400);
    }

    if (result.status === "rate_limited") {
      return json({
        status: "rate_limited",
        error: "Too many messages from this address. Please try again later."
      }, 429);
    }

    if (result.status === "not_configured") {
      return json({ status: "not_configured", error: "Service unavailable." }, 503);
    }

    return json({ error: "Your message could not be sent." }, 500);
  } catch (error) {
    console.error("Inquiry submission failed", error);
    return json({ error: "Your message could not be sent." }, 500);
  }
}
