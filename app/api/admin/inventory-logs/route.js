import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../lib/admin-api-auth";
import { createAdminInventoryLog, readAdminInventoryLogs } from "../../../lib/maris-database";

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
    const logs = await readAdminInventoryLogs();
    return json(logs, logs.isConfigured ? 200 : 503);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Inventory logs could not be loaded." }, 500);
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
    const log = await createAdminInventoryLog({
      ...body,
      createdBy: authorization.user.id
    });
    return json({ log }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Inventory log could not be created." }, 500);
  }
}
