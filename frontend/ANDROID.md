# Trackiyo Android (Capacitor) — Operations Manual

## 1. Architecture

```
Landing Page (/ — "Get the Android App" section)
   │  APK download (/downloads/trackiyo-vX.Y.Z.apk)
   ▼
Android APK (com.trackiyo.app) — thin Capacitor 8 shell
   │  loads PRODUCTION_URL (remote website)       ★ web updates need NO reinstall
   │  checks /app-update.json for native updates
   ▼
Deployed frontend (Vercel) ──API──▶ Backend + Supabase (unchanged)
```

**Why remote-URL instead of bundled assets:** the hard requirement is that
website changes reach users without reinstalling. A bundled WebView would
freeze the web code at build time (updating it silently requires a custom
binary-diff updater — fragile and risky). The remote shell always loads the
live deployment, so UI/CSS/React/bug-fix deploys go live instantly. Only
native-layer changes (plugins, permissions, manifest, icons, config) need a
new APK. Trade-off accepted consciously: the app needs internet on first
launch; after that the PWA service worker serves the shell offline exactly
like the browser version.

## 2. Prerequisites (this machine already has them)

- Node 24 + npm, JDK 21 (`~/Java/jdk-21.0.12.1+1`, wired via
  `android/gradle.properties` → `org.gradle.java.home`)
- Android SDK at `C:\Android` (platforms 35/36, build-tools 36,licenses accepted)
- If Gradle cannot reach the network: `$env:GRADLE_OPTS='-Djava.net.preferIPv4Stack=true'`
  (this machine needs it — JVM direct connections otherwise time out)

## 3. One-time setup (already done — for reproducibility)

1. `npm install @capacitor/{core,cli,android,app,status-bar,splash-screen,browser}`
2. `npx cap init Trackiyo com.trackiyo.app --web-dir=dist` + `npx cap add android`
3. Set `PRODUCTION_URL` in `capacitor.config.ts` (or `CAP_SERVER_URL` env at sync time)
4. Vector launcher icon (`res/drawable/trackiyo_fg.xml`) + `splash.xml`;
   adaptive-icon XMLs point at them (API 24–25 fall back to stock PNGs)
5. `AndroidManifest.xml`: `adjustResize` keyboard mode; INTERNET only
6. Backend `server.js` CORS allowlist includes the WebView origins
   (`http://localhost`, `https://localhost`, `capacitor://localhost`)

## 4. Versioning — single source of truth

Three places must agree per release (this is intentional and documented):

| Place | Value for v1.0.0 |
|---|---|
| `frontend/package.json` → `version` | `1.0.0` |
| `frontend/android/app/build.gradle` → `versionName` / `versionCode` | `"1.0.0"` / `1` |
| `frontend/public/app-update.json` → `version` / `versionCode` | `1.0.0` / `1` |

`versionCode` is an integer and MUST increment on every native release.
`minimumVersionCode` forces mandatory updates when raised above installs.

## 5. Web-only release (no APK rebuild)

1. Change website code as usual.
2. `npm run build`, commit, push → hosting redeploys.
3. Done — installed apps load the new web app on next launch. No user action.

## 6. Native release (Capacitor/Android layer changed)

1. Make native changes; bump the three version spots (§4, increment versionCode).
2. `npm run build` (frontend) → `npx cap sync android`.
3. `cd android` → `./gradlew assembleRelease` (signed via `keystore.properties`).
4. Copy APK → `frontend/public/downloads/trackiyo-vX.Y.Z.apk`.
5. Compute size + SHA-256, update `public/app-update.json`
   (`version`, `versionCode`, `apkUrl`, `fileSize`, `releasedAt`,
   `releaseNotes`, `sha256`).
6. Commit + push → site redeploys with APK + metadata.
7. Installed apps detect it on next launch (optional prompt, or forced
   when below `minimumVersionCode`).

## 7. Release signing — READ THIS

- Key: `frontend/android/release.keystore` (RSA-4096, valid 30y), alias `trackiyo`.
- Passwords: `frontend/android/keystore.properties` — **gitignored, never commit**.
- **Back up both somewhere safe and offline NOW. Losing the keystore means
  you can never publish an update to the existing app** (Android rejects
  same-package uploads signed with a different key).
- Signing cert SHA-256: `89c828170d079fd2c39f92c620fa5f95220ddf55092d2e9f8810cf53cd4a3606`

## 8. APK hosting

APKs live in `frontend/public/downloads/` and are served statically by the
same hosting as the site (`/downloads/trackiyo-vX.Y.Z.apk`). The landing
page and the in-app updater both read the URL from `app-update.json`, so
rotating files never needs a code change. Keep old APKs until you are sure
no installs reference them.

## 9. Update system

- On launch (native only), the app compares its build number
  (`@capacitor/app` `getInfo()`) with `/app-update.json`.
- Newer available → dialog with release notes, **Update Now** (opens the APK
  via system browser/installer — user stays in control) or **Later**
  (once per session).
- Below `minimumVersionCode` → blocking **Update Required**, no dismissal.
- Metadata fetch failures never block the app.

## 10. Android behavior notes

- Back button: closes topmost overlay (auth popup, dropdowns, date picker,
  emoji picker) first; exits only at root with empty history.
- Status bar: non-overlay, background + icon style follow the app theme/mode.
- Splash: branded, ~800ms, auto-hides. Keyboard: `adjustResize`.
- Auth/storage: unchanged web behavior (localStorage token, cookies);
  reliable inside the WebView. No extra permissions requested.
- No push notifications, no deep links, no file-upload/download features
  exist in the app, so none were added (WebView defaults apply).

## 11. Testing performed

- `npm run build` (tsc + vite) ✓, `oxlint` 0 warnings/0 errors ✓
- `assembleDebug` ✓ and signed `assembleRelease` ✓ (v1.0.0, vc 1)
- Signature + package identity verified via `apksigner`/`aapt`
- Web regressions: existing build/lint gates pass; all changes are additive
  (new files, config, one CORS allowlist extension, one manifest line)
- NOT yet done on hardware: install flow on a real device, unknown-sources
  UX, back-button feel, status-bar per theme, splash timing, offline launch,
  update-dialog end-to-end (requires the deployed site + uploaded APK)

## 12. Remaining manual steps (owner)

1. **Set `PRODUCTION_URL`** in `frontend/capacitor.config.ts` to the real
   deployed frontend origin (https, no trailing slash), then `npx cap sync`.
   The current APK was synced with the placeholder — **rebuild it after
   setting the URL** (debug works regardless; release must be rebuilt).
2. Deploy backend + frontend so the site, API, `/app-update.json` and
   `/downloads/*.apk` are all live on https.
3. Transfer the APK to a phone, install, smoke-test (§11 list).
4. Back up `release.keystore` + `keystore.properties` offline.
