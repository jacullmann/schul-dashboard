# Schul-Dashboard Android

Native Kotlin client for the Schul-Dashboard API (Jetpack Compose, Hilt, Retrofit, kotlinx.serialization).
It talks to the same server as the web app in `../app`.

## Build

Open the folder in Android Studio, or use the wrapper with Android Studio's JDK 17+.

    ./gradlew assembleDebug          # debug: API at http://localhost:3000 (use `adb reverse tcp:3000 tcp:3000`)
    ./gradlew test

Release APK (signed with `keystore.properties`, which is gitignored together with the `.jks`):

    ./gradlew assembleRelease       -PapiUrl=https://<api host>       -PsiteUrl=https://<web app host>       -PcloudinaryCloudName=<VITE_CLOUDINARY_CLOUD_NAME>

Output: `app/build/outputs/apk/release/app-release.apk`. Back up `schuldashboard-release.jks` and its
passwords: every future update has to be signed with the same key.

## Architecture

- `data/api` – Retrofit interface and DTOs mirroring the server JSON.
- `data/net` – cookie jar (session survives restarts), CSRF header echo, serialized token refresh.
- `data/*Repository` – thin repositories; `SessionRepository` owns auth state and the group list.
- `domain` – group/permission models and the schedule logic ported from the web client
  (course personalization, substitutions, slot times).
- `ui` – one package per feature; view models expose `StateFlow`s, screens are stateless composables.
- `ui/theme` – the web app's design tokens (`style.css`): colours for both themes, the text and radius
  scales, easing curves and springs, and `animateEnter`, the site's staggered entrance.
- `ui/design` – Compose counterparts of the site's `Base*` components (buttons, inputs, checkbox,
  toggle, segmented control, tab bar, modal, sheet, menu, toasts, item card, date picker). Screens
  build on these instead of Material components, so spacing and motion stay in step with the web.
- `ui/icons` – the Lucide icons the web app uses, generated from `app/node_modules` by
  `node scripts/generate-lucide.js [IconName ...]` (keeps the existing icons, adds the named ones).

Backdrop blur (`ui/design/Backdrop.kt`) uses [Haze](https://github.com/chrisbanes/haze): overlays blur
the page behind them, pages scroll under the header into a progressive blur like BaseScrollFade, and
the tab bar is frosted glass whose rim bends the page like a lens (an AGSL shader, Android 13+).
Blur needs Android 12; older versions keep the site's tints and dims, with the header tint
opaque and the tab bar near-opaque so nothing sharp shows through.

Fonts are bundled under `res/font`: Inter (variable) for text and Satoshi 400/500/700 for headings,
the same weights the site loads from Fontshare (ITF Free Font License).

## Parity with the web app

Ported: sign in (incl. MFA), register, forgot password, e-mail verification and invite deep links,
groups (create/join/switch), dashboard, tasks (filters, check, pin, create/edit/delete, report,
images with upload and viewer, notes, private tasks), schedule, chat (REST + WebSocket), announcements,
my courses, account (password, MFA setup, sessions, personalization, theme, language, delete),
group settings (overview, general, permissions, members, invites, subjects/courses, schedule editor,
substitutions, announcements) and super admin (stats, users, reports, groups).

Not ported: Google sign-in (the OAuth redirect ends in a browser, not the app), the command-palette
search, the image editing tool, private task drag-reorder/duplicate, archive keep/hide, chat "typing"
sending, legal pages and update history.
