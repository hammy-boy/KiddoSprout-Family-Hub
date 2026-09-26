# KiddoSprout

## Local Docker development

The local workflow runs the website and the official Supabase development stack in Docker. It applies the database migrations automatically and injects only the browser-safe publishable key into the website container.

```sh
npm install
npm run dev
```

Open KiddoSprout at <http://127.0.0.1:8001>. Docker binds this development HTTP port to this Mac only; it is not exposed on the LAN. The local database studio is available at <http://127.0.0.1:54323>.
Keep Docker Desktop open while using those `127.0.0.1` links. The launcher also detects and bypasses the stale Docker shortcut that the macOS installer can leave behind.

The local start and stop commands also remove any legacy `cloudflared` container labelled as part of the private local Compose project. This closes a Quick Tunnel left behind by an older preview configuration without stopping the separately named `kiddosprout-public-preview` project.

`kiddosprout_python.py` remains only as a loopback static preview for older workflows. It serves an explicit browser-file allow-list, returns real 404 responses for private or unknown paths, and does not run account, email, bank, voice, or blocker APIs. Use `npm run dev` for the complete local app.

The parent dashboard also includes **Device Protection → Game Blocker Downloads**. Its protected page requires the verified parent's KiddoSprout account password and a fresh safety check before creating the first 4–8 digit blocker PIN; later downloads use that blocker PIN alone. It offers the macOS pack plus Windows x64 and Windows ARM64 packs from Docker. There is deliberately no PIN-reset endpoint yet: recovery must not bypass fresh parent ownership checks. Full build and safe-test instructions are in [`mac-blocker/README.md`](mac-blocker/README.md) and [`windows-blocker/README.md`](windows-blocker/README.md). The Windows packages are unsigned, current-user colleague-test builds and still require a smoke test on an actual Windows 10/11 computer before wider sharing.

Rebuild the universal Mac package on macOS with `npm run build:blocker:mac`. Rebuild both Windows packages with `npm run build:blocker:windows` after installing Go 1.27 or newer, or set `GO_BIN` to a portable Go executable. Run `npm run test:blocker-packages` to inspect both archives, verify their inner and outer checksums, confirm the Mach-O/PE architectures, exercise the packaged Mac self-test, and verify the Mac test signature. Docker serves only the three named ZIPs through the protected parent download routes.

Run `npm run dev` at least once for a fresh checkout. The launcher starts the local account containers, injects their browser-safe URL, publishable key, and local Turnstile test key, and saves those local Docker settings in an ignored `docker-compose.override.yml`. Docker Desktop and later `docker compose up` runs then reuse the working local configuration automatically.

Use <http://127.0.0.1:8001> for the app. If a KiddoSprout page is accidentally opened through VS Code Live Server or another local static port, it redirects to the Docker app so it cannot load stale account or CAPTCHA settings.

Creating a new KiddoSprout parent account requires at least one secure sign-in route: Google OAuth or confirmed-email sign-up through external SMTP. The local `npm run dev` launcher requires one of those routes before starting its account stack. A hosted deployment can deliberately leave both rollout flags false to provide existing-account login only; account creation and recovery then stay visibly unavailable. The separate `PUBLIC_DEMO_ONLY=true` preview needs no account provider at all. KiddoSprout waits for the visitor to tick its safety box before rendering Cloudflare's published always-pass local test widget, so one deliberate click completes development checks.

### Option A: Google sign-in

This is a one-time setup for the KiddoSprout owner. Parents and other end users only click **Continue with Google**; they never run commands or handle OAuth credentials.

In the [Google Auth Platform console](https://console.cloud.google.com/auth), using the dedicated KiddoSprout owner account:

1. Open **Branding** and enter the KiddoSprout app name and support contact.
2. Open **Audience**, choose **External**, and leave the app in **Testing** while setting it up. Add the owner's new Google account under **Test users**.
3. Open **Data Access** and request only `openid`, `.../auth/userinfo.email`, and `.../auth/userinfo.profile`. Do not add unrelated or sensitive scopes.
4. Open **Clients**, create an OAuth client, and choose **Web application**.
5. Add `http://127.0.0.1:8001` as the exact authorized JavaScript origin.
6. Add this exact authorized redirect URI:

```text
http://127.0.0.1:54321/auth/v1/callback
```

Save the client and download its JSON as a private backup. It contains the client secret: keep it outside the project, never commit it, and never share it in chat or screenshots. Put only the client values in the ignored `.env` file, then run `npm run dev`:

```sh
GOOGLE_OAUTH_CLIENT_ID=your_web_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_private_client_secret
```

Both values must be present together. The launcher enables Google only when the pair is complete. The client secret is passed only to the local Supabase Auth service; nginx and browser JavaScript receive only a `googleAuthReady` capability flag. Google OAuth users have already proved control of their Google email, so they do not need a separate KiddoSprout confirmation message. See Supabase's [Google sign-in setup](https://supabase.com/docs/guides/auth/social-login/auth-google) for the provider reference.

### Option B: confirmed-email sign-up

This section configures only the **local Supabase CLI Auth stack**. It does not configure SMTP for a hosted Supabase project. Confirmation links and parent-passcode recovery codes are delivered to the exact parent email entered in KiddoSprout; the local development inbox is disabled and is not linked from the app.

This is a one-time owner setup. Parents and other end users never run a command or receive an SMTP credential. Choose a transactional SMTP provider, verify a sending domain with that provider, and add its five values to the private `.env` file. `SMTP_FROM` must be a bare address the provider allows on that verified domain; the display name is fixed to **KiddoSprout** in the local Auth configuration.

A Resend-compatible local example is:

```sh
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=your_domain_scoped_sending_key
SMTP_FROM=account@auth.your-domain.example
```

Resend also supports encrypted SMTP ports 465, 2465, and 2587. Other providers can be used with one of the supported encrypted ports. Use a provider-issued SMTP password or sending-only API key—never a normal mailbox password. For Resend, use the literal username `resend`, keep the API key private, and do not use its shared test domain for production readiness.

Run `npm run check:email` for a no-network syntax/readiness check. It reports missing or unsafe settings without printing credential values. `npm run setup:email` is an optional owner-only helper: it asks for the provider credential without showing it, writes a quoted value to the ignored `.env` file with private permissions, runs the same check, and starts KiddoSprout. The SMTP password is never copied into nginx, HTML, JavaScript, or browser configuration.

A passing local check proves only that the settings are structurally safe. After startup, the owner must test sign-up, resend, confirmation, login, and parent-PIN recovery using inboxes they control. Check spam folders and provider/Auth logs. Do not describe delivery as ready until those messages arrive and their links/codes work.

## Optional ElevenLabs story voice

Story Theater offers clearly labelled device voices as a separate free option. To use genuine ElevenLabs narration, add these values to the private `.env` file before running `npm run dev`:

```sh
ELEVENLABS_API_KEY=your_private_api_key
ELEVENLABS_VOICE_ID=optional_default_voice_id
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
ELEVENLABS_ALLOWED_VOICE_IDS=optional_comma_separated_voice_ids
```

The **Choose Sound** page loads ElevenLabs' standard voices plus only the voice IDs a parent explicitly adds above. `ELEVENLABS_VOICE_ID` is the optional default, and `ELEVENLABS_ALLOWED_VOICE_IDS` is the comma-separated family-safe list. Add Professional Voice Clone IDs there to include them in the **Pro Voices** tab; a studio-quality Professional Voice is labelled **Studio Pro**, while other studio recordings are labelled **Studio Quality**. Find an ID in ElevenLabs under **My Voices → More actions → Copy voice ID**. If the key is absent, the Magic and Pro shelves stay unavailable and only clearly labelled device voices remain.

Use a restricted ElevenLabs key with only voice-read and text-to-speech access plus a credit limit. The API key is sent only by the private `voice-api` Docker service; it is never written into browser configuration. The server accepts only a book ID, chapter number, and reading-page number, then obtains the narration from its generated trusted Story Theater catalog. It does not relay arbitrary browser text to ElevenLabs. Run `npm run build:voice-catalog` after adding or editing a story outside Docker; Docker regenerates the same catalog automatically when it builds the voice service. `npm run test:voice` uses local mocks and no ElevenLabs key or network connection.

Story Theater allows only the current ElevenLabs text-to-speech models `eleven_multilingual_v2`, `eleven_v3`, `eleven_flash_v2_5`, and `eleven_flash_v2`. It enforces ElevenLabs' published per-request limits of 10,000, 5,000, 40,000, and 30,000 characters respectively. Upstream voice-list and audio responses are read as bounded streams with timeouts; MP3 output must have an approved audio MIME type before it is cached. Expired audio and rate-limit state are removed. Narration consumes ElevenLabs account credits, so the one-service deployment applies authenticated-user, deployment-wide, and concurrency limits, checks concurrency before charging a request allowance, deduplicates simultaneous page requests, and caches repeated page/mood/voice combinations in memory. A multi-replica deployment must replace these in-memory counters with a shared limiter before scaling out.

### Story image publishing

Keep each editable story illustration as `assets/story-*.jpg`. After adding or replacing artwork, run `npm run optimize:story-images`. The script uses the pinned Sharp version to apply orientation and generate a deterministic WebP at quality 76, effort 6, and smart subsampling; it leaves the source JPEG intact, gives the derivative a content-hashed filename, and atomically refreshes the non-public `story-image-derivatives.json` source-to-derivative manifest. Then run `npm run test:public-demo-build`. Both direct Docker/public builds and the release test reject missing, stale, oversized, incorrectly named, or source-mismatched derivatives, and the public bundle contains only compact content-addressed WebPs instead of the large source JPEGs.

Voice choices are stored under the authenticated parent's user ID, so a family using a shared browser does not inherit another account's selection. The fictional public demo keeps its choice in that browser tab and makes no ElevenLabs or account-service request. There is not yet a separate paid-feature entitlement record: the current server gate is a valid parent session plus an approved story location and approved account voice. Keep ElevenLabs disabled for public account mode if a separate subscription entitlement is required.

Once an ElevenLabs voice is selected, Story Theater never silently swaps it for a device voice; if browser autoplay is interrupted, it asks for one more tap. Device voices remain visibly separate and do not prove that ElevenLabs is configured. Before enabling genuine voices, the owner must privately add a restricted key with enough credits, restart Docker, confirm `/api/story-voices` loads while signed in, and listen to Cozy, Cheerful, and Adventure on several real story pages. Check ElevenLabs usage and KiddoSprout service logs, but never paste the key into chat, HTML, browser JavaScript, screenshots, or source control. A passing mocked test proves the safety contract, not live ElevenLabs sound quality, account credit, voice permission, or browser playback.

Current ElevenLabs references: [API-key security](https://elevenlabs.io/docs/api-reference/authentication), [voice-list pagination](https://elevenlabs.io/docs/api-reference/voices/search), [streaming text to speech](https://elevenlabs.io/docs/api-reference/text-to-speech/stream), and [model limits](https://elevenlabs.io/docs/overview/models).

## Smart Spending bank connection

Smart Spending now has a separate `bank-api` Docker service. Bank requests require the signed-in parent's account session; the browser never receives Plaid credentials or Plaid access tokens. The service returns only the account details and balances needed by the screen, encrypts stored Plaid access tokens, and keeps its local data in the private `bank_data` Docker volume. It does not move money or make purchases.

The first bank setup requires the verified parent's current account password, the on-screen safety check, and a new 4–8 digit Bank PIN. Later balance views and bank changes require that PIN. Bank balances stay only in the current browser tab and are never copied into the child's practice-money balance or browser storage.

Running `npm run dev` with empty `PLAID_CLIENT_ID` and `PLAID_SECRET` explicitly enables the built-in demo bank. Demo mode creates a pretend KiddoSprout account and balance, so it is safe to test and never asks for real bank login details. Demo mode is local-only by default: the normal/public Compose configuration uses `BANK_DEMO_MODE=false` and will report bank linking as unavailable when Plaid is not configured.

To test Plaid Link with mock data, create a Plaid developer account, copy its Sandbox keys into the private `.env` file, and restart the stack:

```sh
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_sandbox_secret
PLAID_ENV=sandbox
BANK_DEMO_MODE=false
BANK_TOKEN_ENCRYPTION_KEY=your_32_byte_base64_or_64_character_hex_key
PLAID_COUNTRY_CODES=GB
PLAID_PRODUCTS=auth
```

Plaid describes [Sandbox as a free environment containing test data rather than real bank data](https://plaid.com/docs/sandbox/). Its standard test login is `user_good` / `pass_good`. Sandbox credentials belong only in `.env` or the deployment secret store—never in HTML, JavaScript, Git, screenshots, or chat messages.

Connecting real accounts is a separate production deployment decision. It requires approved Plaid Production access, production credentials, an HTTPS site with the correct Plaid application settings, and an explicit `PLAID_ENV=production` plus `BANK_DEMO_MODE=false`. UK institutions that use OAuth also require the exact registered HTTPS callback in `PLAID_REDIRECT_URI`; optional `PLAID_WEBHOOK_URI`, `PLAID_COUNTRY_CODES`, and `PLAID_PRODUCTS` are passed only to the server-side bank service. Plaid's [plans, eligibility, limits, and charges](https://plaid.com/docs/account/billing/) vary by region and account; free Sandbox testing does not mean a public live-bank launch is free or approved. Generate a stable key with `openssl rand -base64 32`, save it as the private `BANK_TOKEN_ENCRYPTION_KEY` in the production secret store, and back up the bank data store. Real Plaid mode refuses to start without that external key. The included JSON store is suitable for one local Docker service, not a replicated public production deployment.

Every `/api/bank/*` route rejects missing or invalid parent authentication. Disconnecting removes the stored connection. Never expose the Supabase service-role key: the bank service uses only the publishable key to validate the parent's bearer session with Supabase Auth.

Stop both stacks without deleting local database data:

```sh
npm run dev:stop
```

Rebuild the local database from the checked-in migrations:

```sh
npm run supabase:reset
```

## Temporary public Docker preview

The optional Cloudflare Quick Tunnel is a fictional-data-only colleague tour by default. `PUBLIC_DEMO_ONLY=true` needs no Supabase or Turnstile value: the generated browser configuration contains only that demo flag, login/signup/recovery controls stay unavailable, protected APIs reject requests, and the obsolete standalone account prototypes are not served. The public Compose overlay also blanks inherited Supabase, ElevenLabs, and Plaid settings and mounts separate empty bank/blocker data volumes, so a local `.env` or local test account cannot enter the colleague containers. It uses its own Docker project and publishes no host port; the connector reaches nginx only through that project's private network. This prevents a separately running local stack on `127.0.0.1:8001` from being substituted underneath the public tunnel. Keep `.env` private (`chmod 600 .env`); `npm run dev` applies that permission automatically when the file exists.

```sh
docker compose -f docker-compose.yml -f docker-compose.public.yml --profile public up -d --build
npm run preview:status
```

`npm run preview:status` reads only the exact `kiddosprout-public-preview` project, requires all five services to be healthy, selects the newest safe Quick Tunnel address in the current connector logs, and checks its public `/healthz` route before printing it. Run `npm run preview:smoke` before sharing to additionally confirm the fictional-data browser configuration, disabled public APIs, and private-file guard.

Open the newest verified `https://...trycloudflare.com` address printed by that check. A `127.0.0.1` address works only on the Mac running Docker and is never the colleague link. A Quick Tunnel URL is a temporary session address, not a permanent deployment: Cloudflare may expire it or the connector may replace it after a failure or restart. If it stops loading, run the status check again and share the newly printed address instead of reusing an old one.

If the status check reports `Unauthorized: Tunnel not found`, or the public connector is missing or stopped, the temporary Cloudflare session is unavailable. Recovery is deliberately opt-in because it can create a new public share. Run:

```bash
npm run preview:recover
```

The recovery command first keeps a working link unchanged. For a confirmed expiry or a missing/stopped connector, it requires the four private-origin services to remain healthy with no host-published ports, recreates only the `cloudflared` connector, then runs the full isolated-demo smoke check before printing the new temporary link. An ordinary `npm run preview:status` never starts or recreates public sharing.

Use `docker compose -f docker-compose.yml -f docker-compose.public.yml --profile public ps` to check both sides of the preview. The website container is healthy when its private `/healthz` responds; the connector is healthy only after its local `/ready` endpoint reports an active Cloudflare edge connection. Then open the public URL itself to confirm the complete route before sharing it. Stop only the public connector with:

```sh
npm run preview:stop
```

While the preview is running, start its safe Docker file watcher in a terminal:

```sh
npm run preview:watch
```

Saved website and artwork changes rebuild the allow-listed public nginx image automatically; a refresh can briefly fail while that container is replaced. The public overlay deliberately removes the local web service's `depends_on` links so Compose Watch cannot recreate API containers and leave them stopped during a website-only rebuild; the status check still requires every service to be healthy before the URL is shared. The public URL normally stays the same for the lifetime of that `cloudflared` container, but a Quick Tunnel address is never guaranteed and can still expire. Voice API, bank API, and blocker-download changes rebuild their correct containers. The final public image contains only the generated browser bundle—not repository scripts, Docker files, server source, installers, or production notes.

Compose or environment configuration changes are different from watched website files. After changing `docker-compose.yml`, `docker-compose.public.yml`, or deployment environment values, stop the watcher with Ctrl-C, rerun the full `docker compose -f docker-compose.yml -f docker-compose.public.yml --profile public up -d --build` command, then restart `npm run preview:watch`. Compose recreates only services whose configuration changed. Changing the `cloudflared` service itself recreates the connector and therefore requires a fresh `npm run preview:status` URL. Dockerfile and `.dockerignore` edits are watched for all four built services, but changes to the Compose watch rules themselves still require this restart sequence.

The Quick Tunnel connector and the Node/nginx build bases are deliberately pinned to reviewed immutable image digests. This keeps an ordinary file-watcher rebuild from silently changing its runtime and avoids unnecessary tag resolution during a colleague demo. To update one, change both its readable tag and digest, run the public-preview tests, then rebuild. The connector's bounded restart policy can recover a short-lived process failure but does not turn the temporary share into a permanently auto-starting public service. [Cloudflare documents Quick Tunnels as testing-only with no SLA or uptime guarantee](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/); they can expire without notice and normally receive a new address whenever the connector is recreated. Do not print or promise one as a permanent KiddoSprout link; use the guarded `workers.dev` deployment below, or a named tunnel and custom domain, for a stable address.

## Permanent public KiddoSprout demo

The repository also publishes the reviewed, fictional-data-only colleague demo to GitHub Pages on every push to `main`. GitHub builds the safe allow-listed bundle itself, so the shared site does not depend on Docker, this Mac, or a terminal staying open:

<https://hammy-boy.github.io/KiddoSprout-Family-Hub/>

The one-time repository setting must be **Settings → Pages → Build and deployment → Source: GitHub Actions**. After that, `.github/workflows/pages.yml` installs the pinned build dependencies, runs the Homeschool Hub, offline, public-build, and link checks, and deploys only `.cloudflare/public-demo`. It does not upload `.env`, Supabase configuration, server code, migrations, blocker installers, or private API credentials. Check the repository's **Actions** tab after a push; a green **Deploy safe KiddoSprout demo** run means the permanent link received that commit.

GitHub Pages is the always-on static demo, not the live account backend. It intentionally uses fictional data and keeps real sign-up, bank connections, recovery, calls, and private downloads unavailable. Those features need a separately secured hosted backend; turning off Docker cannot turn a local backend into an internet service.

### Cloudflare Workers alternative

The same fictional-data-only bundle can be published to the free `workers.dev` route without exposing the local account stack, private `.env`, APIs, or blocker installers. The checked-in Worker is named `kiddosprout`; no personal name or email address is part of the Worker name. In the Cloudflare dashboard, choose a KiddoSprout-branded **Workers & Pages → Your subdomain** before the first permanent deploy if the account still has a personal subdomain. The resulting fixed address has the form `https://kiddosprout.<your-workers-subdomain>.workers.dev/` and remains the same across later deployments.

Authenticate the KiddoSprout owner account once in the browser, verify the deployment locally, and publish it:

```sh
npx wrangler login
npm run check:public-demo-deploy
npm run deploy
```

On the same Mac, use Wrangler's ordinary browser login shown above; it returns
through a temporary `localhost` callback automatically. If Cloudflare instead
shows **Authorize your device**, close an expired or failed page and restart the
login. Enter only the fresh, short-lived code that Wrangler explicitly labels
as the device code. A value such as `ttys00` is the macOS terminal's name, not
an authorization code, and Cloudflare will correctly reject it. Never send an
authorization code to another person.

`npm run deploy` always rebuilds and runs the strict public-demo safety checks before Wrangler uploads anything. `npm run check:public-demo-deploy` performs the same checks plus a Wrangler dry run and does not publish. This permanent Worker deployment is separate from the Docker Quick Tunnel, so it neither stops nor changes the temporary preview.

The public colleague demo labels Sprout Tutor's fixed offline helper as **Practice Coach · not AI**. The permanent Worker stays in that demo mode unless account mode is explicitly enabled. Before the same Worker deployment can serve the real account site and AI tutor, add the managed Supabase project URL, browser-safe publishable key, real Turnstile sitekey, and the exact `true` account-mode switch without committing their values:

```sh
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put KIDDOSPROUT_ACCOUNT_MODE
npx wrangler secret put KIDDOSPROUT_ACCOUNT_ORIGIN
npm run deploy
```

Enter `true` for `KIDDOSPROUT_ACCOUNT_MODE`; any other value fails closed to the account-free demo configuration. Set `KIDDOSPROUT_ACCOUNT_ORIGIN` to the one exact public HTTPS origin that will host the account UI (no trailing slash or path). When it matches the Worker/custom-domain origin, the Worker serves the live browser configuration there and existing-account login can work without Docker. For a separately hosted account frontend, set it to that frontend origin and set the frontend's browser-side `KIDDO_SPROUT_TUTOR_ORIGIN` to the Worker origin. No wildcard origins are accepted. Only after hosted email or Google sign-in is tested should the matching `AUTH_EMAIL_DELIVERY_READY` or `GOOGLE_AUTH_READY` Worker setting be set to `true`.

The Worker verifies every parent access token with Supabase, checks the active child's saved `sproutTutor` approval, applies a parent-account rate limit, runs input and output safety checks, and destroys each conversation after 24 hours or when the child chooses Stop/New chat. It never accepts a service-role key or an AI API key. Keep `KIDDO_SPROUT_TUTOR_ORIGIN` empty in the GitHub Pages demo: without live parent accounts, it must remain the non-AI Practice Coach.

Do not set `PUBLIC_DEMO_ONLY=false` until the hosted account service and its matching production Turnstile widget have both been configured and tested. Account mode requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and a nonempty real `TURNSTILE_SITE_KEY`; startup rejects every official Cloudflare test sitekey. The local `npm run dev` workflow is separate and continues to use Cloudflare's always-pass test key with the loopback Supabase stack only.

The local account stack is for development only. It uses local credentials and HTTP and must never be exposed publicly. For an internet-facing account deployment, set `PUBLIC_DEMO_ONLY=false`, use a managed or properly hardened self-hosted account service, then set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the public `TURNSTILE_SITE_KEY` in the deployment environment. Configure the matching Turnstile secret, exact HTTPS Site URL, and redirect allow-list in the hosted Auth settings. Enable at least one secure route there: a tested Google provider or custom SMTP. Set the browser-safe `GOOGLE_AUTH_READY=true` or `AUTH_EMAIL_DELIVERY_READY=true` flag only after its matching hosted provider works. For Google, register the hosted Supabase callback shown by the provider settings. For email, use a verified custom SMTP provider with **KiddoSprout** as the sender name and a real address you control, and include `{{ .Token }}` in the hosted Magic Link template so parent-passcode recovery sends the six-digit code. Never place an OAuth client secret, SMTP password, or service-role key in the website container.

### Hosted email-confirmation readiness

Hosted Supabase SMTP is an owner/dashboard task. The local `SMTP_*` values and `npm run setup:email` do **not** configure a managed Supabase project, and end users never handle these settings. An owner or deployment check can run `npm run check:email:hosted`; it verifies that account-mode rollout flags use a managed Supabase URL and real Turnstile key without printing them. It intentionally cannot claim that SMTP, DNS, or inbox delivery works.

Before enabling public email sign-up, the owner must complete this checklist:

1. Choose a transactional SMTP provider and a dedicated sending subdomain such as `auth.your-domain.example`. In the provider dashboard, publish its exact SPF and DKIM records, add a monitored DMARC policy, and wait until the domain is shown as verified. Keep authentication and marketing mail on separate sending identities.
2. Create an SMTP-only credential with the smallest available sending scope. For Resend, use `smtp.resend.com`, encrypted port `587` (or another Resend-supported TLS port), username `resend`, and a domain-scoped sending API key as the password. Use a From address on the verified domain. Never commit or paste the credential into browser/deployment configuration.
3. In **Supabase Dashboard → Authentication → Emails → SMTP Settings**, enable custom SMTP and enter the provider host, port, username, password, verified From address, and sender name **KiddoSprout**. Supabase's default mailer is for limited testing and is not production delivery. Review the project's Auth email rate limit before inviting users.
4. In **Authentication → Providers → Email**, keep email sign-up and **Confirm email** enabled. In **URL Configuration**, set the exact production HTTPS Site URL and the exact HTTPS redirect used by KiddoSprout; avoid a broad production wildcard.
5. Copy the checked-in confirmation, magic-link, and recovery wording into the matching hosted templates. **Confirm signup** and **Reset password** must retain `{{ .ConfirmationURL }}`; **Magic Link** must retain `{{ .Token }}` so KiddoSprout's six-digit parent-PIN recovery works. Disable provider click/open tracking because link rewriting or security-prefetch can consume or deform confirmation links.
6. With `AUTH_EMAIL_DELIVERY_READY=false`, use controlled addresses at more than one mailbox provider to test sign-up, resend, confirmation callback, login, and PIN recovery. Inspect Supabase Auth logs, provider delivery events, spam placement, and received SPF/DKIM/DMARC results. Only after every flow succeeds should the deployment set `AUTH_EMAIL_DELIVERY_READY=true`.

`AUTH_EMAIL_DELIVERY_READY` is deliberately only a browser-safe rollout declaration; it is not proof that a message arrived. If delivery later fails, set it back to `false` so KiddoSprout keeps existing-account login available while honestly disabling sign-up, resend, and email recovery. `PUBLIC_DEMO_ONLY=true` remains the safer colleague-preview setting and strips all account configuration regardless of the email flag.

Current owner references: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod), and [Resend SMTP](https://resend.com/docs/send-with-smtp).
