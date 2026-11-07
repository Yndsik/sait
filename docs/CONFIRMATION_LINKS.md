# Email confirmation links

The deployed UI defaults to link-based emails, matching Supabase's built-in sender. Registration explains that users should open the email link, check Spam and then sign in. It does not imply that creating another account is required. Resending requires a fresh CAPTCHA and a 60-second client cooldown; Supabase's server limits remain authoritative. Unconfirmed-email sign-in failures expose the resend screen.

The website handles error callbacks without claiming confirmation succeeded. Valid signup callbacks open the returned Supabase session, then show a success message. Error parameters and signup tokens are removed from the address bar after SDK processing. Password reset emails use links by default too.

In Supabase Authentication → URL Configuration verify Site URL is `https://reliable-unicorn-7ce032.netlify.app` and the intended production redirect is allowed. A link pointing to localhost, a removed preview or an incorrect domain must be fixed in that dashboard; website code cannot repair a redirect that never reaches it. Expired and consumed links should be replaced using the resend action. Do not disable email confirmation to bypass an error.

Code email mode is retained only as an explicit future configuration (`YNDSI_AUTH_CONFIG.emailCodeEnabled === true`) after custom SMTP and token email templates are configured. Merely changing an email template does not enable code mode.

Tests use a mocked Supabase provider; actual email delivery and provider-side redirects must be checked by the project owner using the text and domain of the error. Never share complete callback links, codes or tokens.
