import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

function assertAppearsBefore(source, earlierPattern, laterPattern, message) {
  const earlierIndex = source.search(earlierPattern);
  const laterIndex = source.search(laterPattern);

  assert.notEqual(earlierIndex, -1, `${message}: missing earlier pattern`);
  assert.notEqual(laterIndex, -1, `${message}: missing later pattern`);
  assert.ok(earlierIndex < laterIndex, message);
}

const signupRoute = await readFile(new URL("../app/api/account/signup/route.js", import.meta.url), "utf8");
const signinRoute = await readFile(new URL("../app/api/account/signin/route.js", import.meta.url), "utf8");
const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
const { sanitizeCustomerMetadata } = await import("../app/lib/customer-data.js");

assert.deepEqual(
  sanitizeCustomerMetadata({
    preferredService: "Engagement Rings",
    password_hash: "must-not-leak",
    nested: { resetToken: "must-not-leak", note: "safe" }
  }),
  {
    preferredService: "Engagement Rings",
    nested: { note: "safe" }
  }
);

for (const [label, routeSource, dbPattern] of [
  ["signup", signupRoute, /createCustomer\(/],
  ["signin", signinRoute, /authenticateCustomer\(/]
]) {
  assert.match(routeSource, /getCustomerAuthConfig/, `${label} route should read customer auth config`);
  assertAppearsBefore(
    routeSource,
    /getCustomerAuthConfig\(\)/,
    dbPattern,
    `${label} route should fail before touching Supabase when customer session signing is not configured`
  );
  assert.match(routeSource, /Service unavailable\./, `${label} route should return a service-unavailable response`);
}

assert.match(
  envExample,
  /^MARIS_CUSTOMER_SESSION_SECRET=/m,
  ".env.example should document MARIS_CUSTOMER_SESSION_SECRET for customer account sessions"
);
