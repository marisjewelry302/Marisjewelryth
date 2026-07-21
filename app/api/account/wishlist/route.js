import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyCustomerSession } from "@/app/lib/customer-auth";
import { readCustomerWishlist, replaceCustomerWishlist } from "@/app/lib/customer-collections";
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

async function getSessionCustomerId() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = verifyCustomerSession(sessionToken);

  return session.isValid ? session.customerId : null;
}

function unauthorized() {
  return json({ error: "Not signed in." }, 401);
}

export async function GET() {
  const customerId = await getSessionCustomerId();

  if (!customerId) {
    return unauthorized();
  }

  try {
    const result = await readCustomerWishlist(customerId);

    if (result.status === "not_configured") {
      return json({ error: "Service unavailable.", items: [] }, 503);
    }

    return json({ items: result.items });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Wishlist could not be loaded." }, 500);
  }
}

async function saveWishlist(request) {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Cross-origin request blocked." }, 403);
  }

  const customerId = await getSessionCustomerId();

  if (!customerId) {
    return unauthorized();
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  if (!Array.isArray(body?.items)) {
    return json({ error: "Wishlist items are required." }, 400);
  }

  try {
    const result = await replaceCustomerWishlist(customerId, body.items);

    if (result.status === "not_configured") {
      return json({ error: "Service unavailable.", items: [] }, 503);
    }

    return json({ items: result.items });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Wishlist could not be saved." }, 500);
  }
}

export async function PUT(request) {
  return saveWishlist(request);
}

export async function POST(request) {
  return saveWishlist(request);
}

