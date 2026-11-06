import { NextResponse } from "next/server";

import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../../lib/admin-api-auth";
import { readAdminWholesaleAccounts, updateAdminWholesaleAccount } from "../../../../lib/maris-database";
import { isUuid, normalizeAdminAccountUpdate } from "../../../../lib/wholesale";

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
    const result = await readAdminWholesaleAccounts();
    return json(result, result.isConfigured ? 200 : 503);
  } catch (error) {
    return errorResponse(error, "Wholesale accounts could not be loaded.");
  }
}

// Approving an account and setting its discount are pricing decisions, so
// they need catalogue write access, not just operations.
export async function PATCH(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_WRITE);
  if (!authorization.ok) return authorization.response;

  const accountId = request.nextUrl.searchParams.get("id");
  if (!isUuid(accountId)) return json({ error: "Account id is required." }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  const { update, errors } = normalizeAdminAccountUpdate(body);
  if (errors.length) return json({ error: "Please check the account fields.", errors }, 400);

  try {
    const result = await updateAdminWholesaleAccount(accountId, update, { actor: authorization.user.username });
    return json(result, result.isConfigured ? 200 : 503);
  } catch (error) {
    return errorResponse(error, "Wholesale account could not be updated.");
  }
}
