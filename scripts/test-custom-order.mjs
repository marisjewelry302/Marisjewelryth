import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const {
  buildCustomOrderInsertPayload,
  buildCustomOrderSummary,
  buildRequestFingerprint,
  createCustomOrderRequest,
  findOrCreateCustomOrderCustomer,
  normalizeCustomOrderPayload,
  STONE_CLARITIES: BACKEND_STONE_CLARITIES,
  STONE_COLORS: BACKEND_STONE_COLORS,
  STONE_CUTS: BACKEND_STONE_CUTS,
  validateCustomOrderPayload
} = await import("../app/lib/custom-order-requests.js");

const {
  buildAdminCustomOrderEmail,
  buildCustomerCustomOrderEmail,
  getCustomOrderEmailConfig,
  sendCustomOrderEmails
} = await import("../app/lib/custom-order-email.js");

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

function createCustomOrderClient({
  duplicate = null,
  hourlyEmailCount = 0,
  hourlyPhoneCount = 0,
  customerId = "customer-linked",
  requestId = "request-created"
} = {}) {
  const state = {
    selects: [],
    updates: [],
    inserts: [],
    deletes: []
  };

  function customerTable(tableName) {
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
            return { data: null, error: null };
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
                    id: customerId,
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
      },
      update() {
        throw new Error("Customer update should not be used in this fake.");
      }
    };
  }

  function customOrderTable(tableName) {
    return {
      select(columns, options = {}) {
        const selectCall = { tableName, columns, options, filters: [] };
        state.selects.push(selectCall);

        const query = {
          eq(column, value) {
            selectCall.filters.push([column, value]);
            return query;
          },
          gte(column, value) {
            selectCall.filters.push([`${column}>=`, value]);
            return query;
          },
          limit(value) {
            selectCall.limit = value;
            return query;
          },
          async maybeSingle() {
            return { data: duplicate, error: null };
          },
          then(resolve, reject) {
            const emailFilter = selectCall.filters.find(([column]) => column === "email");
            const phoneFilter = selectCall.filters.find(([column]) => column === "metadata->>phoneDigits");
            const count = emailFilter ? hourlyEmailCount : phoneFilter ? hourlyPhoneCount : 0;

            return Promise.resolve({ data: [], count, error: null }).then(resolve, reject);
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
                    id: requestId,
                    status: payload.status,
                    created_at: "2026-06-30T12:00:00.000Z"
                  },
                  error: null
                };
              }
            };
          }
        };
      },
      delete() {
        state.deletes.push({ tableName });
        return {
          eq() {
            return this;
          }
        };
      }
    };
  }

  return {
    state,
    from(tableName) {
      if (tableName === "customers") {
        return customerTable(tableName);
      }

      assert.equal(tableName, "custom_order_requests");
      return customOrderTable(tableName);
    }
  };
}

function hasFieldError(result, field) {
  return result.errors.some((error) => error.field === field && error.message);
}

async function readRequiredSource(relativePath) {
  try {
    return await readFile(new URL(relativePath, import.meta.url), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      assert.fail(`Expected source file to exist: ${relativePath}`);
    }

    throw error;
  }
}

function readStringArrayConstant(source, constantName) {
  const pattern = new RegExp(`const\\s+${constantName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const match = source.match(pattern);

  assert.ok(match, `Expected ${constantName} array constant to exist`);

  return Array.from(match[1].matchAll(/"([^"]*)"/g), (entry) => entry[1]);
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
  ringDesign: {
    style: null,
    stoneShape: null,
    engravingEnabled: false,
    engravingText: null
  },
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
assert.equal(
  buildRequestFingerprint(normalizeCustomOrderPayload({
    ...validPayload,
    contact_number: "+66 81 234 5678"
  })),
  fingerprint,
  "Request fingerprint should use canonical phone digits"
);

for (const contact_number of ["()", "+", "---", "12345", "081\t2345678", "081\n2345678"]) {
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
const validRingDesignResult = validateCustomOrderPayload({
  ...validPayload,
  custom_options: {
    ...validPayload.custom_options,
    ring_design: {
      style: "Pavé",
      stone_shape: "Oval",
      engraving_enabled: true,
      engraving_text: "FOREVER"
    }
  }
});
assert.equal(validRingDesignResult.isValid, true);
assert.deepEqual(validRingDesignResult.normalized.ringDesign, {
  style: "Pavé",
  stoneShape: "Oval",
  engravingEnabled: true,
  engravingText: "FOREVER"
});
assert.match(buildCustomOrderSummary(validRingDesignResult.normalized), /Style Pavé · Oval stone/);
assert.match(buildCustomOrderSummary(validRingDesignResult.normalized), /Engraving FOREVER/);

const missingEngravingResult = validateCustomOrderPayload({
  ...validPayload,
  custom_options: {
    ...validPayload.custom_options,
    ring_design: {
      style: "Halo",
      stone_shape: "Round",
      engraving_enabled: true,
      engraving_text: " "
    }
  }
});
assert.equal(missingEngravingResult.isValid, false);
assert.ok(hasFieldError(missingEngravingResult, "ring_design.engraving_text"));

const invalidRingSizeResult = validateCustomOrderPayload({
  ...validPayload,
  custom_options: { ...validPayload.custom_options, ring_size: 7.25 }
});
assert.equal(invalidRingSizeResult.isValid, false, "Quarter-step ring size should be invalid");
assert.ok(hasFieldError(invalidRingSizeResult, "ring_size"));

const invalidRingSizeTextResult = validateCustomOrderPayload({
  ...validPayload,
  custom_options: { ...validPayload.custom_options, ring_size: "abc" }
});
assert.equal(invalidRingSizeTextResult.isValid, false, "Non-numeric ring size should be invalid");
assert.ok(hasFieldError(invalidRingSizeTextResult, "ring_size"));

const invalidStoneCaratResult = validateCustomOrderPayload({
  ...validPayload,
  custom_options: {
    ...validPayload.custom_options,
    choose_stone: { ...validPayload.custom_options.choose_stone, carat: 9 }
  }
});
assert.equal(invalidStoneCaratResult.isValid, false, "Oversized stone carat should be invalid");
assert.ok(hasFieldError(invalidStoneCaratResult, "stone_carat"));

const invalidStoneCaratTextResult = validateCustomOrderPayload({
  ...validPayload,
  custom_options: {
    ...validPayload.custom_options,
    choose_stone: { ...validPayload.custom_options.choose_stone, carat: "7abc" }
  }
});
assert.equal(invalidStoneCaratTextResult.isValid, false, "Non-numeric stone carat should be invalid");
assert.ok(hasFieldError(invalidStoneCaratTextResult, "stone_carat"));

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

const browserInjectedPayload = {
  ...validPayload,
  customer_id: "browser-customer",
  status: "completed",
  metadata: {
    requestFingerprint: "browser-fingerprint",
    unsafe: true
  },
  custom_options: {
    ...validPayload.custom_options,
    metal: "PN",
    metal_purity: "18K"
  }
};
const orderClient = createCustomOrderClient();
let emailContext = null;
const createdRequest = await createCustomOrderRequest(browserInjectedPayload, {
  env: validEnv,
  client: orderClient,
  now: () => new Date("2026-06-30T12:00:00.000Z"),
  sendEmails: async (context) => {
    emailContext = context;
    return { status: "sent" };
  }
});
assert.deepEqual(createdRequest, {
  status: "created",
  requestId: "request-created",
  requestStatus: "pending"
});
assert.equal(emailContext.request.id, "request-created");
assert.equal(emailContext.customer.id, "customer-linked");
assert.equal(emailContext.order.metalPurity, null);
const requestInsert = orderClient.state.inserts.find((entry) => entry.tableName === "custom_order_requests");
assert.ok(requestInsert, "Custom order request should be inserted");
assert.equal(requestInsert.payload.customer_id, "customer-linked");
assert.equal(requestInsert.payload.status, "pending");
assert.equal(requestInsert.payload.metadata.unsafe, undefined);
assert.match(requestInsert.payload.metadata.requestFingerprint, /^[a-f0-9]{64}$/);
assert.equal(requestInsert.payload.metadata.phoneDigits, "66812345678");
assert.equal(requestInsert.payload.metadata.optionSummary, "Platinum · Size 7 · Lab-grown · 0.8 ct D VVS1 Excellent");
assert.equal(requestInsert.payload.metal, "PN");
assert.equal(requestInsert.payload.metal_purity, null);
assert.equal(requestInsert.payload.product_code, "SR000");
assert.equal(requestInsert.columns.replace(/\s+/g, " ").trim(), "id, status, created_at");

assert.equal(
  buildCustomOrderInsertPayload(normalizeCustomOrderPayload(browserInjectedPayload), {
    customerId: "customer-safe",
    fingerprint: "f".repeat(64),
    now: () => new Date("2026-06-30T12:00:00.000Z")
  }).customer_id,
  "customer-safe"
);

const honeypotClient = createCustomOrderClient();
let honeypotEmailCalled = false;
const honeypotResult = await createCustomOrderRequest({ ...validPayload, website_url: "https://spam.example" }, {
  env: validEnv,
  client: honeypotClient,
  sendEmails: async () => {
    honeypotEmailCalled = true;
    return { status: "sent" };
  }
});
assert.deepEqual(honeypotResult, { status: "invalid", errors: [] });
assert.equal(honeypotClient.state.inserts.length, 0);
assert.equal(honeypotEmailCalled, false);

const duplicateClient = createCustomOrderClient({
  duplicate: { id: "request-duplicate", status: "pending" }
});
let duplicateEmailCalled = false;
assert.deepEqual(await createCustomOrderRequest(validPayload, {
  env: validEnv,
  client: duplicateClient,
  sendEmails: async () => {
    duplicateEmailCalled = true;
    return { status: "sent" };
  }
}), {
  status: "duplicate",
  requestId: "request-duplicate",
  requestStatus: "pending"
});
assert.equal(duplicateClient.state.inserts.length, 0);
assert.equal(duplicateEmailCalled, false);

const throttledClient = createCustomOrderClient({ hourlyEmailCount: 5 });
let throttleEmailCalled = false;
assert.deepEqual(await createCustomOrderRequest(validPayload, {
  env: validEnv,
  client: throttledClient,
  sendEmails: async () => {
    throttleEmailCalled = true;
    return { status: "sent" };
  }
}), { status: "rate_limited" });
assert.equal(throttledClient.state.inserts.length, 0);
assert.equal(throttleEmailCalled, false);

const formattedPhoneThrottleClient = createCustomOrderClient({ hourlyPhoneCount: 5 });
assert.deepEqual(await createCustomOrderRequest({
  ...validPayload,
  contact_number: "+66 81 234 5678"
}, {
  env: validEnv,
  client: formattedPhoneThrottleClient,
  sendEmails: async () => ({ status: "sent" })
}), { status: "rate_limited" });
assert.ok(
  formattedPhoneThrottleClient.state.selects.some((entry) => (
    entry.tableName === "custom_order_requests"
    && entry.filters.some(([column, value]) => column === "metadata->>phoneDigits" && value === "66812345678")
  )),
  "Phone throttle should query normalized metadata phone digits"
);
assert.equal(formattedPhoneThrottleClient.state.inserts.length, 0);

const failedEmailClient = createCustomOrderClient({ requestId: "request-email-failed" });
assert.deepEqual(await createCustomOrderRequest(validPayload, {
  env: validEnv,
  client: failedEmailClient,
  sendEmails: async () => ({ status: "failed" })
}), {
  status: "email_failed",
  requestId: "request-email-failed",
  requestStatus: "pending"
});
assert.ok(failedEmailClient.state.inserts.some((entry) => entry.tableName === "custom_order_requests"));
assert.equal(failedEmailClient.state.deletes.length, 0);

const thrownEmailClient = createCustomOrderClient({ requestId: "request-email-thrown" });
assert.deepEqual(await createCustomOrderRequest(validPayload, {
  env: validEnv,
  client: thrownEmailClient,
  sendEmails: async () => {
    throw new Error("provider down");
  }
}), {
  status: "email_failed",
  requestId: "request-email-thrown",
  requestStatus: "pending"
});

const emailNotConfiguredClient = createCustomOrderClient({ requestId: "request-email-not-configured" });
assert.deepEqual(await createCustomOrderRequest(validPayload, {
  env: validEnv,
  client: emailNotConfiguredClient,
  sendEmails: async () => ({ status: "not_configured", missingEnv: ["RESEND_API_KEY"] })
}), {
  status: "email_not_configured",
  requestId: "request-email-not-configured",
  requestStatus: "pending"
});

assert.deepEqual(getCustomOrderEmailConfig({}), {
  isConfigured: false,
  missingEnv: ["RESEND_API_KEY", "MARIS_EMAIL_FROM", "MARIS_ORDER_EMAIL_TO"],
  from: "",
  orderEmailTo: ""
});
const validEmailEnv = {
  RESEND_API_KEY: "re_test",
  MARIS_EMAIL_FROM: "Maris <orders@example.com>",
  MARIS_ORDER_EMAIL_TO: "studio@example.com"
};
assert.deepEqual(getCustomOrderEmailConfig(validEmailEnv), {
  isConfigured: true,
  missingEnv: [],
  from: "Maris <orders@example.com>",
  orderEmailTo: "studio@example.com"
});
assert.deepEqual(getCustomOrderEmailConfig({
  ...validEmailEnv,
  MARIS_ORDER_EMAIL_TO: "not-an-email"
}), {
  isConfigured: false,
  missingEnv: ["MARIS_ORDER_EMAIL_TO"],
  from: "Maris <orders@example.com>",
  orderEmailTo: ""
});
const emailOrder = normalizeCustomOrderPayload(validPayload);
const emailSummary = buildCustomOrderSummary(emailOrder);
const emailRequest = { id: "request-email", status: "pending", created_at: "2026-06-30T12:00:00.000Z" };
const customerEmail = buildCustomerCustomOrderEmail({
  order: emailOrder,
  request: emailRequest,
  optionSummary: emailSummary
});
assert.match(customerEmail.text, /SR000/);
assert.match(customerEmail.text, /18K Yellow Gold/);
assert.doesNotMatch(customerEmail.text, /\bpaid\b|\bpayment\b|\bcheckout\b/i);
const adminEmail = buildAdminCustomOrderEmail({
  order: emailOrder,
  request: emailRequest,
  customer: { id: "customer-email" },
  optionSummary: emailSummary
});
assert.match(adminEmail.text, /request-email/);
assert.match(adminEmail.text, /ada@example\.com/);
assert.match(adminEmail.text, /customer-email/);

const fetchCalls = [];
const sentEmailResult = await sendCustomOrderEmails({
  order: emailOrder,
  request: emailRequest,
  customer: { id: "customer-email" },
  optionSummary: emailSummary
}, {
  env: validEmailEnv,
  fetchImpl: async (url, options) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      async json() {
        return { id: `email-${fetchCalls.length}` };
      }
    };
  }
});
assert.deepEqual(sentEmailResult, {
  status: "sent",
  customerEmailId: "email-1",
  adminEmailId: "email-2"
});
assert.equal(fetchCalls.length, 2);
assert.equal(fetchCalls[0].options.headers["Idempotency-Key"], `custom-order-${emailRequest.id}-customer`);
assert.equal(fetchCalls[1].options.headers["Idempotency-Key"], `custom-order-${emailRequest.id}-admin`);

const secondRequestFetchCalls = [];
const secondEmailRequest = { ...emailRequest, id: "request-email-second" };
await sendCustomOrderEmails({
  order: emailOrder,
  request: secondEmailRequest,
  customer: { id: "customer-email" },
  optionSummary: emailSummary
}, {
  env: validEmailEnv,
  fetchImpl: async (url, options) => {
    secondRequestFetchCalls.push({ url, options });
    return {
      ok: true,
      async json() {
        return { id: `email-second-${secondRequestFetchCalls.length}` };
      }
    };
  }
});
assert.equal(secondRequestFetchCalls.length, 2);
assert.equal(secondRequestFetchCalls[0].options.headers["Idempotency-Key"], `custom-order-${secondEmailRequest.id}-customer`);
assert.equal(secondRequestFetchCalls[1].options.headers["Idempotency-Key"], `custom-order-${secondEmailRequest.id}-admin`);
assert.notEqual(secondRequestFetchCalls[0].options.headers["Idempotency-Key"], fetchCalls[0].options.headers["Idempotency-Key"]);
assert.notEqual(secondRequestFetchCalls[1].options.headers["Idempotency-Key"], fetchCalls[1].options.headers["Idempotency-Key"]);

const missingEmailFetchCalls = [];
assert.deepEqual(await sendCustomOrderEmails({
  order: emailOrder,
  request: { id: "request-email", status: "pending", created_at: "2026-06-30T12:00:00.000Z" },
  customer: { id: "customer-email" },
  optionSummary: emailSummary
}, {
  env: {},
  fetchImpl: async () => {
    missingEmailFetchCalls.push("called");
  }
}), {
  status: "not_configured",
  missingEnv: ["RESEND_API_KEY", "MARIS_EMAIL_FROM", "MARIS_ORDER_EMAIL_TO"]
});
assert.equal(missingEmailFetchCalls.length, 0);

const invalidAdminEmailFetchCalls = [];
assert.deepEqual(await sendCustomOrderEmails({
  order: emailOrder,
  request: { id: "request-email", status: "pending", created_at: "2026-06-30T12:00:00.000Z" },
  customer: { id: "customer-email" },
  optionSummary: emailSummary
}, {
  env: { ...validEmailEnv, MARIS_ORDER_EMAIL_TO: "bad-address" },
  fetchImpl: async () => {
    invalidAdminEmailFetchCalls.push("called");
  }
}), {
  status: "not_configured",
  missingEnv: ["MARIS_ORDER_EMAIL_TO"]
});
assert.equal(invalidAdminEmailFetchCalls.length, 0);

const routeSource = await readFile(new URL("../app/api/custom-order-requests/route.js", import.meta.url), "utf8");
assert.match(routeSource, /createCustomOrderRequest/);
assert.match(routeSource, /sendCustomOrderEmails/);
assert.match(routeSource, /from "next\/server"/);
assert.doesNotMatch(routeSource, /\.\.\.(?:result|data|row)\b/);
assert.match(routeSource, /email_not_configured/);
assert.match(routeSource, /email_failed/);

const nextServerUrl = new URL("../node_modules/next/server.js", import.meta.url).href;
const routeEmailUrl = new URL("../app/lib/custom-order-email.js", import.meta.url).href;
const routeRequestsUrl = new URL("../app/lib/custom-order-requests.js", import.meta.url).href;
const routeForDirectImport = routeSource
  .replace('from "next/server"', `from "${nextServerUrl}"`)
  .replace('from "../../lib/custom-order-email.js"', `from "${routeEmailUrl}"`)
  .replace('from "../../lib/custom-order-requests.js"', `from "${routeRequestsUrl}"`);
const routeModuleUrl = `data:text/javascript;base64,${Buffer.from(routeForDirectImport).toString("base64")}`;
const { POST } = await import(routeModuleUrl);
const missingSupabaseResponse = await POST({
  async json() {
    return validPayload;
  }
});
assert.equal(missingSupabaseResponse.status, 503);
const missingSupabaseBody = await missingSupabaseResponse.json();
assert.deepEqual(missingSupabaseBody, {
  status: "not_configured",
  error: "Service unavailable."
});
assert.equal(JSON.stringify(missingSupabaseBody).includes("serviceRoleKey"), false);

const invalidPhoneResponse = await POST({
  async json() {
    return { ...validPayload, contact_number: "12345" };
  }
});
assert.equal(invalidPhoneResponse.status, 400);
const invalidPhoneBody = await invalidPhoneResponse.json();
assert.equal(invalidPhoneBody.status, "invalid");
assert.ok(Array.isArray(invalidPhoneBody.errors));

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
  "idx_custom_order_requests_phone_digits",
  "idx_custom_order_requests_product_code",
  "idx_custom_order_requests_status_created_at"
]) {
  assert.match(migration, new RegExp(`create index if not exists ${indexName}\\b`, "i"), `Migration should include ${indexName}`);
}
assert.match(
  migration,
  /idx_custom_order_requests_phone_digits[\s\S]*?\(\(metadata->>'phoneDigits'\)\)/i,
  "Migration should index normalized phone digits in custom order metadata"
);

const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
assert.match(envExample, /^MARIS_ORDER_EMAIL_TO=/m, ".env.example should document MARIS_ORDER_EMAIL_TO");

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(packageJson.scripts["test:custom-order"], "node scripts/test-custom-order.mjs");

const contactOrderPageSource = await readRequiredSource("../app/contact-order/[productCode]/page.js");
assert.match(contactOrderPageSource, /dynamic\s*=\s*["']force-dynamic["']/);
assert.match(contactOrderPageSource, /decodeURIComponent/);
assert.match(contactOrderPageSource, /\.toUpperCase\(\)/);
assert.match(contactOrderPageSource, /generateMetadata/);
assert.match(contactOrderPageSource, /CustomOrderForm/);
assert.match(contactOrderPageSource, /productCode=\{decodedProductCode\}/);

const customOrderFormSource = await readRequiredSource("../app/contact-order/[productCode]/CustomOrderForm.jsx");
assert.match(customOrderFormSource, /^"use client";/);
assert.deepEqual(
  readStringArrayConstant(customOrderFormSource, "STONE_COLORS").filter(Boolean),
  Array.from(BACKEND_STONE_COLORS),
  "Custom order UI stone color options should match backend allowed values"
);
assert.deepEqual(
  readStringArrayConstant(customOrderFormSource, "STONE_CLARITIES").filter(Boolean),
  Array.from(BACKEND_STONE_CLARITIES),
  "Custom order UI stone clarity options should match backend allowed values"
);
assert.deepEqual(
  readStringArrayConstant(customOrderFormSource, "STONE_CUTS").filter(Boolean),
  Array.from(BACKEND_STONE_CUTS),
  "Custom order UI stone cut options should match backend allowed values"
);
for (const fieldName of ["product_code", "full_name", "company_name", "email", "contact_number", "website_url"]) {
  assert.match(customOrderFormSource, new RegExp(`name=["']${fieldName}["']`), `Custom order form should include ${fieldName}`);
}
assert.match(customOrderFormSource, /readOnly/);
assert.match(customOrderFormSource, /Additional Options/);
assert.match(customOrderFormSource, /\/api\/custom-order-requests/);
assert.match(customOrderFormSource, /custom_options/);
assert.match(customOrderFormSource, /product_code:\s*productCode/);
assert.match(customOrderFormSource, /pending/);
assert.match(customOrderFormSource, /disabled=\{pending\}/);
assert.match(customOrderFormSource, /created/);
assert.match(customOrderFormSource, /duplicate/);
assert.match(customOrderFormSource, /Request received\. The Maris team will contact you to confirm product details\./);
assert.match(customOrderFormSource, /aria-live=["']polite["']/);
assert.match(customOrderFormSource, /role=["']dialog["']/);
assert.match(customOrderFormSource, /aria-modal=["']true["']/);
assert.match(customOrderFormSource, /Escape/);
assert.match(customOrderFormSource, /optionTriggerRef\.current\?\.focus\(\)/);
assert.match(customOrderFormSource, /\["WG",\s*"YG",\s*"RG",\s*"PN",\s*"Pd"\]/);
assert.match(customOrderFormSource, /PN:\s*"Platinum"/);
assert.match(customOrderFormSource, /Pd:\s*"Palladium"/);
assert.match(customOrderFormSource, /\{METAL_LABELS\[metal\]\}/);
assert.match(customOrderFormSource, /\["9K",\s*"14K",\s*"18K"\]/);
assert.match(customOrderFormSource, /GOLD_METALS\.has/);
assert.match(customOrderFormSource, /metal_purity:\s*isGoldMetal/);
assert.match(customOrderFormSource, /min=["']5["']/);
assert.match(customOrderFormSource, /max=["']16["']/);
assert.match(customOrderFormSource, /step=["']0\.5["']/);
for (const stoneField of ["carat", "color", "clarity", "cut"]) {
  assert.match(customOrderFormSource, new RegExp(`name=["']${stoneField}["']`), `Stone option should include ${stoneField}`);
}
assert.match(customOrderFormSource, /Lab-grown/);
assert.match(customOrderFormSource, /Natural/);
assert.match(customOrderFormSource, /selectedOptionSummary/);
assert.doesNotMatch(customOrderFormSource, /\bcheckout\b|\bpayment\b|\bpaid\b/i);

const customOrderCss = await readRequiredSource("../assets/css/custom-order.css");
assert.match(customOrderCss, /custom-jewelry-service-hero-02-seamless\.png/);
assert.match(customOrderCss, /var\(--maris-teal\)/);
assert.match(customOrderCss, /var\(--maris-paper\)/);
assert.match(customOrderCss, /var\(--maris-gold\)/);
assert.match(customOrderCss, /@media\s*\(max-width:\s*768px\)/);
assert.match(customOrderCss, /grid-template-columns:\s*1fr/);
assert.match(customOrderCss, /\.custom-order-modal/);
assert.match(customOrderCss, /bottom:\s*0/);
assert.doesNotMatch(customOrderCss, /letter-spacing:\s*-/);
assert.doesNotMatch(customOrderCss, /font-size:\s*[^;]*vw/);
assert.doesNotMatch(customOrderCss, /orb|blob|bokeh/i);

const layoutSource = await readRequiredSource("../app/layout.js");
const productCssImportIndex = layoutSource.indexOf('import "../assets/css/product.css";');
const customOrderCssImportIndex = layoutSource.indexOf('import "../assets/css/custom-order.css";');
assert.ok(productCssImportIndex >= 0, "Root layout should import product CSS");
assert.ok(customOrderCssImportIndex > productCssImportIndex, "Custom order CSS should load after product CSS");

const productPageSource = await readRequiredSource("../app/product/[slug]/product-slug-page.js");
assert.match(productPageSource, /href=\{`\/contact-order\/\$\{encodeURIComponent\(product\.sku\)\}`\}/);
assert.match(productPageSource, /Contact Maris to Order/);
assert.doesNotMatch(productPageSource, /\/request-quote\?collection=/);
assert.doesNotMatch(productPageSource, /Confirm Availability/);

const databaseLib = await readFile(new URL("../app/lib/maris-database.js", import.meta.url), "utf8");
assert.match(databaseLib, /"custom_order_requests"/, "Database table status contract should include custom_order_requests");

const databaseTest = await readFile(new URL("../scripts/test-supabase-admin-database.mjs", import.meta.url), "utf8");
assert.match(databaseTest, /"custom_order_requests"/, "Database schema test should expect custom_order_requests");
