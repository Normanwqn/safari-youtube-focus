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

  // Prefer storage.sync with a storage.local fallback. Note: Safari implements
  // storage.sync as plain per-device storage — it does NOT sync via iCloud
  // (Apple: "Storage mechanism implemented, but syncing not supported"), so
  // settings are per-device either way. sync is kept for cross-browser parity.
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
  // Called from init, storage load, onChanged, and navigation — NOT from the
  // MutationObserver (settings can't change from DOM mutations).
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
        filterEntertainment();
      });
    } catch (e) {
      applySettings(); // storage unavailable — fall back to defaults
    }
  }

  // React live to popup toggles. Both scripts write to a single store, so no
  // area filtering is needed; skip removed keys (undefined newValue).
  try {
    api.storage.onChanged.addListener((changes) => {
      for (const key of Object.keys(changes)) {
        if (key in settings && changes[key].newValue !== undefined) {
          settings[key] = changes[key].newValue;
        }
      }
      applySettings();
      // Re-run the autoplay one-shot only when blocking was just turned ON —
      // unrelated toggles must not override an autoplay choice the user made
      // on the page since our initial one-shot.
      if (
        "blockAutoplay" in changes &&
        changes.blockAutoplay.newValue === true &&
        changes.blockAutoplay.oldValue !== true
      ) {
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
   * so it never disturbs scroll or focus. The keyword lists are English-first
   * (see README); tune them to taste — the bias is deliberately conservative
   * ("obviously" entertainment) to limit false hits.
   */

  const ENTERTAINMENT_PATTERNS = [
    // reactions / pranks / drama
    // (note: "react … to", not bare "react" — avoids the React JS framework)
    "reaction", "react(s|ing|ed)? to", "prank", "gone wrong",
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
  // olympiad", "highlights of the lecture"). Bias is toward keeping. Includes
  // common non-English study terms so language-independent brand keywords
  // (minecraft, gta, ...) can't hide foreign-language tutorials unopposed.
  const ALLOW_PATTERNS = [
    "tutorial", "lecture", "\\bcourse\\b", "explained", "how to",
    "documentation", "\\bapi\\b", "leetcode", "algorithm", "\\bmath\\b",
    "physics", "chemistry", "biology", "interview", "coding", "programming",
    "kaggle", "proof", "theorem", "lesson", "\\bexam\\b",
    // non-English study terms
    "curso", "tutoriel", "\\bcours\\b", "anleitung", "講座", "강좌", "урок",
  ];
  const ALLOW_RE = new RegExp("(" + ALLOW_PATTERNS.join("|") + ")", "i");

  // Legacy Polymer renderers plus the newer bare lockup view-model that
  // YouTube is migrating listings to (related sidebar, newer search results).
  const LEGACY_ITEM_SELECTOR = [
    "ytd-video-renderer",
    "ytd-rich-item-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-playlist-video-renderer",
  ].join(",");
  const VIDEO_ITEM_SELECTOR = LEGACY_ITEM_SELECTOR + ",yt-lockup-view-model";

  function itemText(el) {
    // Specific selectors first; the generic h3 fallback ONLY when they miss
    // (bare lockups). A combined list would let the h3 — an ANCESTOR of
    // #video-title in legacy renderers — shadow the clean title attribute
    // and pull badge text (LIVE/New) into the classification input.
    const title =
      el.querySelector(
        "#video-title, #video-title-link, .yt-lockup-metadata-view-model__title"
      ) ||
      el.querySelector("h3 a") ||
      el.querySelector("h3");
    const channel = el.querySelector(
      "#channel-name, ytd-channel-name, .yt-content-metadata-view-model-wiz__metadata-text"
    );
    const titleText =
      (title && (title.getAttribute("title") || title.textContent)) || "";
    const channelText = (channel && channel.textContent) || "";
    return (titleText + " " + channelText).trim();
  }

  // Classify one item as entertainment ("1") or not ("0"). The classified
  // text is stored in data-ytf-key so an item whose content changes (SPA
  // rebinds, late-rendering text) is re-classified instead of keeping a stale
  // verdict. Items with no text yet are left unmarked for a later retry.
  function classifyItem(el) {
    // A lockup nested inside a legacy renderer is handled by its ancestor.
    if (el.tagName === "YT-LOCKUP-VIEW-MODEL" && el.parentElement && el.parentElement.closest(LEGACY_ITEM_SELECTOR)) {
      return;
    }
    const text = itemText(el);
    if (!text) return; // not populated yet — retry next pass
    if (el.getAttribute("data-ytf-key") === text) return; // verdict still valid
    const isEntertainment = ENT_RE.test(text) && !ALLOW_RE.test(text);
    el.setAttribute("data-ytf-key", text);
    el.setAttribute("data-ytf-ent", isEntertainment ? "1" : "0");
  }

  // Full-page pass: used on load/toggle/navigation, NOT on every mutation.
  function filterEntertainment() {
    if (!settings.hideEntertainment) return;
    document.querySelectorAll(VIDEO_ITEM_SELECTOR).forEach(classifyItem);
  }

  /* ---------------- run + re-run on SPA navigation ---------------- */

  // The observer only re-runs the (click-free) entertainment tagger, and only
  // on the items its MutationRecords actually touched — a full-page rescan on
  // every mutation batch would re-extract text from hundreds of items per
  // frame while scrolling. Settings attributes are applied on load/change/
  // navigation, never from mutations.
  const pendingItems = new Set();
  let scheduled = false;
  const observer = new MutationObserver((records) => {
    if (!settings.hideEntertainment) return;
    for (const record of records) {
      const host =
        record.target.nodeType === 1
          ? record.target.closest(VIDEO_ITEM_SELECTOR)
          : null;
      if (host) pendingItems.add(host);
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches(VIDEO_ITEM_SELECTOR)) pendingItems.add(node);
        node
          .querySelectorAll(VIDEO_ITEM_SELECTOR)
          .forEach((el) => pendingItems.add(el));
      }
    }
    if (!pendingItems.size || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (!settings.hideEntertainment) {
        pendingItems.clear();
        return;
      }
      pendingItems.forEach((el) => {
        if (el.isConnected) classifyItem(el);
      });
      pendingItems.clear();
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
    applySettings();
    filterEntertainment();
    // Key the autoplay one-shot on the video id only — timestamp/playlist/share
    // params also change location.search but are the SAME video, and must not
    // re-arm the toggle click (it moves focus and scrolls the player into view).
    let key = "";
    if (onWatchPage()) {
      try {
        key = new URLSearchParams(location.search).get("v") || "";
      } catch (e) {
        key = location.search;
      }
    }
    if (key !== lastWatchKey) {
      lastWatchKey = key;
      autoplayHandled = false; // new video — allow one autoplay-off again
    }
    scheduleAutoplayDisable();
  }
  // Single registration: the event's capture phase passes through document,
  // so a window listener would just run everything twice.
  document.addEventListener("yt-navigate-finish", onNavigate, true);

  // Apply the (all-hidden) defaults synchronously at document_start so the
  // feed can never flash in while the async storage read is in flight.
  applySettings();

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
