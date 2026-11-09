# RIVLO / YNDSI: research and first delivery

Date: 2026-11-09. Scope: current repository and public official pages, not authenticated competitor accounts. The research reader could not open either supplied Netlify URL or current Cloudflare URL. Existing application verified locally. Public pages provide structure/text; hover, parallax, particles, scroll animations and private dashboards were not visually verified. Do not present them as observed facts. Retention below is a product hypothesis, not measured causal evidence.

## Current state
Vanilla HTML/CSS/JS, Supabase Auth and workspace, Netlify functions and compatible Cloudflare build. Existing landing/local draft, schedule/public share, profiles, chat/photos/voice/video, game library, Steam news, effects preferences, Android APK. No verified native game telemetry, donation processor, automatic clips or OBS browser-source widgets in the shipped first-delivery modules. Separate Stream Hub WIP is unintegrated and not part of this change.

## Seven comparisons
| Service and official source | Confirmed capability absent here | Public structure / dashboard evidence | Motion evidence | Likely return trigger (hypothesis) |
|---|---|---|---|---|
| [StreamElements](https://streamelements.com/) | Chatbot, overlay editor, tipping, supporter leaderboard | Benefit-led hero, feature/resource navigation, preview and creator endorsement blocks | Animated stream alerts/overlays explicitly offered; webpage hover/scroll not verified | Reuse overlay, moderation and income workflow |
| [Streamlabs](https://streamlabs.com/ultra) | Multistream, scene automations, broadcast widgets | Product-led hero and preview; feature navigation; comparison of plans | Reactive overlays explicitly offered; website motion not verified | Daily broadcast tools and reusable presets |
| [Twitch Creator Dashboard](https://blog.twitch.tv/en/2019/12/04/everything-to-know-about-the-new-creator-dashboard/) | Provider-connected stream quick actions and live stats | Official dashboard introduction documents resize/popout/rearrange panels; current authenticated UI not inspected | Drag/resize interaction documented; animation timing not verified | Manage a live broadcast and review its state |
| [Linktree](https://linktr.ee/) | Broad link-in-bio commerce and click analytics | URL-entry hero, profile editor preview, analysis section and CTA | No visual animation verified | Maintain one audience destination and review link performance |
| [Leetify](https://leetify.com/) | Automatic CS reports and skill feedback | Report-led hero, tools menu, match result/achievement/table previews | Website animation not verified; example typing label is not proof of real interaction | Match feedback, personal bests and comparison with friends |
| [Dotabuff](https://www.dotabuff.com/) | Dota match/hero statistics and trends | Search-first utility header; heroes/items/players/matches navigation; articles and stat categories | No visual animation verified | Look up match results, heroes and trends |
| [Overwolf](https://www.overwolf.com/browse-by-game/view-all) | Desktop game-event overlays and capture apps | Search, game/category filters, app catalogue | Native overlay capability documented; storefront motion not verified | Repeated in-game utility rather than visual novelty |

## Idea → source → effort/value
Scale 1 low, 3 high. Estimates for this codebase, not measured results.

| Idea | Inspiration | Effort | Value | Decision |
|---|---|---:|---:|---|
| Homepage preparation workbench | Twitch quick actions | 1 | 3 | Delivered |
| Announcement generator + copy fallback | Own workflow idea, Linktree share-first principle | 1 | 3 | Delivered |
| Game-specific practice challenges | Overwolf game categories / own content | 1 | 2 | Delivered |
| Honest unknown live state | Twitch real provider state | 1 | 3 | Delivered |
| Verified live widget with cached server request | Twitch API | 2 | 3 | Next: inspect configured API credentials |
| Social/donation links in public creator profile | Linktree / StreamElements | 2 | 3 | Next: URL validation and privacy; links only initially |
| Clip URL collection tied to stream | Leetify highlight workflow | 2 | 3 | Next: complete existing Stream entity work |
| Public Dota statistics | Dotabuff, OpenDota | 2 | 2 | Later: opt-in identifier, quotas, empty/private data states |
| CS practice reaction game | Gaming tools pattern | 2 | 2 | Later: local results, no claim of measuring game skill |
| OBS overlays/chat widgets | StreamElements / Streamlabs | 3 | 2 | Later: separate safe public widget URLs and CSP |
| Viewer polls and genuine leaderboards | StreamElements | 3 | 2 | Later: backend permissions and anti-abuse |
| Paid donations and automatic multistream | Streamlabs | 3 | 1 | Defer: payment/stream infrastructure beyond this frontend |

## Delivery and design rationale
Keep current dark theme and seven palettes. Bordered solid surfaces with restrained radial tint preserve mobile text readability; do not add full-screen glass blur or perpetual particle canvas. Existing AURA provides appearance and pointer feedback, Radiance provides optional palette-aware atmosphere. New tool icons have a short transform/opacity entrance, disabled by reduced-motion, calm and motion-off. No perpetual JS rendering loop or new dependency. No promise of 60 FPS without profiling on representative phones.

First three work items: homepage tools presentation; local announcement generator; Dota/CS practice ideas. No API calls, automatic social posting, donations, game stats or online leaderboards added. Form data stays in page memory and resets on navigation; it is not stored/synced. Existing next-stream title/game may prefill for a signed-in owner. Date/time is entered using this device; generated text explicitly includes its time zone. DST ambiguity remains native datetime-local behavior; review text before sharing.

SEO: static description and Open Graph tags added; existing own PNG reused, no new image weight. Absolute OG image currently points to published Cloudflare domain. Netlify build remains npm run build, publish dist; Cloudflare build remains npm run build:cloudflare. Migration to a different canonical public domain should update OG image host after confirming that host is deployed. No canonical URL forced while owner has supplied two hosts.

## Check
node --test tests/creator-tools.test.cjs; npm run check; npm run build; npm run build:cloudflare. Local mocked Chromium: guest/member, title/game/provider URL, both game modes, RU/EN, widths 360/390/768/1440, honest live-state label. Existing all-section AURA regression and full test suite should remain passing. Actual Telegram scraper cache and frame-rate on physical Android/iPhone not measured. Existing APK not rebuilt in this delivery.

## Three direction questions
1. Main audience: streamers planning broadcasts, or viewers finding creators?
2. Next game tool: Dota hero/role helper or CS practice/reaction tool?
3. Canonical public domain: keep Cloudflare or return to Netlify? Both build configurations remain available.
