import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "../../../lib/admin-auth";
import { deleteAdminProductImage, reorderAdminProductImages } from "../../../lib/maris-database";

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

function unauthorized() {
  return json({ error: "unauthorized" }, 401);
}

function getSession(request) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!verifyAdminSession(session).isValid) {
    return null;
  }

  return session;
}

function getErrorStatus(error) {
  if (error?.statusCode) {
    return error.statusCode;
  }

  if (error instanceof Error && /Supabase admin database is not configured/i.test(error.message)) {
    return 503;
  }

  return 500;
}

export async function PATCH(request) {
  if (!getSession(request)) {
    return unauthorized();
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const result = await reorderAdminProductImages({
      productId: body.productId,
      imageIds: body.imageIds
    });

    return json(result, 200);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Product image order could not be updated."
    }, getErrorStatus(error));
  }
}

export async function DELETE(request) {
  if (!getSession(request)) {
    return unauthorized();
  }

  const productId = request.nextUrl.searchParams.get("productId");
  const imageId = request.nextUrl.searchParams.get("imageId");

  try {
    const result = await deleteAdminProductImage({ productId, imageId });
    return json(result, 200);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Product image could not be deleted."
    }, getErrorStatus(error));
  }
}
