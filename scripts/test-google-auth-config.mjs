import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function section(source, header) {
  const start = source.indexOf(`[${header}]`);
  assert.notEqual(start, -1, `Missing [${header}] in Supabase configuration.`);
  const next = source.indexOf("\n[", start + header.length + 2);
  return source.slice(start, next < 0 ? source.length : next);
}

function enclosingFunction(source, needle) {
  const needleIndex = source.indexOf(needle);
  assert.notEqual(needleIndex, -1, `Missing Google auth implementation containing ${needle}.`);

  const functionIndex = source.lastIndexOf("function ", needleIndex);
  assert.notEqual(functionIndex, -1, `Could not find the function containing ${needle}.`);
  const bodyMarker = source.indexOf(") {", functionIndex);
  assert.notEqual(bodyMarker, -1, `Could not find the function body containing ${needle}.`);
  const bodyStart = bodyMarker + 2;

  let depth = 0;
  let quote = "";
  let escaped = false;
  let templateExpressionDepth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (character === "\\") {
        escaped = true;
      } else if (quote === "`" && character === "$" && next === "{") {
        templateExpressionDepth += 1;
      } else if (quote === "`" && character === "}" && templateExpressionDepth > 0) {
        templateExpressionDepth -= 1;
      } else if (character === quote && templateExpressionDepth === 0) {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(functionIndex, index + 1);
    }
  }
  assert.fail(`Could not find the end of the function containing ${needle}.`);
}

const [
  index,
  app,
  compose,
  config,
  launcher,
  localBrowserConfigWriter,
  composeOverrideWriter,
  entrypoint,
  example,
  gitignore,
  dockerignore,
  packageJson
] = await Promise.all([
  read("index.html"),
  read("js.js"),
  read("docker-compose.yml"),
  read("supabase/config.toml"),
  read("scripts/start-local-stack.sh"),
  read("scripts/create-local-supabase-config.mjs"),
  read("scripts/write-local-compose-override.mjs"),
  read("docker-entrypoint.d/99-kiddosprout-config.sh"),
  read(".env.example"),
  read(".gitignore"),
  read(".dockerignore"),
  read("package.json")
]);

// Private Google credentials must be a complete pair and must remain on the Auth side.
assert.match(example, /^GOOGLE_OAUTH_CLIENT_ID=$/m);
assert.match(example, /^GOOGLE_OAUTH_CLIENT_SECRET=$/m);
assert.match(example, /^GOOGLE_AUTH_READY=false$/m);
assert.match(gitignore, /^\.env$/m);
assert.match(dockerignore, /^\.env\*$/m);
assert.match(dockerignore, /^supabase-config\.js$/m);

const googleConfig = section(config, "auth.external.google");
assert.match(googleConfig, /enabled\s*=\s*false/);
assert.match(googleConfig, /^secret\s*=\s*""$/m);
assert.match(googleConfig, /redirect_uri\s*=\s*"http:\/\/127\.0\.0\.1:54321\/auth\/v1\/callback"/);
assert.match(googleConfig, /skip_nonce_check\s*=\s*false/);

assert.match(launcher, /GOOGLE_OAUTH_CLIENT_ID/);
assert.match(launcher, /GOOGLE_OAUTH_CLIENT_SECRET/);
assert.match(launcher, /must both be set/i);
assert.match(launcher, /mktemp -d/);
assert.match(launcher, /client_id:\s*'"env\(GOOGLE_OAUTH_CLIENT_ID\)"'/);
assert.match(launcher, /secret:\s*'"env\(GOOGLE_OAUTH_CLIENT_SECRET\)"'/);
assert.match(launcher, /GOOGLE_AUTH_READY/);

const websiteService = compose.split(/\n  voice-api:/, 1)[0];
assert.match(websiteService, /GOOGLE_AUTH_READY/);
assert.doesNotMatch(websiteService, /GOOGLE_OAUTH_CLIENT_(?:ID|SECRET)|SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET/);
assert.match(composeOverrideWriter, /GOOGLE_AUTH_READY/);
assert.match(localBrowserConfigWriter, /googleAuthReady:/);
assert.doesNotMatch(localBrowserConfigWriter, /GOOGLE_OAUTH_CLIENT_SECRET[^\n]*supabase-config\.js/);
assert.match(entrypoint, /GOOGLE_AUTH_READY/);
assert.match(entrypoint, /googleAuthReady:/);
assert.doesNotMatch(entrypoint, /GOOGLE_OAUTH_CLIENT_(?:ID|SECRET)|SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET/);

// Every root-level HTML/JS file is copied into nginx and therefore browser-visible.
const publicNames = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.(?:html|js)$/i.test(entry.name))
  .map((entry) => entry.name);
const publicSources = await Promise.all(publicNames.map(async (name) => [name, await read(name)]));
for (const [name, source] of publicSources) {
  assert.doesNotMatch(
    source,
    /GOOGLE_OAUTH_CLIENT_SECRET|SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET/,
    `${name} must not expose the private Google OAuth secret identifier.`
  );
}

// When a local secret exists, guard against accidentally copying its literal value too.
try {
  const localEnvironment = await read(".env");
  const localSecret = localEnvironment.match(/^GOOGLE_OAUTH_CLIENT_SECRET=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (localSecret) {
    for (const [name, source] of publicSources) {
      assert.ok(!source.includes(localSecret), `${name} contains the private Google OAuth secret.`);
    }
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

// Google sign-in is shown only after both the injected readiness flag and Auth settings agree.
assert.match(app, /SUPABASE_CONFIG\.googleAuthReady\s*===\s*true/);
assert.match(app, /\/auth\/v1\/settings/);
assert.match(app, /external\??\.google|external\[\s*["']google["']\s*\]/);
assert.match(app, /const googleRoutePending = offerConfiguredGoogle && !googleAuthCheckComplete/);
assert.match(app, /const googleRouteReady = offerConfiguredGoogle && googleAuthAvailable/);
assert.match(app, /setGoogleAuthAvailability\(false, GOOGLE_AUTH_CONFIGURED \? "Checking Google sign-in…" : "", \{ checked: false \}\)/);
for (const id of [
  "googleLoginChoice",
  "googleSignupChoice",
  "googleLogin",
  "googleSignup",
  "googleLoginStatus",
  "googleSignupStatus",
  "googleOnboardingIntro",
  "signupTrackIntro",
  "signupTrackTitle",
  "signupTrackHelp",
  "signupProgress",
  "finishGoogleSetup",
  "googleRecoveryChoice",
  "googleRecovery",
  "googleRecoveryStatus",
  "emailRecoveryFlow"
]) {
  assert.match(index, new RegExp(`id=["']${id}["']`), `Missing #${id}.`);
}
assert.match(index, /Continue with Google/);
assert.match(app, /googleRecoveryButton\?\.addEventListener\("click", \(\) => startGoogleOAuth\("login", googleRecoveryStatus\)\)/);
assert.match(app, /setGoogleAuthStatus\(googleRecoveryStatus, statusMessage, googleAuthAvailable\)/);
assert.match(app, /emailRecoveryFlow\.hidden = !AUTH_EMAIL_DELIVERY_READY/);
assert.match(index, /Email and password signup/,
  "Email signup must be presented as a separate account track.");
assert.match(app, /signupProgress\?\.setAttribute\("hidden", ""\)/,
  "Google onboarding must hide the email-confirmation progress track.");
assert.match(app, /Google already confirmed your email[\s\S]*?no confirmation message is required/,
  "Google onboarding must explicitly say that no confirmation email step follows OAuth.");

// The authorize request must explicitly choose Google and return to this exact app route.
const authorizeFunction = enclosingFunction(app, "/auth/v1/authorize");
assert.match(authorizeFunction, /provider/);
assert.match(authorizeFunction, /google/);
assert.match(authorizeFunction, /redirect_to/);
assert.match(authorizeFunction, /createGoogleOAuthTransaction\(safeIntent\)/);
assert.match(authorizeFunction, /kiddoGoogleRedirectUrl\(transaction\.nonce\)/);
assert.doesNotMatch(authorizeFunction, /#oauth-(?:login|signup)|#oauth-\$\{safeIntent\}/);
assert.doesNotMatch(authorizeFunction, /sessionStorage\.setItem\([^)]*(?:signupPassword|loginPassword|signupPasscode)/s);

// The return route carries only a random transaction reference in its query. The
// provider can then add one token fragment without producing a broken double hash.
const transactionKey = "kiddosproutGoogleOAuthTransaction";
const transactionParam = "ks_oauth";
const sessionValues = new Map();
const localValues = new Map();
const browserWindow = {
  location: {
    origin: "http://127.0.0.1:8001",
    pathname: "/"
  },
  crypto: {
    subtle: webcrypto.subtle,
    getRandomValues(bytes) {
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = index + 1;
      return bytes;
    }
  },
  btoa(value) {
    return Buffer.from(value, "binary").toString("base64");
  },
  sessionStorage: {
    getItem(key) {
      return sessionValues.has(key) ? sessionValues.get(key) : null;
    },
    setItem(key, value) {
      sessionValues.set(key, String(value));
    },
    removeItem(key) {
      sessionValues.delete(key);
    }
  },
  localStorage: {
    getItem(key) {
      return localValues.has(key) ? localValues.get(key) : null;
    },
    setItem(key, value) {
      localValues.set(key, String(value));
    },
    removeItem(key) {
      localValues.delete(key);
    }
  }
};
const authHarness = new Function("window", `
  const KIDDO_GOOGLE_OAUTH_TRANSACTION_KEY = ${JSON.stringify(transactionKey)};
  const KIDDO_GOOGLE_OAUTH_TRANSACTION_PARAM = ${JSON.stringify(transactionParam)};
  const KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY = "kiddosproutEmailSignupTransaction";
  const KIDDO_EMAIL_SIGNUP_TRANSACTION_PARAM = "ks_signup";
  const KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY = "kiddosproutPasswordRecoveryTransaction";
  const KIDDO_PASSWORD_RECOVERY_TRANSACTION_PARAM = "ks_recovery";
  const KIDDO_GOOGLE_OAUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000;
  const KIDDO_EMAIL_SIGNUP_TRANSACTION_TTL_MS = 60 * 60 * 1000;
  const KIDDO_PASSWORD_RECOVERY_TRANSACTION_TTL_MS = 60 * 60 * 1000;
  const KIDDO_AUTH_QUERY_SECRET_PARAMETERS = new Set([
    "access_token", "refresh_token", "provider_token", "provider_refresh_token",
    "id_token", "token", "token_hash", "code", "confirmation_url",
    "error", "error_code", "error_description"
  ]);
  ${enclosingFunction(app, "function readBrowserStorage")}
  ${enclosingFunction(app, "function writeBrowserStorage")}
  ${enclosingFunction(app, "function removeBrowserStorage")}
  ${enclosingFunction(app, "function isValidEmailAddress")}
  ${enclosingFunction(app, "function kiddoAuthRedirectUrl")}
  ${enclosingFunction(app, "function createAuthTransactionNonce")}
  ${enclosingFunction(app, "function authEmailFingerprint").replace(/^function /, "async function ")}
  ${enclosingFunction(app, "function createGoogleOAuthTransaction")}
  ${enclosingFunction(app, "function consumeGoogleOAuthTransaction")}
  ${enclosingFunction(app, "function createEmailSignupTransaction").replace(/^function /, "async function ")}
  ${enclosingFunction(app, "function readEmailSignupTransaction")}
  ${enclosingFunction(app, "function refreshEmailSignupTransaction")}
  ${enclosingFunction(app, "function matchingEmailSignupTransaction").replace(/^function /, "async function ")}
  ${enclosingFunction(app, "function matchEmailSignupTransaction")}
  ${enclosingFunction(app, "function createPasswordRecoveryTransaction").replace(/^function /, "async function ")}
  ${enclosingFunction(app, "function readPasswordRecoveryTransaction")}
  ${enclosingFunction(app, "function matchPasswordRecoveryTransaction")}
  ${enclosingFunction(app, "function kiddoGoogleRedirectUrl")}
  ${enclosingFunction(app, "function kiddoEmailSignupRedirectUrl")}
  ${enclosingFunction(app, "function parseKiddoAuthCallback")}
  ${enclosingFunction(app, "function hasKiddoAuthCallbackMaterial")}
  ${enclosingFunction(app, "function classifyKiddoAuthCallback")}
  return {
    createGoogleOAuthTransaction,
    consumeGoogleOAuthTransaction,
    createEmailSignupTransaction,
    readEmailSignupTransaction,
    refreshEmailSignupTransaction,
    matchingEmailSignupTransaction,
    matchEmailSignupTransaction,
    createPasswordRecoveryTransaction,
    readPasswordRecoveryTransaction,
    matchPasswordRecoveryTransaction,
    kiddoGoogleRedirectUrl,
    kiddoEmailSignupRedirectUrl,
    parseKiddoAuthCallback,
    hasKiddoAuthCallbackMaterial,
    classifyKiddoAuthCallback
  };
`)(browserWindow);

const transaction = authHarness.createGoogleOAuthTransaction("signup");
assert.equal(transaction.intent, "signup");
assert.match(transaction.nonce, /^[A-Za-z0-9_-]{43}$/);
assert.deepEqual(Object.keys(JSON.parse(sessionValues.get(transactionKey))).sort(), ["createdAt", "intent", "nonce"]);
const redirectHref = authHarness.kiddoGoogleRedirectUrl(transaction.nonce);
const redirectUrl = new URL(redirectHref);
assert.equal(redirectUrl.hash, "", "The OAuth redirect_to must not contain its own fragment.");
assert.equal(redirectUrl.searchParams.get(transactionParam), transaction.nonce);
assert.equal([...redirectUrl.searchParams.keys()].join(","), transactionParam);

const returnedHref = `${redirectHref}#access_token=access-token&refresh_token=refresh-token`;
assert.equal((returnedHref.match(/#/g) || []).length, 1, "The simulated provider callback must have exactly one hash.");
const parsedReturn = authHarness.parseKiddoAuthCallback(returnedHref, new URL(returnedHref).hash);
assert.equal(parsedReturn.returnedNonce, transaction.nonce);
assert.equal(parsedReturn.params.get("access_token"), "access-token");
assert.deepEqual(parsedReturn.unsafeQueryParameters, []);
assert.equal(authHarness.consumeGoogleOAuthTransaction(parsedReturn.returnedNonce)?.intent, "signup");
assert.equal(authHarness.consumeGoogleOAuthTransaction(parsedReturn.returnedNonce), null, "An OAuth transaction must be one-time.");

const emailTransaction = await authHarness.createEmailSignupTransaction("grownup@example.com");
assert.match(emailTransaction.nonce, /^[A-Za-z0-9_-]{43}$/);
assert.match(emailTransaction.emailFingerprint, /^[A-Za-z0-9_-]{43}$/);
assert.deepEqual(
  Object.keys(JSON.parse(localValues.get("kiddosproutEmailSignupTransaction"))).sort(),
  ["createdAt", "emailFingerprint", "nonce"],
  "the cross-tab email transaction must bind the address without persisting readable personal data"
);
assert.doesNotMatch(localValues.get("kiddosproutEmailSignupTransaction"), /grownup@example\.com/i);
const emailRedirect = authHarness.kiddoEmailSignupRedirectUrl(emailTransaction.nonce);
assert.equal(new URL(emailRedirect).searchParams.get("ks_signup"), emailTransaction.nonce);
const parsedEmailReturn = authHarness.parseKiddoAuthCallback(
  `${emailRedirect}#access_token=email-access&type=signup`,
  "#access_token=email-access&type=signup"
);
assert.equal(parsedEmailReturn.returnedEmailNonce, emailTransaction.nonce);
assert.equal(authHarness.matchEmailSignupTransaction("wrong"), null);
assert.ok(localValues.has("kiddosproutEmailSignupTransaction"),
  "an unrelated callback must not destroy a pending email signup");
assert.equal(authHarness.matchEmailSignupTransaction(emailTransaction.nonce)?.nonce, emailTransaction.nonce);
assert.ok(localValues.has("kiddosproutEmailSignupTransaction"),
  "the transaction remains available until the server user and private state are verified");
const signupTimestampBeforeWrongResend = JSON.parse(localValues.get("kiddosproutEmailSignupTransaction")).createdAt;
assert.equal(await authHarness.matchingEmailSignupTransaction("different@example.com"), null,
  "a resend for another address must not inherit the pending signup callback nonce");
assert.equal(JSON.parse(localValues.get("kiddosproutEmailSignupTransaction")).createdAt, signupTimestampBeforeWrongResend,
  "matching a resend address must not extend the transaction lifetime before delivery succeeds");
assert.equal((await authHarness.matchingEmailSignupTransaction("grownup@example.com"))?.nonce, emailTransaction.nonce);
localValues.set("kiddosproutEmailSignupTransaction", JSON.stringify({
  ...JSON.parse(localValues.get("kiddosproutEmailSignupTransaction")),
  createdAt: Date.now() - 10_000
}));
const timestampBeforeRefresh = JSON.parse(localValues.get("kiddosproutEmailSignupTransaction")).createdAt;
assert.equal(authHarness.refreshEmailSignupTransaction(emailTransaction.nonce), true);
assert.ok(JSON.parse(localValues.get("kiddosproutEmailSignupTransaction")).createdAt > timestampBeforeRefresh,
  "a successfully delivered matching resend may explicitly renew its transaction lifetime");

const recoveryTransaction = await authHarness.createPasswordRecoveryTransaction("grownup@example.com");
const savedRecoveryTransaction = localValues.get("kiddosproutPasswordRecoveryTransaction");
assert.match(recoveryTransaction.emailFingerprint, /^[A-Za-z0-9_-]{43}$/);
assert.doesNotMatch(savedRecoveryTransaction, /grownup@example\.com/i,
  "password-recovery binding must not leave the parent's readable email in persistent browser storage");
assert.deepEqual(
  Object.keys(JSON.parse(savedRecoveryTransaction)).sort(),
  ["createdAt", "emailFingerprint", "nonce"]
);
assert.equal(authHarness.matchPasswordRecoveryTransaction(recoveryTransaction.nonce)?.nonce, recoveryTransaction.nonce);

localValues.set("kiddosproutEmailSignupTransaction", JSON.stringify({
  nonce: emailTransaction.nonce,
  emailFingerprint: emailTransaction.emailFingerprint,
  createdAt: Date.now() - (61 * 60 * 1000)
}));
assert.equal(authHarness.readEmailSignupTransaction(), null, "an expired email transaction must be rejected");
assert.equal(localValues.has("kiddosproutEmailSignupTransaction"), false);

sessionValues.set(transactionKey, JSON.stringify({
  nonce: transaction.nonce,
  intent: "login",
  createdAt: Date.now() - (11 * 60 * 1000)
}));
assert.equal(authHarness.consumeGoogleOAuthTransaction(transaction.nonce), null, "An expired OAuth transaction must be rejected.");

// A token fragment without this tab's returned random reference is unsolicited.
// It must not match (and the pending record is consumed defensively).
authHarness.createGoogleOAuthTransaction("login");
const unsolicitedHref = "http://127.0.0.1:8001/#access_token=untrusted&refresh_token=untrusted";
const unsolicited = authHarness.parseKiddoAuthCallback(unsolicitedHref, new URL(unsolicitedHref).hash);
assert.equal(unsolicited.returnedNonce, "");
assert.equal(authHarness.consumeGoogleOAuthTransaction(unsolicited.returnedNonce), null);
assert.equal(sessionValues.has(transactionKey), false);

const unsafeQueryCallback = authHarness.parseKiddoAuthCallback(
  "http://127.0.0.1:8001/?access_token=query-secret&keep=safe#login",
  "#login"
);
assert.deepEqual(unsafeQueryCallback.unsafeQueryParameters, ["access_token"],
  "auth credentials in the query string must be detected before callback processing");
assert.equal(authHarness.hasKiddoAuthCallbackMaterial(
  "http://127.0.0.1:8001/#access_token=fragment-secret",
  "#access_token=fragment-secret"
), true, "demo mode must recognize token fragments so it can remove them from browser history");
assert.equal(authHarness.hasKiddoAuthCallbackMaterial(
  `http://127.0.0.1:8001/?ks_signup=${emailTransaction.nonce}#login`,
  "#login"
), true, "a callback transaction reference without a token fragment still needs URL cleanup");
assert.equal(authHarness.hasKiddoAuthCallbackMaterial("http://127.0.0.1:8001/#parent", "#parent"), false);

const emailErrorCallback = authHarness.classifyKiddoAuthCallback({
  hasSensitiveAuthPayload: true,
  returnedEmailNonce: emailTransaction.nonce
});
assert.equal(emailErrorCallback.attemptedEmailCallback, true);
assert.equal(emailErrorCallback.looksLikeGoogleCallback, false,
  "an email callback error that omits type must still be classified by its explicit signup reference");
const recoveryErrorCallback = authHarness.classifyKiddoAuthCallback({
  hasSensitiveAuthPayload: true,
  returnedRecoveryNonce: recoveryTransaction.nonce
});
assert.equal(recoveryErrorCallback.attemptedRecoveryCallback, true);
assert.equal(recoveryErrorCallback.looksLikeGoogleCallback, false,
  "a recovery callback error that omits type must still be classified by its explicit recovery reference");
assert.equal(authHarness.classifyKiddoAuthCallback({
  hasSensitiveAuthPayload: true,
  returnedEmailNonce: emailTransaction.nonce,
  returnedRecoveryNonce: recoveryTransaction.nonce
}).conflictingCallbackDetails, true, "mixed callback references must be rejected as ambiguous");

browserWindow.sessionStorage.setItem = () => { throw new Error("Storage blocked"); };
assert.throws(
  () => authHarness.createGoogleOAuthTransaction("login"),
  /Secure browser storage is unavailable/,
  "Google sign-in must stop before redirecting when its one-time transaction cannot be saved."
);

// The implicit callback is not trusted until /user validation succeeds, and OAuth
// sessions need both the Google provider identity and a refresh token.
const callbackFunction = enclosingFunction(app, "const hash = String(callbackHash");
assert.match(callbackFunction, /const callbackHash = initialAuthCallbackHash;\s*initialAuthCallbackHash = "";/,
  "The captured callback fragment must be erased before any asynchronous validation begins.");
assert.match(callbackFunction, /access_token/);
assert.match(callbackFunction, /refresh_token/);
assert.match(callbackFunction, /\/auth\/v1\/user/);
assert.match(callbackFunction, /Authorization:\s*`Bearer \$\{accessToken\}`/);
assert.match(callbackFunction, /acceptKiddoSession/);
assert.match(callbackFunction, /google/i);
assert.match(callbackFunction, /history\.replaceState/);
assert.match(callbackFunction, /unsafeQueryParameters\.length/);
assert.match(callbackFunction, /consumeGoogleOAuthTransaction\(returnedNonce\)/);
assert.match(callbackFunction, /matchEmailSignupTransaction\(returnedEmailNonce\)/);
assert.match(callbackFunction, /classifyKiddoAuthCallback/);
assert.match(callbackFunction, /user\.user_metadata\?\.kiddosprout_signup_nonce !== emailSignupTransaction\.nonce/);
assert.match(callbackFunction, /authEmailFingerprint\(user\.email, emailSignupTransaction\.nonce\)/);
assert.match(callbackFunction, /removeBrowserStorage\(window\.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY\)/);
assert.match(callbackFunction, /const possibleGoogleCallback = Boolean\(oauthTransaction\)/);
assert.match(callbackFunction, /looksLikeGoogleCallback\s*&&\s*!possibleGoogleCallback/);
assert.match(callbackFunction, /Google sign-in expired or was not started in this tab/);
assert.ok(
  callbackFunction.indexOf("consumeGoogleOAuthTransaction(returnedNonce)") < callbackFunction.indexOf("acceptKiddoSession(confirmedSession)"),
  "The one-time transaction must be consumed before accepting the callback session."
);
assert.match(callbackFunction, /!user\.email_confirmed_at\s*&&\s*!user\.confirmed_at/,
  "callback tokens must not establish an app session for an unconfirmed email");
assert.match(callbackFunction, /\(possibleGoogleCallback \|\| supportedEmailCallback\) && !refreshToken/,
  "persistent callback sessions must include a refresh token");
assert.match(app, /discardDemoKiddoAuthCallback\(\);[\s\S]*?familyStateBootstrapping = false/,
  "demo startup must scrub any account callback material before rendering the public preview");
assert.ok(
  callbackFunction.indexOf("looksLikeGoogleCallback && !possibleGoogleCallback") < callbackFunction.indexOf("await fetch"),
  "An unsolicited callback must be rejected before its token can be validated or accepted."
);
assert.ok(
  callbackFunction.indexOf("stripKiddoAuthCallbackUrl(callbackMode)") < callbackFunction.indexOf("await fetch"),
  "The token-bearing URL fragment must be removed before network validation."
);
assert.ok(
  callbackFunction.indexOf("unsafeQueryParameters.length") < callbackFunction.indexOf("await fetch"),
  "A query-string credential must be rejected before any callback token is validated."
);
const existingGoogleBranch = callbackFunction.indexOf("const localFamilyReady");
assert.ok(existingGoogleBranch >= 0);
assert.ok(
  callbackFunction.indexOf("if (!await saveState())", existingGoogleBranch)
    < callbackFunction.indexOf("parentUnlocked = true", existingGoogleBranch),
  "Returning Google users must remain locked until the owner-scoped save succeeds."
);
const stripCallbackUrl = enclosingFunction(app, "function stripKiddoAuthCallbackUrl");
assert.match(stripCallbackUrl, /KIDDO_AUTH_QUERY_SECRET_PARAMETERS/);
assert.match(stripCallbackUrl, /cleanUrl\.searchParams\.delete\(name\)/);
assert.doesNotMatch(callbackFunction, /if\s*\(\s*callbackType\s*!==\s*["']signup["']\s*\)\s*return false/);

const emailAccountCreation = enclosingFunction(app, "const emailSignupTransaction = await createEmailSignupTransaction(parentEmail)");
assert.match(emailAccountCreation, /createEmailSignupTransaction\(parentEmail\)/);
assert.match(emailAccountCreation, /parent_passcode_record:\s*passcodeRecord/);
assert.match(emailAccountCreation, /kiddosprout_signup_nonce:\s*emailSignupTransaction\.nonce/);
assert.doesNotMatch(emailAccountCreation, /kiddosprout_signup_setup\s*:[\s\S]{0,250}(?:accountPassword|parentPasscode\s*:)/,
  "signup recovery metadata may contain only a one-way PIN verifier, never the readable password or PIN");
assert.match(app, /function signupStateFromVerifiedMetadata\(session\)[\s\S]*?KiddoSproutPasscode\?\.isRecord\?\.\(passcodeRecord\)/);
assert.match(app, /if \(!cloudState\)[\s\S]*?signupStateFromVerifiedMetadata\(session\)[\s\S]*?familyStateApi\.save\(recoveredSignupState, \{ expectedOwnerId: ownerId \}\)/,
  "a confirmed account opened in a new tab must recover its initial protected family state");

// Fresh Google users finish KiddoSprout-specific setup without ever collecting a
// Google password. The new KiddoSprout password is sent through authenticated Auth.
assert.match(app, /#finishGoogleSetup/);
assert.match(app, /\/auth\/v1\/user/);
assert.match(app, /method:\s*["']PUT["']/);
assert.match(app, /Authorization:\s*`Bearer \$\{/);
assert.match(app, /signupPasswordConfirm/);
assert.doesNotMatch(index, /Google password[^<]*(?:input|enter|type)/i);
const googleUserUpdate = enclosingFunction(app, "const expectedUserId = String(session?.user?.id");
assert.match(googleUserUpdate, /sessionApi\.getSession\(\)/);
assert.ok(
  (googleUserUpdate.match(/currentSession\?\.user\?\.id|latestSession\?\.user\?\.id/g) || []).length >= 2,
  "Google setup must bind both sides of its account update to the initiating user."
);
assert.match(googleUserUpdate, /String\(user\?\.id \|\| ""\)\.trim\(\) !== expectedUserId/);
const googleSetup = enclosingFunction(app, "if (googleSetupRequestInFlight) return");
assert.ok(
  googleSetup.indexOf("if (!stateSaved)") < googleSetup.indexOf("parentUnlocked = true"),
  "Google onboarding must stay locked until private family state is confirmed saved."
);
assert.match(googleSetup, /if \(!stateSaved\)[\s\S]*?googleOnboardingActive = true;[\s\S]*?return;/);

const emailSetup = enclosingFunction(app, "if (signupRequestInFlight) return");
assert.ok(
  emailSetup.indexOf("if (!stateSaved)") < emailSetup.indexOf("parentUnlocked = true"),
  "An auto-confirmed email signup must stay locked until private family state is confirmed saved."
);

// Google auth is additive: the existing email path keeps its delivery gate and
// customer-safe failure copy instead of silently attempting local delivery.
assert.match(app, /AUTH_EMAIL_DELIVERY_READY/);
assert.match(app, /requireEmailDelivery\(signupStatus\)/);
assert.match(app, /requireEmailDelivery\(passcodeStatus\)/);
assert.match(app, /EMAIL_DELIVERY_UNAVAILABLE_MESSAGE/);
assert.match(app, /Email sign-up and recovery are not available/);
assert.doesNotMatch(app, /SMTP_PASS|npm run setup:email|In Terminal/);
assert.match(packageJson, /"test:email":\s*"node scripts\/test-email-delivery-config\.mjs"/);

new Function(app);
console.log("Google auth safeguards passed: readiness is verified, OAuth callbacks are validated, and no private Google secret reaches the browser.");
