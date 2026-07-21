import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const { isSameOriginRequest } = await import("../app/lib/request-security.js");
const { default: nextConfig } = await import("../next.config.mjs");

const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "production";

assert.equal(
  isSameOriginRequest(new Request("https://maris.example/api/account/profile", {
    method: "POST",
    headers: { origin: "https://maris.example", "sec-fetch-site": "same-origin" }
  })),
  true
);
assert.equal(
  isSameOriginRequest(new Request("https://maris.example/api/account/profile", {
    method: "POST",
    headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" }
  })),
  false
);
assert.equal(
  isSameOriginRequest(new Request("https://maris.example/api/account/profile", { method: "POST" })),
  false
);

if (originalNodeEnv === undefined) {
  delete process.env.NODE_ENV;
} else {
  process.env.NODE_ENV = originalNodeEnv;
}

const configuredHeaders = await nextConfig.headers();
const globalHeaders = configuredHeaders.find((entry) => entry.source === "/:path*")?.headers || [];
const headerNames = new Set(globalHeaders.map((header) => header.key));

for (const name of [
  "Content-Security-Policy",
  "Referrer-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Cross-Origin-Opener-Policy",
  "Permissions-Policy"
]) {
  assert.equal(headerNames.has(name), true, `Missing security header ${name}`);
}

const trackedEnvFiles = execFileSync("git", ["ls-files", "--", ".env", ".env.local"], {
  encoding: "utf8"
}).trim();
assert.equal(trackedEnvFiles, "", "Local secret files must not remain in the Git index");

const migration = await readFile(
  new URL("../supabase/migrations/20260720001000_create_auth_rate_limits.sql", import.meta.url),
  "utf8"
);
assert.match(migration, /create table if not exists public\.auth_rate_limits/i);
assert.match(migration, /for update/i, "Rate-limit counters must be updated under a row lock");
assert.match(migration, /to service_role/i, "Rate-limit RPC must remain server-only");

for (const route of [
  "../app/api/account/signin/route.js",
  "../app/api/account/signup/route.js",
  "../app/api/admin/login/route.js",
  "../app/api/admin/setup/route.js"
]) {
  const source = await readFile(new URL(route, import.meta.url), "utf8");
  assert.match(source, /consumeAuthAttempt/, `${route} must enforce durable authentication rate limits`);
  assert.match(source, /isSameOriginRequest/, `${route} must reject cross-origin submissions`);
}

const customerUsers = await readFile(new URL("../app/lib/customer-users.js", import.meta.url), "utf8");
assert.match(customerUsers, /password_hash:\s*passwordHash/);
assert.doesNotMatch(customerUsers, /metadata:\s*\{\s*password_hash:/);
