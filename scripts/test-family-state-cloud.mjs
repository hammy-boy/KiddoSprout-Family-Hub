import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const migrationUrl = new URL("supabase/migrations/20260912101108_create_owner_scoped_family_state.sql", root);
const [source, migration, publicBuilder, serviceWorker, dashboard, index] = await Promise.all([
  readFile(new URL("family-state-cloud.js", root), "utf8"),
  readFile(migrationUrl, "utf8"),
  readFile(new URL("scripts/build-public-demo.mjs", root), "utf8"),
  readFile(new URL("service-worker.js", root), "utf8"),
  readFile(new URL("js.js", root), "utf8"),
  readFile(new URL("index.html", root), "utf8")
]);

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const TOKEN = "header.payload.signature";
const BASE_URL = "https://family-state.supabase.co";
const KEY = "sb_publishable_browser-test";

function loadCloud(windowOverrides = {}) {
  const window = {
    atob,
    navigator: { onLine: true },
    sessionStorage: { getItem: () => null },
    ...windowOverrides
  };
  const sandbox = {
    window,
    AbortController,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    WeakSet,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(source, sandbox, { filename: "family-state-cloud.js" });
  return window.KiddoSproutFamilyState;
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}

function row(state, ownerId = OWNER, updatedAt = "2026-09-12T10:00:00.000Z") {
  return {
    owner_id: ownerId,
    state,
    updated_at: updatedAt
  };
}

async function rejectsKind(promise, kind) {
  await assert.rejects(promise, (failure) => {
    assert.equal(failure?.name, "FamilyStateCloudError");
    assert.equal(failure?.kind, kind);
    return true;
  });
}

const cloud = loadCloud();
assert.ok(cloud, "family state helper should attach to window");
assert.doesNotMatch(source, /localStorage/, "the helper must never read or write persistent browser storage");

const redacted = cloud.safeLocalState({
  themeMode: "night",
  languageMode: "es",
  parentEmail: "private@example.com",
  parentPasscodeRecord: { digest: "private" },
  children: { child: { name: "Private child" } }
});
assert.deepEqual(JSON.parse(JSON.stringify(redacted)), { themeMode: "night", languageMode: "es" });
for (const languageMode of ["fr", "pt", "de"]) {
  assert.deepEqual(
    JSON.parse(JSON.stringify(cloud.safeLocalState({ themeMode: "day", languageMode }))),
    { themeMode: "day", languageMode }
  );
}
assert.deepEqual(
  JSON.parse(JSON.stringify(cloud.safeLocalState({ themeMode: "purple", languageMode: "xx" }))),
  { themeMode: "auto", languageMode: "en-GB" }
);

const sanitized = cloud.sanitizeCloudState({
  familyName: "Family",
  parentPasscode: "1234",
  parentPasscodeRecord: { algorithm: "PBKDF2-SHA-256", digest: "hash", salt: "salt" },
  nested: { access_token: "secret", accountPassword: "secret", token: "generic-secret", idToken: "identity-secret", safe: true }
});
assert.equal("parentPasscode" in sanitized, false);
assert.equal("access_token" in sanitized.nested, false);
assert.equal("accountPassword" in sanitized.nested, false);
assert.equal("token" in sanitized.nested, false);
assert.equal("idToken" in sanitized.nested, false);
assert.equal(sanitized.parentPasscodeRecord.digest, "hash", "the one-way PIN verifier remains available to the family");
assert.equal(sanitized.nested.safe, true);

assert.throws(
  () => cloud.sanitizeCloudState(JSON.parse('{"__proto__":{"polluted":true}}')),
  (failure) => failure?.kind === "validation"
);
const circular = {};
circular.self = circular;
assert.throws(() => cloud.sanitizeCloudState(circular), (failure) => failure?.kind === "validation");
assert.throws(
  () => cloud.sanitizeCloudState({ huge: "x".repeat(cloud.constants.MAX_STATE_BYTES + 1) }),
  (failure) => failure?.kind === "validation"
);

let networkCalls = 0;
const noAuthClient = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async () => { networkCalls += 1; return jsonResponse([]); },
  sessionApi: null
});
await rejectsKind(noAuthClient.load(), "auth");
assert.equal(networkCalls, 0, "missing auth must fail before a Data API request");

const sessionApi = {
  validate: async () => ({ user: { id: OWNER }, access_token: TOKEN }),
  getAccessToken: async () => TOKEN,
  getSession: () => ({ user: { id: OWNER }, access_token: TOKEN }),
  isTemporaryError: () => false
};

networkCalls = 0;
const accountChangedClient = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi: {
    ...sessionApi,
    validate: async () => ({ user: { id: OTHER }, access_token: TOKEN })
  },
  fetchImpl: async () => { networkCalls += 1; return jsonResponse([]); }
});
await rejectsKind(accountChangedClient.load({ expectedOwnerId: OWNER }), "auth");
await rejectsKind(accountChangedClient.save({ familyName: "Must not cross accounts" }, { expectedOwnerId: OWNER }), "auth");
assert.equal(networkCalls, 0, "an account switch must fail before any family read or write request");

networkCalls = 0;
const switchedAfterValidationClient = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi: {
    validate: async () => ({ user: { id: OWNER }, access_token: "owner-token" }),
    getSession: () => ({ user: { id: OTHER }, access_token: "other-owner-token" }),
    isTemporaryError: () => false
  },
  fetchImpl: async () => { networkCalls += 1; return jsonResponse([]); }
});
await rejectsKind(switchedAfterValidationClient.load(), "auth");
assert.equal(networkCalls, 0, "a session changed after validation must fail before a family request");

let calls = [];
let client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi,
  fetchImpl: async (url, options) => {
    calls.push([url, options]);
    return jsonResponse([row({ familyName: "Loaded", themeMode: "day" })]);
  }
});
const loaded = await client.load();
assert.equal(loaded.familyName, "Loaded");
assert.equal(calls.length, 1);
assert.match(calls[0][0], new RegExp(`family_state\\?owner_id=eq\\.${OWNER}`));
assert.match(calls[0][0], /limit=2/);
assert.equal(calls[0][1].headers.Authorization, `Bearer ${TOKEN}`);
assert.equal(calls[0][1].headers.apikey, KEY);
assert.equal(calls[0][1].credentials, "omit");
assert.equal(calls[0][1].cache, "no-store");

calls = [];
client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi,
  fetchImpl: async (url, options) => {
    calls.push([url, options]);
    if (!options.method || options.method === "GET") return jsonResponse([]);
    const body = JSON.parse(options.body);
    return jsonResponse([row(body.state)]);
  }
});
const saved = await client.save({ familyName: "Saved", password: "never", themeMode: "night" });
assert.equal(saved.familyName, "Saved");
assert.equal("password" in saved, false);
assert.equal(calls.length, 2, "an unknown revision must be checked before the first write");
assert.equal(calls[0][1].method, "GET");
assert.equal(calls[1][1].method, "POST");
assert.doesNotMatch(calls[1][0], /on_conflict=/, "creation must not overwrite an existing family row");
assert.equal(calls[1][1].headers.Prefer, "return=representation");
const savedPayload = JSON.parse(calls[1][1].body);
assert.equal(savedPayload.owner_id, OWNER);
assert.equal("password" in savedPayload.state, false);

calls = [];
client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi,
  fetchImpl: async (url, options) => {
    calls.push([url, options]);
    if (!options.method || options.method === "GET") {
      return jsonResponse([row({ familyName: "Before" }, OWNER, "2026-09-12T10:00:00.000Z")]);
    }
    const body = JSON.parse(options.body);
    return jsonResponse([row(body.state, OWNER, "2026-09-12T10:01:00.000Z")]);
  }
});
await client.load();
const updated = await client.save({ familyName: "After" });
assert.equal(updated.familyName, "After");
assert.equal(calls.length, 2);
assert.equal(calls[1][1].method, "PATCH");
assert.match(calls[1][0], /owner_id=eq\.11111111-1111-4111-8111-111111111111/);
assert.match(calls[1][0], /updated_at=eq\.2026-09-12T10%3A00%3A00\.000Z/,
  "updates must be conditional on the revision that was loaded");
assert.equal("owner_id" in JSON.parse(calls[1][1].body), false,
  "updates must not be able to move a row to another owner");

let conflictCalls = 0;
client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi,
  fetchImpl: async (url, options) => {
    conflictCalls += 1;
    if (!options.method || options.method === "GET") {
      return jsonResponse([row({ familyName: "Before" })]);
    }
    return jsonResponse([]);
  }
});
await client.load();
await rejectsKind(client.save({ familyName: "Stale write" }), "conflict");
assert.equal(conflictCalls, 2);
await rejectsKind(client.save({ familyName: "Still stale" }), "conflict");
assert.equal(conflictCalls, 2, "a known stale client must not retry an overwrite before reloading");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi,
  fetchImpl: async (url, options) => {
    if (!options.method || options.method === "GET") return jsonResponse([]);
    return jsonResponse({ code: "23505", message: "duplicate key value violates unique constraint" }, 409);
  }
});
await rejectsKind(client.save({ familyName: "Creation race" }), "conflict");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi,
  fetchImpl: async () => jsonResponse([row({ familyName: "Wrong" }, OTHER)])
});
await rejectsKind(client.load(), "unsafe_response");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi,
  fetchImpl: async () => jsonResponse([row({ familyName: "Unsafe", refreshToken: "never" })])
});
await rejectsKind(client.load(), "unsafe_response");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi,
  online: () => false,
  fetchImpl: async () => { throw new Error("must not fetch"); }
});
await rejectsKind(client.load(), "offline");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi,
  fetchImpl: async () => { throw new TypeError("network down"); }
});
await rejectsKind(client.load(), "network");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  sessionApi,
  fetchImpl: async () => jsonResponse({ code: "PGRST205", message: "Could not find the table in the schema cache" }, 404)
});
await rejectsKind(client.load(), "schema_missing");

assert.throws(
  () => cloud.createClient({ baseUrl: "https://example.com", publishableKey: KEY, sessionApi }),
  (failure) => failure?.kind === "configuration"
);
assert.throws(
  () => cloud.createClient({ baseUrl: BASE_URL, publishableKey: "sb_secret_never", sessionApi }),
  (failure) => failure?.kind === "configuration"
);
assert.throws(
  () => cloud.createClient({ baseUrl: BASE_URL, publishableKey: "arbitrary-key", sessionApi }),
  (failure) => failure?.kind === "configuration"
);
const serviceRoleKey = [
  Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url"),
  Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url"),
  "signature"
].join(".");
assert.throws(
  () => cloud.createClient({ baseUrl: BASE_URL, publishableKey: serviceRoleKey, sessionApi }),
  (failure) => failure?.kind === "configuration"
);

let demoAuthCalls = 0;
const demoCloud = loadCloud({
  KIDDO_SPROUT_SUPABASE: { publicDemoOnly: true },
  KiddoSproutSession: {
    validate: async () => { demoAuthCalls += 1; },
    getAccessToken: async () => { demoAuthCalls += 1; }
  }
});
assert.equal(await demoCloud.load(), null);
assert.equal(await demoCloud.save({ familyName: "Fictional" }), null);
const demoMigration = await demoCloud.migrate({ themeMode: "night", parentEmail: "never@example.com" });
assert.equal(demoMigration.migrated, false);
assert.deepEqual(JSON.parse(JSON.stringify(demoMigration.localState)), { themeMode: "night", languageMode: "en-GB" });
assert.equal(demoAuthCalls, 0, "Demo Mode must not touch auth or cloud storage");

assert.match(migration, /create table if not exists public\.family_state/);
assert.match(migration, /owner_id uuid primary key references auth\.users \(id\) on delete cascade/);
assert.match(migration, /alter table public\.family_state enable row level security/);
assert.match(migration, /for select[\s\S]*?to authenticated[\s\S]*?auth\.uid\(\)[\s\S]*?owner_id/);
assert.match(migration, /for insert[\s\S]*?with check[\s\S]*?auth\.uid\(\)[\s\S]*?owner_id/);
assert.match(migration, /for update[\s\S]*?using[\s\S]*?auth\.uid\(\)[\s\S]*?with check[\s\S]*?auth\.uid\(\)/);
assert.match(migration, /revoke all privileges on table public\.family_state[\s\S]*?from public, anon, authenticated/);
assert.match(migration, /grant select on table public\.family_state to authenticated/);
assert.doesNotMatch(migration, /grant[^;]*family_state[^;]*\bto anon\b/i);
assert.match(publicBuilder, /"family-state-cloud\.js"/);
assert.match(serviceWorker, /"\/family-state-cloud\.js"/);
assert.ok(
  index.indexOf('src="auth-session.js?v=7"') < index.indexOf('src="family-state-cloud.js?v=2"')
  && index.indexOf('src="family-state-cloud.js?v=2"') < index.indexOf('src="js.js?v=41"'),
  "the dashboard must load authenticated session handling before private family storage"
);
assert.match(dashboard, /removeBrowserStorage\(window\.localStorage, FAMILY_STATE_KEY\)/,
  "legacy family state must be erased after its protected cloud migration succeeds");
assert.match(dashboard, /writeBrowserStorage\(window\.localStorage, FAMILY_PREFERENCES_KEY/,
  "only harmless display preferences should remain persistent locally");
assert.match(dashboard, /stageLegacyFamilyStateForMigration\(\)/,
  "failed or offline migrations must retain a sanitized recovery copy until cloud save succeeds");
assert.match(dashboard, /sanitizeCloudState\?\.\(state\)[\s\S]*?writeBrowserStorage\(window\.localStorage, FAMILY_STATE_KEY/,
  "the temporary migration copy must be sanitized before it replaces readable legacy data");
assert.match(dashboard, /await operation;[\s\S]*?clearMigratedLegacyFamilyState\(getKiddoSession\(\)\)/,
  "legacy recovery state must only be cleared after a confirmed cloud write");
assert.match(dashboard, /await familyStateApi\.load\(\{ expectedOwnerId: ownerId \}\)/);
assert.match(dashboard, /await familyStateApi\.migrate\(state, \{ expectedOwnerId: ownerId \}\)/,
  "the migration must upload the cleaned in-memory state, including the upgraded PIN verifier");
assert.doesNotMatch(dashboard, /familyStateApi\.migrate\(legacyLocalFamilyState\)/,
  "the original readable legacy object must never be uploaded");
assert.match(dashboard, /return familyStateApi\.save\(snapshot, \{ expectedOwnerId: ownerId \}\)/);
assert.match(dashboard, /familyStateOwnerId === ownerId && familyStateCloudReady/,
  "A previous empty cloud lookup must not be mistaken for a loaded family row on retry.");
assert.match(dashboard, /familyStateCloudReady = Boolean\(cloudState\)/);
assert.match(dashboard, /await operation;[\s\S]*?familyStateCloudReady = true/,
  "A successful first owner save should make later same-owner hydration authoritative.");

console.log("Family-state cloud checks passed: owner REST, redaction, demo/offline isolation, and RLS migration are safe.");
