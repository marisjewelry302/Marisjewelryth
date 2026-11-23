import { redirect } from "next/navigation";
import Image from "next/image";
import { ADMIN_PASSWORD_MIN_LENGTH } from "../../lib/admin-auth";
import { createAdminT } from "../../lib/admin-i18n";
import { readAdminLang } from "../../lib/admin-lang";
import {
  getAdminSetupState,
  logAdminConfigProblem
} from "../../lib/admin-users";
import AdminI18nScript from "../AdminI18nScript";
import AdminLangSwitch, { AdminLangToggleScript } from "../AdminLangSwitch";
import styles from "../login/login.module.css";

export const dynamic = "force-dynamic";

function getMessage(t, error, setupState, setupReadError) {
  if (setupReadError || error === "database" || setupState?.isConfigured === false) {
    return t("login.dbNotConnected");
  }

  if (error === "mismatch") {
    return t("setup.mismatch");
  }

  if (error === "invalid") {
    return t("setup.invalid", { min: ADMIN_PASSWORD_MIN_LENGTH });
  }

  if (error === "rate_limit") {
    return t("setup.rateLimit");
  }

  if (error === "security") {
    return t("setup.security");
  }

  return null;
}

export default async function AdminSetupPage({ searchParams }) {
  const lang = await readAdminLang();
  const { t } = createAdminT(lang);
  const params = await searchParams;
  const error = params?.error;
  let setupState = null;
  let setupReadError = null;

  try {
    setupState = await getAdminSetupState();
  } catch (readError) {
    setupReadError = readError;
  }

  if (setupState?.hasAdminUsers) {
    redirect("/admin/login");
  }

  if (setupReadError || setupState?.isConfigured === false) {
    logAdminConfigProblem("setup page", { missingEnv: setupState?.missingEnv, error: setupReadError });
  }

  const message = getMessage(t, error, setupState, setupReadError);
  const canCreate = setupState?.canCreateInitialAdmin === true;

  return (
    <main className={styles.page} id="main-content" lang={lang} data-admin-lang={lang}>
      <AdminI18nScript lang={lang} withMessages={false} />
      <section className={styles.panel} aria-labelledby="admin-setup-title">
        <AdminLangSwitch lang={lang} t={t} className={styles.langSwitch} />
        <Image className={styles.logo} src="/assets/images/logo.png" alt={t("login.logoAlt")} width={128} height={128} priority />
        <p className={styles.kicker}>{t("login.kicker")}</p>
        <h1 className={styles.title} id="admin-setup-title">{t("setup.title")}</h1>
        <p className={styles.copy}>
          {t("setup.copy")}
        </p>

        {message ? (
          <p className={`${styles.message} ${styles.setup}`} role="alert">{message}</p>
        ) : null}

        <form className={styles.form} action="/api/admin/setup" method="post">
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
            {t("setup.displayName")}
            <input
              className={styles.input}
              name="displayName"
              type="text"
              autoComplete="name"
            />
          </label>

          <label className={styles.label}>
            {t("login.password")}
            <input
              className={styles.input}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={ADMIN_PASSWORD_MIN_LENGTH}
              aria-describedby="admin-setup-password-hint"
              required
            />
            <span className={styles.hint} id="admin-setup-password-hint">
              {t("setup.passwordHint", { min: ADMIN_PASSWORD_MIN_LENGTH })}
            </span>
          </label>

          <label className={styles.label}>
            {t("setup.confirmPassword")}
            <input
              className={styles.input}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={ADMIN_PASSWORD_MIN_LENGTH}
              required
            />
          </label>

          <button className={styles.button} type="submit" disabled={!canCreate}>
            {t("setup.submit")}
          </button>
        </form>
      </section>
      <AdminLangToggleScript />
    </main>
  );
}
