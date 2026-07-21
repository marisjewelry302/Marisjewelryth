import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../../lib/admin-api-auth";
import { createSupabaseAdminClient } from "../../../../lib/maris-database";

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

  const { id } = params;

  if (!id) {
    return json({ error: "Product id is required." }, 400);
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Delete images first (cascade should handle it but explicit is safer)
    await supabase.from("product_images").delete().eq("product_id", id);

    // Delete product
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({ deleted: true, id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Product could not be deleted." }, 500);
  }
}
