# Wisp

Wisp is KiddoSprout's private one-to-one messaging and browser calling feature.
It uses the existing KiddoSprout Supabase account; it is not a separate account
system or Supabase project.

## Current features

- Email/password sign-up, login, email confirmation, and dedicated password
  recovery, all protected by the shared Cloudflare Turnstile human check.
- Wisp username enrollment without copying email or phone into public profile
  tables.
- Saved contacts, username search, and atomic one-to-one chat creation.
- Supabase-backed messages with stable history pagination, exact unread totals,
  optional read receipts, sender-only soft deletion, Unicode-aware limits, and
  tab-scoped draft recovery. Private, receive-only Broadcast hints refresh the
  chat while bounded polling keeps it useful when Realtime reconnects.
- A keyset-paginated inbox so older or quieter conversations remain reachable
  even after an account has more than 100 chats.
- Server-redacted online presence with automatic expiry, periodic refresh, and
  private profile fields available only through guarded account RPCs. Profile
  edits are validated and committed atomically by the server.
- Voice/video WebRTC calls with authenticated, private Supabase Broadcast
  signaling, immediate camera/microphone shutdown on exit, transient-network
  recovery, one-device answer selection, and database-backed call history.
- Editable profile/privacy settings plus accessible light/dark, phone, tablet,
  desktop, reduced-motion, and increased-contrast layouts. Presence expires
  accurately, date labels update at midnight, and searches announce result
  counts to assistive technology.

Every Wisp database object uses a `wisp_` name. The canonical migration history
starts with `supabase/migrations/20261001135110_create_secure_wisp_messaging.sql`
and continues with the timestamped Wisp migrations in that directory, including
the message-lifecycle migration. `database/schema.sql` is an exact review copy
of the initial migration; use `supabase db push` to apply the complete ordered
history, and never paste SQL manually into an unknown project.

## Runtime configuration

Wisp pages load KiddoSprout's generated `/supabase-config.js` and use only its
browser-safe Supabase URL, publishable key, and public Turnstile site key. The
pinned Supabase browser library is built locally at
`frontend/vendor/supabase-js-2.116.0.js`.

Never add an SMTP password, Resend API key, service-role key, `sb_secret_...`
key, database password, or access token to Wisp source. Custom email delivery is
configured server-side in the correct Supabase project's Auth settings.

## Build and local verification

Run from the KiddoSprout `Project.1` directory:

```sh
node scripts/build-wisp-client.mjs
npm run test:wisp
```

The test command first rebuilds the pinned browser bundle, then checks repository
files. It does not contact Supabase or change a database. Follow
[`INTEGRATION.md`](./INTEGRATION.md) before linking or applying migrations to a
remote project.

## Known limitations

- Messages are protected by RLS but are not end-to-end encrypted; project
  administrators can read stored message content.
- Both people need the relevant chat open to receive the current in-browser call
  signal. Background ringing/push notifications are not implemented.
- Supabase caches private-channel authorization for an open Realtime connection.
  Blocking a contact prevents new calls and messages at the database boundary,
  but an already-connected call channel must disconnect or reauthorize before
  that cached permission is recalculated.
- Message refresh hints contain no message content and are receive-only for
  browsers. Chat and inbox polling provide a fallback, but delivery is not an
  offline push-notification system.
- Only public STUN servers are configured. Strict networks may require a
  server-configured TURN service; TURN credentials must not be embedded here.
- Group chats, group calls, media attachments, and message editing are not
  implemented.
