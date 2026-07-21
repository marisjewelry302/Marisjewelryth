import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createAdminSession
} from "../../../lib/admin-auth";
import { createInitialAdminUser } from "../../../lib/admin-users";
import { consumeAuthAttempt } from "../../../lib/auth-rate-limit";
import { isSameOriginRequest } from "../../../lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function GET(request) {
  return redirectTo(request, "/admin/setup");
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return redirectTo(request, "/admin/setup?error=security");
  }

  const formData = await request.formData();
  const username = String(formData.get("username") || "");
  const displayName = String(formData.get("displayName") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const rateLimit = await consumeAuthAttempt({
    request,
    action: "admin_setup",
    identifier: username,
    maxAttempts: 3,
    windowSeconds: 60 * 60,
    blockSeconds: 60 * 60
  });

  if (!rateLimit.allowed) {
    return redirectTo(request, "/admin/setup?error=rate_limit");
  }

  if (password !== confirmPassword) {
    return redirectTo(request, "/admin/setup?error=mismatch");
  }

  let createResult;

  try {
    createResult = await createInitialAdminUser({
      username,
      displayName,
      password
    });
  } catch (error) {
    return redirectTo(request, "/admin/setup?error=database");
  }

  if (createResult.status === "not_configured") {
    return redirectTo(request, "/admin/setup?error=database");
  }

  if (createResult.status === "already_exists") {
    return redirectTo(request, "/admin/login");
  }

  if (createResult.status !== "created") {
    return redirectTo(request, "/admin/setup?error=invalid");
  }

  await consumeAuthAttempt({
    request,
    action: "admin_setup",
    identifier: username,
    maxAttempts: 3,
    windowSeconds: 60 * 60,
    blockSeconds: 60 * 60,
    success: true
  });

  const response = redirectTo(request, "/admin");

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createAdminSession(createResult.user),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    priority: "high",
    path: "/"
  });

  return response;
}
