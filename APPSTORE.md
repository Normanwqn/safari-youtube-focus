# App Store listing — TubeFocus

Draft metadata for App Store Connect. Keep every claim accurate (Guideline 2.3):
no cross-device sync, no data collection, nominative "for YouTube" phrasing only.

## App information

| Field | Value |
|---|---|
| Name | TubeFocus |
| Subtitle (≤30 chars) | Distraction-free YouTube |
| Primary category | Productivity |
| Secondary category | Utilities (optional) |
| Price | Free |
| Age rating | 4+ |

## Promotional text (≤170 chars)

> Watch what you came for. TubeFocus hides YouTube's recommendation feed,
> Shorts, comments, and autoplay — leaving just search and the video you chose.

## Description

> TubeFocus is a Safari extension that turns YouTube into a tool instead of a
> trap. Open YouTube, search for what you need, watch it, leave.
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
> • If anything ever goes wrong, a built-in failsafe restores YouTube to
>   stock behavior automatically
>
> PRIVATE BY DESIGN
> • No accounts, no analytics, no data collection — ever
> • Settings are stored on your device
> • Needs access only to youtube.com
>
> TubeFocus is independent and is not affiliated with, endorsed by, or
> sponsored by YouTube or Google.

## Keywords (≤100 chars)

```
youtube,focus,distraction,blocker,autoplay,shorts,feed,productivity,adhd,study,safari,extension
```

## Localizations

App Store metadata can be localized into the same languages the product ships:
English, Spanish, Portuguese (BR), French, German, Japanese, Korean,
Chinese (Simplified), Russian, Arabic.

## App Privacy (nutrition label)

- **Data Not Collected** — the extension stores its on/off settings in
  `browser.storage` on device, collects nothing, and makes no network requests
  of its own.
- Tracking: **No**.

## App Review notes

> TubeFocus is a Safari web extension. To test:
> 1. Launch the app once, then enable TubeFocus in Safari Settings →
>    Extensions, and allow it on youtube.com.
> 2. Open youtube.com: the home feed is replaced by a short placeholder
>    message; search still works normally.
> 3. Open any video: the related sidebar, comments, and end-screen
>    suggestions are hidden, and YouTube's "Autoplay next" toggle is
>    switched off automatically.
> 4. The toolbar popup toggles each feature live; the switch in the popup
>    header disables the extension entirely.
> The extension requests only the "storage" permission and host access to
> youtube.com. It collects no data and contains no account, purchase, or
> network functionality.

## Submission checklist

1. ☐ Apple Developer Program enrollment active.
2. ☐ In Xcode (`../TubeFocus-App/TubeFocus/TubeFocus.xcodeproj`): set the
   **Team** on both targets (Signing & Capabilities). Everything else
   (sandbox, category, export compliance, versions) is already configured.
3. ☐ Product → Archive → Distribute App → App Store Connect.
4. ☐ Create the app record in App Store Connect (bundle id
   `com.normanwqn.youtubefocus`), paste the metadata above, answer the
   privacy questionnaire as **Data Not Collected**.
5. ☐ Screenshots (1280×800 or 2560×1600): the popup over youtube.com, the
   blanked home feed, a watch page with sidebar/comments hidden.
6. ☐ Submit for review.
