import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, authorizeAdminRequest } from "./admin-authorization.js";
import { isSameOriginRequest, isUnsafeRequest } from "./request-security.js";

export { ADMIN_PERMISSIONS };

export async function requireAdminPermission(request, permission = ADMIN_PERMISSIONS.READ) {
  try {
    if (isUnsafeRequest(request) && !isSameOriginRequest(request)) {
      return {
        ok: false,
        status: 403,
        error: "cross_origin_request_blocked",
        response: NextResponse.json(
          { error: "Cross-origin admin requests are not allowed." },
          {
            status: 403,
            headers: { "Cache-Control": "private, no-store" }
          }
        )
      };
    }

    const authorization = await authorizeAdminRequest(request, permission);

    if (authorization.ok) {
      return authorization;
    }

    return {
      ...authorization,
      response: NextResponse.json(
        {
          error: authorization.error,
          ...(authorization.missingEnv ? { missingEnv: authorization.missingEnv } : {})
        },
        {
          status: authorization.status,
          headers: { "Cache-Control": "private, no-store" }
        }
      )
    };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      error: "Admin authorization could not be verified.",
      response: NextResponse.json(
        { error: error instanceof Error ? error.message : "Admin authorization could not be verified." },
        {
          status: 503,
          headers: { "Cache-Control": "private, no-store" }
        }
      )
    };
  }
}
