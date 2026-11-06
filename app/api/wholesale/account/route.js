import { consumeAuthAttempt } from "../../../lib/auth-rate-limit.js";
import { submitWholesaleApplication } from "../../../lib/maris-database.js";
import { normalizeWholesaleApplication } from "../../../lib/wholesale.js";
import { buildWholesaleApplicationEmail, sendWholesaleEmail } from "../../../lib/wholesale-email.js";
import { requireWholesaleCustomer, wholesaleJson } from "../../../lib/wholesale-session.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error, fallback) {
  const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  if (status === 500) console.error(fallback, error);
  return wholesaleJson({ error: status === 500 ? fallback : error.message }, status);
}

export async function GET(request) {
  try {
    const context = await requireWholesaleCustomer(request);
    if (!context.ok) return context.response;

    return wholesaleJson({
      customer: {
        fullName: context.customer.fullName,
        email: context.customer.email,
        phone: context.customer.phone
      },
      account: context.account
    });
  } catch (error) {
    return errorResponse(error, "Wholesale account could not be loaded.");
  }
}

export async function POST(request) {
  try {
    const context = await requireWholesaleCustomer(request);
    if (!context.ok) return context.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return wholesaleJson({ error: "Invalid JSON payload." }, 400);
    }

    const { application, errors } = normalizeWholesaleApplication(body);
    if (errors.length) {
      return wholesaleJson({ status: "invalid", error: "Please check the highlighted fields.", errors }, 400);
    }

    const rateLimit = await consumeAuthAttempt({
      request,
      action: "wholesale_apply",
      identifier: context.customer.id,
      maxAttempts: 5,
      windowSeconds: 60 * 60,
      blockSeconds: 60 * 60
    });

    if (!rateLimit.allowed) {
      return wholesaleJson(
        { error: "Too many submissions. Please try again later." },
        rateLimit.status === "not_configured" ? 503 : 429
      );
    }

    const result = await submitWholesaleApplication(context.customer.id, application);
    if (!result.isConfigured) return wholesaleJson({ error: "Service unavailable." }, 503);

    try {
      await sendWholesaleEmail(
        buildWholesaleApplicationEmail({ account: result.account, customerEmail: context.customer.email, isNew: result.isNew }),
        { idempotencyKey: `wholesale-application-${result.account.id}-${result.account.updatedAt}`, replyTo: context.customer.email }
      );
    } catch (emailError) {
      console.error("Wholesale application email failed", emailError);
    }

    return wholesaleJson({ status: result.isNew ? "created" : "updated", account: result.account }, result.isNew ? 201 : 200);
  } catch (error) {
    return errorResponse(error, "Wholesale application could not be saved.");
  }
}
