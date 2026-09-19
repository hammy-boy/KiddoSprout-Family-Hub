import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const RECIPE_CATALOG_ASSET = "recipe-catalog-v5342473ad68b.js";
const [clientSource, recipeHtml, recipeCatalogSource, migration, hardeningMigration, config, serviceWorker] = await Promise.all([
  readFile(new URL("recipe-cloud.js", root), "utf8"),
  readFile(new URL("recipe.html", root), "utf8"),
  readFile(new URL(RECIPE_CATALOG_ASSET, root), "utf8"),
  readFile(new URL("supabase/migrations/20260831155556_create_recipes.sql", root), "utf8"),
  readFile(new URL("supabase/migrations/20260908221644_harden_recipe_payload_and_metadata.sql", root), "utf8"),
  readFile(new URL("supabase/config.toml", root), "utf8"),
  readFile(new URL("service-worker.js", root), "utf8")
]);

const sandbox = {
  window: {
    atob: (value) => Buffer.from(value, "base64").toString("utf8")
  },
  AbortController,
  TextDecoder,
  TextEncoder,
  Uint8Array,
  setTimeout,
  clearTimeout
};
vm.runInNewContext(clientSource, sandbox, { filename: "recipe-cloud.js" });
const cloud = sandbox.window.KiddoSproutRecipeCloud;
assert.ok(cloud, "recipe cloud library should attach to the browser window");

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER_OWNER = "22222222-2222-4222-8222-222222222222";
const RECIPE_ID = "33333333-3333-4333-8333-333333333333";
const SECOND_ID = "44444444-4444-4444-8444-444444444444";
const TOKEN = "header.payload.signature";
const BASE_URL = "https://family-recipes.supabase.co";
const KEY = "sb_publishable_recipe-test-key";
const input = {
  title: "  Family Tacos  ",
  category: "  Dinner  ",
  ingredients: ["  beans  ", "cheese"],
  steps: ["  Warm the beans.  ", "Fill the shells."]
};
const normalized = {
  title: "Family Tacos",
  category: "Dinner",
  ingredients: ["beans", "cheese"],
  steps: ["Warm the beans.", "Fill the shells."]
};

function row(overrides = {}) {
  return {
    id: RECIPE_ID,
    user_id: OWNER,
    ...normalized,
    created_at: "2026-09-08T00:00:00.000Z",
    ...overrides
  };
}

function jsonResponse(payload, options = {}) {
  return new Response(JSON.stringify(payload), {
    status: options.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(options.headers || {})
    }
  });
}

async function rejectsKind(promise, kind) {
  await assert.rejects(promise, (error) => {
    assert.equal(error?.name, "RecipeCloudError");
    assert.equal(error?.kind, kind);
    return true;
  });
}

function legacyJwt(role) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role })}.signature`;
}

assert.throws(
  () => cloud.createClient({ baseUrl: "https://example.com", publishableKey: KEY, fetchImpl: async () => {} }),
  (error) => error.kind === "configuration"
);
for (const unsafeKey of ["sb_secret_private-server-key", legacyJwt("service_role"), "arbitrary-key"]) {
  assert.throws(
    () => cloud.createClient({ baseUrl: BASE_URL, publishableKey: unsafeKey, fetchImpl: async () => {} }),
    (error) => error.kind === "configuration",
    `browser recipe storage accepted an unsafe Supabase key: ${unsafeKey}`
  );
}
assert.doesNotThrow(
  () => cloud.createClient({ baseUrl: BASE_URL, publishableKey: legacyJwt("anon"), fetchImpl: async () => {} }),
  "legacy anon keys should remain supported during Supabase key migration"
);

let calls = [];
let client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async (...args) => {
    calls.push(args);
    return jsonResponse([row()]);
  }
});

await rejectsKind(client.list("", OWNER), "validation");
assert.equal(calls.length, 0, "missing auth must fail before any network request");

const listed = await client.list(TOKEN, OWNER);
assert.equal(listed.length, 1);
assert.equal(listed[0].title, normalized.title);
assert.equal(calls.length, 1);
const [listUrl, listOptions] = calls[0];
assert.match(listUrl, new RegExp(`user_id=eq\\.${OWNER}`));
assert.match(listUrl, /limit=501/);
assert.match(listUrl, /select=id%2Cuser_id%2Ctitle%2Ccategory%2Cingredients%2Csteps%2Ccreated_at/);
assert.equal(listOptions.method, "GET");
assert.equal(listOptions.headers.Authorization, `Bearer ${TOKEN}`);
assert.equal(listOptions.headers.apikey, KEY);
assert.equal(listOptions.credentials, "omit");
assert.equal(listOptions.cache, "no-store");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async () => jsonResponse([row({ user_id: OTHER_OWNER })])
});
await rejectsKind(client.list(TOKEN, OWNER), "unsafe_response");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async () => jsonResponse({ code: "PGRST205", message: "Could not find the table public.recipes in the schema cache" }, { status: 404 })
});
await rejectsKind(client.list(TOKEN, OWNER), "schema_missing");

client = cloud.createClient({ baseUrl: BASE_URL, publishableKey: KEY, fetchImpl: async () => { throw new TypeError("offline"); } });
await rejectsKind(client.list(TOKEN, OWNER), "network");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  timeoutMs: 5,
  fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
  })
});
await rejectsKind(client.list(TOKEN, OWNER), "timeout");

for (const [status, body, expectedKind] of [
  [401, "login required", "auth"],
  [403, "forbidden", "permission"],
  [429, "too many requests", "unavailable"],
  [503, "maintenance", "unavailable"]
]) {
  client = cloud.createClient({
    baseUrl: BASE_URL,
    publishableKey: KEY,
    fetchImpl: async () => new Response(body, { status, headers: { "content-type": "text/plain" } })
  });
  await rejectsKind(client.list(TOKEN, OWNER), expectedKind);
}

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async () => new Response("<html>not json</html>", { status: 200, headers: { "content-type": "text/html" } })
});
await rejectsKind(client.list(TOKEN, OWNER), "invalid_response");

let declaredBodyCancelled = false;
const declaredLargeStream = new ReadableStream({
  pull(controller) { controller.enqueue(new Uint8Array([123, 125])); controller.close(); },
  cancel() { declaredBodyCancelled = true; }
});
client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async () => new Response(declaredLargeStream, {
    status: 200,
    headers: { "content-type": "application/json", "content-length": String(cloud.constants.MAX_RESPONSE_BYTES + 1) }
  })
});
await rejectsKind(client.list(TOKEN, OWNER), "invalid_response");
assert.equal(declaredBodyCancelled, true, "declared oversized response should be cancelled before reading");

let streamedBodyCancelled = false;
let streamedChunks = 0;
const oversizedStream = new ReadableStream({
  pull(controller) {
    streamedChunks += 1;
    controller.enqueue(new Uint8Array(1024 * 1024));
    if (streamedChunks >= 4) controller.close();
  },
  cancel() { streamedBodyCancelled = true; }
});
client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async () => new Response(oversizedStream, { status: 200, headers: { "content-type": "application/json" } })
});
await rejectsKind(client.list(TOKEN, OWNER), "invalid_response");
assert.equal(streamedBodyCancelled, true, "chunked oversized response should be cancelled while streaming");

const tooManyRows = Array.from({ length: 501 }, (_, index) => row({
  id: index === 0 ? RECIPE_ID : `${String(index).padStart(8, "0")}-0000-4000-8000-000000000000`
}));
client = cloud.createClient({ baseUrl: BASE_URL, publishableKey: KEY, fetchImpl: async () => jsonResponse(tooManyRows) });
await rejectsKind(client.list(TOKEN, OWNER), "invalid_response");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async () => jsonResponse([row(), row()])
});
await rejectsKind(client.list(TOKEN, OWNER), "invalid_response");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async () => jsonResponse([row({ title: { deceptive: true } })])
});
await rejectsKind(client.list(TOKEN, OWNER), "invalid_response");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async () => jsonResponse([row({ created_at: null })])
});
await rejectsKind(client.list(TOKEN, OWNER), "invalid_response");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async () => jsonResponse([row({ id: RECIPE_ID.toUpperCase(), user_id: OWNER.toUpperCase() })])
});
const canonicalRows = await client.list(TOKEN, OWNER.toUpperCase());
assert.equal(canonicalRows[0].id, RECIPE_ID);
assert.equal(canonicalRows[0].user_id, OWNER,
  "valid UUIDs should use one canonical case before ownership comparisons");

calls = [];
client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async (url, options) => {
    calls.push([url, options]);
    if (options.method === "POST") return jsonResponse([row()]);
    if (options.method === "PATCH") return jsonResponse([row({ id: SECOND_ID, title: "Updated Tacos" })]);
    if (options.method === "DELETE") return jsonResponse([row({ id: SECOND_ID, title: "Updated Tacos" })]);
    throw new Error("unexpected method");
  }
});

const created = await client.create(TOKEN, OWNER, { ...input, user_id: OTHER_OWNER });
assert.equal(created.user_id, OWNER);
let payload = JSON.parse(calls[0][1].body);
assert.deepEqual(payload, { ...normalized, user_id: OWNER });
assert.equal(calls[0][1].method, "POST");
assert.equal(calls[0][1].headers.Prefer, "return=representation");

const updated = await client.update(TOKEN, OWNER, SECOND_ID, { ...input, title: "Updated Tacos", user_id: OTHER_OWNER });
assert.equal(updated.id, SECOND_ID);
assert.match(calls[1][0], new RegExp(`id=eq\\.${SECOND_ID}`));
assert.match(calls[1][0], new RegExp(`user_id=eq\\.${OWNER}`));
payload = JSON.parse(calls[1][1].body);
assert.equal("id" in payload, false);
assert.equal("user_id" in payload, false);
assert.equal(calls[1][1].method, "PATCH");

const removed = await client.remove(TOKEN, OWNER, SECOND_ID);
assert.equal(removed.id, SECOND_ID);
assert.match(calls[2][0], new RegExp(`id=eq\\.${SECOND_ID}`));
assert.match(calls[2][0], new RegExp(`user_id=eq\\.${OWNER}`));
assert.equal(calls[2][1].method, "DELETE");

client = cloud.createClient({ baseUrl: BASE_URL, publishableKey: KEY, fetchImpl: async () => jsonResponse([]) });
await rejectsKind(client.update(TOKEN, OWNER, RECIPE_ID, input), "not_found");
await rejectsKind(client.remove(TOKEN, OWNER, RECIPE_ID), "not_found");

client = cloud.createClient({
  baseUrl: BASE_URL,
  publishableKey: KEY,
  fetchImpl: async (_url, options) => jsonResponse([row({ id: SECOND_ID })])
});
await rejectsKind(client.update(TOKEN, OWNER, RECIPE_ID, input), "unsafe_response");
await rejectsKind(client.remove(TOKEN, OWNER, RECIPE_ID), "unsafe_response");

assert.throws(
  () => cloud.normalizeRecipeInput({ ...input, ingredients: ["x".repeat(1001)] }),
  (error) => error.kind === "validation"
);
assert.throws(
  () => cloud.normalizeRecipeInput({ ...input, steps: Array.from({ length: 101 }, () => "step") }),
  (error) => error.kind === "validation"
);
assert.throws(
  () => cloud.normalizeRecipeInput({ ...input, steps: ["x".repeat(4001)] }),
  (error) => error.kind === "validation"
);
assert.throws(
  () => cloud.normalizeRecipeInput({ ...input, ingredients: Array.from({ length: 100 }, () => "😀".repeat(300)) }),
  (error) => error.kind === "validation"
);
assert.throws(
  () => cloud.normalizeRecipeInput({ ...input, title: { toString: () => "Deceptive title" } }),
  (error) => error.kind === "validation"
);
assert.throws(
  () => cloud.normalizeRecipeInput({ ...input, ingredients: ["beans", 7] }),
  (error) => error.kind === "validation"
);
assert.throws(
  () => cloud.normalizeRecipeInput({ ...input, category: false }),
  (error) => error.kind === "validation"
);
assert.throws(
  () => cloud.normalizeRecipeInput({ ...input, title: "..." }),
  (error) => error.kind === "validation" && /readable text/i.test(error.message),
  "punctuation-only recipe names should not reach PostgREST"
);
assert.throws(
  () => cloud.normalizeRecipeInput({ ...input, ingredients: ["\u0000hidden"] }),
  (error) => error.kind === "validation" && /readable text/i.test(error.message),
  "database-invalid control characters should fail before a network request"
);
assert.throws(
  () => cloud.normalizeRecipeInput({ ...input, steps: ["---"] }),
  (error) => error.kind === "validation" && /readable text/i.test(error.message),
  "steps need meaningful letters or numbers"
);
assert.equal(cloud.normalizeRecipeInput({ ...input, category: "   " }).category, "Other");

const supabaseConfigScript = recipeHtml.indexOf('<script src="supabase-config.js?v=7"></script>');
const demoModeScript = recipeHtml.indexOf('<script src="demo-mode.js?v=2"></script>');
const authSessionScript = recipeHtml.indexOf('<script src="auth-session.js?v=7"></script>');
const familyStateScript = recipeHtml.indexOf('<script src="family-state-cloud.js?v=2"></script>');
const recipeCloudScript = recipeHtml.indexOf('<script src="recipe-cloud.js?v=3"></script>');
const recipeCatalogScript = recipeHtml.indexOf(`<script src="${RECIPE_CATALOG_ASSET}"`);
assert.ok(supabaseConfigScript >= 0 && demoModeScript > supabaseConfigScript
  && authSessionScript > demoModeScript && familyStateScript > authSessionScript
  && recipeCloudScript > familyStateScript && recipeCatalogScript > recipeCloudScript,
"FlavorNest should load configuration, demo isolation, shared auth, owner-scoped family state, recipe storage, then its same-origin catalogue in that order");
const cleanSupabaseKeySource = recipeHtml.match(/function cleanSupabaseKey\(value\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(cleanSupabaseKeySource, "FlavorNest should validate its browser Supabase key before enabling cloud features");
const cleanSupabaseKey = new Function("window", `${cleanSupabaseKeySource}; return cleanSupabaseKey;`)({
  KiddoSproutRecipeCloud: cloud
});
assert.equal(cleanSupabaseKey(KEY), KEY);
assert.equal(cleanSupabaseKey(legacyJwt("anon")), legacyJwt("anon"));
assert.equal(cleanSupabaseKey("sb_secret_private-server-key"), "");
assert.equal(cleanSupabaseKey(legacyJwt("service_role")), "");
assert.equal(cleanSupabaseKey("arbitrary-key"), "");
assert.equal(createHash("sha256").update(recipeCatalogSource).digest("hex").slice(0, 12), "5342473ad68b",
  "the immutable recipe catalogue filename must match its current bytes");
const recipeCatalogIntegrity = `sha384-${createHash("sha384").update(recipeCatalogSource).digest("base64")}`;
assert.match(recipeHtml, new RegExp(`<script src="${RECIPE_CATALOG_ASSET.replaceAll(".", "\\.")}" integrity="${recipeCatalogIntegrity.replace(/[+/=]/g, "\\$&")}"></script>`),
  "the browser must verify the external recipe catalogue before executing it");
assert.doesNotMatch(recipeHtml, /const (?:EMBEDDED|CUSTOM)_RECIPES = \[/,
  "the large built-in catalogue must not be embedded in the recipe document");
assert.ok(Buffer.byteLength(recipeHtml) < 250 * 1024,
  "recipe.html should stay below 250 KiB after extracting its cacheable catalogue");
const recipeCatalogSandbox = { window: {} };
vm.runInNewContext(recipeCatalogSource, recipeCatalogSandbox, { filename: RECIPE_CATALOG_ASSET });
const externalRecipeCatalog = recipeCatalogSandbox.window.KiddoSproutRecipeCatalog;
assert.ok(externalRecipeCatalog && Object.isFrozen(externalRecipeCatalog));
assert.equal(externalRecipeCatalog.version, 1);
assert.equal(externalRecipeCatalog.embedded.length, 463,
  "all 463 original built-in recipes must remain in the external catalogue");
assert.ok(externalRecipeCatalog.custom.length > 0, "the curated recipe additions are missing");
assert.match(recipeHtml, /function fetchAllRecipes\(access_token, user_id\)[\s\S]*?\.list\(access_token, user_id\)/);
assert.doesNotMatch(recipeHtml, /async function fetchAllRecipes[\s\S]{0,800}catch\s*\([^)]*\)\s*\{\s*return/);
assert.match(recipeHtml, /Family recipe storage has not been installed yet[\s\S]*?built-in recipes/);
assert.match(recipeHtml, /Cloud recipes cannot be reached right now[\s\S]*?saving is paused/);
assert.match(recipeHtml, /state\.recipeMode === "cloud"[\s\S]*?state\.authorizedOwnerId/);
assert.match(recipeHtml, /Interactive demo recipe book:[\s\S]*?Changes stay only in this tab; accounts and cloud syncing remain off/);
assert.match(recipeHtml, /const RECIPE_DEMO_STORAGE_KEY = "kiddosprout\.demo\.v1\.flavornest-recipes"/);
assert.match(recipeHtml, /function canWriteDemoRecipes\(\)[\s\S]*?state\.recipeMode === "demo"/);
assert.match(recipeHtml, /if \(canWriteDemoRecipes\(\)\) \{[\s\S]*?writeDemoRecipes\(nextRecipes\)[\s\S]*?return;/,
  "the practice editor must finish through tab-only storage before reaching cloud mutation code");
assert.match(recipeHtml, /async function bootFlavorNest\(\)[\s\S]*?if \(isKiddoSproutDemoMode\(\)\) \{\s*startReadOnlyRecipeBrowse\(\);\s*return;/);
assert.doesNotMatch(recipeHtml.match(/function startReadOnlyRecipeBrowse\(\) \{[\s\S]*?\n\}/)?.[0] || "", /fetch\(|getRecipeCloudClient|restoreSession/);
assert.match(recipeHtml, /async function hydrateExactPhotos\(recipes, generation = photoHydrationGeneration\) \{[\s\S]*?if \(isKiddoSproutDemoMode\(\) \|\| generation !== photoHydrationGeneration\) return;[\s\S]*?\.filter\(\(recipe\) => recipe && recipe\._source !== "cloud"\);/);
assert.match(recipeHtml, /function foodMediaHtml\(r,[\s\S]*?r\._source === "cloud"\s*\?\s*""/);
assert.match(recipeHtml, /state\.recipeMode === "cloud"[\s\S]*?title: "Cloud recipes loaded"/);

const normalizeKiddoRequestSource = recipeHtml.match(/function normalizeKiddoSproutRequest\(request\) \{[\s\S]*?\n\}/)?.[0];
const getKiddoChildSource = recipeHtml.match(/function getKiddoSproutActiveChild\(family\) \{[\s\S]*?\n\}/)?.[0];
const queueKiddoRequestSource = recipeHtml.match(/function queueKiddoSproutRequest\(family, appId, appTitle\) \{[\s\S]*?\n\}/)?.[0];
const requestKiddoAccessSource = recipeHtml.match(/async function requestKiddoSproutAccess\(appId, appTitle, family, familyCloud\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(normalizeKiddoRequestSource && getKiddoChildSource && queueKiddoRequestSource && requestKiddoAccessSource,
  "FlavorNest should share KiddoSprout's bounded request-queue behaviour");
const familyState = {
  activeChild: "child-1",
  children: {
    "child-1": {
      pending: 1,
      currentRequest: ["Older request", "Already waiting", "O", "appAccess", "older"],
      requests: [["Older request", "Already waiting", "O", "appAccess", "older"]]
    }
  }
};
const recipeRequests = vm.runInNewContext(`(() => {
  ${normalizeKiddoRequestSource}
  ${getKiddoChildSource}
  ${queueKiddoRequestSource}
  ${requestKiddoAccessSource}
  return { send: requestKiddoSproutAccess };
})()`);
let cloudWrites = [];
let familyCloud = { save: async (family) => { cloudWrites.push(structuredClone(family)); } };
let queuedFamily = structuredClone(familyState);
assert.equal(await recipeRequests.send("recipe", "FlavorNest", queuedFamily, familyCloud), "sent");
assert.equal(queuedFamily.children["child-1"].pending, 2);
assert.equal(queuedFamily.children["child-1"].requests[0][0], "Older request",
  "a FlavorNest request must not overwrite an older request");
assert.equal(queuedFamily.children["child-1"].requests[1][0], "FlavorNest");
assert.equal(cloudWrites.length, 1, "a new approval request must be persisted through owner-scoped cloud storage");
assert.equal(await recipeRequests.send("recipe", "FlavorNest", queuedFamily, familyCloud), "duplicate",
  "refreshing a gated FlavorNest page must not add duplicate requests");
assert.equal(queuedFamily.children["child-1"].pending, 2);
queuedFamily.children["child-1"].requests = Array.from({ length: 100 }, (_, index) => [
  `Request ${index}`, "Waiting", "R", "appAccess", `app-${index}`
]);
queuedFamily.children["child-1"].pending = 100;
queuedFamily.children["child-1"].currentRequest = [...queuedFamily.children["child-1"].requests[0]];
assert.equal(await recipeRequests.send("recipe", "FlavorNest", queuedFamily, familyCloud), "full",
  "FlavorNest must not grow the parent request queue without a bound");
assert.equal(queuedFamily.children["child-1"].requests.length, 100);
assert.equal(await recipeRequests.send("recipe", "FlavorNest", { activeChild: "__proto__", children: {}, parentAccountCreated: true }, familyCloud), "unavailable",
  "a corrupted or inherited child key must fail closed");
assert.equal(await recipeRequests.send("recipe", "FlavorNest", { activeChild: "child-1", children: { "child-1": "not-a-profile" }, parentAccountCreated: true }, familyCloud), "unavailable",
  "a malformed child profile must not report that a request was saved");
queuedFamily = structuredClone(familyState);
familyCloud = { save: async () => { throw new Error("cloud unavailable"); } };
assert.equal(await recipeRequests.send("recipe", "FlavorNest", queuedFamily, familyCloud), "unavailable",
  "a failed cloud write must not claim that the parent request was sent");
assert.match(recipeHtml, /kiddoSproutRequestMessage\(requestResult\)/,
  "the gate should explain duplicate, full, and cloud-failure outcomes truthfully");
assert.doesNotMatch(recipeHtml, /kiddosproutState/,
  "FlavorNest must never authorize from or write the obsolete plaintext family-state key");
const gateSource = recipeHtml.match(/async function canOpenKiddoSproutApp\(appId, appTitle, expectedOwnerId = ""\) \{[\s\S]*?(?=\n\n\/\/ ---- Built-in focus music)/)?.[0] || "";
assert.match(gateSource, /await validatedRecipeAccess\(expectedOwnerId\)/);
assert.match(gateSource, /ownerBoundFamilyCloud\(initialAccess\.ownerId\)/);
assert.match(gateSource, /await familyCloud\.load\(\)/);
assert.match(gateSource, /await validatedRecipeAccess\(initialAccess\.ownerId\)/,
  "the gate should stay bound to the same validated owner across its cloud read");

// Exercise FlavorNest's real (non-demo) authorization branch with the shared
// session and owner-scoped family APIs mocked at their browser boundaries.
const realGateHarnessSource = recipeHtml.match(/function recipeSessionError\(kind, message, cause\) \{[\s\S]*?(?=\n\n\/\/ ---- Built-in focus music)/)?.[0];
assert.ok(realGateHarnessSource, "the real FlavorNest gate should be executable in isolation");
let liveGateSession = {
  access_token: TOKEN,
  refresh_token: "refresh-token",
  user: { id: OWNER, email: "parent@example.com" }
};
let gateValidationCalls = 0;
let gateTokenCalls = 0;
let gateFamilyLoads = 0;
let gateFamilySaves = 0;
let switchOwnerDuringLoad = false;
let gateFamily = {
  parentAccountCreated: true,
  activeChild: "child-1",
  children: {
    "child-1": { appRules: { recipe: "allowed" }, requests: [], pending: 0 }
  }
};
let familyClientOptions = null;
const sharedGateSession = {
  validate: async () => {
    gateValidationCalls += 1;
    return liveGateSession;
  },
  getAccessToken: async () => {
    gateTokenCalls += 1;
    return liveGateSession.access_token;
  },
  getSession: () => liveGateSession,
  isTemporaryError: () => false
};
const sharedGateFamily = {
  createClient: (options) => {
    familyClientOptions = options;
    return {
      load: async () => {
        gateFamilyLoads += 1;
        if (switchOwnerDuringLoad) {
          liveGateSession = {
            ...liveGateSession,
            access_token: "other-token",
            user: { id: OTHER_OWNER, email: "other@example.com" }
          };
        }
        await options.sessionApi.validate();
        await options.sessionApi.getAccessToken();
        return structuredClone(gateFamily);
      },
      save: async () => {
        gateFamilySaves += 1;
        await options.sessionApi.validate();
        await options.sessionApi.getAccessToken();
      }
    };
  },
  isTemporaryError: () => false
};
const gateState = { authorizedOwnerId: "", session: null };
let renderedGate = null;
const realGate = vm.runInNewContext(`(() => {
  ${realGateHarnessSource}
  return { open: canOpenKiddoSproutApp };
})()`, {
  window: {
    KiddoSproutSession: sharedGateSession,
    KiddoSproutFamilyState: sharedGateFamily
  },
  state: gateState,
  SUPABASE_CONNECTED: true,
  SUPABASE_URL: BASE_URL,
  SUPABASE_PUBLISHABLE_KEY: KEY,
  kiddoSproutGate: null,
  showKiddoSproutGate: (title, message) => { renderedGate = { title, message }; }
});
assert.equal(await realGate.open("recipe", "FlavorNest"), true);
assert.equal(gateState.authorizedOwnerId, OWNER);
assert.equal(gateState.session.user.id, OWNER);
assert.equal(gateFamilyLoads, 1);
assert.ok(gateValidationCalls >= 3 && gateTokenCalls >= 3,
  "the gate should revalidate its shared session before, during, and after the owner-scoped family read");
assert.equal(familyClientOptions.baseUrl, BASE_URL);
assert.equal(familyClientOptions.publishableKey, KEY);
assert.equal(renderedGate, null);

gateState.authorizedOwnerId = "";
gateState.session = null;
gateFamily.children["child-1"].appRules.recipe = "request";
assert.equal(await realGate.open("recipe", "FlavorNest"), false);
assert.equal(gateFamilySaves, 1, "a real-mode approval request must use owner-scoped cloud save");
assert.equal(renderedGate?.title, "Ask a parent first");

liveGateSession = {
  access_token: TOKEN,
  refresh_token: "refresh-token",
  user: { id: OWNER, email: "parent@example.com" }
};
gateState.authorizedOwnerId = "";
gateState.session = null;
gateFamily.children["child-1"].appRules.recipe = "allowed";
switchOwnerDuringLoad = true;
assert.equal(await realGate.open("recipe", "FlavorNest"), false,
  "an account switch during the family read must fail closed");
assert.equal(gateState.authorizedOwnerId, "");
assert.equal(renderedGate?.title, "KiddoSprout check failed");

const recipeIdentitySource = recipeHtml.match(/function recipeIdentityText\(value\) \{[\s\S]*?\n\}/)?.[0];
const dedupeBuiltInsSource = recipeHtml.match(/function dedupeBuiltInRecipes\(recipes\) \{[\s\S]*?\n\}/)?.[0];
const mergeCustomRecipesSource = recipeHtml.match(/function mergeCustomRecipes\(recipes\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(recipeIdentitySource && dedupeBuiltInsSource && mergeCustomRecipesSource,
  "the built-in recipe collection should have a deterministic de-duplicator");
const dedupeBuiltIns = vm.runInNewContext(`(() => {
  const CUSTOM_RECIPES = ${JSON.stringify(externalRecipeCatalog.custom)};
  ${recipeIdentitySource}
  ${dedupeBuiltInsSource}
  ${mergeCustomRecipesSource}
  return {
    recipes: CUSTOM_RECIPES,
    embeddedRecipes: ${JSON.stringify(externalRecipeCatalog.embedded)},
    dedupeBuiltInRecipes,
    mergeCustomRecipes
  };
})()`);
const uniqueBuiltIns = dedupeBuiltIns.dedupeBuiltInRecipes(dedupeBuiltIns.recipes);
assert.ok(uniqueBuiltIns.length < dedupeBuiltIns.recipes.length,
  "the source collection contains historical duplicates that must not reach the UI");
const whitespaceDuplicates = dedupeBuiltIns.dedupeBuiltInRecipes([
  { id: "one", title: "Family   Pie" },
  { id: "two", title: " family pie " }
]);
assert.equal(whitespaceDuplicates.length, 1);
assert.equal(whitespaceDuplicates[0].id, "two",
  "the newest edition should win when titles differ only by spacing or case");
assert.equal(new Set(uniqueBuiltIns.map((recipe) => recipe.id.toLowerCase())).size, uniqueBuiltIns.length);
assert.equal(new Set(uniqueBuiltIns.map((recipe) => recipe.title.trim().toLowerCase())).size, uniqueBuiltIns.length);
assert.equal(uniqueBuiltIns.find((recipe) => recipe.title === "Cullen Skink")?.category, "British Soups",
  "when an old recipe was replaced, the newest curated edition should win");
const fullBuiltInCollection = dedupeBuiltIns.mergeCustomRecipes(dedupeBuiltIns.embeddedRecipes);
assert.equal(new Set(fullBuiltInCollection.map((recipe) => recipe.id.toLowerCase())).size, fullBuiltInCollection.length,
  "embedded and custom recipes should not expose duplicate IDs together");
assert.equal(new Set(fullBuiltInCollection.map((recipe) => recipe.title.trim().toLowerCase())).size, fullBuiltInCollection.length,
  "embedded and custom recipes should not expose duplicate titles together");
for (const recipe of fullBuiltInCollection) {
  assert.ok(typeof recipe.id === "string" && recipe.id.trim());
  assert.ok(typeof recipe.title === "string" && recipe.title.trim());
  assert.ok(typeof recipe.category === "string" && recipe.category.trim());
  assert.ok(Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0);
  assert.ok(Array.isArray(recipe.steps) && recipe.steps.length > 0);
}
const requestedFamilyRecipes = new Map([
  ["Fluffy Waffles", ["waffle maker", "adult"]],
  ["Easy Vanilla Cake", ["cake tin", "adult"]],
  ["Bean and Cheese Burritos", ["black beans", "adult"]],
  ["Rainbow Veggie Tacos", ["tortillas", "adult"]]
]);
for (const [title, requiredWords] of requestedFamilyRecipes) {
  const recipe = fullBuiltInCollection.find((item) => item.title === title);
  assert.ok(recipe, `${title} should stay in the built-in FlavorNest collection`);
  assert.equal(recipe.category, "Family Favourites");
  const recipeText = [...recipe.ingredients, ...recipe.steps].join(" ").toLowerCase();
  for (const word of requiredWords) {
    assert.match(recipeText, new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "i"), `${title} should include ${word}`);
  }
}

const recipeTitleInitialsSource = recipeHtml.match(/function recipeTitleInitials\(value\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(recipeTitleInitialsSource, "recipe placeholder initials should be independently testable");
const recipeTitleInitials = vm.runInNewContext(`(() => {
  ${recipeTitleInitialsSource}
  return recipeTitleInitials;
})()`);
assert.equal(recipeTitleInitials("Abacha (African Salad)"), "AS",
  "parenthesized recipe titles should use clean first-and-last word initials");
assert.equal(recipeTitleInitials("Crème brûlée"), "CB");
assert.equal(recipeTitleInitials("()"), "FOOD",
  "punctuation-only titles should retain a readable placeholder");

const normalizeRecipeSearchSource = recipeHtml.match(/function normalizeRecipeSearchText\(value\) \{[\s\S]*?\n\}/)?.[0];
const getFilteredRecipesSource = recipeHtml.match(/function getFilteredRecipes\(\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(normalizeRecipeSearchSource && getFilteredRecipesSource,
  "recipe search helpers should be independently testable");
const recipeSearch = vm.runInNewContext(`(() => {
  let state = {
    searchQuery: "",
    selectedCategory: "All",
    recipes: [
      { id: "1", title: "Crème brûlée", category: "French Desserts", ingredients: ["Cream", "vanilla"] },
      { id: "2", title: "Family Tacos", category: "Mexican", ingredients: ["Black beans", "corn"] },
      { id: "3", title: "Tomato Soup", category: "Soup", ingredients: ["Tomatoes"] }
    ]
  };
  ${normalizeRecipeSearchSource}
  ${getFilteredRecipesSource}
  return {
    find: (query, category = "All") => {
      state.searchQuery = query;
      state.selectedCategory = category;
      return getFilteredRecipes().map((recipe) => recipe.id);
    }
  };
})()`);
assert.deepEqual(Array.from(recipeSearch.find(" creme   brulee ")), ["1"],
  "search should be whitespace- and accent-tolerant");
assert.deepEqual(Array.from(recipeSearch.find("french desserts")), ["1"],
  "search should include category names");
assert.deepEqual(Array.from(recipeSearch.find("black beans")), ["2"],
  "search should include ingredient text");
assert.deepEqual(Array.from(recipeSearch.find("", "Soup")), ["3"],
  "category filtering should continue to combine with search");

const getCategoriesSource = recipeHtml.match(/function getCategories\(\) \{[\s\S]*?\n\}/)?.[0];
const reconcileCategorySource = recipeHtml.match(/function reconcileSelectedRecipeCategory\(categories\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(getCategoriesSource && reconcileCategorySource,
  "category reconciliation helpers should exist");
const categoryReconciliation = vm.runInNewContext(`(() => {
  const RECIPE_PAGE_SIZE = 30;
  let state = {
    recipes: [{ category: "Soup" }],
    selectedCategory: "Removed category",
    visibleRecipeLimit: 90
  };
  ${getCategoriesSource}
  function resetRecipePage() { state.visibleRecipeLimit = RECIPE_PAGE_SIZE; }
  ${reconcileCategorySource}
  const categories = getCategories();
  reconcileSelectedRecipeCategory(categories);
  return { categories, selectedCategory: state.selectedCategory, visibleRecipeLimit: state.visibleRecipeLimit };
})()`);
assert.deepEqual(Array.from(categoryReconciliation.categories), ["All", "Soup"]);
assert.equal(categoryReconciliation.selectedCategory, "All");
assert.equal(categoryReconciliation.visibleRecipeLimit, 30,
  "a removed category should return to All and reset paging");

const recipeCategoryLimitSource = recipeHtml.match(/const RECIPE_CATEGORY_INITIAL_LIMIT = \d+;/)?.[0];
const visibleRecipeCategoryEntriesSource = recipeHtml.match(/function visibleRecipeCategoryEntries\(categories\) \{[\s\S]*?\n\}/)?.[0];
const recipeCategoryChipsHtmlSource = recipeHtml.match(/function recipeCategoryChipsHtml\(categories\) \{[\s\S]*?\n\}/)?.[0];
const recipeCategoryMoreButtonHtmlSource = recipeHtml.match(/function recipeCategoryMoreButtonHtml\(categories\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(recipeCategoryLimitSource && visibleRecipeCategoryEntriesSource
  && recipeCategoryChipsHtmlSource && recipeCategoryMoreButtonHtmlSource,
"category paging and roving-Tab helpers should be independently testable");
const categoryControls = vm.runInNewContext(`(() => {
  ${recipeCategoryLimitSource}
  let showAllRecipeCategories = false;
  const state = { selectedCategory: "All" };
  const esc = (value) => String(value);
  ${visibleRecipeCategoryEntriesSource}
  ${recipeCategoryChipsHtmlSource}
  ${recipeCategoryMoreButtonHtmlSource}
  return {
    chips: (categories) => recipeCategoryChipsHtml(categories),
    more: (categories) => recipeCategoryMoreButtonHtml(categories),
    select: (category) => { state.selectedCategory = category; },
    expand: () => { showAllRecipeCategories = true; }
  };
})()`);
const manyCategories = ["All", ...Array.from({ length: 29 }, (_, index) => `Category ${index + 1}`)];
let categoryMarkup = categoryControls.chips(manyCategories);
assert.equal((categoryMarkup.match(/role="radio"/g) || []).length, 24,
  "the initial category rail should remain bounded");
assert.equal((categoryMarkup.match(/tabindex="0"/g) || []).length, 1,
  "the category group should contribute one category, not 24 categories, to the Tab order");
assert.match(categoryControls.more(manyCategories), /More categories \(6\)/);
categoryControls.select("Category 29");
categoryMarkup = categoryControls.chips(manyCategories);
assert.match(categoryMarkup, /Category 29<\/button>/,
  "a selected category beyond the initial page should remain visible");
assert.equal((categoryMarkup.match(/tabindex="0"/g) || []).length, 1);
categoryControls.expand();
assert.equal((categoryControls.chips(manyCategories).match(/role="radio"/g) || []).length, 30);
assert.equal(categoryControls.more(manyCategories), "");

const loadRecipesSource = recipeHtml.match(/async function loadRecipes\(options = \{\}\) \{[\s\S]*?(?=\n\nasync function handleAuthSubmit)/)?.[0];
assert.ok(loadRecipesSource, "cloud recipe loading should expose its race guard to regression tests");
const loadRace = vm.runInNewContext(`(() => {
  const PUBLIC_DEMO_ONLY = false;
  let recipeLoadRevision = 0;
  let renderCount = 0;
  const pending = [];
  let currentSession = { access_token: "token-a", user: { id: "owner-a" } };
  const window = { KiddoSproutSession: { getSession: () => currentSession } };
  const state = {
    readOnlyBrowse: false,
    session: currentSession,
    authorizedOwnerId: "owner-a",
    recipeActionNotice: "old notice",
    cloudChecking: false,
    recipesLoaded: false,
    cloudRecipes: [],
    recipes: [],
    recipeMode: "loading",
    recipeNotice: "",
    cloudErrorKind: "",
    loadError: ""
  };
  function startReadOnlyRecipeBrowse() { throw new Error("unexpected demo fallback"); }
  async function validatedRecipeAccess(expectedOwnerId) {
    if (expectedOwnerId !== currentSession.user.id) throw new Error("owner changed");
    return { accessToken: currentSession.access_token, ownerId: currentSession.user.id, session: currentSession };
  }
  function showKiddoSproutGate() { throw new Error("unexpected gate"); }
  function fetchAllRecipes(accessToken, ownerId) {
    return new Promise((resolve, reject) => pending.push({ accessToken, ownerId, resolve, reject }));
  }
  function mergeFamilyRecipes(recipes) { return recipes.map((recipe) => ({ ...recipe })); }
  function showBuiltInRecipeFallback(error) {
    state.recipeMode = "built-in";
    state.loadError = String(error && error.message || error);
  }
  function recipeFallbackDetails(error) {
    return { kind: String(error && error.kind || "unavailable") };
  }
  function captureRecipeFocus() { return null; }
  function restoreRecipeFocus() {}
  function flushExternalRecipeRefresh() {}
  function render() { renderCount += 1; }
  ${loadRecipesSource}
  return {
    state,
    pending,
    load: loadRecipes,
    switchSession: (accessToken, ownerId) => {
      currentSession = { access_token: accessToken, user: { id: ownerId } };
      state.session = currentSession;
      state.authorizedOwnerId = ownerId;
    },
    renderCount: () => renderCount
  };
})()`);
const olderLoad = loadRace.load();
await new Promise((resolve) => setImmediate(resolve));
loadRace.switchSession("token-b", "owner-b");
const newerLoad = loadRace.load();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(loadRace.pending.length, 2);
loadRace.pending[1].resolve([{ id: "new", title: "New account recipe" }]);
await newerLoad;
assert.equal(loadRace.state.recipes[0].id, "new");
assert.equal(loadRace.state.recipeMode, "cloud");
loadRace.pending[0].resolve([{ id: "old", title: "Old account recipe" }]);
await olderLoad;
assert.equal(loadRace.state.recipes[0].id, "new",
  "a late response from an earlier account must not overwrite the current family's recipes");
assert.equal(loadRace.renderCount(), 1,
  "a stale recipe response should not trigger another render");
const staleRefresh = loadRace.load({ silent: true, preserveFocus: true, keepExistingOnFailure: true });
await new Promise((resolve) => setImmediate(resolve));
assert.equal(loadRace.pending.length, 3);
loadRace.pending[2].reject({ kind: "network" });
await staleRefresh;
assert.equal(loadRace.state.recipeMode, "stale",
  "a failed background refresh should expose an honest stale/read-only mode");
assert.equal(loadRace.state.cloudErrorKind, "network");
assert.equal(loadRace.state.recipes[0].id, "new",
  "a failed background refresh must not discard the last successfully synced recipe list");
assert.ok(loadRecipesSource.indexOf("await validatedRecipeAccess(expectedOwnerId)")
  < loadRecipesSource.indexOf("await fetchAllRecipes(access.accessToken, access.ownerId)"),
"recipe lists must obtain a fresh shared access token before reaching PostgREST");
assert.match(loadRecipesSource, /options\.keepExistingOnFailure === true[\s\S]*?state\.recipeMode = "stale"[\s\S]*?previously synced recipes remain visible read-only/,
  "a failed background refresh should keep the last known recipes visible but pause writes truthfully");

const recipeSyncSignalKeySource = recipeHtml.match(/const RECIPE_SYNC_SIGNAL_KEY = "[^"]+";/)?.[0];
const handleRecipeSyncStorageSource = recipeHtml.match(/function handleRecipeSyncStorage\(event\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(recipeSyncSignalKeySource && handleRecipeSyncStorageSource,
  "cross-tab cloud refresh signals should be independently testable");
const syncCounter = { value: 0 };
const recipeSyncWithCounter = vm.runInNewContext(`(() => {
  ${recipeSyncSignalKeySource}
  const state = { authorizedOwnerId: "${OWNER}" };
  function scheduleExternalRecipeRefresh() { counter.value += 1; }
  ${handleRecipeSyncStorageSource}
  return handleRecipeSyncStorage;
})()`, { counter: syncCounter, JSON, String });
recipeSyncWithCounter({ key: "unrelated", newValue: JSON.stringify({ version: 1, ownerId: OWNER }) });
recipeSyncWithCounter({ key: "flavornest.recipes.changed.v1", newValue: JSON.stringify({ version: 1, ownerId: OTHER_OWNER }) });
recipeSyncWithCounter({ key: "flavornest.recipes.changed.v1", newValue: "not-json" });
recipeSyncWithCounter({ key: "flavornest.recipes.changed.v1", newValue: JSON.stringify({ version: 1, ownerId: OWNER.toUpperCase() }) });
assert.equal(syncCounter.value, 1,
  "only a well-formed signal for the currently authorized owner should refresh this tab");
assert.doesNotMatch(handleRecipeSyncStorageSource, /title|ingredients|steps/,
  "the cross-tab signal must not put recipe contents into localStorage");
const submitRecipeSource = recipeHtml.match(/async function submitAddForm\(\) \{[\s\S]*?(?=\n\nfunction closeRecipeDeleteDialog)/)?.[0] || "";
assert.match(submitRecipeSource, /const draft = \{[\s\S]*?ingredients: state\.addForm\.ingredients\.slice\(\)/);
assert.ok(submitRecipeSource.indexOf("await recheckRecipeMutationRule(expectedOwnerId)")
  < submitRecipeSource.indexOf("await validatedRecipeAccess(expectedOwnerId)"),
"recipe saves must re-check the active child's current parent rule before reaching storage");
assert.ok(submitRecipeSource.indexOf("await validatedRecipeAccess(expectedOwnerId)")
  < submitRecipeSource.indexOf("await updateRecipe("),
"recipe edits must refresh and validate the shared session before mutation");
assert.ok(submitRecipeSource.indexOf("await validatedRecipeAccess(expectedOwnerId)")
  < submitRecipeSource.indexOf("await insertRecipe("),
"new recipes must refresh and validate the shared session before mutation");
assert.match(submitRecipeSource, /catch \(err\) \{[\s\S]*?state\.addForm = draft;/,
  "an auth or network retry must leave the user's complete recipe draft in the editor");
assert.match(submitRecipeSource, /withRecipeMutationLock\(expectedOwnerId[\s\S]*?const latestCloudRecipes = await fetchAllRecipes[\s\S]*?recipeContentFingerprint\(latestRecipe\) !== editingRecipeBaseline/,
  "edits should read inside a cross-tab lock and reject a stale baseline");
assert.match(submitRecipeSource, /const duplicateRecipe = latestCloudRecipes\.find[\s\S]*?duplicate: true/,
  "identical simultaneous creates should reuse the first saved cloud recipe");
assert.match(submitRecipeSource, /latestCloudRecipes\.length >= RECIPE_CLOUD_MAX_ROWS/,
  "the client should stop before creating an unreadable over-limit cloud list");
assert.match(submitRecipeSource, /announceRecipeCloudChange\(expectedOwnerId\)/,
  "successful recipe mutations should notify other tabs without broadcasting recipe contents");
const removeRecipeSource = recipeHtml.match(/async function removeSelectedRecipe\(\) \{[\s\S]*?(?=\n\n\/\/ ---- Render)/)?.[0] || "";
assert.ok(removeRecipeSource.indexOf("await recheckRecipeMutationRule(expectedOwnerId)")
  < removeRecipeSource.indexOf("await validatedRecipeAccess(expectedOwnerId)"),
"recipe deletion must re-check the active child's current parent rule before reaching storage");
assert.ok(removeRecipeSource.indexOf("await validatedRecipeAccess(expectedOwnerId)")
  < removeRecipeSource.indexOf("await deleteRecipe(access.accessToken, access.ownerId, recipeId)"),
"recipe deletion must refresh and validate the shared session before mutation");
assert.match(removeRecipeSource, /withRecipeMutationLock\(expectedOwnerId[\s\S]*?await fetchAllRecipes[\s\S]*?alreadyRemoved: true/,
  "two tabs deleting the same recipe should reconcile instead of reporting a false failure");
assert.match(removeRecipeSource, /announceRecipeCloudChange\(expectedOwnerId\)/);
assert.match(recipeHtml, /const mutationRevision = \+\+recipeMutationRevision;/);
assert.match(recipeHtml, /recipeLoadRevision \+= 1;\s*state\.cloudChecking = false;/,
  "saving or deleting should invalidate an older list request");
const closeRecipeDeleteDialogSource = recipeHtml.match(/function closeRecipeDeleteDialog\(\) \{[\s\S]*?\n\}/)?.[0] || "";
assert.match(closeRecipeDeleteDialogSource, /if \(wasOpen\) finishRecipeDeleteDialogClose\(\);/,
  "the non-native dialog close path should restore focus and release queued refresh work");
assert.match(recipeHtml, /dialog\.addEventListener\("close", finishRecipeDeleteDialogClose\);/,
  "native and compatibility dialog close paths should share the same cleanup");

const recipePageSizeSource = recipeHtml.match(/const RECIPE_PAGE_SIZE = \d+;/)?.[0];
const recipeCloudMaxRowsSource = recipeHtml.match(/const RECIPE_CLOUD_MAX_ROWS = \d+;/)?.[0];
const normalizedRecipePageLimitSource = recipeHtml.match(/function normalizedRecipePageLimit\(value\) \{[\s\S]*?\n\}/)?.[0];
const resetRecipePageSource = recipeHtml.match(/function resetRecipePage\(\) \{[\s\S]*?\n\}/)?.[0];
const getRecipePageSource = recipeHtml.match(/function getRecipePage\(filteredRecipes\) \{[\s\S]*?\n\}/)?.[0];
const recipeResultsSummarySource = recipeHtml.match(/function recipeResultsSummary\(page\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(recipePageSizeSource && recipeCloudMaxRowsSource && normalizedRecipePageLimitSource
  && resetRecipePageSource && getRecipePageSource && recipeResultsSummarySource,
  "incremental recipe page helpers should exist");
const paging = vm.runInNewContext(`(() => {
  ${recipePageSizeSource}
  ${recipeCloudMaxRowsSource}
  let state = { visibleRecipeLimit: RECIPE_PAGE_SIZE };
  function persistRecipeBrowseState() {}
  ${normalizedRecipePageLimitSource}
  ${resetRecipePageSource}
  ${getRecipePageSource}
  ${recipeResultsSummarySource}
  return {
    page: (items) => getRecipePage(items),
    summary: (page) => recipeResultsSummary(page),
    setLimit: (limit) => { state.visibleRecipeLimit = limit; },
    getLimit: () => state.visibleRecipeLimit,
    reset: () => resetRecipePage()
  };
})()`);
const manyRecipes = Array.from({ length: 95 }, (_, index) => ({ id: String(index) }));
let recipePage = paging.page(manyRecipes);
assert.equal(recipePage.visible.length, 30, "the first render should be bounded to 30 recipes");
assert.equal(recipePage.total, 95);
assert.equal(recipePage.remaining, 65);
assert.equal(recipePage.nextCount, 30);
assert.equal(paging.summary(recipePage), "Showing 30 of 95 recipes");
paging.setLimit(60);
recipePage = paging.page(manyRecipes);
assert.equal(recipePage.visible.length, 60);
assert.equal(recipePage.remaining, 35);
assert.equal(recipePage.nextCount, 30);
paging.setLimit(90);
recipePage = paging.page(manyRecipes);
assert.equal(recipePage.nextCount, 5, "the final Load more label should use the exact remaining count");
paging.setLimit(120);
recipePage = paging.page(manyRecipes);
assert.equal(recipePage.visible.length, 95);
assert.equal(recipePage.remaining, 0);
assert.equal(paging.summary(recipePage), "Showing all 95 recipes");
paging.setLimit(5);
assert.equal(paging.page(manyRecipes).visible.length, 30, "invalid small limits must not bypass the initial bound");
paging.reset();
assert.equal(paging.getLimit(), 30, "filter changes should reset the visible page size");
assert.equal(paging.summary(paging.page([{ id: "only" }])), "Showing all 1 recipe");

const browseStateKeySource = recipeHtml.match(/const RECIPE_BROWSE_STATE_KEY = "[^"]+";/)?.[0];
const restoreRecipeBrowseStateSource = recipeHtml.match(/function restoreRecipeBrowseState\(\) \{[\s\S]*?\n\}/)?.[0];
const persistRecipeBrowseStateSource = recipeHtml.match(/function persistRecipeBrowseState\(\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(browseStateKeySource && restoreRecipeBrowseStateSource && persistRecipeBrowseStateSource,
  "bounded session-only browse-state helpers should exist");
let storedBrowseState = JSON.stringify({
  version: 1,
  searchQuery: "  black   beans  ",
  selectedCategory: "Family Favourites",
  visibleRecipeLimit: 61,
  showAllRecipeCategories: true
});
let removedBrowseState = 0;
const browseState = vm.runInNewContext(`(() => {
  ${recipePageSizeSource}
  ${recipeCloudMaxRowsSource}
  ${browseStateKeySource}
  ${normalizedRecipePageLimitSource}
  let state = { searchQuery: "", selectedCategory: "All", visibleRecipeLimit: RECIPE_PAGE_SIZE };
  let showAllRecipeCategories = false;
  ${restoreRecipeBrowseStateSource}
  ${persistRecipeBrowseStateSource}
  restoreRecipeBrowseState();
  persistRecipeBrowseState();
  return { state, showAll: () => showAllRecipeCategories };
})()`, {
  window: {
    sessionStorage: {
      getItem: () => storedBrowseState,
      setItem: (_key, value) => { storedBrowseState = value; },
      removeItem: () => { removedBrowseState += 1; }
    }
  }
});
assert.equal(browseState.state.searchQuery, "  black   beans  ",
  "spaces in a saved multi-word search must survive a reload");
assert.equal(browseState.state.selectedCategory, "Family Favourites");
assert.equal(browseState.state.visibleRecipeLimit, 90,
  "restored paging should be rounded to a safe whole page");
assert.equal(browseState.showAll(), true);
assert.deepEqual(JSON.parse(storedBrowseState), {
  version: 1,
  searchQuery: "  black   beans  ",
  selectedCategory: "Family Favourites",
  visibleRecipeLimit: 90,
  showAllRecipeCategories: true
});
assert.equal(removedBrowseState, 0);

assert.match(recipeHtml, /id="recipe-results-summary"[^>]*role="status"[^>]*aria-live="polite"/);
assert.match(recipeHtml, /id="load-more-recipes"[^>]*[\s\S]*?aria-controls="recipe-list"/);
assert.match(recipeHtml, /<button type="button" class="recipe-card"/,
  "recipe rows should be native keyboard-accessible buttons");
assert.match(recipeHtml, /type="search" id="search-input" maxlength="200"[^>]*aria-label="Search recipe names, categories, or ingredients"/);
assert.match(recipeHtml, /state\.searchQuery = e\.target\.value\.slice\(0, 200\);[\s\S]{0,120}?resetRecipePage\(\);\s*refreshRecipeList\(\);/);
assert.match(recipeHtml, /state\.selectedCategory = category;[\s\S]{0,160}?resetRecipePage\(\);\s*refreshRecipeList\(\{ focusCategoryIndex: categoryIndex \}\);/);
assert.match(recipeHtml, /function clearRecipeActionNotice\(\) \{\s*state\.recipeActionNotice = "";\s*document\.querySelector\("\.recipe-action-notice"\)\?\.remove\(\);\s*\}/,
  "filtering should remove a stale save/delete confirmation from the partially refreshed browse screen");
assert.match(recipeHtml, /const previousVisibleCount = getRecipePage\(getFilteredRecipes\(\)\)\.visible\.length;\s*state\.visibleRecipeLimit = normalizedRecipePageLimit\(state\.visibleRecipeLimit \+ RECIPE_PAGE_SIZE\);\s*persistRecipeBrowseState\(\);\s*refreshRecipeList\(\{ focusRecipeIndex: previousVisibleCount \}\);/);
assert.equal((recipeHtml.match(/scheduleExactPhotoHydration\(page\.visible\)/g) || []).length, 2,
  "only the currently visible recipe page should start photo hydration");
assert.doesNotMatch(recipeHtml, /hydrateExactPhotos\(filtered\)/);
assert.match(recipeHtml, /const batch = Array\.isArray\(recipes\) \? recipes\.slice\(\) : \[\];/,
  "loading more should not permanently skip photos after the first page");
assert.match(recipeHtml, /offset \+= PHOTO_LOOKUP_QUEUE_MAX/,
  "large visible pages should hydrate in bounded chunks");
assert.match(recipeHtml, /new IntersectionObserver\([\s\S]*?\{ rootMargin: "320px 0px" \}\)/,
  "off-screen recipe photos should wait until their cards are near the viewport");
assert.match(recipeHtml, /photoHydrationObserver\?\.disconnect\(\);[\s\S]*?photoHydrationObserver = null;/,
  "a filter or page change should disconnect its obsolete photo observer");
assert.match(recipeHtml, /if \(typeof IntersectionObserver !== "function"\) \{\s*void hydrateExactPhotos\(batch, generation\)/,
  "older browsers should keep a working bounded photo-loading fallback");
assert.match(recipeHtml, /id="detail-back-btn"/);
assert.match(recipeHtml, /getElementById\("detail-back-btn"\)/);
assert.match(recipeHtml, /id="editor-back-btn"/);
assert.match(recipeHtml, /getElementById\("editor-back-btn"\)/);
assert.doesNotMatch(recipeHtml, /id="back-btn"/,
  "detail and editor back controls should not reuse the same DOM id");
assert.doesNotMatch(recipeHtml, /window\.confirm\(/,
  "recipe removal should use the accessible in-page confirmation dialog");
assert.match(recipeHtml, /<dialog id="recipe-delete-dialog"[^>]*aria-labelledby="recipe-delete-title"[^>]*aria-describedby="recipe-delete-description"/,
  "recipe removal should have a labelled and described native dialog");
assert.match(recipeHtml, /recipeName\.textContent = `“\$\{recipe\.title\}”`;/,
  "the family recipe title should be inserted as text rather than unsafe HTML");
assert.match(recipeHtml, /dialog\.addEventListener\("cancel", \(event\) => \{\s*if \(state\.detailSubmitting\) event\.preventDefault\(\);/,
  "Escape must not dismiss the recipe dialog during an active deletion");
const authScreenSource = recipeHtml.match(/function renderAuthScreen\(app\) \{[\s\S]*?(?=\n\nfunction renderPasswordResetScreen)/)?.[0] || "";
const passwordResetScreenSource = recipeHtml.match(/function renderPasswordResetScreen\(app\) \{[\s\S]*?(?=\n\nfunction currentRecipeStatus)/)?.[0] || "";
assert.match(recipeHtml, /authEmail: ""/,
  "FlavorNest should retain the non-secret email address when an account form is rebuilt");
assert.doesNotMatch(recipeHtml, /authPassword:\s*""|recoveryPassword:\s*""/,
  "account passwords must not be copied into long-lived page state");
assert.match(authScreenSource, /id="auth-email"[^>]*maxlength="254"[^>]*value="\$\{esc\(state\.authEmail\)\}"/,
  "the rebuilt account form should safely restore the entered email address");
assert.match(authScreenSource, /authEmailInput\.addEventListener\("input",[\s\S]*?state\.authEmail = authEmailInput\.value\.slice\(0, 254\);/,
  "email changes should be captured before another account mode rerenders the form");
assert.match(authScreenSource, /const emailIsReady = Boolean\(state\.authEmail\.trim\(\) && authEmailInput\.validity\.valid\);\s*requestNextAuthFocus\(emailIsReady \? "auth-password" : "auth-email"\);[\s\S]*?render\(\);/,
  "switching Login and Sign up should focus the next required field after the rerender");
for (const id of ["auth-error", "auth-info"]) {
  assert.match(authScreenSource, new RegExp(`id="${id}"[^>]*tabindex="-1"`),
    `${id} should remain a stable programmatic focus target`);
}
assert.match(authScreenSource, /focusRenderedAuthTarget\(state\.authError \? "auth-error" : state\.authInfo \? "auth-info" : "auth-email"\);/,
  "auth outcomes should focus the error, success message, or first field after rebuilding the form");
assert.match(recipeHtml, /state\.authInfo = (?:state\.authMode|operationMode) === "signup" \? "Creating your account…" : "Signing you in…";\s*syncAuthFeedback\("auth-info"\);\s*updateAuthControls\(\);/,
  "submitting an account request should move focus to a live pending status before disabling the clicked control");
assert.match(recipeHtml, /if \(shouldLoadRecipes\) requestNextAuthFocus\("recipe-browse-heading"\);\s*render\(\);\s*if \(shouldLoadRecipes\) await loadRecipes\(\);/,
  "a successful authorized account request should carry focus through the loading rerender to the recipe library");
assert.match(recipeHtml, /<h1 id="recipe-browse-heading" tabindex="-1">Find a recipe<\/h1>/);
assert.match(recipeHtml, /scheduleExactPhotoHydration\(page\.visible\);\s*focusRenderedAuthTarget\(""\);/,
  "the recipe library should consume the pending post-login focus target once it is ready");
assert.match(recipeHtml, /state\.authError = "Confirm you are not a bot before continuing\.";\s*syncAuthFeedback\("auth-human-check-start"\);/,
  "account validation should retain the current form and focus the safety check instead of rerendering it blank");
assert.match(recipeHtml, /start\.setAttribute\("aria-disabled", String\(checking \|\| verified\)\);/,
  "the FlavorNest challenge trigger should expose its checking and verified states to assistive technology");
assert.equal((passwordResetScreenSource.match(/logoSvg\("logo-icon"\)/g) || []).length, 1,
  "the password reset screen should show the FlavorNest logo only once");
assert.match(passwordResetScreenSource, /id="recipe-reset-error"[^>]*tabindex="-1"/);
assert.match(passwordResetScreenSource, /id="recipe-reset-info"[^>]*tabindex="-1"/);
assert.match(passwordResetScreenSource, /id="recipe-reset-submit"/);
assert.match(passwordResetScreenSource, /focusRenderedAuthTarget\(state\.recoveryError \? "recipe-reset-error" : state\.recoveryInfo \? "recipe-reset-info" : "recipe-new-password"\);/,
  "password recovery should restore focus after every rebuilt screen");
assert.match(recipeHtml, /state\.recoveryInfo = "Updating your password…";\s*syncRecipeRecoveryFeedback\("recipe-reset-info"\);\s*updateRecipeRecoveryControls\(\);/,
  "password updates should announce progress before disabling the focused submit control");
assert.match(recipeHtml, /state\.authInfo = "Password updated\. You can log in now\.";/,
  "a successful password update should carry its confirmation onto the Login screen");
assert.match(recipeHtml, /state\.recoveryError = friendlyAuthError\(err\);/,
  "password recovery failures should not expose raw provider errors");
const literalRecipeIds = [...recipeHtml.matchAll(/\bid="([^"$]+)"/g)].map((match) => match[1]);
const duplicateLiteralRecipeIds = literalRecipeIds.filter((id, index) => literalRecipeIds.indexOf(id) !== index);
assert.deepEqual(duplicateLiteralRecipeIds, [], "recipe templates should use unique literal DOM ids");

const photoSchedulerSource = recipeHtml.match(/const PHOTO_LOOKUP_CONCURRENCY = 4;[\s\S]*?(?=\nasync function fetchExactPhotoUncached)/)?.[0];
assert.ok(photoSchedulerSource, "a bounded recipe-photo lookup scheduler should exist");
const photoScheduler = vm.runInNewContext(`(() => {
  ${photoSchedulerSource}
  return { queuePhotoLookup };
})()`);
let activePhotoJobs = 0;
let peakPhotoJobs = 0;
await Promise.all(Array.from({ length: 12 }, () => photoScheduler.queuePhotoLookup(async () => {
  activePhotoJobs += 1;
  peakPhotoJobs = Math.max(peakPhotoJobs, activePhotoJobs);
  await new Promise((resolve) => setTimeout(resolve, 5));
  activePhotoJobs -= 1;
})));
assert.equal(peakPhotoJobs, 4, "recipe photo lookups should be limited to four concurrent requests");
let releaseQueuedPhotoJobs;
const queuedPhotoGate = new Promise((resolve) => { releaseQueuedPhotoJobs = resolve; });
let executedQueuedPhotoJobs = 0;
const overflowPhotoJobs = Array.from({ length: 70 }, (_, index) => photoScheduler.queuePhotoLookup(async () => {
  executedQueuedPhotoJobs += 1;
  await queuedPhotoGate;
  return index;
}));
await new Promise((resolve) => setTimeout(resolve, 0));
releaseQueuedPhotoJobs();
const overflowPhotoResults = await Promise.all(overflowPhotoJobs);
assert.equal(executedQueuedPhotoJobs, 64,
  "the photo scheduler should keep four active and at most sixty queued lookups");
assert.equal(overflowPhotoResults.filter((result) => result === null).length, 6,
  "when overloaded, obsolete queued photo lookups should settle instead of hanging");
assert.match(recipeHtml, /const exactPhotoRequests = new Map\(\);/);
assert.match(recipeHtml, /if \(exactPhotoRequests\.has\(key\)\) return exactPhotoRequests\.get\(key\);/,
  "re-renders should reuse an in-flight lookup for the same recipe");
assert.match(recipeHtml, /\.finally\(\(\) => exactPhotoRequests\.delete\(key\)\)/,
  "completed photo requests should leave the in-flight cache");
const safeRecipeImageUrlSource = recipeHtml.match(/function safeRecipeImageUrl\(value\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(safeRecipeImageUrlSource, "recipe photos should pass through a URL allow-list");
const safeRecipeImageUrl = vm.runInNewContext(`${safeRecipeImageUrlSource}; safeRecipeImageUrl`, {
  URL,
  window: { location: { href: "https://kiddosprout.example/recipe.html" } }
});
assert.equal(safeRecipeImageUrl("https://www.themealdb.com/images/media/meals/waffle.jpg"), "https://www.themealdb.com/images/media/meals/waffle.jpg");
assert.equal(safeRecipeImageUrl("https://upload.wikimedia.org/waffle.jpg"), "https://upload.wikimedia.org/waffle.jpg");
assert.equal(safeRecipeImageUrl("https://images.example/waffle.jpg"), "");
assert.equal(safeRecipeImageUrl("http://www.themealdb.com/images/media/meals/waffle.jpg"), "");
assert.equal(safeRecipeImageUrl("https://www.themealdb.com.evil.example/waffle.jpg"), "");
assert.equal(safeRecipeImageUrl("https://user:pass@www.themealdb.com/waffle.jpg"), "");
assert.equal(safeRecipeImageUrl("https://www.themealdb.com:444/waffle.jpg"), "");
assert.equal(safeRecipeImageUrl("javascript:alert(1)"), "");
assert.equal(safeRecipeImageUrl("data:text/html,<script>alert(1)</script>"), "");

const photoCacheConfigSource = recipeHtml.match(/const PHOTO_CACHE_KEY = [\s\S]*?const PHOTO_REQUEST_TIMEOUT_MS = \d+;/)?.[0];
const loadPhotoCacheSource = recipeHtml.match(/function loadPhotoCache\(\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(photoCacheConfigSource && loadPhotoCacheSource,
  "the photo cache should have bounded, recoverable loading logic");
let storedPhotoCache = "{not valid json";
let removedPhotoCaches = 0;
const photoCacheContext = {
  URL,
  window: { location: { href: "https://kiddosprout.example/recipe.html" } },
  localStorage: {
    getItem: () => storedPhotoCache,
    removeItem: () => { removedPhotoCaches += 1; }
  }
};
const loadPhotoCache = vm.runInNewContext(`(() => {
  ${safeRecipeImageUrlSource}
  ${recipeIdentitySource}
  ${photoCacheConfigSource}
  ${loadPhotoCacheSource}
  return loadPhotoCache;
})()`, photoCacheContext);
let loadedPhotoCache = loadPhotoCache();
assert.equal(Object.getPrototypeOf(loadedPhotoCache), null,
  "photo cache data should not inherit attacker-controlled object keys");
assert.equal(Object.keys(loadedPhotoCache).length, 0);
assert.equal(removedPhotoCaches, 1, "damaged photo cache JSON should be discarded");
storedPhotoCache = JSON.stringify(Object.fromEntries([
  ...Array.from({ length: 305 }, (_, index) => [
    `dish-${index}`,
    `https://www.themealdb.com/images/media/meals/${index}.jpg`
  ]),
  ["unsafe", "https://images.example/not-allowed.jpg"]
]));
loadedPhotoCache = loadPhotoCache();
assert.equal(Object.keys(loadedPhotoCache).length, 299,
  "only the newest bounded entries with approved image hosts should survive cache loading");
assert.equal(loadedPhotoCache.unsafe, undefined);
assert.equal(loadedPhotoCache["dish-304"], "https://www.themealdb.com/images/media/meals/304.jpg");

const readBoundedPhotoTextSource = recipeHtml.match(/async function readBoundedPhotoText\(response\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(readBoundedPhotoTextSource, "photo metadata should be read with a byte limit");
assert.doesNotMatch(readBoundedPhotoTextSource, /response\.text\(\)/,
  "a response without a readable stream should fail closed instead of allocating an unbounded body");
const readBoundedPhotoText = vm.runInNewContext(`(() => {
  const PHOTO_RESPONSE_MAX_BYTES = 1024 * 1024;
  ${readBoundedPhotoTextSource}
  return readBoundedPhotoText;
})()`, { Uint8Array, TextEncoder, TextDecoder });
assert.equal(await readBoundedPhotoText(new Response('{"ok":true}')), '{"ok":true}');
let oversizedPhotoBodyCancelled = false;
const oversizedPhotoBody = new ReadableStream({
  pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024 + 1)); },
  cancel() { oversizedPhotoBodyCancelled = true; }
});
assert.equal(await readBoundedPhotoText(new Response(oversizedPhotoBody)), "");
assert.equal(oversizedPhotoBodyCancelled, true,
  "oversized chunked photo metadata should be cancelled before buffering more data");

assert.match(recipeHtml, /src="\$\{esc\(cachedUrl \|\| "data:image\/gif;/,
  "cached photo URLs should also be HTML-attribute escaped");
assert.match(recipeHtml, /const url = safeRecipeImageUrl\(await fetchExactPhoto\(r\.title\)\);/,
  "late photo hydration should reject unsafe URLs too");
assert.match(recipeHtml, /querySelectorAll\("img\[data-recipe-img\]"\)[\s\S]{0,150}?getAttribute\("data-recipe-img"\) === String\(r\.id\)/,
  "photo hydration should match IDs without constructing a CSS selector from recipe data");
assert.doesNotMatch(recipeHtml, /CSS\.escape/);
assert.match(recipeHtml, /Array\.isArray\(data\?\.meals\)[\s\S]{0,180}?recipeIdentityText\(meal\.strMeal\) === wantedTitle/,
  "a fuzzy meal search result should not be shown as though it were the requested dish");
assert.doesNotMatch(recipeHtml, /generator=search&gsrsearch=/,
  "a fuzzy Wikipedia search result should not be presented as an exact dish photo");
assert.match(recipeHtml, /data-recipe-photo-key="\$\{esc\(key\)\}"/);
assert.doesNotMatch(recipeHtml, /\sonerror\s*=/i,
  "recipe images must not depend on HTML event handlers blocked by the public CSP");
assert.match(recipeHtml, /function handleRecipePhotoError\(event\)[\s\S]*?forgetRecipePhoto\(image\.dataset\.recipePhotoKey, image\.currentSrc \|\| image\.src\)/,
  "a broken cached image should be forgotten so it can be looked up again later");
assert.match(recipeHtml, /document\.addEventListener\("error", handleRecipePhotoError, true\)/,
  "one capture listener should handle failures for current and future recipe images");
assert.match(recipeHtml, /document\.addEventListener\("load", handleRecipePhotoLoad, true\)/,
  "a photo should replace its initials only after the image successfully loads");
assert.match(recipeHtml, /function handleRecipePhotoLoad\(event\)[\s\S]*?Number\(image\.naturalWidth \|\| 0\) < 1[\s\S]*?image\.style\.display = "block"/,
  "zero-width or unsafe image responses must leave the deterministic initials fallback visible");
assert.match(recipeHtml, /loading="lazy" decoding="async" referrerpolicy="no-referrer"/,
  "recipe photos should load lazily without leaking the current page URL");
assert.match(recipeHtml, /credentials: "omit"[\s\S]{0,100}?referrerPolicy: "no-referrer"/,
  "photo metadata lookups should not send ambient credentials or referrer data");

assert.match(recipeHtml, /<form id="recipe-editor-form" novalidate aria-busy="\$\{state\.addSubmitting \? "true" : "false"\}">/,
  "the recipe editor should use a native form so Enter can save");
assert.match(recipeHtml, /id="save-recipe-btn"[^>]*type="submit"/,
  "the save control should submit the recipe form");
assert.match(recipeHtml, /getElementById\("recipe-editor-form"\)\.addEventListener\("submit", \(event\) => \{\s*event\.preventDefault\(\);\s*submitAddForm\(\);/,
  "recipe form submission should use the existing guarded save path");
assert.match(recipeHtml, /id="editor-back-btn"[^>]*aria-label="\$\{isEditing \? "Back to recipe" : "Back to recipes"\}"[^>]*\$\{editorDisabled\}/,
  "the editor back button should be labelled and locked while saving");
assert.match(recipeHtml, /<ul class="ingredient-list" role="list">/);
assert.match(recipeHtml, /<ol class="step-list" role="list">/);
assert.match(recipeHtml, /<span class="search-icon" aria-hidden="true">/);
assert.match(recipeHtml, /details coming soon/);
assert.doesNotMatch(recipeHtml, />needs recipe</,
  "read-only incomplete built-ins should not imply that a child can edit them");
assert.match(recipeHtml, /<h1 class="detail-title" tabindex="-1">/,
  "the detail heading should be programmatically focusable after navigation");
assert.match(recipeHtml, /class="ingredient-input"[^>]*aria-label="Ingredient \$\{idx \+ 1\}"[^>]*\$\{editorDisabled\}/);
assert.match(recipeHtml, /class="step-input"[^>]*aria-label="Step \$\{idx \+ 1\}"[^>]*\$\{editorDisabled\}/);
assert.match(recipeHtml, /aria-label="Remove ingredient \$\{idx \+ 1\}"[^>]*\$\{editorDisabled\}/);
assert.match(recipeHtml, /aria-label="Remove step \$\{idx \+ 1\}"[^>]*\$\{editorDisabled\}/);
assert.match(recipeHtml, /const ingredientLimitReached = state\.addForm\.ingredients\.length >= 100;/);
assert.match(recipeHtml, /const stepLimitReached = state\.addForm\.steps\.length >= 100;/);
assert.match(recipeHtml, /if \(state\.addForm\.ingredients\.length >= 100\) return;/);
assert.match(recipeHtml, /if \(state\.addForm\.steps\.length >= 100\) return;/);
assert.match(recipeHtml, /Ingredient limit reached/);
assert.match(recipeHtml, /Step limit reached/);
assert.match(recipeHtml, /state\.addForm\.ingredients\.push\(""\);\s*render\(\);\s*window\.requestAnimationFrame[\s\S]*?\.ingredient-input/,
  "adding an ingredient should return focus to the new field");
assert.match(recipeHtml, /state\.addForm\.steps\.push\(""\);\s*render\(\);\s*window\.requestAnimationFrame[\s\S]*?\.step-input/,
  "adding a step should return focus to the new field");

const restoreSessionSource = recipeHtml.match(/async function restoreSession\(\) \{[\s\S]*?\n\}\n\nfunction retryKiddoSproutGate/)?.[0] || "";
assert.match(restoreSessionSource, /const access = await validatedRecipeAccess\(\)/,
  "session restoration must use the shared validator and refresh implementation");
assert.match(restoreSessionSource, /if \(temporary\) \{[\s\S]*?Parent check temporarily unavailable[\s\S]*?\} else \{[\s\S]*?clearPersistedSession\(\);/,
  "temporary outages should keep the shared session while definite failures clear it");
assert.match(restoreSessionSource, /Parent check temporarily unavailable[\s\S]*?\{ retry: true \}/,
  "a temporary parent-check outage should offer an in-page retry without discarding the saved session");
assert.match(recipeHtml, /kiddoSproutGate\.retry \? `<button class="btn-primary" id="kiddo-gate-retry"[\s\S]*?retryKiddoSproutGate\(\)/,
  "the temporary access gate should render and wire a usable retry button");

const retryKiddoSproutGateSource = recipeHtml.match(/function retryKiddoSproutGate\(\) \{[\s\S]*?(?=\n\nfunction retryRecipeCloud)/)?.[0];
assert.ok(retryKiddoSproutGateSource, "the temporary access-gate retry helper should exist");
let finishGateRetry;
const gateRetryWait = new Promise((resolve) => { finishGateRetry = resolve; });
let gateRestoreCalls = 0;
const gateRetryHarness = vm.runInNewContext(`(() => {
  let kiddoSproutGate = { title: "Temporary", message: "Try again", retry: true };
  let recipeGateRetryInFlight = null;
  ${retryKiddoSproutGateSource}
  return {
    retry: retryKiddoSproutGate,
    gate: () => kiddoSproutGate
  };
})()`, {
  restoreSession: async () => { gateRestoreCalls += 1; await gateRetryWait; },
  showKiddoSproutGate: () => { throw new Error("retry unexpectedly failed"); },
  render: () => {}
});
const firstGateRetry = gateRetryHarness.retry();
const duplicateGateRetry = gateRetryHarness.retry();
assert.strictEqual(duplicateGateRetry, firstGateRetry,
  "repeated clicks must share one parent-session recheck");
assert.equal(gateRestoreCalls, 1);
assert.equal(gateRetryHarness.gate(), null);
finishGateRetry();
assert.equal(await firstGateRetry, true);
assert.doesNotMatch(recipeHtml, /function refreshRequest|isInvalidRefreshSessionError/,
  "FlavorNest must not maintain a second refresh-token implementation");

const inlineScripts = [...recipeHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim());
inlineScripts.forEach((source) => new Function(source));

assert.match(migration, /create table if not exists public\.recipes/);
assert.match(migration, /create index if not exists recipes_user_id_idx/);
assert.match(migration, /alter table public\.recipes enable row level security/);
for (const operation of ["select", "insert", "update", "delete"]) {
  assert.match(migration, new RegExp(`drop policy if exists recipes_${operation}_own on public\\.recipes`));
  assert.match(migration, new RegExp(`create policy recipes_${operation}_own[\\s\\S]*?for ${operation}[\\s\\S]*?to authenticated`));
}
assert.match(migration, /create policy recipes_update_own[\s\S]*?using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]*?with check \(\(select auth\.uid\(\)\) = user_id\)/);
assert.match(migration, /create policy recipes_delete_own[\s\S]*?using \(\(select auth\.uid\(\)\) = user_id\)/);
assert.doesNotMatch(migration, /auth\.role\s*\(/);
assert.match(migration, /revoke all privileges on table public\.recipes from public, anon, authenticated/);
assert.match(migration, /grant usage on schema public to authenticated/);
assert.match(migration, /grant select, delete on table public\.recipes to authenticated/);
assert.match(migration, /grant insert \(user_id, title, category, ingredients, steps\)[\s\S]*?on table public\.recipes to authenticated/);
assert.match(migration, /grant update \(title, category, ingredients, steps\)[\s\S]*?on table public\.recipes to authenticated/);
assert.doesNotMatch(migration, /grant[^;]*insert[^;]*on table public\.recipes(?![\s\S]*?\()/i);
assert.match(migration, /recipes_ingredients_text_size[\s\S]*?octet_length/);
assert.match(migration, /recipes_steps_text_size[\s\S]*?octet_length/);
assert.match(migration, /recipes_ingredients_item_length[\s\S]*?recipe_text_items_within_limit\(ingredients, 1000\)/);
assert.match(migration, /recipes_steps_item_length[\s\S]*?recipe_text_items_within_limit\(steps, 4000\)/);
assert.match(migration, /revoke all on function public\.recipe_text_items_within_limit\(text\[\], integer\)[\s\S]*?from public, anon, authenticated/);
assert.match(migration, /notify pgrst, 'reload schema'/);

const normalizedHardeningSql = hardeningMigration
  .replace(/--.*$/gm, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();
const hardeningStatements = normalizedHardeningSql.split(";").map((statement) => statement.trim()).filter(Boolean);
assert.match(hardeningMigration, /create or replace function public\.recipe_text_items_within_limit[\s\S]*?immutable[\s\S]*?security invoker[\s\S]*?set search_path = ''/);
assert.match(hardeningMigration, /item is not null[\s\S]*?char_length\(item\) between 1 and maximum_characters[\s\S]*?item !~ '\^\[\[:space:\]\]'[\s\S]*?item !~ '\[\[:space:\]\]\$'/);
assert.match(hardeningMigration, /recipes_ingredients_shape[\s\S]*?array_ndims\(ingredients\) = 1[\s\S]*?array_lower\(ingredients, 1\) = 1[\s\S]*?cardinality\(ingredients\) between 1 and 100/);
assert.match(hardeningMigration, /recipes_steps_shape[\s\S]*?array_ndims\(steps\) = 1[\s\S]*?array_lower\(steps, 1\) = 1[\s\S]*?cardinality\(steps\) between 1 and 100/);
assert.match(hardeningMigration, /recipes_ingredients_item_length[\s\S]*?recipe_text_items_within_limit\(ingredients, 1000\)[\s\S]*?not valid/);
assert.match(hardeningMigration, /recipes_steps_item_length[\s\S]*?recipe_text_items_within_limit\(steps, 4000\)[\s\S]*?not valid/);
for (const constraint of [
  "recipes_ingredients_shape",
  "recipes_steps_shape",
  "recipes_ingredients_item_length",
  "recipes_steps_item_length"
]) {
  assert.match(hardeningMigration, new RegExp(`validate constraint ${constraint}`));
}
assert.match(hardeningMigration, /revoke all on function public\.recipe_text_items_within_limit\(text\[\], integer\)[\s\S]*?from public, anon, authenticated, service_role/);
assert.match(hardeningMigration, /grant execute on function public\.recipe_text_items_within_limit\(text\[\], integer\)[\s\S]*?to authenticated, service_role/);
assert.match(hardeningMigration, /alter table public\.recipes enable row level security/);
for (const operation of ["select", "insert", "update", "delete"]) {
  assert.match(hardeningMigration, new RegExp(`create policy recipes_${operation}_own[\\s\\S]*?for ${operation}[\\s\\S]*?to authenticated`));
}
assert.match(hardeningMigration, /create policy recipes_update_own[\s\S]*?using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]*?with check \(\(select auth\.uid\(\)\) = user_id\)/);
assert.ok(hardeningStatements.includes("revoke all privileges on table public.recipes from public, anon, authenticated"));
assert.ok(hardeningStatements.includes("grant select, delete on table public.recipes to authenticated"));
assert.ok(hardeningStatements.includes("grant insert (user_id, title, category, ingredients, steps) on table public.recipes to authenticated"));
assert.ok(hardeningStatements.includes("grant update (title, category, ingredients, steps) on table public.recipes to authenticated"));
assert.ok(hardeningStatements.includes("grant select, insert, update, delete on table public.recipes to service_role"));
const authenticatedInsertGrant = hardeningStatements.find((statement) => statement.startsWith("grant insert") && statement.endsWith("to authenticated"));
const authenticatedUpdateGrant = hardeningStatements.find((statement) => statement.startsWith("grant update") && statement.endsWith("to authenticated"));
assert.ok(authenticatedInsertGrant && authenticatedUpdateGrant);
assert.doesNotMatch(authenticatedInsertGrant, /\b(id|created_at)\b/,
  "browser inserts must leave generated id and created_at to the database");
assert.doesNotMatch(authenticatedUpdateGrant, /\b(id|user_id|created_at)\b/,
  "browser updates must not alter server-owned metadata or row ownership");
assert.match(hardeningMigration, /create policy recipes_insert_own[\s\S]*?with check \(\(select auth\.uid\(\)\) = user_id\)/,
  "the one insertable ownership column must still be tied to the authenticated user");

assert.match(config, /\[api\][\s\S]*?schemas = \["public", "graphql_public"\]/);
assert.match(config, /\[api\][\s\S]*?auto_expose_new_tables = false/);
assert.match(serviceWorker, /"\/recipe-cloud\.js"/);
assert.ok(serviceWorker.includes("const KIDDOSPROUT_RECIPE_CATALOG = /^\\/recipe-catalog-v[0-9a-f]{12}\\.js$/i;"),
  "the active worker must recognize each valid content-addressed recipe catalogue release");
assert.match(serviceWorker, /KIDDOSPROUT_RECIPE_CATALOG\.test\(logicalPath\)/,
  "recognized recipe catalogues must be eligible for safe runtime caching");

// Execute the isolated demo/unconfigured initializers and boot branches with
// network/account traps. A colleague demo may use a tab-only scratchpad while
// an unconfigured raw publish remains read-only; neither may pretend to save to
// a cloud account.
const readOnlySetupFunction = recipeHtml.match(/function prepareReadOnlyRecipeBrowse\(recipeMode, notice, cloudErrorKind = ""\) \{[\s\S]*?\n\}/)?.[0];
const demoFunction = recipeHtml.match(/function startReadOnlyRecipeBrowse\(\) \{[\s\S]*?\n\}/)?.[0];
const unconfiguredFunction = recipeHtml.match(/function startUnconfiguredRecipeBrowse\(\) \{[\s\S]*?\n\}/)?.[0];
const bootFunction = recipeHtml.match(/async function bootFlavorNest\(\) \{[\s\S]*?(?=\nvoid bootFlavorNest\(\);)/)?.[0];
assert.ok(readOnlySetupFunction && demoFunction && unconfiguredFunction && bootFunction);
assert.ok(
  bootFunction.indexOf("if (isKiddoSproutDemoMode())") < bootFunction.indexOf("if (!SUPABASE_CONNECTED)")
    && bootFunction.indexOf("if (!SUPABASE_CONNECTED)") < bootFunction.indexOf("await restoreSession()"),
  "FlavorNest should choose safe public-demo and unconfigured fallbacks before its live account path"
);
const demoState = {};
let demoRenders = 0;
let demoNetworkCalls = 0;
vm.runInNewContext(`${readOnlySetupFunction}\n${demoFunction}\n${unconfiguredFunction}\n${bootFunction}\nvoid bootFlavorNest();`, {
  state: demoState,
  kiddoSproutGate: null,
  recipeLoadRevision: 0,
  recipeMutationRevision: 0,
  browseReturnRecipeId: "stale-recipe",
  builtInRecipeCollection: () => [{ id: "built-in" }],
  readDemoRecipes: () => [{ id: "demo-practice", _source: "demo" }],
  mergeDemoRecipes: (recipes) => [{ id: "built-in" }, ...recipes],
  wireRecipeDeleteDialog: () => {},
  render: () => { demoRenders += 1; },
  fetch: () => { demoNetworkCalls += 1; throw new Error("network forbidden"); },
  isKiddoSproutDemoMode: () => true,
  canOpenKiddoSproutApp: () => { throw new Error("account path must not run"); },
  restoreSession: () => { throw new Error("account path must not run"); },
  APP_NAME: "FlavorNest"
});
assert.equal(demoNetworkCalls, 0);
assert.equal(demoRenders, 1);
assert.equal(demoState.recipeMode, "demo");
assert.equal(demoState.readOnlyBrowse, true);
assert.equal(demoState.recipesLoaded, true);
assert.equal(demoState.demoRecipes.length, 1);
assert.equal(demoState.recipes.some((recipe) => recipe._source === "demo"), true);
assert.equal(demoState.cloudChecking, false);
assert.equal(demoState.selectedRecipeId, null);
assert.equal(demoState.detailSubmitting, false);
assert.equal(demoState.addSubmitting, false);

const unconfiguredState = {};
let unconfiguredRenders = 0;
let unconfiguredNetworkCalls = 0;
vm.runInNewContext(`${readOnlySetupFunction}\n${demoFunction}\n${unconfiguredFunction}\n${bootFunction}\nvoid bootFlavorNest();`, {
  state: unconfiguredState,
  kiddoSproutGate: null,
  recipeLoadRevision: 0,
  recipeMutationRevision: 0,
  browseReturnRecipeId: "stale-recipe",
  builtInRecipeCollection: () => [{ id: "built-in" }],
  readDemoRecipes: () => { throw new Error("raw static fallback must not read demo scratch data"); },
  mergeDemoRecipes: () => { throw new Error("raw static fallback must stay read-only"); },
  wireRecipeDeleteDialog: () => {},
  render: () => { unconfiguredRenders += 1; },
  fetch: () => { unconfiguredNetworkCalls += 1; throw new Error("network forbidden"); },
  isKiddoSproutDemoMode: () => false,
  SUPABASE_CONNECTED: false,
  canOpenKiddoSproutApp: () => { throw new Error("account path must not run"); },
  restoreSession: () => { throw new Error("account path must not run"); },
  APP_NAME: "FlavorNest"
});
assert.equal(unconfiguredNetworkCalls, 0);
assert.equal(unconfiguredRenders, 1);
assert.equal(unconfiguredState.recipeMode, "built-in");
assert.equal(unconfiguredState.readOnlyBrowse, true);
assert.equal(unconfiguredState.recipesLoaded, true);
assert.equal(unconfiguredState.cloudErrorKind, "configuration");
assert.match(unconfiguredState.recipeNotice, /account services are not configured/i);
assert.equal(unconfiguredState.selectedRecipeId, null);
assert.equal(unconfiguredState.detailSubmitting, false);
assert.equal(unconfiguredState.addSubmitting, false);

let configuredRestoreCalls = 0;
let configuredReadOnlyRenders = 0;
await vm.runInNewContext(`${readOnlySetupFunction}\n${demoFunction}\n${unconfiguredFunction}\n${bootFunction}\nbootFlavorNest();`, {
  state: {},
  kiddoSproutGate: null,
  recipeLoadRevision: 0,
  recipeMutationRevision: 0,
  browseReturnRecipeId: "",
  builtInRecipeCollection: () => { throw new Error("configured boot must not open the static catalogue before authentication"); },
  wireRecipeDeleteDialog: () => {},
  render: () => { configuredReadOnlyRenders += 1; },
  isKiddoSproutDemoMode: () => false,
  SUPABASE_CONNECTED: true,
  restoreSession: async () => { configuredRestoreCalls += 1; },
  APP_NAME: "FlavorNest"
});
assert.equal(configuredRestoreCalls, 1,
  "a configured FlavorNest deployment must keep using the strict authenticated session path");
assert.equal(configuredReadOnlyRenders, 0,
  "a configured FlavorNest deployment must not silently replace authentication with a static preview");

console.log("Recipe cloud tests passed: bounded responses, truthful fallback, paged browsing, owner-only CRUD, hardened recipe shapes/items, metadata-safe grants, and network-free public/unconfigured previews.");
