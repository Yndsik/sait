# Guest view

Anonymous visitors land on a public Home without a forced authentication dialog. Gaming news and Steam update filters use the existing public, cached news endpoint. Library and schedule routes show curated, explicitly labelled previews; they do not query or display member workspaces. General guest settings support language, theme and motion under the existing guest preference key.

Friends, messages, profile/privacy and creation actions prompt authentication. The dialog can be dismissed through Continue without signing in, Escape or the backdrop. Normal authenticated routing and first-profile onboarding remain in place. Signing out clears the current workspace through the existing session handler, then renders the guest view and removes previous profile identity from the header/sidebar.

No database permissions were broadened. Workspace, Steam search, social and media authorization remain server-side. Guest UI visibility is not an authorization boundary. The guest renderer never loads a previous user's cached workspace to make a preview.

Verification: full automated suite, syntax and production build checks. Playwright exercised fresh anonymous entry, public news/game updates, library and schedule previews, private-route and creation gates, dialog dismissal, English, reload, login and logout. The mocked provider received no private RPC or workspace writes during guest exploration.
