import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

async function requiredSource(path, purpose) {
  try {
    return await readFile(new URL(path, root), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      assert.fail(`${path} is required for ${purpose}.`);
    }
    throw error;
  }
}

function openingTagForId(source, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`<[^>]+\\bid=["']${escaped}["'][^>]*>`, "i"))?.[0] || "";
}

function attributeValue(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tag.match(new RegExp(`\\b${escaped}=["']([^"']+)["']`, "i"))?.[1] || "";
}

function assertUniqueIds(source, documentName) {
  const ids = [...source.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const repeated = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  assert.deepEqual(repeated, [], `${documentName} repeats these IDs: ${repeated.join(", ")}`);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

class FakeTimers {
  constructor() {
    this.now = 0;
    this.nextId = 1;
    this.pending = new Map();
  }

  setTimeout = (callback, delay = 0) => {
    const id = this.nextId++;
    this.pending.set(id, { callback, at: this.now + Math.max(0, Number(delay) || 0) });
    return id;
  };

  clearTimeout = (id) => {
    this.pending.delete(id);
  };

  async advance(milliseconds) {
    const target = this.now + milliseconds;
    while (true) {
      const next = [...this.pending.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((first, second) => first[1].at - second[1].at || first[0] - second[0])[0];
      if (!next) break;
      const [id, timer] = next;
      this.pending.delete(id);
      this.now = timer.at;
      await timer.callback();
      await Promise.resolve();
    }
    this.now = target;
  }
}

function fakeTrack() {
  return {
    enabled: true,
    readyState: "live",
    stopCalls: 0,
    stop() {
      this.stopCalls += 1;
      this.readyState = "ended";
    }
  };
}

function fakeStream(track = fakeTrack()) {
  return {
    track,
    getTracks: () => [track],
    getAudioTracks: () => [track],
    getVideoTracks: () => []
  };
}

function fakePeerConnection() {
  const listeners = new Map();
  return {
    addTrackCalls: [],
    closeCalls: 0,
    connectionState: "new",
    localDescription: null,
    remoteDescription: null,
    addTrack(track, stream) { this.addTrackCalls.push([track, stream]); },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    async createOffer() { return { type: "offer", sdp: "v=0\\r\\n" }; },
    async createAnswer() { return { type: "answer", sdp: "v=0\\r\\n" }; },
    async setLocalDescription(description) { this.localDescription = description; },
    async setRemoteDescription(description) { this.remoteDescription = description; },
    async addIceCandidate() {},
    close() { this.closeCalls += 1; this.connectionState = "closed"; },
    emit(type, event = {}) { listeners.get(type)?.(event); }
  };
}

function fakeSignaling() {
  const calls = [];
  let signalListener = null;
  let callListener = null;
  return {
    calls,
    async startCall(request) {
      calls.push(["startCall", request]);
      return {
        id: "11111111-1111-4111-8111-111111111111",
        topic: "family-call:11111111-1111-4111-8111-111111111111",
        status: "ringing",
        expiresAt: "2026-09-19T13:10:00.000Z"
      };
    },
    async subscribe({ onSignal, onCallChange }) {
      calls.push(["subscribe"]);
      signalListener = onSignal;
      callListener = onCallChange;
      return { status: "SUBSCRIBED" };
    },
    async send(kind, payload) { calls.push(["send", kind, payload]); },
    async update(kind) { calls.push(["update", kind]); },
    async close() { calls.push(["close"]); },
    emitSignal(payload) { return signalListener?.(payload); },
    emitCall(payload) { return callListener?.(payload); }
  };
}

function loadCallApi(source, windowOverrides = {}) {
  const windowObject = {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: false },
    addEventListener() {},
    removeEventListener() {},
    ...windowOverrides
  };
  vm.runInNewContext(source, {
    window: windowObject,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Math,
    Date,
    Error,
    TypeError,
    Promise,
    Set,
    Map,
    WeakSet,
    AbortController,
    DOMException,
    structuredClone,
    crypto: globalThis.crypto,
    console: { log() {}, warn() {}, error() {} }
  }, { filename: "family-calls.js" });
  return windowObject.KiddoSproutFamilyCalls;
}

function createHarness(api, options = {}) {
  const timers = options.timers || new FakeTimers();
  const track = options.track || fakeTrack();
  const stream = options.stream || fakeStream(track);
  const getUserMediaCalls = [];
  const mediaDevices = options.mediaDevices || {
    async getUserMedia(constraints) {
      getUserMediaCalls.push(constraints);
      return stream;
    }
  };
  const peers = [];
  const signaling = options.signaling || fakeSignaling();
  const states = [];
  const remoteAudio = options.remoteAudio || {
    srcObject: null,
    playCalls: 0,
    async play() { this.playCalls += 1; }
  };
  const controller = api.createController({
    publicDemoOnly: options.publicDemoOnly === true,
    isOnline: options.isOnline || (() => true),
    hasUserActivation: options.hasUserActivation || (() => true),
    mediaDevices,
    createPeerConnection: options.createPeerConnection || (() => {
      const peer = fakePeerConnection();
      peers.push(peer);
      return peer;
    }),
    signaling,
    remoteAudio,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    now: () => timers.now,
    onStateChange(state) {
      states.push(structuredClone(state));
    }
  });
  return { controller, getUserMediaCalls, mediaDevices, peers, remoteAudio, signaling, states, stream, timers, track };
}

const [index, childCallPage, callSource, appSource, builtAppSource, packageSource] = await Promise.all([
  requiredSource("index.html", "the parent-side family-call controls"),
  requiredSource("family-call.html", "the paired child-device call controls"),
  requiredSource("family-calls.js", "the testable family-call client"),
  requiredSource("src/family-call-app.mjs", "the safe colleague call simulator"),
  requiredSource("family-call-app.js", "the built family-call application"),
  requiredSource("package.json", "the family-call test command")
]);
const callUiSource = `${index}\n${childCallPage}`;
assertUniqueIds(index, "index.html");
assertUniqueIds(childCallPage, "family-call.html");

// Calls are in-app family audio. They must never grow a telephone-number or
// carrier/SMS path accidentally.
assert.doesNotMatch(callUiSource, /href\s*=\s*["']tel:/i, "KiddoSprout calls must not dial a telephone number.");
assert.doesNotMatch(callSource, /\b(?:phone_?number|e164|twilio|plivo|vonage|tel:)\b/i,
  "The family-call client must address paired family members, not telephone services.");
for (const match of callUiSource.matchAll(/<(?:input|select|textarea)\b[^>]*(?:familyCall|family-call)[^>]*>/gi)) {
  assert.doesNotMatch(match[0], /\btype\s*=\s*["']tel["']/i,
    "A family-call control asks the child for a telephone number.");
  assert.doesNotMatch(match[0], /\b(?:id|name|autocomplete)\s*=\s*["'][^"']*phone/i,
    "A family-call field is shaped like a telephone-number field.");
}

const requiredButtons = [
  "callParent",
  "acceptFamilyCall",
  "declineFamilyCall",
  "hangUpFamilyCall",
  "muteFamilyCall"
];
for (const id of requiredButtons) {
  const tag = openingTagForId(callUiSource, id);
  assert.ok(tag, `#${id} is missing from the family-call UI.`);
  assert.match(tag, /^<button\b/i, `#${id} must be a native button.`);
  assert.match(tag, /\btype=["']button["']/i, `#${id} must not submit a surrounding form.`);
}
assert.match(openingTagForId(callUiSource, "muteFamilyCall"), /\baria-pressed=["']false["']/i,
  "The mute control must expose its toggle state.");

const statusTag = openingTagForId(callUiSource, "familyCallStatus");
assert.match(statusTag, /\brole=["']status["']/i, "Call status must be announced as a status.");
assert.match(statusTag, /\baria-live=["']polite["']/i, "Call status must use a non-interrupting live region.");
assert.match(statusTag, /\baria-atomic=["']true["']/i, "Each complete call status must be announced together.");

const incomingTag = openingTagForId(index, "incomingFamilyCall");
assert.match(incomingTag, /\bhidden\b/i, "The incoming-call surface must start visually hidden.");
assert.match(incomingTag, /\binert\b/i, "Hidden incoming-call controls must not remain keyboard reachable.");
assert.match(incomingTag, /\baria-hidden=["']true["']/i, "The hidden incoming-call surface must be hidden from assistive technology.");
const incomingLabelId = attributeValue(incomingTag, "aria-labelledby");
const incomingDescriptionId = attributeValue(incomingTag, "aria-describedby");
assert.ok(incomingLabelId && openingTagForId(index, incomingLabelId),
  "The incoming-call surface needs an aria-labelledby target in index.html.");
assert.ok(incomingDescriptionId && openingTagForId(index, incomingDescriptionId),
  "The incoming-call surface needs an aria-describedby target in index.html.");
assert.match(openingTagForId(callUiSource, "familyCallRemoteAudio"), /^<audio\b/i,
  "Remote call media must be audio-only.");

for (const [documentName, source] of [["index.html", index], ["family-call.html", childCallPage]]) {
  const modalTag = openingTagForId(source, "familyCallModal");
  assert.match(modalTag, /\baria-hidden=["']true["']/i,
    `${documentName}'s call dialog must start hidden from assistive technology.`);
  assert.match(modalTag, /\binert\b/i,
    `${documentName}'s hidden call dialog must not be keyboard reachable.`);
  const audioTag = openingTagForId(source, "familyCallRemoteAudio");
  assert.match(audioTag, /\bautoplay\b/i, `${documentName}'s remote audio must play after the answered user gesture.`);
  assert.doesNotMatch(audioTag, /\bcontrols\b/i,
    `${documentName} must use the labelled call controls instead of an inaccessible second control set.`);
}

assert.match(callUiSource, /family-calls\.js\?v=[A-Za-z0-9._-]+/,
  "The paired-child or parent call surface must load the versioned family-call client.");

for (const id of ["familyCallDemoResponse", "demoAnswerFamilyCall", "demoDeclineFamilyCall"]) {
  assert.ok(openingTagForId(childCallPage, id), `The interactive call simulation is missing #${id}.`);
}
for (const id of ["demoAnswerFamilyCall", "demoDeclineFamilyCall"]) {
  const tag = openingTagForId(childCallPage, id);
  assert.match(tag, /^<button\b/i, `#${id} must be a native button.`);
  assert.match(tag, /\btype=["']button["']/i, `#${id} must not submit a form.`);
}
assert.match(childCallPage, /not a real call[\s\S]{0,260}no audio[\s\S]{0,180}(?:WebRTC|network signalling)/i,
  "The demo must clearly say that it has no real call, audio, WebRTC, or signalling.");
assert.match(childCallPage, /made-up pairing code/i,
  "The demo must tell colleagues to use a made-up pairing code.");
assert.match(childCallPage, /family-call-app\.js\?v=2/,
  "The child call page must load the simulator-enabled application bundle.");

const demoSection = appSource.match(/\/\/ DEMO_SIMULATOR_START([\s\S]*?)\/\/ DEMO_SIMULATOR_END/)?.[1] || "";
assert.ok(demoSection, "The isolated demo simulator section could not be inspected.");
assert.doesNotMatch(
  demoSection,
  /\b(?:createClient|fetch|XMLHttpRequest|WebSocket|mediaDevices|getUserMedia|RTCPeerConnection|signalingAdapter|currentChildMembership|currentParentCallClient)\b|\.rpc\s*\(|\.channel\s*\(/,
  "The interactive demo contains a network, microphone, WebRTC, or live-account dependency."
);
const initializeBody = appSource.match(/async function initialize\(\)\s*\{([\s\S]*?)\n\}/)?.[1] || "";
assert.ok(initializeBody, "The family-call initializer could not be inspected.");
assert.ok(
  initializeBody.indexOf("if (demoMode())") >= 0
    && initializeBody.indexOf("if (demoMode())") < initializeBody.indexOf("if (!liveConfig())"),
  "Demo mode must return before live Supabase configuration or call setup is touched."
);
assert.match(builtAppSource, /Interactive|Simulation ready|Simulated ringing/,
  "The generated family-call bundle is stale and does not contain the call simulator.");

// Import only the in-memory state-machine API while leaving DOMContentLoaded
// un-fired. This proves the complete colleague interaction sequence without a
// browser, account, microphone, peer connection, or network implementation.
const savedWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const savedDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const simulatorWindow = {
  KIDDO_SPROUT_SUPABASE: { publicDemoOnly: true },
  KiddoSproutFamilyCalls: {},
  addEventListener() {},
  removeEventListener() {}
};
Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: simulatorWindow });
Object.defineProperty(globalThis, "document", {
  configurable: true,
  writable: true,
  value: { readyState: "loading", addEventListener() {} }
});
try {
  await import(new URL(`src/family-call-app.mjs?test=${Date.now()}`, root));
} finally {
  if (savedWindow) Object.defineProperty(globalThis, "window", savedWindow);
  else delete globalThis.window;
  if (savedDocument) Object.defineProperty(globalThis, "document", savedDocument);
  else delete globalThis.document;
}
const createDemoSimulator = simulatorWindow.KiddoSproutFamilyCallDemoSimulator?.create;
assert.equal(typeof createDemoSimulator, "function",
  "The in-memory colleague call simulator is not available to the call UI.");
{
  let forbiddenCalls = 0;
  const states = [];
  const simulator = createDemoSimulator({
    now: () => 42_000,
    onChange(state) { states.push(structuredClone(state)); },
    // Unknown capabilities are intentionally ignored by this narrow factory.
    mediaDevices: { getUserMedia() { forbiddenCalls += 1; } },
    createPeerConnection() { forbiddenCalls += 1; },
    signaling: { send() { forbiddenCalls += 1; } },
    fetch() { forbiddenCalls += 1; }
  });
  assert.equal(simulator.getState().phase, "unpaired");
  assert.equal(simulator.pair("DEMO-1234"), true);
  assert.equal(simulator.getState().phase, "ready");
  assert.equal(simulator.startCall(), true);
  assert.equal(simulator.getState().phase, "ringing");
  assert.equal(simulator.answer(), true);
  assert.equal(simulator.getState().phase, "active");
  assert.equal(simulator.getState().startedAt, 42_000);
  assert.equal(simulator.toggleMuted(), true);
  assert.equal(simulator.getState().muted, true);
  assert.equal(simulator.hangUp(), true);
  assert.equal(simulator.getState().phase, "ended");
  assert.equal(simulator.getState().reason, "ended");
  assert.equal(simulator.startCall(), true, "A colleague must be able to run another simulated call.");
  assert.equal(simulator.decline(), true);
  assert.equal(simulator.getState().reason, "declined");
  assert.equal(forbiddenCalls, 0,
    "The demo interaction touched a supplied microphone, WebRTC, signalling, or fetch capability.");
  assert.ok(states.some((state) => state.phase === "ringing") && states.some((state) => state.phase === "active"),
    "The demo did not expose its simulated ringing and answered states.");
}
const packageJson = JSON.parse(packageSource);
assert.equal(packageJson.scripts?.["test:calls"], "node scripts/test-family-calls.mjs");
assert.equal(packageJson.scripts?.["test:calls:db"],
  "supabase test db supabase/tests/family_calls_rls_test.sql");
assert.match(packageJson.scripts?.test || "", /(?:^|&&\s*)npm run test:calls(?:\s*&&|$)/,
  "The default test pipeline must include the family-call contract.");

// The client is kept as an isolated controller so permission, race, timeout,
// and teardown behavior can be proved without a real microphone or account.
const api = loadCallApi(callSource);
assert.ok(api && typeof api.createController === "function",
  "family-calls.js must expose KiddoSproutFamilyCalls.createController(options).");

{
  let forbiddenCalls = 0;
  const demoApi = loadCallApi(callSource, {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: true }
  });
  const harness = createHarness(demoApi, {
    publicDemoOnly: true,
    mediaDevices: {
      async getUserMedia() { forbiddenCalls += 1; throw new Error("demo requested a microphone"); }
    },
    createPeerConnection() { forbiddenCalls += 1; throw new Error("demo created WebRTC"); },
    signaling: {
      async startCall() { forbiddenCalls += 1; throw new Error("demo contacted signaling"); },
      async subscribe() { forbiddenCalls += 1; throw new Error("demo subscribed"); },
      async send() { forbiddenCalls += 1; },
      async update() { forbiddenCalls += 1; },
      async close() { forbiddenCalls += 1; }
    }
  });
  await harness.controller.startChildCall({ childId: "demo-child", parentMemberId: "demo-parent" });
  assert.equal(forbiddenCalls, 0, "The colleague demo touched microphone, WebRTC, or live signaling.");
  assert.equal(harness.controller.getState().phase, "demo",
    "The public preview must identify the call as a non-live demo.");
}

{
  const harness = createHarness(api, { hasUserActivation: () => false });
  await harness.controller.startChildCall({ childId: "child-a", parentMemberId: "parent-a" });
  assert.equal(harness.getUserMediaCalls.length, 0,
    "A script-initiated call requested microphone access without a current user gesture.");
  assert.equal(harness.signaling.calls.length, 0,
    "A script-initiated call created a signaling record before consent.");
  assert.equal(harness.controller.getState().phase, "permission-required");
}

{
  const denied = new DOMException("Permission denied", "NotAllowedError");
  const harness = createHarness(api, {
    mediaDevices: {
      async getUserMedia() { throw denied; }
    }
  });
  await harness.controller.startChildCall({ childId: "child-a", parentMemberId: "parent-a" });
  assert.equal(harness.controller.getState().phase, "error");
  assert.equal(harness.controller.getState().reason, "microphone-denied");
  assert.equal(harness.peers.length, 0, "Permission denial must not create a peer connection.");
  assert.equal(harness.signaling.calls.some(([kind]) => ["startCall", "subscribe", "send", "update"].includes(kind)), false,
    "Permission denial must not create or signal a call record.");
}

{
  const harness = createHarness(api);
  await harness.controller.startChildCall({ childId: "child-a", parentMemberId: "parent-a" });
  assert.equal(harness.getUserMediaCalls.length, 1, "One click must request the microphone exactly once.");
  const constraints = harness.getUserMediaCalls[0];
  assert.equal(constraints.video, false, "A child-to-parent audio call must never request the camera.");
  assert.ok(constraints.audio === true || (constraints.audio && typeof constraints.audio === "object"),
    "The family call did not explicitly request audio.");
  if (typeof constraints.audio === "object") {
    assert.notEqual(constraints.audio.echoCancellation, false, "Echo cancellation must not be disabled.");
    assert.notEqual(constraints.audio.noiseSuppression, false, "Noise suppression must not be disabled.");
  }
  assert.equal(harness.peers.length, 1);
  assert.equal(harness.peers[0].addTrackCalls.length, 1);
  assert.equal(harness.controller.getState().phase, "ringing");

  // Repeated activation while a call is in flight cannot create another media
  // stream, peer, call record, or ring timer.
  await harness.controller.startChildCall({ childId: "child-a", parentMemberId: "parent-a" });
  assert.equal(harness.getUserMediaCalls.length, 1, "Double activation requested a second microphone stream.");
  assert.equal(harness.peers.length, 1, "Double activation created a second peer connection.");
  assert.equal(harness.signaling.calls.filter(([kind]) => kind === "startCall").length, 1,
    "Double activation created a second server call record.");

  await harness.controller.cancelCall();
  assert.equal(harness.track.stopCalls, 1, "Cancelling a ringing call must stop its microphone track.");
  assert.equal(harness.peers[0].closeCalls, 1, "Cancelling a ringing call must close WebRTC.");
  assert.equal(harness.signaling.calls.filter(([kind]) => kind === "close").length, 1,
    "Cancelling a ringing call must unsubscribe signaling.");
  assert.equal(harness.controller.getState().phase, "ended");

  const terminalSnapshot = harness.controller.getState();
  await harness.signaling.emitCall({ status: "declined" });
  assert.deepEqual(harness.controller.getState(), terminalSnapshot,
    "A late server event changed an already terminal call.");
  assert.equal(harness.track.stopCalls, 1, "A late server event repeated media teardown.");
  assert.equal(harness.peers[0].closeCalls, 1, "A late server event repeated peer teardown.");
  assert.equal(harness.signaling.calls.filter(([kind]) => kind === "close").length, 1,
    "A late server event repeated channel teardown.");
}

{
  const harness = createHarness(api);
  await harness.controller.startChildCall({ childId: "child-a", parentMemberId: "parent-a" });
  // The parent can answer before the child receives the ephemeral `ready`
  // broadcast. Replaying the authoritative active row must still start one,
  // and only one, WebRTC offer.
  await harness.signaling.emitCall({ status: "active" });
  await harness.signaling.emitSignal({ kind: "ready", payload: { ready: true } });
  assert.equal(
    harness.signaling.calls.filter(([kind, event]) => kind === "send" && event === "offer").length,
    1,
    "A fast parent answer was lost or created duplicate WebRTC offers."
  );
  await harness.controller.cancelCall();
}

{
  const mediaResult = deferred();
  const lateTrack = fakeTrack();
  const harness = createHarness(api, {
    mediaDevices: { getUserMedia: () => mediaResult.promise }
  });
  const starting = harness.controller.startChildCall({ childId: "child-a", parentMemberId: "parent-a" });
  await Promise.resolve();
  await harness.controller.cancelCall();
  mediaResult.resolve(fakeStream(lateTrack));
  await starting;
  assert.equal(lateTrack.stopCalls, 1,
    "A microphone stream that resolved after cancellation was leaked.");
  assert.equal(harness.peers.length, 0,
    "A stale microphone result resurrected the cancelled peer connection.");
  assert.equal(harness.signaling.calls.filter(([kind]) => kind === "startCall").length, 0,
    "A stale microphone result created a server call after cancellation.");
  assert.equal(harness.controller.getState().phase, "ended");
}

{
  const signaling = fakeSignaling();
  signaling.startCall = async () => {
    signaling.calls.push(["startCall"]);
    throw new Error("service unavailable");
  };
  const harness = createHarness(api, { signaling });
  await harness.controller.startChildCall({ childId: "child-a", parentMemberId: "parent-a" });
  assert.equal(harness.controller.getState().phase, "error");
  assert.equal(harness.controller.getState().reason, "connection-failed");
  assert.equal(harness.track.stopCalls, 1, "A signaling failure leaked the microphone stream.");
  assert.equal(harness.peers[0].closeCalls, 1, "A signaling failure leaked the peer connection.");
}

{
  const timers = new FakeTimers();
  const harness = createHarness(api, { timers });
  await harness.controller.startChildCall({ childId: "child-a", parentMemberId: "parent-a" });
  const timeout = Number(api.constants?.RING_TIMEOUT_MS);
  assert.ok(Number.isFinite(timeout) && timeout >= 10_000 && timeout <= 120_000,
    "The controller must publish a bounded 10–120 second ringing timeout.");
  await timers.advance(timeout + 1);
  assert.equal(harness.controller.getState().phase, "ended");
  assert.equal(harness.controller.getState().reason, "timeout");
  assert.equal(harness.track.stopCalls, 1, "A timed-out call kept its microphone open.");
  assert.equal(harness.peers[0].closeCalls, 1, "A timed-out call kept its peer connection open.");
  assert.equal(harness.signaling.calls.filter(([kind]) => kind === "close").length, 1,
    "A timed-out call kept its private channel subscribed.");
  assert.equal(harness.signaling.calls.filter(([kind, action]) => kind === "update" && action === "cancel").length, 1,
    "A timed-out call did not atomically cancel its server call record.");
}

{
  const harness = createHarness(api, { isOnline: () => false });
  await harness.controller.startChildCall({ childId: "child-a", parentMemberId: "parent-a" });
  assert.equal(harness.getUserMediaCalls.length, 0, "An offline call unnecessarily opened the microphone.");
  assert.equal(harness.signaling.calls.length, 0, "An offline call attempted live signaling.");
  assert.equal(harness.controller.getState().phase, "error");
  assert.equal(harness.controller.getState().reason, "offline");
}

{
  const harness = createHarness(api);
  harness.controller.receiveIncomingCall({
    id: "22222222-2222-4222-8222-222222222222",
    childName: "Child A"
  });
  assert.equal(harness.controller.getState().phase, "incoming");
  await harness.controller.declineIncomingCall();
  assert.equal(harness.getUserMediaCalls.length, 0,
    "Declining an incoming call must never ask for microphone permission.");
  assert.equal(harness.signaling.calls.filter(([kind, action]) => kind === "update" && action === "decline").length, 1,
    "Declining did not close the server-side ringing state.");
  assert.equal(harness.controller.getState().phase, "ended");
  assert.equal(harness.controller.getState().reason, "declined");
}

{
  const harness = createHarness(api);
  await harness.controller.startChildCall({ childId: "child-a", parentMemberId: "parent-a" });
  await harness.controller.destroy();
  await harness.controller.destroy();
  assert.equal(harness.track.stopCalls, 1, "Repeated teardown stopped a microphone track more than once.");
  assert.equal(harness.peers[0].closeCalls, 1, "Repeated teardown closed WebRTC more than once.");
  assert.equal(harness.signaling.calls.filter(([kind]) => kind === "close").length, 1,
    "Repeated teardown closed the private channel more than once.");
  assert.equal(harness.controller.getState().phase, "ended");
}

assert.doesNotMatch(callSource, /\b(?:localStorage|sessionStorage|indexedDB|caches\.(?:open|match|put)|MediaRecorder|getDisplayMedia)\b/,
  "Call media/signaling must remain ephemeral and must never be recorded or written to browser storage.");
assert.doesNotMatch(callSource, /video\s*:\s*true/,
  "The audio-only family-call client contains a camera request.");
assert.match(callSource, /(?:pagehide|beforeunload)/,
  "The call client must tear down media when the page is left.");

const migrationNames = (await readdir(new URL("supabase/migrations/", root)))
  .filter((name) => /family_calls?\.sql$/i.test(name));
assert.ok(migrationNames.length > 0,
  "A reviewed Supabase migration for paired family calling is required.");
const migration = (await Promise.all(migrationNames.map((name) => requiredSource(
  `supabase/migrations/${name}`,
  "family-call membership, pairing, call lifecycle, and private Realtime authorization"
)))).join("\n");

for (const table of ["family_call_members", "family_call_pairings", "family_calls"]) {
  assert.match(migration, new RegExp(`create table(?: if not exists)? public\\.${table}\\b`, "i"),
    `The call migration is missing public.${table}.`);
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"),
    `public.${table} must have RLS enabled.`);
}
for (const rpc of [
  "create_family_call_pairing",
  "claim_family_call_pairing",
  "start_family_call",
  "accept_family_call",
  "decline_family_call",
  "cancel_family_call",
  "end_family_call",
  "revoke_child_call_device"
]) {
  assert.match(migration, new RegExp(`function (?:public|private)\\.${rpc}\\s*\\(`, "i"),
    `The reviewed call lifecycle is missing ${rpc}().`);
}
assert.match(migration, /on\s+["']?realtime["']?\.["']?messages["']?/i,
  "Private Realtime Broadcast needs policies on realtime.messages.");
assert.match(migration, /realtime\.topic\s*\(\s*\)/i,
  "Realtime authorization must bind each participant to the requested private topic.");
assert.match(migration, /extension[\s\S]{0,160}broadcast|broadcast[\s\S]{0,160}extension/i,
  "Realtime policies must be limited to Broadcast messages.");
assert.doesNotMatch(migration, /create\s+(?:table|function)\s+(?:if\s+not\s+exists\s+)?["']?realtime["']?\./i,
  "Supabase's locked realtime schema may receive policies, not custom tables or functions.");
assert.match(migration, /revoke\s+all[\s\S]*?\b(?:public|anon)\b/i,
  "Call tables and privileged functions must fail closed before narrow grants are added.");
assert.doesNotMatch(migration, /(?:raw_)?user_meta_data|user_metadata/i,
  "Editable user metadata must never authorize a parent or child call participant.");
assert.match(migration, /token_hash[\s\S]{0,220}(?:digest|sha256)|(?:digest|sha256)[\s\S]{0,220}token_hash/i,
  "Pairing codes must be irreversibly hashed before storage.");
assert.match(migration, /expires_at[\s\S]{0,220}15 minutes|15 minutes[\s\S]{0,220}expires_at/i,
  "Pairing codes must expire after a short, bounded period.");
const callsTableDefinition = migration.match(
  /create table(?: if not exists)? public\.family_calls\s*\(([\s\S]*?)\n\);/i
)?.[1] || "";
assert.ok(callsTableDefinition, "The family_calls table definition could not be inspected.");
assert.doesNotMatch(callsTableDefinition, /\b(?:sdp|ice|candidate|signal|payload|recording|audio|blob|offer|answer)\b/i,
  "WebRTC signaling payloads and audio must not be persisted in public.family_calls.");

const rlsTest = await requiredSource(
  "supabase/tests/family_calls_rls_test.sql",
  "cross-family, anonymous, participant-role, expiry, and lifecycle RLS verification"
);
for (const scenario of [
  /anon(?:ymous)?[^\n]*(?:cannot|denied|no access|zero)/i,
  /another family|cross.family|other family|outsider/i,
  /child[^\n]*(?:start|create)[^\n]*call/i,
  /parent[^\n]*(?:accept|decline)/i,
  /expired|ended/i,
  /private realtime[\s\S]{0,80}(?:broadcast|channel)|schemaname\s*=\s*'realtime'[\s\S]{0,160}tablename\s*=\s*'messages'/i
]) {
  assert.match(rlsTest, scenario,
    `family_calls_rls_test.sql is missing a required security scenario: ${scenario}`);
}

console.log("Family-call contract passed: no phone numbers, explicit audio consent, isolated demo, bounded lifecycle, cleanup, accessibility, and backend security artifacts.");
