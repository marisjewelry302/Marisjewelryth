import { NextResponse } from "next/server";

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
  const secret = request.headers.get("x-maris-webhook-secret") || null;
  const configuredSecret = process.env.MARIS_PAYMENT_WEBHOOK_SECRET || "";

  if (configuredSecret && secret !== configuredSecret) {
    return json({ error: "Invalid webhook signature or secret." }, 401);
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  // TODO: Validate gateway signature, parse the payment payload, match the order,
  // TODO: create a `payments` record, and update the order status only when the
  // TODO: gateway confirms a real paid event.
  // TODO: Do not allow the frontend to mark orders as paid directly.

  return json({
    success: true,
    message: "Payment webhook received. Implement gateway-specific parsing and order fulfillment in this route."
  });
}
