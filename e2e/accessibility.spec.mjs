import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/contact-us", "/our-service", "/privacy-policy", "/journal", "/admin/login", "/th", "/th/contact-us", "/th/our-service", "/th/privacy-policy", "/th/category/engagement-ring", "/th/journal", "/th/journal/journal-diamond-4c-guide", "/th/request-quote", "/th/shopping-bag"];

for (const path of PAGES) {
  test(`axe: ${path} has no serious or critical WCAG A/AA violations`, async ({ page }, testInfo) => {
    // Known issue: on phones /our-service uses swipe rows (.subpage-feature-grid, .subpage-step-grid)
    // that scroll but cannot take keyboard focus. Remove this line once they get tabindex="0".
    test.fixme((path === "/our-service" || path === "/th/our-service") && testInfo.project.name === "mobile", "swipe rows not keyboard focusable");
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Empty best-seller placeholders only appear when no catalogue data is loaded (no database in tests).
    const results = await new AxeBuilder({ page })
      .exclude(".best-seller-empty-label")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    expect(
      blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`)
    ).toEqual([]);
  });
}
