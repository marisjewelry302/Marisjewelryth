import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!verifyAdminSession(session).isValid) {
    return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  }

  const adminHtml = await readFile(path.join(process.cwd(), "pages", "admin.html"), "utf8");

  return new NextResponse(adminHtml, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
