import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

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
