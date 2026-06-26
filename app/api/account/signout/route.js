// ─── POST /api/account/signout ─────────────────────────────────────────────
// Save this as: app/api/account/signout/route.js

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/app/lib/customer-auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
