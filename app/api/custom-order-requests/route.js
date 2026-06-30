import { NextResponse } from "next/server.js";

import { sendCustomOrderEmails } from "../../lib/custom-order-email.js";
import { createCustomOrderRequest } from "../../lib/custom-order-requests.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PARTIAL_EMAIL_ERROR = "Your request was saved, but notification email could not be sent.";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store"
    }
  });
}

function partialEmailFailure(result, status) {
  return json({
    status: "email_failed",
    requestId: result.requestId,
    requestStatus: result.requestStatus,
    error: PARTIAL_EMAIL_ERROR
  }, status);
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const result = await createCustomOrderRequest(body, {
      sendEmails: (context) => sendCustomOrderEmails(context)
    });

    if (result.status === "created") {
      return json({
        status: "created",
        requestId: result.requestId,
        requestStatus: result.requestStatus
      }, 201);
    }

    if (result.status === "duplicate") {
      return json({
        status: "duplicate",
        requestId: result.requestId,
        requestStatus: result.requestStatus
      }, 200);
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
        error: "Too many requests. Please try again later."
      }, 429);
    }

    if (result.status === "not_configured") {
      return json({
        status: "not_configured",
        error: "Service unavailable."
      }, 503);
    }

    if (result.status === "email_not_configured") {
      return partialEmailFailure(result, 503);
    }

    if (result.status === "email_failed") {
      return partialEmailFailure(result, 500);
    }

    return json({ error: "Custom order request could not be sent." }, 500);
  } catch (error) {
    console.error("Custom order request failed", error);
    return json({ error: "Custom order request could not be sent." }, 500);
  }
}
