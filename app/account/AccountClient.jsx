"use client";

import { useEffect, useState } from "react";

import { useShopLocale } from "../hooks/useShopLocale";
import { clearLocalBag, clearLocalWishlist } from "../lib/bag-store";
import { fill } from "../lib/i18n";

// Keep localStorage keys for wishlist/bag counts until those surfaces are migrated.
const WISHLIST_KEY = "marisWishlist";
const BAG_KEY = "marisShoppingBag";

// Newest requests shown on the dashboard; the API returns up to 20.
const REQUESTS_SHOWN = 5;

// The account API answers with a stable "code" next to its English "error" text.
// The page maps the code to its own language and never prints the API's text.
const CODE_MESSAGE_KEYS = {
  service_unavailable: "unavailable",
  rate_limited: "rateLimited",
  invalid_credentials: "badLogin",
  duplicate_email: "duplicate",
  password_too_short: "passwordShort",
  missing_fields: "missingFields",
  wrong_password: "wrongPassword",
  not_signed_in: "notSignedIn",
  server_error: "wrong",
  cross_origin: "wrong"
};

function messageForResponse(a, response, data, fallback) {
  if (response.status === 503) {
    return a.msg.unavailable;
  }

  const key = CODE_MESSAGE_KEYS[data?.code];
  return (key && a.msg[key]) || fallback;
}

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

  if (!nextPath || !nextPath.startsWith("/")) {
    return "";
  }

  // Browsers read a backslash as a slash and drop tabs and newlines, so "/\\host" and
  // "/\t/host" both mean "//host". Resolve the value the way the browser will and
  // accept it only when it stays on this site.
  try {
    const url = new URL(nextPath, window.location.origin);

    if (url.origin !== window.location.origin) {
      return "";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function getSummary() {
  const wishlist = readJson(WISHLIST_KEY, []);
  const bag = readJson(BAG_KEY, []);
  return {
    wishlist: Array.isArray(wishlist) ? wishlist.length : 0,
    bag: Array.isArray(bag) ? bag.reduce((t, i) => t + (Number(i.quantity) || 1), 0) : 0
  };
}

// Keeps ?mode= in step with the tab, so a refresh or Back lands on the same form.
function syncModeToUrl(nextMode) {
  try {
    const url = new URL(window.location.href);

    if (nextMode === "create") {
      url.searchParams.set("mode", "signup");
    } else if (nextMode === "forgot") {
      url.searchParams.set("mode", "forgot");
    } else {
      url.searchParams.delete("mode");
      url.searchParams.delete("source");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // The URL is only a convenience.
  }
}

function describedByTokens(element) {
  return String(element.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
}

function unflagField(element) {
  element.removeAttribute("aria-invalid");

  const remaining = describedByTokens(element).filter((token) => !token.endsWith("-message"));

  if (remaining.length) {
    element.setAttribute("aria-describedby", remaining.join(" "));
  } else {
    element.removeAttribute("aria-describedby");
  }
}

function clearFieldFlags(form) {
  for (const element of form.querySelectorAll("[aria-invalid]")) {
    unflagField(element);
  }
}

// Marks fields invalid, ties them to the message that explains why, and moves
// focus to the first one. A field's own hint stays in aria-describedby.
function flagFields(form, names, messageId) {
  let first = null;

  for (const name of names) {
    const element = form.elements.namedItem(name);

    if (!element || typeof element.setAttribute !== "function") {
      continue;
    }

    element.setAttribute("aria-invalid", "true");
    element.setAttribute("aria-describedby", [...describedByTokens(element), messageId].join(" "));
    first = first || element;
  }

  first?.focus();
}

function handleFieldInput(event) {
  if (event.target?.getAttribute?.("aria-invalid")) {
    unflagField(event.target);
  }
}

function Message({ id, message }) {
  if (!message?.text) {
    return null;
  }

  const isError = message.type === "error";

  return (
    <p
      id={id}
      className="account-message"
      data-type={message.type || undefined}
      role={isError ? "alert" : "status"}
      aria-live={isError ? undefined : "polite"}
    >
      {message.text}
    </p>
  );
}

const NO_MESSAGE = { text: "", type: "" };
const NO_REQUESTS = { status: "idle", items: [], quoteCount: 0 };

function formatRequestDate(value, locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok"
  });
}

export default function AccountClient() {
  const { t, href, locale } = useShopLocale();
  const a = t.account;
  const [mode, setMode] = useState("signin");
  const [customer, setCustomer] = useState(null); // null = not loaded, false = not signed in
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Each form has its own message area, so a result shows next to the form it belongs to.
  const [authMessage, setAuthMessage] = useState(NO_MESSAGE);
  const [welcomeMessage, setWelcomeMessage] = useState(NO_MESSAGE);
  const [profileMessage, setProfileMessage] = useState(NO_MESSAGE);
  const [passwordMessage, setPasswordMessage] = useState(NO_MESSAGE);
  const [deleteMessage, setDeleteMessage] = useState(NO_MESSAGE);
  const [summary, setSummary] = useState({ wishlist: 0, bag: 0 });
  // The customer's own enquiries, from the account API (not from this browser).
  const [requests, setRequests] = useState(NO_REQUESTS);
  const [requestsReload, setRequestsReload] = useState(0);
  // Email carried from one form to the next (duplicate sign-up, forgot password).
  const [prefillEmail, setPrefillEmail] = useState("");
  const [duplicateEmail, setDuplicateEmail] = useState("");
  const [popupEmail, setPopupEmail] = useState("");
  const [isPopupSource, setIsPopupSource] = useState(false);
  const [safeNextPath, setSafeNextPath] = useState("");
  const [popupConsent, setPopupConsent] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const error = (text) => ({ text, type: "error" });
  const success = (text) => ({ text, type: "success" });

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
    } else if (requestedMode === "forgot") {
      setMode("forgot");
    }

    // The reset page sends people here after a successful password change.
    if (params.get("reset") === "success") {
      setAuthMessage({ text: t.account.reset.success, type: "success" });

      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("reset");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      } catch {
        // The URL is only a convenience.
      }
    }

    setSummary(getSummary());

    fetch("/api/account/me")
      .then((r) => r.json())
      .then(({ customer: c }) => {
        setCustomer(c || false);
      })
      .catch(() => setCustomer(false))
      .finally(() => setLoading(false));
    // Runs once on mount: it reads the URL and the session, nothing it uses changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The request list belongs to the signed-in customer, so it is fetched from
  // the account API whenever the signed-in customer changes (or on retry).
  const customerId = customer ? customer.id : null;

  useEffect(() => {
    if (!customerId) {
      setRequests(NO_REQUESTS);
      return undefined;
    }

    let cancelled = false;
    setRequests((current) => ({ ...current, status: "loading" }));

    fetch("/api/account/inquiries", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !Array.isArray(data.inquiries)) {
          throw new Error("requests_failed");
        }

        if (!cancelled) {
          setRequests({
            status: "ready",
            items: data.inquiries,
            quoteCount: Number(data.quoteCount) || 0
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRequests({ status: "error", items: [], quoteCount: 0 });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, requestsReload]);

  function switchMode(nextMode, { email = "" } = {}) {
    setMode(nextMode);
    setAuthMessage(NO_MESSAGE);
    setDuplicateEmail("");
    setPrefillEmail(email);
    syncModeToUrl(nextMode);
  }

  // ─── Forgot password ────────────────────────────────────────────────────
  // The API answers the same way for every address, so the message never says
  // whether an account exists.
  async function handleForgot(event) {
    event.preventDefault();
    setAuthMessage(NO_MESSAGE);

    const form = event.currentTarget;
    clearFieldFlags(form);
    setSubmitting(true);

    try {
      const res = await fetch("/api/account/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(new FormData(form).get("email")),
          locale
        })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setAuthMessage(success(a.msg.resetSent));
        return;
      }

      if (data?.code === "invalid_email") {
        setAuthMessage(error(a.msg.invalidEmail));
        flagFields(form, ["email"], "account-auth-message");
        return;
      }

      setAuthMessage(error(messageForResponse(a, res, data, a.msg.wrong)));
    } catch {
      setAuthMessage(error(a.msg.wrong));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Signup ─────────────────────────────────────────────────────────────
  async function handleCreate(event) {
    event.preventDefault();
    setAuthMessage(NO_MESSAGE);
    setDuplicateEmail("");

    const form = event.currentTarget;
    clearFieldFlags(form);
    setSubmitting(true);

    const formData = new FormData(form);
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAuthMessage(error(messageForResponse(a, res, data, a.msg.createFail)));

        if (data?.code === "duplicate_email") {
          setDuplicateEmail(normalizeEmail(formData.get("email")));
          flagFields(form, ["email"], "account-auth-message");
        } else if (data?.code === "password_too_short") {
          flagFields(form, ["password"], "account-auth-message");
        } else if (data?.code === "missing_fields") {
          flagFields(form, ["name", "email", "password"], "account-auth-message");
        }

        return;
      }

      setCustomer(data.customer);
      setWelcomeMessage(success(a.msg.created));

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
            setWelcomeMessage(success(a.msg.createdEmail));
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
      setAuthMessage(error(a.msg.wrong));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Sign In ─────────────────────────────────────────────────────────────
  async function handleSignin(event) {
    event.preventDefault();
    setAuthMessage(NO_MESSAGE);

    const form = event.currentTarget;
    clearFieldFlags(form);
    setSubmitting(true);

    const formData = new FormData(form);

    try {
      const res = await fetch("/api/account/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(formData.get("email")),
          password: String(formData.get("password") || "")
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAuthMessage(error(messageForResponse(a, res, data, a.msg.badLogin)));

        if (data?.code === "invalid_credentials") {
          flagFields(form, ["email", "password"], "account-auth-message");
        }

        return;
      }

      setCustomer(data.customer);
      setWelcomeMessage(success(fill(a.msg.welcomeBack, { name: data.customer.fullName || a.client })));
      if (safeNextPath) {
        window.location.assign(safeNextPath);
      }
    } catch {
      setAuthMessage(error(a.msg.wrong));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Save Profile ─────────────────────────────────────────────────────────
  async function handleProfileSave(event) {
    event.preventDefault();
    setProfileMessage(NO_MESSAGE);
    setWelcomeMessage(NO_MESSAGE);

    const form = event.currentTarget;
    clearFieldFlags(form);
    setSubmitting(true);

    const formData = new FormData(form);

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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setProfileMessage(error(messageForResponse(a, res, data, a.msg.saveFail)));
        return;
      }

      setCustomer(data.customer);
      setProfileMessage(success(a.msg.saved));
    } catch {
      setProfileMessage(error(a.msg.wrong));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Change Password ───────────────────────────────────────────────────────
  async function handleChangePassword(event) {
    event.preventDefault();
    setPasswordMessage(NO_MESSAGE);

    // React clears event.currentTarget once the handler yields, so the form is
    // captured before the first await; reset() after the request needs it.
    const form = event.currentTarget;
    clearFieldFlags(form);
    setSubmitting(true);

    const formData = new FormData(form);
    const newPassword = String(formData.get("newPassword") || "");
    const confirm = String(formData.get("confirmPassword") || "");

    if (newPassword !== confirm) {
      setPasswordMessage(error(a.msg.mismatch));
      flagFields(form, ["confirmPassword"], "account-password-message");
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPasswordMessage(error(messageForResponse(a, res, data, a.msg.pwFail)));

        if (data?.code === "wrong_password") {
          flagFields(form, ["currentPassword"], "account-password-message");
        } else if (data?.code === "password_too_short") {
          flagFields(form, ["newPassword"], "account-password-message");
        }

        return;
      }

      setPasswordMessage(success(a.msg.pwDone));
      form.reset();
    } catch {
      setPasswordMessage(error(a.msg.wrong));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Delete Account ────────────────────────────────────────────────────────
  async function handleDeleteAccount(event) {
    event.preventDefault();
    setDeleteMessage(NO_MESSAGE);

    const form = event.currentTarget;
    clearFieldFlags(form);
    setDeleting(true);

    const formData = new FormData(form);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: String(formData.get("deletePassword") || "") })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setDeleteMessage(error(messageForResponse(a, res, data, a.msg.deleteFail)));

        if (data?.code === "wrong_password") {
          flagFields(form, ["deletePassword"], "account-delete-message");
        }

        return;
      }

      setCustomer(false);
      setMode("signin");
      setProfileMessage(NO_MESSAGE);
      setPasswordMessage(NO_MESSAGE);
      setWelcomeMessage(NO_MESSAGE);
      setAuthMessage(success(a.msg.deleted));
    } catch {
      setDeleteMessage(error(a.msg.wrong));
    } finally {
      setDeleting(false);
    }
  }

  // ─── Sign Out ──────────────────────────────────────────────────────────────
  async function signOut() {
    await fetch("/api/account/signout", { method: "POST" }).catch(() => {});
    // The bag in this browser belongs to the customer who just left, so it must
    // not be merged into whoever signs in here next. The wishlist is the same.
    clearLocalBag();
    clearLocalWishlist();
    setSummary(getSummary());
    setRequests(NO_REQUESTS);
    setCustomer(false);
    setMode("signin");
    setAuthMessage(NO_MESSAGE);
    setWelcomeMessage(NO_MESSAGE);
    setProfileMessage(NO_MESSAGE);
    setPasswordMessage(NO_MESSAGE);
    syncModeToUrl("signin");
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  // The intro renders in both states and the shell keeps its height while the
  // session loads, so nothing jumps when the forms appear.
  return (
    <main id="main-content" className="account-main site-main">
      <section className="account-hero">
        <p className="eyebrow">{a.eyebrow}</p>
        <h1>{a.title}</h1>
        <p className="lead">{a.lead}</p>
      </section>

      <section
        className={`account-shell${loading ? " account-shell--loading" : ""}`}
        aria-label={a.systemLabel}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <p className="account-loading">{a.loading}</p>
        ) : !customer ? (
          // ─── Auth Forms ─────────────────────────────────────────────────
          <div className="account-auth">
            <div className="account-tabs" role="group" aria-label={a.formsLabel}>
              <button
                className={mode === "signin" ? "is-active" : ""}
                type="button"
                aria-pressed={mode === "signin"}
                onClick={() => switchMode("signin")}
              >
                {a.signIn}
              </button>
              <button
                className={mode === "create" ? "is-active" : ""}
                type="button"
                aria-pressed={mode === "create"}
                onClick={() => switchMode("create")}
              >
                {a.create}
              </button>
            </div>

            {mode === "signin" ? (
              <form className="account-form" onSubmit={handleSignin} onInput={handleFieldInput}>
                <h2>{a.welcomeBack}</h2>
                <label htmlFor="signin-email">{a.email}</label>
                <input id="signin-email" name="email" type="email" autoComplete="email" defaultValue={prefillEmail} required />
                <label htmlFor="signin-password">{a.password}</label>
                <input id="signin-password" name="password" type="password" autoComplete="current-password" required />
                <button className="account-submit" type="submit" disabled={submitting}>
                  {submitting ? a.signingIn : a.signIn}
                </button>
                <button
                  className="account-link-button"
                  type="button"
                  onClick={() => switchMode("forgot", { email: document.getElementById("signin-email")?.value || "" })}
                >
                  {a.forgotLink}
                </button>
                <Message id="account-auth-message" message={authMessage} />
              </form>
            ) : mode === "forgot" ? (
              <form className="account-form" onSubmit={handleForgot} onInput={handleFieldInput}>
                <h2>{a.forgotTitle}</h2>
                <p className="account-form-note">{a.forgotLead}</p>
                <label htmlFor="forgot-email">{a.email}</label>
                <input id="forgot-email" name="email" type="email" autoComplete="email" defaultValue={prefillEmail} required />
                <button className="account-submit" type="submit" disabled={submitting}>
                  {submitting ? a.sendingReset : a.sendResetLink}
                </button>
                <button className="account-link-button" type="button" onClick={() => switchMode("signin")}>
                  {a.backToSignIn}
                </button>
                <Message id="account-auth-message" message={authMessage} />
              </form>
            ) : (
              <form className="account-form" onSubmit={handleCreate} onInput={handleFieldInput}>
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
                <label htmlFor="create-phone">{a.phone} {a.optional}</label>
                <input id="create-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" />
                <label htmlFor="create-password">{a.password}</label>
                <input
                  id="create-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength="12"
                  aria-describedby="create-password-hint"
                  required
                />
                <p className="account-field-hint" id="create-password-hint">{a.passwordHint}</p>
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
                <Message id="account-auth-message" message={authMessage} />
                {duplicateEmail ? (
                  <div className="account-duplicate-actions">
                    <button
                      className="account-link-button"
                      type="button"
                      onClick={() => switchMode("signin", { email: duplicateEmail })}
                    >
                      {a.signInInstead}
                    </button>
                    <button
                      className="account-link-button"
                      type="button"
                      onClick={() => switchMode("forgot", { email: duplicateEmail })}
                    >
                      {a.forgotLink}
                    </button>
                  </div>
                ) : null}
              </form>
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
                <Message id="account-welcome-message" message={welcomeMessage} />
              </div>
              <button className="account-link-button" type="button" onClick={signOut}>
                {a.signOut}
              </button>
            </div>

            <div className="account-summary">
              <a href={href("/wishlist")}><span>{summary.wishlist}</span><small>{a.wishlistPieces}</small></a>
              <a href={href("/shopping-bag")}><span>{summary.bag}</span><small>{a.bag}</small></a>
              <a href="#account-requests">
                <span>{requests.status === "ready" ? requests.quoteCount : "–"}</span>
                <small>{a.quotes}</small>
              </a>
            </div>

            <section className="account-requests" id="account-requests" aria-labelledby="account-requests-title">
              <h3 id="account-requests-title">{a.requests.title}</h3>
              {requests.status === "error" ? (
                <div role="alert">
                  <p>{a.requests.error}</p>
                  <button className="account-link-button" type="button" onClick={() => setRequestsReload((n) => n + 1)}>
                    {a.requests.retry}
                  </button>
                </div>
              ) : requests.status !== "ready" ? (
                <p role="status">{a.requests.loading}</p>
              ) : requests.items.length === 0 ? (
                <>
                  <p>{a.requests.empty}</p>
                  <p className="account-request-links">
                    <a href={href("/collections")}>{a.requests.browse}</a>
                    <a href={href("/contact-us")}>{a.requests.contact}</a>
                  </p>
                </>
              ) : (
                <ul className="account-request-list">
                  {requests.items.slice(0, REQUESTS_SHOWN).map((item) => (
                    <li key={item.id}>
                      <p className="account-request-meta">
                        <time dateTime={item.createdAt || undefined}>{formatRequestDate(item.createdAt, locale)}</time>
                        <span>{item.kind === "quote" ? a.requests.kindQuote : a.requests.kindContact}</span>
                        {item.service ? <span>{item.service}</span> : null}
                        <span>{a.requests.status[item.status] || a.requests.status.new}</span>
                      </p>
                      {item.pieces.length ? (
                        <p className="account-request-pieces">
                          <strong>{a.requests.pieces}:</strong> {item.pieces.join(", ")}
                        </p>
                      ) : null}
                      {item.excerpt ? <p className="account-request-excerpt">{item.excerpt}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Profile Form */}
            <form className="account-profile-form" onSubmit={handleProfileSave} onInput={handleFieldInput}>
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
              <label htmlFor="profile-phone">{a.phone} {a.optional}</label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
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
              <Message id="account-profile-message" message={profileMessage} />
            </form>

            {/* Change Password Form */}
            <form className="account-password-form" onSubmit={handleChangePassword} onInput={handleFieldInput}>
              <h3>{a.changePassword}</h3>
              <label htmlFor="current-password">{a.currentPassword}</label>
              <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
              <label htmlFor="new-password">{a.newPassword}</label>
              <input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength="12"
                aria-describedby="new-password-hint"
                required
              />
              <p className="account-field-hint" id="new-password-hint">{a.passwordHint}</p>
              <label htmlFor="confirm-password">{a.confirmPassword}</label>
              <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength="12" required />
              <button className="account-submit" type="submit" disabled={submitting}>
                {submitting ? a.updating : a.changePasswordButton}
              </button>
              <Message id="account-password-message" message={passwordMessage} />
            </form>

            {/* Delete Account Form */}
            <form className="account-delete-form" onSubmit={handleDeleteAccount} onInput={handleFieldInput}>
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
              <Message id="account-delete-message" message={deleteMessage} />
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
