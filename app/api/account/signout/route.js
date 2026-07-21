// ─── POST /api/account/signout ─────────────────────────────────────────────
// Save this as: app/api/account/signout/route.js

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/app/lib/customer-auth";
import { isSameOriginRequest } from "@/app/lib/request-security";

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
