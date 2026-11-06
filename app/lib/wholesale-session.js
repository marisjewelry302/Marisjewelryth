// Resolves the signed-in customer (and their wholesale account) for the
// /api/wholesale routes. Uses the same httpOnly maris_customer_session cookie
// as /api/account, and blocks cross-site writes like the other routes do.

import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, verifyCustomerSession } from "./customer-auth.js";
import { getCustomerById } from "./customer-users.js";
import { readWholesaleAccountForCustomer } from "./maris-database.js";
import { isSameOriginRequest, isUnsafeRequest } from "./request-security.js";

export function wholesaleJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" }
  });
}

// { ok: true, customer, account } or { ok: false, response }.
// requireApproved: the account must exist and be approved.
export async function requireWholesaleCustomer(request, { requireApproved = false } = {}) {
  if (isUnsafeRequest(request) && !isSameOriginRequest(request)) {
    return { ok: false, response: wholesaleJson({ error: "Cross-origin request blocked." }, 403) };
  }

  const session = verifyCustomerSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session.isValid) {
    const status = session.reason === "not_configured" ? 503 : 401;
    return { ok: false, response: wholesaleJson({ error: status === 503 ? "Service unavailable." : "Please sign in." }, status) };
  }

  const customer = await getCustomerById(session.customerId);

  if (!customer) {
    return { ok: false, response: wholesaleJson({ error: "Please sign in." }, 401) };
  }

  const result = await readWholesaleAccountForCustomer(customer.id);

  if (!result.isConfigured) {
    return { ok: false, response: wholesaleJson({ error: "Service unavailable." }, 503) };
  }

  if (requireApproved && result.account?.status !== "approved") {
    return { ok: false, response: wholesaleJson({ error: "Your wholesale account is not approved yet." }, 403) };
  }

  return { ok: true, customer, account: result.account };
}
