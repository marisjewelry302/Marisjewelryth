import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { readAdminSource } from "./lib/admin-i18n-source.mjs";

process.env.MARIS_ADMIN_SESSION_SECRET = "test-session-secret";

const {
  SESSION_COOKIE_NAME,
  createAdminSession,
  getAdminConfig,
  verifyAdminSession
} = await import("../app/lib/admin-auth.js");
const { default: nextConfig } = await import("../next.config.mjs");

const config = getAdminConfig();
assert.equal(config.isConfigured, true);
assert.equal(config.isSessionConfigured, true);
assert.equal(SESSION_COOKIE_NAME, "maris_admin_session");

const now = new Date("2026-05-24T00:00:00.000Z");
const session = createAdminSession({
  id: "owner-id",
  username: "owner",
  role: "owner"
}, now);
const verifiedSession = verifyAdminSession(session, new Date("2026-05-24T01:00:00.000Z"));
assert.equal(verifiedSession.isValid, true);
assert.equal(verifiedSession.username, "owner");
assert.equal(verifiedSession.userId, "owner-id");
assert.equal(verifiedSession.role, "owner");
assert.equal(verifyAdminSession(`${session}.tampered`, now).isValid, false);
assert.equal(verifyAdminSession(session, new Date("2026-05-24T09:01:00.000Z")).isValid, false);

const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
assert.doesNotMatch(
  packageJson,
  /sync-legacy-public|predev|prebuild|sync:legacy/,
  "Legacy public sync must not run during dev/build after the React migration"
);
assert.equal(existsSync(new URL("../public/pages/admin.html", import.meta.url)), false);

const redirects = await nextConfig.redirects();
assert.ok(
  redirects.some((redirectRule) => (
    redirectRule.source === "/pages/admin.html"
    && redirectRule.destination === "/admin"
    && redirectRule.permanent === false
  )),
  "Next.js must redirect the legacy admin.html URL into the protected /admin flow"
);

// E-02: login may return to a same-origin /admin path and nothing else.
const { sanitizeAdminNextPath } = await import("../app/lib/admin-next-path.js");
assert.equal(sanitizeAdminNextPath("/admin"), "/admin");
assert.equal(sanitizeAdminNextPath("/admin#products"), "/admin#products");
assert.equal(sanitizeAdminNextPath("/admin?tab=orders#orders"), "/admin?tab=orders#orders");
assert.equal(sanitizeAdminNextPath("/admin/wholesale"), "/admin/wholesale");
for (const unsafe of [
  undefined,
  null,
  "",
  "https://evil.example/admin",
  "//evil.example/admin",
  "/\\evil.example",
  "/admin\\..\\evil",
  "/administrator",
  "/admin.evil.example",
  "/adminx/path",
  "/evil",
  "/api/admin/products",
  "javascript:alert(1)",
  "/admin/../evil",
  "/admin/%2e%2e/evil",
  "/admin/%2fevil",
  "/admin\n/evil",
  "/admin/login",
  "/admin/setup?x=1",
  "admin",
  ["/admin"]
]) {
  assert.equal(sanitizeAdminNextPath(unsafe), "/admin", `next=${JSON.stringify(unsafe)} must fall back to /admin`);
}

const loginRouteSource = await readFile(new URL("../app/api/admin/login/route.js", import.meta.url), "utf8");
assert.match(loginRouteSource, /sanitizeAdminNextPath\(String\(formData\.get\("next"\)/, "Login route validates the next field");
assert.match(loginRouteSource, /redirectTo\(request, nextPath\)/, "Login route redirects to the validated next path");

const adminScriptSource = await readAdminSource("assets/js/admin-page.js");
const wholesaleScriptSource = await readAdminSource("assets/js/admin-wholesale.js");
for (const [name, source] of [["admin-page.js", adminScriptSource], ["admin-wholesale.js", wholesaleScriptSource]]) {
  assert.match(source, /function describeAuthFailure\(/, `${name} handles 401 and 403 the same way`);
  assert.match(source, /\/admin\/login\?next=\$\{encodeURIComponent\(target\)\}/, `${name} links to sign-in with a next path`);
  assert.doesNotMatch(source, /location\.assign\("\/admin\/login"\)/, `${name} must not navigate away on 401`);
}
