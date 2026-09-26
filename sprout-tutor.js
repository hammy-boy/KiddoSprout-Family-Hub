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

  const COACH_GUIDES = Object.freeze({
    maths: "Try this plan: name what you know, circle what you need to find, choose one operation, then estimate before you calculate.",
    english: "Try this plan: read the words aloud, find the key word or sentence, say your idea simply, then add one detail as evidence.",
    science: "Try this plan: say what you notice, make a prediction, explain what could cause it, then think of a safe way to check.",
    languages: "Try this plan: choose one short phrase, listen or read it carefully, say it slowly, then use it in a tiny conversation.",
    computing: "Try this plan: say the goal, split it into small instructions, predict what each step will do, then check one step at a time."
  });

  const COACH_PRACTICE = Object.freeze({
    maths: Object.freeze({
      sprouts: "Practice challenge: You have 8 counters and add 5 more. Draw or group them. What is the total, and how can you check?",
      growers: "Practice challenge: A garden has 6 rows with 7 plants in each row. What information matters, which operation fits, and how can you check?",
      explorers: "Practice challenge: Three quarters of 28 seeds sprout. Work out how many sprout, then explain two different ways to see it."
    }),
    english: Object.freeze({
      sprouts: "Practice challenge: Improve this sentence with one describing word: ‘The fox ran.’ Read your new sentence aloud.",
      growers: "Practice challenge: Write two sentences about a storm. Use a strong verb in one and a simile in the other.",
      explorers: "Practice challenge: Write a claim about a story character, then support it with one detail and explain why that detail matters."
    }),
    science: Object.freeze({
      sprouts: "Practice challenge: An ice cube is left on a plate. What do you predict will happen, and what could you observe safely?",
      growers: "Practice challenge: Two identical plants get different amounts of light. Make a prediction and name what should stay the same for a fair test.",
      explorers: "Practice challenge: Explain how energy changes when a ball rolls down a ramp, then suggest one variable you could test safely."
    }),
    languages: Object.freeze({
      sprouts: "Practice challenge: Choose a language and learn hello, please, and thank you. Say each word slowly three times with a trusted source.",
      growers: "Practice challenge: Build a two-line greeting: say hello and introduce a pretend character, then ask the other character’s name. Check pronunciation with a trusted source.",
      explorers: "Practice challenge: Write a four-line café conversation in the language you are learning, then mark the words you still need to check."
    }),
    computing: Object.freeze({
      sprouts: "Practice challenge: Give a robot exact steps for moving from a door to a chair. What could go wrong if one step is missing?",
      growers: "Practice challenge: Plan a loop that claps four times. Which instruction repeats, and what tells the loop to stop?",
      explorers: "Practice challenge: A score should increase by 2, but it stays the same. List three places you would inspect and explain your first test."
    })
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
  const settingsKey = `${STORAGE_PREFIX}.settings`;
  const sessionKey = `${STORAGE_PREFIX}.session`;
  let transcript = [];

  applySavedTheme();

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
    mode = await resolveTutorMode();
    sessionId = readOrCreateSessionId();
    transcriptKey = `${STORAGE_PREFIX}.transcript.${mode.kind}`;
    transcript = loadTranscript();

    applySavedSettings();
    describeMode();
    ensureWelcomeMessage();
    renderTranscript();
    renderQuickPrompts();
    updateCharacterCount();
    setRequestStatus("");

    dom.subject.addEventListener("change", () => {
      saveSettings();
      renderQuickPrompts();
      updateMessagePlaceholder();
    });

    dom.stageInputs.forEach((input) => {
      input.addEventListener("change", () => {
        updateStageHelp();
        saveSettings();
      });
    });

    dom.message.addEventListener("input", () => {
      if (dom.message.value.length > MAX_MESSAGE_LENGTH) {
        dom.message.value = dom.message.value.slice(0, MAX_MESSAGE_LENGTH);
      }
      dom.message.removeAttribute("aria-invalid");
      updateCharacterCount();
    });

    dom.message.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      if (!busy) dom.form.requestSubmit();
    });

    dom.form.addEventListener("submit", handleSubmit);
    dom.stop.addEventListener("click", stopActiveRequest);
    dom.reset.addEventListener("click", resetConversation);

    window.addEventListener("pageshow", applySavedTheme);
    window.addEventListener("storage", (event) => {
      if (event.key === "kiddosproutPreferences") applySavedTheme();
    });
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
    const candidate = resolveTutorCandidate();
    if (!candidate) return { kind: "coach", origin: null, remote: false };

    const health = await verifyTutorHealth(candidate.origin);
    if (!health) return { kind: "coach", origin: null, remote: false };

    return {
      kind: "ai",
      origin: candidate.origin,
      remote: candidate.origin !== window.location.origin,
      retentionHours: health.retentionHours
    };
  }

  function resolveTutorCandidate() {
    if (window.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true) return null;

    const hostname = window.location.hostname.toLowerCase();
    const configuredOrigin = validateConfiguredOrigin(window.KIDDO_SPROUT_TUTOR_ORIGIN);
    if (configuredOrigin) {
      return { origin: configuredOrigin };
    }

    if (window.location.protocol === "https:" && !isGitHubPagesHost(hostname)) {
      return { origin: window.location.origin };
    }

    return null;
  }

  function isGitHubPagesHost(hostname) {
    return hostname === "github.io" || hostname.endsWith(".github.io");
  }

  async function verifyTutorHealth(origin) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const response = await window.fetch(new URL(HEALTH_PATH, `${origin}/`).href, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: controller.signal,
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "strict-origin-when-cross-origin"
      });
      if (!response.ok) return null;
      const contentType = String(response.headers.get("Content-Type") || "").toLowerCase();
      if (!contentType.includes("application/json")) return null;
      const payload = await response.json();
      if (!payload || payload.status !== "ready" || payload.authentication !== "parent-account") return null;
      const retentionHours = Number(payload.retentionHours);
      return {
        retentionHours: Number.isFinite(retentionHours) && retentionHours > 0 && retentionHours <= 168
          ? retentionHours
          : 24
      };
    } catch (error) {
      return null;
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
    dom.modeBanner.classList.remove("is-loading", "is-ai", "is-coach");

    if (mode.kind === "ai") {
      dom.modeBanner.classList.add("is-ai");
      dom.modeTitle.textContent = "AI tutor ready";
      dom.modeDescription.textContent = mode.remote
        ? "Questions are sent to the trusted KiddoSprout tutor service."
        : "Questions are sent to the KiddoSprout tutor on this site.";
      dom.chatKicker.textContent = "AI learning helper";
      dom.chatTitle.textContent = "Sprout Tutor";
      dom.pageTitle.textContent = "Meet Sprout Tutor";
      if (dom.privacyStorage) {
        const retention = mode.retentionHours === 1 ? "one hour" : `up to ${mode.retentionHours} hours`;
        dom.privacyStorage.textContent = `This page keeps a short, limited copy of the chat in this browser tab. The tutor service keeps up to six recent question-and-answer pairs under a random session for ${retention}. New chat clears the browser copy and asks the service to clear its copy. Stop keeps the chat shown here but starts a fresh remote conversation.`;
      }
      return;
    }

    dom.modeBanner.classList.add("is-coach");
    dom.modeTitle.textContent = "Built-in Practice Coach · not AI";
    dom.modeDescription.textContent = "This page uses fixed guided steps. Your question is not sent to an AI tutor service.";
    dom.chatKicker.textContent = "Built-in guide · not AI";
    dom.chatTitle.textContent = "Practice Coach";
    dom.pageTitle.textContent = "Meet the Practice Coach";
    if (dom.privacyStorage) {
      dom.privacyStorage.textContent = "This page keeps only a short, limited copy of the chat in this browser tab. It is not sent to an AI tutor service. New chat clears this browser copy.";
    }
  }

  function readOrCreateSessionId() {
    let saved = "";
    try {
      saved = window.sessionStorage.getItem(sessionKey) || "";
    } catch (error) {
      saved = "";
    }

    if (isUuidV4(saved)) return saved.toLowerCase();
    const created = createUuidV4();
    try {
      window.sessionStorage.setItem(sessionKey, created);
    } catch (error) {
      // The conversation still works when storage is unavailable.
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

    // Supported browsers provide Web Crypto. This shape keeps the UI usable in
    // older embedded views, while the Worker still validates every session ID.
    const fallback = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return fallback.replace(/[xy]/g, (token) => {
      const value = Math.floor(Math.random() * 16);
      return (token === "x" ? value : (value & 3) | 8).toString(16);
    });
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
    try {
      settings = readStoredObject(window.sessionStorage, settingsKey);
    } catch (error) {
      settings = null;
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
      button.disabled = busy;
      button.addEventListener("click", () => {
        if (busy) return;
        dom.message.value = prompt.slice(0, MAX_MESSAGE_LENGTH);
        dom.message.removeAttribute("aria-invalid");
        updateCharacterCount();
        dom.message.focus();
      });
      dom.promptList.append(button);
    });
  }

  function loadTranscript() {
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

    const entryLimit = entry.role === "user" ? MAX_MESSAGE_LENGTH : MAX_REPLY_LENGTH;
    const text = entry.text.trim().slice(0, entryLimit);
    if (!text) return null;

    const source = entry.role === "user"
      ? "user"
      : (entry.source === "coach" ? "coach" : "ai");
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
          source: "coach",
          text: "Hi! I’m the built-in Practice Coach. I use fixed learning steps, not AI. Pick a subject and I’ll help you plan your next step."
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
    try {
      window.sessionStorage.setItem(transcriptKey, encoded);
    } catch (error) {
      // Keep the bounded in-memory transcript when storage is unavailable.
    }
  }

  function renderTranscript() {
    dom.chatLog.replaceChildren();
    transcript.forEach(appendMessageElement);
    scrollConversation(false);
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
    if (entry.source === "coach") item.classList.add("is-coach");
    meta.className = "message-meta-label";
    body.className = "message-body";

    if (entry.role === "user") {
      const details = [];
      if (entry.subject) details.push(SUBJECTS[entry.subject]);
      if (entry.stage) details.push(STAGES[entry.stage].label);
      meta.textContent = details.length ? `You · ${details.join(" · ")}` : "You";
    } else {
      meta.textContent = entry.source === "coach" ? "Built-in Practice Coach · not AI" : "Sprout Tutor";
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
    if (busy) return;

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

    const subject = selectedSubject();
    const stage = selectedStage();
    addTranscriptEntry({ role: "user", source: "user", text: message, subject, stage });
    dom.message.value = "";
    updateCharacterCount();
    setBusy(true);

    if (mode.kind === "coach") {
      const turnVersion = conversationVersion;
      setRequestStatus("The built-in Practice Coach is choosing a fixed guide…", "busy");
      await waitForCoachTurn();
      if (turnVersion !== conversationVersion) return;
      const reply = createPracticeCoachReply(message, subject, stage);
      addTranscriptEntry({ role: "tutor", source: "coach", text: reply, subject, stage });
      setBusy(false);
      setRequestStatus("Practice step ready. This response came from the built-in guide, not AI.");
      dom.message.focus();
      return;
    }

    await requestTutorReply(message, subject, stage);
  }

  function containsPrivateDetails(message) {
    const text = message.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'");
    const original = message.normalize("NFKC").replace(/[’‘]/g, "'");
    return [
      /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i,
      /(?:^|\D)(?:\+?\d[\d ().-]{7,}\d)(?:\D|$)/,
      /\b(?:my (?:real |full )?name is|i am called|me llamo|mi nombre es|je m'appelle|mon nom est|ich hei(?:ß|ss)e|mein name ist|eu me chamo|meu nome (?:é|e)|mi chiamo|il mio nome (?:è|e))(?=\s|$|[,:;.!?])/,
      /\b(?:my (?:home )?address is|i live (?:at|on)|vivo en|mi dirección es|j'habite|mon adresse est|ich wohne|meine adresse ist|eu moro|meu endereço (?:é|e)|abito|il mio indirizzo (?:è|e))(?=\s|$|[,:;.!?])/,
      /\b(?:my school (?:is|is called|address is)|i (?:go|study) (?:to|at)|i attend|mi (?:escuela|colegio) (?:es|se llama)|voy (?:a|al)|mon école (?:est|s'appelle)|je vais à|meine schule (?:ist|heißt)|ich gehe (?:in|zur)|minha escola (?:é|se chama)|eu estudo (?:na|no)|la mia scuola (?:è|si chiama)|vado (?:a|alla))\b/,
      /\bmy (?:school|phone|mobile|email|e-mail|password|pin|username|login)(?: number| address)? is\b/,
      /\b(?:g(?:ir)?\d{1,2}|[a-pr-uwyz][a-hk-y]?\d{1,2}) ?\d[a-z]{2}\b/i
    ].some((pattern) => pattern.test(text)) || /\bI(?:'m| am)\s+[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,3}\b/u.test(original);
  }

  function waitForCoachTurn() {
    return new Promise((resolve) => window.setTimeout(resolve, 180));
  }

  function createPracticeCoachReply(message, subject, stage) {
    const subjectLabel = SUBJECTS[subject];
    const stageLabel = STAGES[stage].label;
    const asksForPractice = /\b(practi[cs]e|quiz|question|challenge|test me|try)\b/i.test(message);
    const asksToCheck = /\b(check|correct|right|answer)\b/i.test(message);
    const parts = [
      `Let’s take a ${stageLabel.toLowerCase()}-level ${subjectLabel.toLowerCase()} step.`,
      COACH_GUIDES[subject]
    ];

    if (asksForPractice) {
      parts.push(COACH_PRACTICE[subject][stage]);
    } else if (asksToCheck) {
      parts.push("Check it in three ways: repeat the question in your own words, test each step, and ask whether the result is sensible. A trusted adult or reliable source can confirm the final answer.");
    } else {
      parts.push(stage === "sprouts"
        ? "Start with just the first small step. Say or write what you already know."
        : stage === "growers"
          ? "Start by explaining which clue seems most useful and why."
          : "Start by making a claim, then look for evidence or a second method that could challenge it.");
    }

    parts.push("When you have tried that step, tell me which part you want to practise next.");
    return parts.join("\n\n");
  }

  async function requestTutorReply(message, subject, stage) {
    const controller = new AbortController();
    const request = { controller, reason: "", timer: 0 };
    activeRequest = request;
    request.timer = window.setTimeout(() => {
      request.reason = "timeout";
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    setRequestStatus("Sprout Tutor is thinking…", "busy");

    try {
      const accessToken = await getTutorAccessToken();
      if (activeRequest !== request || controller.signal.aborted) return;
      if (!accessToken) {
        throw new TutorRequestError("A parent needs to sign in again before Sprout Tutor can answer.");
      }
      const response = await window.fetch(endpointForSession(sessionId), {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message, subject, stage }),
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "strict-origin-when-cross-origin"
      });

      const payload = await readJsonPayload(response);
      if (!response.ok) {
        throw new TutorRequestError(readErrorMessage(payload, response.status));
      }

      if (!payload || typeof payload.reply !== "string" || !payload.reply.trim()) {
        throw new TutorRequestError("The tutor sent an empty answer. Please try again.");
      }

      if (activeRequest !== request) return;
      const reply = payload.reply.trim().slice(0, MAX_REPLY_LENGTH);
      addTranscriptEntry({ role: "tutor", source: "ai", text: reply, subject, stage });
      setRequestStatus("Answer ready.");
    } catch (error) {
      if (activeRequest !== request) return;

      if (request.reason === "timeout") {
        setRequestStatus("Sprout Tutor took too long to answer. Your question is still here in the chat, so you can try again.", "error");
      } else if (request.reason === "stopped" || error?.name === "AbortError") {
        setRequestStatus("Stopped. You can change your question or ask again when you are ready.");
      } else {
        const messageText = error instanceof TutorRequestError
          ? error.message
          : "Sprout Tutor could not connect just now. Check your connection and try again.";
        setRequestStatus(messageText, "error");
      }
    } finally {
      window.clearTimeout(request.timer);
      if (activeRequest === request) {
        activeRequest = null;
        setBusy(false);
        dom.message.focus();
      }
    }
  }

  async function readJsonPayload(response) {
    try {
      return await response.json();
    } catch (error) {
      if (!response.ok) return null;
      throw new TutorRequestError("The tutor sent a response this page could not read. Please try again.");
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
      return "";
    }
  }

  function rotateTutorSession() {
    const previousSessionId = sessionId;
    sessionId = createUuidV4();
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
    dom.message.focus();

    if (oldMode.kind === "ai") {
      void clearRemoteConversation(oldSessionId, oldMode.origin).then((result) => {
        if (conversationVersion !== stopVersion || busy) return;
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
    transcript = [];
    try {
      window.sessionStorage.removeItem(transcriptKey);
    } catch (error) {
      // In-memory reset still succeeds.
    }

    rotateTutorSession();

    ensureWelcomeMessage();
    renderTranscript();
    dom.message.value = "";
    dom.message.removeAttribute("aria-invalid");
    updateCharacterCount();
    setRequestStatus("New chat started. The conversation shown on this page was cleared.");
    dom.message.focus();

    if (oldMode.kind === "ai") {
      const resetVersion = conversationVersion;
      void clearRemoteConversation(oldSessionId, oldMode.origin).then((result) => {
        if (conversationVersion !== resetVersion || busy) return;
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
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), DELETE_TIMEOUT_MS);
    try {
      const accessToken = await getTutorAccessToken();
      if (!accessToken) return "signed-out";
      const path = `/agents/sprout-tutor-agent/${encodeURIComponent(id)}`;
      const response = await window.fetch(new URL(path, `${origin}/`).href, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "strict-origin-when-cross-origin"
      });
      return response.ok ? "cleared" : "unavailable";
    } catch (error) {
      // The UI has already rotated to a fresh random session, so an unavailable
      // old session cannot affect the new conversation.
      return "unavailable";
    } finally {
      window.clearTimeout(timer);
    }
  }

  function setBusy(value) {
    busy = Boolean(value);
    dom.chatLog.setAttribute("aria-busy", String(busy));
    dom.form.setAttribute("aria-busy", String(busy));
    dom.subject.disabled = busy;
    dom.stageInputs.forEach((input) => {
      input.disabled = busy;
    });
    dom.message.disabled = busy;
    dom.send.disabled = busy;
    dom.stop.hidden = !busy || mode.kind !== "ai";
    dom.promptList.querySelectorAll("button").forEach((button) => {
      button.disabled = busy;
    });
  }

  function setRequestStatus(message, tone) {
    dom.requestStatus.textContent = message;
    dom.requestStatus.classList.toggle("is-busy", tone === "busy");
    dom.requestStatus.classList.toggle("is-error", tone === "error");
  }

  class TutorRequestError extends Error {
    constructor(message) {
      super(message);
      this.name = "TutorRequestError";
    }
  }
}());
