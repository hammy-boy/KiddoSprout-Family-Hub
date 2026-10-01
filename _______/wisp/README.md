# Wisp

Wisp is KiddoSprout's private one-to-one messaging and browser calling feature.
It uses the existing KiddoSprout Supabase account; it is not a separate account
system or Supabase project.

## Current features

- Email/password sign-up, login, email confirmation, and dedicated password
  recovery, all protected by the shared Cloudflare Turnstile human check.
- Wisp username enrollment without copying email or phone into public profile
  tables.
- Username search and atomic one-to-one chat creation.
- Supabase-backed messages with live Postgres Changes updates.
- Voice/video WebRTC calls with authenticated, private Supabase Broadcast
  signaling and database-backed call history.
- Light/dark theme and responsive browser pages.

Every Wisp database object uses a `wisp_` name. The canonical migration is
`supabase/migrations/20261001135110_create_secure_wisp_messaging.sql` in the
KiddoSprout repository. `database/schema.sql` is an exact review copy; do not
paste it manually into an unknown project.

## Runtime configuration

Wisp pages load KiddoSprout's generated `/supabase-config.js` and use only its
browser-safe Supabase URL, publishable key, and public Turnstile site key. The
pinned Supabase browser library is built locally at
`frontend/vendor/supabase-js-2.116.0.js`.

Never add an SMTP password, Resend API key, service-role key, `sb_secret_...`
key, database password, or access token to Wisp source. Custom email delivery is
configured server-side in the correct Supabase project's Auth settings.

## Build and read-only verification

Run from the KiddoSprout `Project.1` directory:

```sh
node scripts/build-wisp-client.mjs
node scripts/test-wisp-integration.mjs
```

The integration test reads repository files only. It does not contact Supabase
or change a database. Follow [`INTEGRATION.md`](./INTEGRATION.md) before linking
or applying the migration to a remote project.

## Known limitations

- Messages are protected by RLS but are not end-to-end encrypted; project
  administrators can read stored message content.
- Both people need the relevant chat open to receive the current in-browser call
  signal. Background ringing/push notifications are not implemented.
- Only public STUN servers are configured. Strict networks may require a
  server-configured TURN service; TURN credentials must not be embedded here.
- Group chats, group calls, media attachments, and message editing/deletion are
  not implemented.
