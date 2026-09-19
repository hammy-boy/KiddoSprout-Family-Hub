# KiddoSprout Codex handoff

This document carries the useful context from the original local Codex conversation into GitHub Codespaces or a new Codex session. It intentionally contains no passwords, private email addresses, tokens, or secret values.

## Project identity

- Product name: **KiddoSprout**. Do not rename it to SJD or another project name.
- Repository: `hammy-boy/KiddoSprout-Family-Hub`
- Main branch: `main`
- This directory is the repository root.
- KiddoSprout is a family hub with parent controls, child experiences, stories, recipes, smart-spending features, and browser/native game-blocker test companions.

## Important deployment distinction

There are two different modes:

1. **Colleague preview:** fictional/demo data only. Protected services, real authentication, bank connections, account recovery, and protected downloads remain disabled.
2. **Production family service:** real Supabase authentication and storage. Do not enable this merely by changing a demo flag. It needs reviewed RLS, production Turnstile, working email delivery, secure environment configuration, and end-to-end tests.

The public colleague bundle intentionally uses `publicDemoOnly: true`. Do not change it to `false` as a shortcut. The login and signup JavaScript listeners already exist; live authentication is intentionally blocked in the demo build.

## Security rules

- Never commit `.env`.
- Never expose Supabase `sb_secret_...` or legacy `service_role` keys.
- Never commit SMTP passwords, Cloudflare API tokens, Turnstile secret keys, or account passwords.
- Browser code may contain only the Supabase URL, `sb_publishable_...` key, and Turnstile **site** key.
- Enable and review Row Level Security on every exposed Supabase table before production use.
- Keep the repository private while production security and privacy controls are still being audited.
- Do not include personal email addresses or other personal details in fixtures, screenshots, documentation, or commits.

## Current service state

- Local development is started with `npm run dev`; stop it with `npm run dev:stop`.
- The earlier `127.0.0.1:8001` address is local-only. In Codespaces, use the forwarded port URL rather than sharing a `127.0.0.1` link.
- The previous `kiddosprout.ginger-tuberose.workers.dev` deployment was temporary and later stopped resolving. A stable public deployment still needs to be created or claimed.
- `wrangler.jsonc` uses automatic trailing-slash HTML handling so the deployment root serves the site correctly.
- The no-reply email sender is **not yet operational**. A display name alone does not activate delivery. Configure the hosted email provider privately and verify delivery without placing credentials in the repository.
- The colleague preview must not pretend that email, account recovery, bank connections, or protected downloads are live.

## Authentication behavior

- Signup submission is already connected to JavaScript, calls `preventDefault()`, and routes to the account-creation logic.
- Email/password registration and Google OAuth are separate journeys. Google users must not be sent through an email-confirmation step intended only for email/password signup.
- Password-reset request fields and new-password fields must be conditionally rendered; the new-password form appears only after a valid recovery link/session.
- Do not add a duplicate signup listener.
- Do not store passwords or parent PINs in plain text or client-readable shared storage.

## Game blocker packages

The native/browser blockers are transparent colleague-test companions, not guaranteed tamper-proof parental-control products. They must clearly disclose their limits and must never claim to bypass the computer administrator.

Finished platform packages:

- `mac-blocker/dist/KiddoSproutBlocker-macOS.zip`
- `windows-blocker/dist/KiddoSproutBlocker-Windows-x64.zip`
- `windows-blocker/dist/KiddoSproutBlocker-Windows-arm64.zip`
- `kiddosprout_blocker_upload.zip` contains only the browser extension upload package.

A convenience bundle was created outside the repository at:

`../KiddoSprout-GitHub-Release-Files/KiddoSprout-Blocker-All-Platforms.zip`

Use GitHub Releases for downloadable binaries instead of committing generated build/cache directories. Native packages are currently unsigned test builds, so macOS or Windows may show security warnings.

Never commit:

- `node_modules/`
- `.cloudflare/`
- `.wrangler/`
- `mac-blocker/build/`
- local Supabase temporary directories
- generated toolchain/module caches

## Established experience requirements

- Story Theater should first show the series people can choose.
- Stories should be substantially expanded, with each scene on its own reader page.
- A story title and each chapter heading should appear only once.
- Remove drafting phrases such as “here's ...” and remove repetitive filler.
- Reader **Next** and table-of-contents page selections should navigate and scroll to the corresponding scene image.
- Preserve requested story images and page-to-scene relationships.
- FlavorNest includes waffles, cake, burrito, and taco recipes.
- Theme controls use a sun for day mode and a moon for night mode, with readable contrast in both themes.
- Language selection must remain available and persist correctly.
- Website blocks should clearly say **Blocked by KiddoSprout**; native app blocks should clearly say the app was blocked.

## Useful files

- Main UI: `index.html`, `style.css`, `js.js`
- Authentication/session: `auth-session.js`, `human-check.js`, `family-state-cloud.js`, `passcode-security.js`
- Runtime public config: `supabase-config.js`
- Public-demo build: `scripts/build-public-demo.mjs`
- Browser blocker package: `kiddosprout_blocker_upload.zip`
- Blocker setup page: `blocker-setup.html`, `blocker-setup.css`, `blocker-setup.js`
- Stories: `story-theater.html`, `story-library-data.js`, `story-storage.js`, and story-specific data files
- Recipes: `recipe.html`, `recipe-cloud.js`, and the generated recipe catalog
- Cloudflare deployment: `wrangler.jsonc`, `Dockerfile.public`
- Supabase schema/functions: `supabase/`

## Verification

Run targeted tests for the area changed. Important commands include:

- `npm run test:auth`
- `npm run test:main-ui`
- `npm run test:blockers`
- `npm run test:bank`
- `npm run test:story`
- `npm run test:recipes`
- `npm run test:language`
- `npm run test:theme`
- `npm run test:accessibility`
- `npm run test:public-demo-build`
- `npm test` for the complete suite

For blocker builds:

- `npm run build:blocker:mac`
- `npm run build:blocker:windows`
- `npm run test:blocker-packages`

## Starting a new Codespaces chat

Open the repository in the Codespace and tell Codex:

> Read `AGENTS.md` and `CODEX_HANDOFF.md`, inspect the current branch and worktree, then continue KiddoSprout from the handoff without enabling production services or exposing secrets.

The original chat transcript itself is not stored in GitHub. This file carries the decisions and current state needed to continue safely.
