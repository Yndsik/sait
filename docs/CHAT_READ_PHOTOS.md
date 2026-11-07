# Chat read receipts and inline photos

Outgoing messages display one check for server-confirmed sending and two checks only when the server reports that the recipient has read through that message ID. This does not claim device delivery. Boundaries are compared as BigInt strings, never invented from online presence, and stale responses cannot update another conversation. The existing unread counters remain in use. Read positions are submitted only for the active visible chat at the bottom of its message list, with no modal/sidebar overlay, and when the document has focus.

## Required database setup for peer read receipts

Run `supabase/migrations/202611070011_chat_read_receipts.sql` in Supabase SQL Editor after the friends/chat and notifications migrations (001 and 005). It adds one narrow read-only authenticated RPC, gated by confirmed membership and an accepted friendship. It returns only the recipient's read boundary for the requesting user's conversation. Table policies and direct table privileges are not broadened. Blocking/removing the friend denies access. No migration was executed automatically in this development session.

Until the RPC is installed, messages remain labelled Sent; they are never falsely labelled Read. After applying the SQL, refresh the site/app. Test with two real accounts that a background/closed/scrolled-up chat does not advance the read boundary, an active bottom-of-chat view does, and blocked/non-friends cannot access receipts. Automated tests use controlled server responses; live two-account verification remains necessary.

## Photos

Photos are rendered directly in the conversation once near the visible viewport. IntersectionObserver controls requesting private signed URLs and image bytes; URLs expire after 120 seconds and are kept only in a bounded in-memory cache. They are not placed in public storage or persisted to browser storage. Automatic image load failures show a tap-to-retry placeholder. Tapping a loaded photo opens a larger dialog. Switching account/chat prevents late image responses from painting another conversation.

Voice/video recording and playback remain on their existing controls. Actual Android device installation, camera/microphone and Cloudflare/Turnstile WebView behaviour need device verification; Android 1.1 itself was verified for matching signature, package version and new HTTPS host.
