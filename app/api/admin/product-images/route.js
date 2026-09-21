import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../lib/admin-api-auth";
import {
  assignAdminProductImageRole,
  deleteAdminProductImage,
  reorderAdminProductImages
} from "../../../lib/maris-database";

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
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_WRITE);
  if (!authorization.ok) return authorization.response;

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    // One PATCH covers both edits the admin gallery makes: moving an image into a
    // cover slot or the info set, and reordering the images within one role.
    const result = body.action === "assign-role"
      ? await assignAdminProductImageRole({
          productId: body.productId,
          imageId: body.imageId,
          role: body.role,
          slot: body.slot
        })
      : await reorderAdminProductImages({
          productId: body.productId,
          imageIds: body.imageIds,
          role: body.role
        });

    return json(result, 200);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Product image order could not be updated."
    }, getErrorStatus(error));
  }
}

export async function DELETE(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_WRITE);
  if (!authorization.ok) return authorization.response;

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
