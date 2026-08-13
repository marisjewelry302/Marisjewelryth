import { redirect } from "next/navigation";
import Image from "next/image";
import { getAdminSetupState } from "../../lib/admin-users";
import styles from "../login/login.module.css";

export const dynamic = "force-dynamic";

function getMessage(error, setupState, setupReadError) {
  if (setupReadError || error === "database" || setupState?.isConfigured === false) {
    return "Connect Supabase and set MARIS_ADMIN_SESSION_SECRET before creating the first owner.";
  }

  if (error === "mismatch") {
    return "Password confirmation does not match.";
  }

  if (error === "invalid") {
    return "Use a username and a password with at least 8 characters.";
  }

  return null;
}

export default async function AdminSetupPage({ searchParams }) {
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

  const message = getMessage(error, setupState, setupReadError);
  const canCreate = setupState?.canCreateInitialAdmin === true;

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="admin-setup-title">
        <Image className={styles.logo} src="/assets/images/logo.png" alt="Maris Jewelry" width={128} height={128} priority />
        <p className={styles.kicker}>Protected Back Office</p>
        <h1 className={styles.title} id="admin-setup-title">Create Owner Account</h1>
        <p className={styles.copy}>
          Create the first database-backed Maris admin account.
        </p>

        {message ? (
          <p className={`${styles.message} ${styles.setup}`}>{message}</p>
        ) : null}

        <form className={styles.form} action="/api/admin/setup" method="post">
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
            Display Name
            <input
              className={styles.input}
              name="displayName"
              type="text"
              autoComplete="name"
            />
          </label>

          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>

          <label className={styles.label}>
            Confirm Password
            <input
              className={styles.input}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>

          <button className={styles.button} type="submit" disabled={!canCreate}>
            Create Owner
          </button>
        </form>
      </section>
    </main>
  );
}
