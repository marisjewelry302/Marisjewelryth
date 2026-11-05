import { expect, test } from "@playwright/test";

const PUBLIC_PAGES = [
  ["/", "home"],
  ["/contact-us", "contact"],
  ["/about-us", "about"],
  ["/our-service", "service"],
  ["/privacy-policy", "privacy"],
  ["/terms-of-service", "terms"],
  ["/shipping", "shipping"],
  ["/returns", "returns"],
  ["/journal", "journal"],
  ["/shopping-bag", "bag"],
  ["/wishlist", "wishlist"]
];

for (const [path, name] of PUBLIC_PAGES) {
  test(`${name} (${path}) renders with one h1 and no console errors`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !/Failed to load resource/.test(message.text())) {
        errors.push(message.text());
      }
    });

    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("#main-content")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`${name} (${path}) has no horizontal overflow`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("unknown route shows the 404 page", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
});

test("legacy .html URL redirects to the new route", async ({ page }) => {
  await page.goto("/pages/about-us.html");
  await expect(page).toHaveURL(/\/about-us$/);
});

test("robots.txt and sitemap.xml are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap:");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
});

test("security headers are present", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
});
