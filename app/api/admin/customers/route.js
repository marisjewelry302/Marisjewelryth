import { requireAdminPermission } from "../../../lib/admin-api-auth";
import { createAdminPeopleHandlers } from "../../../lib/admin-people-api";
import { readAdminCustomerList, readAdminNewsletterSubscribers } from "../../../lib/maris-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only list. Needs customers:read; see lib/admin-people-api.js.
const handlers = createAdminPeopleHandlers("customers", {
  requirePermission: requireAdminPermission,
  readCustomers: readAdminCustomerList,
  readSubscribers: readAdminNewsletterSubscribers
});

export const GET = (request) => handlers.list(request);
