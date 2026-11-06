import {
  customerUpdateWholesaleOrder,
  readCustomerWholesaleOrders,
  readWholesaleOrderById,
  submitWholesaleOrder
} from "../../../lib/maris-database.js";
import { WHOLESALE_CUSTOMER_ACTIONS, isUuid, normalizeWholesaleOrderInput } from "../../../lib/wholesale.js";
import { buildWholesaleOrderEmail, sendWholesaleEmail } from "../../../lib/wholesale-email.js";
import { requireWholesaleCustomer, wholesaleJson } from "../../../lib/wholesale-session.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error, fallback) {
  const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  if (status === 500) console.error(fallback, error);
  return wholesaleJson({ error: status === 500 ? fallback : error.message }, status);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const context = await requireWholesaleCustomer(request, { requireApproved: true });
    if (!context.ok) return context.response;

    const result = await readCustomerWholesaleOrders(context.account.id);
    if (!result.isConfigured) return wholesaleJson({ error: "Service unavailable." }, 503);

    return wholesaleJson({ orders: result.orders });
  } catch (error) {
    return errorResponse(error, "Wholesale orders could not be loaded.");
  }
}

export async function POST(request) {
  try {
    const context = await requireWholesaleCustomer(request, { requireApproved: true });
    if (!context.ok) return context.response;

    const body = await readJson(request);
    if (!body) return wholesaleJson({ error: "Invalid JSON payload." }, 400);

    const { order, errors } = normalizeWholesaleOrderInput(body);
    if (errors.length) {
      return wholesaleJson({ status: "invalid", error: "Please check the order details.", errors }, 400);
    }

    const result = await submitWholesaleOrder(context.customer.id, order);
    if (!result.isConfigured) return wholesaleJson({ error: "Service unavailable." }, 503);

    const { orderId, idempotent } = result.result || {};
    const saved = await readWholesaleOrderById(orderId);

    if (!idempotent && saved.order) {
      try {
        await sendWholesaleEmail(buildWholesaleOrderEmail({ order: saved.order }), {
          idempotencyKey: `wholesale-order-${orderId}`,
          replyTo: context.customer.email
        });
      } catch (emailError) {
        console.error("Wholesale order email failed", emailError);
      }
    }

    const customerOrder = (await readWholesaleOrderById(orderId, { forCustomer: true })).order;
    return wholesaleJson({ status: idempotent ? "duplicate" : "created", order: customerOrder }, idempotent ? 200 : 201);
  } catch (error) {
    return errorResponse(error, "Purchase order could not be submitted.");
  }
}

export async function PATCH(request) {
  try {
    const context = await requireWholesaleCustomer(request, { requireApproved: true });
    if (!context.ok) return context.response;

    const orderId = request.nextUrl.searchParams.get("id");
    if (!isUuid(orderId)) return wholesaleJson({ error: "Order id is required." }, 400);

    const body = await readJson(request);
    const action = String(body?.action || "");
    if (!Object.hasOwn(WHOLESALE_CUSTOMER_ACTIONS, action)) {
      return wholesaleJson({ error: "Unsupported action." }, 400);
    }

    const note = String(body?.note || "").trim().slice(0, 1000);
    const result = await customerUpdateWholesaleOrder(context.customer.id, orderId, action, note);
    if (!result.isConfigured) return wholesaleJson({ error: "Service unavailable." }, 503);

    const updated = await readWholesaleOrderById(orderId, { forCustomer: true });
    return wholesaleJson({ order: updated.order });
  } catch (error) {
    return errorResponse(error, "Order could not be updated.");
  }
}
