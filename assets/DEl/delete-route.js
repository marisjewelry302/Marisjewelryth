import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "../../../../lib/admin-auth";
import { createSupabaseAdminClient } from "../../../../lib/maris-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" }
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

export async function DELETE(request, { params }) {
  if (!getSession(request)) {
    return unauthorized();
  }

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
