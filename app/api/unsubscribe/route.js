import { NextResponse } from "next/server";

import { verifyUnsubscribeToken } from "../../lib/email-unsubscribe.js";
import { unsubscribeEmail } from "../../lib/customer-subscribers.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" }
  });
}

// Deliberately no same-origin check: mail providers call this endpoint
// themselves for one-click unsubscribe (RFC 8058), and the signed token in the
// request is what proves the caller holds a link we sent. A GET never changes
// anything, so link scanners that prefetch the email's URL cannot unsubscribe
// anyone; the person confirms on the /unsubscribe page instead.
async function readToken(request) {
  const fromQuery = new URL(request.url).searchParams.get("token");

  if (fromQuery) {
    return fromQuery;
  }

  try {
    const type = request.headers.get("content-type") || "";

    if (type.includes("application/json")) {
      const body = await request.json();
      return String(body?.token || "");
    }

    const form = await request.formData();
    return String(form.get("token") || "");
  } catch {
    return "";
  }
}

export async function POST(request) {
  const token = await readToken(request);
  const { isValid, email } = verifyUnsubscribeToken(token);

  if (!isValid) {
    return json({ error: "This unsubscribe link is not valid." }, 400);
  }

  try {
    const result = await unsubscribeEmail(email);

    if (result.status === "not_configured") {
      return json({ error: "Service unavailable." }, 503);
    }

    return json({ status: "unsubscribed" });
  } catch (error) {
    console.error("Unsubscribe failed", error);
    return json({ error: "You could not be unsubscribed. Please contact us." }, 500);
  }
}
