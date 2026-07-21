import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../lib/admin-api-auth";
import { readAdminCustomers } from "../../../lib/maris-database";

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
    const customers = await readAdminCustomers();
    return json(customers, customers.isConfigured ? 200 : 503);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Customers could not be loaded." }, 500);
  }
}
