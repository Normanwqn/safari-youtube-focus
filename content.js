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

  // Prefer storage.sync — Safari backs it with iCloud, so settings follow the
  // user across every device signed into the same Apple ID. Fall back to local
  // if sync isn't available (older Safari, or iCloud disabled).
  function getStore() {
    try {
      if (api.storage && api.storage.sync) return api.storage.sync;
    } catch (e) {
      /* ignore */
    }
    return api.storage.local;
  }
  const store = getStore();

  // NOTE: the home feed is ALWAYS hidden — there is deliberately no setting for
  // it, so it can't be re-enabled. Only these features are user-toggleable.
  const DEFAULTS = {
    hideRelated: true,
    hideShorts: true,
    hideComments: true,
    hideSubscriptions: true,
    hideEntertainment: true,
    blockAutoplay: true,
  };

  let settings = { ...DEFAULTS };

  /* ---------------- settings -> <html> data attributes ---------------- */

  // Cheap and click-free: only flips the CSS gate attributes on <html>.
  // Autoplay (which clicks player controls) is handled separately by
  // disableAutoplayOnce(), as a one-shot per video on watch pages.
  function applySettings() {
    const root = document.documentElement;
    root.setAttribute("data-ytf-hide-home", "1"); // always on, not configurable
    root.setAttribute("data-ytf-hide-related", settings.hideRelated ? "1" : "0");
    root.setAttribute("data-ytf-hide-shorts", settings.hideShorts ? "1" : "0");
    root.setAttribute("data-ytf-hide-comments", settings.hideComments ? "1" : "0");
    root.setAttribute("data-ytf-hide-subscriptions", settings.hideSubscriptions ? "1" : "0");
    root.setAttribute("data-ytf-hide-entertainment", settings.hideEntertainment ? "1" : "0");
    root.setAttribute("data-ytf-block-autoplay", settings.blockAutoplay ? "1" : "0");
  }

  function loadSettings() {
    try {
      store.get(DEFAULTS, (stored) => {
        if (stored) settings = { ...DEFAULTS, ...stored };
        applySettings();
      });
    } catch (e) {
      applySettings(); // storage unavailable — fall back to defaults
    }
  }

  // React live to popup toggles (and to changes synced from other devices).
  // We only ever write to one store, so applying on any area is safe.
  try {
    api.storage.onChanged.addListener((changes) => {
      for (const key of Object.keys(changes)) {
        if (key in settings) settings[key] = changes[key].newValue;
      }
      applySettings();
      // If autoplay-blocking was just turned on, re-run the one-shot.
      if (settings.blockAutoplay) {
        autoplayHandled = false;
        scheduleAutoplayDisable();
      }
      // If entertainment-filtering was just turned on, tag current items.
      if (settings.hideEntertainment) filterEntertainment();
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

  /* ---------------- entertainment filtering ----------------
   *
   * Heuristic, keyword-based: hide videos in listings (mainly search results)
   * whose title/channel obviously signal entertainment. This only reads text
   * and TAGS the item with data-ytf-ent; hide.css does the hiding. No clicks,
   * so it never disturbs scroll or focus. Tune the list below to taste — it is
   * deliberately conservative ("obviously" entertainment) to limit false hits.
   */

  const ENTERTAINMENT_PATTERNS = [
    // reactions / pranks / drama
    // (note: "react … to", not bare "react" — avoids the React JS framework)
    "reaction", "react(s|ing)? to", "prank", "gone wrong",
    "caught on camera", "exposed", "\\bdrama\\b", "responds? to", "clap ?back",
    // vlogs / lifestyle
    "\\bvlog", "day in (my|the) life", "story ?time", "grwm",
    "get ready with me",
    // gaming
    "gameplay", "\\bgaming\\b", "playthrough", "speedrun",
    "let'?s play", "no commentary", "minecraft", "fortnite", "roblox", "\\bgta\\b",
    // music / performance
    "official music video", "official video", "lyric video", "\\bmusic video\\b",
    "live performance", "\\bconcert\\b",
    // comedy / memes / compilations
    "\\bfunny\\b", "\\bmemes?\\b", "\\bcomedy\\b", "\\bskit\\b", "tik ?tok",
    "compilation", "try not to (laugh|cry)", "bloopers?", "\\bfails?\\b",
    // challenges / stunts
    "challenge", "24 ?hours?", "mr ?beast", "\\bstunt",
    // sports highlights
    "highlights", "full (match|game)",
    // trailers / movies
    "official trailer", "\\bteaser\\b", "movie clip",
    // shopping / food entertainment
    "unboxing", "\\bhaul\\b", "mukbang", "\\basmr\\b", "oddly satisfying",
  ];
  const ENT_RE = new RegExp("(" + ENTERTAINMENT_PATTERNS.join("|") + ")", "i");

  // Veto list: if a title looks educational/technical, keep it even when an
  // entertainment keyword also matched (e.g. "coding challenge", "math
  // olympiad", "highlights of the lecture"). Bias is toward keeping.
  const ALLOW_PATTERNS = [
    "tutorial", "lecture", "\\bcourse\\b", "explained", "how to",
    "documentation", "\\bapi\\b", "leetcode", "algorithm", "\\bmath\\b",
    "physics", "chemistry", "biology", "interview", "coding", "programming",
    "kaggle", "proof", "theorem", "lesson", "\\bexam\\b",
  ];
  const ALLOW_RE = new RegExp("(" + ALLOW_PATTERNS.join("|") + ")", "i");

  const VIDEO_ITEM_SELECTOR = [
    "ytd-video-renderer",
    "ytd-rich-item-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-playlist-video-renderer",
  ].join(",");

  function itemText(el) {
    const title = el.querySelector(
      "#video-title, #video-title-link, .yt-lockup-metadata-view-model__title"
    );
    const channel = el.querySelector(
      "#channel-name, ytd-channel-name, .yt-content-metadata-view-model-wiz__metadata-text"
    );
    const titleText =
      (title && (title.getAttribute("title") || title.textContent)) || "";
    const channelText = (channel && channel.textContent) || "";
    return (titleText + " " + channelText).trim();
  }

  // Tag not-yet-scanned video items as entertainment ("1") or not ("0").
  // Items whose text hasn't rendered yet are left unmarked so a later pass
  // retries them.
  function filterEntertainment() {
    if (!settings.hideEntertainment) return;
    const items = document.querySelectorAll(
      VIDEO_ITEM_SELECTOR + ":not([data-ytf-ent])"
    );
    items.forEach((el) => {
      const text = itemText(el);
      if (!text) return; // not populated yet — retry next pass
      const isEntertainment = ENT_RE.test(text) && !ALLOW_RE.test(text);
      el.setAttribute("data-ytf-ent", isEntertainment ? "1" : "0");
    });
  }

  /* ---------------- run + re-run on SPA navigation ---------------- */

  // Cheap, no clicks, no focus changes — safe to run on every mutation.
  function applyHiding() {
    applySettings();
    filterEntertainment();
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
