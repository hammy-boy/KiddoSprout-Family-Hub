import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { chmod, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, isAbsolute } from "node:path";
import { promisify } from "node:util";
import { browserSafeSupabaseKey, internalSupabaseUrl } from "./account-service-config.mjs";

const scrypt = promisify(scryptCallback);
const PORT = integerEnvironment("PORT", 8789, 0, 65535);
const IS_TEST = process.env.NODE_ENV === "test";
const SUPABASE_URL = internalSupabaseUrl(process.env.SUPABASE_URL);
const SUPABASE_PUBLISHABLE_KEY = browserSafeSupabaseKey(
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);
const PUBLIC_DEMO_ONLY = booleanEnvironment("PUBLIC_DEMO_ONLY", false);
const BANK_DEMO_MODE = booleanEnvironment("BANK_DEMO_MODE", false);
const STORE_PATH = absolutePathEnvironment("BANK_STORE_PATH", "/data/bank-links.json");
const TOKEN_KEY_PATH = absolutePathEnvironment(
  "BANK_TOKEN_KEY_PATH",
  `${dirname(STORE_PATH)}/bank-token.key`
);
const TOKEN_KEY_ENV = String(process.env.BANK_TOKEN_ENCRYPTION_KEY || "").trim();
const PLAID_CLIENT_ID = String(process.env.PLAID_CLIENT_ID || "").trim();
const PLAID_SECRET = String(process.env.PLAID_SECRET || "").trim();
const PLAID_BASE_URL = plaidBaseUrl(process.env.PLAID_BASE_URL, process.env.PLAID_ENV);
const PLAID_COUNTRY_CODES = environmentList(process.env.PLAID_COUNTRY_CODES || "GB", /^[A-Z]{2}$/, true);
const PLAID_PRODUCTS = environmentList(process.env.PLAID_PRODUCTS || "auth", /^[a-z][a-z0-9_]*$/, false);
const PLAID_REDIRECT_URI = optionalHttpsUrl(process.env.PLAID_REDIRECT_URI);
const PLAID_WEBHOOK_URI = optionalHttpsUrl(process.env.PLAID_WEBHOOK_URI);
const PROVIDER_CONFIGURED = Boolean(PLAID_CLIENT_ID && PLAID_SECRET && PLAID_BASE_URL);

const MAX_JSON_BYTES = 16 * 1024;
const MAX_UPSTREAM_BYTES = 1024 * 1024;
const MAX_STORE_BYTES = 4 * 1024 * 1024;
const MAX_STORE_USERS = integerEnvironment("BANK_MAX_STORE_USERS", 10_000, 1, 100_000);
const MAX_KEY_FILE_BYTES = 4 * 1024;
const MAX_PENDING_PIN_DERIVATIONS = integerEnvironment("BANK_MAX_PENDING_PIN_DERIVATIONS", 6, 1, 64);
const PIN_FAILURE_LIMIT = integerEnvironment("BANK_PIN_FAILURE_LIMIT", 5, 1, 20);
const PIN_FAILURE_WINDOW_MS = integerEnvironment(
  "BANK_PIN_FAILURE_WINDOW_MS",
  15 * 60 * 1000,
  10_000,
  24 * 60 * 60 * 1000
);
const REAUTH_FAILURE_LIMIT = integerEnvironment("BANK_REAUTH_FAILURE_LIMIT", 5, 1, 20);
const REAUTH_FAILURE_WINDOW_MS = integerEnvironment(
  "BANK_REAUTH_FAILURE_WINDOW_MS",
  15 * 60 * 1000,
  10_000,
  24 * 60 * 60 * 1000
);
const PROVIDER_USER_LIMIT = integerEnvironment("BANK_PROVIDER_USER_LIMIT", 30, 1, 500);
const PROVIDER_GLOBAL_LIMIT = integerEnvironment("BANK_PROVIDER_GLOBAL_LIMIT", 300, 1, 5_000);
const PROVIDER_WINDOW_MS = integerEnvironment(
  "BANK_PROVIDER_WINDOW_MS",
  15 * 60 * 1000,
  10_000,
  24 * 60 * 60 * 1000
);
const LINK_SESSION_LIFETIME_MS = 10 * 60 * 1000;
const AUTH_TIMEOUT_MS = integerEnvironment("BANK_AUTH_TIMEOUT_MS", 8_000, 100, 60_000);
const PROVIDER_TIMEOUT_MS = integerEnvironment("BANK_PROVIDER_TIMEOUT_MS", 12_000, 100, 60_000);
const SHUTDOWN_TIMEOUT_MS = integerEnvironment("BANK_SHUTDOWN_TIMEOUT_MS", 8_000, 1_000, 30_000);

const providerRequests = new Map();
const linkSessions = new Map();
const userOperationQueues = new Map();
let globalProviderRequests = [];
let storeQueue = Promise.resolve();
let encryptionKeyPromise;
let pendingPinDerivations = 0;
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

function plaidBaseUrl(explicitValue, environmentValue) {
  const knownEnvironments = {
    sandbox: "https://sandbox.plaid.com",
    development: "https://development.plaid.com",
    production: "https://production.plaid.com"
  };
  const explicit = String(explicitValue || "").trim().replace(/\/+$/, "");
  if (explicit) {
    try {
      const url = new URL(explicit);
      const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
      const isLocal = ["127.0.0.1", "localhost", "::1", "0.0.0.0"].includes(hostname);
      if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return "";
      const normalized = url.toString().replace(/\/+$/, "");
      if (Object.values(knownEnvironments).includes(normalized)) return normalized;
      if (IS_TEST && url.protocol === "http:" && isLocal) return normalized;
      return "";
    } catch (error) {
      return "";
    }
  }
  const environment = String(environmentValue || "sandbox").trim().toLowerCase();
  return knownEnvironments[environment] || "";
}

function optionalHttpsUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash ? url.toString() : "";
  } catch (error) {
    return "";
  }
}

function environmentList(value, pattern, uppercase) {
  const entries = String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (uppercase ? entry.toUpperCase() : entry.toLowerCase()));
  const validEntries = [...new Set(entries.filter((entry) => pattern.test(entry)))];
  return validEntries.slice(0, 10);
}

function sendJson(response, status, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(body.length),
    ...extraHeaders,
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Authorization",
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
      reject(new HttpError(415, "Send bank requests as JSON.", "unsupported_media_type"));
      return;
    }
    const contentLength = String(request.headers["content-length"] || "").trim();
    if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_JSON_BYTES)) {
      request.resume();
      reject(new HttpError(413, "That bank request is too large.", "request_too_large"));
      return;
    }
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    request.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_JSON_BYTES) {
        tooLarge = true;
        settled = true;
        chunks.length = 0;
        request.resume();
        reject(new HttpError(413, "That bank request is too large.", "request_too_large"));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (settled || tooLarge) return;
      settled = true;
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        if (!body || Array.isArray(body) || typeof body !== "object") {
          throw new Error("The JSON body must be an object.");
        }
        resolve(body);
      } catch (error) {
        reject(new HttpError(400, "The bank request was not understood.", "invalid_json"));
      }
    });
    request.on("error", reject);
    request.on("aborted", () => {
      if (settled) return;
      settled = true;
      reject(new HttpError(400, "The bank request ended before it was complete.", "incomplete_request"));
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

async function authenticatedUser(request) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, "A parent needs to log in before using Bank Link.", "login_required");
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new HttpError(503, "Account verification is not configured.", "account_service_unavailable");
  }

  let authResponse;
  try {
    authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS)
    });
  } catch (error) {
    throw new HttpError(503, "Account verification is temporarily unavailable.", "account_service_unavailable");
  }

  if (!authResponse.ok) {
    await discardBody(authResponse);
    if (authResponse.status === 429) {
      throw new HttpError(429, "Account verification is busy. Try again shortly.", "account_service_rate_limited");
    }
    if (authResponse.status === 408 || authResponse.status >= 500) {
      throw new HttpError(503, "Account verification is temporarily unavailable.", "account_service_unavailable");
    }
    throw new HttpError(401, "Please log in again before using Bank Link.", "session_expired");
  }

  let user;
  try {
    user = await readUpstreamJson(authResponse, 256 * 1024);
  } catch (error) {
    throw new HttpError(503, "Account verification returned an invalid response.", "account_service_unavailable");
  }
  const id = String(user?.id || "");
  if (!id || id.length > 256) {
    throw new HttpError(401, "Please log in again before using Bank Link.", "session_expired");
  }
  const email = String(user?.email || "").trim();
  const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  return {
    id,
    key: userStorageKey(id),
    email: email.length <= 320 ? email : "",
    emailVerified
  };
}

function userStorageKey(userId) {
  return `u_${createHash("sha256").update(userId).digest("hex")}`;
}

function emptyStore() {
  return { version: 1, users: {} };
}

async function readStore() {
  let handle;
  try {
    handle = await open(STORE_PATH, "r");
    const info = await handle.stat();
    if (!info.isFile() || info.size > MAX_STORE_BYTES) throw new Error("Unexpected bank store size.");
    const parsed = JSON.parse(await handle.readFile("utf8"));
    if (parsed?.version !== 1 || !parsed.users || Array.isArray(parsed.users) || typeof parsed.users !== "object") {
      throw new Error("Unexpected bank store structure.");
    }
    if (Object.keys(parsed.users).length > MAX_STORE_USERS) throw new Error("Too many bank store users.");
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return emptyStore();
    throw new HttpError(500, "Bank Link storage could not be read.", "bank_store_error");
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function ensurePrivateDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  await chmod(path, 0o700);
}

async function atomicWriteStore(store) {
  const directory = dirname(STORE_PATH);
  await ensurePrivateDirectory(directory);
  if (store?.version !== 1 || !store.users || Array.isArray(store.users)
      || typeof store.users !== "object" || Object.keys(store.users).length > MAX_STORE_USERS) {
    throw new HttpError(507, "Bank Link storage is full.", "bank_store_full");
  }
  const serialized = `${JSON.stringify(store, null, 2)}\n`;
  if (Buffer.byteLength(serialized) > MAX_STORE_BYTES) {
    throw new HttpError(507, "Bank Link storage is full.", "bank_store_full");
  }
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
    throw new HttpError(500, "Bank Link storage could not be saved.", "bank_store_error");
  }
}

function withStoreLock(task) {
  const operation = storeQueue.then(task, task);
  storeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

function withUserOperation(userKey, task) {
  const previous = userOperationQueues.get(userKey) || Promise.resolve();
  const operation = previous.catch(() => undefined).then(task);
  userOperationQueues.set(userKey, operation);
  return operation.finally(() => {
    if (userOperationQueues.get(userKey) === operation) userOperationQueues.delete(userKey);
  });
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function validPin(value) {
  return typeof value === "string" && /^\d{4,8}$/.test(value);
}

function validPinRecord(record) {
  if (record?.version !== 1 || record?.algorithm !== "scrypt") return false;
  try {
    return Buffer.from(String(record.salt || ""), "base64").length === 16
      && Buffer.from(String(record.hash || ""), "base64").length === 32;
  } catch (error) {
    return false;
  }
}

async function derivePin(pin, salt) {
  if (pendingPinDerivations >= MAX_PENDING_PIN_DERIVATIONS) {
    throw new HttpError(503, "The bank PIN checker is busy. Try again shortly.", "pin_checker_busy");
  }
  pendingPinDerivations += 1;
  try {
    return Buffer.from(await scrypt(pin, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }));
  } finally {
    pendingPinDerivations -= 1;
  }
}

async function createPinRecord(pin) {
  const salt = randomBytes(16);
  const hash = await derivePin(pin, salt);
  return {
    version: 1,
    algorithm: "scrypt",
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
    createdAt: new Date().toISOString()
  };
}

async function pinMatches(pin, record) {
  try {
    if (!validPinRecord(record)) return false;
    const salt = Buffer.from(String(record.salt || ""), "base64");
    const expected = Buffer.from(String(record.hash || ""), "base64");
    if (salt.length !== 16 || expected.length !== 32) return false;
    const actual = await derivePin(pin, salt);
    return timingSafeEqual(expected, actual);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    return false;
  }
}

function recentEntries(map, key, windowMs) {
  const cutoff = Date.now() - windowMs;
  const recent = (map.get(key) || []).filter((timestamp) => timestamp > cutoff);
  if (recent.length) map.set(key, recent);
  else map.delete(key);
  return recent;
}

function recentFailureTimestamps(record, field, windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;
  return (Array.isArray(record?.security?.[field]) ? record.security[field] : [])
    .filter((timestamp) => Number.isSafeInteger(timestamp) && timestamp > cutoff && timestamp <= now)
    .slice(-50);
}

async function checkDurableFailureLimit(userKey, field, windowMs, limit, errorCode, message) {
  return withStoreLock(async () => {
    const store = await readStore();
    const record = hasOwn(store.users, userKey) ? store.users[userKey] : null;
    if (recentFailureTimestamps(record, field, windowMs).length >= limit) {
      throw new HttpError(429, message, errorCode);
    }
  });
}

async function recordDurableFailure(userKey, field, windowMs) {
  return withStoreLock(async () => {
    const store = await readStore();
    const record = hasOwn(store.users, userKey) && store.users[userKey]
      ? store.users[userKey]
      : {};
    const security = record.security && typeof record.security === "object" && !Array.isArray(record.security)
      ? record.security
      : {};
    const failures = recentFailureTimestamps({ security }, field, windowMs);
    failures.push(Date.now());
    security[field] = failures;
    record.security = security;
    store.users[userKey] = record;
    await atomicWriteStore(store);
    return failures.length;
  });
}

async function clearDurableFailures(userKey, field) {
  return withStoreLock(async () => {
    const store = await readStore();
    const record = hasOwn(store.users, userKey) ? store.users[userKey] : null;
    if (!record?.security || !Array.isArray(record.security[field]) || !record.security[field].length) return;
    delete record.security[field];
    if (!Object.keys(record.security).length) delete record.security;
    await atomicWriteStore(store);
  });
}

async function pinRecordFor(userKey) {
  return withStoreLock(async () => {
    const store = await readStore();
    const pin = hasOwn(store.users, userKey) ? store.users[userKey]?.pin : null;
    return pin ? structuredClone(pin) : null;
  });
}

async function requireFreshReauthentication(user, accountPassword, captchaToken) {
  if (!user.email || !user.emailVerified) {
    throw new HttpError(403, "Confirm the parent email before connecting a bank.", "email_not_verified");
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
    user.key,
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
    await recordDurableFailure(user.key, "reauthFailures", REAUTH_FAILURE_WINDOW_MS);
    throw new HttpError(403, "The parent password or safety check was not accepted.", "reauthentication_failed");
  }

  let payload;
  try {
    payload = await readUpstreamJson(authResponse, 256 * 1024);
  } catch (error) {
    throw new HttpError(503, "Parent verification returned an invalid response.", "account_service_unavailable");
  }
  if (String(payload?.user?.id || "") !== user.id) {
    await recordDurableFailure(user.key, "reauthFailures", REAUTH_FAILURE_WINDOW_MS);
    throw new HttpError(403, "The parent password or safety check was not accepted.", "reauthentication_failed");
  }
  await clearDurableFailures(user.key, "reauthFailures");
}

async function enrollOrVerifyPin(user, pin, confirmPin, accountPassword, captchaToken) {
  if (!validPin(pin)) throw new HttpError(400, "Use a 4–8 digit bank PIN.", "invalid_pin");
  const existingPin = await pinRecordFor(user.key);
  if (!validPinRecord(existingPin)) {
    if (!validPin(confirmPin) || pin !== confirmPin) {
      throw new HttpError(400, "Enter the same bank PIN in both boxes.", "pin_mismatch");
    }
    await requireFreshReauthentication(user, accountPassword, captchaToken);
    const pinRecord = await createPinRecord(pin);
    await withStoreLock(async () => {
      const store = await readStore();
      const record = hasOwn(store.users, user.key) && store.users[user.key]
        ? store.users[user.key]
        : {};
      if (validPinRecord(record.pin)) {
        throw new HttpError(409, "The bank PIN was set in another request. Try again.", "pin_changed");
      }
      record.pin = pinRecord;
      store.users[user.key] = record;
      await atomicWriteStore(store);
    });
    return { enrolled: true };
  }

  await checkDurableFailureLimit(
    user.key,
    "pinFailures",
    PIN_FAILURE_WINDOW_MS,
    PIN_FAILURE_LIMIT,
    "pin_locked",
    "Too many incorrect PIN attempts. Try again later."
  );
  if (!(await pinMatches(pin, existingPin))) {
    await recordDurableFailure(user.key, "pinFailures", PIN_FAILURE_WINDOW_MS);
    throw new HttpError(403, "That bank PIN is not correct.", "incorrect_pin");
  }
  await clearDurableFailures(user.key, "pinFailures");
  return { enrolled: false };
}

async function requireExistingPin(userKey, pin) {
  if (!validPin(pin)) throw new HttpError(400, "Use a 4–8 digit bank PIN.", "invalid_pin");
  const existingPin = await pinRecordFor(userKey);
  if (!validPinRecord(existingPin)) throw new HttpError(404, "No valid bank PIN has been set up.", "pin_not_configured");
  await checkDurableFailureLimit(
    userKey,
    "pinFailures",
    PIN_FAILURE_WINDOW_MS,
    PIN_FAILURE_LIMIT,
    "pin_locked",
    "Too many incorrect PIN attempts. Try again later."
  );
  if (!(await pinMatches(pin, existingPin))) {
    await recordDurableFailure(userKey, "pinFailures", PIN_FAILURE_WINDOW_MS);
    throw new HttpError(403, "That bank PIN is not correct.", "incorrect_pin");
  }
  await clearDurableFailures(userKey, "pinFailures");
}

async function ensureNoConnection(userKey) {
  return withStoreLock(async () => {
    const store = await readStore();
    if (hasOwn(store.users, userKey) && store.users[userKey]?.connection) {
      throw new HttpError(409, "A bank is already connected.", "bank_already_connected");
    }
  });
}

function parseEncryptionKey(value) {
  if (/^[0-9a-f]{64}$/i.test(value)) return Buffer.from(value, "hex");
  if (/^[A-Za-z0-9+/]{43}=$/.test(value) || /^[A-Za-z0-9_-]{43}$/.test(value)) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64");
    if (decoded.length === 32) return decoded;
  }
  throw new Error("BANK_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key.");
}

async function readEncryptionKeyFile(path) {
  let handle;
  try {
    handle = await open(path, "r");
    const info = await handle.stat();
    if (!info.isFile() || info.size <= 0 || info.size > MAX_KEY_FILE_BYTES) {
      throw new Error("Unexpected bank encryption-key file size.");
    }
    return String(await handle.readFile("utf8")).trim();
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function loadOrCreateEncryptionKey() {
  if (TOKEN_KEY_ENV) return parseEncryptionKey(TOKEN_KEY_ENV);
  if (PROVIDER_CONFIGURED) {
    throw new Error("BANK_TOKEN_ENCRYPTION_KEY is required when the real bank provider is configured.");
  }
  try {
    const stored = await readEncryptionKeyFile(TOKEN_KEY_PATH);
    const key = parseEncryptionKey(stored);
    await chmod(TOKEN_KEY_PATH, 0o600);
    return key;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  await ensurePrivateDirectory(dirname(TOKEN_KEY_PATH));
  const generated = randomBytes(32);
  let handle;
  try {
    handle = await open(TOKEN_KEY_PATH, "wx", 0o600);
    await handle.writeFile(`${generated.toString("base64")}\n`, "utf8");
    await handle.sync();
    await handle.close();
    await chmod(TOKEN_KEY_PATH, 0o600);
    return generated;
  } catch (error) {
    await handle?.close().catch(() => undefined);
    if (error?.code === "EEXIST") {
      const stored = await readEncryptionKeyFile(TOKEN_KEY_PATH);
      return parseEncryptionKey(stored);
    }
    throw error;
  }
}

function encryptionKey() {
  encryptionKeyPromise ||= loadOrCreateEncryptionKey();
  return encryptionKeyPromise;
}

async function encryptAccessToken(accessToken, userKey) {
  const key = await encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`KiddoSprout bank token:${userKey}:v1`));
  const ciphertext = Buffer.concat([cipher.update(accessToken, "utf8"), cipher.final()]);
  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64")
  };
}

async function decryptAccessToken(encrypted, userKey) {
  try {
    if (encrypted?.version !== 1 || encrypted?.algorithm !== "aes-256-gcm") throw new Error("Unknown token format.");
    const key = await encryptionKey();
    const iv = Buffer.from(String(encrypted.iv || ""), "base64");
    const ciphertext = Buffer.from(String(encrypted.ciphertext || ""), "base64");
    const tag = Buffer.from(String(encrypted.tag || ""), "base64");
    if (iv.length !== 12 || tag.length !== 16 || !ciphertext.length) throw new Error("Invalid token format.");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(`KiddoSprout bank token:${userKey}:v1`));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (error) {
    throw new HttpError(500, "The saved bank connection could not be opened safely.", "bank_token_error");
  }
}

async function validateStartupConfiguration() {
  if (Boolean(PLAID_CLIENT_ID) !== Boolean(PLAID_SECRET)) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must either both be set or both be empty.");
  }
  if (PLAID_CLIENT_ID && !PLAID_BASE_URL) {
    throw new Error("PLAID_ENV or PLAID_BASE_URL does not identify a secure Plaid endpoint.");
  }
  await ensurePrivateDirectory(dirname(STORE_PATH));
  await chmod(STORE_PATH, 0o600).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
  const store = await readStore();
  if (!PROVIDER_CONFIGURED) return;
  if (!TOKEN_KEY_ENV) {
    throw new Error("BANK_TOKEN_ENCRYPTION_KEY is required when Plaid is configured.");
  }
  await encryptionKey();
  for (const [userKey, record] of Object.entries(store.users)) {
    if (record?.connection?.mode === "plaid" && record.connection.accessToken) {
      await decryptAccessToken(record.connection.accessToken, userKey);
    }
  }
}

async function createConnectionIfAbsent(userKey, connection) {
  return withStoreLock(async () => {
    const store = await readStore();
    if (!hasOwn(store.users, userKey) || !store.users[userKey]?.pin) {
      throw new HttpError(409, "Set a bank PIN before connecting.", "pin_not_configured");
    }
    if (store.users[userKey].connection) {
      throw new HttpError(409, "A bank is already connected.", "bank_already_connected");
    }
    store.users[userKey].connection = connection;
    await atomicWriteStore(store);
  });
}

async function connectionFor(userKey) {
  const store = await readStore();
  return hasOwn(store.users, userKey) ? store.users[userKey]?.connection || null : null;
}

function enforceProviderRateLimit(userKey) {
  const now = Date.now();
  for (const key of providerRequests.keys()) {
    recentEntries(providerRequests, key, PROVIDER_WINDOW_MS);
  }
  const userRecent = recentEntries(providerRequests, userKey, PROVIDER_WINDOW_MS);
  globalProviderRequests = globalProviderRequests.filter((timestamp) => timestamp > now - PROVIDER_WINDOW_MS);
  if (userRecent.length >= PROVIDER_USER_LIMIT || globalProviderRequests.length >= PROVIDER_GLOBAL_LIMIT) {
    throw new HttpError(429, "Bank Link is being used too quickly. Try again later.", "bank_provider_rate_limited");
  }
  userRecent.push(now);
  providerRequests.set(userKey, userRecent);
  globalProviderRequests.push(now);
}

async function readUpstreamJson(response, maximumBytes = MAX_UPSTREAM_BYTES) {
  const contentType = String(response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" && !contentType.endsWith("+json")) {
    await discardBody(response);
    throw new Error("Upstream response had an unexpected content type.");
  }
  const declaredLength = String(response.headers.get("content-length") || "").trim();
  if (/^\d+$/.test(declaredLength) && Number(declaredLength) > maximumBytes) {
    await discardBody(response);
    throw new Error("Upstream response was too large.");
  }
  if (!response.body) throw new Error("Upstream response was empty.");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("Upstream response was too large.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks, size).toString("utf8") || "{}");
}

async function plaidRequest(pathname, body, userKey, { skipRateLimit = false } = {}) {
  if (!PROVIDER_CONFIGURED) {
    throw new HttpError(503, "Secure bank linking is not configured yet.", "bank_provider_not_configured");
  }
  if (!skipRateLimit) enforceProviderRateLimit(userKey);
  let upstream;
  try {
    upstream = await fetch(`${PLAID_BASE_URL}${pathname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Plaid-Version": "2020-09-14"
      },
      body: JSON.stringify({ client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, ...body }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS)
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new HttpError(504, "The bank provider took too long to answer.", "bank_provider_timeout");
    }
    throw new HttpError(502, "The bank provider could not be reached.", "bank_provider_unavailable");
  }

  let payload;
  try {
    payload = await readUpstreamJson(upstream);
  } catch (error) {
    throw new HttpError(502, "The bank provider returned an invalid response.", "bank_provider_unavailable");
  }
  if (!upstream.ok) {
    console.error(`[bank-api] Plaid request ${pathname} failed with HTTP ${upstream.status}.`);
    throw new HttpError(502, "The bank provider could not complete that request.", "bank_provider_rejected");
  }
  return payload;
}

async function bestEffortRemovePlaidItem(accessToken, userKey) {
  if (!accessToken) return;
  try {
    await plaidRequest(
      "/item/remove",
      { access_token: accessToken },
      userKey,
      { skipRateLimit: true }
    );
  } catch (error) {
    console.error("[bank-api] Plaid cleanup could not be confirmed.");
  }
}

function demoAccounts() {
  return [
    {
      name: "Demo Everyday Account",
      mask: "0001",
      currency: "GBP",
      available: 86.4,
      current: 104.9,
      demo: true
    },
    {
      name: "Demo Savings Pot",
      mask: "0002",
      currency: "GBP",
      available: 250,
      current: 250,
      demo: true
    }
  ];
}

function finiteAmount(value) {
  // Plaid documents balances as JSON numbers. Do not coerce booleans, numeric
  // strings, or other malformed provider values into a real-looking balance.
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function plausibleEncryptedAccessToken(value) {
  return value?.version === 1
    && value?.algorithm === "aes-256-gcm"
    && typeof value.iv === "string" && value.iv.length > 0
    && typeof value.ciphertext === "string" && value.ciphertext.length > 0
    && typeof value.tag === "string" && value.tag.length > 0;
}

function sameConnectionRecord(left, right) {
  const leftId = typeof left?.connectionId === "string" ? left.connectionId : "";
  const rightId = typeof right?.connectionId === "string" ? right.connectionId : "";
  if (leftId || rightId) return Boolean(leftId) && leftId === rightId;
  return left?.mode === right?.mode && left?.connectedAt === right?.connectedAt;
}

function publicPlaidAccounts(accounts) {
  return (Array.isArray(accounts) ? accounts : []).slice(0, 20).map((account) => ({
    name: String(account?.name || "Bank account").slice(0, 160),
    mask: String(account?.mask || "").replace(/[^0-9A-Za-z]/g, "").slice(-4),
    currency: String(account?.balances?.iso_currency_code || account?.balances?.unofficial_currency_code || "GBP").slice(0, 8),
    available: finiteAmount(account?.balances?.available),
    current: finiteAmount(account?.balances?.current),
    demo: false
  }));
}

function clearExpiredLinkSessions() {
  const now = Date.now();
  for (const [id, session] of linkSessions.entries()) {
    if (session.expiresAt <= now) linkSessions.delete(id);
  }
}

function validLinkSessionId(value) {
  return typeof value === "string"
    && value.length >= 32
    && value.length <= 128
    && /^[A-Za-z0-9_-]+$/.test(value);
}

function exchangeRequestDigest(linkSessionId, publicToken) {
  if (!validLinkSessionId(linkSessionId)) return "";
  return createHash("sha256")
    .update(linkSessionId)
    .update("\0")
    .update(publicToken)
    .digest("base64url");
}

function makeLinkSession(userKey) {
  clearExpiredLinkSessions();
  const id = randomBytes(32).toString("base64url");
  linkSessions.set(id, { userKey, expiresAt: Date.now() + LINK_SESSION_LIFETIME_MS });
  return id;
}

function consumeLinkSession(id, userKey) {
  clearExpiredLinkSessions();
  if (!validLinkSessionId(id)) {
    throw new HttpError(400, "Start bank linking again.", "invalid_link_session");
  }
  const session = linkSessions.get(id);
  if (!session) throw new HttpError(400, "That bank-linking session has expired or was already used.", "invalid_link_session");
  if (session.userKey !== userKey) {
    throw new HttpError(403, "That bank-linking session belongs to another account.", "link_session_forbidden");
  }
  linkSessions.delete(id);
}

async function statusFor(userKey) {
  const store = await readStore();
  const record = hasOwn(store.users, userKey) ? store.users[userKey] : null;
  const connection = record?.connection || null;
  const availableMode = PROVIDER_CONFIGURED ? "plaid" : BANK_DEMO_MODE ? "demo" : "unavailable";
  const connectionMode = connection?.mode === "demo" || connection?.mode === "plaid"
    ? connection.mode
    : null;
  const mode = connectionMode || availableMode;
  const hasConnection = Boolean(connection);
  const pinConfigured = validPinRecord(record?.pin);
  const connectionIssue = hasConnection && (
    !connectionMode
    || !pinConfigured
    || (connectionMode === "plaid" && (
      !plausibleEncryptedAccessToken(connection.accessToken)
    ))
  );
  const canConnect = availableMode !== "unavailable" && !hasConnection;
  const canView = !connectionIssue
    && (connectionMode === "demo" || (connectionMode === "plaid" && PROVIDER_CONFIGURED));
  const canDisconnect = hasConnection;
  const institution = connectionMode === "demo" ? "KiddoSprout Demo Bank" : null;
  const provider = connectionMode === "plaid"
    ? "Plaid"
    : connectionMode === "demo"
      ? "KiddoSprout Demo Bank"
      : null;
  return {
    configured: availableMode !== "unavailable",
    hasConnection,
    connected: hasConnection,
    pinConfigured,
    mode,
    demo: connectionMode === "demo",
    connectionIssue,
    canConnect,
    canView,
    canDisconnect,
    institution,
    provider
  };
}

async function handleStatus(request, response, user) {
  await readJson(request);
  sendJson(response, 200, await statusFor(user.key));
}

async function handleConnectDemo(request, response, user) {
  if (!BANK_DEMO_MODE) {
    throw new HttpError(503, "The demonstration bank is not enabled.", "bank_demo_disabled");
  }
  const body = await readJson(request);
  const result = await withUserOperation(user.key, async () => {
    const existingConnection = await connectionFor(user.key);
    if (existingConnection) {
      if (existingConnection.mode !== "demo") {
        throw new HttpError(409, "A bank is already connected.", "bank_already_connected");
      }
      // A lost response can cause the browser to retry a completed request.
      // Confirm the same PIN, then report the already-achieved state without
      // creating another connection record.
      await requireExistingPin(user.key, body.pin);
      return { alreadyConnected: true };
    }
    await enrollOrVerifyPin(
      user,
      body.pin,
      body.confirmPin,
      body.accountPassword,
      body.captchaToken
    );
    await createConnectionIfAbsent(user.key, {
      mode: "demo",
      connectionId: randomBytes(16).toString("hex"),
      connectedAt: new Date().toISOString()
    });
    return { alreadyConnected: false };
  });
  sendJson(response, 200, {
    connected: true,
    mode: "demo",
    demo: true,
    alreadyConnected: result.alreadyConnected,
    provider: "KiddoSprout Demo Bank",
    accounts: demoAccounts()
  });
}

async function handleLinkToken(request, response, user) {
  const body = await readJson(request);
  const result = await withUserOperation(user.key, async () => {
    await ensureNoConnection(user.key);
    await enrollOrVerifyPin(
      user,
      body.pin,
      body.confirmPin,
      body.accountPassword,
      body.captchaToken
    );
    const linkBody = {
      client_name: "KiddoSprout",
      language: "en",
      country_codes: PLAID_COUNTRY_CODES.length ? PLAID_COUNTRY_CODES : ["GB"],
      products: PLAID_PRODUCTS.length ? PLAID_PRODUCTS : ["auth"],
      user: { client_user_id: user.key }
    };
    if (PLAID_REDIRECT_URI) linkBody.redirect_uri = PLAID_REDIRECT_URI;
    if (PLAID_WEBHOOK_URI) linkBody.webhook = PLAID_WEBHOOK_URI;
    const payload = await plaidRequest("/link/token/create", linkBody, user.key);
    const linkToken = String(payload?.link_token || "");
    if (!linkToken) {
      throw new HttpError(502, "The bank provider did not create a link token.", "bank_provider_unavailable");
    }
    return {
      linkToken,
      expiration: payload?.expiration || null,
      linkSessionId: makeLinkSession(user.key)
    };
  });
  sendJson(response, 200, {
    linkToken: result.linkToken,
    expiration: result.expiration,
    linkSessionId: result.linkSessionId
  });
}

async function handleExchangePublicToken(request, response, user) {
  const body = await readJson(request);
  const publicToken = typeof body.publicToken === "string" ? body.publicToken.trim() : "";
  if (!publicToken || publicToken.length > 2048) {
    throw new HttpError(400, "The bank provider token is missing.", "invalid_public_token");
  }
  const requestDigest = exchangeRequestDigest(body.linkSessionId, publicToken);
  if (!requestDigest) {
    throw new HttpError(400, "Start bank linking again.", "invalid_link_session");
  }
  const result = await withUserOperation(user.key, async () => {
    const existingConnection = await connectionFor(user.key);
    if (existingConnection?.mode === "plaid"
        && existingConnection.exchangeRequestDigest === requestDigest) {
      // The provider token is one-use. Persisting only a digest of the logical
      // exchange lets a retry after a lost response succeed without sending the
      // token to Plaid a second time, including after this process restarts.
      return { alreadyConnected: true };
    }
    consumeLinkSession(body.linkSessionId, user.key);
    await ensureNoConnection(user.key);
    const payload = await plaidRequest(
      "/item/public_token/exchange",
      { public_token: publicToken },
      user.key
    );
    const accessToken = String(payload?.access_token || "");
    const itemId = String(payload?.item_id || "");
    if (!accessToken || !itemId || accessToken.length > 4096 || itemId.length > 512) {
      await bestEffortRemovePlaidItem(accessToken, user.key);
      throw new HttpError(502, "The bank provider did not finish the connection.", "bank_provider_unavailable");
    }
    try {
      const encryptedAccessToken = await encryptAccessToken(accessToken, user.key);
      await createConnectionIfAbsent(user.key, {
        mode: "plaid",
        connectionId: randomBytes(16).toString("hex"),
        exchangeRequestDigest: requestDigest,
        accessToken: encryptedAccessToken,
        connectedAt: new Date().toISOString()
      });
    } catch (error) {
      await bestEffortRemovePlaidItem(accessToken, user.key);
      throw error;
    }
    return { alreadyConnected: false };
  });
  sendJson(response, 200, {
    connected: true,
    mode: "plaid",
    demo: false,
    alreadyConnected: result.alreadyConnected,
    provider: "Plaid"
  });
}

async function handleAccounts(request, response, user) {
  const body = await readJson(request);
  const result = await withUserOperation(user.key, async () => {
    await requireExistingPin(user.key, body.pin);
    const connection = await connectionFor(user.key);
    if (!connection) throw new HttpError(409, "Connect a bank before viewing accounts.", "bank_not_connected");
    if (connection.mode === "demo") {
      return {
        connected: true,
        mode: "demo",
        demo: true,
        provider: "KiddoSprout Demo Bank",
        accounts: demoAccounts()
      };
    }
    if (connection.mode !== "plaid" || !connection.accessToken) {
      throw new HttpError(500, "The saved bank connection is invalid.", "bank_connection_error");
    }
    const accessToken = await decryptAccessToken(connection.accessToken, user.key);
    const payload = await plaidRequest("/accounts/balance/get", { access_token: accessToken }, user.key);
    return {
      connected: true,
      mode: "plaid",
      demo: false,
      provider: "Plaid",
      accounts: publicPlaidAccounts(payload?.accounts)
    };
  });
  sendJson(response, 200, result);
}

async function handleDisconnect(request, response, user) {
  const body = await readJson(request);
  const result = await withUserOperation(user.key, async () => {
    const connection = await connectionFor(user.key);
    if (!connection) {
      // Disconnect expresses a desired end-state. Repeating it after the first
      // response was lost is a safe no-op and must not enroll a new PIN.
      return { alreadyDisconnected: true, providerRevocationConfirmed: null };
    }
    const existingPin = await pinRecordFor(user.key);
    if (validPinRecord(existingPin)) {
      await requireExistingPin(user.key, body.pin);
    } else {
      await enrollOrVerifyPin(
        user,
        body.pin,
        body.confirmPin,
        body.accountPassword,
        body.captchaToken
      );
    }
    let providerRevocationConfirmed = connection.mode === "demo";
    if (connection.mode === "plaid" && PROVIDER_CONFIGURED && plausibleEncryptedAccessToken(connection.accessToken)) {
      try {
        const accessToken = await decryptAccessToken(connection.accessToken, user.key);
        await plaidRequest("/item/remove", { access_token: accessToken }, user.key);
        providerRevocationConfirmed = true;
      } catch (error) {
        // The parent's removal request still deletes KiddoSprout's encrypted
        // credential. The response clearly reports that provider-side revocation
        // could not be confirmed rather than stranding an undeletable record.
        console.error("[bank-api] Provider-side bank disconnection could not be confirmed; removing the local link.");
      }
    }
    const removed = await withStoreLock(async () => {
      const store = await readStore();
      if (!hasOwn(store.users, user.key) || !store.users[user.key]?.connection) {
        return false;
      }
      const current = store.users[user.key].connection;
      if (!sameConnectionRecord(current, connection)) {
        throw new HttpError(409, "The bank connection changed. Refresh and try again.", "bank_connection_changed");
      }
      delete store.users[user.key].connection;
      await atomicWriteStore(store);
      return true;
    });
    for (const [id, session] of linkSessions.entries()) {
      if (session.userKey === user.key) linkSessions.delete(id);
    }
    return {
      alreadyDisconnected: !removed,
      providerRevocationConfirmed: removed ? providerRevocationConfirmed : null
    };
  });
  sendJson(response, 200, {
    connected: false,
    mode: null,
    demo: false,
    provider: null,
    alreadyDisconnected: result.alreadyDisconnected,
    providerRevocationConfirmed: result.providerRevocationConfirmed
  });
}

const handlers = new Map([
  ["/status", handleStatus],
  ["/connect-demo", handleConnectDemo],
  ["/link-token", handleLinkToken],
  ["/exchange-public-token", handleExchangePublicToken],
  ["/accounts", handleAccounts],
  ["/disconnect", handleDisconnect]
]);

function requestPathname(request) {
  try {
    return new URL(request.url || "/", "http://bank-api.local").pathname;
  } catch (error) {
    return "";
  }
}

const server = createServer(async (request, response) => {
  const pathname = requestPathname(request);
  try {
    if (request.method === "GET" && pathname === "/health") {
      // Keep liveness useful to Docker without disclosing provider or demo
      // configuration to other peers on the private container network.
      sendJson(response, 200, { ok: true });
      return;
    }
    if (shuttingDown) {
      sendJson(response, 503, { error: "Bank Link is restarting. Try again shortly.", code: "service_restarting" });
      return;
    }
    if (PUBLIC_DEMO_ONLY) {
      sendJson(response, 403, { error: "Bank connections are off in this public demo.", code: "public_demo_only" });
      return;
    }
    if (handlers.has(pathname) && request.method !== "POST") {
      sendJson(response, 405, { error: "Use POST for this endpoint.", code: "method_not_allowed" }, { Allow: "POST" });
      return;
    }
    const handler = handlers.get(pathname);
    if (!handler) {
      sendJson(response, 404, { error: "Not found.", code: "not_found" });
      return;
    }
    const user = await authenticatedUser(request);
    await handler(request, response, user);
  } catch (error) {
    if (response.headersSent) return response.end();
    const expectedError = error instanceof HttpError;
    const status = expectedError && Number.isInteger(error.status) ? error.status : 500;
    if (!expectedError) {
      console.error(`[bank-api] Internal ${error?.name || "Error"}.`);
    }
    sendJson(response, status, {
      error: expectedError ? String(error.message) : "Bank Link is unavailable right now.",
      code: expectedError ? String(error.code || "bank_error") : "bank_error"
    });
  }
});

server.requestTimeout = 20_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 100;
server.maxHeadersCount = 48;

function beginShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[bank-api] ${signal} received; finishing active requests.`);
  const forceTimer = setTimeout(() => {
    console.error("[bank-api] Graceful shutdown timed out.");
    server.closeAllConnections?.();
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();
  server.close(async (error) => {
    const pendingUserOperations = [...userOperationQueues.values()];
    await Promise.allSettled([storeQueue, ...pendingUserOperations]);
    clearTimeout(forceTimer);
    process.exitCode = error ? 1 : 0;
  });
  server.closeIdleConnections?.();
}

process.once("SIGTERM", () => beginShutdown("SIGTERM"));
process.once("SIGINT", () => beginShutdown("SIGINT"));

try {
  await validateStartupConfiguration();
  server.listen(PORT, "0.0.0.0", () => {
    const address = server.address();
    const listeningPort = typeof address === "object" && address ? address.port : PORT;
    console.log(
      `[bank-api] Listening on port ${listeningPort}; demo ${BANK_DEMO_MODE ? "enabled" : "disabled"}; provider ${PROVIDER_CONFIGURED ? "configured" : "not configured"}.`
    );
  });
} catch (error) {
  console.error("[bank-api] Startup validation failed; check private bank storage and encryption settings.");
  process.exitCode = 1;
}
