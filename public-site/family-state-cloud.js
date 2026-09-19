(function attachFamilyStateCloud(global) {
  "use strict";

  if (global.KiddoSproutFamilyState) return;

  const TABLE_PATH = "/rest/v1/family_state";
  const ROW_COLUMNS = "owner_id,state,updated_at";
  const MAX_STATE_BYTES = 1024 * 1024;
  const MAX_RESPONSE_BYTES = MAX_STATE_BYTES + (64 * 1024);
  const MAX_DEPTH = 32;
  const MAX_NODES = 50000;
  const MAX_KEY_CHARACTERS = 128;
  const MAX_STRING_CHARACTERS = 250000;
  const MODERN_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{12,}$/;
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const TEMPORARY_KINDS = new Set(["offline", "network", "timeout", "unavailable"]);
  const SAFE_THEMES = new Set(["auto", "day", "night"]);
  const SAFE_LANGUAGES = new Set(["en-GB", "es", "fr", "pt", "de"]);
  const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  const SENSITIVE_KEYS = new Set([
    "accesstoken",
    "accountpassword",
    "apikey",
    "authorization",
    "blockerpin",
    "captchatoken",
    "flavornestsession",
    "kiddosproutsupabasesession",
    "parentpasscode",
    "password",
    "refreshtoken",
    "servicekey",
    "servicerolekey",
    "session",
    "smtp password",
    "smtppass",
    "supabasesession",
    "turnstilesecret",
    "turnstiletoken"
  ].map((key) => key.replace(/[^a-z0-9]/g, "")));
  let configuredClientCache = null;
  let configuredClientSignature = "";

  class FamilyStateCloudError extends Error {
    constructor(kind, message, options = {}) {
      super(message);
      this.name = "FamilyStateCloudError";
      this.kind = kind;
      this.code = String(options.code || "");
      this.status = Number(options.status || 0);
      if (options.cause) this.cause = options.cause;
    }
  }

  function error(kind, message, options) {
    return new FamilyStateCloudError(kind, message, options);
  }

  function demoActive() {
    if (global.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true) return true;
    if (global.KiddoSproutDemo?.active?.() === true) return true;
    try {
      return global.sessionStorage?.getItem?.("kiddosprout.demo.v1.active") === "1";
    } catch (storageError) {
      return false;
    }
  }

  function requireUuid(value, label = "Family owner") {
    if (typeof value !== "string" || !UUID_PATTERN.test(value.trim())) {
      throw error("auth", `${label} is not valid.`);
    }
    return value.trim().toLowerCase();
  }

  function normalizedSensitiveKey(key) {
    return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function isSensitiveKey(key) {
    const normalized = normalizedSensitiveKey(key);
    if (normalized === "parentpasscoderecord") return false;
    return SENSITIVE_KEYS.has(normalized)
      || normalized.endsWith("token")
      || normalized.endsWith("password")
      || normalized.endsWith("secret");
  }

  function sanitizeState(value, options = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw error("validation", "Family state must be a JSON object.");
    }

    const seen = new WeakSet();
    const stats = { nodes: 0, sensitive: 0 };

    function visit(input, depth) {
      stats.nodes += 1;
      if (stats.nodes > MAX_NODES) {
        throw error("validation", "Family state contains too many items.");
      }
      if (depth > MAX_DEPTH) {
        throw error("validation", "Family state is nested too deeply.");
      }
      if (input === null || typeof input === "boolean") return input;
      if (typeof input === "number") {
        if (!Number.isFinite(input)) throw error("validation", "Family state contains an invalid number.");
        return input;
      }
      if (typeof input === "string") {
        if (input.length > MAX_STRING_CHARACTERS) {
          throw error("validation", "Family state contains text that is too long.");
        }
        return input;
      }
      if (typeof input !== "object") {
        throw error("validation", "Family state contains a value that JSON cannot store.");
      }
      if (seen.has(input)) throw error("validation", "Family state cannot contain circular references.");
      seen.add(input);
      try {
        if (Array.isArray(input)) {
          return input.map((item) => visit(item, depth + 1));
        }
        if (Object.prototype.toString.call(input) !== "[object Object]") {
          throw error("validation", "Family state may contain only plain JSON objects.");
        }
        const output = Object.create(null);
        for (const [key, item] of Object.entries(input)) {
          if (!key || key.length > MAX_KEY_CHARACTERS || UNSAFE_OBJECT_KEYS.has(key)) {
            throw error("validation", "Family state contains an unsafe property name.");
          }
          if (isSensitiveKey(key)) {
            stats.sensitive += 1;
            continue;
          }
          output[key] = visit(item, depth + 1);
        }
        return output;
      } finally {
        seen.delete(input);
      }
    }

    const sanitized = visit(value, 0);
    let serialized;
    try {
      serialized = JSON.stringify(sanitized);
    } catch (serializationError) {
      throw error("validation", "Family state could not be converted to JSON.", { cause: serializationError });
    }
    const byteLength = new TextEncoder().encode(serialized).byteLength;
    if (byteLength > MAX_STATE_BYTES) {
      throw error("validation", "Family state is too large to save safely.");
    }
    if (options.rejectSensitive === true && stats.sensitive > 0) {
      throw error("unsafe_response", "Family storage returned credential-shaped fields.");
    }
    return { state: JSON.parse(serialized), removedSensitiveFields: stats.sensitive, byteLength };
  }

  function sanitizeCloudState(value) {
    return sanitizeState(value).state;
  }

  function safeLocalState(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      themeMode: SAFE_THEMES.has(source.themeMode) ? source.themeMode : "auto",
      languageMode: SAFE_LANGUAGES.has(source.languageMode) ? source.languageMode : "en-GB"
    };
  }

  function legacyKeyRole(value) {
    const parts = String(value || "").split(".");
    if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return "";
    if (typeof global.atob !== "function") return "";
    try {
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
        .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
      return String(JSON.parse(global.atob(payload))?.role || "").toLowerCase();
    } catch (keyError) {
      return "";
    }
  }

  function isBrowserSafePublishableKey(value) {
    const key = String(value || "").trim();
    return MODERN_PUBLISHABLE_KEY.test(key) || legacyKeyRole(key) === "anon";
  }

  function cleanConfig() {
    const config = global.KIDDO_SPROUT_SUPABASE || {};
    const baseUrl = String(config.url || "").trim().replace(/\/+$/, "");
    const publishableKey = String(config.publishableKey || config.anonKey || "").trim();
    const managed = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl);
    const local = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(baseUrl);
    if ((!managed && !local) || !isBrowserSafePublishableKey(publishableKey)) {
      throw error("configuration", "Private family storage is not configured safely.");
    }
    return { baseUrl, publishableKey };
  }

  function classifyHttpError(status, payload) {
    const code = String(payload && payload.code || "");
    const message = String(payload && (payload.message || payload.msg || payload.error) || "");
    const lower = message.toLowerCase();
    if (code === "PGRST205" || lower.includes("could not find the table") || lower.includes("schema cache")) {
      return error("schema_missing", "Private family storage has not been installed yet.", { code, status });
    }
    if (status === 401 || code === "PGRST301" || lower.includes("jwt expired")) {
      return error("auth", "Your parent session is no longer valid.", { code, status });
    }
    if (status === 403 || code === "42501" || lower.includes("permission denied")) {
      return error("permission", "Private family storage permissions need attention.", { code, status });
    }
    if (status === 408 || status === 429 || status >= 500) {
      return error("unavailable", "Private family storage is temporarily unavailable.", { code, status });
    }
    return error("request", "The private family storage request could not be completed.", { code, status });
  }

  async function readBoundedJson(response, allowEmpty = false) {
    if (allowEmpty && response.status === 204) return null;
    const declaredLength = Number(response.headers?.get?.("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      await response.body?.cancel?.("response-too-large").catch(() => {});
      throw error("invalid_response", "Private family storage returned too much data.");
    }
    const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
    if (!contentType.includes("json")) {
      throw error("invalid_response", "Private family storage returned an unexpected response.");
    }
    const reader = response.body?.getReader?.();
    if (!reader) throw error("invalid_response", "This browser cannot read private family data safely.");
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = value instanceof Uint8Array ? value : new Uint8Array(value || []);
        total += chunk.byteLength;
        if (total > MAX_RESPONSE_BYTES) {
          await reader.cancel("response-too-large").catch(() => {});
          throw error("invalid_response", "Private family storage returned too much data.");
        }
        chunks.push(chunk);
      }
    } finally {
      try { reader.releaseLock(); } catch (readerError) {}
    }
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(combined);
    } catch (decodeError) {
      throw error("invalid_response", "Private family storage returned unreadable text.");
    }
    if (!text) {
      if (allowEmpty) return null;
      throw error("invalid_response", "Private family storage returned an empty response.");
    }
    try {
      return JSON.parse(text);
    } catch (parseError) {
      throw error("invalid_response", "Private family storage returned invalid JSON.");
    }
  }

  function normalizeRow(row, expectedOwner) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw error("invalid_response", "Private family storage returned an invalid row.");
    }
    let owner;
    try {
      owner = requireUuid(row.owner_id);
    } catch (authError) {
      throw error("invalid_response", "Private family storage returned an invalid owner.");
    }
    if (owner !== expectedOwner) {
      throw error("unsafe_response", "Private family storage returned another family's data.");
    }
    if (typeof row.updated_at !== "string" || !row.updated_at || row.updated_at.length > 80) {
      throw error("invalid_response", "Private family storage returned invalid metadata.");
    }
    return {
      state: sanitizeState(row.state, { rejectSensitive: true }).state,
      updatedAt: row.updated_at
    };
  }

  function createClient(options = {}) {
    const baseUrl = String(options.baseUrl || "").trim().replace(/\/+$/, "");
    const publishableKey = String(options.publishableKey || "").trim();
    const fetchImpl = options.fetchImpl || global.fetch;
    const sessionApi = options.sessionApi || global.KiddoSproutSession;
    const online = options.online || (() => global.navigator?.onLine !== false);
    const configuredTimeout = Number(options.timeoutMs);
    const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? Math.min(configuredTimeout, 60000)
      : 12000;
    const knownRevisionByOwner = new Map();
    const CONFLICT_REVISION = Symbol("family-state-conflict");
    const managed = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl);
    const local = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(baseUrl);
    if ((!managed && !local) || !isBrowserSafePublishableKey(publishableKey)) {
      throw error("configuration", "Private family storage is not configured safely.");
    }
    if (typeof fetchImpl !== "function") {
      throw error("configuration", "This browser cannot reach private family storage.");
    }

    async function authContext(expectedOwnerId = "") {
      if (!online()) throw error("offline", "Private family storage is unavailable while offline.");
      if (!sessionApi || typeof sessionApi.validate !== "function") {
        throw error("auth", "A verified parent login is required.");
      }
      let session;
      try {
        session = await sessionApi.validate();
      } catch (sessionError) {
        if (sessionApi.isTemporaryError?.(sessionError)) {
          throw error("unavailable", "The account service is temporarily unavailable.", { cause: sessionError });
        }
        throw error("auth", "A verified parent login is required.", { cause: sessionError });
      }
      const accessToken = String(session?.access_token || "");
      if (!session?.user?.id || !accessToken) {
        throw error("auth", "A verified parent login is required.");
      }
      const ownerId = requireUuid(session.user.id);
      if (expectedOwnerId && requireUuid(expectedOwnerId, "Expected family owner") !== ownerId) {
        throw error("auth", "The parent account changed before private family storage could be accessed.");
      }
      if (typeof sessionApi.getSession === "function") {
        let currentSession;
        try {
          currentSession = sessionApi.getSession();
        } catch (sessionError) {
          throw error("auth", "The parent account changed before private family storage could be accessed.", { cause: sessionError });
        }
        let currentOwnerId = "";
        try {
          currentOwnerId = requireUuid(currentSession?.user?.id);
        } catch (sessionError) {
          throw error("auth", "The parent account changed before private family storage could be accessed.", { cause: sessionError });
        }
        if (currentOwnerId !== ownerId || String(currentSession?.access_token || "") !== accessToken) {
          throw error("auth", "The parent account changed before private family storage could be accessed.");
        }
      }
      return { ownerId, accessToken };
    }

    async function request(path, requestOptions, accessToken) {
      if (!online()) throw error("offline", "Private family storage is unavailable while offline.");
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      let response;
      try {
        response = await fetchImpl(`${baseUrl}${TABLE_PATH}${path}`, {
          method: requestOptions.method || "GET",
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            ...requestOptions.headers
          },
          body: requestOptions.body,
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller?.signal
        });
        let payload;
        try {
          payload = await readBoundedJson(response, response.status === 204);
        } catch (responseError) {
          if (!response.ok && ([401, 403, 408, 429].includes(response.status) || response.status >= 500)) {
            throw classifyHttpError(response.status, {});
          }
          throw responseError;
        }
        if (!response.ok) throw classifyHttpError(response.status, payload);
        return payload;
      } catch (requestError) {
        if (requestError instanceof FamilyStateCloudError) throw requestError;
        const timedOut = requestError?.name === "AbortError";
        throw error(
          timedOut ? "timeout" : "network",
          timedOut
            ? "Private family storage took too long to respond."
            : "Private family storage could not be reached.",
          { cause: requestError }
        );
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    }

    async function load(options = {}) {
      const { ownerId, accessToken } = await authContext(options.expectedOwnerId);
      const query = `?owner_id=eq.${encodeURIComponent(ownerId)}&select=${encodeURIComponent(ROW_COLUMNS)}&limit=2`;
      const payload = await request(query, {}, accessToken);
      if (!Array.isArray(payload) || payload.length > 1) {
        throw error("invalid_response", "Private family storage returned an invalid result.");
      }
      if (payload.length === 0) {
        knownRevisionByOwner.set(ownerId, null);
        return null;
      }
      const record = normalizeRow(payload[0], ownerId);
      knownRevisionByOwner.set(ownerId, record.updatedAt);
      return record.state;
    }

    async function save(value, options = {}) {
      const { ownerId, accessToken } = await authContext(options.expectedOwnerId);
      const familyState = sanitizeCloudState(value);
      if (!knownRevisionByOwner.has(ownerId)) {
        const lookupQuery = `?owner_id=eq.${encodeURIComponent(ownerId)}&select=${encodeURIComponent(ROW_COLUMNS)}&limit=2`;
        const lookup = await request(lookupQuery, {}, accessToken);
        if (!Array.isArray(lookup) || lookup.length > 1) {
          throw error("invalid_response", "Private family storage returned an invalid result.");
        }
        knownRevisionByOwner.set(ownerId, lookup.length ? normalizeRow(lookup[0], ownerId).updatedAt : null);
      }

      const revision = knownRevisionByOwner.get(ownerId);
      if (revision === CONFLICT_REVISION) {
        throw error("conflict", "Family settings changed in another tab. Reload before saving again.");
      }
      const creating = revision === null;
      const query = creating
        ? `?select=${encodeURIComponent(ROW_COLUMNS)}`
        : `?owner_id=eq.${encodeURIComponent(ownerId)}&updated_at=eq.${encodeURIComponent(revision)}&select=${encodeURIComponent(ROW_COLUMNS)}`;
      let payload;
      try {
        payload = await request(query, {
          method: creating ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify(creating
            ? { owner_id: ownerId, state: familyState }
            : { state: familyState })
        }, accessToken);
      } catch (saveError) {
        if (creating && saveError?.code === "23505") {
          knownRevisionByOwner.set(ownerId, CONFLICT_REVISION);
          throw error("conflict", "Family settings changed in another tab. Reload before saving again.", { cause: saveError });
        }
        throw saveError;
      }
      if (!Array.isArray(payload) || payload.length !== 1) {
        if (Array.isArray(payload) && payload.length === 0) {
          knownRevisionByOwner.set(ownerId, CONFLICT_REVISION);
          throw error("conflict", "Family settings changed in another tab. Reload before saving again.");
        }
        throw error("invalid_response", "Private family storage did not confirm the saved state.");
      }
      const record = normalizeRow(payload[0], ownerId);
      knownRevisionByOwner.set(ownerId, record.updatedAt);
      return record.state;
    }

    return Object.freeze({ load, save });
  }

  function configuredClient() {
    const { baseUrl, publishableKey } = cleanConfig();
    const signature = `${baseUrl}\n${publishableKey}`;
    if (!configuredClientCache || configuredClientSignature !== signature) {
      configuredClientCache = createClient({ baseUrl, publishableKey });
      configuredClientSignature = signature;
    }
    return configuredClientCache;
  }

  async function load(options = {}) {
    if (demoActive()) return null;
    return configuredClient().load(options);
  }

  async function save(value, options = {}) {
    if (demoActive()) return null;
    return configuredClient().save(value, options);
  }

  async function migrate(value, options = {}) {
    const localState = safeLocalState(value);
    if (demoActive()) return { migrated: false, state: null, localState };
    const state = await save(value, options);
    return { migrated: true, state, localState: safeLocalState(state) };
  }

  function isTemporaryError(value) {
    return value instanceof FamilyStateCloudError && TEMPORARY_KINDS.has(value.kind);
  }

  global.KiddoSproutFamilyState = Object.freeze({
    FamilyStateCloudError,
    createClient,
    load,
    save,
    migrate,
    sanitizeCloudState,
    safeLocalState,
    isTemporaryError,
    demoActive,
    constants: Object.freeze({ MAX_STATE_BYTES, MAX_RESPONSE_BYTES })
  });
})(typeof window === "object" ? window : globalThis);
