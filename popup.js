/* TubeFocus — popup logic. Reads/writes the same storage keys the content
   script watches, so toggling updates open tabs live. Uses storage.sync with a
   storage.local fallback; note Safari implements storage.sync as per-device
   storage (no iCloud syncing), so settings are local to this Mac either way.

   Note: the home feed has no toggle here — it is always hidden by design.
   The header switch ("enabled") is the master kill-switch: off makes the
   extension fully inert, so users can rule it out if YouTube misbehaves. */

(function () {
  "use strict";

  const api = typeof browser !== "undefined" ? browser : chrome;

  // Localize the UI. Elements keep English text as the fallback; any element
  // with data-i18n gets its text replaced, data-i18n-aria its aria-label.
  // @@bidi_dir flips the layout for right-to-left locales (Arabic).
  try {
    if (api.i18n && api.i18n.getMessage) {
      const dir = api.i18n.getMessage("@@bidi_dir");
      if (dir) document.documentElement.dir = dir;
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const msg = api.i18n.getMessage(el.getAttribute("data-i18n"));
        if (msg) el.textContent = msg;
      });
      document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        const msg = api.i18n.getMessage(el.getAttribute("data-i18n-aria"));
        if (msg) el.setAttribute("aria-label", msg);
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
    "enabled",
    "hideRelated",
    "hideShorts",
    "hideComments",
    "hideSubscriptions",
    "hideEntertainment",
    "blockAutoplay",
  ];
  const DEFAULTS = {
    enabled: true,
    hideRelated: true,
    hideShorts: true,
    hideComments: true,
    hideSubscriptions: true,
    hideEntertainment: true,
    blockAutoplay: true,
  };

  // Dim + lock the feature rows while the master switch is off.
  function reflectEnabled(on) {
    document.body.classList.toggle("off", !on);
  }

  // Populate switches from stored settings.
  store.get(DEFAULTS, (stored) => {
    const settings = { ...DEFAULTS, ...(stored || {}) };
    for (const key of KEYS) {
      const box = document.getElementById(key);
      if (box) box.checked = !!settings[key];
    }
    reflectEnabled(settings.enabled !== false);
  });

  // Persist on change.
  for (const key of KEYS) {
    const box = document.getElementById(key);
    if (!box) continue;
    box.addEventListener("change", () => {
      store.set({ [key]: box.checked });
      if (key === "enabled") reflectEnabled(box.checked);
    });
  }
})();
