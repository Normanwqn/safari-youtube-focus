/* YouTube Focus — popup logic. Reads/writes the same storage keys the content
   script watches, so toggling updates open tabs live. Uses storage.sync (Safari
   backs it with iCloud) so settings follow you across devices; falls back to
   storage.local when sync isn't available.

   Note: the home feed has no toggle here — it is always hidden by design. */

(function () {
  "use strict";

  const api = typeof browser !== "undefined" ? browser : chrome;

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
    "blockAutoplay",
  ];
  const DEFAULTS = {
    hideRelated: true,
    hideShorts: true,
    hideComments: true,
    hideSubscriptions: true,
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
