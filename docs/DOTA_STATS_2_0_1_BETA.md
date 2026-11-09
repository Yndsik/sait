# Dota public stats — 2.0.1 beta

Audience: streamers, viewers and creator discovery. Canonical user-facing address remains https://yndsi-streamer-hub.pages.dev/ . No rename, custom-domain or auth changes.

Entry: homepage gaming idea card → Dota player stats, or Library → Dota panel. Available to guests and members. Numeric Dota account ID (uint32, 1..4294967295), not SteamID64, handle or RIVLO ID. It is a public lookup, never a verified account link. No lookup history or returned profiles are saved to workspace/localStorage. Inputs/results reset on navigation or session transition.

Source: https://api.opendota.com/api (live OpenAPI schema checked), https://docs.opendota.com/ , official implementation https://github.com/odota/core/blob/master/svc/api/spec.ts . Public GET players/{id}, players/{id}/recentMatches, heroes. Schema states keyless API usage is allowed with lower limits. No rate/quota guarantee assumed. Live heroes, players/1 and players/1/recentMatches returned HTTP200 in this environment; account1 returned zero matches. Displayed match scenarios were checked against controlled fixtures, not claimed as a real account's results.

Normalization: up to20 recent rows; win only when player_slot is valid Radiant0..4 or Dire128..132 and radiant_win boolean. GPM/XPM/K/D/A preserve missing versus0. Sample winrate excludes unknown outcomes. No exact MMR, full-history statistic, hidden-profile diagnosis or native game telemetry invented. Hero name fallback is numeric ID. Hero labels are upstream English names. Match details open official OpenDota in a new tab, not an internal full match report.

Server: same-origin Netlify function and Cloudflare alias; fixed upstream host/paths; 8sec timeout, 300KB response limit, JSON validation, no redirects, no API keys; 2min per-isolate player cache (64 entries), 1day hero cache, in-flight dedup (4 player lookups), 12requests/IP/minute bounded isolate fallback (1024 buckets), upstream429 cooldown60sec. This is not global DDoS protection or a distributed quota. Profile/match fetch failures return503; upstream429 returns429; unavailable hero dictionary falls back to heroIDs. Browser HTTP cache can retain public responses for120sec. No Supabase queries/migration.

Own addition: explain sample scope, unknown values and metric meanings; clear rate/unavailable/no-data states. No retry storm or automatic calls on load. Abort previous query and ignore stale/removed-view results.

Checks: node --test tests/dota.test.cjs; npm run check; npm test; npm run build; npm run build:cloudflare. Local browser mock: guest/member, RU/EN, 360/390/768/1440, sample winrate, escaped profile name, empty/error/rate, stale query result. Screenshot in artifacts. Physical device performance and live deployed function access not proven by these tests. No native Android APK rebuild.

Next phases: hero filters/trends, internal match report, opt-in verified Steam linking and creator discovery based on consent. Public ID lookup alone cannot establish RIVLO identity.
