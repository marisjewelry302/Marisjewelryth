"use client";

import { useEffect, useState } from "react";

import { useLocale } from "../hooks/useLocale";
import { fill } from "../lib/i18n";

// Keep localStorage keys for wishlist/bag counts until those surfaces are migrated.
const WISHLIST_KEY = "marisWishlist";
const BAG_KEY = "marisShoppingBag";
const LEAD_KEY = "marisLeadInbox";

function readJson(key, fallback) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key));
    return value || fallback;
  } catch {
    return fallback;
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getSafeNextPath() {
  const nextPath = new URLSearchParams(window.location.search).get("next");

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "";
  }

  return nextPath;
}

function getSummary() {
  const wishlist = readJson(WISHLIST_KEY, []);
  const bag = readJson(BAG_KEY, []);
  const leads = readJson(LEAD_KEY, []);
  return {
    wishlist: Array.isArray(wishlist) ? wishlist.length : 0,
    bag: Array.isArray(bag) ? bag.reduce((t, i) => t + (Number(i.quantity) || 1), 0) : 0,
    quotes: Array.isArray(leads) ? leads.filter((i) => i?.type === "quote").length : 0
  };
}

export default function AccountClient() {
  const { t, href } = useLocale();
  const a = t.account;
  const [mode, setMode] = useState("signin");
  const [customer, setCustomer] = useState(null); // null = not loaded, false = not signed in
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [summary, setSummary] = useState({ wishlist: 0, bag: 0, quotes: 0 });
  const [popupEmail, setPopupEmail] = useState("");
  const [isPopupSource, setIsPopupSource] = useState(false);
  const [safeNextPath, setSafeNextPath] = useState("");
  const [popupConsent, setPopupConsent] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  // ─── Load session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // The popup hands the email over through sessionStorage; ?email= still works for older links.
    let handoffEmail = "";
    let handoffConsent = false;
    try {
      handoffEmail = window.sessionStorage.getItem("marisSignupPopupEmail") || "";
      // The pop-up only records this after the visitor ticked its own marketing box.
      handoffConsent = window.sessionStorage.getItem("marisSignupPopupConsent") === "1";
      window.sessionStorage.removeItem("marisSignupPopupEmail");
      window.sessionStorage.removeItem("marisSignupPopupConsent");
    } catch {
      // sessionStorage unavailable: fall back to the query string only.
    }
    const email = normalizeEmail(params.get("email") || handoffEmail);
    const source = params.get("source");
    const requestedMode = params.get("mode");
    const nextPath = getSafeNextPath();
    setSafeNextPath(nextPath);

    if ((requestedMode === "signup" || source === "popup") && email) {
      setPopupEmail(email);
      setIsPopupSource(true);
      setPopupConsent(handoffConsent);
    }

    if (requestedMode === "signup" || source === "popup") {
      setMode("create");
    }

    setSummary(getSummary());

    fetch("/api/account/me")
      .then((r) => r.json())
      .then(({ customer: c }) => {
        setCustomer(c || false);
      })
      .catch(() => setCustomer(false))
      .finally(() => setLoading(false));
  }, []);

  // ─── Signup ─────────────────────────────────────────────────────────────
  async function handleCreate(event) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const wantsMarketing = formData.get("marketing") === "on";

    try {
      const res = await fetch("/api/account/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("name") || "").trim(),
          email: normalizeEmail(formData.get("email")),
          phone: String(formData.get("phone") || "").trim(),
          password: String(formData.get("password") || "")
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || a.msg.createFail);
        return;
      }

      setCustomer(data.customer);
      setProfileMessage(a.msg.created);

      // Marketing email is opt-in: only a ticked box subscribes the address.
      if (wantsMarketing) {
        try {
          const welcomeResponse = await fetch("/api/account/welcome-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              marketingConsent: true,
              source: isPopupSource ? "popup" : "account"
            })
          });
          const welcomeData = await welcomeResponse.json().catch(() => ({}));

          if (welcomeResponse.ok && welcomeData.status === "sent") {
            setProfileMessage(a.msg.createdEmail);
          }
        } catch {
          // Account creation must remain successful even if email delivery is unavailable.
        }
      }

      if (safeNextPath) {
        window.location.assign(safeNextPath);
        return;
      }
    } catch {
      setMessage(a.msg.wrong);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Sign In ─────────────────────────────────────────────────────────────
  async function handleSignin(event) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/account/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(formData.get("email")),
          password: String(formData.get("password") || "")
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || a.msg.badLogin);
        return;
      }

      setCustomer(data.customer);
      setProfileMessage(fill(a.msg.welcomeBack, { name: data.customer.fullName || a.client }));
      if (safeNextPath) {
        window.location.assign(safeNextPath);
      }
    } catch {
      setMessage(a.msg.wrong);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Save Profile ─────────────────────────────────────────────────────────
  async function handleProfileSave(event) {
    event.preventDefault();
    setProfileMessage("");
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("name") || "").trim(),
          phone: String(formData.get("phone") || "").trim(),
          service: String(formData.get("service") || "Engagement Rings")
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileMessage(data.error || a.msg.saveFail);
        return;
      }

      setCustomer(data.customer);
      setProfileMessage(a.msg.saved);
    } catch {
      setProfileMessage(a.msg.wrong);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Change Password ───────────────────────────────────────────────────────
  async function handleChangePassword(event) {
    event.preventDefault();
    setProfileMessage("");
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") || "");
    const confirm = String(formData.get("confirmPassword") || "");

    if (newPassword !== confirm) {
      setProfileMessage(a.msg.mismatch);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: String(formData.get("currentPassword") || ""),
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileMessage(data.error || a.msg.pwFail);
        return;
      }

      setProfileMessage(a.msg.pwDone);
      event.currentTarget.reset();
    } catch {
      setProfileMessage(a.msg.wrong);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Delete Account ────────────────────────────────────────────────────────
  async function handleDeleteAccount(event) {
    event.preventDefault();
    setDeleteMessage("");
    setDeleting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: String(formData.get("deletePassword") || "") })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setDeleteMessage(data.error || a.msg.deleteFail);
        return;
      }

      setCustomer(false);
      setMode("signin");
      setProfileMessage("");
      setMessage(a.msg.deleted);
    } catch {
      setDeleteMessage(a.msg.wrong);
    } finally {
      setDeleting(false);
    }
  }

  // ─── Sign Out ──────────────────────────────────────────────────────────────
  async function signOut() {
    await fetch("/api/account/signout", { method: "POST" }).catch(() => {});
    setCustomer(false);
    setMode("signin");
    setMessage("");
    setProfileMessage("");
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main id="main-content" className="account-main site-main">
        <section className="account-hero">
          <p className="eyebrow">{a.eyebrow}</p>
          <h1>{a.title}</h1>
        </section>
        <section className="account-shell" aria-label={a.systemLabel}>
          <p className="account-loading">{a.loading}</p>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="account-main site-main">
      <section className="account-hero">
        <p className="eyebrow">{a.eyebrow}</p>
        <h1>{a.title}</h1>
        <p className="lead">{a.lead}</p>
      </section>

      <section className="account-shell" aria-label={a.systemLabel}>
        {!customer ? (
          // ─── Auth Forms ─────────────────────────────────────────────────
          <div className="account-auth">
            <div className="account-tabs" aria-label={a.formsLabel}>
              <button
                className={mode === "signin" ? "is-active" : ""}
                type="button"
                aria-pressed={mode === "signin"}
                onClick={() => { setMode("signin"); setMessage(""); }}
              >
                {a.signIn}
              </button>
              <button
                className={mode === "create" ? "is-active" : ""}
                type="button"
                aria-pressed={mode === "create"}
                onClick={() => { setMode("create"); setMessage(""); }}
              >
                {a.create}
              </button>
            </div>

            {mode === "signin" ? (
              <form className="account-form" onSubmit={handleSignin}>
                <h2>{a.welcomeBack}</h2>
                <label htmlFor="signin-email">{a.email}</label>
                <input id="signin-email" name="email" type="email" autoComplete="email" required />
                <label htmlFor="signin-password">{a.password}</label>
                <input id="signin-password" name="password" type="password" autoComplete="current-password" required />
                <button className="account-submit" type="submit" disabled={submitting}>
                  {submitting ? a.signingIn : a.signIn}
                </button>
              </form>
            ) : (
              <form className="account-form" onSubmit={handleCreate}>
                {isPopupSource && (
                  <div className="account-offer-notice">
                    <span>{a.offerTag}</span>
                    <p>{a.offerText}</p>
                  </div>
                )}
                <h2>{a.createTitle}</h2>
                <label htmlFor="create-name">{a.fullName}</label>
                <input id="create-name" name="name" type="text" autoComplete="name" required />
                <label htmlFor="create-email">{a.email}</label>
                <input id="create-email" name="email" type="email" autoComplete="email" defaultValue={popupEmail} required />
                <label htmlFor="create-phone">{a.phone}</label>
                <input id="create-phone" name="phone" type="tel" autoComplete="tel" />
                <label htmlFor="create-password">{a.password}</label>
                <input id="create-password" name="password" type="password" autoComplete="new-password" minLength="12" required />
                <label className="account-consent" htmlFor="create-marketing">
                  <input id="create-marketing" name="marketing" type="checkbox" defaultChecked={popupConsent} />
                  <span>{a.marketing}</span>
                </label>
                <p className="account-form-note">
                  {a.privacyBefore} <a href={href("/privacy-policy")}>{a.privacyPolicy}</a>.
                </p>
                <button className="account-submit" type="submit" disabled={submitting}>
                  {submitting ? a.creating : a.create}
                </button>
              </form>
            )}

            {message && (
              <p className="account-message account-message--error" role="alert">{message}</p>
            )}
          </div>
        ) : (
          // ─── Dashboard ───────────────────────────────────────────────────
          <div className="account-dashboard">
            <div className="account-dashboard-head">
              <div>
                <p className="eyebrow">{a.myMaris}</p>
                <h2>{fill(a.welcome, { name: customer.fullName || a.client })}</h2>
                <p>{customer.email}</p>
              </div>
              <button className="account-link-button" type="button" onClick={signOut}>
                {a.signOut}
              </button>
            </div>

            <div className="account-summary">
              <a href={href("/wishlist")}><span>{summary.wishlist}</span><small>{a.wishlistPieces}</small></a>
              <a href={href("/shopping-bag")}><span>{summary.bag}</span><small>{a.bag}</small></a>
              <a href={href("/request-quote")}><span>{summary.quotes}</span><small>{a.quotes}</small></a>
            </div>

            {/* Profile Form */}
            <form className="account-profile-form" onSubmit={handleProfileSave}>
              <h3>{a.profile}</h3>
              <label htmlFor="profile-name">{a.fullName}</label>
              <input
                id="profile-name"
                name="name"
                type="text"
                autoComplete="name"
                defaultValue={customer.fullName || ""}
                required
              />
              <label htmlFor="profile-phone">{a.phone}</label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={customer.phone || ""}
              />
              <label htmlFor="profile-service">{a.interested}</label>
              <select
                id="profile-service"
                name="service"
                defaultValue={customer.metadata?.preferredService || "Engagement Rings"}
              >
                {a.services.map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
              <button className="account-submit" type="submit" disabled={submitting}>
                {submitting ? a.saving : a.save}
              </button>
            </form>

            {/* Change Password Form */}
            <form className="account-password-form" onSubmit={handleChangePassword}>
              <h3>{a.changePassword}</h3>
              <label htmlFor="current-password">{a.currentPassword}</label>
              <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
              <label htmlFor="new-password">{a.newPassword}</label>
              <input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength="12" required />
              <label htmlFor="confirm-password">{a.confirmPassword}</label>
              <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength="12" required />
              <button className="account-submit" type="submit" disabled={submitting}>
                {submitting ? a.updating : a.changePasswordButton}
              </button>
            </form>

            {profileMessage && (
              <p className="account-message" role="status" aria-live="polite">{profileMessage}</p>
            )}

            {/* Delete Account Form */}
            <form className="account-delete-form" onSubmit={handleDeleteAccount}>
              <h3>{a.deleteTitle}</h3>
              <p>
                {a.deleteBefore}{" "}
                <a href={href("/privacy-policy")}>{a.privacyPolicy}</a>. {a.deleteAfter}
              </p>
              <label htmlFor="delete-password">{a.deleteConfirmPassword}</label>
              <input id="delete-password" name="deletePassword" type="password" autoComplete="current-password" required />
              <label className="account-consent" htmlFor="delete-confirm">
                <input id="delete-confirm" name="deleteConfirm" type="checkbox" required />
                <span>{a.deleteUnderstand}</span>
              </label>
              <button className="account-submit account-submit--danger" type="submit" disabled={deleting}>
                {deleting ? a.deleting : a.deleteButton}
              </button>
              {deleteMessage && (
                <p className="account-message account-message--error" role="alert">{deleteMessage}</p>
              )}
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
