import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const WEBRTC = new URL("_______/wisp/frontend/scripts/webrtc.js", ROOT);
const AUTH_GUARD = new URL("_______/wisp/frontend/scripts/authGuard.js", ROOT);
const SUPABASE_CLIENT = new URL("_______/wisp/frontend/scripts/supabaseClient.js", ROOT);
const ANSWER_SELECTION_MIGRATION = new URL(
  "supabase/migrations/20261002021955_wisp_allow_answer_selection_signal.sql",
  ROOT,
);

test("Wisp calls tolerate short network changes and stop private media immediately", async () => {
  const source = await readFile(WEBRTC, "utf8");

  assert.match(source, /DISCONNECT_GRACE_MS\s*=\s*1[0-5]_000/,
    "A transient WebRTC disconnect should receive a short recovery window.");
  assert.match(source, /connectionState\s*===\s*["']disconnected["'][\s\S]{0,500}?setTimeout/,
    "Disconnected calls should wait for ICE recovery instead of ending immediately.");
  assert.match(source, /connectionState\s*===\s*["']connected["'][\s\S]{0,180}?_clearDisconnectTimer/,
    "A recovered call must cancel its pending disconnect timer.");

  const getMediaStart = source.indexOf("async _getLocalStream");
  const getMediaEnd = source.indexOf("async _flushPendingIce", getMediaStart);
  const getMedia = source.slice(getMediaStart, getMediaEnd);
  assert.match(getMedia, /const\s+stream\s*=\s*await\s+navigator\.mediaDevices\.getUserMedia/);
  assert.match(getMedia, /this\.destroyed[\s\S]{0,220}?stream\.getTracks\(\)\.forEach\(\(track\)\s*=>\s*track\.stop\(\)\)/,
    "Media granted after navigation/logout must be stopped before it can be stored.");

  const hangUpStart = source.indexOf("async hangUp()");
  const hangUpEnd = source.indexOf("toggleMute()", hangUpStart);
  const hangUp = source.slice(hangUpStart, hangUpEnd);
  assert.ok(hangUp.indexOf("this._queueEndSignal") < hangUp.indexOf("this._teardownLocal()"),
    "Hang up must enqueue the exact end signal before UI teardown can destroy the session.");
  assert.ok(hangUp.indexOf("this._teardownLocal()") < hangUp.indexOf("await this._finishCall"),
    "Hang up must stop tracks before waiting for network cleanup.");
  assert.match(source, /pendingEndSignals/,
    "Session destruction must wait for already queued peer-end signals before removing the channel.");
  assert.match(source, /operationVersion/,
    "Pending permission and database work must be cancellable when the page closes.");
  assert.match(source, /RING_TIMEOUT_MS\s*=\s*90_000/,
    "An unavailable peer must not leave the caller ringing forever.");
  assert.match(source, /outgoingRingTimer[\s\S]*?_queueEndSignal[\s\S]*?onStateChange\?\.\(["']unanswered["']\)/,
    "The outgoing timeout must notify the peer, release the record, and update the UI.");
  assert.match(source, /incomingRingTimer[\s\S]*?forgetCall[\s\S]*?onStateChange\?\.\(["']ended["']\)/,
    "Incoming ringing is bounded instead of leaving a permanent dialog.");
  assert.match(source, /pendingLocalIce/,
    "ICE gathered before the server returns a call ID must be buffered.");
  assert.match(source, /!this\.callId\s*\|\|\s*!this\.offerSent[\s\S]{0,180}?pendingLocalIce\.push/,
    "Local ICE must wait until the call ID and offer are visible to the peer.");
  assert.match(source, /await\s+this\._send\(["']offer["'][\s\S]{0,420}?this\.offerSent\s*=\s*true;[\s\S]{0,120}?_flushPendingLocalIce/,
    "Buffered ICE must flush only after the offer is broadcast.");
  assert.match(source, /await\s+this\._send\(["']answer["'][\s\S]{0,520}?this\.offerSent\s*=\s*true;[\s\S]{0,120}?_flushPendingLocalIce/,
    "The answering peer must also flush ICE gathered before its answer was broadcast.");
  assert.match(source, /fromInstanceId/,
    "Signals must identify the originating tab as well as the account.");
  assert.match(source, /payload\.fromUserId\s*===\s*this\.myUserId[\s\S]{0,500}?forgetCall[\s\S]{0,220}?superseded/,
    "A second recipient tab must dismiss its ring without ending the accepted call.");
  assert.match(source, /duplicate recipient[\s\S]{0,180}?never end a call/i,
    "Incoming expiry must leave shared server-call cleanup to the caller.");
  assert.match(source, /passiveIncomingCallId[\s\S]{0,520}?forgetCall[\s\S]{0,120}?pendingOffer\s*=\s*null[\s\S]{0,520}?_snapshotCallState/,
    "Closing an unaccepted duplicate recipient tab must not end the shared server call.");
  assert.match(source, /navigator\?\.locks[\s\S]{0,600}?kiddosprout-wisp-recipient:[\s\S]{0,160}?ifAvailable:\s*true/,
    "Concurrent recipient tabs should elect one answering tab with a per-call browser lock.");
  assert.match(source, /_claimIncomingCall\(callId\)[\s\S]{0,420}?onStateChange\?\.\(["']superseded["']\)/,
    "A recipient tab that loses the call claim must dismiss only its local ring.");
  assert.match(source, /signalingState[\s\S]{0,120}?have-local-offer[\s\S]{0,180}?setRemoteDescription/,
    "A late duplicate answer must not be applied to an already stable caller connection.");
  assert.match(source, /answer-selected/,
    "The caller must tell every answering device which instance won the call.");
  assert.match(source, /remoteInstanceId[\s\S]{0,420}?payload\.fromInstanceId\s*!==\s*this\.remoteInstanceId/,
    "Once selected, call signaling must stay pinned to one remote browser instance.");
  assert.match(source, /pendingIce\.push\(\{\s*candidate:[\s\S]{0,100}?fromInstanceId/,
    "Buffered ICE must retain its source instance so losing-device candidates can be discarded.");
  assert.match(source, /_abandonUnselectedAnswerer\(state[\s\S]{0,220}?isIncomingAnswerer[\s\S]{0,520}?forgetCall/,
    "An unselected answering device must abandon locally without ending the shared call row.");
  assert.match(source, /catch\s*\(callError\)[\s\S]{0,140}?_abandonUnselectedAnswerer\(["']failed["']\)/,
    "A failed contender must not end another device's accepted call.");
  assert.match(source, /async\s+hangUp\(\)[\s\S]{0,120}?_abandonUnselectedAnswerer\(["']ended["']\)/,
    "Hanging up before device selection must be local-only.");
});

test("Wisp private call signaling permits the multi-device answer selection handshake", async () => {
  const migration = await readFile(ANSWER_SELECTION_MIGRATION, "utf8");

  assert.match(migration, /create\s+policy\s+wisp_call_send[\s\S]*?for\s+insert[\s\S]*?to\s+authenticated/i,
    "Only authenticated private-channel members should receive call publish access.");
  assert.match(migration, /realtime\.messages\.event\s+in\s*\([\s\S]*?['"]answer-selected['"][\s\S]*?\)/i,
    "The database event allowlist must accept the answer selection emitted by the caller.");
  assert.match(migration, /can_signal_topic\s*\(\s*\(select\s+realtime\.topic\(\)\)\s*\)/i,
    "Answer selection must retain chat-membership authorization.");
});

test("Wisp protected pages cannot reveal stale BFCache content", async () => {
  const source = await readFile(AUTH_GUARD, "utf8");

  assert.match(source, /let\s+authEpoch\s*=\s*0/);
  assert.match(source, /pagehide[\s\S]{0,220}?authEpoch\s*\+=\s*1[\s\S]{0,160}?pauseProtectedPage/,
    "Caching a page must invalidate pending authentication work and hide its private DOM.");
  assert.match(source, /const\s+requestEpoch\s*=\s*authEpoch[\s\S]{0,180}?await\s+supabase\.auth\.getUser\(\)[\s\S]{0,180}?requestEpoch\s*!==\s*authEpoch/,
    "A stale authentication response must not reveal the protected page.");
  assert.match(source, /const\s+restoreEpoch\s*=\s*authEpoch[\s\S]{0,260}?restoreEpoch\s*!==\s*authEpoch/,
    "BFCache revalidation must ignore superseded user checks.");
  assert.match(source, /\.catch\(\(\)\s*=>\s*\{[\s\S]{0,120}?restoreEpoch\s*===\s*authEpoch[\s\S]{0,80}?redirectToLogin/,
    "A stale rejected BFCache request must not redirect a newer page lifecycle.");
});

test("tab-scoped Wisp sessions cannot consume another tab's auth broadcast", async () => {
  const source = await readFile(SUPABASE_CLIENT, "utf8");

  assert.match(source, /AUTH_STORAGE_KEY\s*=\s*["']kiddosprout-wisp-auth-v1["']/);
  assert.match(source, /CLIENT_STORAGE_KEY[\s\S]{0,160}?crypto\?\.randomUUID/,
    "Each document needs a unique Supabase BroadcastChannel/lock key.");
  assert.match(source, /function\s+tabStorageKey[\s\S]{0,260}?AUTH_STORAGE_KEY/,
    "The unique client key must still map data to stable tab-scoped sessionStorage.");
  assert.match(source, /storage:\s*sessionStore[\s\S]{0,100}?storageKey:\s*CLIENT_STORAGE_KEY/);
  assert.doesNotMatch(source, /localStorage\.(?:getItem|setItem|removeItem)/,
    "Wisp account sessions must remain isolated to the browser tab.");
});
