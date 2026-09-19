import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const pageNames = [
  "creator-studio.html",
  "nature-explorer.html",
  "move-breaks.html",
  "story-theater.html",
  "story-voices.html"
];

const [hubCss, voiceCss, voiceScript, storyStorageScript, hubGateScript, ...pages] = await Promise.all([
  read("kid-hubs.css"),
  read("story-voices.css"),
  read("story-voices.js"),
  read("story-storage.js"),
  read("kid-hub-gate.js"),
  ...pageNames.map(read)
]);
const pageByName = Object.fromEntries(pageNames.map((name, index) => [name, pages[index]]));
const creatorSource = pageByName["creator-studio.html"];

assert.doesNotMatch(hubCss, /font-size:\s*(?:10|11)px/,
  "Shared child-hub labels must remain readable instead of shrinking to 10–11px.");
assert.doesNotMatch(voiceCss, /font-size:\s*(?:10|11)px/,
  "Story Voice labels must remain readable instead of shrinking to 10–11px.");

function inlineThemeSource(source) {
  const match = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .find((candidate) => !/\bsrc\s*=/.test(candidate[1]) && candidate[2].includes("theme-night"));
  assert.ok(match, "Missing early standalone theme resolver.");
  return match[2].trim();
}

const themeSource = inlineThemeSource(pages[0]);

for (const [name, source] of Object.entries(pageByName)) {
  assert.match(source, /<html lang="en-GB">/, `${name} must declare its British English locale.`);
  assert.ok(source.indexOf('<meta charset="UTF-8">') < source.indexOf("<script"), `${name} must declare UTF-8 before executable scripts.`);
  assert.match(source, /<meta name="color-scheme" content="light dark">/, `${name} must advertise both saved themes to browser controls.`);
  assert.equal(inlineThemeSource(source), themeSource, `${name} must use the same standalone theme resolver.`);
  assert.ok(
    source.indexOf("theme-night") < source.indexOf("kid-hubs.css"),
    `${name} must resolve its theme before its stylesheet paints.`
  );
  assert.match(source, /<nav class="[^"]*topbar[^"]*" aria-label="Hub navigation">/, `${name} needs a named navigation landmark.`);
  assert.match(source, /class="lock-card hidden" data-hub-lock role="main"/, `${name} locked view needs the main landmark and shared lock structure.`);
  assert.match(source, /kid-hub-gate\.js\?v=9/, `${name} must load the authenticated, skip-link-aware hub gate.`);
  assert.match(source, /auth-session\.js\?v=7/, `${name} must load shared session validation before its gate.`);
  assert.match(source, /family-state-cloud\.js\?v=2/, `${name} must load authenticated family state before its gate.`);
  assert.ok(
    source.indexOf("auth-session.js?v=7") < source.indexOf("family-state-cloud.js?v=2")
      && source.indexOf("family-state-cloud.js?v=2") < source.indexOf("kid-hub-gate.js?v=9"),
    `${name} must initialize session and cloud state before protecting the hub.`
  );
}

assert.match(
  creatorSource,
  /getUserMedia\(\{ video: true, audio: false \}\)[\s\S]*?getUserMedia\(\{ audio: true, video: false \}\)/,
  "Creator Studio must keep a working camera usable when microphone access is missing or denied."
);
assert.doesNotMatch(
  creatorSource,
  /getUserMedia\(\{ video: true, audio: true \}\)/,
  "Creator Studio must not make camera availability depend on microphone availability."
);
assert.match(
  creatorSource,
  /function watchCaptureEnd\(stream, stoppedMessage\)[\s\S]*?getVideoTracks\?\.\(\)\[0\]\?\.addEventListener\("ended"[\s\S]*?stopActiveStream\(\)/,
  "Creator Studio must reset its controls when a camera or shared screen disconnects."
);
assert.match(
  creatorSource,
  /Camera ready without microphone sound\./,
  "Creator Studio should clearly tell the child when a silent camera recording is still available."
);

assert.match(hubGateScript, /function pointSkipLinkAt\(target, fallbackId\)/,
  "The shared hub gate must retarget skip links when the visible main view changes.");
assert.match(hubGateScript, /pointSkipLinkAt\(page, "main-content"\)/,
  "Allowed hubs must keep their skip link aimed at the visible page.");
assert.match(hubGateScript, /pointSkipLinkAt\(lock, "hub-lock-content"\)/,
  "Locked hubs must aim their skip link at the visible approval message.");
assert.match(hubGateScript, /function focusGateOutcome\(lock, titleNode, messageNode\)/,
  "A locked hub must announce the visible outcome instead of leaving focus on hidden content.");
assert.match(hubGateScript, /lock\.setAttribute\("aria-labelledby", titleNode\.id\)/,
  "The locked view must be named by its current outcome heading.");
assert.match(hubGateScript, /lock\.setAttribute\("aria-describedby", messageNode\.id\)/,
  "The locked view must expose its current explanatory message.");
assert.match(hubGateScript, /lock\.focus\?\.\(\{ preventScroll: true \}\)/,
  "The normal locked-hub route must focus the result without an extra pointer action.");
assert.match(hubGateScript, /window\.KiddoSproutSession\.validate\(\)/,
  "Real hub access must validate the current account session with Supabase.");
assert.match(hubGateScript, /window\.KiddoSproutFamilyState\.load\(\{ expectedOwnerId \}\)/,
  "Real hub rules must come from the authenticated cloud family state.");
assert.match(hubGateScript, /save\(state, \{ expectedOwnerId \}\)/,
  "Real approval requests must be saved through the authenticated family-state helper.");
assert.match(hubGateScript, /currentSession[\s\S]*?user\?\.id[\s\S]*?expectedOwnerId/,
  "The hub gate must discard a result if the active parent changes during a cloud request.");
assert.doesNotMatch(hubGateScript, /window\.localStorage/,
  "Standalone hubs must never authorize or write a real family from editable local storage.");
assert.match(hubGateScript, /setAttribute\("aria-busy", "true"\)/,
  "The async account check must expose its busy state to assistive technology.");
assert.match(hubGateScript, /messageNode\.setAttribute\("role", "status"\)/,
  "The async account check must announce its progress without exposing the hub early.");

class HubStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
    this.writes = [];
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.writes.push([key, String(value)]);
    this.values.set(key, String(value));
  }
}

function hubElement(classes = []) {
  const classNames = new Set(classes);
  const attributes = new Map();
  return {
    id: "",
    textContent: "",
    focused: false,
    classList: {
      add: (...names) => names.forEach((name) => classNames.add(name)),
      remove: (...names) => names.forEach((name) => classNames.delete(name)),
      contains: (name) => classNames.has(name)
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    focus() {
      this.focused = true;
    }
  };
}

function familyWithRule(rule) {
  return {
    parentAccountCreated: true,
    activeChild: "child-1",
    children: {
      "child-1": {
        name: "Ari",
        appRules: { studio: rule, explore: rule },
        pending: 0,
        requests: [],
        currentRequest: ["No request", "No pending request", "-"]
      }
    }
  };
}

function createHubGateHarness({
  publicDemo = false,
  demoState = null,
  localState = null,
  session = { access_token: "verified-token", user: { id: "parent-1", email: "parent@example.test" } },
  cloudState = familyWithRule("allowed"),
  saveImpl
} = {}) {
  const sessionStorage = new HubStorage(demoState ? {
    "kiddosprout.demo.v1.family": JSON.stringify(demoState),
    ...(publicDemo ? {} : { "kiddosprout.demo.v1.active": "1" })
  } : {});
  const localStorage = new HubStorage(localState ? { kiddosproutState: JSON.stringify(localState) } : {});
  const calls = [];
  const ownerBindings = [];
  const page = hubElement(["hidden"]);
  page.id = "main-content";
  const lock = hubElement(["hidden"]);
  const title = hubElement();
  const message = hubElement();
  const skip = hubElement();
  const nodes = new Map([
    ["[data-hub-page]", page],
    ["[data-hub-lock]", lock],
    ["[data-lock-title]", title],
    ["[data-lock-message]", message],
    [".skip-link", skip]
  ]);
  const windowObject = {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: publicDemo },
    sessionStorage,
    localStorage,
    KiddoSproutSession: {
      async validate() {
        calls.push("validate");
        return session;
      }
    },
    KiddoSproutFamilyState: {
      async load(options) {
        calls.push("load");
        ownerBindings.push(options?.expectedOwnerId || "");
        return cloudState;
      },
      async save(state, options) {
        calls.push("save");
        ownerBindings.push(options?.expectedOwnerId || "");
        if (saveImpl) return saveImpl(state);
        return JSON.parse(JSON.stringify(state));
      }
    }
  };
  vm.runInNewContext(hubGateScript, {
    window: windowObject,
    document: { querySelector: (selector) => nodes.get(selector) || null },
    JSON,
    Array,
    Object,
    String,
    Number,
    Math,
    Error,
    Promise
  }, { filename: "kid-hub-gate.js" });
  return { api: windowObject.KiddoHubGate, calls, ownerBindings, page, lock, title, message, skip, sessionStorage, localStorage };
}

{
  const harness = createHubGateHarness({ publicDemo: true, demoState: familyWithRule("allowed") });
  const result = harness.api.protect("explore", "Nature Explorer");
  assert.equal(result, true, "The public preview must remain a synchronous, usable demo.");
  assert.deepEqual(harness.calls, [], "Demo hubs must not wait for or contact real account services.");
  assert.equal(harness.page.classList.contains("hidden"), false);
}

{
  const harness = createHubGateHarness({ publicDemo: true, demoState: familyWithRule("request") });
  const result = harness.api.protect("studio", "Creator Studio");
  assert.equal(result, false, "A demo request gate must also finish synchronously.");
  assert.deepEqual(harness.calls, [], "A practice request must stay inside the demo tab.");
  const savedDemo = JSON.parse(harness.sessionStorage.getItem("kiddosprout.demo.v1.family"));
  assert.equal(savedDemo.children["child-1"].requests[0][3], "appAccess");
}

{
  const tamperedLocal = familyWithRule("allowed");
  const harness = createHubGateHarness({ localState: tamperedLocal, cloudState: familyWithRule("blocked") });
  const pending = harness.api.protect("explore", "Nature Explorer");
  assert.equal(typeof pending?.then, "function", "Real-family protection must wait for account validation.");
  assert.equal(harness.lock.classList.contains("hidden"), false, "The safe checking view must be visible while validation is pending.");
  assert.equal(harness.page.classList.contains("hidden"), true, "Protected content must stay hidden while validation is pending.");
  assert.equal(harness.lock.getAttribute("aria-busy"), "true");
  assert.equal(harness.message.getAttribute("role"), "status");
  assert.equal(await pending, false, "A locally forged allow rule must not beat the authenticated cloud rule.");
  assert.deepEqual(harness.calls, ["validate", "load", "validate"]);
  assert.deepEqual(harness.ownerBindings, ["parent-1"]);
  assert.equal(harness.localStorage.writes.length, 0, "The hardened gate must not write real family data locally.");
}

{
  const harness = createHubGateHarness({ localState: familyWithRule("blocked"), cloudState: familyWithRule("allowed") });
  assert.equal(await harness.api.protect("explore", "Nature Explorer"), true);
  assert.deepEqual(harness.calls, ["validate", "load", "validate"], "The same session owner must be checked before and after cloud rules load.");
  assert.deepEqual(harness.ownerBindings, ["parent-1"]);
  assert.equal(harness.page.classList.contains("hidden"), false);
}

{
  const harness = createHubGateHarness({ session: null, localState: familyWithRule("allowed") });
  assert.equal(await harness.api.protect("explore", "Nature Explorer"), false);
  assert.deepEqual(harness.calls, ["validate"], "A signed-out hub must not read or write family state.");
  assert.equal(harness.title.textContent, "Parent sign-in needed");
}

{
  let savedRequest = null;
  const harness = createHubGateHarness({
    localState: familyWithRule("blocked"),
    cloudState: familyWithRule("request"),
    saveImpl(state) {
      savedRequest = JSON.parse(JSON.stringify(state));
      return savedRequest;
    }
  });
  assert.equal(await harness.api.protect("studio", "Creator Studio"), false);
  assert.deepEqual(harness.calls, ["validate", "load", "validate", "save", "validate"]);
  assert.deepEqual(harness.ownerBindings, ["parent-1", "parent-1"]);
  assert.equal(savedRequest.children["child-1"].requests[0][4], "studio");
  assert.match(harness.message.textContent, /sent to the parent dashboard/i);
}

{
  const harness = createHubGateHarness({ cloudState: familyWithRule("request"), saveImpl: () => null });
  assert.equal(await harness.api.protect("studio", "Creator Studio"), false);
  assert.equal(harness.title.textContent, "Request could not be sent");
  assert.equal(harness.api.readState(), null, "A failed cloud write must discard the gate's authenticated state snapshot.");
}

function storage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return { getItem: (key) => values.has(key) ? values.get(key) : null };
}

function resolveTheme({ demo = false, demoState = null, safePreferences = null, hour = 12 } = {}) {
  const classes = new Set();
  const documentElement = {
    classList: {
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      }
    },
    dataset: {}
  };
  const window = {
    sessionStorage: storage({
      ...(demo ? { "kiddosprout.demo.v1.active": "1" } : {}),
      ...(demoState ? { "kiddosprout.demo.v1.family": JSON.stringify(demoState) } : {})
    }),
    localStorage: storage(safePreferences ? { kiddosproutPreferences: JSON.stringify(safePreferences) } : {})
  };
  class DateAtHour extends Date {
    getHours() { return hour; }
  }
  vm.runInNewContext(themeSource, { window, document: { documentElement }, JSON, Array, Date: DateAtHour }, { filename: "standalone-hub-theme.js" });
  return { classes, mode: documentElement.dataset.themeMode };
}

let theme = resolveTheme({ safePreferences: { themeMode: "night" } });
assert.equal(theme.classes.has("theme-night"), true);
assert.equal(theme.classes.has("theme-day"), false);
assert.equal(theme.mode, "night");

theme = resolveTheme({ demo: true, demoState: { themeMode: "night" }, safePreferences: { themeMode: "day" } });
assert.equal(theme.classes.has("theme-night"), true, "The active tab-scoped demo theme must beat real family storage.");

theme = resolveTheme({ demoState: { themeMode: "night" }, safePreferences: { themeMode: "day" } });
assert.equal(theme.classes.has("theme-night"), true, "Public-demo state must work without the optional active marker.");

theme = resolveTheme({ safePreferences: { themeMode: "day" }, hour: 22 });
assert.equal(theme.classes.has("theme-day"), true, "An explicit day preference must beat the current time.");

theme = resolveTheme({ safePreferences: { themeMode: "auto" }, hour: 22 });
assert.equal(theme.classes.has("theme-night"), true, "Auto theme must use night colours after 19:00.");

theme = resolveTheme({ safePreferences: { themeMode: "auto" }, hour: 12 });
assert.equal(theme.classes.has("theme-day"), true, "Auto theme must use day colours before 19:00.");

const creator = pageByName["creator-studio.html"];
assert.match(creator, /class="source-choice" role="group" aria-label="Recording source"/);
assert.match(hubCss, /\.source-option\s*\{[\s\S]*?min-height:\s*44px;/,
  "Creator Studio Camera and Screen Share selectors need 44px targets.");
assert.match(creator, /id="camera-source"[^>]*aria-pressed="true"/);
assert.match(creator, /id="screen-source"[^>]*aria-pressed="false"/);
assert.match(creator, /id="record-status" role="status" aria-live="polite" aria-atomic="true"/);
assert.match(creator, /cameraSourceButton\.setAttribute\("aria-pressed"/);
assert.match(creator, /screenSourceButton\.setAttribute\("aria-pressed"/);
assert.match(creator, /placeholder\.classList\.toggle\("hidden", Boolean\(recordedBlob && clipUrl/);
assert.match(creator, /playback\.classList\.remove\("hidden"\);[\s\S]*?placeholder\.classList\.add\("hidden"\);/);
assert.match(creator, /id="clip-script"[^>]*maxlength="600"[^>]*aria-describedby="creator-safety"/);
assert.match(creator, /id="camera-btn"[^>]*aria-pressed="false"/);
assert.match(creator, /typeof MediaRecorder !== "function"/);
assert.match(creator, /recordedBlob\.size/);
assert.match(creator, /stopActiveStream\(\);[\s\S]*?capture switched off/);
assert.ok(creator.includes('const useMp4 = /^video\\/mp4\\b/i.test'), "Creator Studio must save Safari MP4 recordings with the correct extension.");
assert.match(creator, /alreadyWaiting/);
assert.match(creator, /child\.requests = requests/);
assert.match(creator, /requests\.length >= 100/);
assert.match(creator, /async function sendParentReview\(\)/,
  "Creator review requests must wait for authenticated cloud persistence.");
assert.match(creator, /await Promise\.resolve\(KiddoHubGate\.writeState\(family\)\)/,
  "Creator Studio must not claim a parent request was sent before cloud storage confirms it.");
assert.match(creator, /reviewButton\.setAttribute\("aria-busy", "true"\)/,
  "Creator Studio must expose its asynchronous review-save state accessibly.");
assert.match(creator, /finally \{[\s\S]*?reviewButton\.removeAttribute\("aria-busy"\)/,
  "Creator Studio must always clear its review-save busy state.");

assert.match(pageByName["nature-explorer.html"], /class="grid nature-grid" aria-label="Nature activities"/);
assert.match(pageByName["nature-explorer.html"], /class="panel-icon" aria-hidden="true"/);
assert.match(pageByName["move-breaks.html"], /class="grid move-grid" aria-label="Movement activities"/);
assert.match(pageByName["move-breaks.html"], /class="panel-icon" aria-hidden="true"/);

const voices = pageByName["story-voices.html"];
assert.match(voices, /id="voiceCount" role="status" aria-live="polite"/);
assert.doesNotMatch(voices, /id="voiceGrid"[^>]*aria-live=/, "The full voice grid must not be a chatty live region.");
assert.match(voices, /data-voice-source="all" aria-pressed="true"/);
assert.match(voices, /data-voice-source="device" aria-pressed="false"/);
assert.match(voices, /id="voiceGrid" role="list"[^>]*aria-busy="true"/);
assert.match(voices, /id="voiceSearch"[^>]*aria-controls="voiceGrid"/);
assert.match(voiceScript, /candidate\.setAttribute\("aria-pressed", String\(isActive\)\)/);
assert.match(voiceScript, /VOICE_LIST_TIMEOUT_MS = 12000/);
assert.match(voiceScript, /setPreviewButtonState\(button, true, voice\.name\)/);
assert.match(voiceScript, /button\.removeAttribute\("aria-pressed"\)/,
  "Voice previews must use a changing action name, not conflicting toggle semantics.");
assert.match(voiceScript, /`Hear Voice: \$\{voiceName\}`/,
  "A preview's accessible name must begin with its visible Hear Voice label.");
assert.match(voiceScript, /`Choose Sound: \$\{voice\.name\}`/,
  "A choice button's accessible name must begin with its visible Choose Sound label.");
assert.match(voiceScript, /`No Sample Yet: \$\{voice\.name\}`/,
  "An unavailable preview's accessible name must include its exact visible label.");
assert.match(voiceScript, /utterance\.onend = \(\) => finish\(`Finished \$\{voice\.name\}\.`/,
  "Device playback completion must replace the stale Playing status.");
assert.match(voiceScript, /utterance\.onerror = \(\) => finish\("That device voice could not play/,
  "Device playback errors must replace the stale Playing status.");
assert.match(voiceScript, /card\.setAttribute\("role", "listitem"\)/);
assert.match(voiceScript, /url\.protocol === "https:"/);
assert.match(voiceScript, /voiceGrid\.setAttribute\("aria-busy", "false"\)/);
assert.match(voices, /data-return-to-story/g, "Both Story Sound exit links should preserve the reader destination.");
assert.ok(voices.indexOf("story-storage.js?v=5") >= 0 && voices.indexOf("story-storage.js?v=5") < voices.indexOf("story-voices.js?v=14"),
  "Sound Studio must load the shared safe reader-route parser before using it.");
assert.ok(voices.indexOf("kid-hub-gate.js?v=9") >= 0 && voices.indexOf("kid-hub-gate.js?v=9") < voices.indexOf("story-voices.js?v=14"),
  "Sound Studio must load its real account gate before its deferred app initializer.");
assert.ok(voices.indexOf("story-voices.js?v=14") >= 0 && voices.indexOf("story-voices.js?v=14") < voices.indexOf("KiddoSproutStoryVoices.start"),
  "Sound Studio must define its initializer before passing the gate result to it.");
assert.match(voices, /KiddoSproutStoryVoices\.start\([\s\S]*?KiddoHubGate\.protect\("story", "Story Theater"\)/,
  "Sound Studio must initialize only from the shared gate's result.");
assert.match(voiceScript, /Promise\.resolve\(gateResult\)[\s\S]*?allowed === true && initialize\(\) === true/,
  "Sound Studio must wait for the asynchronous real-account gate to allow access.");
assert.doesNotMatch(voiceScript, /^\s*if \(document\.querySelector\("\[data-hub-page\]"\).*return;/m,
  "Sound Studio must not permanently give up while the asynchronous gate is still checking.");
{
  let resolveGate;
  let pageQueries = 0;
  const pendingGate = new Promise((resolve) => { resolveGate = resolve; });
  const deferredWindow = {};
  vm.runInNewContext(voiceScript, {
    window: deferredWindow,
    document: {
      querySelector() {
        pageQueries += 1;
        return { classList: { contains: () => true } };
      }
    },
    Promise,
    Object
  }, { filename: "story-voices-deferred-gate.js" });
  const started = deferredWindow.KiddoSproutStoryVoices.start(pendingGate);
  assert.equal(pageQueries, 0, "Sound Studio touched its hidden app before the real gate resolved.");
  resolveGate(true);
  assert.equal(await started, false, "A still-hidden page must remain fail-closed after a gate result.");
  assert.equal(pageQueries, 1, "Sound Studio did not check the page after the gate resolved.");
}
assert.match(voiceScript, /KiddoSproutStoryStorage\?\.parseReaderHash\?\.\(value\)/,
  "Story return destinations must pass the shared internal reader-route validator.");
assert.match(storyStorageScript, /\^#story-[\s\S]*?chapter=[\s\S]*?&page=/,
  "Safe reader return hashes must carry both chapter and within-chapter page.");
assert.match(voiceScript, /referrer\.origin === window\.location\.origin/,
  "History-based story return should only trust a same-origin referrer.");
assert.match(voiceScript, /window\.history\.back\(\)/,
  "Returning from Sound Studio should restore the exact live reader page when possible.");
assert.match(voiceScript, /function normalizedVoiceSearch[\s\S]*?normalize\("NFD"\)[\s\S]*?replace\(\/\[\\u0300-\\u036f\]\/g, ""\)/,
  "Voice search should ignore accents and punctuation.");
assert.match(voiceScript, /queryWords\.every\(\(word\) => searchable\.includes\(word\)\)/,
  "Voice search should match words independently so extra spaces and word order do not break results.");
assert.match(voiceScript, /function renderVoices\(\) \{[\s\S]*?stopPreview\(\);[\s\S]*?voiceGrid\.replaceChildren\(\)/,
  "Filtering or refreshing the voice grid must stop audio whose stop button is about to disappear.");
assert.match(voiceScript, /voiceSearch\.addEventListener\("keydown"[\s\S]*?event\.key !== "Escape"[\s\S]*?voiceSearch\.value = ""/,
  "Escape should clear a voice search without forcing a pointer interaction.");
assert.match(voiceScript, /card\.tabIndex = -1;[\s\S]*?card\.dataset\.voiceSource = voice\.source;[\s\S]*?card\.dataset\.voiceId = voice\.id;/,
  "Voice cards need a stable programmatic focus target after their controls rerender.");
assert.match(voiceScript, /renderVoices\(\);[\s\S]*?selectedCard\?\.focus\(\{ preventScroll: true \}\);/,
  "Choosing a voice must restore focus to the newly rendered selected card.");
assert.match(voiceScript, /function focusedVoiceControl\(\)[\s\S]*?active\.classList\.contains\("preview-voice"\)[\s\S]*?active\.classList\.contains\("choose-voice"\)/,
  "A voice refresh must remember which control had keyboard focus.");
assert.match(voiceScript, /function restoreVoiceControlFocus\(previousFocus\)[\s\S]*?\.focus\(\{ preventScroll: true \}\)/,
  "A voice refresh must restore the equivalent control or a safe fallback.");
assert.match(voiceScript, /const previousFocus = focusedVoiceControl\(\);[\s\S]*?voiceGrid\.replaceChildren\(\)[\s\S]*?restoreVoiceControlFocus\(previousFocus\)/,
  "Voice-grid replacement must preserve meaningful focus across asynchronous refreshes.");
assert.doesNotMatch(voices, /class="hub-lock/, "Story Voices must use the shared lock-card wrapper.");

assert.match(hubCss, /html\.theme-night body/);
assert.match(hubCss, /html\.theme-night \.series-library/);
assert.match(hubCss, /html\.theme-night \.record-controls/);
assert.match(hubCss, /html\.theme-night \.lock-card > div/);
assert.match(hubCss, /:root :is\(a, button, input, select, textarea, summary, \[tabindex\]\):focus-visible/);
assert.match(hubCss, /box-shadow: 0 0 0 6px #ffda7b/);
assert.match(hubCss, /\.record-stage \{\s*min-height: 0;\s*aspect-ratio: 4 \/ 3;/);
assert.match(hubCss, /\.record-stage video \{\s*height: 100%;\s*min-height: 0;\s*object-fit: contain;/);
assert.match(hubCss, /\.series-card \{[\s\S]*?width: 100%;[\s\S]*?min-width: 0;[\s\S]*?max-width: 100%;/);
assert.match(hubCss, /\.series-cover \{[\s\S]*?width: 100%;[\s\S]*?min-width: 0;[\s\S]*?max-width: 100%;/);
assert.match(hubCss, /@media \(max-width: 560px\)[\s\S]*?\.series-search input,[\s\S]*?font-size: 16px;/);
assert.match(hubCss, /button,\s*input,\s*select,\s*textarea \{\s*font: inherit;/,
  "Hub form controls must inherit the page typography instead of using undersized browser defaults.");
assert.match(hubCss, /\.series-clear \{[\s\S]*?font-size: 16px;/,
  "The series search clear action must remain readable at the base interactive-text size.");
assert.match(hubCss, /\.story-voice-mood strong \{\s*font-size: 16px;/,
  "Story voice mood choices must keep their primary labels at least 16px.");
assert.match(hubCss, /\.choose-sound-button \{[\s\S]*?font-size: 16px;/,
  "The Choose Sound action must keep its label at least 16px.");
assert.match(voiceCss, /\.voice-source-tabs button \{[\s\S]*?font-size: 16px;/,
  "Voice source filters must keep their labels at least 16px.");
assert.match(voiceCss, /\.voice-card-actions button \{[\s\S]*?font-size: 16px;/,
  "Voice card actions must keep their labels at least 16px.");
assert.match(voiceCss, /html\.theme-night \.voice-picker-panel/);
assert.match(voiceCss, /html\.theme-night \.voice-card\.selected/);
assert.match(voiceCss, /html\.theme-night \.voice-picker-shell[\s\S]*?outline-color: #fff;[\s\S]*?box-shadow: 0 0 0 6px #ffda7b;/,
  "Night-mode voice controls need a clearly visible keyboard focus ring.");

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  return channels
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const background of ["0f7772", "73529d", "8b559f", "176f68", "215f86", "8a5a24"]) {
  assert.ok(contrast("ffffff", background) >= 4.5, `White text contrast on #${background} must be at least 4.5:1.`);
}

console.log("Child hub theme, responsive layout, contrast, and accessibility checks passed.");
