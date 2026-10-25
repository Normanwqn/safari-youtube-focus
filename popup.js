/* YouTube Focus — popup logic. Reads/writes the same storage keys the content
   script watches, so toggling updates open tabs live. Uses storage.sync with a
   storage.local fallback; note Safari implements storage.sync as per-device
   storage (no iCloud syncing), so settings are local to this Mac either way.

   Note: the home feed has no toggle here — it is always hidden by design. */

(function () {
  "use strict";

  const api = typeof browser !== "undefined" ? browser : chrome;

  // Localize the UI. Elements keep English text as the fallback; any element
  // with data-i18n gets its text replaced by the active locale's message.
  // @@bidi_dir flips the layout for right-to-left locales (Arabic).
  try {
    if (api.i18n && api.i18n.getMessage) {
      const dir = api.i18n.getMessage("@@bidi_dir");
      if (dir) document.documentElement.dir = dir;
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const msg = api.i18n.getMessage(el.getAttribute("data-i18n"));
        if (msg) el.textContent = msg;
      });
    }
  } catch (e) {
    /* ignore — English fallback stays */
  }

  function getStore() {
    try {
      if (api.storage && api.storage.sync) return api.storage.sync;
    } catch (e) {
      /* ignore */
    }
    return api.storage.local;
  }
  const store = getStore();

  const KEYS = [
    "hideRelated",
    "hideShorts",
    "hideComments",
    "hideSubscriptions",
    "hideEntertainment",
    "blockAutoplay",
  ];
  const DEFAULTS = {
    hideRelated: true,
    hideShorts: true,
    hideComments: true,
    hideSubscriptions: true,
    hideEntertainment: true,
    blockAutoplay: true,
  };

  // Populate checkboxes from stored settings.
  store.get(DEFAULTS, (stored) => {
    const settings = { ...DEFAULTS, ...(stored || {}) };
    for (const key of KEYS) {
      const box = document.getElementById(key);
      if (box) box.checked = !!settings[key];
    }
  });

  // Persist on change.
  for (const key of KEYS) {
    const box = document.getElementById(key);
    if (!box) continue;
    box.addEventListener("change", () => {
      store.set({ [key]: box.checked });
    });
  }
})();
