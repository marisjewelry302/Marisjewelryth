import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../../../lib/admin-api-auth";
import {
  CARD_IMAGE_KINDS,
  createAdminProductMediaUploadUrl
} from "../../../../../lib/maris-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" }
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

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// A signed URL for the browser to upload the card's cover or hover image
// straight to Storage; commit it with PATCH ../media.
export async function POST(request, { params }) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_WRITE);
  if (!authorization.ok) return authorization.response;

  const { id } = await params;
  const body = await readJson(request);

  if (!body) {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const upload = await createAdminProductMediaUploadUrl(
      { productId: id, kind: body.kind, contentType: body.contentType, size: body.size },
      { allowedKinds: CARD_IMAGE_KINDS }
    );

    return json({
      kind: upload.kind,
      path: upload.path,
      signedUrl: upload.signedUrl,
      contentType: upload.contentType,
      maxBytes: upload.maxBytes
    });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Upload URL could not be created."
    }, getErrorStatus(error));
  }
}
