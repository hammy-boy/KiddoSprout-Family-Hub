import { createReadStream } from "node:fs";
import { chmod, mkdir, open, rename, stat, unlink } from "node:fs/promises";
import { createServer } from "node:http";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { basename, dirname, isAbsolute } from "node:path";
import { pipeline } from "node:stream/promises";
import { browserSafeSupabaseKey, internalSupabaseUrl } from "./account-service-config.mjs";

const PORT = integerEnvironment("PORT", 8788, 0, 65535);
const SUPABASE_URL = internalSupabaseUrl(process.env.SUPABASE_URL);
const SUPABASE_PUBLISHABLE_KEY = browserSafeSupabaseKey(
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
);
const PUBLIC_DEMO_ONLY = booleanEnvironment("PUBLIC_DEMO_ONLY", false);
const STORE_PATH = absolutePathEnvironment("BLOCKER_PIN_STORE", "/data/blocker-pins.json");
const MAC_VERSION = String(process.env.BLOCKER_MAC_VERSION || process.env.BLOCKER_VERSION || "0.3.1").trim();
const WINDOWS_VERSION = String(process.env.BLOCKER_WINDOWS_VERSION || "0.1.0").trim();

function safeDownloadName(value, fallback) {
  const pattern = /^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/i;
  const fallbackName = basename(String(fallback || ""));
  const safeFallback = pattern.test(fallbackName) ? fallbackName : "KiddoSproutBlocker.zip";
  const requestedName = basename(String(value || ""));
  return pattern.test(requestedName) ? requestedName : safeFallback;
}

const ARTIFACTS = Object.freeze({
  mac: Object.freeze({
    id: "mac",
    platform: "macOS",
    architecture: "Universal (Apple silicon + Intel)",
    path: String(process.env.BLOCKER_MAC_DOWNLOAD_PATH || process.env.BLOCKER_DOWNLOAD_PATH || "/app/downloads/KiddoSproutBlocker-macOS.zip"),
    version: MAC_VERSION,
    filename: safeDownloadName(
      process.env.BLOCKER_MAC_DOWNLOAD_NAME || process.env.BLOCKER_DOWNLOAD_NAME,
      `KiddoSproutBlocker-macOS-v${MAC_VERSION}.zip`
    )
  }),
  windows: Object.freeze({
    id: "windows",
    platform: "Windows",
    architecture: "x64",
    path: String(process.env.BLOCKER_WINDOWS_X64_DOWNLOAD_PATH || "/app/downloads/KiddoSproutBlocker-Windows-x64.zip"),
    version: WINDOWS_VERSION,
    filename: safeDownloadName(
      process.env.BLOCKER_WINDOWS_X64_DOWNLOAD_NAME,
      `KiddoSproutBlocker-Windows-x64-v${WINDOWS_VERSION}.zip`
    )
  }),
  "windows-arm64": Object.freeze({
    id: "windows-arm64",
    platform: "Windows",
    architecture: "ARM64",
    path: String(process.env.BLOCKER_WINDOWS_ARM64_DOWNLOAD_PATH || "/app/downloads/KiddoSproutBlocker-Windows-arm64.zip"),
    version: WINDOWS_VERSION,
    filename: safeDownloadName(
      process.env.BLOCKER_WINDOWS_ARM64_DOWNLOAD_NAME,
      `KiddoSproutBlocker-Windows-arm64-v${WINDOWS_VERSION}.zip`
    )
  })
});
const MAX_JSON_BYTES = 16 * 1024;
const MAX_AUTH_RESPONSE_BYTES = 256 * 1024;
const MAX_STORE_BYTES = 2 * 1024 * 1024;
const MAX_STORE_RECORDS = integerEnvironment("BLOCKER_MAX_STORE_RECORDS", 10_000, 1, 100_000);
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const REAUTH_FAILURE_LIMIT = integerEnvironment("BLOCKER_REAUTH_FAILURE_LIMIT", 5, 1, 20);
const REAUTH_FAILURE_WINDOW_MS = integerEnvironment(
  "BLOCKER_REAUTH_FAILURE_WINDOW_MS",
  15 * 60 * 1000,
  10_000,
  24 * 60 * 60 * 1000
);
const MAX_PENDING_PIN_OPERATIONS = 5;
const AUTH_TIMEOUT_MS = integerEnvironment("BLOCKER_AUTH_TIMEOUT_MS", 8_000, 100, 60_000);
const REQUEST_TIMEOUT_MS = integerEnvironment("BLOCKER_REQUEST_TIMEOUT_MS", 20_000, 1_000, 120_000);
const HEADERS_TIMEOUT_MS = integerEnvironment("BLOCKER_HEADERS_TIMEOUT_MS", 10_000, 500, REQUEST_TIMEOUT_MS);
const SHUTDOWN_TIMEOUT_MS = integerEnvironment("BLOCKER_SHUTDOWN_TIMEOUT_MS", 8_000, 1_000, 30_000);
let pendingPINOperations = 0;
let storeWrite = Promise.resolve();
const userOperationQueues = new Map();
let artifactChecksumsPromise = null;
let shuttingDown = false;

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function integerEnvironment(name, fallback, minimum, maximum) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

function booleanEnvironment(name, fallback) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be exactly true or false.`);
}

function absolutePathEnvironment(name, fallback) {
  const value = String(process.env[name] || fallback).trim();
  if (!isAbsolute(value)) throw new Error(`${name} must be an absolute path.`);
  return value;
}

function sendJson(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(body.length),
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
    let settled = false;
    const contentType = String(request.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      request.resume();
      reject(new HttpError(415, "Send blocker requests as JSON.", "unsupported_media_type"));
      return;
    }
    const contentLength = String(request.headers["content-length"] || "").trim();
    if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_JSON_BYTES)) {
      request.resume();
      reject(new HttpError(413, "That request is too large.", "request_too_large"));
      return;
    }
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_JSON_BYTES) {
        settled = true;
        chunks.length = 0;
        request.resume();
        reject(new HttpError(413, "That request is too large.", "request_too_large"));
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
        reject(new HttpError(400, "The request was not understood.", "invalid_json"));
      }
    });
    request.on("error", reject);
    request.on("aborted", () => {
      if (settled) return;
      settled = true;
      reject(new HttpError(400, "The request ended before it was complete.", "incomplete_request"));
    });
  });
}

function bearerToken(request) {
  const match = String(request.headers.authorization || "").match(/^Bearer\s+([^\s]+)$/i);
  const token = match ? match[1] : "";
  return token.length <= 8192 ? token : "";
}

async function discardBody(response) {
  try {
    await response?.body?.cancel();
  } catch (error) {
    // The upstream connection is already closed.
  }
}

async function readBoundedJson(response, maximumBytes) {
  const contentType = String(response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" && !contentType.endsWith("+json")) {
    await discardBody(response);
    throw new Error("Unexpected account-service content type.");
  }
  const declaredLength = String(response.headers.get("content-length") || "").trim();
  if (/^\d+$/.test(declaredLength) && Number(declaredLength) > maximumBytes) {
    await discardBody(response);
    throw new Error("Account-service response was too large.");
  }
  if (!response.body) throw new Error("Account-service response was empty.");
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
        await reader.cancel("response too large").catch(() => undefined);
        throw new Error("Account-service response was too large.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks, total).toString("utf8") || "{}");
}

async function authenticatedUser(request) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, "A parent needs to log in before downloading the blocker.", "login_required");
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
    throw new HttpError(401, "Please log in again before downloading.", "session_expired");
  }
  let user;
  try {
    user = await readBoundedJson(authResponse, MAX_AUTH_RESPONSE_BYTES);
  } catch (error) {
    throw new HttpError(503, "Account verification returned an unusable reply.", "account_service_unavailable");
  }
  const id = String(user?.id || "");
  if (!id || id.length > 256) throw new HttpError(401, "Please log in again before downloading.", "session_expired");
  const email = String(user?.email || "").trim();
  const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  if (!email || email.length > 320 || !emailVerified) {
    throw new HttpError(403, "Confirm the parent email before downloading the blocker.", "email_not_verified");
  }
  return { id, email, emailVerified };
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function validPIN(value) {
  return /^\d{4,8}$/.test(String(value || ""));
}

function validPINRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record) || record.version !== 1) return false;
  try {
    const saltText = String(record.salt || "");
    const hashText = String(record.hash || "");
    const salt = Buffer.from(saltText, "base64");
    const hash = Buffer.from(hashText, "base64");
    return salt.length === 16 && hash.length === 32 &&
      salt.toString("base64") === saltText && hash.toString("base64") === hashText;
  } catch (error) {
    return false;
  }
}

function validFailureList(value) {
  return value === undefined || (
    Array.isArray(value)
    && value.length <= 50
    && value.every((timestamp) => Number.isSafeInteger(timestamp) && timestamp > 0)
  );
}

function validSecurityRecord(record) {
  if (record?.security === undefined) return true;
  const security = record.security;
  if (!security || typeof security !== "object" || Array.isArray(security)) return false;
  return Object.keys(security).every((field) => field === "reauthFailures")
    && validFailureList(security.reauthFailures);
}

function hasPINMaterial(record) {
  return ["version", "salt", "hash"].some((field) => hasOwn(record || {}, field));
}

function validStoredRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record) || !validSecurityRecord(record)) return false;
  const keys = Object.keys(record);
  if (validPINRecord(record)) {
    return keys.every((field) => ["version", "salt", "hash", "createdAt", "failedAttempts", "security"].includes(field))
      && validFailureList(record.failedAttempts);
  }
  return !hasPINMaterial(record)
    && record.failedAttempts === undefined
    && keys.length === 1
    && keys[0] === "security"
    && Array.isArray(record.security?.reauthFailures);
}

function derivePIN(pin, salt) {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

async function makePINRecord(pin) {
  const salt = randomBytes(16);
  const hash = await derivePIN(pin, salt);
  return { version: 1, salt: salt.toString("base64"), hash: hash.toString("base64"), createdAt: new Date().toISOString() };
}

async function matchesPIN(pin, record) {
  try {
    const salt = Buffer.from(String(record?.salt || ""), "base64");
    const expected = Buffer.from(String(record?.hash || ""), "base64");
    if (record?.version !== 1 || salt.length !== 16 || expected.length !== 32) return false;
    const actual = await derivePIN(pin, salt);
    return timingSafeEqual(expected, actual);
  } catch (error) {
    return false;
  }
}

async function readStore() {
  let handle;
  try {
    handle = await open(STORE_PATH, "r");
    const info = await handle.stat();
    if (!info.isFile() || info.size > MAX_STORE_BYTES) throw new Error("invalid PIN store size");
    const value = JSON.parse(await handle.readFile("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("invalid PIN store root");
    }
    if (Object.keys(value).length > MAX_STORE_RECORDS) throw new Error("too many PIN store records");
    return Object.assign(Object.create(null), value);
  } catch (error) {
    if (error?.code === "ENOENT") return Object.create(null);
    throw new HttpError(500, "Blocker PIN storage could not be read.", "pin_store_error");
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function ensurePrivateDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  await chmod(path, 0o700);
}

async function writeStore(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).length > MAX_STORE_RECORDS) {
    throw new HttpError(507, "Blocker PIN storage is full.", "pin_store_full");
  }
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(serialized) > MAX_STORE_BYTES) {
    throw new HttpError(507, "Blocker PIN storage is full.", "pin_store_full");
  }
  const directory = dirname(STORE_PATH);
  await ensurePrivateDirectory(directory);
  const temporaryPath = `${STORE_PATH}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  let handle;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(serialized, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, STORE_PATH);
    await chmod(STORE_PATH, 0o600);
    const directoryHandle = await open(directory, "r").catch(() => null);
    if (directoryHandle) {
      await directoryHandle.sync().catch(() => undefined);
      await directoryHandle.close();
    }
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Blocker PIN storage could not be saved.", "pin_store_error");
  }
}

function withStoreLock(task) {
  const operation = storeWrite.catch(() => undefined).then(task);
  storeWrite = operation.then(() => undefined, () => undefined);
  return operation;
}

function withUserOperation(userId, task) {
  const previous = userOperationQueues.get(userId) || Promise.resolve();
  const operation = previous.catch(() => undefined).then(task);
  userOperationQueues.set(userId, operation);
  return operation.finally(() => {
    if (userOperationQueues.get(userId) === operation) userOperationQueues.delete(userId);
  });
}

function recentFailureTimes(record) {
  const now = Date.now();
  const cutoff = now - FAILURE_WINDOW_MS;
  return Array.isArray(record?.failedAttempts)
    ? record.failedAttempts.filter((timestamp) => Number.isFinite(timestamp) && timestamp > cutoff && timestamp <= now)
    : [];
}

function recentSecurityFailures(record, field, windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;
  return (Array.isArray(record?.security?.[field]) ? record.security[field] : [])
    .filter((timestamp) => Number.isSafeInteger(timestamp) && timestamp > cutoff && timestamp <= now)
    .slice(-50);
}

function assertValidStoredRecord(record) {
  if (record !== null && !validStoredRecord(record)) {
    throw new HttpError(500, "Blocker PIN storage could not be read.", "pin_store_error");
  }
}

async function storedRecordFor(userId) {
  return withStoreLock(async () => {
    const store = await readStore();
    const record = hasOwn(store, userId) ? store[userId] : null;
    assertValidStoredRecord(record);
    return record ? structuredClone(record) : null;
  });
}

async function checkDurableFailureLimit(userId, field, windowMs, limit, errorCode, message) {
  return withStoreLock(async () => {
    const store = await readStore();
    const record = hasOwn(store, userId) ? store[userId] : null;
    assertValidStoredRecord(record);
    if (recentSecurityFailures(record, field, windowMs).length >= limit) {
      throw new HttpError(429, message, errorCode);
    }
  });
}

async function recordDurableFailure(userId, field, windowMs) {
  return withStoreLock(async () => {
    const store = await readStore();
    const existing = hasOwn(store, userId) ? store[userId] : null;
    assertValidStoredRecord(existing);
    const record = existing || {};
    const security = record.security && typeof record.security === "object" && !Array.isArray(record.security)
      ? record.security
      : {};
    const failures = recentSecurityFailures({ security }, field, windowMs);
    failures.push(Date.now());
    security[field] = failures;
    record.security = security;
    store[userId] = record;
    await writeStore(store);
    return failures.length;
  });
}

async function clearDurableFailures(userId, field) {
  return withStoreLock(async () => {
    const store = await readStore();
    const record = hasOwn(store, userId) ? store[userId] : null;
    assertValidStoredRecord(record);
    if (!record?.security || !Array.isArray(record.security[field]) || !record.security[field].length) return;
    delete record.security[field];
    if (!Object.keys(record.security).length) delete record.security;
    if (!validPINRecord(record) && !Object.keys(record).length) delete store[userId];
    await writeStore(store);
  });
}

async function requireFreshReauthentication(user, accountPassword, captchaToken) {
  if (!user.email || !user.emailVerified) {
    throw new HttpError(403, "Confirm the parent email before downloading the blocker.", "email_not_verified");
  }
  if (typeof accountPassword !== "string" || !accountPassword || accountPassword.length > 2048
      || typeof captchaToken !== "string" || !captchaToken || captchaToken.length > 8192) {
    throw new HttpError(
      400,
      "Enter the parent account password and complete the safety check.",
      "reauthentication_required"
    );
  }
  await checkDurableFailureLimit(
    user.id,
    "reauthFailures",
    REAUTH_FAILURE_WINDOW_MS,
    REAUTH_FAILURE_LIMIT,
    "reauthentication_locked",
    "Too many failed parent checks. Try again later."
  );

  let authResponse;
  try {
    authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({
        email: user.email,
        password: accountPassword,
        gotrue_meta_security: { captcha_token: captchaToken }
      }),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS)
    });
  } catch (error) {
    throw new HttpError(503, "Parent verification is temporarily unavailable.", "account_service_unavailable");
  }

  if (!authResponse.ok) {
    await discardBody(authResponse);
    if (authResponse.status === 429) {
      throw new HttpError(429, "Parent verification is busy. Try again shortly.", "account_service_rate_limited");
    }
    if (authResponse.status === 408 || authResponse.status >= 500) {
      throw new HttpError(503, "Parent verification is temporarily unavailable.", "account_service_unavailable");
    }
    await recordDurableFailure(user.id, "reauthFailures", REAUTH_FAILURE_WINDOW_MS);
    throw new HttpError(403, "The parent password or safety check was not accepted.", "reauthentication_failed");
  }

  let payload;
  try {
    payload = await readBoundedJson(authResponse, MAX_AUTH_RESPONSE_BYTES);
  } catch (error) {
    throw new HttpError(503, "Parent verification returned an unusable reply.", "account_service_unavailable");
  }
  if (String(payload?.user?.id || "") !== user.id) {
    await recordDurableFailure(user.id, "reauthFailures", REAUTH_FAILURE_WINDOW_MS);
    throw new HttpError(403, "The parent password or safety check was not accepted.", "reauthentication_failed");
  }
  await clearDurableFailures(user.id, "reauthFailures");
}

async function configureOrVerifyPIN(user, pin, confirmPin, accountPassword, captchaToken) {
  const existing = await storedRecordFor(user.id);
  if (!validPINRecord(existing)) {
    if (!validPIN(confirmPin) || pin !== confirmPin) {
      throw new HttpError(400, "The two PINs do not match.", "pin_mismatch");
    }
    await requireFreshReauthentication(user, accountPassword, captchaToken);
    const pinRecord = await makePINRecord(pin);
    await withStoreLock(async () => {
      const store = await readStore();
      const current = hasOwn(store, user.id) ? store[user.id] : null;
      assertValidStoredRecord(current);
      if (validPINRecord(current)) {
        throw new HttpError(409, "The blocker PIN was set in another request. Try again.", "pin_changed");
      }
      store[user.id] = { ...(current || {}), ...pinRecord };
      delete store[user.id].security;
      await writeStore(store);
    });
    return { enrolled: true };
  }

  return withStoreLock(async () => {
    const store = await readStore();
    const record = hasOwn(store, user.id) ? store[user.id] : null;
    assertValidStoredRecord(record);
    if (!validPINRecord(record)) {
      throw new HttpError(409, "The blocker PIN changed during this request. Try again.", "pin_changed");
    }
    const recent = recentFailureTimes(record);
    record.failedAttempts = recent;
    if (recent.length >= MAX_FAILURES) {
      await writeStore(store);
      throw new HttpError(429, "Too many incorrect PIN attempts. Try again in 15 minutes.", "pin_locked");
    }
    if (!(await matchesPIN(pin, record))) {
      record.failedAttempts.push(Date.now());
      await writeStore(store);
      throw new HttpError(403, "That blocker PIN is not correct.", "incorrect_pin");
    }
    if (record.failedAttempts.length) {
      delete record.failedAttempts;
      await writeStore(store);
    }
    return { enrolled: false };
  });
}

async function withPINCapacity(task) {
  if (pendingPINOperations >= MAX_PENDING_PIN_OPERATIONS) {
    throw new HttpError(503, "The PIN checker is busy. Please wait a moment and try again.", "pin_checker_busy");
  }
  pendingPINOperations += 1;
  try {
    return await task();
  } finally {
    pendingPINOperations -= 1;
  }
}

function hasZipSignature(bytes) {
  return bytes?.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (
    (bytes[2] === 0x03 && bytes[3] === 0x04) ||
    (bytes[2] === 0x05 && bytes[3] === 0x06) ||
    (bytes[2] === 0x07 && bytes[3] === 0x08)
  );
}

async function artifactStatus(artifact) {
  let file;
  try {
    file = await open(artifact.path, "r");
    const info = await file.stat();
    const signature = Buffer.alloc(4);
    const { bytesRead } = await file.read(signature, 0, signature.length, 0);
    return {
      ready: info.isFile() && info.size >= 4 && bytesRead === 4 && hasZipSignature(signature),
      bytes: info.size,
      platform: artifact.platform,
      architecture: artifact.architecture,
      version: artifact.version,
      filename: artifact.filename
    };
  } catch (error) {
    return {
      ready: false,
      bytes: 0,
      platform: artifact.platform,
      architecture: artifact.architecture,
      version: artifact.version,
      filename: artifact.filename
    };
  } finally {
    await file?.close().catch(() => undefined);
  }
}

async function allArtifactStatuses() {
  const entries = await Promise.all(Object.entries(ARTIFACTS).map(async ([id, artifact]) => [id, await artifactStatus(artifact)]));
  return Object.fromEntries(entries);
}

function requestedArtifact(request) {
  const platform = new URL(request.url || "/", "http://blocker-api.local").searchParams.get("platform") || "mac";
  const artifact = ARTIFACTS[platform];
  if (!artifact) throw new HttpError(400, "Choose Mac, Windows x64, or Windows ARM64.", "unsupported_platform");
  return artifact;
}

async function sendDownload(response, artifact) {
  // Send a digest with the same response as the archive. The setup page checks
  // it before creating a browser download, so a truncated or substituted file
  // cannot pass merely because its first four bytes still look like a ZIP.
  const sha256 = await artifactDigest(artifact).catch(() => null);
  if (!sha256) {
    throw new HttpError(503, `The ${artifact.platform} test build could not be verified yet.`, "download_unavailable");
  }
  const file = await open(artifact.path, "r").catch(() => null);
  if (!file) {
    throw new HttpError(503, `The ${artifact.platform} test build is not ready yet.`, "download_unavailable");
  }
  try {
    const info = await file.stat();
    const signature = Buffer.alloc(4);
    const { bytesRead } = await file.read(signature, 0, signature.length, 0);
    if (!info.isFile() || info.size < 4 || bytesRead !== 4 || !hasZipSignature(signature)) {
      throw new HttpError(503, `The ${artifact.platform} test build is not ready yet.`, "download_unavailable");
    }
    response.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Length": String(info.size),
      "Content-Disposition": `attachment; filename="${artifact.filename}"`,
      "X-KiddoSprout-SHA256": sha256,
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Referrer-Policy": "no-referrer",
      "Vary": "Authorization",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "X-Download-Options": "noopen"
    });
    await pipeline(file.createReadStream({ autoClose: false }), response);
  } finally {
    await file.close().catch(() => undefined);
  }
}

async function artifactDigest(artifact) {
  const info = await stat(artifact.path);
  if (!info.isFile() || !info.size) throw new Error("empty artifact");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(artifact.path)) hash.update(chunk);
  return hash.digest("hex");
}

async function artifactChecksum(artifact) {
  return `${await artifactDigest(artifact)}  ${artifact.filename}`;
}

async function allArtifactChecksums() {
  // Installer files are immutable inside this container. Keep one bounded
  // hash result instead of rereading every archive for every public checksum
  // request. A failed first read is not cached, so readiness can recover.
  artifactChecksumsPromise ||= Promise.all(Object.values(ARTIFACTS).map(artifactChecksum))
    .catch((error) => {
      artifactChecksumsPromise = null;
      throw error;
    });
  return artifactChecksumsPromise;
}

async function sendChecksums(response) {
  const lines = await allArtifactChecksums().catch(() => null);
  if (!lines?.length) throw new HttpError(503, "Blocker checksums are not ready yet.", "checksums_unavailable");
  const data = Buffer.from(`${lines.join("\n")}\n`);
  response.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": String(data.length),
    "Content-Disposition": 'attachment; filename="KiddoSproutBlocker-SHA256SUMS.txt"',
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Referrer-Policy": "no-referrer",
    "Vary": "Authorization",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "X-Download-Options": "noopen"
  });
  response.end(data);
}

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url || "/", "http://blocker-api.local").pathname;
    if (request.method === "GET" && pathname === "/health") {
      // Artifact details belong behind the authenticated status endpoint;
      // Docker's health check needs only a side-effect-free liveness signal.
      sendJson(response, 200, { ok: true });
      return;
    }
    if (shuttingDown) {
      sendJson(response, 503, { error: "The blocker service is restarting. Try again shortly.", code: "service_restarting" });
      return;
    }
    if (PUBLIC_DEMO_ONLY) {
      sendJson(response, 403, { error: "Blocker downloads are off in this public demo.", code: "public_demo_only" });
      return;
    }
    if (request.method === "GET" && pathname === "/checksums") {
      await sendChecksums(response);
      return;
    }
    if (request.method === "GET" && pathname === "/status") {
      const user = await authenticatedUser(request);
      const artifact = requestedArtifact(request);
      const record = await storedRecordFor(user.id);
      sendJson(response, 200, {
        pinConfigured: validPINRecord(record),
        artifact: await artifactStatus(artifact),
        artifacts: await allArtifactStatuses(),
        platform: artifact.platform,
        architecture: artifact.architecture,
        version: artifact.version,
        filename: artifact.filename
      });
      return;
    }
    const downloadMatch = request.method === "POST" ? pathname.match(/^\/download\/(mac|windows|windows-arm64)$/) : null;
    if (downloadMatch) {
      const artifact = ARTIFACTS[downloadMatch[1]];
      const user = await authenticatedUser(request);
      const body = await readJson(request);
      const pin = String(body.pin || "");
      if (!validPIN(pin)) throw new HttpError(400, "Use a 4–8 digit PIN.", "invalid_pin");
      const status = await artifactStatus(artifact);
      if (!status.ready) throw new HttpError(503, `The ${artifact.platform} test build is not ready yet.`, "download_unavailable");
      await withUserOperation(user.id, () => withPINCapacity(() => configureOrVerifyPIN(
        user,
        pin,
        String(body.confirmPin || ""),
        body.accountPassword,
        body.captchaToken
      )));
      await sendDownload(response, artifact);
      return;
    }
    sendJson(response, 404, { error: "Not found", code: "not_found" });
  } catch (error) {
    if (response.headersSent) return response.end();
    const expectedError = error instanceof HttpError;
    const status = expectedError && Number.isInteger(error.status) ? error.status : 500;
    if (!expectedError) console.error(`[blocker-api] Internal ${error?.name || "Error"}.`);
    sendJson(response, status, {
      error: expectedError ? String(error.message) : "The blocker download is unavailable right now.",
      code: expectedError ? String(error.code || "blocker_error") : "blocker_error"
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
  console.log(`[blocker-api] ${signal} received; finishing active requests.`);
  const forceTimer = setTimeout(() => {
    console.error("[blocker-api] Graceful shutdown timed out.");
    server.closeAllConnections?.();
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();
  server.close(async (error) => {
    await storeWrite.catch(() => undefined);
    clearTimeout(forceTimer);
    process.exitCode = error ? 1 : 0;
  });
  server.closeIdleConnections?.();
}

process.once("SIGTERM", () => beginShutdown("SIGTERM"));
process.once("SIGINT", () => beginShutdown("SIGINT"));

try {
  await ensurePrivateDirectory(dirname(STORE_PATH));
  await chmod(STORE_PATH, 0o600).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
  await readStore();
  server.listen(PORT, "0.0.0.0", () => {
    const mode = PUBLIC_DEMO_ONLY
      ? "public-demo mode; downloads are disabled"
      : "protected Mac and Windows downloads are enabled";
    console.log(`[blocker-api] Listening on port ${PORT}; ${mode}.`);
  });
} catch (error) {
  console.error("[blocker-api] Startup validation failed; check private PIN storage and service settings.");
  process.exitCode = 1;
}
