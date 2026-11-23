import ResetPasswordClient from "./ResetPasswordClient";
import { inspectPasswordResetToken } from "../../lib/customer-users.js";

// Shared by /account/reset-password and /th/account/reset-password. The token is
// checked on the server so an expired, invalid or used link shows its own state
// straight away instead of after a failed submit.
export default async function ResetPasswordView({ token, locale = "en" }) {
  let status = "invalid";

  if (token) {
    try {
      const result = await inspectPasswordResetToken(token);
      status = result.status === "not_configured" ? "unavailable" : result.status;
    } catch {
      status = "unavailable";
    }
  }

  return <ResetPasswordClient token={token} initialStatus={status} locale={locale} />;
}
