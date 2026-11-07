# Profile covers

Profiles have a stable generated background derived from their permanent public ID, eight selectable styles, a Random background button and an optional uploaded cover. A generated choice does not change on reload. Custom images are selected only in profile settings, cropped to 3:1, reduced to 1200×400 and encoded as a raster data URL with a 360,000-character cap. SVGs and external image URLs are rejected. Uploads enforce an 8-MiB file limit and 40-million-pixel decoded-image limit, and discard results after account changes or cancellation. Save/Cancel govern persistence; no nickname, avatar or ID mutation is required to change a cover.

The existing private workspace stores cover/coverImage with the rest of the profile. Existing cover presets remain compatible. Own-profile previews work without a new database function.

## To display custom covers to other members

Run `supabase/migrations/202611070010_profile_covers.sql` in the project's Supabase SQL Editor. It creates a narrow read-only authenticated RPC; the function first applies existing social-profile membership/block rules and returns only validated cover fields. It never exposes the workspace, timezone, notes, games or tasks, and does not broaden table policies. The standard generated cover remains a fallback if this RPC is not installed or the profile cannot be read.

The application labels cover images as visible to other members before saving. Nickname and avatar privacy rules are unchanged. Test an allowed member and a blocked member in the actual database after applying the migration. The migration has not been executed by this development session.

## Publication

The owner's latest Netlify screenshot marks the guest-view production build Skipped and an older build Published. Merging source does not prove publication. In Netlify Deploys, open the newest main build and retry with the latest branch commit; if skipped again, inspect the deploy log's stated reason. Publish the successful newest build, and check that guest-ui.js and profile-covers.js are available on the main URL. No Netlify dashboard credential is available in this session.
