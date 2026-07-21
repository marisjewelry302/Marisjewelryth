import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "../../../lib/admin-auth";
import { isSameOriginRequest } from "../../../lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearSessionAndRedirect(request) {
  const response = NextResponse.redirect(new URL("/admin/login?logged_out=1", request.url), 303);

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });

  return response;
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  return clearSessionAndRedirect(request);
}
