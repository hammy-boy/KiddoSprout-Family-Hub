import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const [html, index] = await Promise.all([
  readFile(new URL("report_problem.html", root), "utf8"),
  readFile(new URL("index.html", root), "utf8")
]);

function inlineScriptContaining(source, marker) {
  const script = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .find((match) => !/\bsrc\s*=/.test(match[1]) && match[2].includes(marker));
  assert.ok(script, `Missing inline script containing ${marker}.`);
  return script[2];
}

class StorageMock {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
    this.writes = [];
  }
  getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
  setItem(key, value) {
    this.writes.push([String(key), String(value)]);
    this.values.set(String(key), String(value));
  }
  removeItem(key) { this.values.delete(String(key)); }
  snapshot() { return Object.fromEntries(this.values); }
}

class ElementMock {
  constructor(value = "") {
    this.value = value;
    this.textContent = "";
    this.dataset = {};
    this.disabled = false;
    this.listeners = new Map();
    this.attributes = new Map();
    this.focused = false;
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  setAttribute(name, value) { this.attributes.set(String(name), String(value)); }
  getAttribute(name) { return this.attributes.get(String(name)) ?? null; }
  focus() { this.focused = true; }
  async dispatch(type) {
    const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const listener of this.listeners.get(type) || []) await listener(event);
    return event;
  }
}

function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

async function harness(state, options = {}) {
  const {
    demo = false,
    publicDemoOnly = false,
    text = "",
    urgency = "Needs help now",
    hour = 12,
    session = { access_token: "access", user: { id: "00000000-0000-4000-8000-000000000001", email: "parent@example.test" } },
    sessionSequence = null,
    loadError = null,
    saveError = null
  } = options;
  const elements = {
    "#status": new ElementMock(),
    "#reportIntro": new ElementMock(),
    "#reportForm": new ElementMock(),
    "#problemText": new ElementMock(text),
    "#problemUrgency": new ElementMock(urgency),
    "#problemCounter": new ElementMock(),
    "#sendReport": new ElementMock(),
    "#clearReport": new ElementMock()
  };
  const legacyFamily = JSON.stringify({ activeChild: "attacker", children: { attacker: { name: "Local attacker" } } });
  const localStorage = new StorageMock({
    kiddosproutState: legacyFamily,
    kiddosproutPreferences: JSON.stringify({ themeMode: options.themeMode || "auto" })
  });
  const sessionStorage = new StorageMock(demo && state ? {
    "kiddosprout.demo.v1.active": "1",
    "kiddosprout.demo.v1.family": JSON.stringify(state)
  } : {});
  const nightClasses = new Set();
  const calls = { validate: 0, load: 0, loadOptions: null, save: 0, saveOptions: null, saved: null };
  const document = {
    visibilityState: "visible",
    documentElement: {
      dataset: {},
      classList: {
        toggle(name, force) {
          if (force) nightClasses.add(name);
          else nightClasses.delete(name);
        }
      }
    },
    querySelector: (selector) => elements[selector] || null,
    addEventListener() {}
  };
  const demoApi = demo ? {
    active: () => true,
    read: () => {
      const value = sessionStorage.getItem("kiddosprout.demo.v1.family");
      return value ? JSON.parse(value) : null;
    },
    write: (value) => {
      sessionStorage.setItem("kiddosprout.demo.v1.family", JSON.stringify(value));
      return true;
    }
  } : undefined;
  const window = {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly },
    KiddoSproutDemo: demoApi,
    KiddoSproutSession: {
      async validate() {
        calls.validate += 1;
        const value = Array.isArray(sessionSequence) && sessionSequence.length
          ? sessionSequence[Math.min(calls.validate - 1, sessionSequence.length - 1)]
          : session;
        return copy(value);
      }
    },
    KiddoSproutFamilyState: {
      async load(loadOptions) {
        calls.load += 1;
        calls.loadOptions = copy(loadOptions);
        if (loadError) throw loadError;
        return copy(state);
      },
      async save(value, saveOptions) {
        calls.save += 1;
        calls.saved = copy(value);
        calls.saveOptions = copy(saveOptions);
        if (saveError) throw saveError;
        return copy(value);
      }
    },
    localStorage,
    sessionStorage,
    setInterval() { return 1; },
    addEventListener() {}
  };
  class DateAtHour extends Date { getHours() { return hour; } }
  vm.runInNewContext(inlineScriptContaining(html, "async function sendReport"), {
    window, document, console, JSON, Object, String, Number, Array,
    Date: DateAtHour, Math, Set, Promise
  }, { filename: "report-problem.js" });
  await window.KiddoSproutProblemReports.ready;
  return { calls, elements, localStorage, sessionStorage, nightClasses, legacyFamily };
}

assert.match(html, /class="mark"[^>]*width="128" height="128"[^>]*decoding="async"/);
assert.match(html, /<form id="reportForm" aria-describedby="reportIntro" aria-busy="true">/);
assert.match(html, /<html lang="en-GB">/);
assert.ok(html.indexOf('<meta charset="utf-8">') < html.indexOf("<script"));
assert.match(html, /<meta name="color-scheme" content="light dark">/);
assert.match(html, /<meta name="theme-color" content="#f7fff6">/);
assert.match(html, /textarea[^>]+maxlength="2000"[^>]+required/);
assert.match(html, /textarea[^>]+spellcheck="true"[^>]+disabled/);
assert.match(html, /id="sendReport" type="submit" disabled/);
assert.match(html, /aria-live="polite" aria-atomic="true">Checking family access…/);
assert.match(html, /html\.theme-night body/);
assert.match(html, /auth-session\.js\?v=7/);
assert.match(html, /family-state-cloud\.js\?v=2/);
assert.ok(html.indexOf("auth-session.js?v=7") < html.indexOf("family-state-cloud.js?v=2"));
assert.doesNotMatch(html, /localStorage\.(?:getItem|setItem)\(["']kiddosproutState["']/,
  "Problem Reports must never trust or persist a real family through localStorage.");
assert.match(html, /KiddoSproutSession\.validate\(\)/);
assert.match(html, /KiddoSproutFamilyState\.load\(\{ expectedOwnerId: ownerId \}\)/);
assert.match(html, /KiddoSproutFamilyState\.save\(state, \{ expectedOwnerId: reportOwnerId \}\)/);
assert.match(html, /function currentChildIdentity\(state\)[\s\S]*?Object\.prototype\.hasOwnProperty\.call\(children, childId\)/,
  "Problem reports must bind to an owned child profile instead of following prototype properties or a display name.");
assert.match(html, /setAttribute\?\.\("aria-busy", String\(Boolean\(busy\)\)\)/);
const reportLink = index.match(/<a[^>]+href="report_problem\.html"[^>]*>Open Report Page<\/a>/)?.[0] || "";
assert.match(reportLink, /data-public-demo-preview/);
assert.doesNotMatch(reportLink, /target="_blank"/);

const oldReports = Array.from({ length: 120 }, (_, index) => ({ id: `old-${index}` }));
const oldAlerts = Array.from({ length: 120 }, (_, index) => ({ message: `old-${index}` }));
const usable = await harness({
  activeChild: "child-1",
  children: { "child-1": { name: "Alex" } },
  problemReports: oldReports,
  safetyAlerts: oldAlerts
}, { text: "  A page would not open.  ", urgency: "tampered-value", themeMode: "night" });
assert.equal(usable.calls.validate, 1);
assert.equal(usable.calls.load, 1);
assert.equal(usable.calls.loadOptions.expectedOwnerId, "00000000-0000-4000-8000-000000000001");
assert.equal(usable.elements["#sendReport"].disabled, false);
assert.equal(usable.elements["#reportForm"].getAttribute("aria-busy"), "false");
assert.equal(usable.nightClasses.has("theme-night"), true);
const localBeforeSubmit = usable.localStorage.snapshot();
const submitEvent = await usable.elements["#reportForm"].dispatch("submit");
assert.equal(submitEvent.defaultPrevented, true);
assert.equal(usable.calls.validate, 2, "A report save must confirm that the same parent still owns this tab session.");
assert.equal(usable.calls.save, 1);
assert.equal(usable.calls.saveOptions.expectedOwnerId, "00000000-0000-4000-8000-000000000001");
assert.equal(usable.calls.saved.problemReports.length, 100);
assert.equal(usable.calls.saved.safetyAlerts.length, 100);
assert.equal(usable.calls.saved.problemReports[0].childId, "child-1");
assert.equal(usable.calls.saved.problemReports[0].child, "Alex");
assert.equal(usable.calls.saved.safetyAlerts[0].childId, "child-1");
assert.equal(usable.calls.saved.problemReports[0].note, "A page would not open.");
assert.equal(usable.calls.saved.problemReports[0].urgency, "Today");
assert.match(usable.calls.saved.problemReports[0].id, /^report-/);
assert.match(usable.calls.saved.problemReports[0].createdAt, /^\d{4}-\d{2}-\d{2}T/);
assert.deepEqual(usable.localStorage.snapshot(), localBeforeSubmit);
assert.equal(usable.elements["#problemText"].value, "");
assert.equal(usable.elements["#problemCounter"].textContent, "0 / 2000");
assert.equal(usable.elements["#status"].dataset.state, "success");

const signedOut = await harness({
  activeChild: "child-1", children: { "child-1": { name: "Alex" } }
}, { session: null, text: "Should not send" });
assert.equal(signedOut.calls.load, 0);
assert.equal(signedOut.calls.save, 0);
assert.equal(signedOut.elements["#sendReport"].disabled, true);
assert.match(signedOut.elements["#status"].textContent, /parent must log in/i);

const inheritedChild = await harness({
  activeChild: "constructor",
  children: {}
}, { text: "Must not be assigned to a prototype property" });
assert.equal(inheritedChild.calls.save, 0);
assert.equal(inheritedChild.elements["#sendReport"].disabled, true);
assert.match(inheritedChild.elements["#status"].textContent, /choose a child profile/i);

const failedSave = await harness({
  activeChild: "child-1", children: { "child-1": { name: "Alex" } }
}, { text: "Please keep this text", saveError: new Error("offline") });
await failedSave.elements["#reportForm"].dispatch("submit");
assert.equal(failedSave.elements["#problemText"].value, "Please keep this text");
assert.equal(failedSave.elements["#status"].dataset.state, "error");
assert.equal(failedSave.elements["#sendReport"].disabled, false);

const firstOwnerSession = {
  access_token: "first-access",
  user: { id: "00000000-0000-4000-8000-000000000001", email: "first@example.test" }
};
const secondOwnerSession = {
  access_token: "second-access",
  user: { id: "00000000-0000-4000-8000-000000000002", email: "second@example.test" }
};
const changedOwner = await harness({
  activeChild: "child-1", children: { "child-1": { name: "Alex" } }
}, { text: "Do not copy this family", sessionSequence: [firstOwnerSession, secondOwnerSession] });
await changedOwner.elements["#reportForm"].dispatch("submit");
assert.equal(changedOwner.calls.save, 0, "A family report crossed into a different parent account.");
assert.equal(changedOwner.elements["#sendReport"].disabled, true);
assert.match(changedOwner.elements["#status"].textContent, /login changed or expired/i);

const conflictError = new Error("changed elsewhere");
conflictError.kind = "conflict";
const changedDashboard = await harness({
  activeChild: "child-1", children: { "child-1": { name: "Alex" } }
}, { text: "Keep this while reloading", saveError: conflictError });
await changedDashboard.elements["#reportForm"].dispatch("submit");
assert.equal(changedDashboard.elements["#sendReport"].disabled, true);
assert.equal(changedDashboard.elements["#problemText"].value, "Keep this while reloading");
assert.match(changedDashboard.elements["#status"].textContent, /changed in another tab/i);

const tooLong = await harness({
  activeChild: "child-1", children: { "child-1": { name: "Alex" } }
}, { text: "x".repeat(2001) });
await tooLong.elements["#reportForm"].dispatch("submit");
assert.equal(tooLong.calls.save, 0);
assert.equal(tooLong.elements["#status"].dataset.state, "error");
assert.equal(tooLong.elements["#problemText"].focused, true);

const corrupt = await harness({
  activeChild: "child-1",
  children: { "child-1": { name: "Alex" } },
  problemReports: "not-an-array",
  safetyAlerts: { bad: true }
}, { text: "Something confusing happened." });
await assert.doesNotReject(corrupt.elements["#reportForm"].dispatch("submit"));
assert.equal(corrupt.calls.saved.problemReports.length, 1);
assert.equal(corrupt.calls.saved.safetyAlerts.length, 1);

const demo = await harness({
  activeChild: "demo-child",
  children: { "demo-child": { name: "Demo child" } },
  problemReports: [], safetyAlerts: []
}, { demo: true, text: "A practice report" });
const demoLocalBefore = demo.localStorage.snapshot();
await demo.elements["#reportForm"].dispatch("submit");
assert.equal(demo.calls.validate, 0);
assert.equal(demo.calls.load, 0);
assert.equal(demo.calls.save, 0);
assert.equal(JSON.parse(demo.sessionStorage.getItem("kiddosprout.demo.v1.family")).problemReports.length, 1);
assert.equal(JSON.parse(demo.sessionStorage.getItem("kiddosprout.demo.v1.family")).problemReports[0].childId, "demo-child");
assert.deepEqual(demo.localStorage.snapshot(), demoLocalBefore);
assert.match(demo.elements["#status"].textContent, /no real parent was contacted/i);

const emptyPublicDemo = await harness(null, { publicDemoOnly: true, text: "No fictional family" });
assert.equal(emptyPublicDemo.elements["#sendReport"].disabled, true);
assert.equal(emptyPublicDemo.calls.validate, 0);
assert.equal(emptyPublicDemo.calls.load, 0);
assert.match(emptyPublicDemo.elements["#status"].textContent, /no real parent was contacted/i);

console.log("Problem report passed: authenticated cloud persistence, fail-closed loading, bounded data, and isolated demo reports work.");
