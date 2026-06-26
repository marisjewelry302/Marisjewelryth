import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const {
  buildWelcomeEmail,
  getCustomerEmailConfig,
  normalizeMarketingEmail,
  sendWelcomeEmail
} = await import("../app/lib/customer-email.js");

const {
  markWelcomeEmailSent,
  upsertEmailSubscriber
} = await import("../app/lib/customer-subscribers.js");

function createSubscriberClient({ existing = null } = {}) {
  const state = {
    upserts: [],
    updates: [],
    selects: []
  };

  return {
    state,
    from(tableName) {
      assert.equal(tableName, "customer_email_subscribers");

      return {
        upsert(payload, options) {
          state.upserts.push({ payload, options });
          return {
            select(columns) {
              state.selects.push(["upsert.select", columns]);
              return {
                async single() {
                  return {
                    data: {
                      id: "subscriber-1",
                      created_at: "2026-06-26T00:00:00.000Z",
                      updated_at: "2026-06-26T00:00:00.000Z",
                      ...payload,
                      ...(existing || {})
                    },
                    error: null
                  };
                }
              };
            }
          };
        },
        update(payload) {
          state.updates.push(payload);
          return {
            eq(column, value) {
              state.updates[state.updates.length - 1].filter = [column, value];
              return {
                select(columns) {
                  state.selects.push(["update.select", columns]);
                  return {
                    async single() {
                      return {
                        data: {
                          id: "subscriber-1",
                          email: value,
                          source: "popup",
                          consent: true,
                          customer_id: "customer-1",
                          created_at: "2026-06-26T00:00:00.000Z",
                          updated_at: "2026-06-26T00:00:00.000Z",
                          ...payload
                        },
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
  };
}

assert.equal(normalizeMarketingEmail("  USER@Example.COM "), "user@example.com");
assert.equal(normalizeMarketingEmail("bad"), "");

assert.deepEqual(getCustomerEmailConfig({}), {
  isConfigured: false,
  missingEnv: ["RESEND_API_KEY", "MARIS_EMAIL_FROM"],
  from: ""
});

assert.deepEqual(getCustomerEmailConfig({
  RESEND_API_KEY: "re_test",
  MARIS_EMAIL_FROM: "Maris Jewelry <welcome@example.com>"
}), {
  isConfigured: true,
  missingEnv: [],
  from: "Maris Jewelry <welcome@example.com>"
});

const welcomeEmail = buildWelcomeEmail({
  fullName: "Ada Client",
  email: "ada@example.com"
});
assert.match(welcomeEmail.subject, /Maris/i);
assert.match(welcomeEmail.html, /10%/);
assert.match(welcomeEmail.text, /10%/);

const resendCalls = [];
const sendResult = await sendWelcomeEmail({
  id: "customer-1",
  fullName: "Ada Client",
  email: "ada@example.com"
}, {
  env: {
    RESEND_API_KEY: "re_test",
    MARIS_EMAIL_FROM: "Maris Jewelry <welcome@example.com>"
  },
  fetchImpl: async (url, options) => {
    resendCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { id: "email-1" };
      },
      async text() {
        return "";
      }
    };
  }
});
assert.deepEqual(sendResult, { status: "sent", id: "email-1" });
assert.equal(resendCalls[0].url, "https://api.resend.com/emails");
assert.equal(resendCalls[0].options.method, "POST");
assert.equal(resendCalls[0].options.headers.Authorization, "Bearer re_test");
assert.match(resendCalls[0].options.headers["Idempotency-Key"], /welcome-customer-1/);
assert.equal(JSON.parse(resendCalls[0].options.body).to[0], "ada@example.com");

const missingEmailConfig = await sendWelcomeEmail({
  id: "customer-1",
  fullName: "Ada Client",
  email: "ada@example.com"
}, { env: {} });
assert.equal(missingEmailConfig.status, "not_configured");

const subscriberClient = createSubscriberClient();
const subscriber = await upsertEmailSubscriber({
  email: " Ada@Example.COM ",
  source: "popup",
  customerId: "customer-1"
}, {
  env: {
    SUPABASE_URL: "https://maris-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
  },
  client: subscriberClient
});
assert.equal(subscriber.status, "ready");
assert.equal(subscriber.subscriber.email, "ada@example.com");
assert.deepEqual(subscriberClient.state.upserts[0].options, { onConflict: "email" });
assert.equal(subscriberClient.state.upserts[0].payload.customer_id, "customer-1");

const marked = await markWelcomeEmailSent("ada@example.com", {
  customerId: "customer-1",
  resendEmailId: "email-1"
}, {
  env: {
    SUPABASE_URL: "https://maris-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
  },
  client: subscriberClient,
  now: () => new Date("2026-06-26T00:00:00.000Z")
});
assert.equal(marked.status, "updated");
assert.equal(subscriberClient.state.updates[0].last_welcome_email_id, "email-1");
assert.equal(subscriberClient.state.updates[0].welcome_email_sent_at, "2026-06-26T00:00:00.000Z");

const migrationFiles = await readdir(new URL("../supabase/migrations/", import.meta.url));
const subscriberMigrationFile = migrationFiles.find((fileName) => fileName.endsWith("_create_customer_email_subscribers.sql"));
assert.ok(subscriberMigrationFile, "A Supabase migration should create customer_email_subscribers");

const subscriberMigration = await readFile(new URL(`../supabase/migrations/${subscriberMigrationFile}`, import.meta.url), "utf8");
assert.match(subscriberMigration, /create table if not exists public\.customer_email_subscribers\b/i);
assert.match(subscriberMigration, /email text not null unique/i);
assert.match(subscriberMigration, /customer_id uuid references public\.customers\(id\) on delete set null/i);
assert.match(subscriberMigration, /welcome_email_sent_at timestamptz/i);
assert.match(subscriberMigration, /alter table public\.customer_email_subscribers\s+enable row level security/i);
assert.match(subscriberMigration, /idx_customer_email_subscribers_customer_id/i);

const welcomeRoute = await readFile(new URL("../app/api/account/welcome-email/route.js", import.meta.url), "utf8");
assert.match(welcomeRoute, /verifyCustomerSession/, "Welcome email route must use the customer session cookie");
assert.match(welcomeRoute, /getCustomerById/, "Welcome email route should send to the signed-in account");
assert.match(welcomeRoute, /sendWelcomeEmail/, "Welcome email route should delegate provider delivery server-side");
assert.doesNotMatch(welcomeRoute, /RESEND_API_KEY.*NextResponse\.json|apiKey.*NextResponse\.json/i, "Route must not leak provider secrets");
assert.match(welcomeRoute, /already_sent/, "Route should avoid repeated welcome emails");

const popup = await readFile(new URL("../app/HomeSignupPopup.jsx", import.meta.url), "utf8");
assert.match(popup, /Get 10% Off/i, "Popup CTA should match the requested text");
assert.match(popup, /mode=signup/, "Popup should redirect with signup mode");
assert.match(popup, /encodeURIComponent\(normalizedEmail\)/, "Popup should encode the submitted email");

const accountClient = await readFile(new URL("../app/account/AccountClient.jsx", import.meta.url), "utf8");
assert.match(accountClient, /params\.get\("mode"\)/, "Account page should read signup mode from URL");
assert.match(accountClient, /requestedMode === "signup"/, "Account page should switch to signup mode from URL");
assert.match(accountClient, /setPopupEmail\(email\)/, "Account page should prefill email from query");
assert.match(accountClient, /\/api\/account\/welcome-email/, "Account signup should call the welcome email API after successful registration");

const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
assert.match(envExample, /^RESEND_API_KEY=/m, ".env.example should document RESEND_API_KEY");
assert.match(envExample, /^MARIS_EMAIL_FROM=/m, ".env.example should document MARIS_EMAIL_FROM");
