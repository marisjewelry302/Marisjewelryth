import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "../../lib/admin-auth";
import { sanitizeAdminNextPath } from "../../lib/admin-next-path";
import { createAdminT } from "../../lib/admin-i18n";
import { readAdminLang } from "../../lib/admin-lang";
import {
  getAdminSetupState,
  logAdminConfigProblem
} from "../../lib/admin-users";
import AdminI18nScript from "../AdminI18nScript";
import AdminLangSwitch, { AdminLangToggleScript } from "../AdminLangSwitch";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const lang = await readAdminLang();
  const { t } = createAdminT(lang);

  const params = await searchParams;
  const nextPath = sanitizeAdminNextPath(Array.isArray(params?.next) ? params.next[0] : params?.next);

  if (verifyAdminSession(session).isValid) {
    redirect(nextPath);
  }

  const error = params?.error;
  let setupState = null;
  let setupReadError = null;

  try {
    setupState = await getAdminSetupState();
  } catch (readError) {
    setupReadError = readError;
  }

  if (setupState?.canCreateInitialAdmin) {
    redirect("/admin/setup");
  }

  const isInvalidLogin = error === "invalid";
  const isRateLimited = error === "rate_limit";
  const isSecurityBlock = error === "security";
  const isLoggedOut = params?.logged_out === "1" || params?.logged_out === "true";
  const isDatabaseError = error === "database" || setupReadError || setupState?.isConfigured === false;

  if (setupReadError || setupState?.isConfigured === false) {
    logAdminConfigProblem("sign-in page", { missingEnv: setupState?.missingEnv, error: setupReadError });
  }

  return (
    <main className={styles.page} id="main-content" lang={lang} data-admin-lang={lang}>
      <AdminI18nScript lang={lang} withMessages={false} />
      <section className={styles.panel} aria-labelledby="admin-login-title">
        <AdminLangSwitch lang={lang} t={t} className={styles.langSwitch} />
        <Image className={styles.logo} src="/assets/images/logo.png" alt={t("login.logoAlt")} width={128} height={128} priority />
        <p className={styles.kicker}>{t("login.kicker")}</p>
        <h1 className={styles.title} id="admin-login-title">{t("login.title")}</h1>
        <p className={styles.copy}>{t("login.copy")}</p>

        {isLoggedOut ? (
          <p className={`${styles.message} ${styles.success}`} role="status">{t("login.loggedOut")}</p>
        ) : null}

        {isInvalidLogin ? (
          <p className={styles.message} role="alert">{t("login.invalid")}</p>
        ) : null}

        {isRateLimited ? (
          <p className={styles.message} role="alert">{t("login.rateLimit")}</p>
        ) : null}

        {isSecurityBlock ? (
          <p className={styles.message} role="alert">{t("login.security")}</p>
        ) : null}

        {isDatabaseError ? (
          <p className={`${styles.message} ${styles.setup}`} role="alert">
            {t("login.dbNotConnected")}
          </p>
        ) : null}

        <form className={styles.form} action="/api/admin/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label className={styles.label}>
            {t("login.username")}
            <input
              className={styles.input}
              name="username"
              type="text"
              autoComplete="username"
              required
            />
          </label>

          <label className={styles.label}>
            {t("login.password")}
            <input
              className={styles.input}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className={styles.button} type="submit" disabled={Boolean(isDatabaseError)}>
            {t("login.submit")}
          </button>
        </form>
      </section>
      <AdminLangToggleScript />
    </main>
  );
}
