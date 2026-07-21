import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const {
  SESSION_COOKIE_NAME,
  createAdminSession,
  getAdminConfig,
  hashAdminPassword,
  verifyAdminPassword,
  verifyAdminSession
} = await import("../app/lib/admin-auth.js");

const {
  authenticateAdminUser,
  createInitialAdminUser,
  getActiveAdminUserForSession,
  getAdminSetupState,
  normalizeAdminUsername
} = await import("../app/lib/admin-users.js");

const {
  ADMIN_PERMISSIONS,
  adminRoleHasPermission,
  normalizeAdminRole
} = await import("../app/lib/admin-authorization.js");

function createAdminUsersClient({ users = [], count = users.length, insertError = null } = {}) {
  const state = {
    inserted: [],
    queries: [],
    updates: []
  };

  return {
    state,
    from(tableName) {
      assert.equal(tableName, "admin_users");

      const query = {
        filters: [],
        select(columns, options) {
          state.queries.push(["select", columns, options || null]);

          if (options?.head) {
            return Promise.resolve({ count, error: null });
          }

          return this;
        },
        eq(column, value) {
          this.filters.push([column, value]);
          return this;
        },
        limit(value) {
          state.queries.push(["limit", value]);
          return this;
        },
        async maybeSingle() {
          const usernameFilter = this.filters.find(([column]) => column === "username");
          const user = usernameFilter
            ? users.find((row) => row.username === usernameFilter[1]) || null
            : users[0] || null;

          return { data: user, error: null };
        }
      };

      return {
        select: query.select.bind(query),
        insert(row) {
          state.inserted.push(row);

          return {
            select(columns) {
              state.queries.push(["insert.select", columns, null]);

              return {
                async single() {
                  if (insertError) {
                    return { data: null, error: insertError };
                  }

                  return {
                    data: {
                      id: "new-owner-id",
                      ...row
                    },
                    error: null
                  };
                }
              };
            }
          };
        },
        update(row) {
          state.updates.push(row);

          return {
            async eq(column, value) {
              state.queries.push(["update.eq", column, value]);
              return { error: null };
            }
          };
        }
      };
    }
  };
}

const env = {
  MARIS_ADMIN_SESSION_SECRET: "session-secret-for-tests",
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};

assert.equal(normalizeAdminUsername("  Owner "), "owner");
assert.equal(normalizeAdminUsername(""), "");
assert.equal(normalizeAdminRole("  Developer "), "developer");
assert.equal(adminRoleHasPermission("CEO", ADMIN_PERMISSIONS.PAYMENTS_WRITE), true);
assert.equal(adminRoleHasPermission("Manager", ADMIN_PERMISSIONS.OPERATIONS_WRITE), true);
assert.equal(adminRoleHasPermission("Manager", ADMIN_PERMISSIONS.PAYMENTS_WRITE), false);
assert.equal(adminRoleHasPermission("Viewer", ADMIN_PERMISSIONS.READ), true);
assert.equal(adminRoleHasPermission("Viewer", ADMIN_PERMISSIONS.CATALOGUE_WRITE), false);
assert.equal(adminRoleHasPermission("unknown", ADMIN_PERMISSIONS.READ), false);
assert.equal(getAdminConfig({ MARIS_ADMIN_SESSION_SECRET: "replace-with-a-long-random-secret" }).isConfigured, false);
assert.equal(getAdminConfig({ MARIS_ADMIN_SESSION_SECRET: "real-session-secret" }).isConfigured, true);

const firstHash = hashAdminPassword("owner-password", { salt: "fixed-salt" });
const secondHash = hashAdminPassword("owner-password", { salt: "another-salt" });
assert.match(firstHash, /^scrypt:v1:/);
assert.notEqual(firstHash, secondHash);
assert.equal(verifyAdminPassword("owner-password", firstHash), true);
assert.equal(verifyAdminPassword("wrong-password", firstHash), false);
assert.equal(verifyAdminPassword("owner-password", "owner-password"), false, "Plain text passwords must never verify");

const activeUser = {
  id: "owner-id",
  username: "owner",
  display_name: "Owner",
  role: "owner",
  is_active: true,
  password_hash: firstHash
};
const activeClient = createAdminUsersClient({ users: [activeUser] });
const authResult = await authenticateAdminUser("  Owner ", "owner-password", { env, client: activeClient });
assert.equal(authResult.status, "valid");
assert.deepEqual(authResult.user, {
  id: "owner-id",
  username: "owner",
  displayName: "Owner",
  role: "owner",
  isActive: true
});
assert.deepEqual(activeClient.state.updates[0], { last_signed_in_at: activeClient.state.updates[0].last_signed_in_at });

const activeSessionUser = await getActiveAdminUserForSession({
  userId: activeUser.id,
  username: activeUser.username
}, { env, client: activeClient });
assert.equal(activeSessionUser.status, "valid");
assert.equal(activeSessionUser.user.id, activeUser.id);
assert.equal("passwordHash" in activeSessionUser.user, false);

const badPassword = await authenticateAdminUser("owner", "wrong-password", {
  env,
  client: createAdminUsersClient({ users: [activeUser] })
});
assert.equal(badPassword.status, "invalid");

const inactive = await authenticateAdminUser("owner", "owner-password", {
  env,
  client: createAdminUsersClient({ users: [{ ...activeUser, is_active: false }] })
});
assert.equal(inactive.status, "invalid");

const missingEnv = await authenticateAdminUser("owner", "owner-password", { env: {}, client: activeClient });
assert.equal(missingEnv.status, "not_configured");
assert.deepEqual(missingEnv.missingEnv, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MARIS_ADMIN_SESSION_SECRET"]);

const missingSessionSecret = await getAdminSetupState({
  env: {
    SUPABASE_URL: "https://maris-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
  },
  client: activeClient
});
assert.equal(missingSessionSecret.isConfigured, false);
assert.deepEqual(missingSessionSecret.missingEnv, ["MARIS_ADMIN_SESSION_SECRET"]);

const setupClient = createAdminUsersClient({ users: [], count: 0 });
const setupState = await getAdminSetupState({ env, client: setupClient });
assert.equal(setupState.isConfigured, true);
assert.equal(setupState.hasAdminUsers, false);
assert.equal(setupState.canCreateInitialAdmin, true);

const created = await createInitialAdminUser({
  username: "Owner",
  displayName: "Maris Owner",
  password: "owner-password"
}, { env, client: setupClient });
assert.equal(created.status, "created");
assert.equal(created.user.username, "owner");
assert.equal(created.user.role, "owner");
assert.equal(setupClient.state.inserted.length, 1);
assert.equal(setupClient.state.inserted[0].username, "owner");
assert.equal(setupClient.state.inserted[0].role, "owner");
assert.notEqual(setupClient.state.inserted[0].password_hash, "owner-password");
assert.equal(verifyAdminPassword("owner-password", setupClient.state.inserted[0].password_hash), true);

const existing = await createInitialAdminUser({
  username: "second",
  password: "owner-password"
}, { env, client: createAdminUsersClient({ users: [activeUser], count: 1 }) });
assert.equal(existing.status, "already_exists");

const invalid = await createInitialAdminUser({
  username: " ",
  password: "short"
}, { env, client: setupClient });
assert.equal(invalid.status, "invalid");

process.env.MARIS_ADMIN_SESSION_SECRET = "session-secret-for-database-users";
const session = createAdminSession(created.user);
const verifiedSession = verifyAdminSession(session);
assert.equal(verifiedSession.isValid, true);
assert.equal(verifiedSession.username, "owner");
assert.equal(verifiedSession.userId, "new-owner-id");
assert.equal(verifiedSession.role, "owner");
assert.equal(SESSION_COOKIE_NAME, "maris_admin_session");
delete process.env.MARIS_ADMIN_SESSION_SECRET;

const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
const loginRoute = await readFile(new URL("../app/api/admin/login/route.js", import.meta.url), "utf8");
const setupRoute = await readFile(new URL("../app/api/admin/setup/route.js", import.meta.url), "utf8");
const uploadRoute = await readFile(new URL("../app/api/admin/uploads/product-image/route.js", import.meta.url), "utf8");
const setupPage = await readFile(new URL("../app/admin/setup/page.js", import.meta.url), "utf8");

assert.doesNotMatch(envExample, /^MARIS_ADMIN_PASSWORD=/m, "Admin password should no longer be configured through env");
assert.match(envExample, /^MARIS_ADMIN_SESSION_SECRET=/m, "Session signing secret should remain server-side env");
assert.match(loginRoute, /authenticateAdminUser/, "Login route should authenticate against admin_users");
assert.match(setupRoute, /createInitialAdminUser/, "Setup route should create the first database owner");
assert.match(setupPage, /Create Owner Account/, "Setup page should exist for the first owner account");
assert.match(uploadRoute, /requireAdminPermission/, "Product image upload route must enforce current database-backed authorization");
assert.match(uploadRoute, /ADMIN_PERMISSIONS\.CATALOGUE_WRITE/, "Product image upload must require catalogue write permission");
assert.match(uploadRoute, /request\.formData/, "Product image upload route should parse multipart form data");
assert.match(uploadRoute, /uploadAdminProductImage/, "Product image upload route should delegate Storage writes to the database helper");
