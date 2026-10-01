# Wisp + KiddoSprout Supabase integration

Wisp shares the existing KiddoSprout Supabase project. It does **not** carry a
second project URL, key, SMTP password, Resend key, service-role key, or other
credential in this folder.

## Current deployment status

The correct Supabase project is not accessible through the Supabase MCP account
connected to this Codex session. The projects that MCP can currently see are
unrelated projects. For that reason, the Wisp migration must not be applied from
this session until the correct KiddoSprout Supabase account/project is connected.

The local wiring and migration can still be reviewed and tested without changing
any remote database. Do not apply it to a similarly named or unrelated project.

## How the browser configuration works

Every Wisp page loads `/supabase-config.js`. KiddoSprout generates that file at
runtime from deployment environment values:

- `SUPABASE_URL` — the correct KiddoSprout Supabase URL.
- `SUPABASE_PUBLISHABLE_KEY` — a browser-safe `sb_publishable_...` key. A legacy
  `anon` JWT can work for compatibility, but a publishable key is preferred.
- `TURNSTILE_SITE_KEY` — the public Cloudflare Turnstile site key used by the
  sign-up, login, and password-recovery forms.

Only these browser-safe values may reach `/supabase-config.js`. Never put a
service-role key, `sb_secret_...` key, SMTP password, Resend API key, database
password, or personal access token in Wisp, a committed `.env` file, GitHub
Pages, or a chat message.

Wisp uses the locally built, pinned Supabase JavaScript client at
`frontend/vendor/supabase-js-2.116.0.js`; it does not run code from an unpinned
CDN.

## Safe setup steps

1. **Select the correct project first.** Sign in to the Supabase account that
   owns KiddoSprout. Compare the project reference in the dashboard URL with the
   project reference contained in the configured `SUPABASE_URL`. Stop if they do
   not match.

2. **Connect tooling without sharing credentials.** If using the Supabase CLI,
   inspect the current commands first:

   ```sh
   npx supabase --help
   npx supabase link --help
   npx supabase db push --help
   ```

   Then authenticate in your own browser/terminal and link the repository to the
   verified project reference. Do not paste an access token or database password
   into source control or chat.

3. **Review and apply the migration.** Review
   `supabase/migrations/20261001135110_create_secure_wisp_messaging.sql`, confirm
   the linked project again, and only then run the supported `db push` flow shown
   by the current CLI help. The migration creates only `wisp_...` tables/RPCs,
   applies RLS, explicitly grants the minimum authenticated access, denies
   anonymous users, and protects private call-signaling topics. It does not add
   a trigger to every `auth.users` record.

4. **Configure email-only Auth.** In the correct Supabase project, keep Email
   auth enabled. Add both exact deployed Wisp callback URLs to the Auth redirect
   allow-list:

   ```text
   /wisp/pages/complete-profile.html
   /wisp/pages/reset-password.html
   ```

   The first finishes a confirmed sign-up and creates the Wisp username; the
   second is used only by verified password-recovery links.

   Configure KiddoSprout's verified custom SMTP sender in the Supabase dashboard
   if verification/recovery mail should come from the KiddoSprout no-reply
   address. SMTP and Resend secrets stay in Supabase's server-side settings, not
   in this repository. Wisp intentionally does not offer phone auth.

   Keep the deployment value `AUTH_EMAIL_DELIVERY_READY=false` while configuring
   SMTP. Test a real sign-up, confirmation link, password-recovery email, and
   password update with controlled inboxes. Only after every flow succeeds set
   `AUTH_EMAIL_DELIVERY_READY=true` and restart or redeploy KiddoSprout. This is
   a browser-visible rollout flag, not a credential. Set it back to `false` if
   delivery later becomes unreliable; existing-account login remains available.

5. **Enable the human check.** Configure Cloudflare Turnstile under Supabase Auth
   bot/CAPTCHA protection. Store the Turnstile secret only in Supabase. Put only
   the public site key in the KiddoSprout deployment environment. Add every real
   hosted origin to the Turnstile widget's allowed hostnames.

6. **Build the pinned browser client.** From the `Project.1` directory, run:

   ```sh
   node scripts/build-wisp-client.mjs
   ```

   Commit the deterministic vendor bundle and its source-map-free browser output
   only after the build/test diff has been reviewed.

7. **Run the read-only integration check.** This test only reads repository
   files; it does not contact Supabase or mutate a local/remote database:

   ```sh
   node scripts/test-wisp-integration.mjs
   ```

8. **Run remote smoke tests with disposable accounts.** After the migration is
   applied to the verified project, create two new email test accounts. Confirm
   email verification, login, password recovery, username enrollment, contact
   lookup, direct-chat creation, RLS isolation, live messages, blocking, and a
   private call-signaling attempt. Confirm that a signed-out client and a
   Supabase anonymous user cannot read or write Wisp data.

9. **Run Supabase advisors.** Review the Security and Performance advisors in the
   correct project after applying the migration. Resolve new findings before a
   public launch.

## Security and product boundaries

- Wisp stores message content in Supabase; it is not end-to-end encrypted yet.
- Private Realtime authorization protects WebRTC signaling. Audio/video media is
  peer-to-peer, and reliable calling across strict networks still needs a TURN
  service configured server-side.
- Public/demo builds must remain read-only and must not receive live project
  credentials.
- A browser publishable key is not a secret; RLS and narrowly scoped RPCs are the
  authorization boundary. A service-role/secret key is server-only and must
  never be exposed to a browser.
