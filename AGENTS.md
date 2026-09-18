# KiddoSprout agent instructions

Before changing this repository, read `CODEX_HANDOFF.md` for the current project state and the user's established requirements.

- Never commit `.env`, passwords, SMTP credentials, Supabase secret/service-role keys, Cloudflare API tokens, or other private credentials.
- `supabase-config.js` may contain only browser-safe public settings: the Supabase URL, a publishable key, and a Turnstile site key.
- Keep the colleague-facing public build in demo-only mode until production authentication, email delivery, Turnstile, and database security have been configured and verified.
- Preserve unrelated user changes. Do not reset or discard a dirty worktree.
- Run the relevant targeted tests after a change and run `npm test` before a release when practical.

