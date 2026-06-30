import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const {
  buildCustomOrderSummary,
  buildRequestFingerprint,
  findOrCreateCustomOrderCustomer,
  normalizeCustomOrderPayload,
  validateCustomOrderPayload
} = await import("../app/lib/custom-order-requests.js");

const validPayload = {
  product_code: " sr000 ",
  full_name: " Ada Client ",
  company_name: " Ada Studio ",
  email: " ADA@Example.COM ",
  contact_number: "(+66) 812345678",
  custom_options: {
    metal: "YG",
    metal_purity: "18K",
    ring_size: 7,
    choose_stone: {
      carat: 0.8,
      color: "D",
      clarity: "VVS1",
      cut: "Excellent"
    },
    origin: "Lab-grown"
  }
};

const validEnv = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};

function createCustomerLinkingClient({ emailMatch = null, phoneMatch = null } = {}) {
  const state = {
    selects: [],
    updates: [],
    inserts: []
  };

  return {
    state,
    from(tableName) {
      assert.equal(tableName, "customers");

      return {
        select(columns) {
          const selectCall = { tableName, columns, filters: [] };
          state.selects.push(selectCall);

          const query = {
            eq(column, value) {
              selectCall.filters.push([column, value]);
              return query;
            },
            limit(value) {
              selectCall.limit = value;
              return query;
            },
            async maybeSingle() {
              const emailFilter = selectCall.filters.find(([column]) => column === "email");
              const phoneFilter = selectCall.filters.find(([column]) => column === "phone");

              return {
                data: emailFilter ? emailMatch : phoneFilter ? phoneMatch : null,
                error: null
              };
            }
          };

          return query;
        },
        update(payload) {
          const updateCall = { tableName, payload, filters: [] };
          state.updates.push(updateCall);

          const query = {
            eq(column, value) {
              updateCall.filters.push([column, value]);
              return query;
            },
            select(columns) {
              updateCall.columns = columns;
              return {
                async single() {
                  const existing = emailMatch || phoneMatch || {};

                  return {
                    data: {
                      ...existing,
                      ...payload,
                      id: existing.id || "customer-updated",
                      email: existing.email || "ada@example.com",
                      created_at: existing.created_at || "2026-06-20T00:00:00.000Z"
                    },
                    error: null
                  };
                }
              };
            }
          };

          return query;
        },
        insert(payload) {
          state.inserts.push({ tableName, payload });

          return {
            select(columns) {
              state.inserts[state.inserts.length - 1].columns = columns;
              return {
                async single() {
                  return {
                    data: {
                      id: "customer-created",
                      created_at: "2026-06-30T00:00:00.000Z",
                      updated_at: "2026-06-30T00:00:00.000Z",
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

function hasFieldError(result, field) {
  return result.errors.some((error) => error.field === field && error.message);
}

const normalized = normalizeCustomOrderPayload(validPayload);
assert.deepEqual(normalized, {
  productCode: "SR000",
  fullName: "Ada Client",
  companyName: "Ada Studio",
  email: "ada@example.com",
  contactNumber: "(+66) 812345678",
  phoneDigits: "66812345678",
  metal: "YG",
  metalPurity: "18K",
  ringSize: 7,
  stoneCarat: 0.8,
  stoneColor: "D",
  stoneClarity: "VVS1",
  stoneCut: "Excellent",
  origin: "Lab-grown",
  honeypot: ""
});

const validResult = validateCustomOrderPayload(validPayload);
assert.equal(validResult.isValid, true);
assert.deepEqual(validResult.errors, []);
assert.deepEqual(validResult.normalized, normalized);
assert.equal(
  buildCustomOrderSummary(normalized),
  "18K Yellow Gold · Size 7 · Lab-grown · 0.8 ct D VVS1 Excellent"
);

const fingerprint = buildRequestFingerprint(normalized);
assert.match(fingerprint, /^[a-f0-9]{64}$/);
assert.equal(
  buildRequestFingerprint({ ...normalized, companyName: "Different Studio" }),
  fingerprint,
  "Request fingerprint should ignore company name"
);
assert.equal(
  buildRequestFingerprint({ ...normalized, fullName: "Different Client" }),
  fingerprint,
  "Request fingerprint should ignore full name"
);

for (const contact_number of ["()", "+", "---", "12345"]) {
  const result = validateCustomOrderPayload({ ...validPayload, contact_number });
  assert.equal(result.isValid, false, `${contact_number} should be invalid`);
  assert.ok(hasFieldError(result, "contact_number"), `${contact_number} should return a contact number error`);
}

const invalidEmailResult = validateCustomOrderPayload({ ...validPayload, email: "bad" });
assert.equal(invalidEmailResult.isValid, false);
assert.ok(hasFieldError(invalidEmailResult, "email"));

const missingProductCodeResult = validateCustomOrderPayload({ ...validPayload, product_code: " " });
assert.equal(missingProductCodeResult.isValid, false);
assert.ok(hasFieldError(missingProductCodeResult, "product_code"));

assert.equal(
  validateCustomOrderPayload({
    ...validPayload,
    custom_options: { ...validPayload.custom_options, metal: "PN", metal_purity: "18K" }
  }).normalized.metalPurity,
  null,
  "Platinum should clear gold purity"
);
const invalidRingSizeResult = validateCustomOrderPayload({
  ...validPayload,
  custom_options: { ...validPayload.custom_options, ring_size: 7.25 }
});
assert.equal(invalidRingSizeResult.isValid, false, "Quarter-step ring size should be invalid");
assert.ok(hasFieldError(invalidRingSizeResult, "ring_size"));

const invalidStoneCaratResult = validateCustomOrderPayload({
  ...validPayload,
  custom_options: {
    ...validPayload.custom_options,
    choose_stone: { ...validPayload.custom_options.choose_stone, carat: 9 }
  }
});
assert.equal(invalidStoneCaratResult.isValid, false, "Oversized stone carat should be invalid");
assert.ok(hasFieldError(invalidStoneCaratResult, "stone_carat"));

const existingCustomer = {
  id: "customer-1",
  full_name: "Ada Existing",
  email: "ada@example.com",
  phone: "(+66) 800000000",
  metadata: {
    password_hash: "hashed-password",
    tier: "member"
  },
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z"
};
const emailClient = createCustomerLinkingClient({ emailMatch: existingCustomer });
const updatedByEmail = await findOrCreateCustomOrderCustomer(normalized, {
  env: validEnv,
  client: emailClient,
  now: () => new Date("2026-06-30T12:00:00.000Z")
});
assert.equal(updatedByEmail.status, "updated");
assert.equal(updatedByEmail.customer.id, "customer-1");
assert.equal(updatedByEmail.customer.phone, "(+66) 812345678");
assert.equal(updatedByEmail.customer.metadata.password_hash, "hashed-password");
assert.deepEqual(
  emailClient.state.selects.map((entry) => entry.filters),
  [[["email", "ada@example.com"]]],
  "Email match should stop before phone lookup"
);
assert.deepEqual(Object.keys(emailClient.state.updates[0].payload).sort(), [
  "full_name",
  "metadata",
  "phone",
  "updated_at"
]);
assert.equal(emailClient.state.updates[0].payload.email, undefined);
assert.equal(emailClient.state.updates[0].payload.password, undefined);
assert.equal(emailClient.state.updates[0].payload.password_hash, undefined);
assert.equal(emailClient.state.updates[0].payload.metadata.password_hash, "hashed-password");
assert.equal(emailClient.state.updates[0].payload.metadata.lead_source, "custom_order_request");
assert.equal(emailClient.state.updates[0].payload.metadata.last_custom_order_product_code, "SR000");
assert.equal(emailClient.state.updates[0].payload.metadata.last_custom_order_at, "2026-06-30T12:00:00.000Z");

const phoneCustomer = {
  id: "customer-phone",
  full_name: "Phone Client",
  email: "phone@example.com",
  phone: "(+66) 812345678",
  metadata: {},
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z"
};
const phoneClient = createCustomerLinkingClient({ phoneMatch: phoneCustomer });
const updatedByPhone = await findOrCreateCustomOrderCustomer(normalized, {
  env: validEnv,
  client: phoneClient,
  now: () => new Date("2026-06-30T12:00:00.000Z")
});
assert.equal(updatedByPhone.status, "updated");
assert.equal(updatedByPhone.customer.id, "customer-phone");
assert.deepEqual(phoneClient.state.selects.map((entry) => entry.filters), [
  [["email", "ada@example.com"]],
  [["phone", "(+66) 812345678"]]
]);

const insertClient = createCustomerLinkingClient();
const createdCustomer = await findOrCreateCustomOrderCustomer(normalized, {
  env: validEnv,
  client: insertClient,
  now: () => new Date("2026-06-30T12:00:00.000Z")
});
assert.equal(createdCustomer.status, "created");
assert.equal(insertClient.state.inserts[0].payload.email, "ada@example.com");
assert.equal(insertClient.state.inserts[0].payload.password, undefined);
assert.equal(insertClient.state.inserts[0].payload.password_hash, undefined);
assert.equal(insertClient.state.inserts[0].payload.metadata.password_hash, undefined);

assert.deepEqual(await findOrCreateCustomOrderCustomer(normalized, { env: {} }), {
  status: "not_configured",
  missingEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  customer: null
});

const migrationFiles = await readdir(new URL("../supabase/migrations/", import.meta.url));
const customOrderMigrationFile = migrationFiles.find((fileName) => fileName.endsWith("_create_custom_order_requests.sql"));
assert.ok(customOrderMigrationFile, "A Supabase migration should create custom_order_requests");

const migration = await readFile(new URL(`../supabase/migrations/${customOrderMigrationFile}`, import.meta.url), "utf8");
assert.match(migration, /create table if not exists public\.custom_order_requests\b/i);
assert.match(migration, /customer_id uuid references public\.customers\(id\) on delete set null/i);
assert.match(migration, /ring_size numeric\(4,\s*1\)/i);
assert.match(migration, /ring_size \* 2 = floor\(ring_size \* 2\)/i);
assert.match(migration, /exact numeric/i, "Migration should document why ring_size stays numeric, not float");
assert.match(migration, /status text not null default 'pending'/i);
assert.match(migration, /status in \('pending', 'contacted', 'completed', 'cancelled'\)/i);
assert.match(migration, /alter table public\.custom_order_requests\s+enable row level security/i);

const customOrderPolicyBlocks = migration
  .match(/create\s+policy[\s\S]*?;/gi)
  ?.filter((policy) => /on\s+public\.custom_order_requests\b/i.test(policy)) || [];
assert.deepEqual(
  customOrderPolicyBlocks,
  [],
  "Custom order requests should stay server-only and should not add browser RLS policies"
);
assert.doesNotMatch(
  migration,
  /grant\s+insert\s+on\s+(?:table\s+)?public\.custom_order_requests\s+to\s+(?:anon|public)\b/i,
  "Custom order requests should not grant anon/public insert access"
);

assert.match(migration, /add column if not exists full_name text/i, "Migration should make customers.full_name explicit for lead linking");
assert.match(migration, /information_schema\.columns/i, "Migration should guard legacy customers.name compatibility checks");

for (const indexName of [
  "idx_custom_order_requests_customer_id",
  "idx_custom_order_requests_email",
  "idx_custom_order_requests_product_code",
  "idx_custom_order_requests_status_created_at"
]) {
  assert.match(migration, new RegExp(`create index if not exists ${indexName}\\b`, "i"), `Migration should include ${indexName}`);
}

const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
assert.match(envExample, /^MARIS_ORDER_EMAIL_TO=/m, ".env.example should document MARIS_ORDER_EMAIL_TO");

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(packageJson.scripts["test:custom-order"], "node scripts/test-custom-order.mjs");

const databaseLib = await readFile(new URL("../app/lib/maris-database.js", import.meta.url), "utf8");
assert.match(databaseLib, /"custom_order_requests"/, "Database table status contract should include custom_order_requests");

const databaseTest = await readFile(new URL("../scripts/test-supabase-admin-database.mjs", import.meta.url), "utf8");
assert.match(databaseTest, /"custom_order_requests"/, "Database schema test should expect custom_order_requests");
