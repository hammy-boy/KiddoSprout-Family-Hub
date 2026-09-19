import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function enclosingFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Missing function ${name}.`);
  const bodyStart = source.indexOf("{", start);
  assert.notEqual(bodyStart, -1, `Missing body for function ${name}.`);

  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`Could not find the end of function ${name}.`);
}

function inlineScriptContaining(source, marker) {
  const script = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .find((match) => !/\bsrc\s*=/.test(match[1]) && match[2].includes(marker));
  assert.ok(script, `Missing inline script containing ${marker}.`);
  return script[2];
}

const [app, recipePage, index] = await Promise.all([read("js.js"), read("recipe.html"), read("index.html")]);
const recipe = inlineScriptContaining(recipePage, "function readAuthCallback");

for (const source of [app, recipe]) {
  assert.match(source, /const AUTH_REQUEST_TIMEOUT_MS = 15000;/);
  const signalFactory = enclosingFunction(source, "authRequestSignal");
  assert.match(signalFactory, /AbortSignal\.timeout\(timeoutMs\)/);
  assert.match(signalFactory, /new AbortController\(\)/);
}

for (const request of [
  enclosingFunction(app, "kiddoAuthRequest"),
  enclosingFunction(app, "kiddoUpdateAuthenticatedUser"),
  enclosingFunction(app, "completeKiddoAuthCallback"),
  enclosingFunction(recipe, "authRequest"),
  enclosingFunction(recipe, "updatePasswordRequest")
]) {
  assert.match(request, /cache: "no-store"/);
  assert.match(request, /signal: authRequestSignal\(\)/);
}
const authRequest = enclosingFunction(app, "kiddoAuthRequest");
assert.match(authRequest, /error\.code = String\(data\.code \|\| data\.error_code \|\| data\.error/);
assert.match(authRequest, /error\.status = response\.status/);

const cleanBrowserKey = new Function("window", `
  const KIDDO_MODERN_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{12,}$/;
  ${enclosingFunction(app, "cleanSupabaseKey")}
  return cleanSupabaseKey;
`)({
  atob(value) {
    return Buffer.from(value, "base64").toString("binary");
  }
});
const keyForRole = (role) => [
  Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url"),
  Buffer.from(JSON.stringify({ role })).toString("base64url"),
  "signature"
].join(".");
assert.equal(cleanBrowserKey("sb_publishable_browser-test-key"), "sb_publishable_browser-test-key");
assert.equal(cleanBrowserKey(keyForRole("anon")), keyForRole("anon"));
assert.equal(cleanBrowserKey(keyForRole("service_role")), "");
assert.equal(cleanBrowserKey("sb_secret_private"), "");
assert.equal(cleanBrowserKey("arbitrary-key"), "");

const connectionCheck = enclosingFunction(app, "checkKiddoSupabaseConnection");
assert.match(connectionCheck, /const checkGeneration = \+\+accountConnectionCheckGeneration/);
assert.ok(
  (connectionCheck.match(/checkGeneration !== accountConnectionCheckGeneration/g) || []).length >= 2,
  "A stale account-service check must not publish either a success or failure state."
);
assert.equal(
  (connectionCheck.match(/signal: authRequestSignal\(\)/g) || []).length,
  1,
  "The single signed-out Auth readiness probe needs a timeout."
);
assert.doesNotMatch(connectionCheck, /rest\/v1\/recipes/,
  "Signed-out readiness must not probe the private recipe table or create a misleading 401.");

const setModeStart = app.indexOf("function setMode(");
const setModeEnd = app.indexOf("async function unlockParent(", setModeStart);
assert.ok(setModeStart >= 0 && setModeEnd > setModeStart, "Could not isolate setMode.");
const setMode = app.slice(setModeStart, setModeEnd);
assert.match(setMode, /if \(mode !== "login"\) clearLoginSecret\(\)/);
assert.match(setMode, /if \(mode !== "signup"\) maskSignupSecrets\(\{ clear: true \}\)/,
  "Leaving an account form must not retain passwords or PINs in hidden DOM inputs.");
assert.equal(
  (setMode.match(/checkKiddoSupabaseConnection\(\);/g) || []).length,
  2,
  "Each of the two mutually exclusive login-entry branches must start only one account-service probe."
);

const loginRequest = enclosingFunction(app, "loginKiddoSprout");
assert.match(loginRequest, /if \(loginRequestInFlight\) return;/);
assert.match(loginRequest, /loginRequestInFlight = true;[\s\S]*?await kiddoSignInRequest/);
assert.match(loginRequest, /finally[\s\S]*?loginRequestInFlight = false;/);
assert.match(loginRequest, /acceptKiddoSession\(session\);\s*clearLoginSecret\(\);/,
  "A successful login must remove its password from the hidden login form.");
assert.match(loginRequest, /const familyStateLoaded = await hydrateFamilyStateForSession\(session\)/);
assert.match(loginRequest, /if \(!familyStateLoaded && !stateSaved\)[\s\S]*?parentUnlocked = false[\s\S]*?return;/,
  "A first login without a cloud row must remain locked when its family setup cannot be saved.");
assert.ok(loginRequest.indexOf("parentUnlocked = true") > loginRequest.indexOf("if (!familyStateLoaded && !stateSaved)"),
  "Login must unlock only after an existing cloud row was loaded or the initial row was saved.");
const signupRequest = enclosingFunction(app, "createAccount");
assert.match(signupRequest, /if \(signupRequestInFlight\) return;/);
assert.match(signupRequest, /signupRequestInFlight = true;[\s\S]*?await kiddoSignUpRequest/);
assert.match(signupRequest, /finally[\s\S]*?signupRequestInFlight = false;/);
assert.match(signupRequest, /await kiddoSignUpRequest[\s\S]*?maskSignupSecrets\(\);/,
  "A completed signup request must immediately conceal any retained password.");
assert.match(signupRequest, /if \(!stateSaved\)[\s\S]*?return;[\s\S]*?maskSignupSecrets\(\{ clear: true \}\)/,
  "A fully saved signup must remove its password before opening the dashboard.");
const resendRequest = enclosingFunction(app, "resendKiddoSproutEmail");
assert.match(resendRequest, /if \(resendEmailInFlight\) return;/);
assert.match(resendRequest, /resendEmailInFlight = true;[\s\S]*?await kiddoResendSignupEmail/);
assert.match(resendRequest, /finally[\s\S]*?resendEmailInFlight = false;/);
const resendTransport = enclosingFunction(app, "kiddoResendSignupEmail");
assert.match(resendTransport, /await matchingEmailSignupTransaction\(email\)/,
  "a resend callback reference must be bound to the address that created it");
assert.ok(resendTransport.indexOf("await kiddoAuthRequest") < resendTransport.indexOf("refreshEmailSignupTransaction"),
  "a failed resend must not renew the local callback transaction lifetime");
const readSignupTransaction = enclosingFunction(app, "readEmailSignupTransaction");
assert.doesNotMatch(readSignupTransaction, /createdAt\s*=\s*Date\.now/,
  "reading signup state must never silently extend its lifetime");
const recoveryRequest = enclosingFunction(app, "sendRecoveryCode");
assert.match(recoveryRequest, /if \(recoveryRequestInFlight \|\| recoveryResetInFlight\) return;/,
  "Requesting another email code must not race an in-progress PIN reset.");
assert.match(recoveryRequest, /recoveryRequestInFlight = true;[\s\S]*?await kiddoSendRecoveryOtp/);
assert.match(recoveryRequest, /finally[\s\S]*?recoveryRequestInFlight = false;/);
assert.match(recoveryRequest, /const requestGeneration = recoveryRequestGeneration \+ 1/);
assert.ok((recoveryRequest.match(/requestGeneration !== recoveryRequestGeneration/g) || []).length >= 2,
  "A PIN-recovery response must be ignored after its hidden flow is cancelled.");
const clearRecovery = enclosingFunction(app, "clearRecoverySecrets");
assert.match(clearRecovery, /recoveryResetInFlight = false/);
assert.match(clearRecovery, /resetPasscodeButton\.setAttribute\("aria-busy", "false"\)/,
  "Cancelling recovery must restore a reset button left busy by an abandoned request.");
assert.match(clearRecovery, /recoveryCode\.value = ""/);
assert.match(clearRecovery, /recoveryPasscode\.value = ""/);
assert.match(clearRecovery, /viewRecoveryPassword\.checked = false/);
assert.match(clearRecovery, /recoveryPasscode\.type = "password"/);
assert.match(enclosingFunction(app, "logoutKiddoSprout"), /clearRecoverySecrets\(\{ clearEmail: true, cancelRequest: true \}\)/);
const hideParentGate = enclosingFunction(app, "hideParentGate");
assert.match(hideParentGate, /clearRecoverySecrets\(\{ cancelRequest: true \}\)/,
  "Closing the parent gate must erase hidden OTP and PIN fields and invalidate late recovery responses.");
const showParentGate = enclosingFunction(app, "showParentGate");
assert.match(showParentGate, /clearRecoverySecrets\(\{ cancelRequest: true \}\)[\s\S]*?forgotPanel\.style\.display = "none"/,
  "Any route that collapses recovery must erase its secrets and invalidate late responses.");
const resetPasscode = enclosingFunction(app, "resetPasscodeWithCode");
assert.match(resetPasscode, /recoveryRequestInFlight \|\| recoveryResetInFlight/,
  "PIN reset must not overlap a code request or another reset.");
assert.match(resetPasscode, /const requestGeneration = recoveryRequestGeneration/);
assert.ok((resetPasscode.match(/recoveryFlowIsCurrent\(\)/g) || []).length >= 4,
  "A PIN reset must stop publishing or saving results after its recovery panel is cancelled.");
assert.match(resetPasscode, /setAttribute\("aria-disabled", "true"\)/,
  "An in-progress reset must remain focused but expose its guarded state to assistive technology.");
assert.match(resetPasscode, /setAttribute\("aria-busy", "true"\)/);
assert.match(resetPasscode, /finishRecoveryReset\(\)/,
  "Every current PIN-reset completion needs a reusable control cleanup path.");
assert.ok(resetPasscode.indexOf("const previousPasscodeRecord") > resetPasscode.indexOf("await hydrateFamilyStateForSession(session)"),
  "A failed PIN write must roll back to the verified owner's hydrated PIN, not stale pre-login state.");

const mainAuthCallback = enclosingFunction(app, "completeKiddoAuthCallback");
assert.match(app, /let initialAuthCallbackHash = window\.location\.hash;/,
  "The initial account callback fragment must be erasable after its single validation pass.");
assert.match(mainAuthCallback, /const callbackHash = initialAuthCallbackHash;\s*initialAuthCallbackHash = "";/,
  "Account callback processing must erase the page-lifetime copy before validating tokens.");
assert.match(mainAuthCallback, /parseKiddoAuthCallback\(window\.location\.href, callbackHash\)/,
  "Callback validation must use only the consumed local fragment copy.");
const demoAuthCallbackDiscard = enclosingFunction(app, "discardDemoKiddoAuthCallback");
assert.match(demoAuthCallbackDiscard, /initialAuthCallbackHash = "";/,
  "Demo Mode must erase its page-lifetime callback fragment copy while rejecting account data.");
assert.doesNotMatch(mainAuthCallback, /(?:loginStatus|signupStatus|targetStatus)\.textContent\s*=/,
  "Auth callback results must use the live-region helper so stale success/error state is cleared and failures are assertive.");
assert.ok((mainAuthCallback.match(/setAuthStatus\(/g) || []).length >= 6,
  "Auth callback success and failure branches must publish semantic status states.");
for (const request of [loginRequest, signupRequest, resendRequest, recoveryRequest]) {
  assert.match(request, /requireAccountService\(/, "Account actions must explain a missing account-service configuration without attempting a request.");
}
assert.doesNotMatch(signupRequest, /\?\s*\(error\?\.message|\?\s*error\.message/,
  "Sign-up must not show raw browser security errors to families.");

const mainFriendlyError = new Function(`${enclosingFunction(app, "friendlySupabaseError")}; return friendlySupabaseError;`)();
const recipeFriendlyError = new Function(`${enclosingFunction(recipe, "friendlyAuthError")}; return friendlyAuthError;`)();
for (const friendlyError of [mainFriendlyError, recipeFriendlyError]) {
  assert.equal(friendlyError({ name: "TimeoutError", message: "The operation timed out" }), "Account service is temporarily unavailable.");
  assert.equal(friendlyError({ name: "AbortError", message: "Aborted" }), "Account service is temporarily unavailable.");
}
assert.equal(mainFriendlyError({ status: 429, message: "request rejected" }), "Too many account requests. Wait a moment, then try again.");
assert.equal(mainFriendlyError({ status: 503, message: "request rejected" }), "Account service is temporarily unavailable.");
assert.match(mainFriendlyError(new Error("This browser's family hub belongs to a different parent account.")), /separate browser profile/i);
assert.doesNotMatch(mainFriendlyError(new Error("User already registered")), /already has an account/i,
  "Signed-out errors must not reveal whether an email already owns an account.");

const accountRecoveryRequest = enclosingFunction(app, "requestAccountPasswordRecovery");
assert.match(accountRecoveryRequest, /await createPasswordRecoveryTransaction\(email\)/);
assert.match(accountRecoveryRequest, /await kiddoRequestAccountPasswordRecovery/);
assert.match(accountRecoveryRequest, /generation !== accountPasswordRecoveryGeneration/,
  "A closed password-recovery panel must ignore its late request result.");
assert.match(accountRecoveryRequest, /ACCOUNT_RECOVERY_REQUEST_MESSAGE/,
  "Password recovery must use an account-enumeration-resistant result.");
const accountRecoveryUpdate = enclosingFunction(app, "updateAccountPasswordFromRecovery");
assert.match(accountRecoveryUpdate, /password !== confirmation/);
assert.match(accountRecoveryUpdate, /await kiddoUpdateAccountPassword/);
assert.match(accountRecoveryUpdate, /await endTemporaryAuthSession/,
  "The bearer-only recovery session must be revoked after changing the password.");
assert.match(mainAuthCallback, /matchPasswordRecoveryTransaction/);
assert.match(mainAuthCallback, /accountPasswordRecoverySession = confirmedSession/);
assert.match(index, /id="accountPasswordUpdateFields" hidden inert aria-hidden="true"/,
  "New-password controls must not be exposed before a recovery link is verified.");
assert.match(index, /id="updateAccountPassword" type="submit"/,
  "The verified password update must use the enclosing form's native submit path.");
const accountRecoveryStage = enclosingFunction(app, "setAccountPasswordRecoveryStage");
assert.match(accountRecoveryStage, /accountPasswordRecoveryRequestFields\.hidden = updating/);
assert.match(accountRecoveryStage, /accountPasswordUpdateFields\.hidden = !updating/);
assert.match(accountRecoveryStage, /accountLoginFields\.hidden = updating/,
  "The normal login controls must not compete with the verified reset stage.");
assert.match(accountRecoveryStage, /toggleAttribute\("inert"/,
  "Only the active recovery stage may remain interactive.");
assert.match(app, /function hideAccountPasswordRecovery\([\s\S]*?accountPasswordUpdateInFlight && !force/,
  "A password update already sent to the server must not be dismissed mid-request.");
assert.match(app, /function hideAccountPasswordRecovery\([\s\S]*?auth\.accountRecovery\.finishing/,
  "A blocked close must explain that the password save is finishing.");
assert.match(accountRecoveryUpdate, /hideAccountPasswordRecovery\(\{[^}]*force: true/,
  "Only the successful password-update path may force-close the reset stage.");
assert.match(app, /loginForm\?\.addEventListener\("submit"[\s\S]*?const updatingPassword = !accountPasswordRecoveryPanel\.hidden && !accountPasswordUpdateFields\.hidden;[\s\S]*?if \(updatingPassword\) updateAccountPasswordFromRecovery\(\);[\s\S]*?else loginKiddoSprout\(\);/,
  "Login-form submission must branch according to the visible recovery stage.");
assert.match(app, /window\.addEventListener\("beforeunload"[\s\S]*?if \(!accountPasswordUpdateInFlight\) return;[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.returnValue = "";/,
  "The browser must warn before closing while a password update is already in flight.");
assert.ok(
  mainAuthCallback.indexOf('accountPasswordRecoveryPanel.scrollIntoView')
    < mainAuthCallback.indexOf('accountPasswordNew.focus({ preventScroll: true })'),
  "A verified reset callback must reveal the recovery panel before focusing its password field."
);

assert.match(index, /id="emailConfirmationCard" hidden inert aria-hidden="true"/,
  "The email-confirmation stage must begin hidden and non-interactive.");
assert.match(index, /id="restartEmailSignup" type="button"[^>]*data-i18n="auth\.signup\.confirmationChange"/,
  "The confirmation stage must offer a keyboard-native way to change email and start over.");
assert.match(app, /function setEmailConfirmationStage\([\s\S]*?emailConfirmationCard\.toggleAttribute\("inert"/);
assert.match(app, /signupDetailsFields\.hidden = googleOnlySignup \|\| noSignupRoute \|\| emailConfirmationPending/,
  "Personal-detail inputs must be hidden while email confirmation is the active stage.");
assert.match(app, /function setEmailConfirmationStage\([\s\S]*?emailConfirmationCard\.scrollIntoView[\s\S]*?confirmationTarget\?\.focus\(\{ preventScroll: true \}\)/,
  "Confirmation-stage focus must follow a deliberate scroll into view.");
const emailSignupRestart = enclosingFunction(app, "restartEmailSignup");
assert.match(emailSignupRestart, /removeBrowserStorage\(window\.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY\)/);
assert.match(emailSignupRestart, /setEmailConfirmationStage\(false\)/);
assert.match(emailSignupRestart, /signupEmail\.scrollIntoView[\s\S]*?signupEmail\.focus\(\{ preventScroll: true \}\)/,
  "Starting over must reveal the email field before returning keyboard focus.");
assert.ok(mainAuthCallback.indexOf("accountPasswordRecoverySession = confirmedSession") < mainAuthCallback.indexOf("acceptKiddoSession(confirmedSession)"),
  "A recovery bearer must stay in memory and must not enter the persistent session bridge.");
assert.match(enclosingFunction(app, "logoutKiddoSprout"), /logout\?scope=local/);
assert.match(enclosingFunction(recipe, "handleLogout"), /logout\?scope=local/);

const mainSignupTransaction = enclosingFunction(app, "createEmailSignupTransaction");
const mainRecoveryTransaction = enclosingFunction(app, "createPasswordRecoveryTransaction");
const recipeRecoveryTransaction = enclosingFunction(recipe, "createRecipePasswordRecoveryTransaction");
for (const transactionFactory of [mainSignupTransaction, mainRecoveryTransaction, recipeRecoveryTransaction]) {
  assert.match(transactionFactory, /emailFingerprint:/,
    "cross-tab email-link state must retain only a one-way address fingerprint");
  assert.doesNotMatch(transactionFactory, /\bemail\s*:/,
    "cross-tab email-link state must never persist the readable parent address");
}

const validateEmail = new Function(`${enclosingFunction(app, "isValidEmailAddress")}; return isValidEmailAddress;`)();
assert.equal(validateEmail("grownup@example.com"), true);
assert.equal(validateEmail("grownup@example"), false);
assert.equal(validateEmail("not-an-email"), false);
assert.equal(validateEmail(`${"a".repeat(245)}@example.com`), false, "Overlong email addresses must be rejected before an account request.");

for (const id of ["loginKiddoSprout", "createAccount", "sendRecoveryCode"]) {
  const tag = index.match(new RegExp(`<button[^>]*id=["']${id}["'][^>]*>`))?.[0] || "";
  assert.ok(tag, `Missing ${id} action.`);
  assert.doesNotMatch(tag, /\sdisabled(?:\s|>|=)/, `${id} must remain clickable before the safety check so it can explain what is missing.`);
  assert.match(tag, /aria-describedby=/, `${id} must expose its safety-check and request status to assistive technology.`);
}
assert.match(index, /<button[^>]*id=["']resetPasscode["'][^>]*\stype=["']button["']/,
  "PIN recovery must not become an accidental form submission if the panel is later wrapped in a form.");
for (const [id, statusId] of [["finishGoogleSetup", "signupStatus"], ["resetPasscode", "passcodeStatus"]]) {
  const tag = index.match(new RegExp(`<button[^>]*id=["']${id}["'][^>]*>`))?.[0] || "";
  assert.match(tag, new RegExp(`aria-describedby=["'][^"']*\\b${statusId}\\b`),
    `${id} must expose its result status to assistive technology.`);
}
for (const id of [
  "loginEmail",
  "loginPassword",
  "signupFamily",
  "signupParent",
  "signupEmail",
  "signupPassword",
  "signupPasscode",
  "passcodeInput",
  "recoveryEmail",
  "recoveryCode",
  "recoveryPasscode"
]) {
  const tag = index.match(new RegExp(`<input[^>]*id=["']${id}["'][^>]*>`))?.[0] || "";
  assert.match(tag, /\srequired(?:\s|>)/, `${id} must expose that it is required.`);
}
assert.match(app, /signupPasswordConfirm\.required = googleOnboardingActive/,
  "Password confirmation must be exposed as required exactly while Google onboarding shows it.");
assert.match(signupRequest, /accountPassword === passcode/);
assert.match(signupRequest, /secondParentEmail === parentEmail/);
assert.match(app, /\[signupPasscode, signupPasswordConfirm\][\s\S]*?event\.key !== "Enter"[\s\S]*?createAccount\(\)/);

const readAuthCallback = new Function(
  "window",
  "state",
  "clearAuthCallbackUrl",
  "render",
  "RECIPE_PASSWORD_RECOVERY_TRANSACTION_PARAM",
  "readRecipePasswordRecoveryTransaction",
  `${enclosingFunction(recipe, "readAuthCallback")}; return readAuthCallback;`
);

function runRecipeCallback({ hash = "", search = "", recoveryTransaction = null } = {}) {
  const state = {
    authChecked: false,
    authMode: "signup",
    authInfo: "old status",
    authError: "",
    recoveryMode: false,
    recoveryAccessToken: "",
    recoveryEmailFingerprint: "",
    recoveryNonce: "",
    recoveryError: "",
    recoveryInfo: ""
  };
  let cleared = 0;
  let rendered = 0;
  const callback = readAuthCallback(
    {
      location: { hash, search },
      localStorage: { removeItem() {} }
    },
    state,
    () => { cleared += 1; },
    () => { rendered += 1; },
    "fn_recovery",
    () => recoveryTransaction
  );
  return { result: callback(), state, cleared, rendered };
}

const unsafeQuery = runRecipeCallback({ search: "?type=recovery&access_token=query-secret&refresh_token=query-refresh" });
assert.equal(unsafeQuery.result, true);
assert.equal(unsafeQuery.state.recoveryMode, false);
assert.equal(unsafeQuery.state.recoveryAccessToken, "");
assert.match(unsafeQuery.state.authError, /not safe to use/i);
assert.equal(unsafeQuery.cleared, 1);
assert.equal(unsafeQuery.rendered, 1);

const unboundRecoveryFragment = runRecipeCallback({ hash: "#type=recovery&access_token=fragment-token" });
assert.equal(unboundRecoveryFragment.result, true);
assert.equal(unboundRecoveryFragment.state.recoveryMode, false);
assert.match(unboundRecoveryFragment.state.authError, /browser that requested it/i);

const recoveryFragment = runRecipeCallback({
  hash: "#type=recovery&access_token=fragment-token",
  search: "?fn_recovery=valid-nonce",
  recoveryTransaction: {
    nonce: "n".repeat(43),
    emailFingerprint: "f".repeat(43)
  }
});
assert.equal(recoveryFragment.result, true);
assert.equal(recoveryFragment.state.recoveryMode, true);
assert.equal(recoveryFragment.state.recoveryAccessToken, "fragment-token");
assert.equal(recoveryFragment.state.recoveryEmailFingerprint, "f".repeat(43));
assert.equal(recoveryFragment.state.recoveryNonce, "n".repeat(43));
assert.equal(recoveryFragment.cleared, 1);

const recipePasswordUpdate = enclosingFunction(recipe, "handleRecipePasswordUpdate");
assert.match(recipePasswordUpdate, /password !== confirmation/);
assert.match(recipePasswordUpdate, /await fetchRecipeRecoveryUser/);
assert.match(recipePasswordUpdate, /await recipeAuthEmailFingerprint/);
assert.match(recipePasswordUpdate, /await endRecipeAuthSession/);
assert.ok(recipePasswordUpdate.indexOf("await fetchRecipeRecoveryUser")
  < recipePasswordUpdate.indexOf("await updatePasswordRequest"),
"FlavorNest must verify the recovery account fingerprint before changing its password.");
assert.match(recipePage, /id="recipe-confirm-password"/);
assert.match(recipePage, /id="recipe-reset-cancel"/);

const clearCallback = enclosingFunction(recipe, "clearAuthCallbackUrl");
assert.match(clearCallback, /"provider_token"/);
assert.match(clearCallback, /"provider_refresh_token"/);

console.log("Auth request safety passed: requests time out, stale checks are ignored, and query-string tokens are rejected.");
