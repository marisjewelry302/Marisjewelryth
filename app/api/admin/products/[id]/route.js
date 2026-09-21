import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../../lib/admin-api-auth";
import { deleteAdminProduct } from "../../../../lib/maris-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" }
  });
}

export async function DELETE(request, { params }) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_DELETE);
  if (!authorization.ok) return authorization.response;

  const { id } = await params;

  if (!id) {
    return json({ error: "Product id is required." }, 400);
  }

  // Same path as DELETE /api/admin/products?id=: rows first, then the
  // product's files in storage.
  try {
    return json(await deleteAdminProduct(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product could not be deleted.";
    return json({ error: message }, /not found/i.test(message) ? 404 : 500);
  }
}
