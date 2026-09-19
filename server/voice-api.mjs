import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { browserSafeSupabaseKey, internalSupabaseUrl } from "./account-service-config.mjs";

const PORT = numericSetting("PORT", 8787, 0, 65535);
const IS_TEST = process.env.NODE_ENV === "test";
const ELEVENLABS_API_KEY = String(process.env.ELEVENLABS_API_KEY || "").trim();
const RAW_ELEVENLABS_VOICE_ID = String(process.env.ELEVENLABS_VOICE_ID || "").trim();
const RAW_ALLOWED_VOICE_IDS = String(process.env.ELEVENLABS_ALLOWED_VOICE_IDS || "").split(",").map((value) => value.trim()).filter(Boolean);
const ELEVENLABS_MODEL_ID = String(process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2").trim();
const SUPABASE_URL = internalSupabaseUrl(process.env.SUPABASE_URL);
const SUPABASE_PUBLISHABLE_KEY = browserSafeSupabaseKey(
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
);
const PUBLIC_DEMO_ONLY = booleanEnvironment("PUBLIC_DEMO_ONLY", false);

function numericSetting(name, fallback, minimum, maximum) {
  const raw = String(process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function booleanEnvironment(name, fallback) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be exactly true or false.`);
}

const MAX_JSON_BYTES = numericSetting("VOICE_MAX_JSON_BYTES", 24_000, 1_024, 64_000);
const MAX_AUTH_RESPONSE_BYTES = 256 * 1024;
const MAX_AUDIO_BYTES = numericSetting("VOICE_MAX_AUDIO_BYTES", 12 * 1024 * 1024, 1_024, 24 * 1024 * 1024);
const MAX_VOICE_LIST_BYTES = numericSetting("VOICE_MAX_LIST_BYTES", 2 * 1024 * 1024, 1_024, 8 * 1024 * 1024);
const MAX_CACHE_BYTES = numericSetting("VOICE_MAX_CACHE_BYTES", 48 * 1024 * 1024, MAX_AUDIO_BYTES, 128 * 1024 * 1024);
const AUDIO_CACHE_TTL_MS = numericSetting("VOICE_AUDIO_CACHE_TTL_MS", 60 * 60 * 1000, 10, 24 * 60 * 60 * 1000);
const GENERATION_WINDOW_MS = numericSetting("VOICE_GENERATION_WINDOW_MS", 60 * 60 * 1000, 10, 24 * 60 * 60 * 1000);
const VOICE_LIST_WINDOW_MS = numericSetting("VOICE_LIST_WINDOW_MS", 60 * 1000, 10, 60 * 60 * 1000);
const STATE_CLEANUP_INTERVAL_MS = numericSetting("VOICE_STATE_CLEANUP_INTERVAL_MS", 5 * 60 * 1000, 10, 60 * 60 * 1000);
const AUTH_TIMEOUT_MS = numericSetting("VOICE_AUTH_TIMEOUT_MS", 8_000, 25, 30_000);
const VOICE_LIST_TIMEOUT_MS = numericSetting("VOICE_LIST_TIMEOUT_MS", 12_000, 25, 60_000);
const TTS_TIMEOUT_MS = numericSetting("VOICE_TTS_TIMEOUT_MS", 90_000, 25, 120_000);
const REQUEST_TIMEOUT_MS = numericSetting("VOICE_REQUEST_TIMEOUT_MS", 15_000, 100, 60_000);
const HEADERS_TIMEOUT_MS = numericSetting("VOICE_HEADERS_TIMEOUT_MS", 10_000, 100, REQUEST_TIMEOUT_MS);
const SHUTDOWN_TIMEOUT_MS = numericSetting("VOICE_SHUTDOWN_TIMEOUT_MS", 8_000, 1_000, 30_000);
const MAX_GENERATIONS_PER_WINDOW = numericSetting("VOICE_USER_GENERATION_LIMIT", 20, 1, 500);
const MAX_DEPLOYMENT_GENERATIONS_PER_WINDOW = numericSetting("VOICE_DEPLOYMENT_GENERATION_LIMIT", 60, 1, 2_000);
const MAX_CONCURRENT_GENERATIONS = numericSetting("VOICE_CONCURRENT_GENERATION_LIMIT", 4, 1, 20);
const MAX_VOICE_LIST_REQUESTS = numericSetting("VOICE_LIST_REQUEST_LIMIT", 30, 1, 300);
const MAX_VOICE_RECORDS = 300;
const MAX_RETURNED_VOICES = 120;
const ALLOWED_AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp3"]);
const MODEL_CHARACTER_LIMITS = Object.freeze({
  eleven_v3: 5_000,
  eleven_multilingual_v2: 10_000,
  eleven_flash_v2_5: 40_000,
  eleven_flash_v2: 30_000
});
const MODEL_CHARACTER_LIMIT = MODEL_CHARACTER_LIMITS[ELEVENLABS_MODEL_ID] || 0;

function isSafeVoiceId(value) {
  return /^[A-Za-z0-9_-]{1,120}$/.test(String(value || ""));
}

const VOICE_IDS_CONFIG_VALID = [RAW_ELEVENLABS_VOICE_ID, ...RAW_ALLOWED_VOICE_IDS].every((value) => !value || isSafeVoiceId(value));
const ELEVENLABS_VOICE_ID = isSafeVoiceId(RAW_ELEVENLABS_VOICE_ID) ? RAW_ELEVENLABS_VOICE_ID : "";
const ELEVENLABS_ALLOWED_VOICE_IDS = new Set(RAW_ALLOWED_VOICE_IDS.filter(isSafeVoiceId));

function providerBaseUrl() {
  const official = "https://api.elevenlabs.io";
  if (!IS_TEST || !process.env.ELEVENLABS_TEST_BASE_URL) return official;
  try {
    const candidate = new URL(process.env.ELEVENLABS_TEST_BASE_URL);
    const loopback = ["127.0.0.1", "localhost", "[::1]", "::1"].includes(candidate.hostname);
    if (candidate.protocol !== "http:" || !loopback || candidate.username || candidate.password) return official;
    return candidate.toString().replace(/\/+$/, "");
  } catch (error) {
    return official;
  }
}

const ELEVENLABS_API_BASE_URL = providerBaseUrl();

function loadTrustedStories() {
  const defaultPath = fileURLToPath(new URL("./trusted-story-catalog.json", import.meta.url));
  const catalogPath = IS_TEST && process.env.VOICE_STORY_CATALOG_PATH
    ? String(process.env.VOICE_STORY_CATALOG_PATH)
    : defaultPath;
  const raw = readFileSync(catalogPath);
  if (!raw.length || raw.length > 16 * 1024 * 1024) throw new Error("Trusted story catalog has an invalid size.");
  const catalog = JSON.parse(raw.toString("utf8"));
  const rawEntries = catalog?.version === 1 && catalog?.entries && typeof catalog.entries === "object"
    ? Object.entries(catalog.entries)
    : [];
  if (!rawEntries.length || rawEntries.length > 5_000) throw new Error("Trusted story catalog has no usable entries.");
  const stories = new Map();
  for (const [location, text] of rawEntries) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}:\d{1,4}:\d{1,4}$/.test(location)) throw new Error("Trusted story catalog contains an invalid location.");
    const narration = String(text || "").trim();
    if (!narration || narration.length > 40_000) throw new Error(`Trusted story narration has an invalid length at ${location}.`);
    stories.set(location, narration);
  }
  return stories;
}

const TRUSTED_STORIES = loadTrustedStories();
const audioCache = new Map();
const inFlightAudio = new Map();
const requestBuckets = new Map();
const voiceListBuckets = new Map();
let audioCacheBytes = 0;
let accountVoicesCache = { expiresAt: 0, voices: [] };
let accountVoicesPromise = null;
let deploymentRequestTimes = [];
let activeGenerations = 0;
let lastStateCleanup = 0;
let shuttingDown = false;

const VOICE_MOODS = Object.freeze({
  cozy: Object.freeze({ stability: 0.68, similarity_boost: 0.78, style: 0.05, use_speaker_boost: true, speed: 0.88 }),
  cheerful: Object.freeze({ stability: 0.46, similarity_boost: 0.78, style: 0.12, use_speaker_boost: true, speed: 0.96 }),
  adventure: Object.freeze({ stability: 0.38, similarity_boost: 0.78, style: 0.2, use_speaker_boost: true, speed: 1.02 })
});

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sendJson(response, status, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(body.length),
    ...extraHeaders,
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Referrer-Policy": "no-referrer",
    "Vary": "Authorization",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'"
  });
  response.end(body);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let settled = false;
    const chunks = [];
    const contentType = String(request.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      request.resume();
      reject(new HttpError(415, "Send voice requests as JSON.", "unsupported_media_type"));
      return;
    }
    const declaredLength = String(request.headers["content-length"] || "").trim();
    if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_JSON_BYTES)) {
      request.resume();
      reject(new HttpError(413, "That voice request is too large.", "request_too_large"));
      return;
    }
    request.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_JSON_BYTES) {
        settled = true;
        chunks.length = 0;
        reject(new HttpError(413, "That voice request is too large.", "request_too_large"));
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        if (!body || Array.isArray(body) || typeof body !== "object") throw new Error("JSON body must be an object.");
        resolve(body);
      } catch (error) {
        reject(new HttpError(400, "The voice request was not understood.", "invalid_json"));
      }
    });
    request.on("error", reject);
    request.on("aborted", () => {
      if (settled) return;
      settled = true;
      reject(new HttpError(400, "The voice request ended before it was complete.", "incomplete_request"));
    });
  });
}

function bearerToken(request) {
  const match = String(request.headers.authorization || "").match(/^Bearer\s+([^\s]+)$/i);
  const token = match ? match[1] : "";
  return token.length <= 8192 ? token : "";
}

function timedOut(error) {
  return error?.name === "TimeoutError" || error?.name === "AbortError";
}

async function discardBody(response) {
  try {
    await response?.body?.cancel();
  } catch (error) {
    // The upstream connection is already closed.
  }
}

async function readBoundedBody(response, maximumBytes, errorMessage, errorCode) {
  const lengthHeader = String(response.headers.get("content-length") || "").trim();
  if (/^\d+$/.test(lengthHeader) && Number(lengthHeader) > maximumBytes) {
    await discardBody(response);
    throw new HttpError(502, errorMessage, errorCode);
  }
  if (!response.body) throw new HttpError(502, errorMessage, errorCode);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel("response too large").catch(() => {});
        throw new HttpError(502, errorMessage, errorCode);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function authenticatedUser(request) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, "A parent needs to log in before using ElevenLabs story voices.", "login_required");
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new HttpError(503, "Account verification is not configured.", "account_service_unavailable");
  let authResponse;
  try {
    authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS)
    });
  } catch (error) {
    throw new HttpError(503, "Account verification is taking a break.", "account_service_unavailable");
  }
  if (!authResponse.ok) {
    await discardBody(authResponse);
    if (authResponse.status === 429) throw new HttpError(429, "Account verification is busy. Try again shortly.", "account_service_rate_limited");
    if (authResponse.status === 408 || authResponse.status >= 500) {
      throw new HttpError(503, "Account verification is taking a break.", "account_service_unavailable");
    }
    throw new HttpError(401, "Please ask a parent to log in again.", "session_expired");
  }
  let user;
  try {
    const contentType = String(authResponse.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json" && !contentType.endsWith("+json")) {
      await discardBody(authResponse);
      throw new Error("Unexpected account-service content type.");
    }
    const bytes = await readBoundedBody(
      authResponse,
      MAX_AUTH_RESPONSE_BYTES,
      "Account verification returned an unusable reply.",
      "account_service_unavailable"
    );
    user = JSON.parse(bytes.toString("utf8") || "{}");
  } catch (error) {
    throw new HttpError(503, "Account verification returned an unusable reply.", "account_service_unavailable");
  }
  const id = String(user?.id || "");
  if (!id || id.length > 256) throw new HttpError(401, "Please ask a parent to log in again.", "session_expired");
  const email = String(user?.email || "").trim();
  const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  if (!email || email.length > 320 || !emailVerified || user?.is_anonymous === true) {
    throw new HttpError(403, "Confirm the parent email before using ElevenLabs story voices.", "email_not_verified");
  }
  return { id };
}

function pruneTimestampBuckets(buckets, cutoff) {
  for (const [key, timestamps] of buckets) {
    const recent = timestamps.filter((timestamp) => timestamp > cutoff);
    if (recent.length) buckets.set(key, recent);
    else buckets.delete(key);
  }
}

function deleteCachedAudio(key) {
  const cached = audioCache.get(key);
  if (!cached) return;
  audioCache.delete(key);
  audioCacheBytes = Math.max(0, audioCacheBytes - cached.audio.length);
}

function cleanupState(now = Date.now(), force = false) {
  if (!force && now - lastStateCleanup < STATE_CLEANUP_INTERVAL_MS) return;
  lastStateCleanup = now;
  pruneTimestampBuckets(requestBuckets, now - GENERATION_WINDOW_MS);
  pruneTimestampBuckets(voiceListBuckets, now - VOICE_LIST_WINDOW_MS);
  deploymentRequestTimes = deploymentRequestTimes.filter((timestamp) => timestamp > now - GENERATION_WINDOW_MS);
  for (const [key, cached] of audioCache) if (cached.expiresAt <= now) deleteCachedAudio(key);
  if (accountVoicesCache.expiresAt <= now) accountVoicesCache = { expiresAt: 0, voices: [] };
}

const cleanupTimer = setInterval(() => cleanupState(Date.now(), true), STATE_CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

function enforceRateLimit(userId) {
  const now = Date.now();
  cleanupState(now);
  const cutoff = now - GENERATION_WINDOW_MS;
  deploymentRequestTimes = deploymentRequestTimes.filter((timestamp) => timestamp > cutoff);
  if (deploymentRequestTimes.length >= MAX_DEPLOYMENT_GENERATIONS_PER_WINDOW) {
    throw new HttpError(429, "KiddoSprout's overall ElevenLabs voice limit has been reached. Try again a little later.", "deployment_voice_limit_reached");
  }
  const recent = (requestBuckets.get(userId) || []).filter((timestamp) => timestamp > cutoff);
  if (recent.length >= MAX_GENERATIONS_PER_WINDOW) {
    throw new HttpError(429, "The ElevenLabs story voice needs a rest. Try again a little later.", "voice_limit_reached");
  }
  recent.push(now);
  requestBuckets.set(userId, recent);
  deploymentRequestTimes.push(now);
}

function enforceVoiceListRate(userId) {
  const now = Date.now();
  cleanupState(now);
  const cutoff = now - VOICE_LIST_WINDOW_MS;
  const recent = (voiceListBuckets.get(userId) || []).filter((timestamp) => timestamp > cutoff);
  if (recent.length >= MAX_VOICE_LIST_REQUESTS) throw new HttpError(429, "The voice shelf is being opened too quickly. Try again in a moment.", "voice_list_limit_reached");
  recent.push(now);
  voiceListBuckets.set(userId, recent);
}

function assertVoiceConfiguration() {
  if (!ELEVENLABS_API_KEY) throw new HttpError(503, "ElevenLabs story voices are not set up yet.", "voice_not_configured");
  if (!MODEL_CHARACTER_LIMIT) throw new HttpError(503, "The configured ElevenLabs model is not approved for Story Theater.", "voice_model_not_supported");
  if (!VOICE_IDS_CONFIG_VALID) throw new HttpError(503, "An ElevenLabs voice ID needs to be corrected.", "voice_id_configuration_invalid");
}

function trustedStoryText(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "The voice request was not understood.", "invalid_json");
  if (Object.hasOwn(body, "text")) throw new HttpError(400, "Only KiddoSprout Story Theater pages can be narrated.", "arbitrary_text_not_allowed");
  const bookId = String(body.bookId || "").trim();
  const chapterIndex = Number(body.chapterIndex);
  const pageIndex = Number(body.pageIndex);
  if (!Object.hasOwn(body, "chapterIndex") || !Object.hasOwn(body, "pageIndex")
      || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(bookId)
      || !Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex > 9_999
      || !Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex > 9_999) {
    throw new HttpError(400, "Choose a Story Theater page first.", "story_location_required");
  }
  const text = TRUSTED_STORIES.get(`${bookId}:${chapterIndex}:${pageIndex}`);
  if (!text) throw new HttpError(400, "That page is not in the approved Story Theater catalog.", "story_location_not_allowed");
  if (text.length > MODEL_CHARACTER_LIMIT) throw new HttpError(413, "That approved story page is too long for the configured ElevenLabs model.", "story_page_too_long");
  return text;
}

function cacheKey(text, mood, voiceId) {
  return createHash("sha256").update(voiceId).update("\0").update(ELEVENLABS_MODEL_ID).update("\0").update(mood).update("\0").update(text).digest("hex");
}

function readCachedAudio(key) {
  cleanupState();
  const cached = audioCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    deleteCachedAudio(key);
    return null;
  }
  audioCache.delete(key);
  audioCache.set(key, cached);
  return cached.audio;
}

function cacheAudio(key, audio) {
  cleanupState();
  if (audio.length > MAX_CACHE_BYTES) return;
  deleteCachedAudio(key);
  while (audioCache.size && audioCacheBytes + audio.length > MAX_CACHE_BYTES) deleteCachedAudio(audioCache.keys().next().value);
  audioCache.set(key, { audio, expiresAt: Date.now() + AUDIO_CACHE_TTL_MS });
  audioCacheBytes += audio.length;
}

function sendAudio(response, audio, cacheState) {
  response.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Content-Length": String(audio.length),
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Referrer-Policy": "no-referrer",
    "Vary": "Authorization",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "X-Story-Voice": "elevenlabs",
    "X-Story-Voice-Cache": cacheState
  });
  response.end(audio);
}

function safePreviewUrl(value) {
  const raw = String(value || "");
  if (!raw || raw.length > 2_048) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "";
  } catch (error) {
    return "";
  }
}

async function fetchVoicePages(query, maxPages = 2) {
  const accountVoices = [];
  let nextPageToken = "";
  for (let page = 0; page < maxPages && accountVoices.length < MAX_VOICE_RECORDS; page += 1) {
    const endpoint = new URL("/v2/voices", `${ELEVENLABS_API_BASE_URL}/`);
    endpoint.searchParams.set("page_size", "100");
    endpoint.searchParams.set("include_total_count", "false");
    Object.entries(query).forEach(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      values.filter(Boolean).forEach((item) => endpoint.searchParams.append(key, String(item)));
    });
    if (nextPageToken) endpoint.searchParams.set("next_page_token", nextPageToken);
    try {
      const upstream = await fetch(endpoint, { headers: { "xi-api-key": ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(VOICE_LIST_TIMEOUT_MS) });
      if (!upstream.ok) {
        console.error(`[voice-api] ElevenLabs voice list failed with status ${upstream.status}.`);
        await discardBody(upstream);
        throw new HttpError(upstream.status === 401 || upstream.status === 403 ? 503 : 502, "The ElevenLabs voice library is unavailable right now.", "voice_library_unavailable");
      }
      const contentType = String(upstream.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
      if (contentType !== "application/json" && !contentType.endsWith("+json")) {
        await discardBody(upstream);
        throw new HttpError(502, "The ElevenLabs voice library returned an unusable reply.", "voice_library_invalid_response");
      }
      const bytes = await readBoundedBody(upstream, MAX_VOICE_LIST_BYTES, "The ElevenLabs voice library returned too much data.", "voice_library_response_too_large");
      let payload;
      try {
        payload = JSON.parse(bytes.toString("utf8"));
      } catch (error) {
        throw new HttpError(502, "The ElevenLabs voice library returned an unusable reply.", "voice_library_invalid_response");
      }
      const voices = Array.isArray(payload?.voices) ? payload.voices : [];
      accountVoices.push(...voices.slice(0, MAX_VOICE_RECORDS - accountVoices.length));
      nextPageToken = payload?.has_more && payload?.next_page_token ? String(payload.next_page_token).slice(0, 1_000) : "";
      if (!nextPageToken) break;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (timedOut(error)) throw new HttpError(504, "The ElevenLabs voice library took too long to answer.", "voice_library_timeout");
      throw new HttpError(502, "The ElevenLabs voice library could not be reached.", "voice_library_unavailable");
    }
  }
  return accountVoices;
}

async function loadAccountVoices() {
  assertVoiceConfiguration();
  cleanupState();
  if (accountVoicesCache.expiresAt > Date.now() && accountVoicesCache.voices.length) return accountVoicesCache.voices;
  if (accountVoicesPromise) return accountVoicesPromise;
  accountVoicesPromise = (async () => {
    const curatedIds = [...new Set([ELEVENLABS_VOICE_ID, ...ELEVENLABS_ALLOWED_VOICE_IDS].filter(Boolean))].slice(0, 100);
    const [defaultVoices, curatedResults] = await Promise.all([
      fetchVoicePages({ voice_type: "default" }, 2),
      curatedIds.length ? fetchVoicePages({ voice_ids: curatedIds }, 1) : Promise.resolve([])
    ]);
    const curatedIdSet = new Set(curatedIds);
    const accountVoices = [...defaultVoices, ...curatedResults.filter((voice) => curatedIdSet.has(String(voice?.voice_id || "")))];
    const uniqueVoices = [...new Map(accountVoices.map((voice) => [String(voice?.voice_id || ""), voice])).values()];
    const voices = uniqueVoices.filter((voice) => isSafeVoiceId(voice?.voice_id) && voice?.name).slice(0, MAX_RETURNED_VOICES).map((voice) => {
      const isProfessional = voice.category === "professional" || voice.sharing?.category === "professional";
      const isStudio = voice.recording_quality === "studio";
      return {
        id: String(voice.voice_id),
        name: String(voice.name).slice(0, 100),
        description: String(voice.description || "An ElevenLabs story voice ready to try.").slice(0, 240),
        category: String(voice.category || "voice").slice(0, 40),
        quality: isProfessional && isStudio ? "studio-pro" : isProfessional ? "pro" : isStudio ? "studio" : "standard",
        previewUrl: safePreviewUrl(voice.preview_url),
        labels: Object.fromEntries(Object.entries(voice.labels || {}).slice(0, 12).map(([key, value]) => [String(key).slice(0, 40), String(value).slice(0, 80)]))
      };
    });
    accountVoicesCache = { expiresAt: Date.now() + 5 * 60 * 1000, voices };
    return voices;
  })();
  try {
    return await accountVoicesPromise;
  } finally {
    accountVoicesPromise = null;
  }
}

async function resolveVoiceId(requestedVoiceId) {
  const voices = await loadAccountVoices();
  if (!voices.length) throw new HttpError(503, "No ElevenLabs voices are available on the approved shelf yet.", "no_voices");
  const requested = String(requestedVoiceId || "").trim();
  if (requested && !isSafeVoiceId(requested)) throw new HttpError(400, "That chosen voice is not valid.", "voice_not_allowed");
  const requestedVoice = requested ? voices.find((voice) => voice.id === requested) : null;
  if (requested && !requestedVoice) throw new HttpError(400, "That chosen voice is no longer on the approved voice shelf.", "voice_not_allowed");
  return (requestedVoice || voices.find((voice) => voice.id === ELEVENLABS_VOICE_ID) || voices[0]).id;
}

async function synthesizeStory(text, mood, voiceId) {
  const endpoint = new URL(`/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`, `${ELEVENLABS_API_BASE_URL}/`);
  endpoint.searchParams.set("output_format", "mp3_44100_128");
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": ELEVENLABS_API_KEY },
      body: JSON.stringify({ text, model_id: ELEVENLABS_MODEL_ID, voice_settings: VOICE_MOODS[mood] }),
      signal: AbortSignal.timeout(TTS_TIMEOUT_MS)
    });
    if (!upstream.ok) {
      console.error(`[voice-api] ElevenLabs text-to-speech failed with status ${upstream.status}.`);
      await discardBody(upstream);
      if (upstream.status === 401 || upstream.status === 403) throw new HttpError(503, "The ElevenLabs account key needs to be checked.", "voice_account_error");
      if (upstream.status === 429) throw new HttpError(429, "The ElevenLabs account has reached its credit or request limit.", "voice_account_limit");
      throw new HttpError(502, "The ElevenLabs story voice is unavailable right now.", "voice_unavailable");
    }
    const contentType = String(upstream.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    if (!ALLOWED_AUDIO_TYPES.has(contentType)) {
      await discardBody(upstream);
      throw new HttpError(502, "ElevenLabs returned the wrong kind of recording.", "invalid_audio_type");
    }
    const audio = await readBoundedBody(upstream, MAX_AUDIO_BYTES, "ElevenLabs returned an unusable recording.", "invalid_audio");
    if (!audio.length) throw new HttpError(502, "ElevenLabs returned an empty recording.", "invalid_audio");
    return audio;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (timedOut(error)) throw new HttpError(504, "The ElevenLabs story voice took too long. A device voice is still available.", "voice_timeout");
    throw new HttpError(502, "The ElevenLabs story voice could not be reached.", "voice_unavailable");
  }
}

function requestPathname(request) {
  try {
    return new URL(request.url || "/", "http://voice-api.local").pathname;
  } catch (error) {
    return "";
  }
}

const server = createServer(async (request, response) => {
  const pathname = requestPathname(request);
  if (request.method === "GET" && pathname === "/health") {
    // Container health checks need only liveness. Do not expose provider
    // configuration or private catalog size to other network peers.
    sendJson(response, 200, { ok: true });
    return;
  }
  if (PUBLIC_DEMO_ONLY) {
    sendJson(response, 403, { error: "ElevenLabs voices are off in this public demo.", code: "public_demo_only" });
    return;
  }
  if (shuttingDown) {
    sendJson(response, 503, { error: "Story voices are restarting. Try again shortly.", code: "service_restarting" });
    return;
  }
  if (request.method === "GET" && pathname === "/story-voices") {
    try {
      const user = await authenticatedUser(request);
      enforceVoiceListRate(user.id);
      const voices = await loadAccountVoices();
      sendJson(response, 200, { voices, defaultVoiceId: ELEVENLABS_VOICE_ID || voices[0]?.id || "" });
    } catch (error) {
      const expectedError = error instanceof HttpError;
      const status = expectedError && Number.isInteger(error.status) ? error.status : 500;
      if (!expectedError) console.error(`[voice-api] Internal voice-list ${error?.name || "Error"}.`);
      sendJson(response, status, {
        error: expectedError ? String(error.message) : "The ElevenLabs voice library is unavailable right now.",
        code: expectedError ? String(error.code || "voice_error") : "voice_error"
      });
    }
    return;
  }
  if (request.method !== "POST" || pathname !== "/story-voice") {
    sendJson(response, 404, { error: "Not found", code: "not_found" });
    return;
  }
  try {
    const user = await authenticatedUser(request);
    assertVoiceConfiguration();
    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "The voice request was not understood.", "invalid_json");
    const mood = Object.hasOwn(VOICE_MOODS, body.mood) ? body.mood : "cheerful";
    const text = trustedStoryText(body);
    const voiceId = await resolveVoiceId(body.voiceId);
    const key = cacheKey(text, mood, voiceId);
    const cached = readCachedAudio(key);
    if (cached) return sendAudio(response, cached, "hit");
    const existingGeneration = inFlightAudio.get(key);
    if (existingGeneration) return sendAudio(response, await existingGeneration, "shared");
    if (activeGenerations >= MAX_CONCURRENT_GENERATIONS) throw new HttpError(429, "Lots of stories are being read right now. Try again in a moment.", "voice_busy");
    enforceRateLimit(user.id);
    const generation = (async () => {
      activeGenerations += 1;
      try {
        const audio = await synthesizeStory(text, mood, voiceId);
        cacheAudio(key, audio);
        return audio;
      } finally {
        activeGenerations -= 1;
      }
    })();
    inFlightAudio.set(key, generation);
    let audio;
    try {
      audio = await generation;
    } finally {
      if (inFlightAudio.get(key) === generation) inFlightAudio.delete(key);
    }
    sendAudio(response, audio, "miss");
  } catch (error) {
    if (response.headersSent) return response.end();
    const expectedError = error instanceof HttpError;
    const status = expectedError && Number.isInteger(error.status) ? error.status : 500;
    if (!expectedError) console.error(`[voice-api] Internal story-voice ${error?.name || "Error"}.`);
    sendJson(response, status, {
      error: expectedError ? String(error.message) : "The ElevenLabs story voice is unavailable right now.",
      code: expectedError ? String(error.code || "voice_error") : "voice_error"
    });
  }
});

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = HEADERS_TIMEOUT_MS;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 100;
server.maxHeadersCount = 48;

function beginShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(cleanupTimer);
  console.log(`[voice-api] ${signal} received; finishing active requests.`);
  const forceTimer = setTimeout(() => {
    console.error("[voice-api] Graceful shutdown timed out.");
    server.closeAllConnections?.();
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();
  server.close((error) => {
    clearTimeout(forceTimer);
    process.exitCode = error ? 1 : 0;
  });
  server.closeIdleConnections?.();
}

process.once("SIGTERM", () => beginShutdown("SIGTERM"));
process.once("SIGINT", () => beginShutdown("SIGINT"));

server.listen(PORT, "0.0.0.0", () => {
  const configured = Boolean(ELEVENLABS_API_KEY && MODEL_CHARACTER_LIMIT && VOICE_IDS_CONFIG_VALID);
  console.log(`[voice-api] Listening on port ${PORT}; ElevenLabs ${configured ? "configured" : "not configured"}; ${TRUSTED_STORIES.size} trusted story pages.`);
});
