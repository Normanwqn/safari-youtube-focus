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
  // disableAutoplayOnce(), as a one-shot per video on watch pages.
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
      // If autoplay-blocking was just turned on, re-run the one-shot.
      if (settings.blockAutoplay) {
        autoplayHandled = false;
        scheduleAutoplayDisable();
      }
    });
  } catch (e) {
    /* ignore */
  }

  /* ---------------- autoplay blocking ----------------
   *
   * Turning off autoplay means CLICKING the player's autoplay toggle, which
   * moves keyboard focus to that control and makes the browser scroll it into
   * view. If we did that on every DOM mutation, then scrolling a list or
   * pressing a button to jump to a section (both mutate the DOM) would yank
   * you back to the player. So this is strictly ONE-SHOT per video: we click
   * the toggle off once, right after the player first appears, then never
   * again until you navigate to a different video.
   */

  function onWatchPage() {
    return location.pathname === "/watch";
  }

  function searchHasFocus() {
    const el = document.activeElement;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  }

  // Reset per video so a freshly loaded video gets autoplay turned off once.
  let autoplayHandled = false;
  let lastWatchKey = "";

  // Click the autoplay toggle off a single time. Returns true once it has
  // resolved (either it was already off, or we just turned it off) so the
  // retry schedule can stop early.
  function disableAutoplayOnce() {
    if (autoplayHandled) return true;
    if (!settings.blockAutoplay || !onWatchPage()) return false;
    if (searchHasFocus()) return false; // never steal focus from typing

    const toggle = document.querySelector(".ytp-autonav-toggle-button");
    if (!toggle) return false; // player controls not rendered yet — retry later

    if (toggle.getAttribute("aria-checked") === "true") {
      toggle.click(); // the only focus-moving action, and it happens once
    }
    autoplayHandled = true; // already off or just turned off — done for this video
    return true;
  }

  /* ---------------- run + re-run on SPA navigation ---------------- */

  // Cheap, no clicks, no focus changes — safe to run on every mutation.
  function applyHiding() {
    applySettings();
  }

  // The observer ONLY flips CSS attributes. It never clicks anything, so it
  // can fire as often as YouTube mutates the DOM without disturbing scroll
  // position or focus.
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyHiding();
    });
  });

  function startObserving() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // The player renders after navigation finishes, so retry the one-shot a few
  // times and stop as soon as it resolves.
  function scheduleAutoplayDisable() {
    if (!settings.blockAutoplay || !onWatchPage()) return;
    [200, 600, 1500, 3000].forEach((ms) =>
      setTimeout(() => disableAutoplayOnce(), ms)
    );
  }

  // YouTube fires this when it finishes an in-app navigation.
  function onNavigate() {
    applyHiding();
    const key = onWatchPage() ? location.search : ""; // ?v=... identifies the video
    if (key !== lastWatchKey) {
      lastWatchKey = key;
      autoplayHandled = false; // new video — allow one autoplay-off again
    }
    scheduleAutoplayDisable();
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
