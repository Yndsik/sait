# Cloudflare Pages migration — YNDSI

Prepared against Cloudflare documentation checked 2026-11-07. This is a second hosting target for the same GitHub repository and Supabase project. It does not delete the existing Netlify site or migrate accounts to another database.

## Create the project in your account

1. Open https://dash.cloudflare.com → Workers & Pages → Create application → Pages → Connect to Git.
2. Connect GitHub and authorize only `Yndsik/sait` if you want the narrowest repository access.
3. Choose repository `sait` and production branch `main`.
4. Project name: `yndsi-streamer-hub` (must match `wrangler.jsonc`). If unavailable, change the Wrangler `name` and project name together before deployment.
5. Framework preset: None. Build command: `npm run build:cloudflare`. Output directory: `dist`. Root directory: repository root / leave blank.
6. Add build variable `NODE_VERSION=22` (or a supported newer Node version). Keep dev dependencies enabled: esbuild bundles the Worker during build.
7. Save and Deploy. The repository's Wrangler file sets `nodejs_compat` with a fixed compatibility date, the public Supabase bindings, and the existing public Turnstile Site Key. These are public client configuration, not a service-role key. No Supabase service-role secret is needed or allowed in the frontend build.
8. If Netlify has `STEAM_SHARED_RATE_LIMIT=true` or `OWNER_USER_ID` configured for its server functions, carry those settings into the Cloudflare runtime too. Keep the shared quota enabled if it was previously enabled; its SQL migration must already exist. Never copy any service-role key into public Wrangler configuration.
9. Copy the exact production `https://….pages.dev` URL Cloudflare returns. A project has not been created or deployed by this development session: account access and Git authorization are owner actions.

Do not choose only a static HTML drag-and-drop deployment: this project also needs its bundled Worker. If the dashboard offers Workers first, explicitly select Pages and Git integration.

## Before users sign in on the new address

- Cloudflare → Turnstile → existing widget → Hostname Management: add the exact production `….pages.dev` hostname without protocol/path. Keep the existing Netlify hostname. Do not rotate the secret just to add a hostname; the matching secret stays in Supabase CAPTCHA settings. Avoid enabling arbitrary preview hostnames for production auth.
- Supabase → Authentication → URL Configuration: set Site URL to the new production HTTPS origin, and add its root URL and `https://….pages.dev/**` to Redirect URLs. Keep the old Netlify redirects while it remains in use. The exact host wildcard is intentional; do not allow every `*.pages.dev` tenant.
- Test confirmation email links and password recovery using fresh emails. Default link-based templates remain supported. Custom SMTP/code emails are a separate setup and are not required for the move.
- Confirm realtime, private media, profile updates, public schedule links, Steam search and news on the deployed hostname. Local tests use mocked authentication and upstream responses; actual Cloudflare network access to publishers/Steam and live email delivery remain deployment acceptance checks.
- Apply the existing optional profile-cover SQL migration `supabase/migrations/202611070010_profile_covers.sql` if custom covers should be visible to other members. Hosting migration itself does not run SQL.

Accounts, messages, IDs, shared schedules and cloud-synced workspace data stay in the existing Supabase project. A new origin has separate browser storage, so users sign in again. Any unsynced local work should first be exported/synced from the old origin; it is not copied automatically. Existing Netlify schedule links continue to use the old site until users share new links.

## Android and installed web apps

The current downloadable APK is version 1.1 and points at `https://yndsi-streamer-hub.pages.dev`. It was signed with the same certificate as 1.0 and can update that app in place. A new sign-in may be needed because the website origin changed; cloud data stays in the same account. See ANDROID_APK.md for verification and device-test limits. Existing installed PWA shortcuts still keep the old origin; install a new shortcut from the Cloudflare URL.

## Architecture

`npm run build:cloudflare` runs the existing allowlist build, emits a bundled module `_worker.js`, generates static `_headers` from the established Netlify policy, and adds a real 404 page. `_routes.json` invokes the Worker only for `/api/*` and the existing `/.netlify/functions/*` API URLs, keeping normal assets on static hosting. The old frontend URLs remain compatible. Unknown APIs return JSON 404s.

The Steam handler receives environment bindings explicitly, never mutating shared `process.env`. Authorization is still verified through Supabase and the optional shared quota still fails closed. News is public, bounded and cached; successful responses can use Cloudflare Cache API. Static security headers, camera/mic policy and APK download headers are preserved. The runtime test uses real workerd with controlled upstream responses, including Node crypto/buffer compatibility.

## Limits and operations

The Free plan currently documents 500 Pages builds/month, a 25-MiB per-file limit and 100,000 daily Functions requests shared with Workers. The current 3.9-MiB APK fits. Static routes are excluded from Function execution. This is a free tier with quotas and CPU/network limits, not an unlimited hosting guarantee. Check the dashboard usage, production upstream availability and cold-cache CPU behaviour before directing all users there. The existing Supabase and email provider limits continue to apply.

- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/functions/advanced-mode/
- https://developers.cloudflare.com/pages/functions/routing/
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/platform/limits/

## Local verification

`npm ci` → `npm test` → `npm run check` → `npm run build:cloudflare`.

`npm run preview:cloudflare` starts Wrangler Pages locally at http://127.0.0.1:8791. Real CAPTCHA is restricted to configured hostnames; use a test widget in a separate local-only environment rather than weakening production. Local workerd outbound requests in this managed environment timed out; real upstream access will be tested after the first owner-authorized Cloudflare deployment.
