# YouTube Focus — Safari extension

Blocks the YouTube recommendation feed and stops autoplay.

**What it does**
- Hides the home-page recommendation grid (shows a small placeholder instead).
  This one is **always on** — there is no toggle to bring the feed back.
- Hides the "Up next" / related-video sidebar and end-screen suggestions on watch pages.
- Hides Shorts shelves and the Shorts sidebar entry.
- Hides the comments section on watch pages.
- Hides the Subscriptions feed page and its sidebar links.
- Hides videos that are **obviously entertainment** in listings (mainly search
  results), by matching their title/channel against a keyword list. This is a
  heuristic — edit `ENTERTAINMENT_PATTERNS` in `content.js` to tune what counts.
- Keeps YouTube's "Autoplay next" toggle **off** (one-shot per video, so it never
  disturbs scrolling or in-page navigation).

Every feature except the home feed can be toggled from the toolbar popup. Changes
apply live to open tabs and **sync across your devices via iCloud** (`storage.sync`),
so the same settings apply on every Mac signed into your Apple ID with the
extension enabled.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Web-extension manifest (MV3) |
| `content.js` | Runs on youtube.com — toggles CSS + blocks autoplay |
| `hide.css` | The selectors that hide recommendation UI |
| `popup.html` / `popup.js` | Toolbar popup with per-feature switches |

## Installing in Safari

Safari only loads web extensions that are bundled inside an app, so you wrap
this folder with Apple's converter (requires **Xcode**, free from the App Store).

1. Clone this repo and run the converter against the folder:

   ```sh
   git clone https://github.com/Normanwqn/safari-youtube-focus.git
   cd youtube-focus
   xcrun safari-web-extension-converter . \
     --app-name "YouTube Focus" \
     --bundle-identifier com.yourname.youtubefocus
   ```

   This generates an Xcode project and opens it.

2. In Xcode, press **▶ Run** (Cmd-R) to build and launch the wrapper app once.

3. In Safari: **Settings → Advanced →** check *Show features for web developers*.
   Then **Settings → Developer →** check *Allow unsigned extensions*
   (you'll re-check this after each Safari restart while developing).

4. **Settings → Extensions →** enable **YouTube Focus** and, when prompted,
   **Allow** it on youtube.com (set "Always Allow on Every Website" or just YouTube).

5. Open YouTube. The home feed, related sidebar, and autoplay are now blocked.
   Click the toolbar icon to toggle individual features.

## Editing / iterating

Edit the files in this folder, then in Xcode press **▶ Run** again to rebuild.
Reload the YouTube tab to pick up `content.js` / `hide.css` changes.

> YouTube changes its DOM often. If something stops being hidden, the CSS
> selectors in `hide.css` or the autoplay button selector in `content.js`
> (`.ytp-autonav-toggle-button`) are the things to update.

## Signing & distribution

By default the build is **ad-hoc signed**, so Safari treats it as unsigned —
it loads only while *Develop → Allow unsigned extensions* is checked, and that
resets every time Safari quits. To make it permanent:

- **For your own Mac (free):** open the project in Xcode, add your Apple ID
  under *Settings → Accounts*, then set that **Team** on both the app and the
  extension target (*Signing & Capabilities*). Xcode issues a free
  *Apple Development* certificate; the extension then loads without the
  unsigned-extensions toggle.
- **To hand the `.app` to other people:** you need the **Apple Developer
  Program** ($99/yr) to get a *Developer ID Application* certificate, then sign
  and **notarize** the app. Without notarization, Gatekeeper blocks it on other
  Macs.

## Notes
- Icons: the artwork is an original illustration — a realistic hourglass
  (graphite caps, translucent glass, red sand) on a neutral background with a
  red play badge at its side. It deliberately does **not** reproduce the
  trademarked YouTube logo.
  - `icon.svg` — rounded-tile variant used for the web-extension icons
    (Safari toolbar / Extensions pane, via `manifest.json`).
  - `icon-tahoe.svg` — **full-bleed square** artwork for the macOS app icon,
    per the macOS 26 (Tahoe) guidelines: no baked corners, margins, or
    shadows — the system applies the squircle mask and Liquid Glass lighting.
    For the fully layered treatment (specular/dark/tinted variants), open the
    artwork in Apple's Icon Composer and export a `.icon` file.
  - Regenerate PNGs with `rsvg-convert -w SIZE -h SIZE icon.svg -o icon-SIZE.png`.
- The extension requests only `storage` permission and access to `*.youtube.com`.
