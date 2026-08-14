import { NextResponse } from "next/server";

import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../lib/admin-api-auth";
import { readAdminInquiries, updateAdminInquiryStatus } from "../../../lib/maris-database";

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
    const result = await readAdminInquiries();
    return json(result, result.isConfigured ? 200 : 503);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Inquiries could not be loaded." }, 500);
  }
}

export async function PATCH(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.OPERATIONS_WRITE);
  if (!authorization.ok) return authorization.response;

  const inquiryId = request.nextUrl.searchParams.get("id");

  if (!inquiryId) {
    return json({ error: "Inquiry id is required." }, 400);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const result = await updateAdminInquiryStatus(inquiryId, body?.status);

    if (result.status === "invalid") return json({ error: result.message }, 400);
    if (result.status === "not_found") return json({ error: "Inquiry not found." }, 404);
    if (result.status === "not_configured") return json({ error: "Service unavailable." }, 503);

    return json({ inquiry: result.inquiry }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Inquiry could not be updated." }, 500);
  }
}
