import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const {
  buildOneClickUnsubscribeUrl,
  buildUnsubscribeUrl,
  createUnsubscribeToken,
  verifyUnsubscribeToken
} = await import("../app/lib/email-unsubscribe.js");
const { buildWelcomeEmail, sendWelcomeEmail } = await import("../app/lib/customer-email.js");
const { deleteEmailSubscriber, unsubscribeEmail } = await import("../app/lib/customer-subscribers.js");
const { deleteCustomerAccount } = await import("../app/lib/customer-users.js");
const { hashCustomerPassword } = await import("../app/lib/customer-auth.js");

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const env = { MARIS_CUSTOMER_SESSION_SECRET: "test-signing-secret" };
const supabaseEnv = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};

// --- Unsubscribe tokens ------------------------------------------------------
const token = createUnsubscribeToken("Ada@Example.com ", { env });
assert.ok(token, "a token is created when the signing secret is set");
assert.deepEqual(verifyUnsubscribeToken(token, { env }), { isValid: true, email: "ada@example.com" });
assert.equal(createUnsubscribeToken("ada@example.com", { env: {} }), "", "no secret means no token");
assert.equal(createUnsubscribeToken("not-an-email", { env }), "");

const [payload] = token.split(".");
assert.equal(verifyUnsubscribeToken(`${payload}.forged`, { env }).isValid, false, "a forged signature is rejected");
assert.equal(
  verifyUnsubscribeToken(`${Buffer.from("other@example.com").toString("base64url")}.${token.split(".")[1]}`, { env }).isValid,
  false,
  "a token cannot be reused for another address"
);
assert.equal(verifyUnsubscribeToken(token, { env: { MARIS_CUSTOMER_SESSION_SECRET: "another-secret" } }).isValid, false);
assert.equal(verifyUnsubscribeToken("", { env }).isValid, false);
assert.match(buildUnsubscribeUrl("ada@example.com", { env }), /^https:\/\/.+\/unsubscribe\?token=/);
assert.match(buildOneClickUnsubscribeUrl("ada@example.com", { env }), /\/api\/unsubscribe\?token=/);

// --- Welcome email carries the unsubscribe link -------------------------------
const email = buildWelcomeEmail({ fullName: "Ada", email: "ada@example.com" }, { unsubscribeUrl: "https://maris.test/unsubscribe?token=abc" });
assert.match(email.html, /href="https:\/\/maris\.test\/unsubscribe\?token=abc"/);
assert.match(email.text, /Unsubscribe at any time: https:\/\/maris\.test\/unsubscribe\?token=abc/);

const calls = [];
const sent = await sendWelcomeEmail(
  { id: "customer-1", fullName: "Ada", email: "ada@example.com" },
  {
    env: { ...env, RESEND_API_KEY: "re_test", MARIS_EMAIL_FROM: "Maris <welcome@example.com>" },
    fetchImpl: async (url, options) => {
      calls.push(JSON.parse(options.body));
      return { ok: true, status: 200, async json() { return { id: "email-1" }; }, async text() { return ""; } };
    }
  }
);
assert.equal(sent.status, "sent");
assert.match(calls[0].headers["List-Unsubscribe"], /^<https:\/\/.+\/api\/unsubscribe\?token=.+>$/);
assert.equal(calls[0].headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
assert.match(calls[0].html, /Unsubscribe/);

const noSecret = await sendWelcomeEmail(
  { id: "customer-1", fullName: "Ada", email: "ada@example.com" },
  {
    env: { RESEND_API_KEY: "re_test", MARIS_EMAIL_FROM: "Maris <welcome@example.com>" },
    fetchImpl: async () => { throw new Error("must not send without an unsubscribe link"); }
  }
);
assert.equal(noSecret.status, "not_configured", "a marketing email must not be sent without an unsubscribe link");

// --- Subscriber helpers -------------------------------------------------------
function createRecorder() {
  const state = { updates: [], deletes: [] };
  return {
    state,
    from(table) {
      assert.equal(table, "customer_email_subscribers");
      return {
        update(payload) {
          return { async eq(column, value) { state.updates.push({ payload, column, value }); return { error: null }; } };
        },
        delete() {
          return { async eq(column, value) { state.deletes.push({ column, value }); return { error: null }; } };
        }
      };
    }
  };
}

const recorder = createRecorder();
assert.equal((await unsubscribeEmail(" ADA@example.com", { env: supabaseEnv, client: recorder })).status, "unsubscribed");
assert.deepEqual(recorder.state.updates[0], { payload: { consent: false }, column: "email", value: "ada@example.com" });
assert.equal((await unsubscribeEmail("bad", { env: supabaseEnv, client: recorder })).status, "invalid");
assert.equal((await unsubscribeEmail("ada@example.com", { env: {} })).status, "not_configured");
assert.equal((await deleteEmailSubscriber("ada@example.com", { env: supabaseEnv, client: recorder })).status, "deleted");
assert.deepEqual(recorder.state.deletes[0], { column: "email", value: "ada@example.com" });

// --- Account deletion ---------------------------------------------------------
function createAccountClient(passwordHash) {
  const log = [];
  return {
    log,
    from(table) {
      return {
        select() {
          return { eq() { return { async maybeSingle() { return { data: { id: "customer-1", email: "ada@example.com", password_hash: passwordHash, metadata: {} }, error: null }; } }; } };
        },
        delete() {
          return { async eq(column, value) { log.push({ table, column, value }); return { error: null }; } };
        }
      };
    }
  };
}

const goodHash = hashCustomerPassword("correct horse battery");
const wrong = createAccountClient(goodHash);
assert.equal((await deleteCustomerAccount("customer-1", "wrong password", { env: supabaseEnv, client: wrong })).status, "wrong_password");
assert.equal(wrong.log.length, 0, "a wrong password must delete nothing");

const right = createAccountClient(goodHash);
assert.equal((await deleteCustomerAccount("customer-1", "correct horse battery", { env: supabaseEnv, client: right })).status, "deleted");
assert.deepEqual(
  right.log.map((entry) => [entry.table, entry.column, entry.value]),
  [
    ["customer_email_subscribers", "email", "ada@example.com"],
    ["customers", "id", "customer-1"]
  ],
  "the marketing record goes first, then the account"
);
assert.equal((await deleteCustomerAccount("customer-1", "x", { env: {} })).status, "not_configured");

// --- Wiring: routes and UI ----------------------------------------------------
const welcomeRoute = await read("app/api/account/welcome-email/route.js");
assert.match(welcomeRoute, /marketingConsent !== true/, "the welcome route must require explicit marketing consent");

const account = await read("app/account/AccountClient.jsx");
assert.match(account, /name="marketing" type="checkbox"/, "sign-up has a marketing checkbox");
assert.doesNotMatch(account, /id="create-marketing"[^>]*defaultChecked=\{true\}/, "the box must not be ticked by default");
assert.match(account, /if \(wantsMarketing\)/, "the welcome email is only requested after the box is ticked");
assert.match(account, /marketingConsent: true/);
assert.match(account, /\/api\/account\/delete/, "the account page can delete the account");
assert.match(account, /name="deletePassword"/, "deleting asks for the password");

const popup = await read("app/HomeSignupPopup.jsx");
assert.match(popup, /agreeMarketing/, "the pop-up has its own marketing checkbox");
assert.match(popup, /if \(!agreeMarketing\)/, "the pop-up refuses to continue without it");
assert.doesNotMatch(popup, /By continuing, you agree to receive/, "consent must not be implied by pressing the button");

const deleteRoute = await read("app/api/account/delete/route.js");
assert.match(deleteRoute, /isSameOriginRequest/);
assert.match(deleteRoute, /verifyCustomerSession/);
assert.match(deleteRoute, /consumeAuthAttempt/);

const unsubscribeRoute = await read("app/api/unsubscribe/route.js");
assert.match(unsubscribeRoute, /verifyUnsubscribeToken/);
assert.doesNotMatch(unsubscribeRoute, /export async function GET/, "a GET must never unsubscribe anyone");

console.log("PASS: Marketing consent, unsubscribe links, and account deletion.");
