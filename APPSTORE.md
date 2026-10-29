# App Store listing & publishing guide — TubeFocus

Draft metadata plus the verified signing/publishing walkthrough (facts checked
against Apple's live docs, October 2026). Keep every claim accurate
(Guideline 2.3): no cross-device sync, no data collection.

**Trademark rule for metadata (Guideline 2.3.7 / 5.2.1):** keep "YouTube" OUT
of the app name, subtitle, and keyword field — "Protego for Reddit" was
rejected in Nov 2024 just for the platform name in its name/subtitle, despite
many shipping precedents. The *description body* should still say the
extension works "on youtube.com": Guideline 4.4 requires clearly disclosing
what the extension does. Nominative use in the description is the accepted
pattern (see Vinegar, sold since 2021).

## App information

| Field | Value |
|---|---|
| Name | TubeFocus |
| Subtitle (≤30 chars) | Watch with intention |
| Primary category | Productivity |
| Secondary category | Utilities (optional) |
| Price | Free |
| Age rating | complete the (post-2025) questionnaire — no sensitive content → 4+ |

## Promotional text (≤170 chars)

> Watch what you came for. TubeFocus hides the recommendation feed, Shorts,
> comments, and autoplay on youtube.com — leaving just search and the video
> you chose.

## Description

> TubeFocus is a Safari extension that turns youtube.com into a tool instead
> of a trap. Open it, search for what you need, watch it, leave.
>
> WHAT IT HIDES
> • The home-page recommendation feed (always — that's the point)
> • "Up next" sidebar and end-screen suggestions
> • Shorts shelves and the Shorts sidebar entry
> • Comments
> • The Subscriptions feed
> • Videos that are obviously entertainment in search results, using keyword
>   heuristics in ten languages — educational content is always given the
>   benefit of the doubt
>
> WHAT IT STOPS
> • Autoplay of the next video, switched off automatically once per video
>   without ever disturbing your scrolling or typing
>
> ALWAYS IN CONTROL
> • Every feature (except the home feed) has its own switch in the toolbar
>   popup, applied instantly to open tabs
> • A master switch makes the extension fully inert in one click
> • If anything ever goes wrong, a built-in failsafe restores the site to
>   stock behavior automatically
>
> PRIVATE BY DESIGN
> • No accounts, no analytics, no data collection — ever
> • Settings are stored on your device
> • Needs access only to youtube.com
>
> TubeFocus is independent and is not affiliated with, endorsed by, or
> sponsored by YouTube or Google.

## Keywords (≤100 chars, no trademarks)

```
focus,distraction,blocker,autoplay,shorts,feed,productivity,adhd,study,safari,extension,video
```

## App Privacy (nutrition label)

- **Data Not Collected** — settings live in `browser.storage` on device; the
  extension makes no network requests of its own and has no analytics.
- Tracking: **No**.
- EU Digital Services Act trader status (asked on first submission even for
  US-only developers): a free hobby app can declare **"This is not a trader
  account"** — no contact info required.

## App Review notes (paste into "Notes for Review")

> TubeFocus is a Safari web extension for removing distractions on
> youtube.com. No account or login is needed anywhere.
>
> To test:
> 1. Launch the app once, then enable TubeFocus in Safari Settings →
>    Extensions, and allow it on youtube.com.
> 2. Open youtube.com: the home feed is replaced by a short placeholder
>    message; search works normally.
> 3. Open any video: the related sidebar, comments, and end-screen
>    suggestions are hidden, and YouTube's "Autoplay next" toggle is
>    switched off automatically (once per video).
> 4. The toolbar popup toggles each feature live; the switch in the popup
>    header disables the extension entirely.
>
> Host permissions: the extension requests access to youtube.com only,
> because that is the only site it modifies (Guideline 4.4.2). It requests
> only the "storage" permission, collects no data, downloads or saves no
> media, and contains no account, purchase, or network functionality.

## Signing & publishing walkthrough

### Phase 1 — Enroll in the Apple Developer Program (only you; ~15 min + wait)

1. **Before starting:** make sure your Apple Account (a) has two-factor
   authentication on, and (b) uses your **exact legal name** as on your photo
   ID — a nickname in the first/last-name fields is the #1 reported cause of
   enrollment stalls. Fix it at account.apple.com first if needed.
2. Enroll as an **Individual** at <https://developer.apple.com/programs/enroll/>
   (web) or in the **Apple Developer app**. Cost: **US$99/year**,
   auto-renewing; pay with your own card (someone else's card triggers extra
   ID checks). No D-U-N-S number is needed for individuals; there is no fee
   waiver for individuals.
3. Identity verification is mandatory and usually means photographing your
   driver's license or passport in the Apple Developer app — complete the
   whole flow on one device (iPhone, or an Apple-silicon/T2 Mac). If the app
   flow errors out, the web Enroll button often still works; switch channels
   rather than waiting.
4. Timing: clean US cases typically activate in 24–48 h, but 2026 has a
   documented verification backlog with some cases taking weeks. If >48 h
   after payment, contact Apple Developer Support with the Enrollment ID from
   your confirmation email — do not re-buy.
5. A free app needs no banking/tax setup. Your legal name becomes the public
   "seller" name on the store.

### Phase 2 — Wire the team into Xcode (you: 2 min; then I automate the rest)

1. Xcode → **Settings → Accounts → +** → Apple Account → sign in with the
   same Apple Account that enrolled. Your individual team appears next to the
   account once the membership is active. (If it still shows only
   "(Personal Team)", remove the account with "–" and re-add it.)
2. **Then tell Claude the team exists** — the remaining steps are automatable:
   set `DEVELOPMENT_TEAM` on all four build configurations in
   `../TubeFocus-App/TubeFocus/TubeFocus.xcodeproj`, build with automatic
   signing (Xcode mints the Apple Development/Distribution certificates and
   registers both App IDs on demand — no manual trip to Certificates,
   Identifiers & Profiles), and verify with `codesign`.
3. Side benefit: the locally installed app is then properly signed, so the
   Safari "Allow unsigned extensions" ritual ends for good.

### Phase 3 — Archive & upload (mostly clicks in Xcode)

1. Product → **Archive** (scheme TubeFocus, My Mac).
2. In the Organizer: **Validate App** first (free pre-check), then
   **Distribute App → TestFlight & App Store** — *not* "Direct Distribution"
   (that's the Developer-ID/notarization path for outside the store).
3. First upload can create the App Store Connect app record for you; or
   create it manually (App Store Connect → My Apps → **+ New App**: platform
   macOS, name **TubeFocus**, primary language, bundle ID
   `com.normanwqn.youtubefocus` from the dropdown, any SKU). Notes:
   - The bundle-ID dropdown only lists **registered, explicit, unused** IDs
     and can lag registration by up to ~24 h.
   - The bundle ID becomes **permanent** after the first upload.
   - The New App dialog is blocked until the latest agreement is accepted
     under Business.
4. Export compliance: `ITSAppUsesNonExemptEncryption=NO` is already in the
   built Info.plist, which skips the per-build questionnaire. (A 2025 ASC bug
   sometimes asks anyway — if so, answer "none of the algorithms" once.)

### Phase 4 — Metadata & screenshots (you, with drafts above)

1. Paste the name/subtitle/description/keywords/notes from this file.
2. Privacy label: **Data Not Collected**; DSA trader: non-trader.
3. Complete the age-rating questionnaire (post-July 2025 expanded version).
4. Screenshots: **exactly** 1280×800, 1440×900, 2560×1600, or 2880×1800
   (16:10), JPEG/PNG, **no alpha channel**, 1–10 of them. Beware: macOS
   window captures (⌘⇧4 + Space) have transparent shadows and odd sizes and
   will be rejected — capture full-screen or flatten/resize (Claude can batch
   this with `sips`). Suggested shots: popup over youtube.com; blanked home
   feed; a watch page with sidebar/comments hidden.

### Phase 5 — Submit & review expectations

1. Add the uploaded build to the version, submit for review.
2. Reality check (Oct 2026): Apple claims 90% of reviews within 48 h; Mac
   submissions are reported by many developers at 3–7+ days, first
   submissions sometimes longer. Resubmissions after a rejection usually
   clear much faster.
3. Known risks, pre-mitigated here: trademark in metadata (removed), false
   claims (none), data collection (none), media downloading (none — the
   category precedent, e.g. Vinegar, is accepted). The one remaining soft
   spot is Guideline 4.4's "the containing app should include some
   functionality, such as help screens" — the stock converter window is
   minimal; adding a short help/instructions screen to the wrapper app is
   cheap insurance before submitting.
4. If rejected: reply in Resolution Center with specifics; App Review Board
   appeal is the escalation path. Re-read the live guidelines on submission
   day — they were last revised October 16–17, 2026.

### Optional — TestFlight dress rehearsal

TestFlight for Mac works for Safari-extension apps. Internal testers (your
own account) need no Beta App Review; external groups trigger a beta review
that is itself slow on Mac right now (~days). For a v1, internal-only or
skipping TestFlight is reasonable.
