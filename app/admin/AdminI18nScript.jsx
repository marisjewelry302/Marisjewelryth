import { buildAdminI18nBootstrap } from "../lib/admin-i18n";

// Hands the active language to the admin's browser scripts: window.MARIS_ADMIN_I18N
// (dictionary, locale, language cookie) and the t(key, vars) helper. It is an
// inline script, so it has run before any admin script starts. Pages with no
// browser text of their own (sign-in, setup) pass withMessages={false}.
export default function AdminI18nScript({ lang, withMessages = true }) {
  return (
    <script
      id="maris-admin-i18n"
      dangerouslySetInnerHTML={{ __html: buildAdminI18nBootstrap(lang, { withMessages }) }}
    />
  );
}
