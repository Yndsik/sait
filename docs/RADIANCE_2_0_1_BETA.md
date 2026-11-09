# Radiance — 2.0.1 beta

Palette-aware static background glow, dimensional hero/card surfaces, primary button highlight, desktop hover lift. Respects existing seven accent palettes, calm/expressive and motion-off/reduced-motion controls. No animated backdrop or blur. Mobile uses scrolling background and no hover lift.

Own addition: Glow / No glow appearance option under Settings. Defaults to Glow, stores only that preference per account/device; account change re-reads preference. Both RU and EN supported. No database/auth/route/dependency changes. Reverting these assets restores previous presentation without affecting user data.

Checks: local browser all 16 sections at 360/390/768/1440, motion settings, touch exclusion, glow off/persistence and English settings; JS syntax and Cloudflare build.
