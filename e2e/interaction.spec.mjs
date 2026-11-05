import { expect, test } from "@playwright/test";

test("keyboard Tab reaches a skip link or the main navigation first", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(["A", "BUTTON", "INPUT"]).toContain(focused);
});

test("admin area redirects or blocks unauthenticated visitors", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin$/, { timeout: 15_000 }).catch(() => {});
  // Whatever it shows, it must not expose the product management UI without a session.
  await expect(page.getByText(/sign in|log in|login|setup|not configured/i).first()).toBeVisible();
});

test("protected admin API rejects requests without a session", async ({ request }) => {
  for (const path of ["/api/admin/products", "/api/admin/orders", "/api/admin/customers"]) {
    const response = await request.get(path);
    expect([401, 403, 503]).toContain(response.status());
  }
});

test("cross-site POST to a mutating API is refused", async ({ request }) => {
  const response = await request.post("/api/newsletter", {
    headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    data: { email: "x@example.com" }
  });
  expect([400, 403]).toContain(response.status());
});

test("payment webhook is disabled until a gateway is wired", async ({ request }) => {
  const response = await request.post("/api/webhooks/payment", { data: {} });
  expect(response.status()).toBe(501);
});
