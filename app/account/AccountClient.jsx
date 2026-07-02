"use client";

import { useEffect, useState } from "react";

// localStorage keys ยังคงเก็บไว้เพื่อแสดง wishlist/bag counts (ยังไม่ migrate)
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

  // ─── Load session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = normalizeEmail(params.get("email"));
    const source = params.get("source");
    const requestedMode = params.get("mode");
    const nextPath = getSafeNextPath();
    setSafeNextPath(nextPath);

    if ((requestedMode === "signup" || source === "popup") && email) {
      setPopupEmail(email);
      setIsPopupSource(true);
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
        setMessage(data.error || "Could not create account.");
        return;
      }

      setCustomer(data.customer);
      setProfileMessage("Account created. Welcome to Maris.");
      if (safeNextPath) {
        window.location.assign(safeNextPath);
        return;
      }

      try {
        const welcomeResponse = await fetch("/api/account/welcome-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: isPopupSource ? "popup" : "account"
          })
        });
        const welcomeData = await welcomeResponse.json().catch(() => ({}));

        if (welcomeResponse.ok && welcomeData.status === "sent") {
          setProfileMessage("Account created. Your Maris welcome email is on the way.");
        }
      } catch {
        // Account creation must remain successful even if email delivery is unavailable.
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
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
        setMessage(data.error || "Incorrect email or password.");
        return;
      }

      setCustomer(data.customer);
      setProfileMessage(`Welcome back, ${data.customer.fullName || "Maris Client"}.`);
      if (safeNextPath) {
        window.location.assign(safeNextPath);
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
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
        setProfileMessage(data.error || "Could not save profile.");
        return;
      }

      setCustomer(data.customer);
      setProfileMessage("Profile details saved.");
    } catch {
      setProfileMessage("Something went wrong. Please try again.");
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
      setProfileMessage("New passwords do not match.");
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
        setProfileMessage(data.error || "Could not change password.");
        return;
      }

      setProfileMessage("Password changed successfully.");
      event.currentTarget.reset();
    } catch {
      setProfileMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
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
      <main className="account-main site-main">
        <section className="account-hero">
          <p className="eyebrow">Client Access</p>
          <h1>Account</h1>
        </section>
        <section className="account-shell" aria-label="Account system">
          <p className="account-loading">Loading…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="account-main site-main">
      <section className="account-hero">
        <p className="eyebrow">Client Access</p>
        <h1>Account</h1>
        <p className="lead">A quiet place for saved details, wishlist pieces, and future private appointments.</p>
      </section>

      <section className="account-shell" aria-label="Account system">
        {!customer ? (
          // ─── Auth Forms ─────────────────────────────────────────────────
          <div className="account-auth">
            <div className="account-tabs" role="tablist" aria-label="Account forms">
              <button
                className={mode === "signin" ? "is-active" : ""}
                type="button"
                onClick={() => { setMode("signin"); setMessage(""); }}
              >
                Sign In
              </button>
              <button
                className={mode === "create" ? "is-active" : ""}
                type="button"
                onClick={() => { setMode("create"); setMessage(""); }}
              >
                Create Account
              </button>
            </div>

            {mode === "signin" ? (
              <form className="account-form" onSubmit={handleSignin}>
                <h2>Welcome back</h2>
                <label htmlFor="signin-email">Email</label>
                <input id="signin-email" name="email" type="email" autoComplete="email" required />
                <label htmlFor="signin-password">Password</label>
                <input id="signin-password" name="password" type="password" autoComplete="current-password" required />
                <button className="account-submit" type="submit" disabled={submitting}>
                  {submitting ? "Signing in…" : "Sign In"}
                </button>
              </form>
            ) : (
              <form className="account-form" onSubmit={handleCreate}>
                {isPopupSource && (
                  <div className="account-offer-notice">
                    <span>Maris member offer</span>
                    <p>Complete your Maris account to receive your 10% offer.</p>
                  </div>
                )}
                <h2>Create your Maris account</h2>
                <label htmlFor="create-name">Full name</label>
                <input id="create-name" name="name" type="text" autoComplete="name" required />
                <label htmlFor="create-email">Email</label>
                <input id="create-email" name="email" type="email" autoComplete="email" defaultValue={popupEmail} required />
                <label htmlFor="create-phone">Phone</label>
                <input id="create-phone" name="phone" type="tel" autoComplete="tel" />
                <label htmlFor="create-password">Password</label>
                <input id="create-password" name="password" type="password" autoComplete="new-password" minLength="6" required />
                <button className="account-submit" type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create Account"}
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
                <p className="eyebrow">My Maris</p>
                <h2>Welcome, {customer.fullName || "Maris Client"}</h2>
                <p>{customer.email}</p>
              </div>
              <button className="account-link-button" type="button" onClick={signOut}>
                Sign Out
              </button>
            </div>

            <div className="account-summary">
              <a href="/wishlist"><span>{summary.wishlist}</span><small>Wishlist Pieces</small></a>
              <a href="/shopping-bag"><span>{summary.bag}</span><small>Shopping Bag</small></a>
              <a href="/request-quote"><span>{summary.quotes}</span><small>Quote Requests</small></a>
            </div>

            {/* Profile Form */}
            <form className="account-profile-form" onSubmit={handleProfileSave}>
              <h3>Profile details</h3>
              <label htmlFor="profile-name">Full name</label>
              <input
                id="profile-name"
                name="name"
                type="text"
                autoComplete="name"
                defaultValue={customer.fullName || ""}
                required
              />
              <label htmlFor="profile-phone">Phone</label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={customer.phone || ""}
              />
              <label htmlFor="profile-service">Interested in</label>
              <select
                id="profile-service"
                name="service"
                defaultValue={customer.metadata?.preferredService || "Engagement Rings"}
              >
                <option value="Engagement Rings">Engagement Rings</option>
                <option value="Wedding Bands">Wedding Bands</option>
                <option value="Men's Wedding Bands">Men&apos;s Wedding Bands</option>
                <option value="Gifts">Gifts</option>
                <option value="Private Consultation">Private Consultation</option>
              </select>
              <button className="account-submit" type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save Details"}
              </button>
            </form>

            {/* Change Password Form */}
            <form className="account-password-form" onSubmit={handleChangePassword}>
              <h3>Change password</h3>
              <label htmlFor="current-password">Current password</label>
              <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
              <label htmlFor="new-password">New password</label>
              <input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength="6" required />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength="6" required />
              <button className="account-submit" type="submit" disabled={submitting}>
                {submitting ? "Updating…" : "Change Password"}
              </button>
            </form>

            {profileMessage && (
              <p className="account-message" role="status" aria-live="polite">{profileMessage}</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
