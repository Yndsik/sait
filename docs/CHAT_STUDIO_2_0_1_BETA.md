# Chat studio — 2.0.1 beta

Presentation-only update: calmer conversation surfaces, compact grouped bubbles, local-time timestamps, attachment styling, responsive composer and conversation rows. Existing theme colors, actual presence, receipts, media loading and send flows remain in place. No dependencies, auth, routing or SQL changes.

Additional feature: unread divider captures the existing notification count before opening the conversation. It uses the incoming rows already returned for that peer; if the unread boundary predates loaded history, it waits for older history rather than guessing. The boundary remains for that opening and clears on a different open or session reset. No read receipts are manufactured or delayed. Counts have no server-provided exact boundary ID, so incoming messages concurrent with opening may affect count-based placement.

Conversation times are shown only for messages loaded in this session, and cleared on session reset. No additional messages or timestamps are persisted locally.

Verify: widths 360, 390, 768 and 1440; replies and quote jumps; long text; unread divider with known incoming count; media capture/preview/send/discard; reduce-motion and calm settings; RU/EN. Existing screenshot and local mocked browser regression cover the composer and basic timeline. Roll back by reverting this commit; user data is unaffected.
