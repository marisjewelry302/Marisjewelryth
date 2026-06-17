"use client";

import { useEffect, useMemo, useState } from "react";

const PROFILE_KEY = "marisAccountProfile";
const SESSION_KEY = "marisAccountSession";
const WISHLIST_KEY = "marisWishlist";
const BAG_KEY = "marisShoppingBag";
const LEAD_KEY = "marisLeadInbox";

function readJson(key, fallback) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key));
    return value || fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export default function AccountClient() {
  const [mode, setMode] = useState("signin");
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    setProfile(readJson(PROFILE_KEY, null));
    setSession(readJson(SESSION_KEY, null));
  }, []);

  const isSignedIn = Boolean(profile && session && normalizeEmail(profile.email) === normalizeEmail(session.email));
  const summary = useMemo(() => {
    const wishlist = readJson(WISHLIST_KEY, []);
    const bag = readJson(BAG_KEY, []);
    const leads = readJson(LEAD_KEY, []);

    return {
      wishlist: Array.isArray(wishlist) ? wishlist.length : 0,
      bag: Array.isArray(bag) ? bag.reduce((total, item) => total + (Number(item.quantity) || 1), 0) : 0,
      quotes: Array.isArray(leads) ? leads.filter((item) => item?.type === "quote").length : 0
    };
  }, [profileMessage, message]);

  function handleCreate(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextProfile = {
      name: String(formData.get("name") || "").trim(),
      email: normalizeEmail(formData.get("email")),
      phone: String(formData.get("phone") || "").trim(),
      service: "Engagement Rings",
      createdAt: new Date().toISOString()
    };
    const password = String(formData.get("password") || "");

    if (!nextProfile.name || !nextProfile.email || password.length < 6) {
      setMessage("Please add your name, email, and a password with at least 6 characters.");
      return;
    }

    const nextSession = { email: nextProfile.email, signedInAt: new Date().toISOString() };
    writeJson(PROFILE_KEY, nextProfile);
    writeJson(SESSION_KEY, nextSession);
    setProfile(nextProfile);
    setSession(nextSession);
    setProfileMessage("Account created. Password was not stored in this prototype.");
  }

  function handleSignin(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    if (!profile || normalizeEmail(profile.email) !== email) {
      setMessage("No local account found for this email yet. Please create an account first.");
      return;
    }

    const nextSession = { email, signedInAt: new Date().toISOString() };
    writeJson(SESSION_KEY, nextSession);
    setSession(nextSession);
    setProfileMessage("Signed in. This is a local prototype session.");
  }

  function handleProfileSave(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextProfile = {
      ...profile,
      name: String(formData.get("name") || "").trim(),
      email: normalizeEmail(formData.get("email")),
      phone: String(formData.get("phone") || "").trim(),
      service: String(formData.get("service") || "Engagement Rings"),
      updatedAt: new Date().toISOString()
    };

    if (!nextProfile.name || !nextProfile.email) {
      setProfileMessage("Name and email are required.");
      return;
    }

    const nextSession = { email: nextProfile.email, signedInAt: session?.signedInAt || new Date().toISOString() };
    writeJson(PROFILE_KEY, nextProfile);
    writeJson(SESSION_KEY, nextSession);
    setProfile(nextProfile);
    setSession(nextSession);
    setProfileMessage("Profile details saved.");
  }

  function signOut() {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setMode("signin");
    setMessage("Signed out from this browser.");
  }

  return (
    <main className="account-main site-main">
      <section className="account-hero">
        <p className="eyebrow">Client Access</p>
        <h1>Account</h1>
        <p className="lead">A quiet place for saved details, wishlist pieces, and future private appointments.</p>
      </section>

      <section className="account-shell" aria-label="Account system">
        {!isSignedIn ? (
          <div className="account-auth">
            <div className="account-tabs" role="tablist" aria-label="Account forms">
              <button className={mode === "signin" ? "is-active" : ""} type="button" onClick={() => setMode("signin")}>Sign In</button>
              <button className={mode === "create" ? "is-active" : ""} type="button" onClick={() => setMode("create")}>Create Account</button>
            </div>

            {mode === "signin" ? (
              <form className="account-form" onSubmit={handleSignin}>
                <h2>Welcome back</h2>
                <p className="account-form-note">Prototype login for this browser. Your password is only checked as a filled field and is not saved.</p>
                <label htmlFor="signin-email">Email</label>
                <input id="signin-email" name="email" type="email" autoComplete="email" required />
                <label htmlFor="signin-password">Password</label>
                <input id="signin-password" name="password" type="password" autoComplete="current-password" required />
                <button className="account-submit" type="submit">Sign In</button>
              </form>
            ) : (
              <form className="account-form" onSubmit={handleCreate}>
                <h2>Create your Maris account</h2>
                <p className="account-form-note">This creates a local prototype account only. For the real site, this will need secure backend authentication.</p>
                <label htmlFor="create-name">Full name</label>
                <input id="create-name" name="name" type="text" autoComplete="name" required />
                <label htmlFor="create-email">Email</label>
                <input id="create-email" name="email" type="email" autoComplete="email" required />
                <label htmlFor="create-phone">Phone</label>
                <input id="create-phone" name="phone" type="tel" autoComplete="tel" />
                <label htmlFor="create-password">Password</label>
                <input id="create-password" name="password" type="password" autoComplete="new-password" minLength="6" required />
                <button className="account-submit" type="submit">Create Account</button>
              </form>
            )}

            <p className="account-message" role="status" aria-live="polite">{message}</p>
          </div>
        ) : (
          <div className="account-dashboard">
            <div className="account-dashboard-head">
              <div>
                <p className="eyebrow">My Maris</p>
                <h2>Welcome, {profile.name || "Maris Client"}</h2>
                <p>{profile.email}</p>
              </div>
              <button className="account-link-button" type="button" onClick={signOut}>Sign Out</button>
            </div>

            <div className="account-summary">
              <a href="/wishlist"><span>{summary.wishlist}</span><small>Wishlist Pieces</small></a>
              <a href="/shopping-bag"><span>{summary.bag}</span><small>Shopping Bag</small></a>
              <a href="/request-quote"><span>{summary.quotes}</span><small>Quote Requests</small></a>
            </div>

            <form className="account-profile-form" onSubmit={handleProfileSave}>
              <h3>Profile details</h3>
              <label htmlFor="profile-name">Full name</label>
              <input id="profile-name" name="name" type="text" autoComplete="name" defaultValue={profile.name || ""} required />
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" name="email" type="email" autoComplete="email" defaultValue={profile.email || ""} required />
              <label htmlFor="profile-phone">Phone</label>
              <input id="profile-phone" name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone || ""} />
              <label htmlFor="profile-service">Interested in</label>
              <select id="profile-service" name="service" defaultValue={profile.service || "Engagement Rings"}>
                <option value="Engagement Rings">Engagement Rings</option>
                <option value="Wedding Bands">Wedding Bands</option>
                <option value="Men's Wedding Bands">Men's Wedding Bands</option>
                <option value="Gifts">Gifts</option>
                <option value="Private Consultation">Private Consultation</option>
              </select>
              <button className="account-submit" type="submit">Save Details</button>
            </form>

            <p className="account-message" role="status" aria-live="polite">{profileMessage}</p>
          </div>
        )}
      </section>
    </main>
  );
}
