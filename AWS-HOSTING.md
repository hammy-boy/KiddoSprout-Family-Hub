# S&O Devs project home on AWS Amplify

This setup gives S&O Devs a small homepage that can grow as more projects are
created. Its first two choices are:

- **KiddoSprout Family Hub**
- **Rookavelle Chess Academy**

AWS Amplify Hosting serves only the two static files in `portal/`. The homepage
has no account form, database, analytics, cookies, email system, Docker
dependency, or private family data. Each card opens the project's existing
HTTPS website, so this does not replace KiddoSprout or break its installed app
and bookmarks.

The same project chooser is included in the reviewed GitHub Pages bundle at:

<https://hammy-boy.github.io/KiddoSprout-Family-Hub/portal/>

## Already prepared in the repository

- `portal/index.html` is the responsive S&O Devs project grid. Additional
  project cards automatically flow onto new rows and into one column on small
  screens.
- `portal/404.html` is its friendly not-found page.
- `amplify.yml` validates the portal and publishes only `portal/`.
- `customHttp.yml` disables active browser features, prevents framing and
  indexing, and applies strict security headers.
- `npm run test:site-portal` checks the pages, destinations, accessibility,
  mobile layout, and absence of secrets or active third-party content.
- `npm run check:aws-hosting -- https://YOUR-AMPLIFY-ADDRESS/` checks the real
  deployment without reading or changing AWS resources.

No AWS access key, secret key, account number, email credential, Supabase key,
or payment information belongs in this repository.

## One-time owner steps

An adult account owner must do these steps in the AWS console. AWS can charge
for usage, so do not create or use an account without the account owner's
permission.

1. Sign in to the AWS account that will own the project homepage. Turn on MFA
   for the root user, avoid using the root user for ordinary work, and create a
   small monthly AWS Budget alert before deploying.
2. Open **AWS Amplify → New app → Host web app**.
3. Choose **GitHub**. Authorize the AWS Amplify GitHub App for **only**
   `hammy-boy/KiddoSprout-Family-Hub`, rather than every repository.
4. Choose the `main` branch. Name the app `S&O Devs`.
5. Amplify should detect the checked-in `amplify.yml`. Confirm that its output
   directory is `portal`; do not add environment variables or secrets.
6. Choose **Save and deploy**. Wait for the build and deployment to finish,
   then copy the public HTTPS address ending in `amplifyapp.com`.
7. In **Hosting → Rewrites and redirects**, add a `404` rule from `/<*>` to
   `/404.html` with response status `404` so mistyped paths use the friendly
   error page.
8. Verify the deployed address from this project:

   ```sh
   npm run check:aws-hosting -- https://YOUR-AMPLIFY-ADDRESS/
   ```

Share the public site address, not the AWS console address. Never share an AWS
password, MFA code, access key, or browser authorization code.

Official AWS instructions: [connect a GitHub repository][github-connect],
[Amplify build settings][build-settings], [custom redirects][redirects], and
[Amplify pricing][pricing].

[github-connect]: https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html
[build-settings]: https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html
[redirects]: https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html
[pricing]: https://aws.amazon.com/amplify/pricing/

## What updates automatically

After the GitHub connection is created, every push to `main` starts a new
Amplify build. Changes to the two portal pages will appear at the same stable
Amplify address after that build passes. KiddoSprout, Rookavelle, and future
projects keep their own addresses and release processes; add or update a card
when a project's permanent HTTPS destination is ready.

## Larger work for later

Do these one at a time after the static homepage is verified:

1. Add an S&O Devs custom domain and exact HTTPS redirects.
2. Review Amplify traffic/error metrics and set a cost alarm appropriate for
   the owner's budget.
3. Give each project its own independent deployment before moving a card away
   from its current GitHub Pages destination.
4. Design and review authenticated backends separately. The chooser must not
   become a proxy to local Docker, Supabase, bank, calling, or AI services.
5. Review transactional email separately. Do not add Amazon SES, Resend, SMTP
   passwords, or `noreply@kiddosprout.com` settings during this hosting step.

AWS Amplify pricing is usage-based. AWS currently publishes free-tier
allowances for eligible accounts, but free allowances are limits, not a promise
that the account can never be charged. The owner should check current pricing
and keep a budget alert enabled.
