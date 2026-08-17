import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const { subscribeToNewsletter, upsertEmailSubscriber } = await import("../app/lib/customer-subscribers.js");
const { normalizeMarketingEmail } = await import("../app/lib/customer-email.js");
const { isSameOriginRequest } = await import("../app/lib/request-security.js");

const ENV = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};

function createSubscriberClient({ recentCount = 0 } = {}) {
  const state = { upserts: [], counts: [] };

  return {
    state,
    from(tableName) {
      assert.equal(tableName, "customer_email_subscribers");

      return {
        // The throttle count: select(...).eq(...).gte(...) resolves to a count.
        select(columns, options) {
          const query = { columns, options };
          state.counts.push(query);

          const chain = {
            eq(column, value) {
              query.column = column;
              query.value = value;
              return chain;
            },
            gte(column, value) {
              query.since = [column, value];
              return Promise.resolve({ count: recentCount, error: null });
            }
          };

          return chain;
        },
        upsert(payload, options) {
          state.upserts.push({ payload, options });
          return {
            select() {
              return {
                async single() {
                  return {
                    data: { id: "subscriber-1", customer_id: null, ...payload },
                    error: null
                  };
                }
              };
            }
          };
        }
      };
    }
  };
}

// --- upsert payload shape -------------------------------------------------

// An anonymous footer signup must not unlink an address that already belongs to
// an account, so customer_id stays out of the payload and the upsert keeps it.
const anonymousClient = createSubscriberClient();
const anonymous = await upsertEmailSubscriber(
  { email: " List@Example.COM ", source: "footer" },
  { env: ENV, client: anonymousClient }
);
assert.equal(anonymous.status, "ready");
assert.equal("customer_id" in anonymousClient.state.upserts[0].payload, false);
assert.equal("metadata" in anonymousClient.state.upserts[0].payload, false);
assert.equal(anonymousClient.state.upserts[0].payload.email, "list@example.com");
assert.equal(anonymousClient.state.upserts[0].payload.source, "footer");
assert.equal(anonymousClient.state.upserts[0].payload.consent, true);
assert.deepEqual(anonymousClient.state.upserts[0].options, { onConflict: "email" });

const linkedClient = createSubscriberClient();
await upsertEmailSubscriber(
  { email: "list@example.com", source: "account", customerId: "customer-1" },
  { env: ENV, client: linkedClient }
);
assert.equal(linkedClient.state.upserts[0].payload.customer_id, "customer-1");

// --- signup throttle ------------------------------------------------------

const freshClient = createSubscriberClient({ recentCount: 0 });
const fresh = await subscribeToNewsletter(
  { email: "list@example.com", source: "footer", clientKey: "abc123" },
  { env: ENV, client: freshClient }
);
assert.equal(fresh.status, "ready");
assert.equal(freshClient.state.counts[0].column, "metadata->>clientKey", "The throttle must count by caller, not by email");
assert.equal(freshClient.state.counts[0].value, "abc123");
assert.deepEqual(freshClient.state.counts[0].options, { count: "exact", head: true });
assert.deepEqual(freshClient.state.upserts[0].payload.metadata, { clientKey: "abc123" });

// The window is an hour back from the injected clock, matching inquiries.
const now = () => new Date("2026-08-14T12:00:00.000Z");
const windowClient = createSubscriberClient({ recentCount: 0 });
await subscribeToNewsletter(
  { email: "list@example.com", clientKey: "abc123" },
  { env: ENV, client: windowClient, now }
);
assert.deepEqual(windowClient.state.counts[0].since, ["created_at", "2026-08-14T11:00:00.000Z"]);

const floodedClient = createSubscriberClient({ recentCount: 5 });
const flooded = await subscribeToNewsletter(
  { email: "another@example.com", source: "footer", clientKey: "abc123" },
  { env: ENV, client: floodedClient }
);
assert.equal(flooded.status, "rate_limited");
assert.equal(floodedClient.state.upserts.length, 0, "A throttled signup must not reach the table");

const underLimitClient = createSubscriberClient({ recentCount: 4 });
assert.equal(
  (await subscribeToNewsletter({ email: "list@example.com", clientKey: "abc123" }, { env: ENV, client: underLimitClient })).status,
  "ready",
  "The limit is a ceiling, not an off-by-one"
);

// No caller key (no proxy headers): skip the count rather than throttling on "".
const keylessClient = createSubscriberClient({ recentCount: 99 });
const keyless = await subscribeToNewsletter(
  { email: "list@example.com", source: "footer" },
  { env: ENV, client: keylessClient }
);
assert.equal(keyless.status, "ready");
assert.equal(keylessClient.state.counts.length, 0);
assert.equal("metadata" in keylessClient.state.upserts[0].payload, false);

const invalid = await subscribeToNewsletter({ email: "nope" }, { env: ENV, client: createSubscriberClient() });
assert.equal(invalid.status, "invalid");
assert.equal((await subscribeToNewsletter({ email: "list@example.com" }, { env: {} })).status, "not_configured");

// --- surrounding contract -------------------------------------------------

assert.equal(normalizeMarketingEmail("nope"), "");
assert.equal(isSameOriginRequest(createRequest({ origin: "https://maris.test" })), true);
assert.equal(isSameOriginRequest(createRequest({ origin: "https://evil.test" })), false);

function createRequest({ origin, fetchSite } = {}) {
  const headers = new Map();

  if (origin) {
    headers.set("origin", origin);
  }

  if (fetchSite) {
    headers.set("sec-fetch-site", fetchSite);
  }

  return {
    method: "POST",
    url: "https://maris.test/api/newsletter",
    headers: { get: (name) => headers.get(name.toLowerCase()) ?? null }
  };
}

const route = await readFile(new URL("../app/api/newsletter/route.js", import.meta.url), "utf8");
assert.match(route, /export async function POST/, "The newsletter signup needs a POST endpoint");
assert.match(route, /isSameOriginRequest/, "Newsletter route must reject cross-origin posts");
assert.match(route, /normalizeMarketingEmail/, "Newsletter route must validate the address server-side");
assert.match(route, /subscribeToNewsletter/, "Newsletter route must go through the throttled path");
assert.match(route, /ALLOWED_SOURCES/, "Newsletter route must not trust the submitted source verbatim");
assert.match(route, /rate_limited[\s\S]*?429/, "Newsletter route must answer a throttled signup with 429");
assert.match(route, /createHash\("sha256"\)/, "The throttle key must be hashed, not a stored address");
assert.doesNotMatch(route, /already_subscribed/i, "Route must not reveal whether an address is already on the list");

const migrationFiles = await readdir(new URL("../supabase/migrations/", import.meta.url));
const throttleMigrationFile = migrationFiles.find((fileName) => fileName.endsWith("_add_newsletter_signup_throttle.sql"));
assert.ok(throttleMigrationFile, "A migration should index the throttle lookup");

const throttleMigration = await readFile(new URL(`../supabase/migrations/${throttleMigrationFile}`, import.meta.url), "utf8");
assert.match(throttleMigration, /metadata->>'clientKey'/, "The throttle filter needs an index");
assert.match(throttleMigration, /idx_customer_email_subscribers_created_at/, "The throttle window needs a created_at index");

const footer = await readFile(new URL("../app/components/SiteFooter.jsx", import.meta.url), "utf8");
assert.doesNotMatch(footer, /action="\/newsletter"/, "Footer must post the signup instead of navigating to a static page");
assert.match(footer, /<NewsletterSignup source="footer" \/>/, "Footer must use the shared signup form");

const signup = await readFile(new URL("../app/components/NewsletterSignup.jsx", import.meta.url), "utf8");
assert.match(signup, /"\/api\/newsletter"/, "Signup form must call the newsletter API");
assert.match(signup, /event\.preventDefault\(\)/, "Signup form must not fall back to a page navigation");
assert.match(signup, /credentials: "same-origin"/);
assert.match(signup, /const emailId = useId\(\)/, "Repeated signup forms need unique label targets");

const page = await readFile(new URL("../app/newsletter/page.js", import.meta.url), "utf8");
assert.match(page, /NewsletterSignup/, "The newsletter page must carry a working form");
assert.match(page, /params\?\.email/, "The newsletter page should prefill from legacy ?email= links");

console.log("newsletter signup contract ok");
