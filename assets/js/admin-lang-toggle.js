// TH | EN switch for the admin and its sign-in pages. The choice is stored in the
// maris_admin_lang cookie by window.marisAdminSetLang (defined by the inline
// script from app/lib/admin-i18n.js), then the page reloads. A reload still asks
// before leaving when there is unsaved work (the beforeunload guard in
// admin-page.js).
(() => {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-lang-set]");

    if (!button || typeof window.marisAdminSetLang !== "function") {
      return;
    }

    const lang = button.dataset.adminLangSet;

    if (button.getAttribute("aria-pressed") === "true") {
      return;
    }

    window.marisAdminSetLang(lang);
  });
})();
