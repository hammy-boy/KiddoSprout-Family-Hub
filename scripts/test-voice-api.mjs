import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import vm from "node:vm";

const projectRoot = new URL("../", import.meta.url);
const voiceServerPath = new URL("server/voice-api.mjs", projectRoot);
const MOCK_HOST = "::1";
const MOCK_URL_HOST = "[::1]";
const API_HOST = "127.0.0.1";
const API_KEY = "test-secret-elevenlabs-key";
const PARENT_TOKEN = "parent-token";
const SAFE_VOICE_ID = "voiceSafe123";
const storyVoicesSource = await readFile(new URL("story-voices.js", projectRoot), "utf8");
const catalog = JSON.parse(await readFile(new URL("server/trusted-story-catalog.json", projectRoot), "utf8"));
const trustedLocations = Object.keys(catalog.entries).slice(0, 8).map((location) => {
  const [bookId, chapterIndex, pageIndex] = location.split(":");
  return { bookId, chapterIndex: Number(chapterIndex), pageIndex: Number(pageIndex), text: catalog.entries[location] };
});
assert.ok(trustedLocations.length >= 5, "voice tests need several trusted story pages");
assert.match(storyVoicesSource, /window\.addEventListener\("storage", \(event\) => \{[\s\S]*?KiddoSproutStoryVoiceChoice\?\.key\?\.\(\)[\s\S]*?selectedVoice = readSelectedVoice\(\);[\s\S]*?renderVoices\(\);/,
  "Sound Studio should update when this child's saved voice changes in another tab.");
assert.match(storyVoicesSource, /window\.addEventListener\("pageshow", \(event\) => \{[\s\S]*?event\.persisted[\s\S]*?selectedVoice = readSelectedVoice\(\);[\s\S]*?updateSelectedLabel\(\);/,
  "Sound Studio should refresh a saved voice when returning from the back-forward cache.");

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function freePort(host = API_HOST) {
  const server = createNetServer();
  server.listen(0, host);
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const { port } = address;
  await new Promise((resolvePromise) => server.close(resolvePromise));
  return port;
}

async function listen(server, host = MOCK_HOST) {
  server.listen(0, host);
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return address.port;
}

async function closeServer(server) {
  if (!server.listening) return;
  await new Promise((resolvePromise) => server.close(resolvePromise));
}

function sendJson(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, { "Content-Type": "application/json", "Content-Length": String(body.length) });
  response.end(body);
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function createAuthMock() {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ url: request.url, authorization: request.headers.authorization, apikey: request.headers.apikey });
    if (request.url !== "/auth/v1/user") {
      return sendJson(response, 401, { error: "invalid session" });
    }
    if (request.headers.authorization === "Bearer unverified-token") {
      return sendJson(response, 200, { id: "unverified-parent", email: "unverified@example.test", email_confirmed_at: null });
    }
    if (request.headers.authorization === "Bearer anonymous-token") {
      return sendJson(response, 200, { id: "anonymous-user", email: "", is_anonymous: true });
    }
    if (request.headers.authorization !== `Bearer ${PARENT_TOKEN}`) {
      return sendJson(response, 401, { error: "invalid session" });
    }
    return sendJson(response, 200, { id: "parent-one", email: "parent@example.test", email_confirmed_at: "2026-01-01T00:00:00Z" });
  });
  return { server, requests };
}

function createElevenLabsMock() {
  const state = { listMode: "normal", ttsMode: "normal", ttsDelayMs: 0 };
  const requests = [];
  const server = createServer(async (request, response) => {
    const body = await readRequestBody(request);
    requests.push({ method: request.method, url: request.url, apiKey: request.headers["xi-api-key"], body: body.toString("utf8") });
    if (request.headers["xi-api-key"] !== API_KEY) return sendJson(response, 401, { detail: "invalid key" });

    if (request.method === "GET" && request.url?.startsWith("/v2/voices")) {
      if (state.listMode === "slow") {
        await sleep(250);
        if (response.destroyed) return;
      }
      if (state.listMode === "oversize") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.write(Buffer.alloc(800, 0x20));
        response.end(Buffer.alloc(800, 0x20));
        return;
      }
      if (state.listMode === "wrong-mime") {
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end("<p>not voices</p>");
        return;
      }
      const voices = Array.from({ length: 130 }, (_, index) => ({
        voice_id: index ? `voice${index}` : SAFE_VOICE_ID,
        name: `ElevenLabs Voice ${index + 1}`,
        description: "A tested ElevenLabs voice.",
        category: index === 1 ? "professional" : "premade",
        recording_quality: index === 1 ? "studio" : "standard",
        preview_url: `https://example.test/voice-${index}.mp3`,
        labels: { accent: "British", use_case: "narration" }
      }));
      return sendJson(response, 200, { voices, has_more: false, next_page_token: null });
    }

    if (request.method === "POST" && request.url?.startsWith(`/v1/text-to-speech/${SAFE_VOICE_ID}/stream`)) {
      if (state.ttsDelayMs) {
        await sleep(state.ttsDelayMs);
        if (response.destroyed) return;
      }
      if (state.ttsMode === "wrong-mime") return sendJson(response, 200, { not: "audio" });
      if (state.ttsMode === "empty") {
        response.writeHead(200, { "Content-Type": "audio/mpeg" });
        response.end();
        return;
      }
      if (state.ttsMode === "oversize") {
        response.writeHead(200, { "Content-Type": "audio/mpeg" });
        response.write(Buffer.alloc(800, 0x41));
        response.end(Buffer.alloc(800, 0x42));
        return;
      }
      const audio = Buffer.from("ID3-kiddosprout-mocked-elevenlabs-audio");
      response.writeHead(200, { "Content-Type": "audio/mpeg", "Content-Length": String(audio.length) });
      response.end(audio);
      return;
    }
    sendJson(response, 404, { error: "not found" });
  });
  return { server, requests, state };
}

function startVoiceApi({ port, authPort, providerPort, key = API_KEY, publicDemoOnly = false, extraEnv = {} }) {
  const output = { stdout: "", stderr: "" };
  const child = spawn(process.execPath, [voiceServerPath.pathname], {
    cwd: projectRoot.pathname,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      PUBLIC_DEMO_ONLY: publicDemoOnly ? "true" : "false",
      SUPABASE_URL: `http://${MOCK_URL_HOST}:${authPort}`,
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_voice-test-key",
      ELEVENLABS_API_KEY: key,
      ELEVENLABS_VOICE_ID: SAFE_VOICE_ID,
      ELEVENLABS_MODEL_ID: "eleven_multilingual_v2",
      ELEVENLABS_ALLOWED_VOICE_IDS: SAFE_VOICE_ID,
      ELEVENLABS_TEST_BASE_URL: `http://${MOCK_URL_HOST}:${providerPort}`,
      VOICE_MAX_AUDIO_BYTES: "1024",
      VOICE_MAX_LIST_BYTES: "65536",
      VOICE_MAX_JSON_BYTES: "1024",
      VOICE_AUTH_TIMEOUT_MS: "150",
      VOICE_LIST_TIMEOUT_MS: "100",
      VOICE_TTS_TIMEOUT_MS: "100",
      VOICE_STATE_CLEANUP_INTERVAL_MS: "25",
      ...extraEnv
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output.stdout += chunk; });
  child.stderr.on("data", (chunk) => { output.stderr += chunk; });
  return { child, output, baseUrl: `http://${API_HOST}:${port}` };
}

async function waitForVoiceApi(instance) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (instance.child.exitCode !== null) throw new Error(`Voice API exited early.\n${instance.output.stderr}`);
    try {
      const response = await fetch(`${instance.baseUrl}/health`, { signal: AbortSignal.timeout(300) });
      if (response.ok) return;
    } catch (error) {
      // Wait for the process to bind.
    }
    await sleep(40);
  }
  throw new Error(`Voice API did not start.\n${instance.output.stderr}`);
}

async function stopVoiceApi(instance) {
  if (instance.child.exitCode !== null) return;
  const exitPromise = once(instance.child, "exit");
  instance.child.kill("SIGTERM");
  let exitResult = await Promise.race([exitPromise, sleep(1_000).then(() => null)]);
  if (!exitResult) {
    instance.child.kill("SIGKILL");
    exitResult = await exitPromise;
  }
  assert.deepEqual(exitResult, [0, null],
    "a running Voice API must drain and exit cleanly when Docker sends SIGTERM");
}

function assertPrivateResponseHeaders(response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0, must-revalidate");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("expires"), "0");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("vary") || "", /(?:^|,\s*)Authorization(?:,|$)/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.match(response.headers.get("content-security-policy") || "", /default-src 'none'/);
  assert.equal(response.headers.get("access-control-allow-origin"), null,
    "private APIs must never opt into cross-origin browser reads");
}

async function api(instance, pathname, { method = "GET", token, json, raw } = {}) {
  const response = await fetch(`${instance.baseUrl}${pathname}`, {
    method,
    headers: {
      Connection: "close",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(json !== undefined || raw !== undefined ? { "Content-Type": "application/json" } : {})
    },
    body: raw !== undefined ? raw : json !== undefined ? JSON.stringify(json) : undefined
  });
  assertPrivateResponseHeaders(response);
  return response;
}

function trustedRequest(location, additions = {}) {
  return {
    bookId: location.bookId,
    chapterIndex: location.chapterIndex,
    pageIndex: location.pageIndex,
    mood: "cheerful",
    voiceId: SAFE_VOICE_ID,
    ...additions
  };
}

async function responseCode(response) {
  const payload = await response.json();
  return payload.code;
}

async function withVoiceApi(options, callback) {
  let instance = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const port = await freePort();
    const candidate = startVoiceApi({ ...options, port });
    try {
      await waitForVoiceApi(candidate);
      instance = candidate;
      break;
    } catch (error) {
      await stopVoiceApi(candidate);
      const detail = `${String(error?.message || error)}\n${candidate.output.stderr}`;
      if (!/EADDRINUSE/.test(detail) || attempt === 4) throw error;
      // Releasing a probe socket and starting the child is not atomic. Another
      // local process may claim that ephemeral port in between, so retry with
      // a newly selected port instead of making the complete suite flaky.
      await sleep(20);
    }
  }
  assert.ok(instance, "voice test API did not obtain a free local port");
  try {
    await callback(instance);
  } finally {
    await stopVoiceApi(instance);
  }
  return instance;
}

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: (key) => values.delete(String(key)),
    values
  };
}

async function testScopedBrowserChoice() {
  const source = await readFile(new URL("story-voice-choice.js", projectRoot), "utf8");
  const localStorage = storage();
  const sessionStorage = storage();
  localStorage.setItem("kiddosproutStoryVoice", JSON.stringify({ source: "device", id: "old", name: "Old" }));
  localStorage.setItem("kiddosproutSupabaseSession", JSON.stringify({ access_token: "stale", user: { id: "wrong-user" } }));
  const current = { session: null, child: "Alex Smith" };
  const window = {
    localStorage,
    sessionStorage,
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: false },
    KiddoSproutSession: { getSession: () => current.session },
    KiddoHubGate: {
      readState: () => ({ activeChild: current.child, children: { [current.child]: {} } })
    }
  };
  vm.runInNewContext(source, { window }, { filename: "story-voice-choice.js" });
  assert.equal(localStorage.getItem("kiddosproutStoryVoice"), null, "legacy unscoped choice must be cleared");
  assert.equal(window.KiddoSproutStoryVoiceChoice.read(), null, "central helper returning no session must not fall back to stale storage");
  current.session = { user: { id: "family-one" } };
  localStorage.setItem("kiddosproutStoryVoice:user:family-one", JSON.stringify({ source: "device", id: "sibling", name: "Sibling voice" }));
  assert.equal(window.KiddoSproutStoryVoiceChoice.write({ source: "elevenlabs", id: SAFE_VOICE_ID, name: "Eleven Voice" }), true);
  assert.equal(localStorage.getItem("kiddosproutStoryVoice:user:family-one"), null,
    "An old account-wide voice must not be silently assigned to the active child.");
  assert.equal(window.KiddoSproutStoryVoiceChoice.read().id, SAFE_VOICE_ID);
  assert.equal(window.KiddoSproutStoryVoiceChoice.write({ source: "device", id: {}, name: "Invalid" }), false,
    "Malformed cached voice fields must not be coerced into misleading strings.");
  assert.equal(window.KiddoSproutStoryVoiceChoice.write({ source: "device", id: "voice", name: "  Friendly   Voice  " }), true);
  assert.equal(window.KiddoSproutStoryVoiceChoice.read().name, "Friendly Voice");
  const familyOneChoiceKey = window.KiddoSproutStoryVoiceChoice.key();
  localStorage.setItem(familyOneChoiceKey, "{broken-json");
  assert.equal(window.KiddoSproutStoryVoiceChoice.read(), null,
    "Corrupted voice storage must recover without breaking Story Theater.");
  assert.equal(localStorage.getItem(familyOneChoiceKey), null,
    "Corrupted voice storage should be cleared instead of failing on every visit.");
  assert.equal(window.KiddoSproutStoryVoiceChoice.write({ source: "device", id: "alex-voice", name: "Alex voice" }), true);
  current.child = "Jamie Jones";
  assert.equal(window.KiddoSproutStoryVoiceChoice.read(), null,
    "A sibling must not inherit the active child's story sound.");
  assert.equal(window.KiddoSproutStoryVoiceChoice.write({ source: "device", id: "jamie-voice", name: "Jamie voice" }), true);
  current.child = "Alex Smith";
  assert.equal(window.KiddoSproutStoryVoiceChoice.read().id, "alex-voice",
    "Switching back to a child should restore only that child's story sound.");
  current.session = { user: { id: "family-two" } };
  assert.equal(window.KiddoSproutStoryVoiceChoice.read(), null, "a second family must not inherit the first family's voice");

  const blockedWindow = {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: false },
    KiddoSproutSession: { getSession: () => ({ user: { id: "family-blocked-storage" } }) },
    KiddoHubGate: { readState: () => ({ activeChild: "Alex", children: { Alex: {} } }) },
    get localStorage() { throw new Error("storage blocked"); },
    get sessionStorage() { throw new Error("storage blocked"); }
  };
  vm.runInNewContext(source, { window: blockedWindow }, { filename: "story-voice-choice-blocked-storage.js" });
  assert.equal(blockedWindow.KiddoSproutStoryVoiceChoice.read(), null,
    "privacy-restricted storage must not break the voice page while reading");
  assert.equal(blockedWindow.KiddoSproutStoryVoiceChoice.write({ source: "device", id: "blocked", name: "Blocked" }), false,
    "privacy-restricted storage must report that a voice choice was not saved");
  assert.equal(blockedWindow.KiddoSproutStoryVoiceChoice.key(), "",
    "privacy-restricted storage must not break storage-event handling");
}

const auth = createAuthMock();
const eleven = createElevenLabsMock();
const authPort = await listen(auth.server);
const providerPort = await listen(eleven.server);

try {
  await testScopedBrowserChoice();

  const mainInstance = await withVoiceApi({ authPort, providerPort }, async (voice) => {
    let response = await api(voice, "/health");
    let payload = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(payload, { ok: true }, "health must not disclose voice-provider or story-catalog configuration");

    const providerBeforeAuth = eleven.requests.length;
    response = await api(voice, "/story-voices");
    assert.equal(response.status, 401);
    assert.equal(eleven.requests.length, providerBeforeAuth, "unauthenticated requests must not reach ElevenLabs");

    response = await api(voice, "/story-voices", { token: "unverified-token" });
    assert.equal(response.status, 403, "an unverified account must not spend paid voice-provider requests");
    assert.equal(await responseCode(response), "email_not_verified");
    response = await api(voice, "/story-voice", {
      method: "POST",
      token: "anonymous-token",
      json: trustedRequest(trustedLocations[0])
    });
    assert.equal(response.status, 403, "an anonymous Supabase user must not act as a verified parent");
    assert.equal(await responseCode(response), "email_not_verified");
    assert.equal(eleven.requests.length, providerBeforeAuth, "unverified and anonymous users must not reach ElevenLabs");

    response = await api(voice, "/story-voices", { token: PARENT_TOKEN });
    payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.voices.length, 120, "sanitized voice output must be capped");
    assert.equal(payload.voices[0].name, "ElevenLabs Voice 1");

    const ttsBeforeUntrusted = eleven.requests.filter((request) => request.method === "POST").length;
    response = await api(voice, "/story-voice", {
      method: "POST",
      token: PARENT_TOKEN,
      json: { ...trustedRequest(trustedLocations[0]), text: "private arbitrary text" }
    });
    assert.equal(response.status, 400);
    assert.equal(await responseCode(response), "arbitrary_text_not_allowed");
    assert.equal(eleven.requests.filter((request) => request.method === "POST").length, ttsBeforeUntrusted);

    response = await api(voice, "/story-voice", {
      method: "POST",
      token: PARENT_TOKEN,
      json: { ...trustedRequest(trustedLocations[0]), pageIndex: 9999 }
    });
    assert.equal(response.status, 400);
    assert.equal(await responseCode(response), "story_location_not_allowed");

    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, raw: "{" });
    assert.equal(response.status, 400);
    assert.equal(await responseCode(response), "invalid_json");

    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, raw: `{"padding":"${"x".repeat(1_100)}"}` });
    assert.equal(response.status, 413);
    assert.equal(await responseCode(response), "request_too_large");

    eleven.state.ttsMode = "normal";
    eleven.state.ttsDelayMs = 0;
    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[0]) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "audio/mpeg");
    assert.equal(response.headers.get("x-story-voice"), "elevenlabs");
    assert.equal(response.headers.get("x-story-voice-cache"), "miss");
    assert.match(Buffer.from(await response.arrayBuffer()).toString(), /^ID3/);
    const firstTts = eleven.requests.filter((request) => request.method === "POST");
    assert.equal(firstTts.length, 1);
    const sentBody = JSON.parse(firstTts[0].body);
    assert.equal(sentBody.text, trustedLocations[0].text, "server must source text from its catalog");
    assert.equal(sentBody.model_id, "eleven_multilingual_v2");

    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[0]) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-story-voice-cache"), "hit");
    await response.arrayBuffer();
    assert.equal(eleven.requests.filter((request) => request.method === "POST").length, 1, "cache hit must not spend credits");

    eleven.state.ttsMode = "wrong-mime";
    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[1]) });
    assert.equal(response.status, 502);
    assert.equal(await responseCode(response), "invalid_audio_type");

    eleven.state.ttsMode = "empty";
    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[2]) });
    assert.equal(response.status, 502);
    assert.equal(await responseCode(response), "invalid_audio");

    eleven.state.ttsMode = "oversize";
    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[3]) });
    assert.equal(response.status, 502);
    assert.equal(await responseCode(response), "invalid_audio");

    eleven.state.ttsMode = "normal";
    eleven.state.ttsDelayMs = 250;
    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[4]) });
    assert.equal(response.status, 504);
    assert.equal(await responseCode(response), "voice_timeout");
    eleven.state.ttsDelayMs = 0;
  });
  assert.equal(`${mainInstance.output.stdout}\n${mainInstance.output.stderr}`.includes(API_KEY), false, "API key must never appear in service logs");

  const authBeforeDemo = auth.requests.length;
  const providerBeforeDemo = eleven.requests.length;
  await withVoiceApi({ authPort, providerPort, publicDemoOnly: true }, async (voice) => {
    let response = await api(voice, "/health");
    const health = await response.json();
    assert.equal(response.status, 200, "demo-only healthcheck must remain live");
    assert.deepEqual(health, { ok: true });
    response = await api(voice, "/story-voices", { token: PARENT_TOKEN });
    assert.equal(response.status, 403);
    assert.equal(await responseCode(response), "public_demo_only");
    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[0]) });
    assert.equal(response.status, 403);
  });
  assert.equal(auth.requests.length, authBeforeDemo, "public demo must not call the account service");
  assert.equal(eleven.requests.length, providerBeforeDemo, "public demo must make zero ElevenLabs calls");

  await withVoiceApi({ authPort, providerPort, key: "" }, async (voice) => {
    const providerBefore = eleven.requests.length;
    const response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[0]) });
    assert.equal(response.status, 503);
    assert.equal(await responseCode(response), "voice_not_configured");
    assert.equal(eleven.requests.length, providerBefore);
  });

  eleven.state.listMode = "oversize";
  await withVoiceApi({ authPort, providerPort, extraEnv: { VOICE_MAX_LIST_BYTES: "1024" } }, async (voice) => {
    const response = await api(voice, "/story-voices", { token: PARENT_TOKEN });
    assert.equal(response.status, 502);
    assert.equal(await responseCode(response), "voice_library_response_too_large");
  });

  eleven.state.listMode = "slow";
  await withVoiceApi({ authPort, providerPort, extraEnv: { VOICE_LIST_TIMEOUT_MS: "40" } }, async (voice) => {
    const response = await api(voice, "/story-voices", { token: PARENT_TOKEN });
    assert.equal(response.status, 504);
    assert.equal(await responseCode(response), "voice_library_timeout");
  });

  eleven.state.listMode = "normal";
  eleven.state.ttsMode = "normal";
  eleven.state.ttsDelayMs = 0;
  await withVoiceApi({
    authPort,
    providerPort,
    extraEnv: { VOICE_USER_GENERATION_LIMIT: "" }
  }, async (voice) => {
    let response = await api(voice, "/story-voice", {
      method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[6])
    });
    assert.equal(response.status, 200);
    await response.arrayBuffer();
    response = await api(voice, "/story-voice", {
      method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[7])
    });
    assert.equal(response.status, 200,
      "an empty optional numeric environment variable must use its documented default, not the minimum limit");
    await response.arrayBuffer();
  });

  await withVoiceApi({
    authPort,
    providerPort,
    extraEnv: { VOICE_USER_GENERATION_LIMIT: "1", VOICE_GENERATION_WINDOW_MS: "50", VOICE_AUDIO_CACHE_TTL_MS: "20" }
  }, async (voice) => {
    let response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[0]) });
    assert.equal(response.status, 200);
    await response.arrayBuffer();
    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[1]) });
    assert.equal(response.status, 429);
    assert.equal(await responseCode(response), "voice_limit_reached");
    await sleep(80);
    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[1]) });
    assert.equal(response.status, 200, "expired user limit state must be removed");
    await response.arrayBuffer();
  });

  eleven.state.ttsDelayMs = 140;
  await withVoiceApi({
    authPort,
    providerPort,
    extraEnv: { VOICE_CONCURRENT_GENERATION_LIMIT: "1", VOICE_USER_GENERATION_LIMIT: "2", VOICE_TTS_TIMEOUT_MS: "500" }
  }, async (voice) => {
    const firstPromise = api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[0]) });
    const deadline = Date.now() + 1_000;
    while (Date.now() < deadline && !eleven.requests.some((request) => request.method === "POST" && request.body.includes(trustedLocations[0].text.slice(0, 40)))) await sleep(10);
    let response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[1]) });
    assert.equal(response.status, 429);
    assert.equal(await responseCode(response), "voice_busy");
    const first = await firstPromise;
    assert.equal(first.status, 200);
    await first.arrayBuffer();
    response = await api(voice, "/story-voice", { method: "POST", token: PARENT_TOKEN, json: trustedRequest(trustedLocations[1]) });
    assert.equal(response.status, 200, "a busy rejection must not consume a generation allowance");
    await response.arrayBuffer();
  });

  console.log("Voice API security, limits, cache, timeout, and trusted-story tests passed.");
} finally {
  await closeServer(auth.server);
  await closeServer(eleven.server);
}
