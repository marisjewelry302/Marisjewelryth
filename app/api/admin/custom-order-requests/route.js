import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, verifyAdminSession } from "../../../lib/admin-auth";
import {
  readAdminCustomOrderRequests,
  updateAdminCustomOrderRequest
} from "../../../lib/maris-database";

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

function unauthorized() {
  return json({ error: "unauthorized" }, 401);
}

function getSession(request) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const verification = verifyAdminSession(session);

  if (!verification.isValid) {
    return null;
  }

  return verification;
}

function isSameOrigin(request) {
  const origin = request.headers.get("origin");

  return !origin || origin === request.nextUrl.origin;
}

export async function GET(request) {
  if (!getSession(request)) {
    return unauthorized();
  }

  try {
    const requests = await readAdminCustomOrderRequests();
    return json(requests, requests.isConfigured ? 200 : 503);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Custom order requests could not be loaded." }, 500);
  }
}

export async function PATCH(request) {
  const session = getSession(request);

  if (!session) {
    return unauthorized();
  }

  if (!isSameOrigin(request)) {
    return json({ error: "Cross-origin admin updates are not allowed." }, 403);
  }

  const requestId = request.nextUrl.searchParams.get("id");

  if (!requestId) {
    return json({ error: "Custom request id is required." }, 400);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const customRequest = await updateAdminCustomOrderRequest(requestId, body, {
      actor: session.username
    });
    return json({ request: customRequest }, 200);
  } catch (error) {
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return json({ error: error instanceof Error ? error.message : "Custom request could not be updated." }, status);
  }
}
