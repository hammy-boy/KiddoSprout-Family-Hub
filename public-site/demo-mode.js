(function () {
  "use strict";

  if (window.KiddoSproutDemo) return;

  const ACTIVE_KEY = "kiddosprout.demo.v1.active";
  const STATE_KEY = "kiddosprout.demo.v1.family";
  const KEY_PREFIX = "kiddosprout.demo.v1.";

  function publicOnly() {
    return window.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true;
  }

  function active() {
    if (publicOnly()) return true;
    try {
      return window.sessionStorage.getItem(ACTIVE_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function read() {
    if (!active()) return null;
    try {
      const value = JSON.parse(window.sessionStorage.getItem(STATE_KEY) || "null");
      return value && typeof value === "object" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function write(value) {
    if (!active() || !value || typeof value !== "object") return false;
    try {
      window.sessionStorage.setItem(STATE_KEY, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function start(value) {
    try {
      window.sessionStorage.setItem(ACTIVE_KEY, "1");
      if (!write(value)) {
        window.sessionStorage.removeItem(ACTIVE_KEY);
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearStoredDemoData({ preserveFamily = false } = {}) {
    try {
      const storage = window.sessionStorage;
      const keys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (typeof key !== "string" || !key.startsWith(KEY_PREFIX)) continue;
        if (preserveFamily && (key === ACTIVE_KEY || key === STATE_KEY)) continue;
        keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
      return true;
    } catch (error) {
      return false;
    }
  }

  function reset(value) {
    if (!active() || !write(value)) return false;
    return clearStoredDemoData({ preserveFamily: true });
  }

  function exit() {
    clearStoredDemoData();
  }

  window.KiddoSproutDemo = Object.freeze({
    active,
    read,
    write,
    start,
    reset,
    exit,
    publicOnly,
    keys: Object.freeze({ active: ACTIVE_KEY, state: STATE_KEY })
  });
}());
