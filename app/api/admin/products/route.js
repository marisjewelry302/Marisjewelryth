import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, requireAdminPermission } from "../../../lib/admin-api-auth";
import { createAdminProduct, deleteAdminProduct, readAdminCatalogueProducts, updateAdminProduct } from "../../../lib/maris-database";

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

export async function GET(request) {
  const authorization = await requireAdminPermission(request);
  if (!authorization.ok) return authorization.response;

  try {
    const catalogue = await readAdminCatalogueProducts();
    return json(catalogue, catalogue.isConfigured ? 200 : 503);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Products could not be loaded." }, 500);
  }
}

export async function POST(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_WRITE);
  if (!authorization.ok) return authorization.response;

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const product = await createAdminProduct(body);
    return json({ product }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Product could not be created." }, 500);
  }
}

export async function PATCH(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_WRITE);
  if (!authorization.ok) return authorization.response;

  const productId = request.nextUrl.searchParams.get("id");

  if (!productId) {
    return json({ error: "Product id is required." }, 400);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const product = await updateAdminProduct(productId, body);
    return json({ product }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Product could not be updated." }, 500);
  }
}

export async function DELETE(request) {
  const authorization = await requireAdminPermission(request, ADMIN_PERMISSIONS.CATALOGUE_DELETE);
  if (!authorization.ok) return authorization.response;

  const productId = request.nextUrl.searchParams.get("id");

  if (!productId) {
    return json({ error: "Product id is required." }, 400);
  }

  try {
    const result = await deleteAdminProduct(productId);
    return json(result, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Product could not be deleted." }, 500);
  }
}
