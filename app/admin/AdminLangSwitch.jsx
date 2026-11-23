import Script from "next/script";
import { buildAdminScriptSrc } from "../lib/admin-script-src";

// The compact TH | EN switch. It is plain markup: assets/js/admin-lang-toggle.js
// stores the choice in the maris_admin_lang cookie and reloads the page.
export default function AdminLangSwitch({ lang, t, className = "" }) {
  return (
    <div className={`admin-lang-switch ${className}`.trim()} role="group" aria-label={t("lang.groupLabel")} data-admin-lang-switch>
      <button type="button" lang="th" data-admin-lang-set="th" aria-pressed={lang === "th"} title={t("lang.thTitle")}>TH</button>
      <button type="button" lang="en" data-admin-lang-set="en" aria-pressed={lang === "en"} title={t("lang.enTitle")}>EN</button>
    </div>
  );
}

// Loads the script that makes the switch work (needs AdminI18nScript first).
export async function AdminLangToggleScript() {
  const src = await buildAdminScriptSrc("/assets/js/admin-lang-toggle.js");
  return <Script src={src} strategy="afterInteractive" />;
}
