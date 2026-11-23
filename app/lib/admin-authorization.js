import { SESSION_COOKIE_NAME, verifyAdminSession } from "./admin-auth.js";
import { getActiveAdminUserForSession } from "./admin-users.js";

export const ADMIN_PERMISSIONS = Object.freeze({
  READ: "read",
  CATALOGUE_WRITE: "catalogue:write",
  CATALOGUE_DELETE: "catalogue:delete",
  OPERATIONS_WRITE: "operations:write",
  PAYMENTS_WRITE: "payments:write",
  SETTINGS_WRITE: "settings:write",
  // Read-only lists of customer accounts and newsletter subscribers.
  CUSTOMERS_READ: "customers:read",
  NEWSLETTER_READ: "newsletter:read",
  // Downloading personal data (CSV). Narrower than reading it on screen.
  PERSONAL_DATA_EXPORT: "personal-data:export"
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
    ADMIN_PERMISSIONS.SETTINGS_WRITE,
    ADMIN_PERMISSIONS.CUSTOMERS_READ,
    ADMIN_PERMISSIONS.NEWSLETTER_READ
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

// Everything a role may do, so the admin page can hide or disable the controls
// the role cannot use. The API routes still enforce each permission.
export function getAdminRolePermissions(role) {
  return [...(ROLE_PERMISSIONS[normalizeAdminRole(role)] || [])];
}

const ROLE_LABELS = Object.freeze({
  owner: "Owner",
  ceo: "CEO",
  developer: "Developer",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  viewer: "Viewer (read-only)"
});

export function getAdminRoleLabel(role) {
  const key = normalizeAdminRole(role);
  return ROLE_LABELS[key] || (key ? key.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase()) : "Admin");
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
