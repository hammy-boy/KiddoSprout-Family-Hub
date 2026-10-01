# Wisp source package

The working Wisp application is in [`wisp/`](./wisp/). It is an email-only,
Supabase-backed messaging and WebRTC calling feature that shares the existing
KiddoSprout account service.

Do not copy credentials into this folder, paste the schema into the SQL Editor,
or enable the old phone-auth path. Start with:

- [`wisp/README.md`](./wisp/README.md) for the current project status.
- [`wisp/INTEGRATION.md`](./wisp/INTEGRATION.md) for the safe Supabase setup and
  verification sequence.

The adjacent loose files and `wisp.zip` are import sources, not the canonical
deployable application.
