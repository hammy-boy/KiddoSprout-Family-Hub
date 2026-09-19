import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  assessHostedEmailReadiness,
  assessLocalEmailReadiness,
  formatEmailReadiness,
  formatHostedEmailReadiness,
  isBrowserSafeSupabaseKey,
  parseDotEnv
} from "./email-readiness.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const execFileAsync = promisify(execFile);
const entrypointPath = fileURLToPath(new URL("../docker-entrypoint.d/99-kiddosprout-config.sh", import.meta.url));

const [
  index,
  app,
  recipe,
  compose,
  config,
  launcher,
  localOverrideWriter,
  emailSetup,
  packageSource,
  dockerWrapper,
  entrypoint,
  example,
  readme,
  confirmationTemplate,
  magicLinkTemplate,
  recoveryTemplate,
  gitignore,
  dockerignore
] = await Promise.all([
  read("index.html"),
  read("js.js"),
  read("recipe.html"),
  read("docker-compose.yml"),
  read("supabase/config.toml"),
  read("scripts/start-local-stack.sh"),
  read("scripts/write-local-compose-override.mjs"),
  read("scripts/setup-email.sh"),
  read("package.json"),
  read("scripts/docker-localhost-bin/docker"),
  read("docker-entrypoint.d/99-kiddosprout-config.sh"),
  read(".env.example"),
  read("README.md"),
  read("supabase/templates/confirmation.html"),
  read("supabase/templates/magic_link.html"),
  read("supabase/templates/recovery.html"),
  read(".gitignore"),
  read(".dockerignore")
]);

const baseSmtp = {
  SMTP_HOST: "smtp.postmarkapp.com",
  SMTP_PORT: "587",
  SMTP_USER: "server-token",
  SMTP_PASS: "secret-sentinel-987",
  SMTP_FROM: "account@auth.kiddosprout.co.uk"
};

const genericReport = assessLocalEmailReadiness(baseSmtp);
assert.equal(genericReport.ready, true);
assert.equal(genericReport.provider, "SMTP");
assert.match(genericReport.warnings.join(" "), /real signup, resend, and recovery test/i);

const resendReport = assessLocalEmailReadiness({
  ...baseSmtp,
  SMTP_HOST: "smtp.resend.com",
  SMTP_PORT: "465",
  SMTP_USER: "resend",
  SMTP_PASS: "re_secret-sentinel-987"
});
assert.equal(resendReport.ready, true);
assert.equal(resendReport.provider, "Resend");

const partialReport = assessLocalEmailReadiness({ ...baseSmtp, SMTP_PASS: "" });
assert.equal(partialReport.ready, false);
assert.deepEqual(partialReport.missingNames, ["SMTP_PASS"]);

for (const unsafeEnvironment of [
  { ...baseSmtp, SMTP_HOST: "mailpit" },
  { ...baseSmtp, SMTP_HOST: "https://smtp.example.com" },
  { ...baseSmtp, SMTP_HOST: "smtp.example.com:587" },
  { ...baseSmtp, SMTP_HOST: "-smtp.example.com" },
  { ...baseSmtp, SMTP_PORT: "25" },
  { ...baseSmtp, SMTP_FROM: "KiddoSprout <account@example.com>" },
  { ...baseSmtp, SMTP_FROM: "account@example..com" },
  { ...baseSmtp, SMTP_HOST: "smtp.resend.com", SMTP_USER: "someone" },
  { ...baseSmtp, SMTP_HOST: "smtp.resend.com", SMTP_USER: "resend", SMTP_FROM: "onboarding@resend.dev" }
]) {
  assert.equal(assessLocalEmailReadiness(unsafeEnvironment).ready, false);
}

const safeOutput = formatEmailReadiness(resendReport);
assert.doesNotMatch(safeOutput, /secret-sentinel|account@|SMTP_PASS=/);
assert.match(safeOutput, /No credential value was printed/);
assert.deepEqual(parseDotEnv('SMTP_PASS="re_\\$literal\\`value"\nSMTP_USER=resend # comment'), {
  SMTP_PASS: "re_$literal`value",
  SMTP_USER: "resend"
});

const hostedEnvironment = {
  PUBLIC_DEMO_ONLY: "false",
  SUPABASE_URL: "https://kiddosprout-production.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_safe-test-value",
  TURNSTILE_SITE_KEY: "0x4AAAAAAA-production-site-key",
  AUTH_EMAIL_DELIVERY_READY: "true"
};
const hostedReport = assessHostedEmailReadiness(hostedEnvironment);
assert.equal(hostedReport.ready, true);
assert.match(hostedReport.warnings.join(" "), /cannot inspect Supabase SMTP, DNS verification, provider events, or an inbox/i);
assert.equal(assessHostedEmailReadiness({ ...hostedEnvironment, PUBLIC_DEMO_ONLY: "true" }).ready, false);
assert.equal(assessHostedEmailReadiness({ ...hostedEnvironment, SUPABASE_URL: "http://127.0.0.1:54321" }).ready, false);
assert.equal(assessHostedEmailReadiness({ ...hostedEnvironment, TURNSTILE_SITE_KEY: "1x00000000000000000000AA" }).ready, false);
assert.equal(assessHostedEmailReadiness({ ...hostedEnvironment, TURNSTILE_SITE_KEY: "short" }).ready, false);
assert.equal(assessHostedEmailReadiness({ ...hostedEnvironment, SUPABASE_PUBLISHABLE_KEY: "sb_secret_private-server-key" }).ready, false);
assert.equal(assessHostedEmailReadiness({ ...hostedEnvironment, SUPABASE_PUBLISHABLE_KEY: "not-a-real-key" }).ready, false);
assert.doesNotMatch(formatHostedEmailReadiness(hostedReport), /sb_publishable|0x4AAAAAAA|supabase\.co/);

const jwt = (role) => [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ role })).toString("base64url"),
  "signature"
].join(".");
assert.equal(isBrowserSafeSupabaseKey(hostedEnvironment.SUPABASE_PUBLISHABLE_KEY), true);
assert.equal(isBrowserSafeSupabaseKey(jwt("anon")), true);
assert.equal(isBrowserSafeSupabaseKey(jwt("service_role")), false);
assert.equal(isBrowserSafeSupabaseKey("sb_secret_server-only-value"), false);

async function runWebsiteEntrypoint(environment = {}) {
  const webRoot = await mkdtemp(`${tmpdir()}/kiddosprout-web-config-test.`);
  try {
    await execFileAsync("sh", [entrypointPath], {
      env: {
        PATH: process.env.PATH || "/usr/bin:/bin",
        KIDDOSPROUT_WEB_ROOT: webRoot,
        ...environment
      }
    });
    return await readFile(`${webRoot}/supabase-config.js`, "utf8");
  } finally {
    await rm(webRoot, { recursive: true, force: true });
  }
}

const generatedConfig = await runWebsiteEntrypoint({
  SUPABASE_URL: "https://kiddosprout-production.supabase.co/",
  SUPABASE_PUBLISHABLE_KEY: hostedEnvironment.SUPABASE_PUBLISHABLE_KEY,
  TURNSTILE_SITE_KEY: hostedEnvironment.TURNSTILE_SITE_KEY,
  AUTH_EMAIL_DELIVERY_READY: "true",
  GOOGLE_AUTH_READY: "false"
});
assert.match(generatedConfig, /Object\.freeze\(\{/);
assert.match(generatedConfig, /url: "https:\/\/kiddosprout-production\.supabase\.co"/);
assert.match(generatedConfig, /emailDeliveryReady: true/);

const legacyConfig = await runWebsiteEntrypoint({
  SUPABASE_URL: "https://kiddosprout-production.supabase.co",
  SUPABASE_ANON_KEY: jwt("anon"),
  TURNSTILE_SITE_KEY: hostedEnvironment.TURNSTILE_SITE_KEY
});
assert.match(legacyConfig, /publishableKey: "eyJ/);

for (const unsafeEnvironment of [
  {
    SUPABASE_URL: "https://kiddosprout-production.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_secret_private-server-key",
    TURNSTILE_SITE_KEY: hostedEnvironment.TURNSTILE_SITE_KEY
  },
  {
    SUPABASE_URL: "https://kiddosprout-production.supabase.co",
    SUPABASE_ANON_KEY: jwt("service_role"),
    TURNSTILE_SITE_KEY: hostedEnvironment.TURNSTILE_SITE_KEY
  },
  {
    SUPABASE_URL: "https://evil.example/\";globalThis.injected=true;//",
    SUPABASE_PUBLISHABLE_KEY: hostedEnvironment.SUPABASE_PUBLISHABLE_KEY,
    TURNSTILE_SITE_KEY: hostedEnvironment.TURNSTILE_SITE_KEY
  },
  {
    SUPABASE_URL: "https://kiddosprout-production.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: hostedEnvironment.SUPABASE_PUBLISHABLE_KEY,
    TURNSTILE_SITE_KEY: `${hostedEnvironment.TURNSTILE_SITE_KEY}\";alert(1)//`
  },
  {
    SUPABASE_URL: "https://kiddosprout-production.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: hostedEnvironment.SUPABASE_PUBLISHABLE_KEY,
    TURNSTILE_SITE_KEY: hostedEnvironment.TURNSTILE_SITE_KEY,
    AUTH_EMAIL_DELIVERY_READY: "yes"
  }
]) {
  await assert.rejects(runWebsiteEntrypoint(unsafeEnvironment), (error) => {
    assert.doesNotMatch(String(error?.stderr || ""), /private-server-key|service_role|globalThis\.injected|alert\(1\)/);
    return true;
  });
}

const publicDemoConfig = await runWebsiteEntrypoint({
  PUBLIC_DEMO_ONLY: "true",
  SUPABASE_PUBLISHABLE_KEY: "sb_secret_must-not-ship"
});
assert.match(publicDemoConfig, /publicDemoOnly: true/);
assert.doesNotMatch(publicDemoConfig, /secret|publishableKey|turnstile/i);

assert.doesNotMatch(index, /open local inbox|127\.0\.0\.1:54324/i);
assert.doesNotMatch(app, /openLocalInbox|127\.0\.0\.1:54324/);
assert.match(app, /AUTH_EMAIL_DELIVERY_READY = Boolean\(!PUBLIC_DEMO_ONLY/);
assert.match(app, /EMAIL_DELIVERY_UNAVAILABLE_MESSAGE/);
assert.match(app, /requireEmailDelivery\(signupStatus\)/);
assert.match(app, /requireEmailDelivery\(passcodeStatus\)/);
assert.match(app, /start\.disabled = emailUnavailable/);
assert.match(app, /start\.setAttribute\("aria-disabled", String\(checking \|\| verified \|\| emailUnavailable\)\)/,
  "A running safety check must keep its trigger in the tab order while exposing its busy state.");
assert.match(app, /function updateAuthActionButtons\(\)[\s\S]*?button\.disabled = Boolean\(unavailable\)/);
assert.match(app, /button\.setAttribute\("aria-disabled", String\(Boolean\(busy \|\| unavailable\)\)\)/,
  "Busy auth buttons must stay focusable while still exposing their unavailable state.");
assert.match(app, /function requireHumanCheck[\s\S]*?Complete the safety check first/);
assert.match(app, /email address not authorized/);
assert.match(app, /could not send that email right now/);
assert.doesNotMatch(app, /Email service is temporarily unavailable/);
assert.doesNotMatch(app, /SMTP_PASS|npm run setup:email|In Terminal/);
assert.match(app, /RESEND_EMAIL_COOLDOWN_SECONDS = 60/);
assert.match(index, /id="signupEmailAvailability"/);
assert.match(index, /id="recoveryEmailAvailability"/);
assert.match(index, /Create Account &amp; Send Email/);
for (const id of ["loginKiddoSprout", "createAccount", "sendRecoveryCode"]) {
  const button = index.match(new RegExp(`<button[^>]*id=["']${id}["'][^>]*>`))?.[0] || "";
  assert.doesNotMatch(button, /\sdisabled(?:\s|>|=)/, `${id} should explain its safety-check requirement when selected.`);
}

assert.match(recipe, /AUTH_EMAIL_DELIVERY_READY = Boolean\(!PUBLIC_DEMO_ONLY/);
assert.match(recipe, /state\.authMode === "signup" && !AUTH_EMAIL_DELIVERY_READY/);
assert.match(recipe, /handleRecipePasswordRecovery[\s\S]*?!AUTH_EMAIL_DELIVERY_READY/);
assert.match(recipe, /handleResendConfirmation[\s\S]*?!AUTH_EMAIL_DELIVERY_READY/);
assert.match(recipe, /Email sign-up is not enabled/);

const websiteService = compose.split(/\n  voice-api:/, 1)[0];
assert.doesNotMatch(websiteService, /SMTP_(?:HOST|PORT|USER|PASS|FROM)/);
assert.match(websiteService, /AUTH_EMAIL_DELIVERY_READY/);

assert.match(config, /\[local_smtp\]\s*\nenabled = false/);
assert.match(config, /\[auth\.email\][\s\S]*?enable_confirmations = true/);
assert.match(config, /\[auth\.email\.smtp\]\s*\nenabled = true/);
for (const name of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]) {
  assert.match(config, new RegExp(`env\\(${name}\\)`));
  assert.match(launcher, new RegExp(name));
}
assert.match(config, /sender_name = "KiddoSprout"/);
assert.match(config, /max_frequency = "60s"/);
assert.match(launcher, /scripts\/email-readiness\.mjs/);
assert.match(launcher, /port: String\(Number\.parseInt\(smtpPort, 10\)\)/);
assert.match(launcher, /--exclude mailpit/);
assert.match(launcher, /scripts\/docker-localhost-bin/);
assert.match(launcher, /UNSAFE_BINDINGS/);
assert.match(localOverrideWriter, /isBrowserSafeSupabaseKey\(process\.env\.SUPABASE_PUBLISHABLE_KEY\)/);
assert.match(localOverrideWriter, /SUPABASE_PUBLISHABLE_KEY is not browser-safe/);
assert.match(dockerWrapper, /127\.0\.0\.1:/);
assert.match(dockerWrapper, /KIDDOSPROUT_REAL_DOCKER/);
assert.doesNotMatch(launcher, /Local email inbox/);

assert.match(confirmationTemplate, /\{\{\s*\.ConfirmationURL\s*\}\}/);
assert.match(magicLinkTemplate, /\{\{\s*\.Token\s*\}\}/);
assert.match(recoveryTemplate, /\{\{\s*\.ConfirmationURL\s*\}\}/);
assert.match(recoveryTemplate, /Reset your KiddoSprout password/);
assert.match(config, /\[auth\.email\.template\.recovery\][\s\S]*?content_path = "\.\/supabase\/templates\/recovery\.html"/);
assert.match(entrypoint, /publicDemoOnly: true/);
assert.match(entrypoint, /emailDeliveryReady/);
assert.match(entrypoint, /existing-account mode/);
assert.match(entrypoint, /is_browser_safe_supabase_key/);
assert.match(entrypoint, /Secret and service-role keys are forbidden/);
assert.match(entrypoint, /AUTH_EMAIL_DELIVERY_READY must be exactly true or false/);
assert.doesNotMatch(entrypoint, /needs at least one configured parent sign-in route[\s\S]{0,120}exit 1/);

assert.match(example, /^SMTP_HOST=$/m);
assert.match(example, /^SMTP_PASS=$/m);
assert.match(example, /^AUTH_EMAIL_DELIVERY_READY=false$/m);
assert.doesNotMatch(example, /^SMTP_PASS=\S+/m);
assert.match(gitignore, /^\.env$/m);
assert.match(dockerignore, /^\.env\*$/m);

const packageJson = JSON.parse(packageSource);
assert.equal(packageJson.scripts["check:email"], "node scripts/email-readiness.mjs");
assert.equal(packageJson.scripts["check:email:hosted"], "node scripts/email-readiness.mjs --hosted");
assert.equal(packageJson.scripts["setup:email"], "sh scripts/setup-email.sh");
assert.match(emailSetup, /SMTP password or API key \(hidden\)/);
assert.match(emailSetup, /stty -echo/);
assert.match(emailSetup, /chmod 600 \.env/);
assert.match(emailSetup, /node scripts\/email-readiness\.mjs/);
assert.match(emailSetup, /npm run dev/);
assert.doesNotMatch(emailSetup, /16-character|Gmail App Password|myaccount\.google/i);

for (const expectedGuidance of [
  /local `SMTP_\*` values[\s\S]*do \*\*not\*\* configure a managed Supabase project/i,
  /Supabase Dashboard → Authentication → Emails → SMTP Settings/,
  /SPF and DKIM/,
  /DMARC/,
  /sender name \*\*KiddoSprout\*\*/,
  /Disable provider click\/open tracking/,
  /Only after every flow succeeds[\s\S]*AUTH_EMAIL_DELIVERY_READY=true/,
  /PUBLIC_DEMO_ONLY=true[\s\S]*strips all account configuration/
]) {
  assert.match(readme, expectedGuidance);
}

const recipeInlineScripts = [...recipe.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter(Boolean);
recipeInlineScripts.forEach((source) => new Function(source));
new Function(app);
console.log("Email readiness checks passed: provider-neutral validation, truthful UI gating, protected templates, and hosted-owner guidance.");
