import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifyAdminSession } from "../../lib/admin-auth";
import { getAdminSetupState } from "../../lib/admin-users";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (verifyAdminSession(session).isValid) {
    redirect("/admin");
  }

  const params = await searchParams;
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
  const isDatabaseError = error === "database" || setupReadError || setupState?.isConfigured === false;

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="admin-login-title">
        <Image className={styles.logo} src="/assets/images/logo.png" alt="Maris Jewelry" width={128} height={128} priority />
        <p className={styles.kicker}>Protected Back Office</p>
        <h1 className={styles.title} id="admin-login-title">Admin Login</h1>
        <p className={styles.copy}>Sign in before opening the Maris admin workspace.</p>

        {isInvalidLogin ? (
          <p className={styles.message}>Username or password is not correct.</p>
        ) : null}

        {isDatabaseError ? (
          <p className={`${styles.message} ${styles.setup}`}>
            Connect Supabase and set MARIS_ADMIN_SESSION_SECRET before using this admin.
          </p>
        ) : null}

        <form className={styles.form} action="/api/admin/login" method="post">
          <label className={styles.label}>
            Username
            <input
              className={styles.input}
              name="username"
              type="text"
              autoComplete="username"
              required
            />
          </label>

          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className={styles.button} type="submit" disabled={Boolean(isDatabaseError)}>
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}
