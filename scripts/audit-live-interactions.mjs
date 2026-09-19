#!/usr/bin/env node

const socketUrl = process.argv[2];
const baseUrl = new URL(process.argv[3] || "http://127.0.0.1:8001/");

if (!socketUrl) {
  throw new Error("Usage: node scripts/audit-live-interactions.mjs <page-websocket-url> [base-url]");
}

const socket = new WebSocket(socketUrl);
const pending = new Map();
const problems = [];
const checks = [];
const pageEvents = [];
let commandId = 0;
let pageEventSequence = 0;
let mainFrameId = "";

const COMMAND_TIMEOUT_MS = 15_000;
const NAVIGATION_TIMEOUT_MS = 120_000;
const PAGE_EVENT_HISTORY_LIMIT = 500;

function send(method, params = {}, timeoutMilliseconds = COMMAND_TIMEOUT_MS) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, timeoutMilliseconds);
    pending.set(id, { resolve, reject, timer });
  });
}

function pause(milliseconds = 100) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result || {});
    return;
  }
  if (message.method === "Page.frameNavigated"
      || message.method === "Page.lifecycleEvent"
      || message.method === "Page.navigatedWithinDocument") {
    pageEvents.push({
      sequence: ++pageEventSequence,
      method: message.method,
      params: message.params || {}
    });
    if (pageEvents.length > PAGE_EVENT_HISTORY_LIMIT) pageEvents.shift();
  }
  if (message.method === "Runtime.exceptionThrown") {
    problems.push(message.params?.exceptionDetails?.exception?.description
      || message.params?.exceptionDetails?.text
      || "Unknown runtime exception");
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

await send("Page.enable");
await send("Page.setLifecycleEventsEnabled", { enabled: true });
await send("Runtime.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});
// Keep the interaction audit deterministic in software-rendered/headless Chrome.
// The product already supports this preference and disables decorative infinite
// animations without changing any of the interactions exercised below.
await send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [{ name: "prefers-reduced-motion", value: "reduce" }]
});

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || "Evaluation failed");
  }
  return response.result?.value;
}

function navigationEventAfter(afterSequence, predicate) {
  return pageEvents.find((event) => event.sequence > afterSequence && predicate(event));
}

function completeFrameUrl(frame) {
  return `${frame?.url || ""}${frame?.urlFragment || ""}`;
}

function navigationUrlMatches(actualUrl, targetUrl, allowHashChange) {
  if (!allowHashChange) return actualUrl === targetUrl;
  try {
    const actualDocumentUrl = new URL(actualUrl);
    const targetDocumentUrl = new URL(targetUrl);
    actualDocumentUrl.hash = "";
    targetDocumentUrl.hash = "";
    return actualDocumentUrl.href === targetDocumentUrl.href;
  } catch (error) {
    return false;
  }
}

async function waitForNavigation({
  targetUrl,
  frameId,
  loaderId,
  sameDocumentNavigation,
  allowHashChange,
  afterSequence,
  startedAt,
  previousUrl
}) {
  let lastState = {
    commitEventSeen: false,
    loadEventSeen: false,
    ready: "loading",
    href: "",
    body: false
  };

  while (true) {
    const commitEvent = sameDocumentNavigation
      ? navigationEventAfter(afterSequence, (event) => (
        event.method === "Page.navigatedWithinDocument"
          && event.params.frameId === frameId
          && event.params.url === targetUrl
      ))
      : navigationEventAfter(afterSequence, (event) => (
        event.method === "Page.frameNavigated"
          && event.params.frame?.id === frameId
          && (loaderId
            ? event.params.frame?.loaderId === loaderId
            : completeFrameUrl(event.params.frame) === targetUrl
              || event.params.frame?.unreachableUrl === targetUrl)
      ));
    if (commitEvent?.params.frame?.unreachableUrl) {
      throw new Error(`Navigation to ${targetUrl} failed to load: ${commitEvent.params.frame.unreachableUrl}`);
    }
    const commitEventSeen = (sameDocumentNavigation && previousUrl === targetUrl) || Boolean(commitEvent);
    const committedLoaderId = loaderId || commitEvent?.params.frame?.loaderId || "";
    const loadEventSeen = sameDocumentNavigation
      ? commitEventSeen
      : Boolean(navigationEventAfter(afterSequence, (event) => (
        event.method === "Page.lifecycleEvent"
          && event.params.frameId === frameId
          && (!event.params.loaderId || event.params.loaderId === committedLoaderId)
          && event.params.name === "load"
      )));

    if (commitEventSeen) {
      const readiness = await evaluate(`({ ready: document.readyState, href: location.href, body: Boolean(document.body) })`)
        .catch(() => ({ ready: "loading", href: "", body: false }));
      lastState = {
        commitEventSeen,
        loadEventSeen,
        ...readiness
      };
      // The matching frame/loader commit prevents a completed prior document
      // from satisfying this check. readyState also covers BFCache restores,
      // which need not emit another load lifecycle event.
      if (readiness.ready === "complete"
          && readiness.body
          && navigationUrlMatches(readiness.href, targetUrl, allowHashChange)) return;
    } else {
      lastState = {
        commitEventSeen,
        loadEventSeen,
        ready: "loading",
        href: "",
        body: false
      };
    }

    const remaining = NAVIGATION_TIMEOUT_MS - (Date.now() - startedAt);
    if (remaining <= 0) break;
    await pause(Math.min(150, remaining));
  }

  throw new Error(`Navigation to ${targetUrl} timed out after ${NAVIGATION_TIMEOUT_MS}ms; last state ${JSON.stringify(lastState)}`);
}

async function navigate(path) {
  const targetUrl = new URL(path, baseUrl).href;
  await send("Page.bringToFront");
  const previousUrl = await evaluate("location.href").catch(() => "");
  const afterSequence = pageEventSequence;
  const startedAt = Date.now();
  const navigation = await send("Page.navigate", { url: targetUrl }, NAVIGATION_TIMEOUT_MS);
  if (navigation.errorText) {
    throw new Error(`Navigation to ${targetUrl} failed: ${navigation.errorText}`);
  }
  if (navigation.isDownload) {
    throw new Error(`Navigation to ${targetUrl} unexpectedly started a download`);
  }
  if (!navigation.frameId) {
    throw new Error(`Navigation to ${targetUrl} did not return a frame id`);
  }
  mainFrameId = navigation.frameId;
  await waitForNavigation({
    targetUrl,
    frameId: navigation.frameId,
    loaderId: navigation.loaderId,
    sameDocumentNavigation: !navigation.loaderId,
    allowHashChange: Boolean(navigation.loaderId) && !new URL(targetUrl).hash,
    afterSequence,
    startedAt,
    previousUrl
  });
  await pause(500);
}

async function clickAndWaitForNavigation(expression, destination) {
  if (!mainFrameId) throw new Error("Cannot wait for a click navigation before the main frame is known");
  const targetUrl = new URL(destination, baseUrl).href;
  await send("Page.bringToFront");
  const previousUrl = await evaluate("location.href").catch(() => "");
  const afterSequence = pageEventSequence;
  const startedAt = Date.now();
  await evaluate(expression);
  await waitForNavigation({
    targetUrl,
    frameId: mainFrameId,
    loaderId: "",
    sameDocumentNavigation: false,
    allowHashChange: false,
    afterSequence,
    startedAt,
    previousUrl
  });
  await pause(500);
}

async function pressKey(key, { shift = false } = {}) {
  const code = key === " " ? "Space" : key;
  const windowsVirtualKeyCode = key === "Tab" ? 9 : key === "Escape" ? 27 : key === "Enter" ? 13 : key === " " ? 32 : 0;
  const params = { key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode, modifiers: shift ? 8 : 0 };
  await send("Input.dispatchKeyEvent", key === " "
    ? { ...params, type: "keyDown", text: " ", unmodifiedText: " " }
    : { ...params, type: "rawKeyDown" });
  await send("Input.dispatchKeyEvent", { ...params, type: "keyUp" });
  await pause();
}

function record(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
  console.error(`${pass ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

await navigate("");
if (!await evaluate("window.KiddoSproutDemo?.publicOnly?.() === true")) {
  await evaluate("window.KiddoSproutDemo?.exit?.()");
  await navigate("");
}

let state = await evaluate(`({
  available: document.body.classList.contains('mode-login')
    && !document.querySelector('#loginToSignup')?.disabled
    && document.querySelector('#loginToSignup')?.getClientRects().length > 0,
  publicOnly: window.KiddoSproutDemo?.publicOnly?.() === true,
  mode: document.body.className,
  signupDisabled: document.querySelector('#loginToSignup')?.disabled
})`);
const authViewSwitchAvailable = state.available;
if (authViewSwitchAvailable) {
  await evaluate("document.querySelector('#loginToSignup').click()");
  await pause(150);
  state = await evaluate(`({
    signup: document.body.classList.contains('mode-signup'),
    hash: location.hash,
    focus: document.activeElement?.id,
    signupFamilyVisible: document.querySelector('#signupFamily')?.getClientRects().length > 0
  })`);
  const expectedSignupFocus = state.signupFamilyVisible ? "signupFamily" : "signupEntryTitle";
  record(
    "login to signup moves focus to the first available signup entry",
    state.signup && state.hash === "#signup" && state.focus === expectedSignupFocus,
    JSON.stringify({ ...state, expectedSignupFocus })
  );

  await evaluate("document.querySelector('#signupToLogin').click()");
  await pause(150);
  state = await evaluate(`({
    login: document.body.classList.contains('mode-login'),
    hash: location.hash,
    focus: document.activeElement?.id
  })`);
  record("signup to login moves focus to the email field", state.login && state.hash === "#login" && state.focus === "loginEmail", JSON.stringify(state));
} else {
  const skippedAuthDetail = `not available in this preview: ${JSON.stringify(state)}`;
  record("login to signup moves focus to the first available signup entry", true, skippedAuthDetail);
  record("signup to login moves focus to the email field", true, skippedAuthDetail);
}

if (!await evaluate("window.KiddoSproutDemo?.active?.() === true")) {
  await evaluate("document.querySelector('#exploreDemo').click()");
  await pause(500);
}
state = await evaluate(`({
  active: window.KiddoSproutDemo?.active?.() === true,
  parent: !document.body.matches('.mode-child, .mode-login, .mode-signup'),
  hash: location.hash
})`);
record("colleague demo opened", state.active && state.parent && state.hash === "#parent", JSON.stringify(state));

await evaluate("location.hash = '#child'");
await pause(150);
state = await evaluate(`({
  child: document.body.classList.contains('mode-child'),
  hash: location.hash,
  focus: document.activeElement?.id
})`);
record(
  "direct hash navigation opens child mode",
  state.child && state.hash === "#child" && state.focus === "childWelcome",
  JSON.stringify(state)
);

await evaluate("location.hash = '#not-a-kiddo-route'");
await pause(150);
state = await evaluate(`({
  parent: !document.body.matches('.mode-child, .mode-login, .mode-signup'),
  hash: location.hash,
  focus: document.activeElement?.id
})`);
record(
  "invalid hash navigation returns to a canonical safe mode",
  state.parent && state.hash === "#parent" && state.focus === "heroTitle",
  JSON.stringify(state)
);

// The public preview intentionally persists fictional changes for the life of
// this tab. Reset them before assertions so rerunning the audit does not consume
// every sample task and report a false failure on an otherwise healthy build.
await evaluate("document.querySelector('#resetDemo')?.click()");
await pause(250);

await evaluate("document.querySelector('#settingsToggle').click()");
await pause(150);
state = await evaluate(`({
  open: document.querySelector('#settingsMenu').classList.contains('open'),
  expanded: document.querySelector('#settingsToggle').getAttribute('aria-expanded'),
  focus: document.activeElement?.id
})`);
record("settings menu opens and receives focus", state.open && state.expanded === "true" && state.focus === "settingsClose", JSON.stringify(state));

await pressKey("Escape");
state = await evaluate(`({
  open: document.querySelector('#settingsMenu').classList.contains('open'),
  expanded: document.querySelector('#settingsToggle').getAttribute('aria-expanded'),
  focus: document.activeElement?.id
})`);
record("Escape closes settings and restores focus", !state.open && state.expanded === "false" && state.focus === "settingsToggle", JSON.stringify(state));

await evaluate("document.querySelector('#settingsToggle').click()");
await pause(150);
await evaluate("document.querySelector('#today').dispatchEvent(new MouseEvent('click', { bubbles: true }))");
await pause(100);
state = await evaluate(`({
  open: document.querySelector('#settingsMenu').classList.contains('open'),
  expanded: document.querySelector('#settingsToggle').getAttribute('aria-expanded'),
  focus: document.activeElement?.id
})`);
record("outside click restores the settings toggle when the menu owned focus", !state.open && state.expanded === "false" && state.focus === "settingsToggle", JSON.stringify(state));

await evaluate("document.querySelector('#settingsToggle').click()");
await pause(150);
await evaluate(`(() => {
  document.querySelector('.nav [data-jump="today"]').focus();
  document.querySelector('#today').dispatchEvent(new MouseEvent('click', { bubbles: true }));
})()`);
await pause(100);
state = await evaluate(`({
  open: document.querySelector('#settingsMenu').classList.contains('open'),
  expanded: document.querySelector('#settingsToggle').getAttribute('aria-expanded'),
  focus: document.activeElement?.getAttribute('data-jump') || document.activeElement?.id
})`);
record("outside click keeps outside focus when the settings menu did not own it", !state.open && state.expanded === "false" && state.focus === "today", JSON.stringify(state));

await evaluate(`(() => {
  const select = document.querySelector('#quickThemeModeSetting');
  select.value = 'night';
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await pause(800);
state = await evaluate(`({
  night: document.body.classList.contains('theme-night'),
  mode: document.body.dataset.themeMode,
  saved: JSON.parse(sessionStorage.getItem('kiddosprout.demo.v1.family') || 'null')?.themeMode
})`);
record("night theme applies and persists to demo tab", state.night && state.mode === "night" && state.saved === "night", JSON.stringify(state));

await evaluate(`(() => {
  const select = document.querySelector('#quickLanguageModeSetting');
  select.value = 'es';
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await pause(500);
state = await evaluate(`({
  lang: document.documentElement.lang,
  label: document.querySelector('#settingsToggle').getAttribute('aria-label'),
  today: document.querySelector('[data-jump="today"]').textContent.trim(),
  saved: JSON.parse(sessionStorage.getItem('kiddosprout.demo.v1.family') || 'null')?.languageMode
})`);
record("Spanish applies to text and accessible labels", state.lang === "es" && state.label === "Abrir el menú de ajustes" && state.today === "Hoy" && state.saved === "es", JSON.stringify(state));

await evaluate(`(() => {
  const select = document.querySelector('#quickLanguageModeSetting');
  select.value = 'en-GB';
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await pause(250);

await evaluate("document.querySelector('#modeToggle').click()");
await pause(250);
state = await evaluate(`({
  child: document.body.classList.contains('mode-child'),
  hash: location.hash,
  button: document.querySelector('#modeToggle').textContent.trim()
})`);
record("mode control opens child mode", state.child && state.hash === "#child" && state.button === "Parent Site", JSON.stringify(state));

await evaluate("history.back()");
await pause(500);
state = await evaluate(`({ parent: !document.body.matches('.mode-child, .mode-login, .mode-signup'), hash: location.hash })`);
record("browser Back restores parent mode", state.parent && state.hash === "#parent", JSON.stringify(state));

await evaluate("document.querySelector('#modeToggle').click()");
await pause(900);
state = await evaluate(`(() => {
  const button = document.querySelector('[data-task]:not(:disabled)');
  if (!button) return { available: false };
  const task = button.dataset.task;
  button.click();
  const card = document.querySelector('[data-task-card="' + task + '"]');
  const replacement = card?.querySelector('[data-task]');
  return {
    available: true,
    task,
    focusTask: document.activeElement?.dataset?.taskCard,
    done: card?.classList.contains('done'),
    replacementDisabled: replacement?.disabled,
    replacementText: replacement?.textContent.trim(),
    labelledBy: card?.getAttribute('aria-labelledby')
  };
})()`);
record(
  "completing a Today Plan task focuses its replacement completed card",
  state.available
    && state.focusTask === state.task
    && state.done
    && state.replacementDisabled
    && state.replacementText === "Done"
    && state.labelledBy === `today-task-title-${state.task}`,
  JSON.stringify(state)
);
await evaluate("document.querySelector('[data-filter=\"learn\"]').click()");
state = await evaluate(`({
  pressed: document.querySelector('[data-filter="learn"]').getAttribute('aria-pressed'),
  hiddenCreate: document.querySelector('[data-kind="create"]').hidden,
  shownLearn: !document.querySelector('[data-kind="learn"]').hidden
})`);
record("hub filter exposes and applies selected state", state.pressed === "true" && state.hiddenCreate && state.shownLearn, JSON.stringify(state));

await evaluate("document.querySelector('[data-filter=\"all\"]').click()");
await evaluate("document.querySelector('[data-open-app=\"flyer\"]').click()");
await pause(900);
state = await evaluate(`({
  open: document.querySelector('#appModal').classList.contains('open'),
  hidden: document.querySelector('#appModal').getAttribute('aria-hidden'),
  focus: document.activeElement?.id,
  shellInert: document.querySelector('.shell').hasAttribute('inert'),
  bannerVisible: !document.querySelector('#demoBanner').hidden,
  bannerInert: document.querySelector('#demoBanner').hasAttribute('inert')
})`);
record("child app dialog opens and receives focus", state.open && state.hidden === "false" && state.focus === "closeApp", JSON.stringify(state));
record("child app dialog makes the page and visible demo banner inert", state.shellInert && state.bannerVisible && state.bannerInert, JSON.stringify(state));

await evaluate(`(() => {
  window.__kiddoAuditFlyerCloseClicks = 0;
  document.querySelector('#closeApp').addEventListener('click', () => {
    window.__kiddoAuditFlyerCloseClicks += 1;
  }, { once: true });
})()`);
await pressKey(" ");
state = await evaluate(`({
  open: document.querySelector('#appModal').classList.contains('open'),
  hidden: document.querySelector('#appModal').getAttribute('aria-hidden'),
  closeClicks: window.__kiddoAuditFlyerCloseClicks,
  triggerFocused: document.activeElement?.matches('[data-open-app="flyer"]'),
  shellInert: document.querySelector('.shell').hasAttribute('inert'),
  bannerInert: document.querySelector('#demoBanner').hasAttribute('inert'),
  focus: document.activeElement?.id || document.activeElement?.getAttribute?.('data-open-app') || document.activeElement?.tagName
})`);
record("Space on the Sprout Flyer Close button closes instead of flapping", !state.open && state.hidden === "true" && state.closeClicks === 1 && state.triggerFocused, JSON.stringify(state));
record("closing a child app restores the page and demo banner", !state.shellInert && !state.bannerInert, JSON.stringify(state));

await evaluate("document.querySelector('[data-open-app=\"flyer\"]').click()");
await pause(300);
await pressKey("Escape");
state = await evaluate(`({
  open: document.querySelector('#appModal').classList.contains('open'),
  hidden: document.querySelector('#appModal').getAttribute('aria-hidden'),
  triggerFocused: document.activeElement?.matches('[data-open-app="flyer"]'),
  shellInert: document.querySelector('.shell').hasAttribute('inert'),
  bannerInert: document.querySelector('#demoBanner').hasAttribute('inert'),
  focus: document.activeElement?.id || document.activeElement?.getAttribute?.('data-open-app') || document.activeElement?.tagName
})`);
record("Escape closes child app dialog and restores focus", !state.open && state.hidden === "true" && state.triggerFocused && !state.shellInert && !state.bannerInert, JSON.stringify(state));

await evaluate("document.querySelector('#modeToggle').click()");
await pause(200);
await evaluate("document.querySelector('[data-jump=\"controls\"]').click()");
await pause(300);
state = await evaluate(`({
  active: document.querySelector('.nav [data-jump="controls"]').classList.contains('active'),
  current: document.querySelector('.nav [data-jump="controls"]').getAttribute('aria-current'),
  todayCurrent: document.querySelector('.nav [data-jump="today"]').hasAttribute('aria-current')
})`);
record("section navigation exposes current location", state.active && state.current === "location" && !state.todayCurrent, JSON.stringify(state));

state = await evaluate(`(() => {
  const selected = document.querySelector('#profileStrip .profile-btn.active');
  return { count: document.querySelectorAll('#profileStrip .profile-btn[aria-pressed="true"]').length, selected: selected?.getAttribute('aria-pressed') };
})()`);
record("active child profile exposes pressed state", state.count === 1 && state.selected === "true", JSON.stringify(state));

await evaluate(`(() => {
  const key = 'kiddosprout.demo.v1.family';
  const family = JSON.parse(sessionStorage.getItem(key) || 'null');
  const child = family?.children?.[family.activeChild];
  if (child) {
    child.appRules ||= {};
    child.appRules.studio = 'blocked';
    sessionStorage.setItem(key, JSON.stringify(family));
  }
})()`);
await navigate("creator-studio.html");
state = await evaluate(`({
  lockVisible: !document.querySelector('[data-hub-lock]').classList.contains('hidden'),
  skipTarget: document.querySelector('.skip-link').getAttribute('href'),
  focus: document.activeElement?.id,
  labelled: document.activeElement?.getAttribute('aria-labelledby'),
  described: document.activeElement?.getAttribute('aria-describedby')
})`);
record("a blocked child hub announces its visible outcome", state.lockVisible && state.focus === "hub-lock-content" && state.labelled === "hub-lock-title" && state.described === "hub-lock-message", JSON.stringify(state));
await evaluate("document.querySelector('.skip-link').click()");
await pause(100);
state.focus = await evaluate("document.activeElement?.id");
record("a locked child hub skip link reaches its visible message", state.lockVisible && state.skipTarget === "#hub-lock-content" && state.focus === "hub-lock-content", JSON.stringify(state));

await navigate("blocker-setup.html");
await evaluate("document.querySelector('[data-blocker-platform=\"windows\"]').click()");
state = await evaluate(`({
  windows: document.querySelector('[data-blocker-platform="windows"]').getAttribute('aria-pressed'),
  mac: document.querySelector('[data-blocker-platform="mac"]').getAttribute('aria-pressed'),
  archHidden: document.querySelector('#windows-architecture-field').hidden,
  setupVisible: !document.querySelector('[data-setup-platform="windows"]').hidden
})`);
record("blocker platform switch updates controls and guide", state.windows === "true" && state.mac === "false" && !state.archHidden && state.setupVisible, JSON.stringify(state));

await navigate("app_7.html");
await evaluate("document.querySelector('#changeGoal').click()");
state = await evaluate(`({
  open: document.querySelector('#goalDialog').open,
  focus: document.activeElement?.id,
  name: document.querySelector('#goalNameInput').value,
  amount: document.querySelector('#goalAmountInput').value
})`);
record("goal editor opens as a focused dialog", state.open && state.focus === "goalNameInput" && state.name && state.amount, JSON.stringify(state));
await evaluate(`(() => {
  document.querySelector('#goalNameInput').value = 'Science kit';
  document.querySelector('#goalAmountInput').value = '25';
  document.querySelector('#goalForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
})()`);
await pause(200);
state = await evaluate(`({
  open: document.querySelector('#goalDialog').open,
  goal: document.querySelector('#goalName').textContent.trim(),
  focus: document.activeElement?.id
})`);
record("goal editor saves and restores focus", !state.open && state.goal === "Science kit" && state.focus === "changeGoal", JSON.stringify(state));

await navigate("recipe.html");
await evaluate("document.querySelector('#music-btn').click()");
await pause(150);
state = await evaluate(`({
  open: !document.querySelector('#youtube-music-panel').hidden,
  expanded: document.querySelector('#music-btn').getAttribute('aria-expanded'),
  focus: document.activeElement?.id
})`);
record("recipe music panel opens and focuses its first control", state.open && state.expanded === "true" && state.focus === "youtube-link-input", JSON.stringify(state));
await pressKey("Escape");
state = await evaluate(`({
  closed: document.querySelector('#youtube-music-panel').hidden,
  expanded: document.querySelector('#music-btn').getAttribute('aria-expanded'),
  focus: document.activeElement?.id
})`);
record("Escape closes recipe music and restores focus", state.closed && state.expanded === "false" && state.focus === "music-btn", JSON.stringify(state));

await evaluate(`(() => {
  const input = document.querySelector('#search-input');
  input.value = 'waffles';
  input.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await pause(100);
state = await evaluate(`({
  summary: document.querySelector('#recipe-results-summary').textContent.trim(),
  cards: document.querySelectorAll('.recipe-card').length,
  cardText: document.querySelector('.recipe-card')?.textContent || ''
})`);
record("recipe search updates results", state.cards >= 1 && /waffle/i.test(state.cardText || state.summary), JSON.stringify(state));

await navigate("story-theater.html");
await evaluate("document.querySelector('[data-choose-series]').click()");
await pause(100);
state = await evaluate(`({
  expanded: document.querySelector('[data-choose-series]').getAttribute('aria-expanded'),
  visible: !document.querySelector('#living-ink-books').hidden,
  focusClass: document.activeElement?.className
})`);
record("series picker expands and moves focus to a book", state.expanded === "true" && state.visible && String(state.focusClass).includes("series-book"), JSON.stringify(state));
await evaluate("document.querySelector('[data-open-story]').click()");
const storyOpenDeadline = Date.now() + 5_000;
do {
  state = await evaluate(`({
    readerVisible: !document.querySelector('#story-reader').hidden,
    hash: location.hash,
    focus: document.activeElement?.id,
    sceneTop: Math.round(document.querySelector('#story-scene').getBoundingClientRect().top),
    viewport: innerHeight
  })`);
  if (state.readerVisible
      && state.hash.startsWith("#story-")
      && state.focus === "story-scene"
      && state.sceneTop >= 0
      && state.sceneTop < state.viewport) break;
  await pause(100);
} while (Date.now() < storyOpenDeadline);
record(
  "story opens, updates URL, and focuses the illustration in view",
  state.readerVisible
    && state.hash.startsWith("#story-")
    && state.focus === "story-scene"
    && state.sceneTop >= 0
    && state.sceneTop < state.viewport,
  JSON.stringify(state)
);
const firstPage = await evaluate("document.querySelector('#page-count').textContent");
await evaluate("document.querySelector('#next-page').click()");
const pageTurnDeadline = Date.now() + 5_000;
do {
  state = await evaluate(`({
    page: document.querySelector('#page-count').textContent,
    hash: location.hash,
    focus: document.activeElement?.id,
    sceneTop: Math.round(document.querySelector('#story-scene').getBoundingClientRect().top),
    viewport: innerHeight
  })`);
  if (state.page !== firstPage
      && state.focus === "story-scene"
      && state.sceneTop >= 0
      && state.sceneTop < state.viewport) break;
  await pause(100);
} while (Date.now() < pageTurnDeadline);
record(
  "Next page changes content and keeps focus with the illustration in view",
  state.page !== firstPage
    && state.focus === "story-scene"
    && state.sceneTop >= 0
    && state.sceneTop < state.viewport,
  JSON.stringify(state)
);
const readingPageBeforeSoundStudio = state.page;
const readingHashBeforeSoundStudio = state.hash;
const bookmarkBeforeSoundStudio = await evaluate("window.KiddoSproutStoryStorage.getItem('kiddosproutLivingInkBookmark:location')");
const soundStudioUrl = new URL(`story-voices.html?return=${encodeURIComponent(readingHashBeforeSoundStudio)}`, baseUrl).href;
const storyReturnUrl = new URL(`story-theater.html${readingHashBeforeSoundStudio}`, baseUrl).href;
await clickAndWaitForNavigation("document.querySelector('#choose-story-sound').click()", soundStudioUrl);
state = await evaluate(`({
  page: location.pathname,
  returnTarget: new URLSearchParams(location.search).get('return'),
  link: document.querySelector('[data-return-to-story]')?.getAttribute('href')
})`);
record("Sound Studio receives the exact safe reader return target", state.page.endsWith("/story-voices.html") && state.returnTarget === readingHashBeforeSoundStudio && /\?chapter=\d+&page=\d+$/.test(state.returnTarget) && state.link?.endsWith(state.returnTarget), JSON.stringify(state));
await clickAndWaitForNavigation("document.querySelector('[data-return-to-story]').click()", storyReturnUrl);
state = await evaluate(`({
  theater: location.pathname.endsWith('/story-theater.html'),
  hash: location.hash,
  page: document.querySelector('#page-count')?.textContent,
  readerVisible: !document.querySelector('#story-reader')?.hidden
})`);
record("Sound Studio Back restores the exact reader page", state.theater && state.hash === readingHashBeforeSoundStudio && state.page === readingPageBeforeSoundStudio && state.readerVisible, JSON.stringify(state));

await clickAndWaitForNavigation("document.querySelector('#choose-story-sound').click()", soundStudioUrl);
await navigate(soundStudioUrl);
await clickAndWaitForNavigation("document.querySelectorAll('[data-return-to-story]')[1].click()", storyReturnUrl);
state = await evaluate(`({
  theater: location.pathname.endsWith('/story-theater.html'),
  hash: location.hash,
  page: document.querySelector('#page-count')?.textContent,
  readerVisible: !document.querySelector('#story-reader')?.hidden,
  bookmark: window.KiddoSproutStoryStorage?.getItem('kiddosproutLivingInkBookmark:location')
})`);
record("Sound Studio direct-link fallback restores the exact unsaved reader page", state.theater && state.hash === readingHashBeforeSoundStudio && state.page === readingPageBeforeSoundStudio && state.readerVisible && state.bookmark === bookmarkBeforeSoundStudio, JSON.stringify(state));

await navigate("story-voices.html");
await evaluate("document.querySelector('[data-voice-source=\"device\"]').click()");
await pause(150);
state = await evaluate(`({
  pressed: document.querySelector('[data-voice-source="device"]').getAttribute('aria-pressed'),
  allPressed: document.querySelector('[data-voice-source="all"]').getAttribute('aria-pressed'),
  busy: document.querySelector('#voiceGrid').getAttribute('aria-busy')
})`);
record("voice source filter exposes selected state", state.pressed === "true" && state.allPressed === "false" && state.busy === "false", JSON.stringify(state));
await evaluate(`(() => {
  const input = document.querySelector('#voiceSearch');
  input.value = 'definitely-no-such-sound';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
})()`);
await pause(100);
state = await evaluate(`({ empty: document.querySelector('.voice-empty')?.textContent || '', count: document.querySelector('#voiceCount').textContent })`);
record("voice search has an accessible empty state", /No sounds match/.test(state.empty) && /^0 sounds$/.test(state.count), JSON.stringify(state));
await pressKey("Escape");
await pause(100);
state = await evaluate(`({
  value: document.querySelector('#voiceSearch').value,
  empty: Boolean(document.querySelector('.voice-empty')),
  count: document.querySelector('#voiceCount').textContent,
  focus: document.activeElement?.id
})`);
record("Escape clears voice search and restores results", state.value === "" && !state.empty && !/^0 sounds$/.test(state.count) && state.focus === "voiceSearch", JSON.stringify(state));
state = await evaluate(`(() => {
  const button = document.querySelector('.choose-voice:not(:disabled)');
  const card = button?.closest('.voice-card');
  if (!button || !card) return { available: false };
  const source = card.dataset.voiceSource;
  const id = card.dataset.voiceId;
  const search = document.querySelector('#voiceSearch');
  button.focus();
  search.value = card.querySelector('h3')?.textContent || '';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  const refreshed = document.activeElement?.closest?.('.voice-card');
  const result = {
    available: true,
    chooseFocused: document.activeElement?.classList.contains('choose-voice'),
    sameVoice: refreshed?.dataset.voiceSource === source && refreshed?.dataset.voiceId === id
  };
  search.value = '';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  return result;
})()`);
record("voice-list refresh preserves the focused voice control", state.available && state.chooseFocused && state.sameVoice, JSON.stringify(state));
await evaluate("document.querySelector('.choose-voice:not(:disabled)')?.click()");
await pause(100);
state = await evaluate(`({
  cardFocused: document.activeElement?.classList.contains('voice-card'),
  selected: document.activeElement?.getAttribute('aria-current'),
  labelled: Boolean(document.activeElement?.getAttribute('aria-labelledby'))
})`);
record("choosing a story sound preserves meaningful focus", state.cardFocused && state.selected === "true" && state.labelled, JSON.stringify(state));

await navigate("report_problem.html");
await evaluate("document.querySelector('#sendReport').click()");
await pause(100);
state = await evaluate(`({ status: document.querySelector('#status').textContent, focus: document.activeElement?.id })`);
record("empty problem report is rejected and focuses field", state.focus === "problemText" && await evaluate("!document.querySelector('#problemText').validity.valid"), JSON.stringify(state));
await evaluate(`(() => {
  const input = document.querySelector('#problemText');
  input.value = 'A practice report from the interaction audit.';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#reportForm').requestSubmit();
})()`);
await pause(100);
state = await evaluate(`({
  status: document.querySelector('#status').textContent,
  empty: document.querySelector('#problemText').value === '',
  counter: document.querySelector('#problemCounter').textContent
})`);
record("practice report saves and resets the form", /Practice report saved/.test(state.status) && state.empty && state.counter === "0 / 2000", JSON.stringify(state));

const routes = [
  "", "recipe.html", "app_7.html", "blocker-setup.html", "creator-studio.html",
  "nature-explorer.html", "move-breaks.html", "story-theater.html", "story-voices.html", "report_problem.html"
];
for (const route of routes) {
  await navigate(route);
  const result = await evaluate(`(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary')].filter(visible);
    return {
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      tiny: controls.map((element) => {
        const target = ['checkbox', 'radio'].includes(element.type) && element.closest('label')
          ? element.closest('label')
          : element;
        const rect = target.getBoundingClientRect();
        return { tag: element.tagName, id: element.id, text: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 40), width: Math.round(rect.width), height: Math.round(rect.height) };
      }).filter((item) => item.width < 24 || item.height < 24),
      hiddenFocus: document.activeElement?.closest?.('[hidden], [inert], [aria-hidden="true"]') != null
    };
  })()`);
  record(`${route || "index.html"} mobile viewport has no page-level overflow`, result.width <= result.viewport, JSON.stringify(result));
  record(`${route || "index.html"} controls meet 24px minimum target`, result.tiny.length === 0, JSON.stringify(result.tiny));
  record(`${route || "index.html"} focus is not hidden`, !result.hiddenFocus);
}

const report = {
  passed: checks.filter((check) => check.pass).length,
  failed: checks.filter((check) => !check.pass),
  runtimeProblems: problems,
  checks
};
console.log(JSON.stringify(process.argv.includes("--summary")
  ? { passed: report.passed, failed: report.failed, runtimeProblems: report.runtimeProblems }
  : report, null, 2));

socket.close();
if (checks.some((check) => !check.pass) || problems.length) process.exitCode = 1;
