import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../lib/admin-api-auth";
import { createAdminOrder, readAdminOrders, updateAdminOrder } from "../../../lib/maris-database";

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
    const orders = await readAdminOrders();
    return json(orders, orders.isConfigured ? 200 : 503);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Orders could not be loaded." }, 500);
  }
}

export async function POST(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.OPERATIONS_WRITE);
  if (!authorization.ok) return authorization.response;

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const order = await createAdminOrder({
      ...body,
      createdBy: authorization.user.id
    });
    return json({ order }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Order could not be created." }, 500);
  }
}

export async function PATCH(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.OPERATIONS_WRITE);
  if (!authorization.ok) return authorization.response;

  const orderId = request.nextUrl.searchParams.get("id");

  if (!orderId) {
    return json({ error: "Order id is required." }, 400);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const order = await updateAdminOrder(orderId, {
      ...body,
      createdBy: authorization.user.id
    });
    return json({ order }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Order could not be updated." }, 500);
  }
}
