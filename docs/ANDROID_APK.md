# RIVLO Android test APK — 2.0.0

Current APK: `/downloads/yndsi-android-test-2.0.0.apk`. It opens `https://yndsi-streamer-hub.pages.dev` over HTTPS. Version name 2.0.0, version code 3, application ID `app.yndsi.hub`, Android 7.0+ (API 24), target SDK 36. Exact byte size, SHA-256 and signing-certificate digest are recorded in `downloads/android.json`; the website build verifies the artifact before publishing.

The installed name and launcher icon are now RIVLO. The 2.0.0 build uses the same application ID and signing certificate as 1.1, verified against the actual previous APK using apksigner. Install it over the existing app; uninstalling is not required. Browser/WebView storage belongs to each origin, so switching Netlify to Cloudflare may require signing in again. The Supabase account and cloud-synced data remain the same. Unsynced local-only work on the old origin is not automatically migrated; sync/export it first if applicable.

## Installation

Open `/android.html` or download the APK from the public website. Permit installation from your chosen browser/file manager if Android requests it, then install the update. This is a test debug build outside Google Play; no store purchase is required. Camera and microphone permissions are requested when recording. Geolocation is not requested. Android System WebView/Chrome should be current.

## Build and verification

Node 22+, JDK 21, Android SDK platform 36, Build Tools 35/36. `npm ci` then `npm run mobile:build` (or use Gradle 8.14.3 explicitly). Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Do not create a new signing key for an update to an installed app. Keep the existing keystore private and backed up; never commit it. Private key material is not included in the repository or website assets.

For 2.0.0, assembleDebug passed, apksigner verified APK v2 and identical signer digests between 1.1 and 2.0.0, and aapt confirmed package/version/minimum/target SDK values. The packaged capacitor.config.json and offline asset were checked for the existing Cloudflare origin and exact allowNavigation host. Cleartext, mixed content, WebView debugging and Android backups remain disabled.

## Limits

This is a Capacitor remote-site prototype. It requires an internet connection for account data and messages. Native push and full offline private-data support are not implemented. Actual installation, Cloudflare/Turnstile behaviour in Android WebView, camera/microphone, keyboard and device navigation need physical Android testing; this development session has no Android phone. Confirmation links may open the browser; return to the app and sign in after confirmation.

Cloudflare must finish its Git deployment before the public link serves the new APK. The old Netlify site is a separate, credit-paused deployment and may still advertise 1.0. Existing PWA shortcuts also keep their old origin; add a new shortcut from the Cloudflare site if you use a web app instead of the APK.
