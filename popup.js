/* YouTube Focus — popup logic. Reads/writes the same browser.storage.local
   keys the content script watches, so toggling updates open tabs live. */

(function () {
  "use strict";

  const api = typeof browser !== "undefined" ? browser : chrome;

  const KEYS = ["hideHome", "hideRelated", "hideShorts", "blockAutoplay"];
  const DEFAULTS = {
    hideHome: true,
    hideRelated: true,
    hideShorts: true,
    blockAutoplay: true,
  };

  // Populate checkboxes from stored settings.
  api.storage.local.get(DEFAULTS, (stored) => {
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
      api.storage.local.set({ [key]: box.checked });
    });
  }
})();
