import { readWholesaleCatalogue } from "../../../lib/maris-database.js";
import { requireWholesaleCustomer, wholesaleJson } from "../../../lib/wholesale-session.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Approved accounts only: wholesale prices are not public.
export async function GET(request) {
  try {
    const context = await requireWholesaleCustomer(request, { requireApproved: true });
    if (!context.ok) return context.response;

    const result = await readWholesaleCatalogue();
    if (!result.isConfigured) return wholesaleJson({ error: "Service unavailable." }, 503);

    return wholesaleJson({
      discountPercent: context.account.discountPercent,
      paymentTerms: context.account.paymentTerms,
      products: result.products
    });
  } catch (error) {
    console.error("Wholesale catalogue failed", error);
    return wholesaleJson({ error: "Wholesale catalogue could not be loaded." }, 500);
  }
}
