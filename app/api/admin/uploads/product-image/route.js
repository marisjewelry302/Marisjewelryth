import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "../../../../lib/admin-auth";
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
  if (error instanceof AdminProductImageUploadError) {
    return error.statusCode;
  }

  if (error instanceof Error && /Supabase admin database is not configured/i.test(error.message)) {
    return 503;
  }

  return 500;
}

export async function POST(request) {
  if (!getSession(request)) {
    return unauthorized();
  }

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
