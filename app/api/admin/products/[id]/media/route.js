import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../../../lib/admin-api-auth";
import {
  updateAdminProductMedia
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

const MEDIA_FIELDS = ["cover", "hover", "video", "poster"];

// Points the product at uploaded (or gallery) media, or clears it. Body keys:
// cover / hover: { path } | { imageId } | null, video / poster: { path } | null,
// videoPosition: 0 | 1. Replaced files are removed once the row is saved.
export async function PATCH(request, { params }) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_WRITE);
  if (!authorization.ok) return authorization.response;

  const { id } = await params;
  const body = await readJson(request);

  if (!body || typeof body !== "object") {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  const changes = {};

  for (const field of MEDIA_FIELDS) {
    if (body[field] === null) {
      changes[field] = null;
    } else if (body[field] && typeof body[field] === "object") {
      changes[field] = {
        path: typeof body[field].path === "string" ? body[field].path : undefined,
        imageId: typeof body[field].imageId === "string" ? body[field].imageId : undefined
      };
    }
  }

  if (body.videoPosition !== undefined) {
    changes.videoPosition = body.videoPosition;
  }

  try {
    const media = await updateAdminProductMedia({ productId: id, changes });

    return json({
      media: {
        productId: media.productId,
        coverImageUrl: media.coverImageUrl,
        hoverImageUrl: media.hoverImageUrl,
        videoUrl: media.videoUrl,
        videoPosterUrl: media.videoPosterUrl,
        videoPosition: media.videoPosition
      },
      filesRemoved: media.cleanup.removed
    });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Product media could not be saved."
    }, getErrorStatus(error));
  }
}
