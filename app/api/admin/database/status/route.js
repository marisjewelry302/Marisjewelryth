import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "../../../../lib/admin-auth";
import { readAdminDatabaseStatus } from "../../../../lib/maris-database";

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
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!verifyAdminSession(session).isValid) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const status = await readAdminDatabaseStatus();

    return json(status, status.isConfigured ? 200 : 503);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Database status check failed"
    }, 500);
  }
}
