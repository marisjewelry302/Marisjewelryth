import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const {
  ADMIN_CUSTOM_ORDER_STATUSES,
  AdminCustomOrderRequestError,
  normalizeCustomOrderRequest,
  updateAdminCustomOrderRequest
} = await import("../app/lib/maris-database.js");

const env = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};
const existingRequest = {
  id: "request-1",
  customer_id: "customer-1",
  product_code: "CUSTOM-RING",
  full_name: "Ada Client",
  company_name: null,
  email: "ada@example.com",
  contact_number: "+66 81 234 5678",
  metal: "YG",
  metal_purity: "18K",
  ring_size: 7,
  stone_carat: 0.8,
  stone_color: "D",
  stone_clarity: "VVS1",
  stone_cut: "Excellent",
  origin: "Lab-grown",
  status: "pending",
  metadata: {
    optionSummary: "18K Yellow Gold · Size 7",
    ringDesign: {
      style: "Solitaire",
      stoneShape: "Round",
      setting: "Four Prong",
      engravingEnabled: false,
      engravingText: null
    },
    tracking: {
      lastActionAt: "2026-07-19T09:00:00.000Z",
      lastActionBy: "owner",
      history: [{
        at: "2026-07-19T09:00:00.000Z",
        actor: "owner",
        fromStatus: "pending",
        toStatus: "pending",
        note: "Initial review"
      }]
    }
  },
  created_at: "2026-07-18T08:00:00.000Z",
  updated_at: "2026-07-19T09:00:00.000Z",
  customers: {
    id: "customer-1",
    full_name: "Ada Client",
    email: "ada@example.com",
    phone: "+66 81 234 5678"
  }
};

function createCustomRequestTrackingClient({ existing = existingRequest } = {}) {
  const state = {
    selects: [],
    updates: []
  };

  return {
    state,
    from(tableName) {
      assert.equal(tableName, "custom_order_requests");

      return {
        select(columns) {
          const queryState = { columns, filters: [], limit: null };
          state.selects.push(queryState);
          const query = {
            eq(column, value) {
              queryState.filters.push([column, value]);
              return query;
            },
            limit(value) {
              queryState.limit = value;
              return query;
            },
            async maybeSingle() {
              return { data: existing, error: null };
            }
          };
          return query;
        },
        update(payload) {
          const updateState = { payload, filters: [], columns: "" };
          state.updates.push(updateState);
          const query = {
            eq(column, value) {
              updateState.filters.push([column, value]);
              return query;
            },
            select(columns) {
              updateState.columns = columns;
              return {
                async single() {
                  return {
                    data: {
                      ...existing,
                      ...payload,
                      updated_at: "2026-07-20T10:00:00.000Z"
                    },
                    error: null
                  };
                }
              };
            }
          };
          return query;
        }
      };
    }
  };
}

assert.deepEqual(ADMIN_CUSTOM_ORDER_STATUSES, ["pending", "contacted", "completed", "cancelled"]);

const normalized = normalizeCustomOrderRequest(existingRequest);
assert.equal(normalized.status, "pending");
assert.equal(normalized.updatedAt, "2026-07-19T09:00:00.000Z");
assert.equal(normalized.tracking.history.length, 1);
assert.equal(normalized.tracking.history[0].note, "Initial review");

const trackingClient = createCustomRequestTrackingClient();
const updated = await updateAdminCustomOrderRequest("request-1", {
  status: "contacted",
  note: "Called client and booked a Friday consultation."
}, {
  env,
  client: trackingClient,
  actor: "owner",
  now: () => new Date("2026-07-20T10:00:00.000Z")
});

assert.equal(updated.status, "contacted");
assert.equal(updated.tracking.lastActionBy, "owner");
assert.equal(updated.tracking.history.length, 2);
assert.deepEqual(updated.tracking.history[1], {
  at: "2026-07-20T10:00:00.000Z",
  actor: "owner",
  fromStatus: "pending",
  toStatus: "contacted",
  note: "Called client and booked a Friday consultation."
});
assert.equal(trackingClient.state.updates[0].payload.metadata.optionSummary, "18K Yellow Gold · Size 7");
assert.deepEqual(trackingClient.state.updates[0].filters, [
  ["id", "request-1"],
  ["updated_at", "2026-07-19T09:00:00.000Z"]
]);

const noteOnlyClient = createCustomRequestTrackingClient();
const noteOnly = await updateAdminCustomOrderRequest("request-1", {
  status: "pending",
  note: "Sent a reminder email."
}, {
  env,
  client: noteOnlyClient,
  actor: "atelier"
});
assert.equal(noteOnly.status, "pending");
assert.equal(noteOnly.tracking.history.at(-1).note, "Sent a reminder email.");

await assert.rejects(
  updateAdminCustomOrderRequest("request-1", { status: "pending", note: "" }, {
    env,
    client: createCustomRequestTrackingClient()
  }),
  (error) => error instanceof AdminCustomOrderRequestError && error.statusCode === 400
);

await assert.rejects(
  updateAdminCustomOrderRequest("request-1", { status: "unknown" }, {
    env,
    client: createCustomRequestTrackingClient()
  }),
  (error) => error instanceof AdminCustomOrderRequestError && /not supported/i.test(error.message)
);

await assert.rejects(
  updateAdminCustomOrderRequest("request-1", { status: "contacted", note: "x".repeat(1001) }, {
    env,
    client: createCustomRequestTrackingClient()
  }),
  (error) => error instanceof AdminCustomOrderRequestError && /1000 characters/i.test(error.message)
);

await assert.rejects(
  updateAdminCustomOrderRequest("missing", { status: "contacted" }, {
    env,
    client: createCustomRequestTrackingClient({ existing: null })
  }),
  (error) => error instanceof AdminCustomOrderRequestError && error.statusCode === 404
);

const adminRoute = await readFile(new URL("../app/api/admin/custom-order-requests/route.js", import.meta.url), "utf8");
const adminPage = await readFile(new URL("../app/admin/page.js", import.meta.url), "utf8");
const adminScript = await readFile(new URL("../assets/js/admin-page.js", import.meta.url), "utf8");
const adminCss = await readFile(new URL("../app/admin/admin.css", import.meta.url), "utf8");

assert.match(adminRoute, /export async function PATCH/);
assert.match(adminRoute, /updateAdminCustomOrderRequest/);
assert.match(adminRoute, /session\.username/);
assert.match(adminRoute, /isSameOrigin/);
assert.match(adminPage, /data-custom-request-status-filter="pending"/);
assert.match(adminPage, /data-custom-request-search/);
assert.match(adminPage, /data-custom-request-detail/);
assert.match(adminScript, /data-custom-request-update/);
assert.match(adminScript, /method:\s*"PATCH"/);
assert.match(adminScript, /Follow-up history/);
assert.match(adminCss, /\.custom-request-status\[data-status="pending"\]/);
assert.match(adminCss, /\.custom-request-detail\[hidden\]/);

process.env.MARIS_ADMIN_SESSION_SECRET = "admin-custom-request-route-secret";
process.env.SUPABASE_URL = env.SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const { SESSION_COOKIE_NAME, createAdminSession } = await import("../app/lib/admin-auth.js");
const nextServerUrl = new URL("../node_modules/next/server.js", import.meta.url).href;
const adminAuthUrl = new URL("../app/lib/admin-auth.js", import.meta.url).href;
const databaseUrl = new URL("../app/lib/maris-database.js", import.meta.url).href;
const routeForDirectImport = adminRoute
  .replace('from "next/server"', `from "${nextServerUrl}"`)
  .replace('from "../../../lib/admin-auth"', `from "${adminAuthUrl}"`)
  .replace('from "../../../lib/maris-database"', `from "${databaseUrl}"`);
const routeModuleUrl = `data:text/javascript;base64,${Buffer.from(routeForDirectImport).toString("base64")}`;
const { PATCH } = await import(routeModuleUrl);
const adminSession = createAdminSession({ username: "owner", role: "owner" });

function createPatchRequest({ session = adminSession, origin = "https://admin.maris.test", body = { status: "unknown" } } = {}) {
  return {
    cookies: {
      get(name) {
        return name === SESSION_COOKIE_NAME && session ? { value: session } : undefined;
      }
    },
    headers: new Headers({ origin }),
    nextUrl: new URL("https://admin.maris.test/api/admin/custom-order-requests?id=request-1"),
    async json() {
      return body;
    }
  };
}

const unauthorizedResponse = await PATCH(createPatchRequest({ session: "" }));
assert.equal(unauthorizedResponse.status, 401);

const crossOriginResponse = await PATCH(createPatchRequest({ origin: "https://example.test" }));
assert.equal(crossOriginResponse.status, 403);

const invalidStatusResponse = await PATCH(createPatchRequest());
assert.equal(invalidStatusResponse.status, 400);
assert.match((await invalidStatusResponse.json()).error, /not supported/i);

delete process.env.MARIS_ADMIN_SESSION_SECRET;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Admin custom request tracking contract passed.");
