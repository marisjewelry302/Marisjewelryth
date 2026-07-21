import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createAdminSession,
} from "../../../lib/admin-auth";
import { authenticateAdminUser, getAdminSetupState } from "../../../lib/admin-users";
import { consumeAuthAttempt } from "../../../lib/auth-rate-limit";
import { isSameOriginRequest } from "../../../lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function GET(request) {
  return redirectTo(request, "/admin/login");
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return redirectTo(request, "/admin/login?error=security");
  }

  let setupState;

  try {
    setupState = await getAdminSetupState();
  } catch (error) {
    return redirectTo(request, "/admin/login?error=database");
  }

  if (!setupState.isConfigured) {
    return redirectTo(request, "/admin/setup?error=database");
  }

  if (setupState.canCreateInitialAdmin) {
    return redirectTo(request, "/admin/setup");
  }

  const formData = await request.formData();
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  const rateLimit = await consumeAuthAttempt({
    request,
    action: "admin_login",
    identifier: username,
    maxAttempts: 5,
    blockSeconds: 60 * 60
  });

  if (!rateLimit.allowed) {
    return redirectTo(request, "/admin/login?error=rate_limit");
  }

  const authResult = await authenticateAdminUser(username, password);

  if (authResult.status !== "valid") {
    return redirectTo(request, "/admin/login?error=invalid");
  }

  await consumeAuthAttempt({
    request,
    action: "admin_login",
    identifier: username,
    maxAttempts: 5,
    blockSeconds: 60 * 60,
    success: true
  });

  const response = redirectTo(request, "/admin");

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createAdminSession(authResult.user),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    priority: "high",
    path: "/"
  });

  return response;
}
