import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "../../../lib/admin-auth";

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

export async function GET(request) {
  return clearSessionAndRedirect(request);
}

export async function POST(request) {
  return clearSessionAndRedirect(request);
}
