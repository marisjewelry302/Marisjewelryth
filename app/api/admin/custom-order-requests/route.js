import { NextResponse } from "next/server";

import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../lib/admin-api-auth";
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

export async function GET(request) {
  const authorization = await requireAdminPermission(request);
  if (!authorization.ok) return authorization.response;

  try {
    const requests = await readAdminCustomOrderRequests();
    return json(requests, requests.isConfigured ? 200 : 503);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Custom order requests could not be loaded." }, 500);
  }
}

export async function PATCH(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.OPERATIONS_WRITE);
  if (!authorization.ok) return authorization.response;

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
      actor: authorization.user.username
    });
    return json({ request: customRequest }, 200);
  } catch (error) {
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return json({ error: error instanceof Error ? error.message : "Custom request could not be updated." }, status);
  }
}
