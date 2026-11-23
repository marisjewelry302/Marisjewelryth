// Request handling for the read-only Customers and Newsletter lists and their
// CSV exports. The route files supply the real permission check and database
// readers; tests supply fakes. Every handler checks permission before reading.

import { ADMIN_PERMISSIONS } from "./admin-authorization.js";
import {
  CUSTOMER_SORTS,
  NEWSLETTER_SORTS,
  NEWSLETTER_STATUSES,
  csvFilename,
  customersToCsv,
  filterCustomers,
  filterSubscribers,
  paginate,
  parseCsvLang,
  parsePeopleQuery,
  subscribersToCsv,
  toPublicCustomerRow,
  toPublicSubscriberRow
} from "./admin-people-lists.js";

const NO_STORE = { "Cache-Control": "private, no-store" };

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...NO_STORE }
  });
}

function csv(body, filename) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      ...NO_STORE
    }
  });
}

const LISTS = {
  customers: {
    readPermission: ADMIN_PERMISSIONS.CUSTOMERS_READ,
    reader: "readCustomers",
    key: "customers",
    sorts: CUSTOMER_SORTS,
    statuses: null,
    filter: filterCustomers,
    toRow: toPublicCustomerRow,
    toCsv: customersToCsv,
    label: "Customers"
  },
  newsletter: {
    readPermission: ADMIN_PERMISSIONS.NEWSLETTER_READ,
    reader: "readSubscribers",
    key: "subscribers",
    sorts: NEWSLETTER_SORTS,
    statuses: NEWSLETTER_STATUSES,
    filter: filterSubscribers,
    toRow: toPublicSubscriberRow,
    toCsv: subscribersToCsv,
    label: "Subscribers"
  }
};

export function createAdminPeopleHandlers(kind, { requirePermission, readCustomers, readSubscribers, now = () => new Date() }) {
  const list = LISTS[kind];
  const readers = { readCustomers, readSubscribers };

  async function load(request, permission) {
    const authorization = await requirePermission(request, permission);

    if (!authorization.ok) {
      return { response: authorization.response };
    }

    const data = await readers[list.reader]();
    const query = parsePeopleQuery(new URL(request.url).searchParams, { sorts: list.sorts, statuses: list.statuses });
    return { data, query };
  }

  return {
    async list(request) {
      try {
        const { response, data, query } = await load(request, list.readPermission);

        if (response) return response;

        const matches = list.filter(data[list.key], query);
        const pageResult = paginate(matches, query);

        return json({
          isConfigured: data.isConfigured,
          missingEnv: data.missingEnv || [],
          truncated: Boolean(data.truncated),
          [list.key]: pageResult.rows.map(list.toRow),
          total: pageResult.total,
          overallTotal: data[list.key].length,
          page: pageResult.page,
          pageSize: pageResult.pageSize,
          pageCount: pageResult.pageCount,
          query: { q: query.search, sort: query.sort, status: query.status },
          checkedAt: data.checkedAt
        }, data.isConfigured ? 200 : 503);
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : `${list.label} could not be loaded.` }, 500);
      }
    },

    // Downloading personal data needs more than being allowed to see the list.
    // The current search, sort and status are exported, not the page.
    async export(request) {
      try {
        const authorization = await requirePermission(request, ADMIN_PERMISSIONS.PERSONAL_DATA_EXPORT);

        if (!authorization.ok) return authorization.response;

        const readAuthorization = await requirePermission(request, list.readPermission);

        if (!readAuthorization.ok) return readAuthorization.response;

        const data = await readers[list.reader]();

        if (!data.isConfigured) {
          return json({ error: "The admin database isn't connected. Contact your developer.", missingEnv: data.missingEnv || [] }, 503);
        }

        const query = parsePeopleQuery(new URL(request.url).searchParams, { sorts: list.sorts, statuses: list.statuses });
        const rows = list.filter(data[list.key], query).map(list.toRow);

        // The CSV headers follow the language the admin page is in (?lang=th).
        const csvLang = parseCsvLang(new URL(request.url).searchParams);

        return csv(list.toCsv(rows, csvLang), csvFilename(kind, now()));
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "The export could not be created." }, 500);
      }
    }
  };
}
