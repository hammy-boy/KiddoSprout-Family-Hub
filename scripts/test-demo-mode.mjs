import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

class StorageMock {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }

  key(index) {
    return [...this.values.keys()][index] ?? null;
  }

  get length() {
    return this.values.size;
  }

  snapshot() {
    return Object.fromEntries(this.values);
  }
}

class ElementMock {
  constructor({ value = "", classes = [] } = {}) {
    this.value = value;
    this.textContent = "";
    this.id = "";
    this.attributes = new Map();
    this.focused = false;
    this.listeners = new Map();
    const classNames = new Set(classes);
    this.classList = {
      add: (...names) => names.forEach((name) => classNames.add(name)),
      remove: (...names) => names.forEach((name) => classNames.delete(name)),
      contains: (name) => classNames.has(name)
    };
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  getAttribute(name) {
    return this.attributes.get(String(name)) ?? null;
  }

  focus() {
    this.focused = true;
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) || []) listener({ type, target: this });
  }
}

function inlineScriptContaining(source, marker) {
  const script = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .find((match) => !/\bsrc\s*=/.test(match[1]) && match[2].includes(marker));
  assert.ok(script, `Missing inline script containing ${marker}.`);
  return script[2];
}

function functionBlock(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `Missing function ${name}.`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start) : -1;
  return source.slice(start, end < 0 ? source.length : end);
}

const [demoSource, authSource, index, app, packageSource, worker, blockerSetup, spending, voiceLibrary, storyTheater, recipes,
  hubGateSource, reportPage, creatorStudio, natureExplorer, moveBreaks, storyStorageSource, storyVoiceChoiceSource, dashboardStyle] = await Promise.all([
  read("demo-mode.js"),
  read("auth-session.js"),
  read("index.html"),
  read("js.js"),
  read("package.json"),
  read("service-worker.js"),
  read("blocker-setup.html"),
  read("app_7.html"),
  read("story-voices.html"),
  read("story-theater.html"),
  read("recipe.html"),
  read("kid-hub-gate.js"),
  read("report_problem.html"),
  read("creator-studio.html"),
  read("nature-explorer.html"),
  read("move-breaks.html"),
  read("story-storage.js"),
  read("story-voice-choice.js"),
  read("style.css")
]);

const realFamily = JSON.stringify({ familyName: "Real family", children: { real: { name: "Real child" } } });
const realSession = JSON.stringify({
  access_token: "real-access-token",
  refresh_token: "real-refresh-token",
  user: { id: "real-user", email: "real@example.test" }
});
const localStorage = new StorageMock({
  kiddosproutState: realFamily,
  kiddosproutSupabaseSession: realSession,
  flavornest_session: realSession
});
const sessionStorage = new StorageMock({ parentUnlocked: "true", unrelated: "keep-me" });
const networkCalls = [];
const windowObject = {
  localStorage,
  sessionStorage,
  KIDDO_SPROUT_SUPABASE: {
    url: "https://example.supabase.co",
    publishableKey: "browser-publishable-key"
  },
  atob: (value) => Buffer.from(value, "base64").toString("binary")
};
const context = vm.createContext({
  window: windowObject,
  fetch: async (...args) => {
    networkCalls.push(args);
    throw new Error("Demo Mode must not fetch account services.");
  },
  console,
  JSON,
  Object,
  String,
  Number,
  Math,
  Date,
  Buffer
});

vm.runInContext(demoSource, context, { filename: "demo-mode.js" });
vm.runInContext(authSource, context, { filename: "auth-session.js" });

const realLocalBefore = localStorage.snapshot();
const nonDemoSessionBefore = {
  parentUnlocked: sessionStorage.getItem("parentUnlocked"),
  unrelated: sessionStorage.getItem("unrelated")
};
const syntheticState = {
  familyName: "Sprout Demo Family",
  parentEmail: "",
  children: { "demo-child": { name: "Demo Child", dateOfBirth: "", emergencyContact: "" } }
};

assert.equal(windowObject.KiddoSproutDemo.start(syntheticState), true);
assert.equal(windowObject.KiddoSproutDemo.active(), true);
assert.deepEqual(
  JSON.parse(JSON.stringify(windowObject.KiddoSproutDemo.read())),
  syntheticState
);
assert.deepEqual(localStorage.snapshot(), realLocalBefore, "Starting the demo changed real localStorage.");
assert.equal(sessionStorage.getItem("parentUnlocked"), nonDemoSessionBefore.parentUnlocked);
assert.equal(sessionStorage.getItem("unrelated"), nonDemoSessionBefore.unrelated);
assert.ok(windowObject.KiddoSproutDemo.keys.active.startsWith("kiddosprout.demo.v1."));
assert.ok(windowObject.KiddoSproutDemo.keys.state.startsWith("kiddosprout.demo.v1."));

const changedState = { ...syntheticState, parentNote: "Changed only in this tab" };
assert.equal(windowObject.KiddoSproutDemo.write(changedState), true);
assert.equal(windowObject.KiddoSproutDemo.read().parentNote, "Changed only in this tab");
assert.deepEqual(localStorage.snapshot(), realLocalBefore);

assert.equal(windowObject.KiddoSproutSession.getSession(), null);
assert.equal(await windowObject.KiddoSproutSession.getAccessToken(), "");
assert.equal(await windowObject.KiddoSproutSession.validate(), null);
assert.equal(await windowObject.KiddoSproutSession.refresh(), null);
windowObject.KiddoSproutSession.clear();
assert.deepEqual(localStorage.snapshot(), realLocalBefore, "Demo session clearing touched a real session.");
assert.equal(networkCalls.length, 0, "Demo Mode made an account request.");

sessionStorage.setItem("kiddosprout.demo.v1.story:bookmark", "2");
sessionStorage.setItem("kiddosprout.demo.v1.storyVoice", "demo-voice");
sessionStorage.setItem("kiddosprout.demo.v1.future-feature", "demo-only");
assert.equal(windowObject.KiddoSproutDemo.reset(syntheticState), true);
assert.equal(windowObject.KiddoSproutDemo.read().parentNote, undefined);
assert.equal(sessionStorage.getItem("kiddosprout.demo.v1.story:bookmark"), null,
  "Resetting demo data must clear tab-only story progress.");
assert.equal(sessionStorage.getItem("kiddosprout.demo.v1.storyVoice"), null,
  "Resetting demo data must clear the tab-only story voice.");
assert.equal(sessionStorage.getItem("kiddosprout.demo.v1.future-feature"), null,
  "Resetting demo data must clear other namespaced demo-only state.");
assert.equal(sessionStorage.getItem("unrelated"), nonDemoSessionBefore.unrelated,
  "Resetting demo data must preserve unrelated session state.");
sessionStorage.setItem("kiddosprout.demo.v1.story:bookmark", "4");
windowObject.KiddoSproutDemo.exit();
assert.equal(windowObject.KiddoSproutDemo.active(), false);
assert.equal(windowObject.KiddoSproutDemo.read(), null);
assert.equal(sessionStorage.getItem(windowObject.KiddoSproutDemo.keys.active), null);
assert.equal(sessionStorage.getItem(windowObject.KiddoSproutDemo.keys.state), null);
assert.equal(sessionStorage.getItem("kiddosprout.demo.v1.story:bookmark"), null,
  "Exiting demo mode must not leave progress that returns in a later demo.");
assert.equal(sessionStorage.getItem("parentUnlocked"), nonDemoSessionBefore.parentUnlocked);
assert.equal(sessionStorage.getItem("unrelated"), nonDemoSessionBefore.unrelated);
assert.deepEqual(localStorage.snapshot(), realLocalBefore, "Exiting the demo changed real localStorage.");
assert.equal(windowObject.KiddoSproutSession.getSession().access_token, "real-access-token");
assert.equal(await windowObject.KiddoSproutSession.getAccessToken(), "real-access-token");

// Protected standalone pages load auth-session.js without the demo helper. The
// namespaced marker alone must still suppress a coexisting real session.
const standaloneLocalStorage = new StorageMock({ kiddosproutSupabaseSession: realSession });
const standaloneSessionStorage = new StorageMock({ "kiddosprout.demo.v1.active": "1" });
const standaloneCalls = [];
const standaloneWindow = {
  localStorage: standaloneLocalStorage,
  sessionStorage: standaloneSessionStorage,
  KIDDO_SPROUT_SUPABASE: windowObject.KIDDO_SPROUT_SUPABASE,
  atob: windowObject.atob
};
const standaloneContext = vm.createContext({
  window: standaloneWindow,
  fetch: async (...args) => { standaloneCalls.push(args); },
  console,
  JSON,
  Object,
  String,
  Number,
  Math,
  Date,
  Buffer
});
vm.runInContext(authSource, standaloneContext, { filename: "auth-session-standalone.js" });
assert.equal(standaloneWindow.KiddoSproutSession.getSession(), null);
assert.equal(await standaloneWindow.KiddoSproutSession.getAccessToken(), "");
assert.equal(await standaloneWindow.KiddoSproutSession.validate(), null);
assert.equal(standaloneCalls.length, 0);
assert.equal(standaloneLocalStorage.getItem("kiddosproutSupabaseSession"), realSession);

// Standalone hub access must use the fictional family in this tab, even when a
// coexisting real family would allow the same app.
const gateRealFamily = JSON.stringify({
  parentAccountCreated: true,
  activeChild: "real",
  children: { real: { name: "Real child", appRules: { studio: "allowed" }, pending: 0 } }
});
const gateDemoFamily = {
  parentAccountCreated: true,
  activeChild: "demo",
  children: { demo: { name: "Demo child", appRules: { explore: "request" }, pending: 0, requests: [] } }
};
const gateLocalStorage = new StorageMock({ kiddosproutState: gateRealFamily });
const gateSessionStorage = new StorageMock();
const gatePage = new ElementMock({ classes: ["hidden"] });
const gateLock = new ElementMock({ classes: ["hidden"] });
const gateTitle = new ElementMock();
const gateMessage = new ElementMock();
const gateDocument = {
  querySelector(selector) {
    return ({
      "[data-hub-page]": gatePage,
      "[data-hub-lock]": gateLock,
      "[data-lock-title]": gateTitle,
      "[data-lock-message]": gateMessage
    })[selector] || null;
  }
};
const gateWindow = {
  localStorage: gateLocalStorage,
  sessionStorage: gateSessionStorage,
  KIDDO_SPROUT_SUPABASE: { publicDemoOnly: false }
};
const gateContext = vm.createContext({
  window: gateWindow,
  document: gateDocument,
  console,
  JSON,
  Object,
  String,
  Number,
  Array
});
vm.runInContext(demoSource, gateContext, { filename: "demo-mode-hub-gate.js" });
assert.equal(gateWindow.KiddoSproutDemo.start(gateDemoFamily), true);
const gateLocalBefore = gateLocalStorage.snapshot();
vm.runInContext(hubGateSource, gateContext, { filename: "kid-hub-gate-session-demo.js" });
assert.equal(gateWindow.KiddoHubGate.protect("studio", "Creator Studio"), false);
assert.equal(gatePage.classList.contains("hidden"), true);
assert.equal(gateLock.classList.contains("hidden"), false);
assert.equal(gateLock.focused, true, "A gated hub did not focus its visible result.");
assert.equal(gateLock.getAttribute("aria-labelledby"), "hub-lock-title");
assert.equal(gateLock.getAttribute("aria-describedby"), "hub-lock-message");
assert.match(gateMessage.textContent, /practice request was saved in this demo tab/i);
assert.equal(gateWindow.KiddoSproutDemo.read().children.demo.pending, 1);
assert.equal(gateWindow.KiddoSproutDemo.read().children.demo.currentRequest[4], "studio");
assert.equal(gateWindow.KiddoSproutDemo.read().children.demo.requests.length, 1);
assert.equal(gateWindow.KiddoHubGate.protect("studio", "Creator Studio"), false);
assert.match(gateMessage.textContent, /already waiting/i);
assert.equal(gateWindow.KiddoSproutDemo.read().children.demo.pending, 1, "Reloading a gated hub duplicated its request.");
assert.equal(gateWindow.KiddoHubGate.protect("explore", "Nature Explorer"), false);
const queuedHubState = gateWindow.KiddoSproutDemo.read().children.demo;
assert.equal(queuedHubState.pending, 2);
assert.equal(queuedHubState.requests.length, 2);
assert.equal(queuedHubState.currentRequest[4], "studio", "A newer hub request overwrote the FIFO head.");
assert.equal(queuedHubState.requests[1][4], "explore");
assert.deepEqual(gateLocalStorage.snapshot(), gateLocalBefore, "The standalone hub gate changed the real family in Demo Mode.");

// Problem reports in Demo Mode must appear only in the fictional family and
// must never mutate a real family record sharing the browser origin.
const reportLocalStorage = new StorageMock({ kiddosproutState: gateRealFamily });
const reportSessionStorage = new StorageMock();
const reportElements = {
  "#status": new ElementMock(),
  "#reportIntro": new ElementMock(),
  "#reportForm": new ElementMock(),
  "#problemText": new ElementMock({ value: "A practice link looked confusing" }),
  "#problemUrgency": new ElementMock({ value: "Today" }),
  "#problemCounter": new ElementMock(),
  "#sendReport": new ElementMock(),
  "#clearReport": new ElementMock()
};
const reportDocument = { querySelector: (selector) => reportElements[selector] || null };
const reportWindow = {
  localStorage: reportLocalStorage,
  sessionStorage: reportSessionStorage,
  KIDDO_SPROUT_SUPABASE: { publicDemoOnly: false }
};
const reportContext = vm.createContext({
  window: reportWindow,
  document: reportDocument,
  console,
  JSON,
  Object,
  String,
  Number,
  Array,
  Date
});
vm.runInContext(demoSource, reportContext, { filename: "demo-mode-report.js" });
assert.equal(reportWindow.KiddoSproutDemo.start({
  ...gateDemoFamily,
  problemReports: [],
  safetyAlerts: []
}), true);
const reportLocalBefore = reportLocalStorage.snapshot();
vm.runInContext(inlineScriptContaining(reportPage, "async function sendReport"), reportContext, { filename: "report-problem-session-demo.js" });
await reportWindow.KiddoSproutProblemReports.ready;
reportElements["#reportForm"].dispatch("submit");
await new Promise((resolve) => setImmediate(resolve));
const reportedDemoFamily = reportWindow.KiddoSproutDemo.read();
assert.equal(reportedDemoFamily.problemReports.length, 1);
assert.equal(reportedDemoFamily.problemReports[0].child, "Demo child");
assert.equal(reportedDemoFamily.safetyAlerts.length, 1);
assert.match(reportElements["#status"].textContent, /saved in this demo tab/i);
assert.match(reportElements["#status"].textContent, /no real parent was contacted/i);
assert.deepEqual(reportLocalStorage.snapshot(), reportLocalBefore, "A demo problem report changed the real family record.");

// Story progress and voice choices share the same tab-only rule. Reading a
// demo story must not import or delete an existing live bookmark/choice.
const storyLocalStorage = new StorageMock({
  kiddosproutLivingInkBookmark: "7",
  kiddosproutStoryVoice: JSON.stringify({ source: "device", id: "real", name: "Real voice" })
});
const storySessionStorage = new StorageMock({ "kiddosprout.demo.v1.active": "1" });
const storyWindow = {
  localStorage: storyLocalStorage,
  sessionStorage: storySessionStorage,
  KIDDO_SPROUT_SUPABASE: { publicDemoOnly: false }
};
const storyContext = vm.createContext({ window: storyWindow, console, JSON, Object, String, Array });
const storyLocalBefore = storyLocalStorage.snapshot();
vm.runInContext(storyStorageSource, storyContext, { filename: "story-storage-session-demo.js" });
assert.equal(storyWindow.KiddoSproutStoryStorage.getItem("kiddosproutLivingInkBookmark"), null);
assert.equal(storyWindow.KiddoSproutStoryStorage.setItem("kiddosproutLivingInkBookmark", "2"), true);
assert.equal(storySessionStorage.getItem("kiddosprout.demo.v1.story:kiddosproutLivingInkBookmark"), "2");
vm.runInContext(storyVoiceChoiceSource, storyContext, { filename: "story-voice-choice-session-demo.js" });
assert.equal(storyWindow.KiddoSproutStoryVoiceChoice.write({ source: "device", id: "demo", name: "Demo voice" }), true);
assert.ok(storySessionStorage.getItem("kiddosprout.demo.v1.storyVoice"));
assert.deepEqual(storyLocalStorage.snapshot(), storyLocalBefore, "Demo story persistence changed live story data.");

const blockedStoryWindow = {
  KIDDO_SPROUT_SUPABASE: { publicDemoOnly: false },
  get localStorage() { throw new Error("storage blocked"); },
  get sessionStorage() { throw new Error("storage blocked"); }
};
const blockedStoryContext = vm.createContext({ window: blockedStoryWindow, console, JSON, Object, String, Array });
vm.runInContext(storyStorageSource, blockedStoryContext, { filename: "story-storage-blocked.js" });
assert.equal(blockedStoryWindow.KiddoSproutStoryStorage.getItem("bookmark"), null);
assert.equal(blockedStoryWindow.KiddoSproutStoryStorage.setItem("bookmark", "1"), false);
assert.equal(blockedStoryWindow.KiddoSproutStoryStorage.storageKey("bookmark"), "",
  "privacy-restricted storage must not break the reader's storage-event handler");

assert.doesNotMatch(demoSource, /localStorage/);
assert.match(index, /id="exploreDemo"[^>]*>Explore Demo<\/button>/);
assert.match(index, /id="demoBanner"[^>]*hidden/);
assert.match(index, /id="resetDemo"/);
assert.match(index, /id="exitDemo"/);
assert.ok(index.indexOf("demo-mode.js") < index.indexOf("auth-session.js"));
assert.doesNotMatch(index, /id="manageChildren"[^>]*data-demo-lock-controls/,
  "The fictional child-profile editor should remain testable in the demo sandbox.");
for (const demoSandboxControl of [
  "passcodeSetting",
  "savePasscodeSetting",
  "secondParentEmailSetting",
  "saveSecondParent",
  "trustedContactsInput",
  "saveTrustedContacts",
  "openAchievementLock"
]) {
  const tag = index.match(new RegExp(`<[^>]+id="${demoSandboxControl}"[^>]*>`))?.[0] || "";
  assert.ok(tag, `Missing expected demo sandbox control #${demoSandboxControl}.`);
  assert.doesNotMatch(tag, /data-demo-protected|\sdisabled(?:\s|>|=)/,
    `#${demoSandboxControl} should be testable with fictional tab-only demo data.`);
}
assert.match(index, /Interactive demo sandbox[\s\S]*?Use made-up details only/i,
  "The unlocked demo profile editor must clearly warn colleagues to use fictional details.");
assert.match(index, /premium voices stay off/i);

const featureFolderTags = [...index.matchAll(/<details class="feature-folder[^"]*"[^>]*>/g)].map(([tag]) => tag);
assert.equal(featureFolderTags.length, 5, "The dashboard must keep all five navigation folders.");
featureFolderTags.forEach((tag) => assert.match(tag, /\sopen(?:\s|>)/,
  "Feature folders must remain open as the desktop/no-JavaScript fallback."));
assert.match(app, /window\.matchMedia\("\(max-width: 900px\)"\)/);
const featureFolderViewportSource = functionBlock(app, "createFeatureFolderViewportController", "syncFeatureFoldersForViewport");
assert.match(featureFolderViewportSource, /mobile:\s*new Map\(folderList\.map\(\(folder\) => \[folder, false\]\)\)/,
  "Mobile navigation folders must start collapsed while desktop folders keep their markup state.");
assert.match(featureFolderViewportSource, /if \(nextMode === currentMode\) return;/,
  "Duplicate media-query callbacks must not overwrite a user's folder choices.");
assert.match(featureFolderViewportSource, /summary\.focus\(\{ preventScroll: true \}\)/,
  "A folder summary must receive focus before focused folder content is collapsed.");

const featureFolderDocument = { activeElement: null };
function makeFeatureFolder(open) {
  const content = {};
  const summary = {
    focusOptions: null,
    focus(options) {
      this.focusOptions = options;
      featureFolderDocument.activeElement = this;
    }
  };
  return {
    open,
    content,
    summary,
    contains(element) {
      return element === summary || element === content;
    },
    querySelector(selector) {
      assert.equal(selector, "summary");
      return summary;
    }
  };
}
const firstFeatureFolder = makeFeatureFolder(true);
const secondFeatureFolder = makeFeatureFolder(false);
const featureFolderController = vm.runInNewContext(`(() => {
  ${featureFolderViewportSource}
  return createFeatureFolderViewportController;
})()`, { Array, Boolean, Map, document: featureFolderDocument }, { filename: "feature-folder-viewport-controller.js" })([
  firstFeatureFolder,
  secondFeatureFolder
]);

featureFolderController.sync({ matches: false });
secondFeatureFolder.open = true;
featureFolderController.sync({ matches: false });
assert.equal(secondFeatureFolder.open, true,
  "A duplicate desktop callback must not reset a folder the user opened.");

featureFolderDocument.activeElement = firstFeatureFolder.content;
featureFolderController.sync({ matches: true });
assert.equal(firstFeatureFolder.open, false);
assert.equal(secondFeatureFolder.open, false);
assert.equal(firstFeatureFolder.summary.focusOptions?.preventScroll, true,
  "Collapsing focused folder content must move focus to its still-visible summary.");

secondFeatureFolder.open = true;
featureFolderController.sync({ matches: true });
assert.equal(secondFeatureFolder.open, true,
  "A duplicate mobile callback must not reset a folder the user opened.");

featureFolderController.sync({ matches: false });
assert.equal(firstFeatureFolder.open, true,
  "Returning to desktop must restore that mode's remembered folder state.");
assert.equal(secondFeatureFolder.open, true,
  "The latest desktop folder choice must survive a mobile round trip.");

featureFolderController.sync({ matches: true });
assert.equal(firstFeatureFolder.open, false);
assert.equal(secondFeatureFolder.open, true,
  "Returning to mobile must restore that mode's independent folder state.");

const requestHelpers = vm.runInNewContext(`(() => {
  ${functionBlock(app, "emptyPendingRequest", "normalizeAppRules")}
  return { syncPendingRequests, enqueuePendingRequest, takePendingRequest };
})()`, { JSON, Math, Number, String, Array }, { filename: "dashboard-request-helpers.js" });
const firstRequest = ["First app", "First request", "F", "appDownload"];
const secondRequest = ["Extra Time", "Extra time request", "+", "extraTime"];
const legacyRequestState = { pending: 9, currentRequest: firstRequest };
assert.equal(requestHelpers.syncPendingRequests(legacyRequestState)[0], "First app");
assert.equal(legacyRequestState.pending, 1, "Legacy phantom counts must collapse to the one recoverable request.");
assert.equal(requestHelpers.enqueuePendingRequest(legacyRequestState, secondRequest), true);
assert.equal(legacyRequestState.pending, 2);
assert.equal(requestHelpers.takePendingRequest(legacyRequestState)[0], "First app");
assert.equal(legacyRequestState.currentRequest[0], "Extra Time", "Pending requests must be handled FIFO.");
assert.equal(requestHelpers.takePendingRequest(legacyRequestState)[0], "Extra Time");
assert.equal(requestHelpers.takePendingRequest(legacyRequestState), null, "A resolved request must not be replayable.");
assert.equal(legacyRequestState.pending, 0);
assert.deepEqual(JSON.parse(JSON.stringify(legacyRequestState.currentRequest)), ["No request", "No pending request", "-"]);

const connectedHubRequest = ["Creator Studio", "Connected hub request", "C", "appAccess", "studio"];
const connectedHubState = {
  requests: [firstRequest],
  pending: 2,
  currentRequest: connectedHubRequest
};
requestHelpers.syncPendingRequests(connectedHubState);
assert.equal(connectedHubState.pending, 2, "A request written by a connected page must join the dashboard queue.");
assert.equal(connectedHubState.requests[1][4], "studio");

const scheduleHelpers = vm.runInNewContext(`(() => {
  ${functionBlock(app, "normalizeScheduleTime", "renderParentNote")}
  return { normalizeScheduleTime, isNowInsideRange, isBedtimeWindowActive };
})()`, {
  state: { schedule: { bedtimeStart: "20:30", bedtimeEnd: "07:00" } },
  Date, Number, String, Boolean
}, { filename: "dashboard-schedule-helpers.js" });
const at = (hours, minutes) => new Date(2026, 0, 2, hours, minutes, 0, 0);
assert.equal(scheduleHelpers.isNowInsideRange("08:45", "15:15", at(8, 45)), true, "Schedule start is inclusive.");
assert.equal(scheduleHelpers.isNowInsideRange("08:45", "15:15", at(15, 15)), false, "Schedule end is exclusive.");
assert.equal(scheduleHelpers.isNowInsideRange("20:30", "07:00", at(20, 30)), true, "Overnight start is inclusive.");
assert.equal(scheduleHelpers.isNowInsideRange("20:30", "07:00", at(6, 59)), true);
assert.equal(scheduleHelpers.isNowInsideRange("20:30", "07:00", at(7, 0)), false, "Overnight end is exclusive.");
assert.equal(scheduleHelpers.isNowInsideRange("20:30", "20:30", at(20, 30)), false, "Equal times represent an empty window.");
assert.equal(scheduleHelpers.isNowInsideRange("not-a-time", "07:00", at(1, 0)), false);
assert.equal(scheduleHelpers.isBedtimeWindowActive({ bedtime: false }, at(21, 0)), false);
assert.equal(scheduleHelpers.isBedtimeWindowActive({ bedtime: true }, at(21, 0)), true);

const timeFormatters = vm.runInNewContext(`(() => {
  ${functionBlock(app, "formatMinutes", "decorateRange")}
  return { formatMinutes, formatClock };
})()`, { Math, Number, String }, { filename: "dashboard-time-formatters.js" });
assert.equal(timeFormatters.formatMinutes(Number.NaN), "0m");
assert.equal(timeFormatters.formatMinutes(-15), "0m");
assert.equal(timeFormatters.formatClock(Number.NaN), "0:00");
assert.equal(timeFormatters.formatClock(-1), "0:00");

assert.match(index, /id="bedtimeScheduleSummary"/);
assert.match(index, /Daily allowance setting/);
assert.doesNotMatch(index, /Screen time left/);
assert.doesNotMatch(index + app, /Only emergency phone calls|Emergency calls stay available when locked|Device Locked/);
assert.match(functionBlock(app, "renderPendingRequest", "renderNoChildState"), /approveButton\.disabled = !request/);
assert.match(functionBlock(app, "renderPendingRequest", "renderNoChildState"), /request\?\.\[3\] === "appDownload" \? "parent\.review" : "parent\.approve"/,
  "Synthetic download requests must offer a truthful review action, not claim an app can be installed.");
assert.match(functionBlock(app, "renderPendingRequest", "renderNoChildState"), /blockButton\.disabled = !request/);
assert.match(functionBlock(app, "renderPendingRequest", "renderNoChildState"), /blockButton\.dataset\.i18n = key/,
  "Request action wording must stay correct when the dashboard language changes.");
assert.match(functionBlock(app, "approveCurrentRequest", "declineCurrentRequest"), /if \(!request\) return null;[\s\S]*takePendingRequest\(child\)/);
assert.match(functionBlock(app, "approveCurrentRequest", "declineCurrentRequest"), /Math\.min\(300, child\.dailyLimit \+ 15\)/,
  "Extra-time approvals must respect the dashboard slider's five-hour maximum.");
assert.match(functionBlock(app, "declineCurrentRequest"), /if \(!request\) return null;[\s\S]*takePendingRequest\(child\)/);
assert.match(functionBlock(app, "resolveCreatorQueueRequest", "approveCurrentRequest"), /findIndex\([\s\S]*splice\(matchingIndex, 1\)/);
const resolveCreatorQueueRequest = vm.runInNewContext(`(() => {
  ${functionBlock(app, "resolveCreatorQueueRequest", "approveCurrentRequest")}
  return resolveCreatorQueueRequest;
})()`, { Array, String }, { filename: "dashboard-creator-queue.js" });
const creatorQueueState = { creatorQueue: ["Newest clip", "Earlier clip"] };
resolveCreatorQueueRequest(creatorQueueState, ["Creator Clip", "Review", "C", "creatorReview", "Earlier clip"]);
assert.deepEqual(JSON.parse(JSON.stringify(creatorQueueState.creatorQueue)), ["Newest clip"],
  "Connected Creator Studio reviews must resolve the matching title rather than an unrelated first item.");
assert.match(functionBlock(app, "approveCurrentRequest", "declineCurrentRequest"), /kind === "creatorUpload" \|\| kind === "creatorReview"/);
assert.match(functionBlock(app, "declineCurrentRequest"), /kind === "creatorUpload" \|\| kind === "creatorReview"/,
  "Both embedded and connected Creator Studio requests must resolve their matching review item.");
assert.match(app, /request marked reviewed for [\s\S]*No app was installed or allowed by this dashboard/);
assert.doesNotMatch(functionBlock(app, "toggleHomeworkMode", "saveWellbeingGoals"), /streaks\.homework/,
  "Turning on a parent control must not award a child a homework streak.");
assert.match(functionBlock(app, "completeFocusSession", "sendParentChat"), /stopFocusTimer\(\)/,
  "Completing a focus session must stop its live interval before resetting the clock.");
assert.match(functionBlock(app, "startFocusSession", "resetFocusSession"), /focusDeadline = Date\.now\(\) \+ focusSeconds \* 1000/);
assert.match(functionBlock(app, "startFocusSession", "resetFocusSession"), /Math\.ceil\(\(focusDeadline - Date\.now\(\)\) \/ 1000\)/,
  "Focus countdowns must use elapsed wall time when browser timers are delayed.");
assert.match(functionBlock(app, "renderProfiles", "renderReport"), /const childId = button\.dataset\.child;[\s\S]*state\.activeChild !== childId\) abandonFocusSession\(\)/,
  "Switching profiles must not let an in-flight focus timer complete for the wrong child.");
assert.match(functionBlock(app, "setMode", "unlockParent"), /viewMode === "child" && mode !== "child"\) abandonFocusSession\(\)/,
  "Leaving Child Site must stop its otherwise-hidden focus timer.");
assert.match(functionBlock(app, "scheduleNextDashboardMinute", "updateKidAvatarPreview"), /refreshTimeSensitiveDashboard\(\)/);
assert.match(functionBlock(app, "refreshTimeSensitiveDashboard", "scheduleNextDashboardMinute"), /syncInputs: false/,
  "Minute-boundary refreshes must not overwrite unsaved schedule inputs.");
assert.match(functionBlock(app, "renderControls", "openApp"), /renderFamilySchedule\(\{ syncInputs: false \}\)/,
  "Child-state updates must not overwrite schedule edits that a parent has not saved yet.");
assert.match(functionBlock(app, "saveSchedule", "exportWeeklySummary"), /renderFamilySchedule\(\);[\s\S]*renderBedtimeStatus\(child\)/,
  "Saving a schedule must sync fallback values back to inputs and refresh bedtime status immediately.");
assert.match(functionBlock(app, "setChildControlsDisabled", "renderNoChildState"), /#parentHomeworkToggle/);
assert.match(dashboardStyle, /\.request-actions\s*\{[^}]*flex-wrap: wrap;/s,
  "Request actions must wrap instead of overflowing narrow dashboard cards.");
assert.match(functionBlock(app, "exportWeeklySummary", "stopFocusTimer"), /bedtimeScheduleEnabled:[\s\S]*bedtimeWindowActive:/);
assert.doesNotMatch(functionBlock(app, "exportWeeklySummary", "stopFocusTimer"), /bedtimeLocked:/,
  "Exports must not describe a schedule-only status as a device lock.");
assert.match(functionBlock(app, "exportWeeklySummary", "stopFocusTimer"), /usageTracking: "This dashboard does not measure device-wide usage\."/);
assert.doesNotMatch(functionBlock(app, "renderControls", "openApp"), /dailyLimit - child\.usedToday/,
  "The dashboard must not present an unmeasured device-usage value as remaining screen time.");

const heroChildModeButton = index.match(/<button[^>]*id="heroChildMode"[^>]*>/)?.[0] || "";
assert.match(heroChildModeButton, /class="[^"]*parent-only[^"]*"/,
  "The already-open child site must hide its redundant Child Mode action.");
assert.match(index, /id="heroDescription"[^>]*data-i18n="hero\.parent\.description"/);
assert.match(functionBlock(app, "applyModeLanguage", "applyDynamicLanguageText"),
  /childMode \? "hero\.child\.description" : "hero\.parent\.description"/,
  "Child mode must replace the parent-oriented hero description.");

assert.doesNotMatch(index, /Final Smart Spending|Open the final Smart Spending app/i);
assert.doesNotMatch(app, /Future app slot|Your final Smart Spending app/i);
assert.match(index, /<strong>Smart Spending<\/strong>[\s\S]*?safe money challenge/i);
assert.match(app, /title: "Money mission"[\s\S]*?save, spend, or share/);

const todayPlanRenderer = functionBlock(app, "renderTodayPlan", "renderAppAccessRules");
assert.match(todayPlanRenderer, /disabled aria-disabled=\\"true\\"/,
  "Completed Today Plan controls must use native disabled semantics.");
assert.match(todayPlanRenderer, /querySelectorAll\("\[data-task\]:not\(:disabled\)"\)/,
  "Completed Today Plan controls must not receive an active click handler.");

for (const href of ["app_7.html", "recipe.html", "blocker-setup.html", "report_problem.html"]) {
  const matchingAnchors = [...index.matchAll(new RegExp(`<a[^>]+href="${href}"[^>]*>`, "g"))];
  assert.ok(matchingAnchors.length > 0, `Missing expected ${href} link.`);
  matchingAnchors.forEach(([anchor]) => assert.match(anchor, /data-demo-protected=/));
}

const blockerPreviewLinks = [...index.matchAll(/<a[^>]+href="blocker-setup\.html"[^>]*>/g)];
assert.equal(blockerPreviewLinks.length, 2);
blockerPreviewLinks.forEach(([anchor]) => {
  assert.match(anchor, /data-public-demo-preview/);
  assert.match(anchor, /data-public-demo-label="[^"]*Preview/i);
});

for (const appId of ["spending", "recipe"]) {
  const connectedPreview = index.match(new RegExp(`<a[^>]+data-open-app-link="${appId}"[^>]*>`))?.[0] || "";
  assert.match(connectedPreview, /data-public-demo-preview/,
    `${appId} must remain clickable as a safe connected-app preview in Demo Mode.`);
  assert.match(connectedPreview, /data-demo-preview-title="[^"]+"/);
}

const saveState = functionBlock(app, "saveState", "cleanBrandText");
assert.match(saveState, /isDemoMode\(\)/);
assert.match(saveState, /KiddoSproutDemo\.write\(state\)/);
assert.match(saveState, /persistSafeFamilyPreferences\(state\)/);
assert.match(saveState, /familyStateApi\.save\(snapshot, \{ expectedOwnerId: ownerId \}\)/,
  "Family settings must be written only to the verified session owner's cloud row.");
assert.doesNotMatch(saveState, /localStorage\.setItem\("kiddosproutState"/,
  "Real family details must not return to persistent plaintext browser storage.");
assert.match(functionBlock(app, "getKiddoSession", "hasKiddoSession"), /if \(isDemoMode\(\)\) return null/);
assert.match(functionBlock(app, "kiddoAuthRequest", "kiddoAuthRedirectUrl"), /Live account actions are unavailable in Demo Mode/);
assert.match(functionBlock(app, "broadcastExtensionBlockRules", "formatMinutes"), /if \(isDemoMode\(\)\) return/);
assert.match(functionBlock(app, "setMode", "unlockParent"), /!demoMode && !hasKiddoSession\(\)/);
const childHubLauncher = functionBlock(app, "openApp", "openLinkedApp");
assert.match(childHubLauncher, /if \(hubPages\[app\]\) \{\s*window\.location\.href = hubPages\[app\];\s*return;/,
  "Allowed Kid Hubs must open their complete standalone pages in real and demo modes.");
assert.doesNotMatch(childHubLauncher, /hubPages\[app\] && !isDemoMode\(\)/,
  "Demo Mode must not fall back to stale inline placeholders for completed Kid Hubs.");
assert.match(index, /The demo opens the full series shelf and reader; premium voices stay off\./,
  "The Story Theater demo note must describe the complete series reader now opened by its Launch button.");
assert.doesNotMatch(index, /The demo opens an inline story preview/,
  "The child site must not advertise the retired inline story placeholder.");
assert.match(app, /KiddoSproutDemo\.read\(\) \|\| createDemoState\(\)/);
const resetDemoModeSource = functionBlock(app, "resetDemoMode", "exitDemoMode");
assert.match(resetDemoModeSource, /if \(!window\.KiddoSproutDemo\?\.reset\?\.\(resetState\)\) \{[\s\S]*?Demo data could not be reset/,
  "A failed demo reset must be reported instead of pretending it succeeded.");
assert.ok(resetDemoModeSource.indexOf("reset?.(resetState)") < resetDemoModeSource.indexOf("state = resetState"),
  "The visible dashboard must not adopt reset data until tab storage accepts it.");
assert.match(app, /if \(isDemoMode\(\)\) \{\s*familyStateBootstrapping = false;\s*setMode\(viewMode, \{ unlocked: true, quiet: true, replaceHistory: true \}\)/,
  "Demo Mode must finish family-state bootstrapping and replace a corrected startup route before opening the isolated demo dashboard.");
assert.match(app, /addEventListener\("click", \(event\) => \{[\s\S]*?data-demo-protected[\s\S]*?\}, true\)/);
assert.match(app, /if \(protectedTarget\.hasAttribute\("data-public-demo-preview"\)\) return/);
assert.match(functionBlock(app, "openLinkedApp", "completeTask"),
  /if \(isDemoMode\(\)\) \{\s*if \(link\.hasAttribute\("data-public-demo-preview"\)\) return;/);
assert.doesNotMatch(functionBlock(app, "createDemoState", "demoBlockedMessage"), /@[a-z0-9.-]+/i);
assert.match(worker, /"\/demo-mode\.js"/);
assert.match(packageSource, /"test:demo": "node scripts\/test-demo-mode\.mjs"/);
for (const protectedPage of [blockerSetup, spending, voiceLibrary, storyTheater]) {
  assert.match(protectedPage, /auth-session\.js\?v=7/);
}
for (const standaloneHub of [creatorStudio, natureExplorer, moveBreaks, voiceLibrary, storyTheater]) {
  assert.ok(standaloneHub.indexOf("supabase-config.js") < standaloneHub.indexOf("demo-mode.js"));
  assert.ok(standaloneHub.indexOf("demo-mode.js") < standaloneHub.indexOf("kid-hub-gate.js"));
}
assert.ok(reportPage.indexOf("supabase-config.js") < reportPage.indexOf("demo-mode.js"));
assert.ok(reportPage.indexOf("demo-mode.js") < reportPage.indexOf("function demoActive"));
assert.match(functionBlock(creatorStudio, "sendParentReview"), /KiddoHubGate\.readState\(\)/);
assert.match(functionBlock(creatorStudio, "sendParentReview"), /KiddoHubGate\.writeState\(family\)/);
assert.doesNotMatch(functionBlock(creatorStudio, "sendParentReview"), /localStorage/);
assert.ok(storyTheater.indexOf("story-storage.js") < storyTheater.indexOf("KiddoHubGate.protect"));
assert.match(functionBlock(storyTheater, "loadBookState", "setSeriesSelected"), /storyStorage\.getItem/);
assert.match(functionBlock(storyTheater, "loadBookState", "setSeriesSelected"), /storyStorage\.setItem/);
assert.doesNotMatch(functionBlock(storyTheater, "loadBookState", "setSeriesSelected"), /localStorage/);
assert.match(functionBlock(storyTheater, "storySessionToken", "setReadAloudUi"), /storyStorage\.demoActive\(\)/);
assert.match(storyVoiceChoiceSource, /if \(!demoActive\(\)\) \{[\s\S]*?localStorage\.removeItem\(LEGACY_KEY\)/);
assert.match(recipes, /KIDDO_DEMO_ACTIVE_KEY = "kiddosprout\.demo\.v1\.active"/);
assert.match(recipes, /if \(isKiddoSproutDemoMode\(\)\) \{\s*startReadOnlyRecipeBrowse\(\);/);
assert.match(recipes, /Interactive demo recipe book:[\s\S]*?Changes stay only in this tab; accounts and cloud syncing remain off/);
assert.match(recipes, /RECIPE_DEMO_STORAGE_KEY = "kiddosprout\.demo\.v1\.flavornest-recipes"/);
assert.match(functionBlock(recipes, "writeDemoRecipes", "mergeDemoRecipes"), /sessionStorage\.setItem\(RECIPE_DEMO_STORAGE_KEY/);
assert.doesNotMatch(functionBlock(recipes, "startReadOnlyRecipeBrowse", "clearAuthCallbackUrl"), /fetch\(|getRecipeCloudClient|restoreSession/);
assert.ok(recipes.indexOf("if (isKiddoSproutDemoMode())") < recipes.lastIndexOf("restoreSession();"));

assert.match(spending, /const READ_ONLY_DEMO = PUBLIC_DEMO_ONLY \|\| SESSION_DEMO_ACTIVE/);
assert.match(functionBlock(spending, "loadState", "normalizePracticeState"), /if \(READ_ONLY_DEMO\)[\s\S]*?readDemoPracticeRecord\(\) \|\| freshPracticeState\(\)/);
const spendingSave = functionBlock(spending, "save", "showToast");
assert.match(spendingSave, /if \(READ_ONLY_DEMO\)[\s\S]*?sessionStorage\.setItem\(DEMO_STORAGE_KEY[\s\S]*?return;[\s\S]*?localStorage\.setItem/);
assert.match(spending, /const DEMO_STORAGE_KEY = "kiddosprout\.demo\.v1\.smart-spending"/);
assert.match(spending, /currency: "GBP"/);
assert.match(functionBlock(spending, "canOpenKiddoSproutApp", "addHistory"), /if \(READ_ONLY_DEMO\) return true;/);
assert.match(functionBlock(spending, "apiPost", "loadPlaid"), /if \(READ_ONLY_DEMO\)[\s\S]*?throw new Error[\s\S]*?fetch\(/);
const spendingFamilyLoader = functionBlock(spending, "fetchVerifiedFamily", "enqueueDashboardRequest");
assert.match(spendingFamilyLoader, /sessionApi\.validate\(\)[\s\S]*?familyApi\.load\(\{ expectedOwnerId: ownerId \}\)/,
  "Real Smart Spending must validate the parent before loading the owner-scoped family row.");
assert.match(spendingFamilyLoader, /familyMatchesSession\(family, session, ownerId\)/,
  "Real Smart Spending must reject a family row that does not match the verified parent.");
const spendingStarter = functionBlock(spending, "startApp");
const spendingDemoBranch = spendingStarter.indexOf("if (READ_ONLY_DEMO)");
const spendingFamilyFetch = spendingStarter.indexOf("context = await fetchVerifiedFamily()");
assert.ok(spendingDemoBranch >= 0 && spendingFamilyFetch > spendingDemoBranch,
  "Smart Spending must enter its isolated demo branch before any auth or family-cloud request.");
assert.match(functionBlock(spending, "connectPracticeBank", "togglePracticeBankBalances"), /READ_ONLY_DEMO[\s\S]*?freshDemoBankStatus\(\)[\s\S]*?renderBank\(\)/);
assert.doesNotMatch(functionBlock(spending, "connectPracticeBank", "setAppAccessReady"), /fetch\(|apiPost\(|loadPlaid\(|localStorage/,
  "the fictional practice-bank journey must not touch a provider, API, or persistent storage");
assert.match(spendingStarter.slice(spendingDemoBranch, spendingFamilyFetch), /render\(\);\s*return;/,
  "The Smart Spending demo branch must finish without falling through to real account access.");
assert.match(spendingStarter.slice(spendingFamilyFetch), /verifiedOwnerId = context\.ownerId;[\s\S]*?PRACTICE_SCOPE = currentPracticeScope\(\);[\s\S]*?state = normalizePracticeState\(loadState\(\)\)/,
  "Real Smart Spending practice data must be scoped only after the verified owner and child are known.");

new Function(demoSource);
new Function(authSource);
new Function(app);
new Function(hubGateSource);
new Function(storyStorageSource);
new Function(storyVoiceChoiceSource);
new Function(inlineScriptContaining(reportPage, "function sendReport"));

console.log("Demo Mode passed: synthetic state is tab-scoped, real data is preserved, and account tokens/network calls are suppressed.");
