import { readPublicCatalogueProducts } from "../../../lib/maris-database.js";

export const runtime = "nodejs";
export const revalidate = 60;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": status >= 500 || payload?.status === "unavailable"
        ? "no-store"
        : "public, s-maxage=60, stale-while-revalidate=300"
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
