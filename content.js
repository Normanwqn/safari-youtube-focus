/*
 * YouTube Focus — content script
 *
 * Two jobs:
 *   1. Flip data-* attributes on <html> so hide.css can blank out the
 *      recommendation feed, related sidebar, end screens, etc.
 *   2. Actively keep YouTube's "Autoplay next" toggle OFF and stop the
 *      player from auto-advancing to the next video.
 *
 * Works with YouTube's SPA navigation (it never does full page loads), so we
 * re-apply on every yt-navigate-finish and via a MutationObserver.
 */

(function () {
  "use strict";

  const api = typeof browser !== "undefined" ? browser : chrome;

  const DEFAULTS = {
    hideHome: true,
    hideRelated: true,
    hideShorts: true,
    blockAutoplay: true,
  };

  let settings = { ...DEFAULTS };

  /* ---------------- settings -> <html> data attributes ---------------- */

  // Cheap and click-free: only flips the CSS gate attributes on <html>.
  // Autoplay (which clicks player controls) is handled separately by
  // handleAutoplay(), gated to watch pages.
  function applySettings() {
    const root = document.documentElement;
    root.setAttribute("data-ytf-hide-home", settings.hideHome ? "1" : "0");
    root.setAttribute("data-ytf-hide-related", settings.hideRelated ? "1" : "0");
    root.setAttribute("data-ytf-hide-shorts", settings.hideShorts ? "1" : "0");
    root.setAttribute("data-ytf-block-autoplay", settings.blockAutoplay ? "1" : "0");
  }

  function loadSettings() {
    try {
      api.storage.local.get(DEFAULTS, (stored) => {
        if (stored) settings = { ...DEFAULTS, ...stored };
        applySettings();
      });
    } catch (e) {
      applySettings(); // storage unavailable — fall back to defaults
    }
  }

  // React live to popup toggles.
  try {
    api.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      for (const key of Object.keys(changes)) {
        settings[key] = changes[key].newValue;
      }
      applySettings();
      handleAutoplay();
    });
  } catch (e) {
    /* ignore */
  }

  /* ---------------- autoplay blocking ----------------
   *
   * IMPORTANT: every action here CLICKS a player control, which moves focus.
   * It must ONLY run on a watch page. Running it on the home/search/results
   * pages would steal focus from the search box mid-typing and submit the
   * highlighted autocomplete suggestion instead of what you typed.
   */

  function onWatchPage() {
    return location.pathname === "/watch";
  }

  // Turn off the on-player "Autoplay" toggle if YouTube has it on, and cancel
  // any "up next" auto-advance countdown. No-op everywhere except /watch.
  function handleAutoplay() {
    if (!settings.blockAutoplay || !onWatchPage()) return;

    const toggle = document.querySelector(
      ".ytp-autonav-toggle-button[aria-checked='true']"
    );
    // Only click if the search box doesn't currently have focus, so we never
    // yank the caret out from under the user.
    if (toggle && !searchHasFocus()) {
      toggle.click();
    }

    const cancel = document.querySelector(
      ".ytp-autonav-endscreen-upnext-cancel-button, .ytp-upnext-cancel-button"
    );
    if (cancel) cancel.click();
  }

  function searchHasFocus() {
    const el = document.activeElement;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  }

  /* ---------------- run + re-run on SPA navigation ---------------- */

  // Cheap, no clicks — safe to run on every mutation/navigation everywhere.
  function applyHiding() {
    applySettings();
  }

  // Observe DOM mutations but only flip CSS attributes; clicks are handled
  // separately and gated to watch pages.
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyHiding();
      handleAutoplay();
    });
  });

  function startObserving() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // YouTube fires this when it finishes an in-app navigation. Re-apply hiding
  // immediately, and give the late-rendering player a few tries for autoplay.
  function onNavigate() {
    applyHiding();
    if (settings.blockAutoplay && onWatchPage()) {
      [300, 1000, 2500].forEach((ms) => setTimeout(handleAutoplay, ms));
    }
  }
  window.addEventListener("yt-navigate-finish", onNavigate, true);
  document.addEventListener("yt-navigate-finish", onNavigate, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      startObserving();
      onNavigate();
    });
  } else {
    startObserving();
    onNavigate();
  }

  loadSettings();
})();
