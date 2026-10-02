import { createClient } from "../vendor/supabase-js-2.116.0.js";

const AUTH_STORAGE_KEY = "kiddosprout-wisp-auth-v1";
// Supabase also uses storageKey as its cross-document BroadcastChannel name.
// Wisp deliberately stores sessions in sessionStorage, so every document gets
// a private channel key while the adapter maps the actual data back to the
// stable tab-scoped key. A sign-in or sign-out in another tab can therefore
// never replace this tab's Realtime token with a different account's token.
const CLIENT_STORAGE_KEY = `${AUTH_STORAGE_KEY}:${globalThis.crypto?.randomUUID?.()
  || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

function tabStorageKey(key) {
  const value = String(key || "");
  return value.startsWith(CLIENT_STORAGE_KEY)
    ? `${AUTH_STORAGE_KEY}${value.slice(CLIENT_STORAGE_KEY.length)}`
    : value;
}

const sessionStore = {
  getItem(key) {
    try { return window.sessionStorage.getItem(tabStorageKey(key)); } catch { return null; }
  },
  setItem(key, value) {
    try { window.sessionStorage.setItem(tabStorageKey(key), value); } catch { /* A private browser may block storage. */ }
  },
  removeItem(key) {
    try { window.sessionStorage.removeItem(tabStorageKey(key)); } catch { /* Nothing else to clear. */ }
  },
};

function decodeJwtPayload(key) {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isBrowserSafeSupabaseKey(value) {
  const key = String(value || "").trim();
  if (/^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(key)) return true;
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return false;
  return decodeJwtPayload(key)?.role === "anon";
}

function readRuntimeConfig() {
  const runtime = window.KIDDO_SPROUT_SUPABASE;
  if (!runtime || typeof runtime !== "object") {
    return { error: "KiddoSprout account settings did not load. Refresh the page and try again." };
  }
  if (runtime.publicDemoOnly === true) {
    return { error: "Wisp accounts are unavailable in the public demo." };
  }

  const url = String(runtime.url || "").trim().replace(/\/+$/, "");
  const key = String(runtime.publishableKey || runtime.anonKey || "").trim();
  const managedUrl = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co$/i.test(url);
  const localUrl = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/i.test(url);

  if (!managedUrl && !localUrl) {
    return { error: "KiddoSprout account settings contain an invalid Supabase URL." };
  }
  if (!isBrowserSafeSupabaseKey(key)) {
    return { error: "KiddoSprout account settings need a browser-safe publishable key." };
  }
  return {
    config: Object.freeze({
      url,
      key,
      emailDeliveryReady: runtime.emailDeliveryReady === true,
    }),
  };
}

const runtimeResult = readRuntimeConfig();

export const supabaseConfigError = runtimeResult.error || "";
export const authEmailDeliveryReady = runtimeResult.config?.emailDeliveryReady === true;
export const supabase = runtimeResult.config
  ? createClient(runtimeResult.config.url, runtimeResult.config.key, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Wisp is a static browser app with no server callback. Implicit email
        // links keep tokens in the URL fragment and still work when a parent
        // opens confirmation/recovery mail in a fresh tab or another browser.
        flowType: "implicit",
        persistSession: true,
        storage: sessionStore,
        storageKey: CLIENT_STORAGE_KEY,
      },
      realtime: { params: { eventsPerSecond: 12 } },
    })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error(supabaseConfigError || "The account service is unavailable.");
  return supabase;
}
