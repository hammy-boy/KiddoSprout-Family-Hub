(function () {
  "use strict";

  const MAX_MESSAGE_LENGTH = 600;
  const MAX_REPLY_LENGTH = 6000;
  const MAX_TRANSCRIPT_MESSAGES = 24;
  const MAX_TRANSCRIPT_CHARACTERS = 24000;
  const MAX_TRANSCRIPT_JSON_LENGTH = 40000;
  const REQUEST_TIMEOUT_MS = 20000;
  const DELETE_TIMEOUT_MS = 7000;
  const HEALTH_TIMEOUT_MS = 6000;
  const MAX_ACCESS_TOKEN_LENGTH = 8192;
  const HEALTH_PATH = "/api/sprout-tutor/health";
  const STORAGE_PREFIX = "kiddosprout.sproutTutor.v1";
  const APP_ID = "sproutTutor";
  const APP_TITLE = "Sprout Tutor";
  const EXPECTED_OWNER_HEADER = "X-KiddoSprout-Expected-Owner";
  const EXPECTED_CHILD_HEADER = "X-KiddoSprout-Expected-Child";
  const OWNER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const CHILD_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,159}$/;
  const UNSAFE_CHILD_IDS = new Set(["__proto__", "constructor", "prototype"]);

  const SUBJECTS = Object.freeze({
    maths: "Maths",
    english: "English",
    science: "Science",
    languages: "Languages",
    computing: "Computing"
  });

  const STAGES = Object.freeze({
    sprouts: {
      label: "Sprouts",
      help: "Short steps, familiar examples, and plenty of encouragement."
    },
    growers: {
      label: "Growers",
      help: "Clear explanations with a little challenge."
    },
    explorers: {
      label: "Explorers",
      help: "Deeper questions, connections, and reasoning practice."
    }
  });

  const QUICK_PROMPTS = Object.freeze({
    maths: [
      "Help me solve a maths problem one step at a time.",
      "Give me a number challenge for my stage.",
      "Show me how to check a maths answer."
    ],
    english: [
      "Help me make a sentence more descriptive.",
      "Give me a reading question for my stage.",
      "Explain a grammar idea with an example."
    ],
    science: [
      "Explain a science idea using an everyday example.",
      "Give me a safe science question to think about.",
      "Help me make a prediction and explain why."
    ],
    languages: [
      "Teach me a friendly greeting in another language.",
      "Help me practise five useful words.",
      "Make a short language practice challenge."
    ],
    computing: [
      "Explain what a loop does with a simple example.",
      "Give me a small coding puzzle to think through.",
      "Help me find a bug one step at a time."
    ]
  });

  const dom = {
    pageTitle: document.querySelector("#page-title"),
    modeBanner: document.querySelector("#mode-banner"),
    modeTitle: document.querySelector("#mode-title"),
    modeDescription: document.querySelector("#mode-description"),
    chatKicker: document.querySelector("#chat-kicker"),
    chatTitle: document.querySelector("#chat-title"),
    subject: document.querySelector("#subject-select"),
    stageInputs: Array.from(document.querySelectorAll('input[name="stage"]')),
    stageHelp: document.querySelector("#stage-help"),
    promptList: document.querySelector("#prompt-list"),
    chatLog: document.querySelector("#chat-log"),
    requestStatus: document.querySelector("#request-status"),
    form: document.querySelector("#tutor-form"),
    message: document.querySelector("#message-input"),
    characterCount: document.querySelector("#character-count"),
    privacyStorage: document.querySelector("#privacy-storage"),
    retry: document.querySelector("#retry-tutor"),
    retryQuestion: document.querySelector("#retry-question"),
    send: document.querySelector("#send-message"),
    stop: document.querySelector("#stop-request"),
    reset: document.querySelector("#reset-chat"),
    themeColor: document.querySelector('meta[name="theme-color"]'),
    page: document.querySelector("[data-hub-page]"),
    lock: document.querySelector("[data-hub-lock]"),
    lockTitle: document.querySelector("[data-lock-title]"),
    lockMessage: document.querySelector("[data-lock-message]")
  };

  if (!dom.form || !dom.message || !dom.chatLog || !dom.subject) return;

  let mode = null;
  let activeRequest = null;
  let busy = false;
  let initialized = false;
  let conversationVersion = 0;
  let sessionId = "";
  let transcriptKey = "";
  let retrying = false;
  let storageIdentity = "";
  let storageScope = "";
  let settingsKey = "";
  let sessionKey = "";
  let lastFailedRequest = null;
  let familyRecheckPromise = null;
  let familyContextReady = false;
  let actionPending = false;
  let statusVersion = 0;
  let transcript = [];

  applySavedTheme();

  // The HTML controls start disabled, but this synchronous guard also prevents
  // a native GET if a browser restores their enabled state before the family
  // gate and AI service checks have completed.
  dom.form.addEventListener("submit", (event) => event.preventDefault());

  if (!window.KiddoHubGate || typeof window.KiddoHubGate.protect !== "function") {
    showGateUnavailable(
      "Family access unavailable",
      "KiddoSprout cannot safely check parent settings on this page. Return to the Child Site and try again."
    );
    return;
  }

  Promise.resolve(window.KiddoHubGate.protect(APP_ID, APP_TITLE))
    .then((allowed) => {
      if (allowed === true) return initialize();
      return undefined;
    })
    .catch(() => {
      showGateUnavailable(
        "Family access unavailable",
        "KiddoSprout could not securely check Sprout Tutor. Return to the Child Site and try again."
      );
    });

  async function initialize() {
    if (initialized) return;
    initialized = true;
    document.querySelector(".skip-link")?.setAttribute("href", "#main-content");
    storageIdentity = readStorageIdentity();
    storageScope = await deriveStorageScope(storageIdentity);
    configureScopedStorage();
    removeLegacyUnscopedStorage();
    sessionId = readOrCreateSessionId();
    mode = { kind: "unavailable", origin: null, remote: false, reason: "checking" };
    updateTranscriptKey(mode.kind);

    applySavedSettings();
    renderQuickPrompts();
    updateCharacterCount();
    setServiceAvailability();
    setRequestStatus("Checking the secure AI service…", "busy");

    dom.subject.addEventListener("change", () => {
      clearQuestionRetry();
      saveSettings();
      renderQuickPrompts();
      setServiceAvailability();
    });

    dom.stageInputs.forEach((input) => {
      input.addEventListener("change", () => {
        clearQuestionRetry();
        updateStageHelp();
        saveSettings();
      });
    });

    dom.message.addEventListener("input", () => {
      const wasInvalid = dom.message.getAttribute("aria-invalid") === "true";
      if (dom.message.value.length > MAX_MESSAGE_LENGTH) {
        dom.message.value = dom.message.value.slice(0, MAX_MESSAGE_LENGTH);
      }
      dom.message.removeAttribute("aria-invalid");
      if (wasInvalid) setRequestStatus("");
      clearQuestionRetry();
      updateCharacterCount();
    });

    dom.message.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      if (!busy) dom.form.requestSubmit();
    });

    dom.form.addEventListener("submit", handleSubmit);
    dom.retry?.addEventListener("click", retryTutorConnection);
    dom.retryQuestion?.addEventListener("click", retryLastQuestion);
    dom.stop.addEventListener("click", stopActiveRequest);
    dom.reset.addEventListener("click", resetConversation);

    window.addEventListener("pageshow", (event) => {
      applySavedTheme();
      if (event.persisted) void revalidateFamilyContext();
    });
    window.addEventListener("focus", () => {
      void revalidateFamilyContext();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void revalidateFamilyContext();
    });
    window.addEventListener("storage", (event) => {
      if (event.key === "kiddosproutPreferences") applySavedTheme();
    });

    mode = await resolveTutorMode();
    updateTranscriptKey(mode.kind);
    transcript = loadTranscript();
    describeMode();
    ensureWelcomeMessage();
    renderTranscript();
    renderQuickPrompts();
    setServiceAvailability();
    setRequestStatus(mode.kind === "ai" ? "AI tutor connected." : unavailableStatusMessage(mode), mode.kind === "ai" ? "" : "error");
    familyContextReady = true;
  }

  async function revalidateFamilyContext() {
    if (!initialized || !familyContextReady) return false;
    if (familyRecheckPromise) return familyRecheckPromise;

    const pendingCheck = (async () => {
      try {
        const allowed = await window.KiddoHubGate.protect(APP_ID, APP_TITLE);
        if (allowed !== true || !await currentStorageScopeMatches()) {
          closeConversationForIdentityChange();
          return false;
        }
        return true;
      } catch (error) {
        closeConversationForIdentityChange();
        return false;
      }
    })();
    familyRecheckPromise = pendingCheck;
    try {
      return await pendingCheck;
    } finally {
      if (familyRecheckPromise === pendingCheck) familyRecheckPromise = null;
    }
  }

  function showGateUnavailable(heading, message) {
    dom.page?.classList.add("hidden");
    dom.lock?.classList.remove("hidden");
    dom.lock?.removeAttribute("aria-busy");
    if (dom.lockTitle) {
      dom.lockTitle.textContent = heading;
      if (!dom.lockTitle.id) dom.lockTitle.id = "sprout-tutor-lock-title";
      dom.lock?.setAttribute("aria-labelledby", dom.lockTitle.id);
    }
    if (dom.lockMessage) {
      dom.lockMessage.textContent = message;
      if (!dom.lockMessage.id) dom.lockMessage.id = "sprout-tutor-lock-message";
      dom.lock?.setAttribute("aria-describedby", dom.lockMessage.id);
    }
    const skipLink = document.querySelector(".skip-link");
    if (dom.lock && !dom.lock.id) dom.lock.id = "sprout-tutor-lock";
    if (skipLink && dom.lock) skipLink.setAttribute("href", `#${dom.lock.id}`);
    dom.lock?.focus?.({ preventScroll: true });
  }

  async function resolveTutorMode() {
    const candidates = resolveTutorCandidates();
    if (!candidates.length) {
      return { kind: "unavailable", origin: null, remote: false, reason: "not-configured" };
    }
    if (!isUuidV4(sessionId)) {
      return {
        kind: "unavailable",
        origin: candidates[0].origin,
        remote: candidates[0].origin !== window.location.origin,
        reason: "unsupported-browser"
      };
    }

    let accessToken;
    try {
      accessToken = await getTutorAccessToken();
    } catch (error) {
      return {
        kind: "unavailable",
        origin: candidates[0].origin,
        remote: candidates[0].origin !== window.location.origin,
        reason: "unreachable"
      };
    }
    if (!accessToken) {
      return {
        kind: "unavailable",
        origin: candidates[0].origin,
        remote: candidates[0].origin !== window.location.origin,
        reason: "signed-out"
      };
    }
    const expectedIdentity = parseStorageIdentity(storageIdentity);
    if (!expectedIdentity) {
      return {
        kind: "unavailable",
        origin: candidates[0].origin,
        remote: candidates[0].origin !== window.location.origin,
        reason: "account-changed"
      };
    }

    let authorizationFailure = "";
    for (const candidate of candidates) {
      const health = await verifyTutorHealth(candidate.origin, accessToken, expectedIdentity);
      if (health?.reason === "signed-out" || health?.reason === "approval-needed") {
        authorizationFailure = health.reason;
        continue;
      }
      if (!health?.ready) continue;

      return {
        kind: "ai",
        origin: candidate.origin,
        remote: candidate.origin !== window.location.origin,
        retentionHours: health.retentionHours
      };
    }

    return {
      kind: "unavailable",
      origin: candidates[0].origin,
      remote: candidates[0].origin !== window.location.origin,
      reason: authorizationFailure || "unreachable"
    };
  }

  function resolveTutorCandidates() {
    const hostname = window.location.hostname.toLowerCase();
    const configuredValues = [
      window.KIDDO_SPROUT_TUTOR_ORIGIN,
      ...(Array.isArray(window.KIDDO_SPROUT_TUTOR_ORIGINS)
        ? window.KIDDO_SPROUT_TUTOR_ORIGINS.slice(0, 4)
        : []),
      window.KIDDO_SPROUT_SUPABASE?.tutorOrigin
    ];
    const origins = [];

    configuredValues.forEach((value) => {
      const origin = validateConfiguredOrigin(value);
      if (origin && !origins.includes(origin)) origins.push(origin);
    });

    if (window.location.protocol === "https:" && !isGitHubPagesHost(hostname)) {
      const sameOrigin = validateConfiguredOrigin(window.location.origin);
      if (sameOrigin && !origins.includes(sameOrigin)) origins.push(sameOrigin);
    }

    return origins.slice(0, 4).map((origin) => ({ origin }));
  }

  function isGitHubPagesHost(hostname) {
    return hostname === "github.io" || hostname.endsWith(".github.io");
  }

  async function verifyTutorHealth(origin, accessToken, expectedIdentity) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const response = await window.fetch(new URL(HEALTH_PATH, `${origin}/`).href, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          [EXPECTED_OWNER_HEADER]: expectedIdentity.ownerId,
          [EXPECTED_CHILD_HEADER]: expectedIdentity.childId
        },
        signal: controller.signal,
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "strict-origin-when-cross-origin"
      });
      if (!response.ok) {
        return {
          ready: false,
          reason: response.status === 401
            ? "signed-out"
            : response.status === 403
              ? "approval-needed"
              : "unreachable"
        };
      }
      const contentType = String(response.headers.get("Content-Type") || "").toLowerCase();
      if (!contentType.includes("application/json")) return null;
      const payload = await response.json();
      if (!payload || payload.status !== "ready" || payload.authentication !== "parent-account") {
        return { ready: false, reason: "unreachable" };
      }
      const retentionHours = Number(payload.retentionHours);
      return {
        ready: true,
        retentionHours: Number.isFinite(retentionHours) && retentionHours > 0 && retentionHours <= 168
          ? retentionHours
          : 24
      };
    } catch (error) {
      return { ready: false, reason: "unreachable" };
    } finally {
      window.clearTimeout(timer);
    }
  }

  function validateConfiguredOrigin(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 300) return null;

    try {
      const parsed = new URL(trimmed);
      const hasUnexpectedParts = parsed.username
        || parsed.password
        || (parsed.pathname !== "/" && parsed.pathname !== "")
        || parsed.search
        || parsed.hash;
      if (parsed.protocol !== "https:" || hasUnexpectedParts) return null;
      if (isGitHubPagesHost(parsed.hostname.toLowerCase())) return null;
      return parsed.origin;
    } catch (error) {
      return null;
    }
  }

  function describeMode() {
    dom.modeBanner.classList.remove("is-loading", "is-ai", "is-unavailable");
    dom.chatKicker.textContent = "AI learning helper";
    dom.chatTitle.textContent = "Sprout Tutor";
    dom.pageTitle.textContent = "Meet Sprout Tutor";

    if (mode.kind === "ai") {
      dom.modeBanner.classList.add("is-ai");
      dom.modeTitle.textContent = "AI tutor ready";
      dom.modeDescription.textContent = mode.remote
        ? "Questions are sent to the trusted KiddoSprout tutor service."
        : "Questions are sent to the KiddoSprout tutor on this site.";
      if (dom.retry) dom.retry.hidden = true;
      if (dom.privacyStorage) {
        const retention = mode.retentionHours === 1 ? "one hour" : `up to ${mode.retentionHours} hours`;
        dom.privacyStorage.textContent = `This page keeps a short, limited copy of the chat in this browser tab. The tutor service keeps up to six recent question-and-answer pairs under a random session for ${retention}. New chat clears the browser copy and asks the service to clear its copy. Stop keeps the chat shown here but starts a fresh remote conversation.`;
      }
      return;
    }

    dom.modeBanner.classList.add("is-unavailable");
    dom.modeTitle.textContent = mode.reason === "signed-out"
      ? "Parent sign-in needed"
      : "AI tutor unavailable";
    dom.modeDescription.textContent = unavailableModeDescription(mode);
    if (dom.retry) dom.retry.hidden = false;
    if (dom.privacyStorage) {
      dom.privacyStorage.textContent = "No question is sent while the AI tutor is unavailable. This page keeps only its short status message in this browser tab. New chat clears this browser copy.";
    }
  }

  function unavailableModeDescription(currentMode) {
    if (currentMode.reason === "checking") {
      return "Checking the secure KiddoSprout AI service and parent approval.";
    }
    if (currentMode.reason === "signed-out") {
      return "A parent must sign in to the live KiddoSprout account before a child can ask the AI tutor.";
    }
    if (currentMode.reason === "approval-needed") {
      return "KiddoSprout needs to check parent approval again before another question can be sent.";
    }
    if (currentMode.reason === "account-changed") {
      return "The parent account or child profile changed. Return to the Child Site and open Sprout Tutor again.";
    }
    if (currentMode.reason === "unsupported-browser") {
      return "This browser cannot create the secure random session Sprout Tutor needs. Update the browser before using AI.";
    }
    if (currentMode.reason === "unreachable") {
      return "KiddoSprout found the AI service, but could not reach it safely. Check the connection and try again.";
    }
    return "This copy of KiddoSprout is not connected to its live AI service. Open the cloud-hosted app or ask an adult to finish the Worker setup.";
  }

  function unavailableStatusMessage(currentMode) {
    if (currentMode.reason === "checking") {
      return "Checking the secure AI service. No question can be sent yet.";
    }
    if (currentMode.reason === "signed-out") {
      return "Sprout Tutor is AI-powered, but a parent must sign in before it can answer.";
    }
    if (currentMode.reason === "unreachable") {
      return "Sprout Tutor could not reach the AI service. Nothing you type will be sent while it is offline.";
    }
    if (currentMode.reason === "approval-needed") {
      return "Parent approval needs checking again. No new question will be sent until access is confirmed.";
    }
    if (currentMode.reason === "account-changed") {
      return "The family profile changed, so this chat was safely closed. Return to the Child Site and reopen Sprout Tutor.";
    }
    if (currentMode.reason === "unsupported-browser") {
      return "This browser cannot create a secure AI chat session. Update it before asking Sprout Tutor.";
    }
    return "The AI service is not configured on this site, so asking questions is disabled.";
  }

  function readStorageIdentity() {
    let session = null;
    let state = null;
    try {
      session = window.KiddoSproutSession?.getSession?.() || null;
      state = window.KiddoHubGate?.readState?.() || null;
    } catch (error) {
      return "";
    }

    const ownerId = String(session?.user?.id || "").trim().toLowerCase();
    const childId = String(state?.activeChild || "").trim();
    const childExists = state?.children
      && Object.prototype.hasOwnProperty.call(state.children, childId);
    if (
      !OWNER_ID_PATTERN.test(ownerId)
      || !CHILD_ID_PATTERN.test(childId)
      || UNSAFE_CHILD_IDS.has(childId)
      || !childExists
    ) return "";
    return `${ownerId}\u0000${childId}`;
  }

  function parseStorageIdentity(identity) {
    if (typeof identity !== "string") return null;
    const separator = identity.indexOf("\u0000");
    if (separator <= 0 || separator !== identity.lastIndexOf("\u0000")) return null;
    const ownerId = identity.slice(0, separator).toLowerCase();
    const childId = identity.slice(separator + 1);
    if (
      !OWNER_ID_PATTERN.test(ownerId)
      || !CHILD_ID_PATTERN.test(childId)
      || UNSAFE_CHILD_IDS.has(childId)
    ) return null;
    return { ownerId, childId };
  }

  async function deriveStorageScope(identity) {
    if (!identity) return "";
    if (!window.crypto?.subtle || typeof window.TextEncoder !== "function") return "";

    try {
      const input = new window.TextEncoder().encode(
        `kiddosprout:sprout-tutor:storage:v2\u0000${identity}`
      );
      const digest = await window.crypto.subtle.digest("SHA-256", input);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
        .slice(0, 16)
        .join("");
    } catch (error) {
      // Without a non-reversible scope, keep the conversation in memory only.
      return "";
    }
  }

  function configureScopedStorage() {
    settingsKey = storageScope ? `${STORAGE_PREFIX}.${storageScope}.settings` : "";
    sessionKey = storageScope ? `${STORAGE_PREFIX}.${storageScope}.session` : "";
  }

  function updateTranscriptKey(kind) {
    transcriptKey = storageScope
      ? `${STORAGE_PREFIX}.${storageScope}.transcript.${kind === "ai" ? "ai" : "unavailable"}`
      : "";
  }

  function clearScopedTranscripts() {
    if (!storageScope) return;
    try {
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}.${storageScope}.transcript.ai`);
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}.${storageScope}.transcript.unavailable`);
    } catch (error) {
      // The in-memory transcript is still cleared when storage is unavailable.
    }
  }

  function removeLegacyUnscopedStorage() {
    try {
      [
        `${STORAGE_PREFIX}.settings`,
        `${STORAGE_PREFIX}.session`,
        `${STORAGE_PREFIX}.transcript.ai`,
        `${STORAGE_PREFIX}.transcript.coach`,
        `${STORAGE_PREFIX}.transcript.unavailable`
      ].forEach((key) => window.sessionStorage.removeItem(key));
    } catch (error) {
      // A storage-restricted browser already behaves like memory-only mode.
    }
  }

  async function currentStorageScopeMatches() {
    const currentIdentity = readStorageIdentity();
    if (!storageIdentity || !currentIdentity || currentIdentity !== storageIdentity) return false;
    if (!storageScope) return true;
    const currentScope = await deriveStorageScope(currentIdentity);
    return Boolean(currentScope && currentScope === storageScope);
  }

  function readOrCreateSessionId() {
    if (!sessionKey) return createUuidV4();
    let saved = "";
    try {
      saved = window.sessionStorage.getItem(sessionKey) || "";
    } catch (error) {
      saved = "";
    }

    if (isUuidV4(saved)) return saved.toLowerCase();
    const created = createUuidV4();
    if (isUuidV4(created)) {
      try {
        window.sessionStorage.setItem(sessionKey, created);
      } catch (error) {
        // The conversation still works when storage is unavailable.
      }
    }
    return created;
  }

  function createUuidV4() {
    if (typeof window.crypto?.randomUUID === "function") {
      return window.crypto.randomUUID().toLowerCase();
    }

    if (typeof window.crypto?.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
    }

    // A remotely addressable chat must never use a predictable identifier.
    return "";
  }

  function isUuidV4(value) {
    return typeof value === "string"
      && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function applySavedTheme() {
    let state = null;
    let demoState = null;
    let demoActive = false;

    try {
      demoState = readStoredObject(window.sessionStorage, "kiddosprout.demo.v1.family");
      demoActive = Boolean(demoState)
        || window.sessionStorage.getItem("kiddosprout.demo.v1.active") === "1";
    } catch (error) {
      demoState = null;
    }

    try {
      state = demoActive
        ? demoState
        : readStoredObject(window.localStorage, "kiddosproutPreferences");
    } catch (error) {
      state = demoState;
    }

    const preference = ["auto", "day", "night"].includes(state?.themeMode)
      ? state.themeMode
      : "auto";
    const hour = new Date().getHours();
    const resolved = preference === "auto"
      ? (hour >= 19 || hour < 7 ? "night" : "day")
      : preference;

    document.documentElement.classList.toggle("theme-night", resolved === "night");
    document.documentElement.classList.toggle("theme-day", resolved === "day");
    document.documentElement.dataset.themeMode = preference;
    dom.themeColor?.setAttribute("content", resolved === "night" ? "#071d1a" : "#effbf5");
  }

  function readStoredObject(storage, key) {
    const value = JSON.parse(storage.getItem(key) || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function applySavedSettings() {
    let settings = null;
    if (settingsKey) {
      try {
        settings = readStoredObject(window.sessionStorage, settingsKey);
      } catch (error) {
        settings = null;
      }
    }

    if (settings && Object.hasOwn(SUBJECTS, settings.subject)) {
      dom.subject.value = settings.subject;
    }

    const stage = settings && Object.hasOwn(STAGES, settings.stage)
      ? settings.stage
      : "growers";
    dom.stageInputs.forEach((input) => {
      input.checked = input.value === stage;
    });
    updateStageHelp();
    updateMessagePlaceholder();
  }

  function saveSettings() {
    const settings = { subject: selectedSubject(), stage: selectedStage() };
    if (!settingsKey) return;
    try {
      window.sessionStorage.setItem(settingsKey, JSON.stringify(settings));
    } catch (error) {
      // Controls continue to work when storage is unavailable.
    }
  }

  function selectedSubject() {
    return Object.hasOwn(SUBJECTS, dom.subject.value) ? dom.subject.value : "maths";
  }

  function selectedStage() {
    const checked = dom.stageInputs.find((input) => input.checked);
    return checked && Object.hasOwn(STAGES, checked.value) ? checked.value : "growers";
  }

  function updateStageHelp() {
    dom.stageHelp.textContent = STAGES[selectedStage()].help;
  }

  function updateMessagePlaceholder() {
    const label = SUBJECTS[selectedSubject()].toLowerCase();
    dom.message.placeholder = `Ask a ${label} question or tell me what feels tricky…`;
  }

  function renderQuickPrompts() {
    dom.promptList.replaceChildren();
    QUICK_PROMPTS[selectedSubject()].forEach((prompt) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "prompt-button";
      button.textContent = prompt;
      button.disabled = busy || retrying || mode?.kind !== "ai";
      button.addEventListener("click", () => {
        if (busy || retrying || mode?.kind !== "ai") return;
        const wasInvalid = dom.message.getAttribute("aria-invalid") === "true";
        clearQuestionRetry();
        dom.message.value = prompt.slice(0, MAX_MESSAGE_LENGTH);
        dom.message.removeAttribute("aria-invalid");
        if (wasInvalid) setRequestStatus("");
        updateCharacterCount();
        dom.message.focus();
      });
      dom.promptList.append(button);
    });
  }

  function loadTranscript() {
    if (!transcriptKey) return [];
    let stored;
    try {
      const raw = window.sessionStorage.getItem(transcriptKey) || "[]";
      if (raw.length > MAX_TRANSCRIPT_JSON_LENGTH) {
        window.sessionStorage.removeItem(transcriptKey);
        return [];
      }
      stored = JSON.parse(raw);
    } catch (error) {
      return [];
    }
    if (!Array.isArray(stored)) return [];

    const safeEntries = stored
      .map(normaliseTranscriptEntry)
      .filter(Boolean);
    return boundTranscript(safeEntries);
  }

  function normaliseTranscriptEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    if (entry.role !== "user" && entry.role !== "tutor") return null;
    if (typeof entry.text !== "string") return null;
    if (entry.role === "tutor" && entry.source !== "ai" && entry.source !== "notice") return null;

    const entryLimit = entry.role === "user" ? MAX_MESSAGE_LENGTH : MAX_REPLY_LENGTH;
    const text = entry.text.trim().slice(0, entryLimit);
    if (!text) return null;

    const source = entry.role === "user"
      ? "user"
      : (entry.source === "notice" ? "notice" : "ai");
    const subject = Object.hasOwn(SUBJECTS, entry.subject) ? entry.subject : null;
    const stage = Object.hasOwn(STAGES, entry.stage) ? entry.stage : null;
    return { role: entry.role, source, text, subject, stage };
  }

  function boundTranscript(entries) {
    const kept = [];
    let characters = 0;

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = normaliseTranscriptEntry(entries[index]);
      if (!entry) continue;
      if (kept.length >= MAX_TRANSCRIPT_MESSAGES) break;
      if (characters + entry.text.length > MAX_TRANSCRIPT_CHARACTERS) break;
      kept.push(entry);
      characters += entry.text.length;
    }

    return kept.reverse();
  }

  function ensureWelcomeMessage() {
    if (transcript.length) return;
    const entry = mode.kind === "ai"
      ? {
          role: "tutor",
          source: "ai",
          text: "Hi! I’m Sprout Tutor. Tell me what you are learning, and we can work through it together—one step at a time."
        }
      : {
          role: "tutor",
          source: "notice",
          text: "Sprout Tutor is an AI learning helper, but the secure AI service is not connected right now. No question can be sent until the connection is ready. Choose Try AI again, or ask a parent to open the live KiddoSprout app."
        };
    transcript = boundTranscript([entry]);
    saveTranscript();
  }

  function saveTranscript() {
    transcript = boundTranscript(transcript);
    let encoded = JSON.stringify(transcript);
    while (encoded.length > MAX_TRANSCRIPT_JSON_LENGTH && transcript.length > 1) {
      transcript.shift();
      encoded = JSON.stringify(transcript);
    }
    if (!transcriptKey) return;
    try {
      window.sessionStorage.setItem(transcriptKey, encoded);
    } catch (error) {
      // Keep the bounded in-memory transcript when storage is unavailable.
    }
  }

  function renderTranscript() {
    dom.chatLog.setAttribute("aria-live", "off");
    dom.chatLog.replaceChildren();
    transcript.forEach(appendMessageElement);
    scrollConversation(false);
    window.setTimeout(() => {
      dom.chatLog.setAttribute("aria-live", "polite");
    }, 0);
  }

  function addTranscriptEntry(entry) {
    const safeEntry = normaliseTranscriptEntry(entry);
    if (!safeEntry) return;

    transcript.push(safeEntry);
    transcript = boundTranscript(transcript);
    saveTranscript();

    appendMessageElement(safeEntry);
    while (dom.chatLog.children.length > transcript.length) {
      dom.chatLog.firstElementChild?.remove();
    }
    scrollConversation(true);
  }

  function appendMessageElement(entry) {
    const item = document.createElement("li");
    const meta = document.createElement("span");
    const body = document.createElement("p");

    item.className = entry.role === "user" ? "message is-user" : "message is-tutor";
    if (entry.source === "notice") item.classList.add("is-notice");
    meta.className = "message-meta-label";
    body.className = "message-body";

    if (entry.role === "user") {
      const details = [];
      if (entry.subject) details.push(SUBJECTS[entry.subject]);
      if (entry.stage) details.push(STAGES[entry.stage].label);
      meta.textContent = details.length ? `You · ${details.join(" · ")}` : "You";
    } else {
      meta.textContent = entry.source === "notice" ? "Sprout Tutor status" : "Sprout Tutor · AI";
    }

    body.textContent = entry.text;
    item.append(meta, body);
    dom.chatLog.append(item);
  }

  function scrollConversation(smooth) {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (typeof dom.chatLog.scrollTo === "function") {
      dom.chatLog.scrollTo({
        top: dom.chatLog.scrollHeight,
        behavior: smooth && !reduceMotion ? "smooth" : "auto"
      });
      return;
    }
    dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
  }

  function updateCharacterCount() {
    const length = dom.message.value.length;
    dom.characterCount.textContent = `${length} / ${MAX_MESSAGE_LENGTH}`;
    dom.characterCount.classList.toggle("is-near-limit", length >= 540);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || actionPending) return;

    if (mode.kind !== "ai") {
      setRequestStatus(unavailableStatusMessage(mode), "error");
      dom.retry?.focus();
      return;
    }

    const message = dom.message.value.trim();
    if (!message) {
      dom.message.setAttribute("aria-invalid", "true");
      setRequestStatus("Type a question first, then choose Ask for help.", "error");
      dom.message.focus();
      return;
    }

    if (containsPrivateDetails(message)) {
      dom.message.setAttribute("aria-invalid", "true");
      setRequestStatus(
        "Please remove private details such as a real name, address, school, phone number, email, password, or PIN before asking.",
        "error"
      );
      dom.message.focus();
      return;
    }

    actionPending = true;
    const validationVersion = conversationVersion;
    setBusy(true);
    let requestStarted = false;
    try {
      if (!await currentStorageScopeMatches()) {
        closeConversationForIdentityChange();
        return;
      }
      if (conversationVersion !== validationVersion || mode.kind !== "ai") return;
      const expectedIdentity = parseStorageIdentity(storageIdentity);
      if (!expectedIdentity) {
        closeConversationForIdentityChange();
        return;
      }

      const subject = selectedSubject();
      const stage = selectedStage();
      conversationVersion += 1;
      clearQuestionRetry();
      addTranscriptEntry({ role: "user", source: "user", text: message, subject, stage });
      dom.message.value = "";
      updateCharacterCount();
      requestStarted = true;
      await requestTutorReply(message, subject, stage, expectedIdentity);
    } finally {
      actionPending = false;
      if (!requestStarted && !activeRequest) setBusy(false);
    }
  }

  function closeConversationForIdentityChange(reason = "account-changed", origin = null, remote = false) {
    const oldMode = mode;
    const oldSessionId = sessionId;
    conversationVersion += 1;
    if (activeRequest) {
      const request = activeRequest;
      request.reason = "identity-change";
      activeRequest = null;
      window.clearTimeout(request.timer);
      request.controller.abort();
    }
    setBusy(false);
    clearScopedTranscripts();
    if (sessionKey) {
      try {
        window.sessionStorage.removeItem(sessionKey);
      } catch (error) {
        // The in-memory session is replaced below when storage is unavailable.
      }
    }
    storageIdentity = "";
    storageScope = "";
    configureScopedStorage();
    updateTranscriptKey("unavailable");
    sessionId = createUuidV4();
    transcript = [];
    clearQuestionRetry();
    dom.message.value = "";
    dom.message.removeAttribute("aria-invalid");
    updateCharacterCount();
    mode = { kind: "unavailable", origin, remote, reason };
    ensureWelcomeMessage();
    describeMode();
    renderTranscript();
    renderQuickPrompts();
    setServiceAvailability();
    setRequestStatus(unavailableStatusMessage(mode), "error");
    if (dom.retry && !dom.retry.hidden && !dom.page?.classList.contains("hidden")) dom.retry.focus();
    if (oldMode?.kind === "ai" && isUuidV4(oldSessionId)) {
      void clearRemoteConversation(oldSessionId, oldMode.origin);
    }
  }

  function containsPrivateDetails(message) {
    const text = message.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'");
    const original = message.normalize("NFKC").replace(/[’‘]/g, "'");
    return [
      /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i,
      /(?:^|\D)(?:\+?\d[\d ().-]{7,}\d)(?:\D|$)/,
      /\b(?:my (?:real |full )?name(?: is|'s)|i am called|call me|me llamo|mi nombre es|je m'appelle|mon nom est|ich hei(?:ß|ss)e|mein name ist|eu me chamo|meu nome (?:é|e)|mi chiamo|il mio nome (?:è|e))(?=\s|$|[,:;.!?])/,
      /\b(?:my (?:home )?address is|our (?:house|home)(?: address)? is|i live (?:at|on|in)|vivo en|mi dirección es|j'habite|mon adresse est|ich wohne|meine adresse ist|eu moro|meu endereço (?:é|e)|abito|il mio indirizzo (?:è|e))(?=\s|$|[,:;.!?])/,
      /\b(?:my school (?:is|is called|address is)|i (?:go|study) (?:to|at)|i attend|mi (?:escuela|colegio) (?:es|se llama)|voy (?:a|al)|mon école (?:est|s'appelle)|je vais à|meine schule (?:ist|heißt)|ich gehe (?:in|zur)|minha escola (?:é|se chama)|eu estudo (?:na|no)|la mia scuola (?:è|si chiama)|vado (?:a|alla))\b/,
      /\bmy (?:school|phone|mobile|email|e-mail|password|pin|username|login)(?: number| address)? is\b/,
      /\b(?:date of birth|my birthday is|my date of birth is|i was born on|nací el|mi cumpleaños es|je suis né(?:e)? le|mon anniversaire est|ich bin geboren|mein geburtstag ist|nasci em|meu aniversário (?:é|e)|sono nato|il mio compleanno (?:è|e))(?=\s|$|[,:;.!?])/,
      /\b(?:g(?:ir)?\d{1,2}|[a-pr-uwyz][a-hk-y]?\d{1,2}) ?\d[a-z]{2}\b/i
    ].some((pattern) => pattern.test(text)) || /\b(?:I|i)(?:'m| am)\s+\p{Lu}[\p{L}'-]+(?:\s+\p{Lu}[\p{L}'-]+){0,3}\b/u.test(original);
  }

  async function retryTutorConnection() {
    if (retrying || busy) return;
    retrying = true;
    const focusAtStart = document.activeElement;
    if (dom.retry) dom.retry.disabled = true;
    dom.modeBanner.classList.remove("is-ai", "is-unavailable");
    dom.modeBanner.classList.add("is-loading");
    dom.modeTitle.textContent = "Checking the AI tutor…";
    dom.modeDescription.textContent = "Looking for the secure KiddoSprout Worker and parent sign-in.";
    setServiceAvailability();
    setRequestStatus("Checking the secure AI service…", "busy");

    try {
      const currentIdentity = readStorageIdentity();
      const needsFamilyRecheck = ["signed-out", "approval-needed", "account-changed"].includes(mode.reason)
        || !currentIdentity
        || currentIdentity !== storageIdentity;
      if (needsFamilyRecheck) {
        const allowed = await window.KiddoHubGate.protect(APP_ID, APP_TITLE);
        if (allowed !== true) {
          mode = {
            kind: "unavailable",
            origin: mode?.origin || null,
            remote: Boolean(mode?.remote),
            reason: mode?.reason === "signed-out" ? "signed-out" : "approval-needed"
          };
          describeMode();
          renderQuickPrompts();
          setRequestStatus(unavailableStatusMessage(mode), "error");
          return;
        }
        const refreshedIdentity = readStorageIdentity();
        const refreshedScope = await deriveStorageScope(refreshedIdentity);
        if (storageIdentity && refreshedIdentity !== storageIdentity) {
          closeConversationForIdentityChange("account-changed", mode.origin, mode.remote);
        }
        storageIdentity = refreshedIdentity;
        storageScope = refreshedScope;
        configureScopedStorage();
        sessionId = readOrCreateSessionId();
      }
      mode = await resolveTutorMode();
      updateTranscriptKey(mode.kind);
      transcript = loadTranscript();

      // An availability notice from an earlier attempt should never be shown
      // as though it were part of a newly connected AI conversation.
      if (mode.kind !== "ai") transcript = [];
      ensureWelcomeMessage();
      describeMode();
      renderTranscript();
      renderQuickPrompts();
      updateMessagePlaceholder();
      setRequestStatus(
        mode.kind === "ai" ? "AI tutor connected. You can ask a question now." : unavailableStatusMessage(mode),
        mode.kind === "ai" ? "" : "error"
      );
    } catch (error) {
      mode = {
        kind: "unavailable",
        origin: mode?.origin || null,
        remote: Boolean(mode?.remote),
        reason: "unreachable"
      };
      updateTranscriptKey(mode.kind);
      transcript = [];
      ensureWelcomeMessage();
      describeMode();
      renderTranscript();
      renderQuickPrompts();
      setRequestStatus(unavailableStatusMessage(mode), "error");
    } finally {
      retrying = false;
      if (dom.retry) dom.retry.disabled = false;
      setServiceAvailability();
      const focusWasNotMoved = document.activeElement === focusAtStart
        || document.activeElement === document.body;
      if (focusWasNotMoved && mode.kind === "ai") dom.message.focus();
      else if (
        focusWasNotMoved
        && dom.retry
        && !dom.retry.hidden
        && !dom.page?.classList.contains("hidden")
      ) dom.retry.focus();
    }
  }

  async function requestTutorReply(message, subject, stage, expectedIdentity) {
    const controller = new AbortController();
    const request = { controller, reason: "", timer: 0 };
    activeRequest = request;
    setBusy(true);
    request.timer = window.setTimeout(() => {
      request.reason = "timeout";
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    setRequestStatus("Sprout Tutor is thinking…", "busy");

    try {
      const accessToken = await getTutorAccessToken();
      if (activeRequest !== request || controller.signal.aborted) return;
      if (!accessToken) {
        throw new TutorRequestError("A parent needs to sign in again before Sprout Tutor can answer.", 401);
      }
      const response = await window.fetch(endpointForSession(sessionId), {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          [EXPECTED_OWNER_HEADER]: expectedIdentity.ownerId,
          [EXPECTED_CHILD_HEADER]: expectedIdentity.childId
        },
        body: JSON.stringify({ message, subject, stage }),
        signal: controller.signal,
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "strict-origin-when-cross-origin"
      });

      const payload = await readJsonPayload(response);
      if (!response.ok) {
        throw new TutorRequestError(readErrorMessage(payload, response.status), response.status);
      }

      if (!payload || typeof payload.reply !== "string" || !payload.reply.trim()) {
        throw new TutorRequestError("The tutor sent an empty answer. Please try again.", 502);
      }

      if (activeRequest !== request) return;
      if (!await revalidateFamilyContext()) return;
      if (activeRequest !== request) return;
      if (controller.signal.aborted) {
        const aborted = new Error("The tutor request was interrupted.");
        aborted.name = "AbortError";
        throw aborted;
      }
      const reply = payload.reply.trim().slice(0, MAX_REPLY_LENGTH);
      clearQuestionRetry();
      addTranscriptEntry({ role: "tutor", source: "ai", text: reply, subject, stage });
      setRequestStatus("Answer ready.");
    } catch (error) {
      if (activeRequest !== request) return;

      if (request.reason === "timeout") {
        const timedOutSessionId = rotateTutorSession();
        void clearRemoteConversation(timedOutSessionId, mode.origin);
        offerQuestionRetry(message, subject, stage);
        setRequestStatus("Sprout Tutor took too long to answer. Your question is still in the chat; choose Try question again when you are ready.", "error");
      } else if (request.reason === "stopped" || error?.name === "AbortError") {
        setRequestStatus("Stopped. You can change your question or ask again when you are ready.");
      } else if (error instanceof TutorRequestError && (error.status === 401 || error.status === 403)) {
        closeConversationForIdentityChange(
          error.status === 401 ? "signed-out" : "approval-needed",
          mode.origin,
          mode.remote
        );
      } else {
        const messageText = error instanceof TutorRequestError
          ? error.message
          : "Sprout Tutor could not connect just now. Check your connection and try again.";
        if (
          !(error instanceof TutorRequestError)
          || error.status === 409
          || error.status === 429
          || error.status >= 500
          || !error.status
        ) {
          offerQuestionRetry(message, subject, stage);
        }
        setRequestStatus(messageText, "error");
      }
    } finally {
      window.clearTimeout(request.timer);
      if (activeRequest === request) {
        const activeElement = document.activeElement;
        activeRequest = null;
        setBusy(false);
        const focusWasInComposer = activeElement === dom.message
          || activeElement === dom.send
          || activeElement === dom.stop
          || activeElement === dom.retryQuestion
          || activeElement === document.body;
        if (focusWasInComposer) {
          if (mode.kind === "ai" && !dom.message.disabled) dom.message.focus();
          else if (dom.retry && !dom.retry.hidden) dom.retry.focus();
        }
      }
    }
  }

  function offerQuestionRetry(message, subject, stage) {
    lastFailedRequest = { message, subject, stage };
    if (dom.retryQuestion) dom.retryQuestion.hidden = false;
  }

  function clearQuestionRetry() {
    lastFailedRequest = null;
    if (dom.retryQuestion) dom.retryQuestion.hidden = true;
  }

  async function retryLastQuestion() {
    if (busy || retrying || actionPending || mode?.kind !== "ai" || !lastFailedRequest) return;
    const retryRequest = { ...lastFailedRequest };
    actionPending = true;
    const validationVersion = conversationVersion;
    setBusy(true);
    let requestStarted = false;
    try {
      if (!await currentStorageScopeMatches()) {
        closeConversationForIdentityChange();
        return;
      }
      if (conversationVersion !== validationVersion || mode.kind !== "ai") return;
      const expectedIdentity = parseStorageIdentity(storageIdentity);
      if (!expectedIdentity) {
        closeConversationForIdentityChange();
        return;
      }
      clearQuestionRetry();
      conversationVersion += 1;
      requestStarted = true;
      await requestTutorReply(
        retryRequest.message,
        retryRequest.subject,
        retryRequest.stage,
        expectedIdentity
      );
    } finally {
      actionPending = false;
      if (!requestStarted && !activeRequest) setBusy(false);
    }
  }

  async function readJsonPayload(response) {
    try {
      return await response.json();
    } catch (error) {
      if (!response.ok) return null;
      throw new TutorRequestError("The tutor sent a response this page could not read. Please try again.", 502);
    }
  }

  function readErrorMessage(payload, status) {
    if (payload && typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim().slice(0, 240);
    }
    if (status === 429) return "The tutor is helping lots of learners. Wait a moment, then try again.";
    if (status >= 500) return "The tutor is having a short break. Please try again in a moment.";
    return "Sprout Tutor could not answer that question. Please check it and try again.";
  }

  function endpointForSession(id) {
    const path = `/agents/sprout-tutor-agent/${encodeURIComponent(id)}`;
    return new URL(path, `${mode.origin}/`).href;
  }

  async function getTutorAccessToken() {
    if (typeof window.KiddoSproutSession?.getAccessToken !== "function") return "";
    try {
      const value = await window.KiddoSproutSession.getAccessToken();
      if (typeof value !== "string") return "";
      const accessToken = value.trim();
      return accessToken
        && accessToken.length <= MAX_ACCESS_TOKEN_LENGTH
        && !/\s/.test(accessToken)
        ? accessToken
        : "";
    } catch (error) {
      throw new TutorRequestError("The parent account service could not be checked just now.", 503);
    }
  }

  function rotateTutorSession() {
    const previousSessionId = sessionId;
    sessionId = createUuidV4();
    if (!sessionKey || !isUuidV4(sessionId)) return previousSessionId;
    try {
      window.sessionStorage.setItem(sessionKey, sessionId);
    } catch (error) {
      // A fresh in-memory session is enough when storage is unavailable.
    }
    return previousSessionId;
  }

  function stopActiveRequest() {
    if (!activeRequest) return;
    const request = activeRequest;
    const oldMode = mode;
    const oldSessionId = rotateTutorSession();
    conversationVersion += 1;
    const stopVersion = conversationVersion;

    request.reason = "stopped";
    activeRequest = null;
    window.clearTimeout(request.timer);
    request.controller.abort();
    setBusy(false);
    setRequestStatus("Stopped. Your chat stays on this page. A fresh tutor session is ready, and KiddoSprout is clearing the previous remote conversation.", "busy");
    const clearStatusVersion = statusVersion;
    dom.message.focus();

    if (oldMode.kind === "ai") {
      void clearRemoteConversation(oldSessionId, oldMode.origin).then((result) => {
        if (conversationVersion !== stopVersion || busy || statusVersion !== clearStatusVersion) return;
        if (result === "cleared") {
          setRequestStatus("Stopped. Your chat stays on this page, and the previous remote conversation was cleared.");
        } else if (result === "signed-out") {
          setRequestStatus("Stopped and switched to a fresh tutor session. KiddoSprout could not request remote clearing because the parent sign-in is unavailable.", "error");
        } else {
          setRequestStatus("Stopped and switched to a fresh tutor session. The previous remote conversation could not be cleared just now.", "error");
        }
      });
    }
  }

  function resetConversation() {
    const oldSessionId = sessionId;
    const oldMode = mode;
    conversationVersion += 1;

    if (activeRequest) {
      const request = activeRequest;
      request.reason = "reset";
      activeRequest = null;
      window.clearTimeout(request.timer);
      request.controller.abort();
    }

    setBusy(false);
    clearQuestionRetry();
    transcript = [];
    clearScopedTranscripts();

    rotateTutorSession();

    ensureWelcomeMessage();
    renderTranscript();
    dom.message.value = "";
    dom.message.removeAttribute("aria-invalid");
    updateCharacterCount();
    setRequestStatus(
      oldMode.kind === "ai"
        ? "New chat started. The conversation shown on this page was cleared."
        : unavailableStatusMessage(oldMode),
      oldMode.kind === "ai" ? "" : "error"
    );
    const clearStatusVersion = statusVersion;
    if (!dom.message.disabled) dom.message.focus();

    if (oldMode.kind === "ai") {
      const resetVersion = conversationVersion;
      void clearRemoteConversation(oldSessionId, oldMode.origin).then((result) => {
        if (conversationVersion !== resetVersion || busy || statusVersion !== clearStatusVersion) return;
        if (result === "cleared") {
          setRequestStatus("New chat started. The browser and previous remote conversation were cleared.");
        } else if (result === "signed-out") {
          setRequestStatus("New chat started and the browser copy was cleared. Remote clearing needs the parent to sign in again.", "error");
        } else {
          setRequestStatus("New chat started and the browser copy was cleared. The previous remote conversation could not be cleared just now.", "error");
        }
      });
    }
  }

  async function clearRemoteConversation(id, origin) {
    let accessToken;
    try {
      accessToken = await getTutorAccessToken();
      if (!accessToken) return "signed-out";
    } catch (error) {
      return "unavailable";
    }

    const path = `/agents/sprout-tutor-agent/${encodeURIComponent(id)}`;
    let endpoint;
    try {
      endpoint = new URL(path, `${origin}/`).href;
    } catch (error) {
      return "unavailable";
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), DELETE_TIMEOUT_MS);
      try {
        const response = await window.fetch(endpoint, {
          method: "DELETE",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          signal: controller.signal,
          credentials: "omit",
          redirect: "error",
          referrerPolicy: "strict-origin-when-cross-origin"
        });
        if (response.ok) return "cleared";
        if (response.status === 401 || response.status === 403) return "signed-out";
        if (response.status < 500 && response.status !== 408 && response.status !== 429) {
          return "unavailable";
        }
      } catch (error) {
        // A single network failure or timeout gets one bounded retry below.
      } finally {
        window.clearTimeout(timer);
      }
    }

    // The UI already rotated to a fresh random session. If both deletion
    // attempts fail, the inaccessible old session still expires server-side.
    return "unavailable";
  }

  function setBusy(value) {
    const activeElement = document.activeElement;
    busy = Boolean(value);
    dom.chatLog.setAttribute("aria-busy", String(busy));
    dom.form.setAttribute("aria-busy", String(busy));
    dom.subject.disabled = busy;
    dom.stageInputs.forEach((input) => {
      input.disabled = busy;
    });
    dom.stop.hidden = !busy || !activeRequest || mode.kind !== "ai";
    setServiceAvailability();
    if (busy && activeElement === dom.send && !dom.stop.hidden) dom.stop.focus();
  }

  function setServiceAvailability() {
    const canAsk = mode?.kind === "ai" && !retrying;
    dom.form.setAttribute("aria-disabled", String(!canAsk));
    dom.message.disabled = !canAsk;
    dom.message.readOnly = busy;
    dom.message.setAttribute("aria-readonly", String(busy));
    dom.send.disabled = busy || !canAsk;
    if (dom.retry) dom.retry.disabled = retrying || busy;
    if (dom.retryQuestion) {
      dom.retryQuestion.hidden = !lastFailedRequest;
      dom.retryQuestion.disabled = busy || retrying || !canAsk;
    }
    if (!canAsk) {
      dom.message.placeholder = retrying
        ? "Checking the secure AI service…"
        : "The AI tutor must be connected before you can ask a question.";
    } else {
      updateMessagePlaceholder();
    }
    dom.promptList.querySelectorAll("button").forEach((button) => {
      button.disabled = busy || !canAsk;
    });
  }

  function setRequestStatus(message, tone) {
    statusVersion += 1;
    dom.requestStatus.textContent = message;
    dom.requestStatus.classList.toggle("is-busy", tone === "busy");
    dom.requestStatus.classList.toggle("is-error", tone === "error");
  }

  class TutorRequestError extends Error {
    constructor(message, status = 0) {
      super(message);
      this.name = "TutorRequestError";
      this.status = Number.isFinite(Number(status)) ? Number(status) : 0;
    }
  }
}());
