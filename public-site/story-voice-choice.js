(function () {
  "use strict";

  if (window.KiddoSproutStoryVoiceChoice) return;

  const LEGACY_KEY = "kiddosproutStoryVoice";
  const DEMO_KEY = "kiddosprout.demo.v1.storyVoice";
  const LEGACY_USER_KEY_PREFIX = "kiddosproutStoryVoice:user:";
  const USER_KEY_PREFIX = "kiddosproutStoryVoice:v2:user:";
  const SESSION_KEYS = ["kiddosproutSupabaseSession", "flavornest_session"];
  const MAX_STORED_CHOICE_LENGTH = 2048;

  function demoActive() {
    if (window.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true) return true;
    if (window.KiddoSproutDemo?.active?.() === true) return true;
    try {
      return window.sessionStorage.getItem("kiddosprout.demo.v1.active") === "1";
    } catch (error) {
      return false;
    }
  }

  function session() {
    if (window.KiddoSproutSession?.getSession) {
      return window.KiddoSproutSession.getSession() || null;
    }
    for (const key of SESSION_KEYS) {
      try {
        const value = JSON.parse(window.sessionStorage.getItem(key) || "null");
        if (value?.access_token) return value;
      } catch (error) {
        // Try the next shared session key only when the central helper is absent.
      }
    }
    return null;
  }

  function storageContext() {
    if (demoActive()) return { storage: window.sessionStorage, key: DEMO_KEY };
    const userId = String(session()?.user?.id || "").trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(userId)) return null;
    const state = window.KiddoHubGate?.readState?.();
    const activeChild = String(state?.activeChild || "").trim();
    if (!activeChild || activeChild.length > 160) return null;
    if (!state?.children || !Object.prototype.hasOwnProperty.call(state.children, activeChild)) return null;
    return {
      storage: window.localStorage,
      key: `${USER_KEY_PREFIX}${userId}:${encodeURIComponent(activeChild)}`,
      legacyKey: `${LEGACY_USER_KEY_PREFIX}${userId}`
    };
  }

  function clearLegacyChoice(context) {
    if (!context?.legacyKey) return;
    try {
      // The old account-only choice may belong to a sibling on this shared browser.
      // Never silently assign it to whichever child happens to be active now.
      context.storage.removeItem(context.legacyKey);
    } catch (error) {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }

  function normalizedChoice(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (!["elevenlabs", "device"].includes(value.source)) return null;
    if (typeof value.id !== "string" || typeof value.name !== "string") return null;
    const id = value.id.trim();
    const name = value.name.replace(/\s+/g, " ").trim();
    if (!id || !name || id.length > 256 || name.length > 100) return null;
    return {
      source: value.source,
      id,
      name,
      quality: ["pro", "studio", "studio-pro"].includes(value.quality) ? value.quality : "standard"
    };
  }

  function read() {
    try {
      const context = storageContext();
      if (!context) return null;
      clearLegacyChoice(context);
      const serialized = context.storage.getItem(context.key);
      if (!serialized) return null;
      if (serialized.length > MAX_STORED_CHOICE_LENGTH) {
        context.storage.removeItem(context.key);
        return null;
      }
      let parsed;
      try {
        parsed = JSON.parse(serialized);
      } catch (error) {
        context.storage.removeItem(context.key);
        return null;
      }
      const choice = normalizedChoice(parsed);
      if (!choice) context.storage.removeItem(context.key);
      return choice;
    } catch (error) {
      return null;
    }
  }

  function write(value) {
    try {
      const context = storageContext();
      const choice = normalizedChoice(value);
      if (!context || !choice) return false;
      clearLegacyChoice(context);
      context.storage.setItem(context.key, JSON.stringify(choice));
      return true;
    } catch (error) {
      return false;
    }
  }

  function key() {
    try {
      return storageContext()?.key || "";
    } catch (error) {
      return "";
    }
  }

  if (!demoActive()) {
    try {
      // An old unscoped choice may belong to a different family on a shared browser.
      // Clear it instead of silently assigning it to whoever logs in next.
      window.localStorage.removeItem(LEGACY_KEY);
    } catch (error) {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }

  window.KiddoSproutStoryVoiceChoice = Object.freeze({ read, write, key, demoActive });
}());
