# KiddoSprout on AWS: staged hosting plan

This setup starts with the smallest useful AWS job: **Amplify Hosting serves the
reviewed, fictional-data colleague demo**. It gives KiddoSprout a permanent HTTPS
address that does not depend on Docker, this Mac, or a terminal staying open.

It does **not** move parent accounts, children's private data, email, banks,
calls, blocker downloads, or Sprout Tutor to AWS. Those remain disabled in this
public demo. Email is deliberately left for a later, separate review.

## Already prepared in the repository

- `amplify.yml` installs the pinned Node dependencies, builds the existing
  allow-listed public bundle, adds the reviewed Chess Academy, audits the exact
  upload for secrets and unreviewed files, and publishes only
  `.cloudflare/public-demo`.
- `customHttp.yml` applies HTTPS/security headers, a restrictive static-demo
  Content Security Policy, no-indexing, and safe revalidation.
- `npm run test:aws-hosting-config` checks those two files without contacting
  AWS.
- `npm run check:aws-hosting -- https://YOUR-AMPLIFY-ADDRESS/` checks the real
  deployment without reading or changing AWS resources.

No AWS access key, secret key, account number, email credential, Supabase key,
or payment information belongs in this repository.

## One-time owner steps

An adult account owner must do these steps in the AWS console. AWS can charge
for usage, so do not create or use an account without the account owner's
permission.

1. Sign in to the AWS account that will own KiddoSprout. Turn on MFA for the
   root user, avoid using the root user for ordinary work, and create a small
   monthly AWS Budget alert before deploying.
2. Open **AWS Amplify → New app → Host web app**.
3. Choose **GitHub**. Authorize the AWS Amplify GitHub App for **only**
   `hammy-boy/KiddoSprout-Family-Hub`, rather than every repository.
4. Choose the `main` branch. Name the app `KiddoSprout`.
5. Amplify should detect the checked-in `amplify.yml`. Confirm that its output
   directory is `.cloudflare/public-demo`; do not add environment variables or
   secrets.
6. Choose **Save and deploy**. Wait for the build and deployment to finish, then
   copy the HTTPS address ending in `amplifyapp.com`.
7. Optional: in **Hosting → Rewrites and redirects**, add a `404` rule from
   `/<*>` to `/404.html` so mistyped paths show KiddoSprout's friendly error
   page instead of Amplify's default response.
8. Back in this project, verify the address:

   ```sh
   npm run check:aws-hosting -- https://YOUR-AMPLIFY-ADDRESS/
   ```

Share the public site address, not the AWS console address. Never share an AWS
password, MFA code, access key, or browser authorization code.

Official AWS instructions: [connect a GitHub repository][github-connect],
[Amplify build settings][build-settings], and [Amplify pricing][pricing].

[github-connect]: https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html
[build-settings]: https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html
[pricing]: https://aws.amazon.com/amplify/pricing/

## What happens after the owner step

Send only the public `https://…amplifyapp.com` address. It can then be checked
for the correct demo mode, security headers, offline worker, and Games page.
Future pushes to `main` will trigger Amplify's GitHub-connected build, so the
AWS copy updates without starting Docker.

## Larger AWS work for later

Do these one at a time only after the static site is verified:

1. Add a KiddoSprout-owned custom domain and exact HTTPS redirects.
2. Review Amplify access logs and CloudWatch traffic/error metrics; set a cost
   alarm appropriate for the owner's budget.
3. Design a separate authenticated backend before moving any account feature.
   Do not make the static demo a proxy to local Docker or expose local Supabase.
4. Decide whether existing Supabase and Cloudflare services should stay where
   they are. Moving a working service merely to use more AWS products adds risk
   and cost without helping families.
5. Review email separately. Do not add Amazon SES, Resend, SMTP passwords, or
   `noreply@kiddosprout.com` settings during this hosting step.

AWS Amplify pricing is usage-based. AWS currently publishes free-tier
allowances for eligible accounts, but free allowances are limits, not a promise
that the account can never be charged. The owner should check current pricing
and keep a budget alert enabled.
