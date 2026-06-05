import { readPublicCatalogueProducts } from "../../../lib/maris-database.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export async function GET() {
  try {
    const catalogue = await readPublicCatalogueProducts();

    return json(catalogue);
  } catch (error) {
    return json({
      source: "supabase",
      status: "unavailable",
      error: error instanceof Error ? error.message : "Supabase catalogue products could not be loaded.",
      checkedAt: new Date().toISOString(),
      productCount: 0,
      products: []
    }, 500);
  }
}
