# Email codes in Supabase

The website verifies registration with `verifyOtp({email, token, type: "signup"})` and password recovery with type `recovery`. Successful verification opens the returned session. Recovery opens only the new-password form until the password is saved.

## Required dashboard configuration

1. Supabase → Authentication → Sign In / Providers → Email: keep email confirmations enabled.
2. Authentication → Email Templates → Confirm signup: paste `email-templates/confirm-signup.html`.
3. Reset password: paste `email-templates/reset-password.html`. Preserve the literal `{{ .Token }}` placeholder. Save both templates.
4. URL Configuration: Site URL `https://reliable-unicorn-7ce032.netlify.app`; allow the same origin and `https://reliable-unicorn-7ce032.netlify.app/?recovery=1` as redirect URLs. Keep existing required URLs.
5. Keep the configured Turnstile provider and secret. No new public or secret keys are required by this update.
6. Check SMTP delivery/rate limits for public users; the built-in Supabase sender may restrict recipients. Use your SMTP provider when required.

## Acceptance check

Register with an email you control, enter the received code, confirm automatic login and profile setup. Log out, use Forgot password, enter a fresh recovery code and matching new passwords. Confirm the old password fails. Never send passwords, tokens, or email codes to support.

Remember me checked persists the session locally. Unchecked stores it only for the current browser tab session; the browser may restore tabs after a restart. Passwords are never stored by the application.

Automated tests mock the email provider; actual SMTP delivery and dashboard settings must be verified by the project owner. Default confirmation links remain supported, but templates must be updated to send codes.
