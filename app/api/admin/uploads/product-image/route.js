import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../../lib/admin-api-auth";
import { AdminProductImageUploadError, uploadAdminProductImage } from "../../../../lib/maris-database";

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
  if (error instanceof AdminProductImageUploadError) {
    return error.statusCode;
  }

  if (error instanceof Error && /Supabase admin database is not configured/i.test(error.message)) {
    return 503;
  }

  return 500;
}

export async function POST(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_WRITE);
  if (!authorization.ok) return authorization.response;

  let formData;

  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Invalid multipart form data." }, 400);
  }

  const file = formData.get("file");

  if (!file || typeof file.arrayBuffer !== "function") {
    return json({ error: "Product image file is required." }, 400);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await uploadAdminProductImage({
      productId: formData.get("productId"),
      fileName: file.name,
      contentType: file.type,
      buffer,
      altText: formData.get("altText"),
      sortOrder: formData.get("sortOrder"),
      isPrimary: formData.get("isPrimary") === "true"
    });

    return json({ image }, 201);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Product image could not be uploaded."
    }, getErrorStatus(error));
  }
}
