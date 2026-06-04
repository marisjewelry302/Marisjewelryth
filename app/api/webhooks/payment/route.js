export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store"
    }
  });
}

export async function POST() {
  return json({
    error: "payment_webhook_not_configured",
    message: "Payment webhooks are disabled until a real gateway integration verifies signatures and updates orders from trusted paid events."
  }, 501);
}
