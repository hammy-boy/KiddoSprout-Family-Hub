import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function functionBlock(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `Missing function ${name}.`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start) : -1;
  return source.slice(start, end < 0 ? source.length : end);
}

const [index, app, authSession, blockerSetup, recipe, storyVoiceChoice, storyVoices, storyTheater, smartSpending, packageJson] = await Promise.all([
  read("index.html"),
  read("js.js"),
  read("auth-session.js"),
  read("blocker-setup.js"),
  read("recipe.html"),
  read("story-voice-choice.js"),
  read("story-voices.js"),
  read("story-theater.html"),
  read("app_7.html"),
  read("package.json")
]);

class StorageMock {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function createSessionHarness(session, fetchImpl, config = {
  url: "https://example-project.supabase.co",
  publishableKey: "sb_publishable_browser-test-key"
}, options = {}) {
  const serialized = JSON.stringify(session);
  const initialSession = session ? {
    kiddosproutSupabaseSession: serialized,
    flavornest_session: serialized
  } : {};
  const seed = options.seed || "legacy";
  const localStorage = options.localStorage || new StorageMock(seed === "legacy" ? initialSession : {});
  const sessionStorage = options.sessionStorage || new StorageMock(seed === "tab" ? initialSession : {});
  const windowObject = {
    KIDDO_SPROUT_SUPABASE: config,
    localStorage,
    sessionStorage,
    atob(value) {
      return Buffer.from(value, "base64").toString("binary");
    }
  };
  if (options.blockStorageProperties) {
    for (const name of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(windowObject, name, {
        configurable: true,
        get() {
          throw new Error(`${name} access is blocked`);
        }
      });
    }
  }
  vm.runInNewContext(authSession, {
    window: windowObject,
    fetch: fetchImpl,
    AbortSignal,
    Date,
    JSON,
    Object,
    String,
    Number,
    Math,
    Error
  });
  return { sessionApi: windowObject.KiddoSproutSession, localStorage, sessionStorage, serialized };
}

const SESSION_KEYS = ["kiddosproutSupabaseSession", "flavornest_session"];

function assertStoredOnlyForTab(harness, expected = harness.serialized) {
  SESSION_KEYS.forEach((key) => {
    assert.equal(harness.sessionStorage.getItem(key), expected);
    assert.equal(harness.localStorage.getItem(key), null);
  });
}

function assertSessionCleared(harness) {
  SESSION_KEYS.forEach((key) => {
    assert.equal(harness.sessionStorage.getItem(key), null);
    assert.equal(harness.localStorage.getItem(key), null);
  });
}

// Persistent family data is treated as untrusted even after it comes back from
// localStorage. These renderers may keep their fixed markup templates, but every
// user-controlled string interpolated into them must be escaped first.
const safetyAlerts = functionBlock(app, "renderSafetyAlerts", "renderProblemReports");
assert.match(safetyAlerts, /escapeHtml\(alert\.child\)/);
assert.match(safetyAlerts, /escapeHtml\(alert\.message\)/);
assert.match(safetyAlerts, /escapeHtml\(alert\.time\)/);
assert.doesNotMatch(safetyAlerts, /\$\{alert\.(?:child|message|time)\}/);

const moodCheckins = functionBlock(app, "renderMoodCheckins", "renderFamilyRules");
assert.match(moodCheckins, /escapeHtml\(mood\.child\)/);
assert.match(moodCheckins, /escapeHtml\(mood\.mood\)/);
assert.match(moodCheckins, /escapeHtml\(mood\.time\)/);
assert.doesNotMatch(moodCheckins, /\$\{mood\.(?:child|mood|time)\}/);

const familyRules = functionBlock(app, "renderFamilyRules", "renderChores");
assert.match(familyRules, /escapeHtml\(rule\)/);
assert.doesNotMatch(familyRules, /<span>\$\{rule\}<\/span>/);

const chores = functionBlock(app, "renderChores", "renderFocus");
assert.match(chores, /escapeHtml\(chore\.title\)/);
assert.doesNotMatch(chores, /<span>\$\{chore\.title\}<\/span>/);

const profiles = functionBlock(app, "renderProfiles", "renderReport");
assert.match(profiles, /data-child="\$\{escapeHtml\(id\)\}"/);
const reports = functionBlock(app, "renderReport", "closeAchievementPasscodePrompt");
assert.match(reports, /escapeHtml\(label\)/);
assert.match(reports, /const minutes = Math\.max\(0, Number\(value\) \|\| 0\)/);
const appMarkup = functionBlock(app, "appMarkup", "bindAppActions");
assert.match(appMarkup, /escapeHtml\(item\)/);
assert.doesNotMatch(appMarkup, /<span>\$\{item\}<\/span>/);
const streaks = functionBlock(app, "renderStreaks", "renderHomeworkMode");
assert.match(streaks, /Number\(streaks\.reading\)/);
assert.match(streaks, /Number\(streaks\.chores\)/);

// The shared escaping helper must neutralize both element and attribute payloads.
const escaped = new Function(`${functionBlock(app, "escapeHtml", "makeChildId")} return escapeHtml;`)()(
  `<img src=x onerror="globalThis.pwned=true">'&`
);
assert.equal(
  escaped,
  "&lt;img src=x onerror=&quot;globalThis.pwned=true&quot;&gt;&#39;&amp;"
);

// Parent logout revokes the server session when reachable, then always clears
// both tab-scoped sessions, any legacy persistent copies, and the unlocked-parent
// flag before routing away.
assert.match(index, /id="logoutKiddoSprout"[^>]*>Log out<\/button>/);
assert.match(app, /logoutKiddoSproutButton\?\.addEventListener\("click", logoutKiddoSprout\)/);
const logout = functionBlock(app, "logoutKiddoSprout", "updateRoute");
assert.match(logout, /fetch\(`\$\{SUPABASE_URL\}\/auth\/v1\/logout\?scope=local`/);
assert.match(logout, /method: "POST"/);
assert.match(logout, /Authorization: `Bearer \$\{accessToken\}`/);
assert.match(logout, /finally\s*\{/);
assert.match(logout, /clearKiddoSession\(\)/);
assert.match(logout, /replaceState\([^;]+#login/);
assert.ok(logout.indexOf("clearKiddoSession()") < logout.indexOf("await fetch("),
  "Local logout must invalidate session races and hide private state before waiting for server revocation.");
assert.doesNotMatch(logout, /getAccessToken/,
  "Logout must revoke only the synchronously captured account, never a token refreshed after an account switch.");

const clearSession = functionBlock(app, "clearKiddoSession", "kiddoAuthRequest");
assert.match(clearSession, /KiddoSproutSession\?\.clear\?\.\(\)/);
assert.match(clearSession, /\[KIDDO_AUTH_SESSION_KEY, FLAVORNEST_AUTH_SESSION_KEY\]\.forEach/);
assert.match(clearSession, /removeBrowserStorage\(window\.sessionStorage, key\)/);
assert.match(clearSession, /removeBrowserStorage\(window\.localStorage, key\)/);
assert.match(clearSession, /sessionStorage\.removeItem\("parentUnlocked"\)/);
assert.ok(clearSession.indexOf("parentUnlocked = false") > clearSession.indexOf("catch (error)"));

const getSession = functionBlock(app, "getKiddoSession", "hasKiddoSession");
assert.match(getSession, /KiddoSproutSession\?\.getSession/);
assert.match(getSession, /readFirstSession\(window\.sessionStorage\)/);
assert.match(getSession, /readFirstSession\(window\.localStorage\)/);
assert.ok(getSession.indexOf("readFirstSession(window.sessionStorage)") < getSession.indexOf("readFirstSession(window.localStorage)"));
assert.match(getSession, /clearLegacySessions\(\)/);

const saveSession = functionBlock(app, "saveKiddoSession", "acceptKiddoSession");
assert.match(saveSession, /KiddoSproutSession\?\.save/);
assert.match(saveSession, /return window\.KiddoSproutSession\.save\(session\) !== false/);
assert.match(saveSession, /writeBrowserStorage\(window\.sessionStorage, KIDDO_AUTH_SESSION_KEY/);
assert.match(saveSession, /writeBrowserStorage\(window\.sessionStorage, FLAVORNEST_AUTH_SESSION_KEY/);
assert.doesNotMatch(saveSession, /localStorage\.setItem/);

// Storage privacy modes and full browser stores must not crash the dashboard
// before it can render or leave a PIN button permanently busy.
const safeStorageRead = functionBlock(app, "readBrowserStorage", "writeBrowserStorage");
const safeStorageWrite = functionBlock(app, "writeBrowserStorage", "removeBrowserStorage");
const safeStorageRemove = functionBlock(app, "removeBrowserStorage", "isDemoMode");
for (const helper of [safeStorageRead, safeStorageWrite, safeStorageRemove]) {
  assert.match(helper, /try\s*\{/);
  assert.match(helper, /catch \(error\)/);
}
assert.match(app, /let parentUnlocked = readBrowserStorage\(window\.sessionStorage, "parentUnlocked"\) === "true"/);
assert.match(app, /writeBrowserStorage\(window\.localStorage, "kiddoSproutFailedAttempts", failedPasscodeAttempts\)/);

// Moving the same confirmed email from local Auth to hosted Auth changes its
// UUID. That migration may rebind the browser family, while a different email
// must still be rejected.
const acceptSession = functionBlock(app, "acceptKiddoSession", "clearKiddoSession");
assert.match(acceptSession, /sameConfirmedEmail/);
assert.match(acceptSession, /email_confirmed_at\s*\|\|\s*session\.user\.confirmed_at/);
assert.match(acceptSession, /!session\.user\.email_confirmed_at\s*&&\s*!session\.user\.confirmed_at/,
  "an unconfirmed email must never establish a parent session even if Auth is misconfigured");
assert.match(acceptSession, /idMismatch\s*&&\s*!verifiedAccountMigration/);
assert.match(acceptSession, /familyEmail\s*===\s*userEmail/);
assert.match(acceptSession, /const sessionSaved = saveKiddoSession\(session\)/);
assert.match(acceptSession, /sessionSaved \? getKiddoSession\(\) : null/);
assert.ok(acceptSession.indexOf("kiddoSessionVerified = true") > acceptSession.indexOf("getKiddoSession()"),
  "the UI must not trust a login until its exact session was read back from tab storage");
assert.ok(acceptSession.indexOf("state.parentAuthUserId = userId") > acceptSession.indexOf("getKiddoSession()"),
  "a failed tab-storage write must not rebind the in-memory family owner");

// Session validation only clears tab-scoped credentials when Supabase has
// definitely rejected them. Network errors and temporary service failures must
// leave both shared tab copies intact so the parent can retry after reconnecting.
const now = Math.floor(Date.now() / 1000);
const expiredSession = {
  access_token: "expired-access-token",
  refresh_token: "saved-refresh-token",
  expires_at: now - 120,
  user: { email: "parent@example.com" }
};
const validSession = {
  ...expiredSession,
  access_token: "valid-access-token",
  expires_at: now + 3600,
  user: {
    id: "parent-user",
    email: "parent@example.com",
    email_confirmed_at: "2026-01-01T00:00:00.000Z"
  }
};

// A legacy persistent session is moved into sessionStorage once, remains
// available to another page in the same tab, and is absent from a fresh tab.
{
  const firstPage = createSessionHarness(validSession, async () => {
    throw new Error("network should not be used for a current session read");
  });
  assert.equal(firstPage.localStorage.getItem(SESSION_KEYS[0]), firstPage.serialized);
  assert.equal(firstPage.sessionApi.getSession()?.access_token, validSession.access_token);
  assertStoredOnlyForTab(firstPage);

  const secondPage = createSessionHarness(null, async () => {
    throw new Error("network should not be used for a same-tab session read");
  }, undefined, {
    seed: "none",
    localStorage: firstPage.localStorage,
    sessionStorage: firstPage.sessionStorage
  });
  assert.equal(secondPage.sessionApi.getSession()?.access_token, validSession.access_token);

  const freshTab = createSessionHarness(null, async () => {}, undefined, { seed: "none" });
  assert.equal(freshTab.sessionApi.getSession(), null);
}

// A current tab session wins over a stale legacy session, which is erased.
{
  const stale = JSON.stringify({ ...validSession, access_token: "stale-access-token" });
  const localStorage = new StorageMock(Object.fromEntries(SESSION_KEYS.map((key) => [key, stale])));
  const harness = createSessionHarness(validSession, async () => {}, undefined, {
    seed: "tab",
    localStorage
  });
  assert.equal(harness.sessionApi.getSession()?.access_token, validSession.access_token);
  assertStoredOnlyForTab(harness);
}

// If sessionStorage is blocked, do not leave a long-lived refresh token in
// localStorage. The user can safely sign in again in a supported tab.
{
  class WriteBlockedStorage extends StorageMock {
    setItem() {
      throw new Error("sessionStorage is blocked");
    }
  }
  const harness = createSessionHarness(validSession, async () => {}, undefined, {
    sessionStorage: new WriteBlockedStorage()
  });
  assert.equal(harness.sessionApi.getSession(), null);
  assertSessionCleared(harness);
}

// Some sandboxed/private browser contexts throw while merely reading the
// storage property. Session cleanup and checks must still fail closed without
// crashing the whole account screen.
{
  const harness = createSessionHarness(validSession, async () => {}, undefined, {
    blockStorageProperties: true
  });
  assert.equal(harness.sessionApi.getSession(), null);
  assert.doesNotThrow(() => harness.sessionApi.clear());
  assert.equal(harness.sessionApi.save(validSession), false);
}

// Newly accepted sessions are written only for the current tab.
{
  const harness = createSessionHarness(null, async () => {}, undefined, { seed: "none" });
  assert.equal(harness.sessionApi.save(validSession), true);
  assertStoredOnlyForTab(harness, JSON.stringify(validSession));
}

// A fresh login cannot report success when browser privacy settings reject
// every session write.
{
  class WriteBlockedStorage extends StorageMock {
    setItem() {
      throw new Error("sessionStorage is blocked");
    }
  }
  const harness = createSessionHarness(null, async () => {}, undefined, {
    seed: "none",
    sessionStorage: new WriteBlockedStorage()
  });
  assert.equal(harness.sessionApi.save(validSession), false);
  assert.equal(harness.sessionApi.getSession(), null);
}

{
  const harness = createSessionHarness(expiredSession, async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(
    harness.sessionApi.validate(),
    (error) => harness.sessionApi.isTemporaryError(error)
  );
  assertStoredOnlyForTab(harness);
}

{
  const harness = createSessionHarness(expiredSession, async () => ({
    ok: false,
    status: 503,
    json: async () => ({ error: "service unavailable" })
  }));
  await assert.rejects(
    harness.sessionApi.validate(),
    (error) => harness.sessionApi.isTemporaryError(error)
  );
  assertStoredOnlyForTab(harness);
}

{
  const harness = createSessionHarness(expiredSession, async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: "invalid refresh token" })
  }));
  assert.equal(await harness.sessionApi.validate(), null);
  assertSessionCleared(harness);
}

// A definitive refresh rejection must also clear a still-near-expiry session
// when a caller asks directly for a token, rather than handing the old token to
// a protected API for a few more seconds.
{
  const expiringSession = { ...validSession, expires_at: now + 30 };
  const harness = createSessionHarness(expiringSession, async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: "invalid refresh token" })
  }));
  assert.equal(await harness.sessionApi.getAccessToken(), "");
  assertSessionCleared(harness);
}

// Logging out while refresh is in flight wins for token consumers too. The
// stale pre-logout access token must not escape through getAccessToken().
{
  let finishRefresh;
  const refreshResponse = new Promise((resolve) => {
    finishRefresh = resolve;
  });
  const expiringSession = { ...validSession, expires_at: now + 30 };
  const harness = createSessionHarness(expiringSession, async () => refreshResponse);
  const accessToken = harness.sessionApi.getAccessToken();
  harness.sessionApi.clear();
  finishRefresh({
    ok: true,
    status: 200,
    json: async () => ({
      ...validSession,
      access_token: "late-access-token",
      refresh_token: "rotated-refresh-token"
    })
  });
  assert.equal(await accessToken, "");
  assertSessionCleared(harness);
}

// A rejection for an older access token must not erase a newer session that
// happens to retain the same refresh token (for example, an external auth tab
// updating the shared tab session during the request).
{
  let finishRefresh;
  const refreshResponse = new Promise((resolve) => {
    finishRefresh = resolve;
  });
  const expiringSession = { ...validSession, access_token: "older-access-token", expires_at: now + 30 };
  const harness = createSessionHarness(expiringSession, async () => refreshResponse);
  const accessToken = harness.sessionApi.getAccessToken();
  const newerSession = { ...validSession, access_token: "newer-access-token", expires_at: now + 3600 };
  harness.sessionApi.save(newerSession);
  finishRefresh({
    ok: false,
    status: 400,
    json: async () => ({ error: "older token rejected" })
  });
  assert.equal(await accessToken, "");
  assert.equal(harness.sessionApi.getSession()?.access_token, "newer-access-token");
  assertStoredOnlyForTab(harness, JSON.stringify(newerSession));
}

// Browser helpers independently reject server-only and malformed keys, even
// if a deployment accidentally injects one into its runtime config.
{
  const serviceRoleKey = [
    Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url"),
    Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url"),
    "signature"
  ].join(".");
  for (const unsafeKey of [serviceRoleKey, "sb_secret_private", "arbitrary-key"]) {
    let networkCalls = 0;
    const harness = createSessionHarness(validSession, async () => {
      networkCalls += 1;
      throw new Error("must not fetch");
    }, {
      url: "https://example-project.supabase.co",
      publishableKey: unsafeKey
    });
    await assert.rejects(
      harness.sessionApi.validate(),
      (error) => harness.sessionApi.isTemporaryError(error)
    );
    assert.equal(networkCalls, 0);
    assertStoredOnlyForTab(harness);
  }
}

{
  const harness = createSessionHarness(validSession, async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(
    harness.sessionApi.validate(),
    (error) => harness.sessionApi.isTemporaryError(error)
  );
  assertStoredOnlyForTab(harness);
}

{
  const harness = createSessionHarness(validSession, async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: "invalid access token" })
  }));
  assert.equal(await harness.sessionApi.validate(), null);
  assertSessionCleared(harness);
}

// A slow refresh response must never put a signed-out parent back into the
// browser after they have already cleared the session.
{
  let finishRefresh;
  let refreshCalls = 0;
  const refreshResponse = new Promise((resolve) => {
    finishRefresh = resolve;
  });
  const harness = createSessionHarness(expiredSession, async () => {
    refreshCalls += 1;
    return refreshResponse;
  });
  const firstRefresh = harness.sessionApi.refresh();
  const duplicateRefresh = harness.sessionApi.refresh();
  harness.sessionApi.clear();
  finishRefresh({
    ok: true,
    status: 200,
    json: async () => ({
      ...validSession,
      access_token: "late-access-token",
      refresh_token: "rotated-refresh-token"
    })
  });
  assert.equal(await firstRefresh, null);
  assert.equal(await duplicateRefresh, null);
  assert.equal(refreshCalls, 1, "Concurrent refreshes for one session were not deduplicated.");
  assertSessionCleared(harness);
}

// The same protection applies while /user validation is in flight. A late
// response cannot restore credentials after the parent presses Log out.
{
  let finishValidation;
  const validationResponse = new Promise((resolve) => {
    finishValidation = resolve;
  });
  const harness = createSessionHarness(validSession, async () => validationResponse);
  const validation = harness.sessionApi.validate();
  await Promise.resolve();
  harness.sessionApi.clear();
  finishValidation({
    ok: true,
    status: 200,
    json: async () => ({ id: "old-user", email: "parent@example.com" })
  });
  assert.equal(await validation, null);
  assertSessionCleared(harness);
}

const restoreSession = functionBlock(app, "restoreValidatedKiddoSession", "const copy");
assert.match(restoreSession, /try\s*\{[\s\S]*KiddoSproutSession\?\.validate\?\.\(\)/);
assert.match(restoreSession, /isTemporaryError\?\.\(error\)/);
assert.match(restoreSession, /saved sign-in is safe/);

// FlavorNest delegates every session read, write, refresh, and clear to the
// race-safe shared helper instead of maintaining a second refresh flow.
const recipePersist = functionBlock(recipe, "persistSession", "clearPersistedSession");
assert.match(recipePersist, /sharedRecipeSession\(\)/);
assert.match(recipePersist, /sessionApi\.save\(session\)/);
assert.match(recipePersist, /String\(storedSession\.access_token\) === String\(session\?\.access_token/,
  "FlavorNest must verify that the exact newly accepted token, not a stale account, was stored");
assert.match(recipePersist, /function acceptRecipeSession/);
assert.match(recipePersist, /!session\?\.user\?\.email_confirmed_at\s*&&\s*!session\?\.user\?\.confirmed_at/);
assert.match(recipePersist, /if \(persistSession\(session\)\) return session/);
const recipeClear = functionBlock(recipe, "clearPersistedSession", "readPersistedSession");
assert.match(recipeClear, /KiddoSproutSession\?\.clear/);
const recipeRead = functionBlock(recipe, "readPersistedSession", "getCategories");
assert.match(recipeRead, /KiddoSproutSession\?\.getSession/);
assert.doesNotMatch(recipeRead, /(?:localStorage|sessionStorage)\.getItem/);
const recipeRestore = functionBlock(recipe, "restoreSession", "retryRecipeCloud");
assert.match(recipeRestore, /const storedSession = readPersistedSession\(\)/);
assert.match(recipeRestore, /await validatedRecipeAccess\(\)/);
assert.doesNotMatch(recipeRestore, /refreshRequest|refresh_token/);
assert.match(recipe, /auth-session\.js\?v=7/);
assert.match(recipe, /family-state-cloud\.js\?v=2/);
assert.ok(recipe.indexOf("auth-session.js?v=7") < recipe.indexOf("family-state-cloud.js?v=2"));
assert.doesNotMatch(recipe, /kiddosproutState/,
  "FlavorNest must not authorize from or save the retired plaintext family document");
const recipeAccess = functionBlock(recipe, "validatedRecipeAccess", "ownerBoundFamilyCloud");
assert.match(recipeAccess, /await sessionApi\.validate\(\)/);
assert.match(recipeAccess, /await freshSharedRecipeToken\(ownerId\)/);
const recipeLogout = functionBlock(recipe, "handleLogout", "focusAfterRender");
assert.ok(recipeLogout.indexOf("clearPersistedSession()") < recipeLogout.indexOf("await fetch("),
  "FlavorNest logout must invalidate shared session races before waiting for the server");

const voiceChoiceSession = functionBlock(storyVoiceChoice, "session", "storageContext");
assert.match(voiceChoiceSession, /KiddoSproutSession\?\.getSession/);
assert.match(voiceChoiceSession, /window\.sessionStorage\.getItem\(key\)/);
assert.doesNotMatch(voiceChoiceSession, /window\.localStorage\.getItem\(key\)/);
const voiceSessionToken = functionBlock(storyVoices, "sessionToken", "setStatus");
assert.match(voiceSessionToken, /KiddoSproutSession\?\.getAccessToken/);
assert.match(voiceSessionToken, /window\.sessionStorage\.getItem\(key\)/);
assert.doesNotMatch(voiceSessionToken, /window\.localStorage\.getItem\(key\)/);
const theaterSessionToken = functionBlock(storyTheater, "storySessionToken", "setReadAloudUi");
assert.match(theaterSessionToken, /KiddoSproutSession\?\.getAccessToken/);
assert.match(theaterSessionToken, /window\.sessionStorage\.getItem\(key\)/);
assert.doesNotMatch(theaterSessionToken, /window\.localStorage\.getItem\(key\)/);

assert.match(index, /auth-session\.js\?v=7/);
assert.match(index, /family-state-cloud\.js\?v=2/);
assert.match(index, /js\.js\?v=41/);
assert.match(smartSpending, /auth-session\.js\?v=7/);
assert.match(smartSpending, /family-state-cloud\.js\?v=2/);
assert.ok(
  smartSpending.indexOf("auth-session.js?v=7") < smartSpending.indexOf("family-state-cloud.js?v=2"),
  "Smart Spending must establish shared auth before loading owner-scoped family state."
);
assert.doesNotMatch(smartSpending, /kiddosproutState/,
  "Smart Spending must not read or restore the retired plaintext family document.");
const smartFamilyFetch = functionBlock(smartSpending, "fetchVerifiedFamily", "enqueueDashboardRequest");
assert.match(smartFamilyFetch, /await sessionApi\.validate\(\)/);
assert.match(smartFamilyFetch, /await familyApi\.load\(\{ expectedOwnerId: ownerId \}\)/);
assert.ok(smartFamilyFetch.indexOf("await sessionApi.validate()") < smartFamilyFetch.indexOf("await familyApi.load("),
  "Smart Spending must validate the parent session before requesting the owner row.");
const smartStart = functionBlock(smartSpending, "startApp");
assert.ok(smartStart.indexOf("await fetchVerifiedFamily()") < smartStart.lastIndexOf('await canOpenKiddoSproutApp("spending"'),
  "Smart Spending must load the cloud family before evaluating its app gate.");
const smartRequestQueue = functionBlock(smartSpending, "enqueueDashboardRequest", "requestKiddoSproutAccess");
assert.match(smartRequestQueue, /await window\.KiddoSproutFamilyState\.save\(family, \{ expectedOwnerId \}\)/);
assert.match(smartRequestQueue, /return "unavailable"/,
  "A request without a confirmed owner-scoped save must fail closed.");
assert.match(storyTheater, /auth-session\.js\?v=7/);

// Pages that request an access token must catch a temporary refresh failure so
// their controls recover instead of leaving an unhandled promise rejection.
const blockerStatus = functionBlock(blockerSetup, "checkSetup", "bindPlatformChoices");
assert.ok(blockerStatus.indexOf("try {") < blockerStatus.indexOf("await accessToken()"));
assert.match(blockerStatus, /friendlyServiceError\(error/);
const blockerFriendlyError = functionBlock(blockerSetup, "friendlyServiceError", "bindPlatformChoices");
assert.match(blockerFriendlyError, /isTemporaryError\?\.\(error\)/);
const premiumVoiceLoader = functionBlock(storyVoices, "loadPremiumVoices", "sourceButtons");
assert.ok(premiumVoiceLoader.indexOf("try {") < premiumVoiceLoader.indexOf("await sessionToken()"));
const premiumNarration = functionBlock(storyTheater, "playPremiumNarration", "selectVoiceMood");
assert.match(premiumNarration, /try\s*\{\s*token = await storySessionToken\(\)/);
assert.match(premiumNarration, /Your sign-in is safe/);

// Cancelling the in-page goal editor must leave the existing goal untouched;
// state changes belong only to the validated submit path.
assert.match(smartSpending, /#cancelGoal"\)\.addEventListener\("click", closeGoalDialog\)/);
assert.match(smartSpending, /goalDialog\.addEventListener\("cancel", \(event\) => \{\s*event\.preventDefault\(\);\s*closeGoalDialog\(\);/);
assert.doesNotMatch(smartSpending, /\b(?:window\.)?prompt\s*\(/);
const goalSubmitStart = smartSpending.indexOf('goalForm.addEventListener("submit"');
const goalMutation = smartSpending.indexOf("state.goalName = nextGoalName");
assert.ok(goalSubmitStart >= 0 && goalMutation > goalSubmitStart,
  "goal state should change only after the goal form is submitted and validated");

assert.match(packageJson, /"test:session-safety": "node scripts\/test-session-safety\.mjs"/);
new Function(app);
new Function(authSession);

console.log("Session safety passed: stored text is escaped, logout wins session races, and temporary outages preserve saved sign-ins.");
