# KiddoSprout handoff for Claude

Read this file before changing the project. It is the short operational guide for
KiddoSprout; `README.md` contains the longer setup and security notes.

## What KiddoSprout is

KiddoSprout is a parent-controlled family hub. It includes:

- parent and child views, approvals, requests, routines, and family state;
- a Homeschool Hub, Learning World, language lessons, stories, and educational games;
- a separate section for ordinary arcade games that need parent approval;
- FlavorNest recipes and Smart Spending;
- secure family calls between paired family accounts;
- downloadable current-user Mac and Windows game blockers;
- Sprout Tutor, a genuine AI learning assistant when its Cloudflare Worker and
  parent-account backend are deployed.

The public colleague link is intentionally a fictional-data demo. Do not turn a
demo control into a fake live control or claim that a protected feature works
when its backend is absent.

## Current handoff snapshot

Handoff date: 27 September 2026.

- Repository: `hammy-boy/KiddoSprout-Family-Hub`
- Branch: `main`
- Commit when this file was started: `648a459`
- Permanent colleague demo:
  <https://hammy-boy.github.io/KiddoSprout-Family-Hub/>
- The GitHub Pages deployment for that commit was verified successful in
  [Actions run 36267326621](https://github.com/hammy-boy/KiddoSprout-Family-Hub/actions/runs/36267326621),
  and the live URL returned HTTP 200.
- Docker is currently off. That does **not** affect the GitHub Pages demo.
- No live Sprout Tutor Worker URL is currently verified. An old
  `kiddosprout.ginger-tuberose.workers.dev` address must not be reused or
  advertised; it no longer resolves.
- The configured managed Supabase Auth endpoint is reachable, but the checked-in
  recipes, family-state, family-call, and tutor database migrations have not all
  been applied to that hosted project. Recheck before relying on hosted data.
- Hosted email is not ready. Keep `AUTH_EMAIL_DELIVERY_READY=false` until real
  signup, resend, confirmation, login, and recovery messages have all arrived
  and worked.
- `.env.production` is absent, so a first Cloudflare Worker deployment is not
  ready yet.

Treat this snapshot as evidence, not eternal truth. Re-run the checks after a
different person or assistant pushes or changes an external dashboard.

## The architecture in one picture

```text
GitHub repository (source)
        |
        +--> GitHub Actions --> reviewed static bundle --> GitHub Pages
        |                                           (fictional demo, always on)
        |
        +--> local Docker + local Supabase CLI stack
        |       |        |         |          |
        |     nginx   voice API  bank API  blocker API
        |                                           (full local development)
        |
        +--> Cloudflare Worker + Workers AI + Durable Object
        |                         |
        |                  Sprout Tutor conversations
        |                         |
        +-------------------- Supabase Auth/Postgres
                                  |
                           Resend SMTP email
```

These are separate deployment modes. Do not make GitHub Pages call
`127.0.0.1`, and do not tell people to keep the owner's Docker Desktop running
to use the permanent demo.

## What runs where

| Mode | Purpose | Requires Docker? | Real private data? |
| --- | --- | ---: | ---: |
| GitHub Pages | Permanent colleague tour | No | No; tab-only fictional data |
| Local stack at `127.0.0.1:8001` | Full development and protected local APIs | Yes | Local test data only |
| Cloudflare Quick Tunnel | Temporary isolated colleague preview | Yes | No; fictional demo only |
| Cloudflare Worker | Hosted account UI and real Sprout Tutor | No after deploy | Yes, only after secure setup |
| Managed Supabase | Hosted Auth, Postgres, RLS, and Realtime | No | Yes |

GitHub Pages cannot host Node APIs, Docker services, Supabase itself, private
downloads, or server secrets. Its disabled protected controls are deliberate.

## Repository map

- Main browser source: root HTML, CSS, and JavaScript files.
- Games: `games/`. Public games must also be added to the explicit allow-list in
  `scripts/build-public-demo.mjs`.
- Chess source used by the Pages inclusion step:
  `public-site/games/chess-academy/`. Inspect
  `scripts/include-chess-academy.mjs` before changing its publication path.
- Public builder: `scripts/build-public-demo.mjs`.
- Exact public-artifact guard: `scripts/audit-public-artifact.mjs`.
- Generated public output: `.cloudflare/public-demo/`. Never hand-edit or
  commit it.
- `public-site/` contains a checked-in publication/chess source tree; it is not
  a place to store secrets. Do not assume every duplicated root file there is
  canonical—follow the build scripts.
- Local reverse proxy: `nginx.default.conf`.
- Private local APIs: `server/voice-api.mjs`, `server/bank-api.mjs`, and
  `server/blocker-api.mjs`.
- Local containers: `docker-compose.yml`; isolated temporary public overlay:
  `docker-compose.public.yml`.
- Supabase configuration: `supabase/config.toml`.
- Database source of truth: `supabase/migrations/`.
- Database policy tests: `supabase/tests/`.
- Auth email templates: `supabase/templates/`.
- Sprout Tutor browser code: `sprout-tutor.html`, `sprout-tutor.js`,
  `sprout-tutor.css`, and `sprout-tutor-config.js`.
- Sprout Tutor Worker: `src/sprout-tutor-worker.mjs` and `wrangler.jsonc`.
- GitHub Pages deployment: `.github/workflows/pages.yml`.
- Mac blocker: `mac-blocker/`; Windows blocker: `windows-blocker/`.
- Environment-variable examples and comments: `.env.example`.

## First steps in a fresh checkout

Use Node 22, Docker Desktop, and the Supabase CLI version pinned by the project.

```sh
npm ci
```

If `.env` does not exist, create it from `.env.example` and immediately protect
it. Never overwrite an existing `.env` just to start the app.

```sh
cp .env.example .env
chmod 600 .env
```

At least one complete local parent sign-in route is required: either
`GOOGLE_OAUTH_CLIENT_ID` plus `GOOGLE_OAUTH_CLIENT_SECRET`, or all five SMTP
settings. `npm run check:email` checks only the SMTP route, so run it only when
using SMTP. Then start the stack:

```sh
# SMTP route only:
npm run check:email

# Either complete route:
npm run dev
```

Open:

- KiddoSprout: <http://127.0.0.1:8001>
- local Supabase Studio: <http://127.0.0.1:54323>

Stop without deleting the local database:

```sh
npm run dev:stop
```

Rebuild the local database from checked-in migrations:

```sh
npm run supabase:reset
```

`kiddosprout_python.py` is a restricted legacy static preview. It does not run
accounts, email, banking, voice, calls, or blocker APIs. Use `npm run dev` for
full local work.

## Git and GitHub Pages workflow

Before editing, check both local and remote state because another assistant may
have pushed:

```sh
git status -sb
git fetch origin
git log --oneline --decorate -5 --all
```

Preserve unrelated user changes. Never force-push or use a destructive reset.
For each coherent change:

1. Edit source files, not `.cloudflare/public-demo/`.
2. Add or update a regression test.
3. Run the smallest relevant test, then broader release checks when warranted.
4. Run `git diff --check` and inspect `git diff`.
5. Commit with a clear message and push `main` if the user asked for the change
   to go live. The owner's standing preference has been to push each completed,
   verified change.
6. Confirm the **Deploy safe KiddoSprout demo** Actions run is green before
   saying the public link updated.

The Pages workflow builds and audits `.cloudflare/public-demo`, then uploads
only that directory. It must never upload `.env`, Supabase migrations, server
source, installers, credentials, or the whole repository.

GitHub Pages setup, if it ever returns a 404:

- Repository **Settings → Pages**
- **Build and deployment → Source: GitHub Actions**
- Check the Actions run and use the exact case-sensitive project URL shown
  above.

The app is a PWA. A visitor can briefly see an older cached version after a
deployment. Preserve the update-ready flow, update the service-worker cache
contract when necessary, and test reload/update behavior rather than telling
the user that a successful push instantly replaced every open tab.

## Public-demo rules

`PUBLIC_DEMO_ONLY=true` means:

- data is fictional and stays in the current tab;
- real signup, recovery, private messages, real family calls, real banks,
  device changes, and protected downloads stay off;
- Sprout Tutor must clearly say live AI is unavailable instead of pretending a
  fixed script is AI;
- buttons must either perform a safe demo action or clearly explain why the
  protected action is unavailable;
- the build must contain no localhost URLs, secrets, symlinks, unreviewed files,
  oversized assets, or unsafe SVGs.

Do not “fix” those safeguards by setting demo mode to false in public JavaScript.
Real mode needs a real secured backend.

Build and audit the exact public artifact with:

```sh
npm run build:public-demo
node scripts/include-chess-academy.mjs
npm run audit:public-artifact
```

The GitHub workflow runs the correct sequence automatically.

## Supabase and account data

Supabase provides Auth, Postgres, row-level security, and Realtime. Local
Supabase runs through the CLI/Docker workflow. Managed Supabase is a separate
hosted project and is not configured by changing local `.env` alone.

Browser code may receive only:

- `SUPABASE_URL`;
- a browser-safe `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) or legacy
  anon key;
- public capability flags.

Never expose or commit a Supabase secret/service-role key. Do not use a service
key to work around RLS. Every exposed table must keep RLS enabled and scope data
to the authenticated owner.

Apply the checked-in managed-database migrations only after linking the correct
KiddoSprout project and reviewing the dry run:

```sh
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run --linked --skip-vault
npx supabase db push --linked --skip-vault
```

The migration order currently covers:

1. owner-scoped recipes;
2. recipe payload/metadata hardening;
3. owner-scoped family state;
4. secure family-call pairing, membership, lifecycle RPCs, and Realtime rules;
5. the owner-checked Sprout Tutor child-approval RPC.

Run the database tests while the local Supabase stack is available:

```sh
npx supabase test db supabase/tests/family_state_rls_test.sql
npm run test:calls:db
npm run test:sprout-tutor:db
```

For hosted family calls, enable anonymous Auth only after the hardening migration
is applied, and disable Realtime's public-access option. Anonymous child sessions
must never gain access to parent recipes or family state.

The browser/Google account that owns the managed Supabase project was not
identified during this handoff. Do not guess or create a second production
project. Ask the owner to sign in to the correct KiddoSprout account and verify
the project reference before applying anything.

## Resend and `noreply@kiddosprout.com`

The intended transactional sender is:

- sender name: **KiddoSprout**
- sender address: **noreply@kiddosprout.com**
- SMTP host: `smtp.resend.com`
- recommended TLS port: `587` (Resend also supports encrypted port `465`)
- username: `resend`
- password: a private, preferably domain-scoped Resend sending API key

The address may be used only after `kiddosprout.com` is verified in the
KiddoSprout Resend account. Never put the Resend key in HTML, JavaScript,
GitHub, screenshots, chat, `supabase-config.js`, or a browser environment.

Local Auth email reads these ignored `.env` names:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
```

It is wired through `supabase/config.toml` and the templates in
`supabase/templates/`. The safe owner helper is:

```sh
npm run setup:email
```

Hosted Supabase email is configured separately in:

**Supabase Dashboard → Authentication → Emails → SMTP Settings**

Copy the checked-in templates into the hosted project. Preserve
`{{ .ConfirmationURL }}` in confirmation/recovery templates and `{{ .Token }}`
in the Magic Link template used for the six-digit parent-PIN recovery flow.
Disable Resend link tracking for Auth messages, because rewriting or automatic
scanning can damage one-time links.

Before setting `AUTH_EMAIL_DELIVERY_READY=true`, test with controlled inboxes:

1. signup;
2. resend confirmation;
3. confirmation callback;
4. login;
5. password and parent-PIN recovery;
6. spam placement plus SPF, DKIM, and DMARC results.

Useful checks:

```sh
npm run check:email
npm run check:email:hosted
```

These commands validate configuration shape; they cannot prove delivery. At
handoff time neither local nor hosted email passed readiness, so do not say the
email work is done yet.

## Cloudflare, Turnstile, and Sprout Tutor

Cloudflare has three different jobs here:

1. Turnstile protects account actions. Local development uses Cloudflare's
   published test values; production must use the real site's keys and exact
   hostname settings.
2. Quick Tunnel can expose the isolated fictional Docker preview temporarily.
   It is testing-only and its URL can expire.
3. The `kiddosprout` Worker is the permanent account/AI deployment. It serves
   the reviewed site, verifies Supabase parent sessions and child approval,
   calls Workers AI through a server binding, rate-limits use, and stores each
   conversation in a Durable Object for at most 24 hours.

Do not put an AI API key in browser code. The Worker uses its `AI` binding.

The first Worker deployment needs an ignored, mode-600 `.env.production` with
only these names:

```text
KIDDOSPROUT_ACCOUNT_ORIGIN
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
TURNSTILE_SITE_KEY
```

The exact account origin must be its real HTTPS Worker origin, with no trailing
path. Apply the Supabase migrations first. Then:

```sh
chmod 600 .env.production
npx wrangler login
npm run check:sprout-tutor-deploy
npm run deploy:sprout-tutor:first
npm run verify:sprout-tutor-deploy -- https://kiddosprout.<subdomain>.workers.dev
```

Later Worker updates use:

```sh
npm run deploy
```

Wrangler authorization belongs to the KiddoSprout Cloudflare owner. Never share
or save its short-lived device code. A terminal name such as `ttys00` is not an
authorization code.

Keep `KIDDO_SPROUT_TUTOR_ORIGIN` empty in the GitHub Pages demo unless a reviewed
live account deployment exists. The current code being AI-capable does not mean
the Worker is deployed.

## Other protected services

### Smart Spending

`server/bank-api.mjs` owns Plaid access and encrypted token storage. The browser
must never receive Plaid secrets or access tokens. The built-in local demo bank
is fictional. Real banking needs approved Plaid Production access, exact HTTPS
callbacks, server secrets, a stable external encryption key, and a production
datastore; the current JSON store is single-instance development storage.

### Story voices

`server/voice-api.mjs` keeps ElevenLabs keys server-side and accepts only trusted
story/page identifiers. The public demo uses clearly labelled device voices.
Do not claim live ElevenLabs readiness based on mocked tests; verify credits,
voice permissions, and playback privately.

### Game blockers

The Mac and Windows companions protect only the signed-in computer user. The
Mac build is ad-hoc signed and not notarized. The Windows builds are unsigned
and still need real Windows 10/11 smoke testing. Neither is tamper-proof against
an administrator. There is deliberately no blocker-PIN reset endpoint because
an insecure reset would bypass parent ownership checks.

### Family calls

The client bundle is generated from `src/family-call-app.mjs` with
`npm run build:family-calls`. Real calls require the Supabase family-call
migration, private Realtime policies, paired parent/child sessions, and parent
approval. The public demo must not create a real call or message channel.

## Test commands

Run a focused test while iterating, then the full suite before a risky or broad
release:

```sh
npm test
git diff --check
```

Useful focused commands include:

```sh
npm run test:main-ui
npm run test:accessibility
npm run test:homeschool
npm run test:games
npm run test:calls
npm run test:sprout-tutor
npm run test:email
npm run test:public-demo-build
npm run test:public-artifact-audit
```

`npm test` intentionally does not start Docker or run the three SQL policy test
files. Run those separately when changing migrations/RLS.

## Known unfinished or externally blocked work

- Apply and verify the checked-in migrations on the correct managed Supabase
  project.
- Identify and use the actual KiddoSprout Supabase owner account; do not use a
  personal or guessed replacement project.
- Finish Resend domain verification and hosted Supabase SMTP, then perform real
  delivery tests before enabling the readiness flag.
- Complete the first Cloudflare Worker deployment and record its verified URL.
- Configure the production Turnstile widget/secret for that exact account host.
- Verify managed Supabase Site URL and exact redirect allow-list.
- Confirm the GitHub Pages repository setting remains GitHub Actions.
- Test unsigned Windows blocker packs on real Windows 10 and 11 hardware.
- Notarize/sign installers before presenting them as general public downloads.
- Plaid Production, multi-instance bank storage, and any paid voice entitlement
  are future production work, not demo toggles.

## Rules for the next assistant

- Lead with what is actually working, and distinguish code-complete from
  deployed and live-tested.
- Never invent a URL, credential, account owner, deployment result, or email
  delivery result.
- Never read private values aloud or print them in logs. Refer to secret names
  only.
- Never commit `.env`, `.env.*`, `.dev.vars*`, `docker-compose.override.yml`,
  `.cloudflare/`, `.wrangler/`, or Supabase temporary state.
- Never replace a publishable Supabase key with a service-role key.
- Preserve RLS and owner checks; do not solve an authorization failure by
  weakening policy.
- Keep learning games and ordinary parent-approved games visibly separated.
- Preserve mobile layouts, keyboard access, reduced-motion behavior, safe-area
  padding, minimum tap targets, visible focus, and screen-reader announcements.
- Use root source files and the explicit public allow-list. Never patch generated
  output as the source of truth.
- If a protected backend is unavailable, provide an honest disabled state or a
  safe fictional demo—not a silent failure and not fake success.
- Run tests, inspect the diff, commit, push, and verify Actions. Do not claim
  “done” before the relevant public or live endpoint is checked.

For detailed rationale and provider setup, continue with `README.md`.
