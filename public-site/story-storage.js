(function () {
  "use strict";

  if (window.KiddoSproutStoryStorage) return;

  const DEMO_ACTIVE_KEY = "kiddosprout.demo.v1.active";
  const DEMO_KEY_PREFIX = "kiddosprout.demo.v1.story:";
  const USER_KEY_PREFIX = "kiddosprout.story.v4:user:";
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const STORAGE_KEY_PATTERN = /^[A-Za-z0-9:_-]{1,220}$/;
  const READER_BOOK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const READER_HASH_PATTERN = /^#story-([a-z0-9]+(?:-[a-z0-9]+)*)(?:\?chapter=([1-9]\d{0,3})&page=([1-9]\d{0,3}))?$/;
  const MAX_READER_BOOK_ID_LENGTH = 80;
  const MAX_READER_LOCATION = 9_999;
  const MAX_STORED_VALUE_LENGTH = 64 * 1024;

  function demoActive() {
    if (window.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true) return true;
    if (window.KiddoSproutDemo?.active?.() === true) return true;
    try {
      return window.sessionStorage.getItem(DEMO_ACTIVE_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function safeStorageKey(value) {
    const key = String(value || "");
    return STORAGE_KEY_PATTERN.test(key) ? key : "";
  }

  function authenticatedScope() {
    const session = window.KiddoSproutSession?.getSession?.();
    const ownerId = String(session?.user?.id || "").trim().toLowerCase();
    const state = window.KiddoHubGate?.readState?.();
    const activeChild = String(state?.activeChild || "").trim();
    if (!UUID_PATTERN.test(ownerId) || !activeChild || activeChild.length > 160) return "";
    if (!state?.children || !Object.prototype.hasOwnProperty.call(state.children, activeChild)) return "";
    return `${ownerId}:${encodeURIComponent(activeChild)}`;
  }

  function contextFor(key) {
    const safeKey = safeStorageKey(key);
    if (!safeKey) return null;
    if (demoActive()) {
      return { storage: window.sessionStorage, key: DEMO_KEY_PREFIX + safeKey, legacyKey: "" };
    }
    const scope = authenticatedScope();
    if (!scope) return null;
    return {
      storage: window.localStorage,
      key: `${USER_KEY_PREFIX}${scope}:${safeKey}`,
      legacyKey: safeKey
    };
  }

  function clearLegacyKey(context) {
    if (!context?.legacyKey) return;
    try {
      // Old releases stored reading progress without an account or child scope.
      // It may belong to somebody else on a shared browser, so never migrate it.
      window.localStorage.removeItem(context.legacyKey);
    } catch (error) {
      // A privacy-restricted browser may not expose persistent storage.
    }
  }

  function getItem(key) {
    try {
      const context = contextFor(key);
      if (!context) return null;
      clearLegacyKey(context);
      const value = context.storage.getItem(context.key);
      if (typeof value !== "string") return null;
      if (value.length > MAX_STORED_VALUE_LENGTH) {
        context.storage.removeItem(context.key);
        return null;
      }
      return value;
    } catch (error) {
      return null;
    }
  }

  function setItem(key, value) {
    try {
      const context = contextFor(key);
      if (!context) return false;
      clearLegacyKey(context);
      const serialized = String(value);
      if (serialized.length > MAX_STORED_VALUE_LENGTH) return false;
      context.storage.setItem(context.key, serialized);
      return true;
    } catch (error) {
      return false;
    }
  }

  function storageKey(key) {
    try {
      return contextFor(key)?.key || "";
    } catch (error) {
      return "";
    }
  }

  function removeItem(key) {
    try {
      const context = contextFor(key);
      if (!context) return false;
      clearLegacyKey(context);
      context.storage.removeItem(context.key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function readerHash(bookId, chapterIndex, pageIndex) {
    const safeBookId = typeof bookId === "string" ? bookId : "";
    const safeChapterIndex = chapterIndex;
    const safePageIndex = pageIndex;
    if (
      safeBookId.length > MAX_READER_BOOK_ID_LENGTH
      || !READER_BOOK_ID_PATTERN.test(safeBookId)
      || !Number.isInteger(safeChapterIndex)
      || !Number.isInteger(safePageIndex)
      || safeChapterIndex < 0
      || safePageIndex < 0
      || safeChapterIndex >= MAX_READER_LOCATION
      || safePageIndex >= MAX_READER_LOCATION
    ) return "";
    return `#story-${safeBookId}?chapter=${safeChapterIndex + 1}&page=${safePageIndex + 1}`;
  }

  function parseReaderHash(value) {
    const match = String(value || "").match(READER_HASH_PATTERN);
    if (!match || match[1].length > MAX_READER_BOOK_ID_LENGTH) return null;
    const exact = match[2] !== undefined;
    return {
      bookId: match[1],
      chapterIndex: exact ? Number(match[2]) - 1 : null,
      pageIndex: exact ? Number(match[3]) - 1 : null,
      exact
    };
  }

  window.KiddoSproutStoryStorage = Object.freeze({
    demoActive,
    getItem,
    setItem,
    removeItem,
    storageKey,
    readerHash,
    parseReaderHash
  });
}());
