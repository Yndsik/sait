# Gaming radar

Home has illustrated editorial news and a separate Steam game feed. Sources are fixed server-side: PlayGround with 3DNews games fallback for Russian, PC Gamer for English, and Steam app feeds for Dota 2 (570), Counter-Strike 2 (730), Apex Legends (1172470) and PUBG (578080). The language preference selects Russian/English Steam feeds; publishers may still provide some posts in English.

`/.netlify/functions/news?lang=ru&mode=updates&game=cs2` accepts only enumerated languages, modes and game IDs. Upstream requests have five-second timeouts, two-MiB response limits, no forwarded user credentials, a coalesced request per cache key and five-minute caches. A failed game feed does not discard successful feeds. Errors and partial availability are visible; no news is invented.

Article images come from feed enclosure, media metadata or the first content image. Only HTTPS image URLs are returned; no user-supplied image proxy is introduced. Images load lazily with no referrer. Broken images show a decorative fallback. Steam posts without an article image use the game's Steam header and explicitly say Game artwork. Source HTML is never rendered as HTML in the browser.

Update/announcement labels are title-based hints, not claims that every post is a major patch. The UI tells readers to inspect the post for its scope. The original source and publication date remain visible; links open the publisher's page.

Automated tests cover safe images, encoded summaries, fallback artwork, cache isolation and partial upstream failures. Browser checks use captured real feeds with a mocked authenticated account; live endpoint checks after deployment verify actual Netlify access.
