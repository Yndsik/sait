# Dedicated Dota workspace — 2.0.1 beta

Adds one public page `dota` using existing in-memory routing for guests/members. Static nav button after Library; homepage shortcut now opens Dota. Library no longer embeds statistics. No auth/schema/API changes. Same pages.dev domain; no APK rebuild.

Search UX accepts uint32 Dota ID, SteamID64 or HTTPS numeric Steam /profiles/, OpenDota /players/, Dotabuff /players/ links. Steam64 conversion uses BigInt minus76561197960265728, bounded uint32. Vanity /id/ Steam URLs and arbitrary player names are explicitly unsupported. This is a public lookup, not linked-account verification. Help distinguishes RIVLO identity from game identity. No local storage/history added.

Design borrows information hierarchy (player → sample summary → heroes → match history), not Dotabuff assets or branding. Adds responsive Dota hero, icon-labelled search, metric cards, top5 heroes in loaded matches and outcome markers. Hero names remain upstream labels; no artwork claimed. Heroes and headline metrics refer to the entire loaded sample (up to20), not lifetime or current filtered subset. Own addition: win/loss and hero substring filters, zero-result state, focus/caret retained while typing. All name output escaped.

Tests: ID/link conversion and malicious-host rejection, exact Steam64 math, filtered sample and unknown outcomes. Local browser: dedicated public route, absence from Library, sidebar button, Steam link lookup, hero/outcome filters, RU/EN, 360–1440, guest/member, no data/error/rate/stale lookup. Full suite, syntax and both builds. Real external APIs unchanged from PR41; current tests use fixtures for UI.

Rollback: revert this commit; no stored user data affected. The older docs/DOTA_STATS_2_0_1_BETA.md describes initial placement in Library, superseded by this document.
