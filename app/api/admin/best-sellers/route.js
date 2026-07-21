import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../lib/admin-api-auth";
import { readAdminBestSellerSettings, updateAdminBestSellerSettings } from "../../../lib/maris-database";

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
    const settings = await readAdminBestSellerSettings();
    return json(settings, settings.isConfigured ? 200 : 503);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Best Seller settings could not be loaded." }, 500);
  }
}

export async function PATCH(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.SETTINGS_WRITE);
  if (!authorization.ok) return authorization.response;

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const settings = await updateAdminBestSellerSettings(body.productIds);
    return json(settings, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Best Seller settings could not be saved." }, 500);
  }
}
