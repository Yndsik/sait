# Profile Studio — RIVLO 2.0.0

The colour studio now offers seven browser-local, account-separated accents: cobalt, ember, mint, orchid, rose, arctic and gold. Existing choices remain valid.

Own profiles use a larger cover and identity card, real counters, favourite-first game shelf with sanitized covers, and a direct profile-preview action. This private game shelf and unpublished streams are not sent to other users.

Member, handle-link and Twitch profile dialogs use the same showcase design. Overview presents the next server-published stream and existing subscriber information; a separate Schedule view shows only entries returned by the existing public-schedule functions. No new database access or privacy defaults are introduced. Failed/hidden profiles keep their existing error states. A request serial prevents an older profile lookup from replacing a newer one.

Own and visible public avatar/cover photos can be enlarged using mouse, touch or keyboard. Only the already-sanitized embedded PNG/JPEG/WebP image is shown. No remote image request or local private profile lookup is added. Session changes close the photo viewer.

Android 2.0.0 (code 3) uses the existing app ID and signing identity. Installed name/icon are RIVLO. The download manifest records the exact APK hash, size and signer. Native camera and microphone still need testing on a physical Android phone; no native push was added.

Validation: project tests and Cloudflare build; local Chromium checks for all seven accents, profile editing/saving, public schedule privacy, latest-request ordering, avatar/cover expansion, 320–1440px and reduced motion. Native assembleDebug, apksigner signature equality with 1.1, aapt package/name/SDK inspection, and packaged Capacitor HTTPS configuration checks.
