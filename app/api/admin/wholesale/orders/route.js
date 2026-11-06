import { NextResponse } from "next/server";

import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../../lib/admin-api-auth";
import { adminRoleHasPermission } from "../../../../lib/admin-authorization";
import { readAdminWholesaleOrders, updateAdminWholesaleOrder } from "../../../../lib/maris-database";
import { isUuid, normalizeAdminOrderAction } from "../../../../lib/wholesale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "private, no-store" } });
}

function errorResponse(error, fallback) {
  const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  return json({ error: error instanceof Error && status !== 500 ? error.message : fallback }, status);
}

export async function GET(request) {
  const authorization = await requireAdminPermission(request);
  if (!authorization.ok) return authorization.response;

  try {
    const result = await readAdminWholesaleOrders();
    return json(result, result.isConfigured ? 200 : 503);
  } catch (error) {
    return errorResponse(error, "Wholesale orders could not be loaded.");
  }
}

// Status moves are operations work; quoting sets prices, so it needs the
// same catalogue write access as editing wholesale pricing.
export async function PATCH(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.OPERATIONS_WRITE);
  if (!authorization.ok) return authorization.response;

  const orderId = request.nextUrl.searchParams.get("id");

  let body;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (body?.action === "quote" && !adminRoleHasPermission(authorization.user.role, ADMIN_PERMISSIONS.CATALOGUE_WRITE)) {
    return json({ error: "Only managers can set quoted prices." }, 403);
  }

  if (!isUuid(orderId)) return json({ error: "Order id is required." }, 400);
  if (!body) return json({ error: "Invalid JSON payload." }, 400);

  const { command, errors } = normalizeAdminOrderAction(body);
  if (errors.length) return json({ error: "Please check the order update.", errors }, 400);

  try {
    const result = await updateAdminWholesaleOrder(orderId, command, { actor: authorization.user.username });
    return json(result, result.isConfigured ? 200 : 503);
  } catch (error) {
    return errorResponse(error, "Wholesale order could not be updated.");
  }
}
