import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readAdminSource } from "./lib/admin-i18n-source.mjs";

// The owner decided against low stock alerts, so the admin has no low stock
// level any more. /api/admin/settings stays, backed by the existing `settings`
// table, so a future setting needs only an entry in SETTING_DEFINITIONS.
const configuredEnv = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key"
};

const {
  SETTING_DEFINITIONS,
  readAdminSettings,
  updateAdminSettings
} = await import("../app/lib/admin-settings.js");

assert.deepEqual(Object.keys(SETTING_DEFINITIONS), [], "No admin-wide settings are defined right now");

const unconfigured = await readAdminSettings({ env: {} });
assert.equal(unconfigured.isConfigured, false);
assert.deepEqual(unconfigured.settings, {});

const neverCalled = {
  from() {
    throw new Error("The database must not be touched when there is nothing to read or save");
  }
};
const configured = await readAdminSettings({ env: configuredEnv, client: neverCalled });
assert.equal(configured.isConfigured, true);
assert.deepEqual(configured.settings, {});

await assert.rejects(
  () => updateAdminSettings({ lowStockThreshold: 7 }, { env: configuredEnv, client: neverCalled }),
  (error) => error.status === 400,
  "An unknown setting (including the removed low stock level) is refused with a 400 and writes nothing"
);

const route = await readFile(new URL("../app/api/admin/settings/route.js", import.meta.url), "utf8");
assert.match(route, /export async function GET/);
assert.match(route, /export async function PATCH/);
assert.match(route, /ADMIN_PERMISSIONS\.SETTINGS_WRITE/, "Saving settings needs settings:write");
assert.match(route, /requireAdminPermission\(request\)/, "Reading settings needs only read access");
assert.doesNotMatch(route, /lowStock/i, "The route no longer knows about a low stock level");

// Low stock is gone from the whole admin surface.
const adminScript = await readAdminSource("assets/js/admin-page.js");
const adminPage = await readAdminSource("app/admin/page.js");
const adminLib = await readFile(new URL("../app/lib/admin-settings.js", import.meta.url), "utf8");
for (const [name, source] of [["admin-page.js", adminScript], ["admin page", adminPage], ["admin-settings.js", adminLib]]) {
  assert.doesNotMatch(source, /low.?stock/i, `${name} has no low stock alert, threshold or badge`);
}
assert.doesNotMatch(adminScript, /settings: \{ path: "\/settings"/, "The admin page no longer loads a low stock level");
assert.doesNotMatch(adminPage, /data-settings-form/, "Settings has no low stock form");

console.log("PASS: Admin has no low stock feature; the settings route stays for future settings.");
