import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "../../../lib/admin-auth";
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

function unauthorized() {
  return json({ error: "unauthorized" }, 401);
}

function getSession(request) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!verifyAdminSession(session).isValid) {
    return null;
  }

  return session;
}

export async function GET(request) {
  if (!getSession(request)) {
    return unauthorized();
  }

  try {
    const orders = await readAdminOrders();
    return json(orders, orders.isConfigured ? 200 : 503);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Orders could not be loaded." }, 500);
  }
}

export async function POST(request) {
  if (!getSession(request)) {
    return unauthorized();
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const order = await createAdminOrder(body);
    return json({ order }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Order could not be created." }, 500);
  }
}

export async function PATCH(request) {
  if (!getSession(request)) {
    return unauthorized();
  }

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
    const order = await updateAdminOrder(orderId, body);
    return json({ order }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Order could not be updated." }, 500);
  }
}
