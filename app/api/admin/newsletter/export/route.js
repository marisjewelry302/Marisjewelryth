import { requireAdminPermission } from "../../../../lib/admin-api-auth";
import { createAdminPeopleHandlers } from "../../../../lib/admin-people-api";
import { readAdminCustomerList, readAdminNewsletterSubscribers } from "../../../../lib/maris-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSV download of the current filter. Owner and admin only (personal-data:export).
const handlers = createAdminPeopleHandlers("newsletter", {
  requirePermission: requireAdminPermission,
  readCustomers: readAdminCustomerList,
  readSubscribers: readAdminNewsletterSubscribers
});

export const GET = (request) => handlers.export(request);
