import { NextResponse } from "next/server";

import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../../lib/admin-api-auth";
import { readAdminWholesalePricing, setAdminProductWholesalePricing } from "../../../../lib/maris-database";
import { isUuid, normalizeWholesalePricingInput } from "../../../../lib/wholesale";

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
    const result = await readAdminWholesalePricing();
    return json(result, result.isConfigured ? 200 : 503);
  } catch (error) {
    return errorResponse(error, "Wholesale pricing could not be loaded.");
  }
}

export async function PUT(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_WRITE);
  if (!authorization.ok) return authorization.response;

  const productId = request.nextUrl.searchParams.get("productId");
  if (!isUuid(productId)) return json({ error: "Product id is required." }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  const { pricing, errors } = normalizeWholesalePricingInput(body);
  if (errors.length) return json({ error: "Please check the wholesale terms.", errors }, 400);

  try {
    const result = await setAdminProductWholesalePricing(productId, pricing);
    return json(result, result.isConfigured ? 200 : 503);
  } catch (error) {
    return errorResponse(error, "Wholesale pricing could not be saved.");
  }
}
