import { SESSION_COOKIE_NAME, verifyAdminSession } from "./admin-auth.js";
import { getActiveAdminUserForSession } from "./admin-users.js";

export const ADMIN_PERMISSIONS = Object.freeze({
  READ: "read",
  CATALOGUE_WRITE: "catalogue:write",
  CATALOGUE_DELETE: "catalogue:delete",
  OPERATIONS_WRITE: "operations:write",
  PAYMENTS_WRITE: "payments:write",
  SETTINGS_WRITE: "settings:write"
});

const ALL_PERMISSIONS = Object.freeze(Object.values(ADMIN_PERMISSIONS));

const ROLE_PERMISSIONS = Object.freeze({
  owner: ALL_PERMISSIONS,
  ceo: ALL_PERMISSIONS,
  developer: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  manager: Object.freeze([
    ADMIN_PERMISSIONS.READ,
    ADMIN_PERMISSIONS.CATALOGUE_WRITE,
    ADMIN_PERMISSIONS.OPERATIONS_WRITE,
    ADMIN_PERMISSIONS.SETTINGS_WRITE
  ]),
  staff: Object.freeze([
    ADMIN_PERMISSIONS.READ,
    ADMIN_PERMISSIONS.OPERATIONS_WRITE
  ]),
  viewer: Object.freeze([ADMIN_PERMISSIONS.READ])
});

export function normalizeAdminRole(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "_");
}

export function adminRoleHasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[normalizeAdminRole(role)] || [];
  return permissions.includes(permission);
}

export async function authorizeAdminRequest(
  request,
  permission = ADMIN_PERMISSIONS.READ,
  options = {}
) {
  const sessionValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return authorizeAdminSessionValue(sessionValue, permission, options);
}

export async function authorizeAdminSessionValue(
  sessionValue,
  permission = ADMIN_PERMISSIONS.READ,
  options = {}
) {
  const session = verifyAdminSession(sessionValue);

  if (!session.isValid) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const adminResult = await getActiveAdminUserForSession(session, options);

  if (adminResult.status === "not_configured") {
    return {
      ok: false,
      status: 503,
      error: "Admin authorization is not configured.",
      missingEnv: adminResult.missingEnv
    };
  }

  if (adminResult.status !== "valid") {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  if (!adminRoleHasPermission(adminResult.user.role, permission)) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  return { ok: true, status: 200, session, user: adminResult.user };
}
