(function () {
  "use strict";

  if (window.KiddoSproutSession) return;

  const SESSION_KEYS = ["kiddosproutSupabaseSession", "flavornest_session"];
  const TEMPORARY_ERROR_CODE = "session_temporarily_unavailable";
  const MODERN_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{12,}$/;
  const refreshPromises = new Map();
  let sessionRevision = 0;

  function temporarySessionError(cause) {
    const error = new Error("The account service cannot be reached right now. Your saved sign-in has been kept.");
    error.code = TEMPORARY_ERROR_CODE;
    if (cause) error.cause = cause;
    return error;
  }

  function isTemporaryError(error) {
    return error?.code === TEMPORARY_ERROR_CODE;
  }

  function isDefiniteAuthRejection(status) {
    return [400, 401, 403].includes(Number(status));
  }

  function browserStorage(name) {
    try {
      return window[name] || null;
    } catch (error) {
      return null;
    }
  }

  function demoActive() {
    if (window.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true) return true;
    if (window.KiddoSproutDemo?.active?.() === true) return true;
    try {
      return browserStorage("sessionStorage")?.getItem?.("kiddosprout.demo.v1.active") === "1";
    } catch (error) {
      return false;
    }
  }

  function readFromStorage(storage) {
    for (const key of SESSION_KEYS) {
      try {
        const session = JSON.parse(storage?.getItem?.(key) || "null");
        if (session?.access_token) return session;
      } catch (error) {
        // Try the next shared session key.
      }
    }
    return null;
  }

  function removeFromStorage(storage) {
    SESSION_KEYS.forEach((key) => {
      try {
        storage?.removeItem?.(key);
      } catch (error) {
        // Keep clearing the other shared key when one storage operation fails.
      }
    });
  }

  function writeToSessionStorage(session) {
    const serialized = JSON.stringify(session);
    const storage = browserStorage("sessionStorage");
    if (!storage) return false;
    let saved = false;
    SESSION_KEYS.forEach((key) => {
      try {
        storage.setItem(key, serialized);
        saved = true;
      } catch (error) {
        // Try the other shared key before treating the tab session as unavailable.
      }
    });
    return saved;
  }

  function readSession() {
    if (demoActive()) return null;

    const tabSession = readFromStorage(browserStorage("sessionStorage"));
    if (tabSession) {
      // A current tab session is authoritative. Never let an older persistent
      // copy replace it, and remove that legacy copy as soon as it is found.
      removeFromStorage(browserStorage("localStorage"));
      return tabSession;
    }

    // Earlier KiddoSprout builds saved Supabase refresh tokens persistently.
    // Move one usable legacy session into this tab, then erase every old copy.
    // If sessionStorage is unavailable, fail closed and require a fresh login
    // instead of leaving the refresh token behind in localStorage.
    const legacySession = readFromStorage(browserStorage("localStorage"));
    const migrated = Boolean(legacySession && writeToSessionStorage(legacySession));
    removeFromStorage(browserStorage("localStorage"));
    return migrated ? legacySession : null;
  }

  function saveSession(session) {
    if (demoActive()) return false;
    if (!session?.access_token) return false;
    const saved = writeToSessionStorage(session);
    removeFromStorage(browserStorage("localStorage"));
    return saved;
  }

  function clearSession() {
    if (demoActive()) return;
    sessionRevision += 1;
    removeFromStorage(browserStorage("sessionStorage"));
    removeFromStorage(browserStorage("localStorage"));
  }

  function sessionIdentity(session) {
    return String(session?.refresh_token || session?.access_token || "");
  }

  function jwtExpiry(accessToken) {
    try {
      const payload = accessToken.split(".")[1];
      if (!payload) return 0;
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
      return Number(JSON.parse(window.atob(normalized))?.exp || 0);
    } catch (error) {
      return 0;
    }
  }

  function sessionExpiry(session) {
    const statedExpiry = Number(session?.expires_at || 0);
    const tokenExpiry = jwtExpiry(session?.access_token || "");
    if (statedExpiry > 0 && tokenExpiry > 0) return Math.min(statedExpiry, tokenExpiry);
    return statedExpiry > 0 ? statedExpiry : tokenExpiry;
  }

  function legacyKeyRole(value) {
    const parts = String(value || "").split(".");
    if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return "";
    if (typeof window.atob !== "function") return "";
    try {
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
        .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
      return String(JSON.parse(window.atob(payload))?.role || "").toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function isBrowserSafePublishableKey(value) {
    const key = String(value || "").trim();
    return MODERN_PUBLISHABLE_KEY.test(key) || legacyKeyRole(key) === "anon";
  }

  function cleanConfig() {
    const config = window.KIDDO_SPROUT_SUPABASE || {};
    const url = String(config.url || "").trim().replace(/\/+$/, "");
    const key = String(config.publishableKey || config.anonKey || "").trim();
    const isManaged = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
    const isLocal = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(url);
    return (isManaged || isLocal) && isBrowserSafePublishableKey(key)
      ? { url, key }
      : { url: "", key: "" };
  }

  async function refreshSession(session) {
    if (demoActive()) return null;
    const { url, key } = cleanConfig();
    if (!session?.refresh_token) return null;
    if (!url || !key) throw temporarySessionError();
    const identity = sessionIdentity(session);
    if (refreshPromises.has(identity)) return refreshPromises.get(identity);
    const revision = sessionRevision;
    const refreshPromise = (async () => {
      let response;
      try {
        response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: {
            apikey: key,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
          cache: "no-store",
          signal: typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(8000)
            : undefined
        });
      } catch (error) {
        throw temporarySessionError(error);
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.access_token) {
        if (isDefiniteAuthRejection(response.status)) {
          const currentSession = readSession();
          if (
            sessionRevision === revision
            && sessionIdentity(currentSession) === identity
            && String(currentSession?.access_token || "") === String(session.access_token || "")
          ) {
            clearSession();
          }
          return null;
        }
        throw temporarySessionError();
      }
      const currentSession = readSession();
      if (
        sessionRevision !== revision
        || sessionIdentity(currentSession) !== identity
        || String(currentSession?.access_token || "") !== String(session.access_token || "")
      ) {
        return null;
      }
      saveSession(payload);
      return payload;
    })().finally(() => {
      if (refreshPromises.get(identity) === refreshPromise) {
        refreshPromises.delete(identity);
      }
    });
    refreshPromises.set(identity, refreshPromise);
    return refreshPromise;
  }

  async function getAccessToken() {
    if (demoActive()) return "";
    const session = readSession();
    if (!session?.access_token) return "";
    const expiry = sessionExpiry(session);
    const now = Math.floor(Date.now() / 1000);
    if (!expiry || expiry > now + 60) return String(session.access_token);
    if (!session.refresh_token) return expiry > now ? String(session.access_token) : "";
    const refreshed = await refreshSession(session);
    return String(refreshed?.access_token || "");
  }

  async function validateSession() {
    if (demoActive()) return null;
    const storedSession = readSession();
    if (!storedSession) return null;
    const { url, key } = cleanConfig();
    if (!url || !key) throw temporarySessionError();
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        const currentSession = readSession();
        if (sessionIdentity(currentSession) !== sessionIdentity(storedSession)) {
          return currentSession ? validateSession() : null;
        }
        clearSession();
        return null;
      }
      const sessionForValidation = readSession();
      if (!sessionForValidation || String(sessionForValidation.access_token || "") !== accessToken) {
        return sessionForValidation ? validateSession() : null;
      }
      const validationIdentity = sessionIdentity(sessionForValidation);
      const validationRevision = sessionRevision;
      const response = await fetch(`${url}/auth/v1/user`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${accessToken}`
        },
        cache: "no-store",
        signal: typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(8000)
          : undefined
      });
      const user = await response.json().catch(() => null);
      const currentSession = readSession();
      if (
        sessionRevision !== validationRevision
        || sessionIdentity(currentSession) !== validationIdentity
        || String(currentSession?.access_token || "") !== accessToken
      ) {
        return currentSession ? validateSession() : null;
      }
      if (!response.ok) {
        if (!isDefiniteAuthRejection(response.status)) throw temporarySessionError();
        clearSession();
        return null;
      }
      if (!user?.email) throw temporarySessionError();
      const session = { ...currentSession, access_token: accessToken, user };
      saveSession(session);
      return session;
    } catch (error) {
      if (isTemporaryError(error)) throw error;
      throw temporarySessionError(error);
    }
  }

  window.KiddoSproutSession = Object.freeze({
    getAccessToken,
    getSession: readSession,
    save: saveSession,
    refresh: () => refreshSession(readSession()),
    validate: validateSession,
    clear: clearSession,
    isTemporaryError
  });
}());
