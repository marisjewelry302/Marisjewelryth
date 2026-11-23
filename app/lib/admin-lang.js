// Server-only: the admin language for the current request. The choice lives in
// the maris_admin_lang cookie (path /admin); English when it is missing or odd.
import { cookies } from "next/headers";
import { ADMIN_LANG_COOKIE, normalizeAdminLang } from "./admin-i18n.js";

export async function readAdminLang() {
  const cookieStore = await cookies();
  return normalizeAdminLang(cookieStore.get(ADMIN_LANG_COOKIE)?.value);
}
