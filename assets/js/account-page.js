(() => {
  const profileKey = "marisAccountProfile";
  const sessionKey = "marisAccountSession";
  const wishlistKey = "marisWishlist";
  const bagKey = "marisShoppingBag";
  const leadKey = "marisLeadInbox";

  const authPanel = document.querySelector("[data-auth-panel]");
  const dashboard = document.querySelector("[data-account-dashboard]");
  const accountTabs = Array.from(document.querySelectorAll("[data-account-tab]"));
  const accountForms = Array.from(document.querySelectorAll("[data-account-form]"));
  const accountMessage = document.querySelector("[data-account-message]");
  const profileMessage = document.querySelector("[data-profile-message]");
  const nameOutput = document.querySelector("[data-account-name]");
  const emailOutput = document.querySelector("[data-account-email]");
  const wishlistCount = document.querySelector("[data-account-wishlist-count]");
  const bagCount = document.querySelector("[data-account-bag-count]");
  const quoteCount = document.querySelector("[data-account-quote-count]");
  const profileForm = document.querySelector("[data-account-profile-form]");
  const signOutButton = document.querySelector("[data-account-signout]");

  if (!authPanel || !dashboard || !profileForm) {
    return;
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      return;
    }
  }

  function getProfile() {
    return readJson(profileKey, null);
  }

  function getSession() {
    return readJson(sessionKey, null);
  }

  function setMessage(target, text, type = "info") {
    if (!target) {
      return;
    }

    target.textContent = text;
    target.dataset.type = type;
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function getField(form, fieldName) {
    return form.elements.namedItem(fieldName);
  }

  function isSignedIn() {
    const profile = getProfile();
    const session = getSession();
    return Boolean(profile && session && normalizeEmail(profile.email) === normalizeEmail(session.email));
  }

  function getWishlistTotal() {
    const items = readJson(wishlistKey, []);
    return Array.isArray(items) ? items.length : 0;
  }

  function getBagTotal() {
    const items = readJson(bagKey, []);

    if (!Array.isArray(items)) {
      return 0;
    }

    return items.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
  }

  function getQuoteTotal() {
    const items = readJson(leadKey, []);

    if (!Array.isArray(items)) {
      return 0;
    }

    return items.filter((item) => item && item.type === "quote").length;
  }

  function switchForm(mode) {
    accountTabs.forEach((tab) => {
      const isActive = tab.dataset.accountTab === mode;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    accountForms.forEach((form) => {
      form.hidden = form.dataset.accountForm !== mode;
    });

    setMessage(accountMessage, "");
  }

  function renderDashboard() {
    const profile = getProfile();

    if (!profile) {
      return;
    }

    nameOutput.textContent = `Welcome, ${profile.name || "Maris Client"}`;
    emailOutput.textContent = profile.email || "";
    wishlistCount.textContent = String(getWishlistTotal());
    bagCount.textContent = String(getBagTotal());
    if (quoteCount) {
      quoteCount.textContent = String(getQuoteTotal());
    }

    getField(profileForm, "name").value = profile.name || "";
    getField(profileForm, "email").value = profile.email || "";
    getField(profileForm, "phone").value = profile.phone || "";
    getField(profileForm, "service").value = profile.service || "Engagement Rings";
  }

  function renderAccount() {
    if (isSignedIn()) {
      authPanel.hidden = true;
      dashboard.hidden = false;
      renderDashboard();
      return;
    }

    authPanel.hidden = false;
    dashboard.hidden = true;
  }

  accountTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchForm(tab.dataset.accountTab);
    });
  });

  document.querySelector("[data-account-form='create']").addEventListener("submit", (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const name = getField(form, "name").value.trim();
    const email = normalizeEmail(getField(form, "email").value);
    const phone = getField(form, "phone").value.trim();
    const password = getField(form, "password").value;

    if (!name || !email || password.length < 6) {
      setMessage(accountMessage, "Please add your name, email, and a password with at least 6 characters.", "error");
      return;
    }

    const profile = {
      name,
      email,
      phone,
      service: "Engagement Rings",
      createdAt: new Date().toISOString()
    };

    const savedProfile = writeJson(profileKey, profile);
    const savedSession = writeJson(sessionKey, {
      email,
      signedInAt: new Date().toISOString()
    });

    if (!savedProfile || !savedSession) {
      setMessage(accountMessage, "This browser blocked local saving. Please check privacy settings and try again.", "error");
      return;
    }

    form.reset();
    renderAccount();
    setMessage(profileMessage, "Account created. Password was not stored in this prototype.", "success");
  });

  document.querySelector("[data-account-form='signin']").addEventListener("submit", (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const email = normalizeEmail(getField(form, "email").value);
    const password = getField(form, "password").value;
    const profile = getProfile();

    if (!email || !password) {
      setMessage(accountMessage, "Please enter your email and password.", "error");
      return;
    }

    if (!profile || normalizeEmail(profile.email) !== email) {
      setMessage(accountMessage, "No local account found for this email yet. Please create an account first.", "error");
      return;
    }

    if (!writeJson(sessionKey, { email, signedInAt: new Date().toISOString() })) {
      setMessage(accountMessage, "This browser blocked local saving. Please check privacy settings and try again.", "error");
      return;
    }

    form.reset();
    renderAccount();
    setMessage(profileMessage, "Signed in. This is a local prototype session.", "success");
  });

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const currentProfile = getProfile();

    if (!currentProfile) {
      return;
    }

    const nextProfile = {
      ...currentProfile,
      name: getField(profileForm, "name").value.trim(),
      email: normalizeEmail(getField(profileForm, "email").value),
      phone: getField(profileForm, "phone").value.trim(),
      service: getField(profileForm, "service").value,
      updatedAt: new Date().toISOString()
    };

    if (!nextProfile.name || !nextProfile.email) {
      setMessage(profileMessage, "Name and email are required.", "error");
      return;
    }

    const savedProfile = writeJson(profileKey, nextProfile);
    const savedSession = writeJson(sessionKey, {
      email: nextProfile.email,
      signedInAt: getSession()?.signedInAt || new Date().toISOString()
    });

    if (!savedProfile || !savedSession) {
      setMessage(profileMessage, "Could not save details in this browser.", "error");
      return;
    }

    renderDashboard();
    setMessage(profileMessage, "Profile details saved.", "success");
  });

  signOutButton.addEventListener("click", () => {
    removeItem(sessionKey);
    renderAccount();
    switchForm("signin");
    setMessage(accountMessage, "Signed out from this browser.", "success");
  });

  window.addEventListener("maris:leadchange", renderDashboard);

  switchForm("signin");
  renderAccount();
})();
