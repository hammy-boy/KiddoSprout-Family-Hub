import { createClient } from "@supabase/supabase-js";

const global = window;
const CORE = global.KiddoSproutFamilyCalls;
const CHILD_SESSION_KEY = "kiddosprout-call-device-v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNAL_EVENTS = ["ready", "offer", "answer", "child-ice", "parent-ice", "hangup"];
const LIVE_PHASES = new Set(["preparing", "ringing", "incoming", "connecting", "active"]);

let parentClient = null;
let parentRingChannel = null;
let parentRingOwner = "";
let parentController = null;
let childClient = null;
let childController = null;
let childMembership = null;
let humanCheckController = null;
let humanCheckToken = "";
let timerId = 0;
let modalTrigger = null;
let directGesture = false;
let demoSimulator = null;

function byId(id) {
  return document.getElementById(id);
}

function liveConfig() {
  const config = global.KIDDO_SPROUT_SUPABASE || {};
  if (config.publicDemoOnly === true) return null;
  const url = String(config.url || "").trim().replace(/\/+$/, "");
  const key = String(config.publishableKey || config.anonKey || "").trim();
  const managedUrl = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co$/i.test(url);
  const localUrl = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/i.test(url);
  const safeKey = /^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(key)
    || (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key) && !key.startsWith("sb_secret_"));
  return (managedUrl || localUrl) && safeKey ? Object.freeze({ url, key }) : null;
}

function publicDemoOnly() {
  return global.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true;
}

function demoMode() {
  if (publicDemoOnly()) return true;
  try {
    if (global.KiddoSproutDemo?.active?.() === true) return true;
    return global.sessionStorage?.getItem("kiddosprout.demo.v1.active") === "1";
  } catch (error) {
    return false;
  }
}

function callContext() {
  const context = global.KiddoSproutFamilyCallContext?.get?.();
  return context && typeof context === "object" ? context : {};
}

function parentToken() {
  return global.KiddoSproutSession?.getAccessToken?.() || Promise.resolve("");
}

function makeParentClient(config) {
  if (parentClient) return parentClient;
  parentClient = createClient(config.url, config.key, {
    accessToken: async () => String(await parentToken() || ""),
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    },
    realtime: { params: { eventsPerSecond: 12 } }
  });
  return parentClient;
}

function childSessionStore() {
  return {
    getItem(key) {
      try { return global.sessionStorage.getItem(key); } catch (error) { return null; }
    },
    setItem(key, value) {
      try { global.sessionStorage.setItem(key, value); } catch (error) {}
    },
    removeItem(key) {
      try { global.sessionStorage.removeItem(key); } catch (error) {}
    }
  };
}

function makeChildClient(config) {
  if (childClient) return childClient;
  childClient = createClient(config.url, config.key, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: childSessionStore(),
      storageKey: CHILD_SESSION_KEY
    },
    realtime: { params: { eventsPerSecond: 12 } }
  });
  return childClient;
}

function firstRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data && typeof data === "object" ? data : null;
}

function friendlyError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  if (code === "PGRST202" || code === "42P01" || message.includes("schema cache")) {
    return "Secure family calling has not been installed for this account yet.";
  }
  if (message.includes("anonymous") && (message.includes("disabled") || message.includes("not enabled"))) {
    return "Secure child-device pairing is not enabled for this account service yet.";
  }
  if (code === "42501" || message.includes("permission denied") || message.includes("row-level security")) {
    return "This device is not allowed to use that family call.";
  }
  if (message.includes("expired")) return "That one-time pairing code expired. Ask the parent for a new one.";
  if (message.includes("already") || message.includes("claimed")) return "That pairing code was already used. Ask the parent for a new one.";
  if (!navigator.onLine) return "You are offline. Reconnect and try again.";
  return "The secure family call service could not be reached. Please try again.";
}

function rpcError(result) {
  if (result?.error) throw result.error;
  return firstRow(result?.data);
}

async function authTokenFor(client, role) {
  if (role === "parent") return String(await parentToken() || "");
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return String(data?.session?.access_token || "");
}

function signalingAdapter(client, role) {
  let channel = null;
  let call = null;

  async function close() {
    const current = channel;
    channel = null;
    call = null;
    if (current) await client.removeChannel(current).catch(() => {});
  }

  async function startCall() {
    const row = rpcError(await client.rpc("start_family_call", {}));
    if (!row?.call_id) throw new Error("Family call did not start.");
    return {
      id: row.call_id,
      topic: `family-call:${row.call_id}`,
      status: row.call_status,
      expiresAt: row.call_expires_at
    };
  }

  async function subscribe({ call: nextCall, onSignal, onCallChange }) {
    await close();
    const callId = String(nextCall?.id || nextCall?.call_id || "");
    if (!UUID.test(callId)) throw new Error("Family call identifier is invalid.");
    const token = await authTokenFor(client, role);
    if (!token) throw new Error("A paired family session is required.");
    client.realtime.setAuth(token);
    call = { ...nextCall, id: callId, topic: `family-call:${callId}` };
    channel = client.channel(call.topic, {
      config: { private: true, broadcast: { ack: true, self: false } }
    });
    SIGNAL_EVENTS.forEach((event) => {
      channel.on("broadcast", { event }, (message) => {
        void onSignal?.({ kind: event, payload: message?.payload || {} });
      });
    });
    ["INSERT", "UPDATE", "DELETE"].forEach((event) => {
      channel.on("broadcast", { event }, (message) => {
        const row = message?.payload?.new || message?.payload?.old || message?.payload || {};
        void onCallChange?.(row);
      });
    });
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = global.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("The private family call channel timed out."));
      }, 10_000);
      channel.subscribe((status) => {
        if (settled) return;
        if (status === "SUBSCRIBED") {
          settled = true;
          global.clearTimeout(timeout);
          void (async () => {
            try {
              // Broadcast is deliberately ephemeral. Re-read the minimal call
              // row after joining so a very fast Answer cannot be lost between
              // the call RPC and this channel subscription.
              const { data, error } = await client.from("family_calls")
                .select("id,status,expires_at")
                .eq("id", callId)
                .maybeSingle();
              if (error) throw error;
              if (data) await onCallChange?.(data);
              resolve({ status });
            } catch (error) {
              reject(error);
            }
          })();
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          settled = true;
          global.clearTimeout(timeout);
          reject(new Error("The private family call channel could not open."));
        }
      });
    });
  }

  async function send(kind, payload) {
    if (!channel || !SIGNAL_EVENTS.includes(kind)) throw new Error("The private call channel is not ready.");
    const response = await channel.send({ type: "broadcast", event: kind, payload });
    if (response !== "ok") throw new Error("The private call signal was not delivered.");
  }

  async function update(action, callId = call?.id) {
    if (!UUID.test(String(callId || ""))) return null;
    const rpcNames = {
      accept: "accept_family_call",
      decline: "decline_family_call",
      cancel: "cancel_family_call",
      end: "end_family_call"
    };
    const rpcName = rpcNames[action];
    if (!rpcName) throw new Error("Family call action is invalid.");
    return rpcError(await client.rpc(rpcName, { p_call_id: callId }));
  }

  return Object.freeze({ close, send, startCall, subscribe, update });
}

function setDisabled(element, disabled) {
  if (!element) return;
  element.disabled = Boolean(disabled);
  element.setAttribute("aria-disabled", String(Boolean(disabled)));
}

function setStatus(element, text, state = "") {
  if (!element) return;
  element.textContent = text;
  if (state) element.dataset.state = state;
  else delete element.dataset.state;
}

function translatedText(key, fallback) {
  const translated = global.KiddoSproutLanguage?.text?.(key);
  return typeof translated === "string" && translated.trim() ? translated : fallback;
}

function updateMuteControl(muted, enabled = true) {
  const button = byId("muteFamilyCall");
  if (!button) return;
  const isMuted = Boolean(muted);
  button.setAttribute("aria-pressed", String(Boolean(enabled) && isMuted));
  const label = button.querySelector("[data-family-call-mute-label]")
    || button.querySelector("span:last-child");
  if (!label) return;
  const translationKey = isMuted ? "call.unmute" : "call.mute";
  label.dataset.i18n = translationKey;
  label.textContent = translatedText(translationKey, isMuted ? "Unmute" : "Mute");
}

function setIncomingVisible(visible, childName = "Your child") {
  const incoming = byId("incomingFamilyCall");
  if (!incoming) return;
  incoming.hidden = !visible;
  incoming.toggleAttribute("inert", !visible);
  incoming.setAttribute("aria-hidden", String(!visible));
  const title = byId("incomingFamilyCallTitle");
  if (title && visible) title.textContent = `${childName} is calling`;
  setDisabled(byId("acceptFamilyCall"), !visible);
  setDisabled(byId("declineFamilyCall"), !visible);
}

function formatDuration(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function stopTimer() {
  if (timerId) global.clearInterval(timerId);
  timerId = 0;
}

function startTimer(startedAt) {
  stopTimer();
  const timer = byId("familyCallTimer");
  if (!timer) return;
  const update = () => {
    const elapsed = Date.now() - Number(startedAt || Date.now());
    timer.textContent = formatDuration(elapsed);
    timer.setAttribute("datetime", `PT${Math.max(0, Math.floor(elapsed / 1000))}S`);
  };
  update();
  timerId = global.setInterval(update, 1000);
}

function modalOpen() {
  return byId("familyCallModal")?.classList.contains("open") === true;
}

function showCallModal(state) {
  const modal = byId("familyCallModal");
  if (!modal) return;
  const newlyOpened = !modalOpen();
  if (newlyOpened) modalTrigger = document.activeElement;
  modal.removeAttribute("inert");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  global.dispatchEvent(new CustomEvent("kiddosprout:family-call-modal"));
  if (state.phase === "active") startTimer(state.startedAt);
  if (newlyOpened) {
    const target = byId("hangUpFamilyCall");
    global.requestAnimationFrame(() => target?.focus?.({ preventScroll: true }));
  }
}

function hideCallModal() {
  const modal = byId("familyCallModal");
  if (!modal || !modalOpen()) return;
  stopTimer();
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modal.setAttribute("inert", "");
  global.dispatchEvent(new CustomEvent("kiddosprout:family-call-modal"));
  const returnTarget = modalTrigger;
  modalTrigger = null;
  if (returnTarget?.isConnected) global.requestAnimationFrame(() => returnTarget.focus?.({ preventScroll: true }));
}

function updateCallUi(state, role) {
  global.KiddoSproutFamilyCallActive = LIVE_PHASES.has(state.phase);
  const outsideStatus = byId(role === "child" ? "familyCallStatus" : "familyCallPairingStatus");
  const liveStatus = byId("familyCallLiveStatus");
  if (outsideStatus && (role === "child" || state.phase !== "idle")) setStatus(outsideStatus, state.message, state.phase);
  setStatus(liveStatus, state.message, state.phase);
  const active = ["connecting", "active"].includes(state.phase);
  const inProgress = ["preparing", "ringing", "connecting", "active"].includes(state.phase);
  setDisabled(byId("muteFamilyCall"), !active);
  setDisabled(byId("hangUpFamilyCall"), !inProgress);
  setDisabled(byId("cancelFamilyCall"), !["preparing", "ringing"].includes(state.phase));
  updateMuteControl(state.muted, active);
  if (inProgress) showCallModal(state);
  if (["ended", "error", "demo", "permission-required"].includes(state.phase)) hideCallModal();
  if (role === "parent" && state.phase !== "incoming") setIncomingVisible(false);
}

function withGesture(callback) {
  directGesture = true;
  try { return callback(); } finally { directGesture = false; }
}

function controllerOptions(signaling, role) {
  return {
    publicDemoOnly: publicDemoOnly(),
    isOnline: () => navigator.onLine !== false,
    hasUserActivation: () => directGesture || navigator.userActivation?.isActive === true,
    mediaDevices: navigator.mediaDevices,
    createPeerConnection: () => new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      bundlePolicy: "max-bundle"
    }),
    signaling,
    remoteAudio: byId("familyCallRemoteAudio"),
    onStateChange: (state) => updateCallUi(state, role)
  };
}

function childNameFor(profileId) {
  return String(callContext().children?.[profileId] || "Your child");
}

async function currentParentCallClient() {
  const config = liveConfig();
  if (!config) throw new Error("Secure family calls are not configured.");
  const token = String(await parentToken() || "");
  if (!token) throw new Error("Parent login is required.");
  const client = makeParentClient(config);
  client.realtime.setAuth(token);
  return client;
}

async function stopParentRingChannel() {
  if (parentRingChannel && parentClient) await parentClient.removeChannel(parentRingChannel).catch(() => {});
  parentRingChannel = null;
  parentRingOwner = "";
}

function normalizedCallRow(payload) {
  const row = payload?.new || payload?.payload?.new || payload?.payload || payload || {};
  const id = String(row.id || row.call_id || "");
  if (!UUID.test(id)) return null;
  return {
    id,
    topic: `family-call:${id}`,
    status: String(row.status || row.call_status || ""),
    childId: String(row.child_profile_id || ""),
    expiresAt: String(row.expires_at || row.call_expires_at || "")
  };
}

function handleParentRing(payload) {
  const call = normalizedCallRow(payload);
  if (!call) return;
  if (call.status === "ringing" && (!call.expiresAt || Date.parse(call.expiresAt) > Date.now())) {
    const childName = childNameFor(call.childId);
    parentController?.receiveIncomingCall({ ...call, childName });
    setIncomingVisible(true, childName);
    setStatus(byId("familyCallPairingStatus"), `${childName} is calling.`, "incoming");
  } else if (["active", "declined", "cancelled", "ended", "missed"].includes(call.status)) {
    setIncomingVisible(false);
  }
}

async function subscribeParentRings() {
  const context = callContext();
  const ownerId = String(context.familyOwnerId || "");
  if (publicDemoOnly() || context.mode !== "parent" || !UUID.test(ownerId)) {
    await stopParentRingChannel();
    return;
  }
  if (parentRingChannel && parentRingOwner === ownerId) {
    setDisabled(byId("createFamilyCallPairing"), !String(context.childId || ""));
    await refreshRevocationButton(parentClient, context.childId).catch(() => {
      setDisabled(byId("revokeFamilyCallPairing"), true);
    });
    return;
  }
  await stopParentRingChannel();
  try {
    const client = await currentParentCallClient();
    const signaling = signalingAdapter(client, "parent");
    parentController ||= CORE.createController(controllerOptions(signaling, "parent"));
    const token = String(await parentToken() || "");
    client.realtime.setAuth(token);
    const topic = `family-rings:${ownerId}`;
    const channel = client.channel(topic, { config: { private: true, broadcast: { self: false } } });
    channel.on("broadcast", { event: "INSERT" }, (message) => handleParentRing(message?.payload));
    channel.on("broadcast", { event: "UPDATE" }, (message) => handleParentRing(message?.payload));
    await new Promise((resolve, reject) => {
      const timeout = global.setTimeout(() => reject(new Error("Parent ring channel timed out.")), 10_000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          global.clearTimeout(timeout);
          resolve();
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          global.clearTimeout(timeout);
          reject(new Error("Parent ring channel did not open."));
        }
      });
    });
    parentRingChannel = channel;
    parentRingOwner = ownerId;
    setStatus(byId("familyCallPairingStatus"), "Ready to pair a child device and receive calls.", "ready");
    setDisabled(byId("createFamilyCallPairing"), !String(context.childId || ""));
    await refreshRevocationButton(client, context.childId);
    const { data, error } = await client.from("family_calls")
      .select("id,child_profile_id,status,expires_at")
      .eq("callee_user_id", ownerId)
      .eq("status", "ringing")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) handleParentRing(data);
  } catch (error) {
    await stopParentRingChannel();
    setStatus(byId("familyCallPairingStatus"), friendlyError(error), "error");
    setDisabled(byId("createFamilyCallPairing"), true);
    setDisabled(byId("revokeFamilyCallPairing"), true);
  }
}

async function refreshRevocationButton(client, childId) {
  const button = byId("revokeFamilyCallPairing");
  if (!button || !childId) {
    setDisabled(button, true);
    if (button) delete button.dataset.childUserId;
    return;
  }
  const { data, error } = await client.rpc("get_child_call_device", {
    p_child_profile_id: String(childId)
  });
  const row = !error ? firstRow(data) : null;
  const userId = row && UUID.test(String(row.child_user_id || "")) ? String(row.child_user_id) : "";
  button.dataset.childUserId = userId;
  setDisabled(button, !userId);
}

async function createPairingCode() {
  const context = callContext();
  if (publicDemoOnly() || !context.childId) return;
  const button = byId("createFamilyCallPairing");
  setDisabled(button, true);
  setStatus(byId("familyCallPairingStatus"), "Creating a one-time pairing code…", "working");
  try {
    const client = await currentParentCallClient();
    const row = rpcError(await client.rpc("create_family_call_pairing", {
      p_child_profile_id: String(context.childId)
    }));
    const code = String(row?.pairing_token || "");
    if (!code) throw new Error("Pairing code was not returned.");
    const input = byId("familyCallPairingCode");
    if (input) input.value = code;
    setDisabled(byId("copyFamilyCallPairing"), false);
    const expiry = Date.parse(row.pairing_expires_at || "");
    const expiryText = Number.isFinite(expiry)
      ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(expiry)
      : "soon";
    setStatus(
      byId("familyCallPairingStatus"),
      `One-time code created for ${context.childName || "this child"}. It expires at ${expiryText}.`,
      "success"
    );
  } catch (error) {
    setStatus(byId("familyCallPairingStatus"), friendlyError(error), "error");
  } finally {
    setDisabled(button, false);
  }
}

async function copyPairingCode() {
  const input = byId("familyCallPairingCode");
  const code = String(input?.value || "");
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    setStatus(byId("familyCallPairingStatus"), "Pairing code copied. Share it only with this child device.", "success");
  } catch (error) {
    input?.focus();
    input?.select?.();
    setStatus(byId("familyCallPairingStatus"), "Select and copy the pairing code, then enter it on the child device.", "notice");
  }
}

async function revokeChildDevice() {
  const button = byId("revokeFamilyCallPairing");
  const childUserId = String(button?.dataset.childUserId || "");
  if (!UUID.test(childUserId)) return;
  setDisabled(button, true);
  try {
    const client = await currentParentCallClient();
    const { data, error } = await client.rpc("revoke_child_call_device", { p_child_user_id: childUserId });
    if (error) throw error;
    if (data !== true) throw new Error("The paired device was not found.");
    delete button.dataset.childUserId;
    setStatus(byId("familyCallPairingStatus"), "The child call device was revoked.", "success");
  } catch (error) {
    setStatus(byId("familyCallPairingStatus"), friendlyError(error), "error");
    setDisabled(button, false);
  }
}

async function answerParentCall() {
  if (!parentController) return;
  showCallModal(parentController.getState());
  await withGesture(() => parentController.acceptIncomingCall());
}

async function declineParentCall() {
  await parentController?.declineIncomingCall?.();
}

function childPairInputValue() {
  return String(byId("familyCallPairingCode")?.value || "").trim();
}

async function currentChildMembership(client) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = String(sessionData?.session?.user?.id || "");
  if (!UUID.test(userId)) return null;
  const { data, error } = await client.from("family_call_members")
    .select("family_owner_id,child_profile_id,display_name,revoked_at")
    .eq("user_id", userId)
    .eq("role", "child")
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function setChildPairedUi(membership) {
  childMembership = membership || null;
  const paired = Boolean(membership?.family_owner_id && membership?.child_profile_id);
  setStatus(
    byId("familyCallDeviceStatus"),
    paired ? `Paired for ${membership.display_name || "this child"} · this tab only` : "Not paired",
    paired ? "success" : ""
  );
  setDisabled(byId("callParent"), !paired);
  setDisabled(byId("pairFamilyCallDevice"), paired || !humanCheckToken || !childPairInputValue());
  if (paired) {
    byId("familyCallPairingCode")?.setAttribute("disabled", "");
    setStatus(byId("familyCallStatus"), "Ready to call a parent while their dashboard is open.", "ready");
    humanCheckController?.remove?.();
  }
}

async function restoreChildDevice() {
  const config = liveConfig();
  if (!config || !byId("callParent")) return;
  const client = makeChildClient(config);
  try {
    const membership = await currentChildMembership(client);
    setChildPairedUi(membership);
    if (!membership) {
      const code = byId("familyCallPairingCode");
      if (code) code.disabled = false;
      setDisabled(byId("familyCallHumanCheckStart"), false);
      setStatus(byId("familyCallPairingStatus"), "Complete the safety check, then enter the one-time code from the parent.", "ready");
    }
  } catch (error) {
    setStatus(byId("familyCallPairingStatus"), friendlyError(error), "error");
  }
}

async function startChildHumanCheck() {
  if (publicDemoOnly() || childMembership) return;
  const start = byId("familyCallHumanCheckStart");
  const container = byId("familyCallHumanCheck");
  const status = byId("familyCallHumanCheckStatus");
  if (!start || !container || !global.KiddoSproutHumanCheck) {
    setStatus(byId("familyCallPairingStatus"), "The safety check could not start. Refresh and try again.", "error");
    return;
  }
  setDisabled(start, true);
  setStatus(status, "Starting the safety check…", "working");
  try {
    humanCheckController = await global.KiddoSproutHumanCheck.render(container, {
      statusElement: status,
      language: global.KiddoSproutLanguage?.turnstileLanguage?.() || "en",
      onTokenChange(token) {
        humanCheckToken = String(token || "");
        setDisabled(byId("pairFamilyCallDevice"), !humanCheckToken || !childPairInputValue());
        if (humanCheckToken) setStatus(status, "Safety check complete.", "success");
      },
      onExpire() {
        humanCheckToken = "";
        setDisabled(byId("pairFamilyCallDevice"), true);
        setDisabled(start, false);
      },
      onError() {
        humanCheckToken = "";
        setDisabled(byId("pairFamilyCallDevice"), true);
        setDisabled(start, false);
      }
    });
  } catch (error) {
    setDisabled(start, false);
    setStatus(status, "The safety check could not load. Check the connection and try again.", "error");
  }
}

async function pairChildDevice() {
  const config = liveConfig();
  const code = childPairInputValue();
  if (!config || !code || publicDemoOnly()) return;
  const button = byId("pairFamilyCallDevice");
  setDisabled(button, true);
  setStatus(byId("familyCallPairingStatus"), "Pairing this child device…", "working");
  try {
    const client = makeChildClient(config);
    let { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData?.session) {
      if (!humanCheckToken) throw new Error("Complete the safety check first.");
      const result = await client.auth.signInAnonymously({ options: { captchaToken: humanCheckToken } });
      if (result.error) throw result.error;
      sessionData = result.data;
    }
    const row = rpcError(await client.rpc("claim_family_call_pairing", { p_pairing_token: code }));
    const membership = await currentChildMembership(client);
    if (!row?.family_owner_id || !membership) throw new Error("The device was not paired.");
    humanCheckToken = "";
    if (byId("familyCallPairingCode")) byId("familyCallPairingCode").value = "";
    setChildPairedUi(membership);
    setStatus(byId("familyCallPairingStatus"), "This child device is securely paired for this browser tab.", "success");
  } catch (error) {
    setStatus(byId("familyCallPairingStatus"), friendlyError(error), "error");
    humanCheckController?.reset?.();
    humanCheckToken = "";
  }
}

async function startChildCall() {
  if (!childMembership || !childClient) return;
  childController ||= CORE.createController(controllerOptions(signalingAdapter(childClient, "child"), "child"));
  await withGesture(() => childController.startChildCall({ childId: childMembership.child_profile_id }));
}

async function cancelChildCall() {
  await childController?.cancelCall?.();
}

async function endVisibleCall() {
  if (demoMode() && demoSimulator) {
    if (demoSimulator.getState().phase === "ringing") demoSimulator.cancel();
    else demoSimulator.hangUp();
    return;
  }
  const controller = byId("callParent") ? childController : parentController;
  await controller?.endCall?.();
}

function toggleVisibleMute() {
  if (demoMode() && demoSimulator) {
    demoSimulator.toggleMuted();
    return;
  }
  const controller = byId("callParent") ? childController : parentController;
  controller?.toggleMuted?.();
}

function trapModalFocus(event) {
  const modal = byId("familyCallModal");
  if (!modalOpen() || !modal) return;
  if (event.key === "Escape") {
    event.preventDefault();
    void endVisibleCall();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...modal.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")]
    .filter((element) => !element.closest("[hidden], [inert]") && element.getClientRects().length > 0);
  if (!focusable.length) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

// DEMO_SIMULATOR_START
// The colleague demo is deliberately an in-memory state machine. It does not
// receive a Supabase client, media device, peer connection, or signalling
// adapter, so a future UI change cannot accidentally turn a demo click into a
// real call.
function createDemoCallSimulator({ onChange = () => {}, now = () => Date.now() } = {}) {
  let state = Object.freeze({
    phase: "unpaired",
    paired: false,
    muted: false,
    startedAt: 0,
    reason: "",
    message: "No real call is connected. Enter a made-up code to start the simulation."
  });

  function publish(patch) {
    state = Object.freeze({ ...state, ...patch });
    onChange(state);
    return state;
  }

  function pair(code) {
    const value = String(code || "").trim();
    if (value.length < 4 || value.length > 128) {
      publish({
        phase: "unpaired",
        paired: false,
        message: "Enter at least four made-up characters. Nothing will be sent."
      });
      return false;
    }
    publish({
      phase: "ready",
      paired: true,
      muted: false,
      reason: "",
      message: "Simulation ready. Press Call Parent to test a silent, fake call."
    });
    return true;
  }

  function startCall() {
    if (!state.paired || ["ringing", "active"].includes(state.phase)) return false;
    publish({
      phase: "ringing",
      muted: false,
      startedAt: 0,
      reason: "",
      message: "Simulated ringing — no parent is being contacted and no audio is sent."
    });
    return true;
  }

  function answer() {
    if (state.phase !== "ringing") return false;
    publish({
      phase: "active",
      muted: false,
      startedAt: Number(now()) || Date.now(),
      reason: "",
      message: "Simulated call answered — no audio or real connection exists."
    });
    return true;
  }

  function finish(reason, message) {
    if (!["ringing", "active"].includes(state.phase)) return false;
    publish({ phase: "ended", muted: false, startedAt: 0, reason, message });
    return true;
  }

  function decline() {
    return finish("declined", "The simulated parent declined. No real call was made.");
  }

  function cancel() {
    return finish("cancelled", "The simulated ringing was cancelled. No real call was made.");
  }

  function hangUp() {
    return finish("ended", "The silent call simulation ended. No audio or call data was created.");
  }

  function toggleMuted() {
    if (state.phase !== "active") return false;
    const muted = !state.muted;
    publish({
      muted,
      message: muted
        ? "Simulation muted. There is still no microphone or audio."
        : "Simulation unmuted. There is still no microphone or audio."
    });
    return muted;
  }

  onChange(state);
  return Object.freeze({
    answer,
    cancel,
    decline,
    getState: () => state,
    hangUp,
    pair,
    startCall,
    toggleMuted
  });
}

global.KiddoSproutFamilyCallDemoSimulator = Object.freeze({ create: createDemoCallSimulator });

function setDemoResponseVisible(visible) {
  const panel = byId("familyCallDemoResponse");
  if (!panel) return;
  panel.hidden = !visible;
  panel.toggleAttribute("inert", !visible);
  panel.setAttribute("aria-hidden", String(!visible));
  setDisabled(byId("demoAnswerFamilyCall"), !visible);
  setDisabled(byId("demoDeclineFamilyCall"), !visible);
}

function initializeDemoSimulator() {
  // The parent dashboard keeps its explanatory preview. The interactive
  // simulator lives on the separate child-call page so duplicate IDs and
  // cross-tab state cannot create a pretend family identity.
  if (!byId("callParent")) return;

  document.querySelectorAll("[data-family-call-live-only]")
    .forEach((element) => { element.hidden = true; });

  const pairingCode = byId("familyCallPairingCode");
  const pairingHelp = byId("familyCallPairingHelp");
  const pairButton = byId("pairFamilyCallDevice");
  const humanCheck = byId("familyCallHumanCheckStart")?.closest?.(".family-call-human-check");
  const remoteAudio = byId("familyCallRemoteAudio");
  const muteButton = byId("muteFamilyCall");
  let previousPhase = "";

  if (pairingCode) {
    pairingCode.disabled = false;
    pairingCode.removeAttribute("minlength");
    pairingCode.removeAttribute("pattern");
    pairingCode.placeholder = "Try DEMO-1234";
    pairingCode.setAttribute("aria-label", "Made-up pairing code for the call simulation");
  }
  if (pairingHelp) {
    pairingHelp.textContent = "Enter any made-up code with at least four characters. It stays in this tab and is never sent.";
    pairingHelp.removeAttribute("data-i18n");
  }
  if (pairButton) pairButton.textContent = "Pair Simulated Device";
  if (humanCheck) {
    humanCheck.hidden = true;
    humanCheck.setAttribute("inert", "");
    humanCheck.setAttribute("aria-hidden", "true");
  }
  if (remoteAudio) {
    remoteAudio.hidden = true;
    remoteAudio.removeAttribute("src");
    remoteAudio.srcObject = null;
  }

  demoSimulator = createDemoCallSimulator({
    onChange(state) {
      const paired = state.paired;
      const ringing = state.phase === "ringing";
      const active = state.phase === "active";
      const inProgress = ringing || active;

      global.KiddoSproutFamilyCallActive = inProgress;
      setStatus(
        byId("familyCallDeviceStatus"),
        paired ? "Simulated device paired · this tab only" : "Not paired · simulation only",
        paired ? "success" : ""
      );
      setStatus(
        byId("familyCallPairingStatus"),
        paired
          ? "Made-up code accepted for this simulation. No account or device was paired."
          : state.message,
        paired ? "success" : state.phase
      );
      setStatus(byId("familyCallStatus"), state.message, state.phase);
      setStatus(byId("familyCallLiveStatus"), state.message, state.phase);

      if (pairingCode) pairingCode.disabled = paired;
      setDisabled(pairButton, paired || String(pairingCode?.value || "").trim().length < 4);
      setDisabled(byId("callParent"), !paired || inProgress);
      setDisabled(byId("cancelFamilyCall"), !ringing);
      setDisabled(muteButton, !active);
      setDisabled(byId("hangUpFamilyCall"), !active);
      updateMuteControl(state.muted, active);
      setDemoResponseVisible(ringing);

      if (inProgress) {
        showCallModal(state);
        if (ringing && previousPhase !== "ringing") {
          global.requestAnimationFrame(() => byId("demoAnswerFamilyCall")?.focus?.({ preventScroll: true }));
        }
      } else {
        hideCallModal();
        stopTimer();
        const timer = byId("familyCallTimer");
        if (timer) {
          timer.textContent = "00:00";
          timer.setAttribute("datetime", "PT0S");
        }
      }
      previousPhase = state.phase;
    }
  });
  const simulator = demoSimulator;

  setDisabled(pairButton, true);
  pairingCode?.addEventListener("input", () => {
    setDisabled(pairButton, String(pairingCode.value || "").trim().length < 4);
  });
  pairButton?.addEventListener("click", () => simulator.pair(pairingCode?.value));
  byId("callParent")?.addEventListener("click", () => simulator.startCall());
  byId("cancelFamilyCall")?.addEventListener("click", () => simulator.cancel());
  byId("demoAnswerFamilyCall")?.addEventListener("click", () => simulator.answer());
  byId("demoDeclineFamilyCall")?.addEventListener("click", () => simulator.decline());
  byId("muteFamilyCall")?.addEventListener("click", () => simulator.toggleMuted());
  byId("hangUpFamilyCall")?.addEventListener("click", () => simulator.hangUp());
  document.addEventListener("keydown", trapModalFocus);
}
// DEMO_SIMULATOR_END

function initializeDemoUi() {
  setDisabled(byId("createFamilyCallPairing"), true);
  setDisabled(byId("copyFamilyCallPairing"), true);
  setDisabled(byId("revokeFamilyCallPairing"), true);
  setDisabled(byId("pairFamilyCallDevice"), true);
  setDisabled(byId("familyCallHumanCheckStart"), true);
  setDisabled(byId("callParent"), true);
  setDisabled(byId("cancelFamilyCall"), true);
  setDisabled(byId("acceptFamilyCall"), true);
  setDisabled(byId("declineFamilyCall"), true);
}

function removePreviewOnlyCopy() {
  document.querySelectorAll(".family-call-preview-note, [data-family-call-preview-only]")
    .forEach((element) => { element.hidden = true; });
}

async function initialize() {
  if (!CORE?.createController) return;
  initializeDemoUi();
  if (demoMode()) {
    initializeDemoSimulator();
    return;
  }
  if (!liveConfig()) {
    setStatus(byId("familyCallPairingStatus"), "Secure family calling is not configured yet.", "error");
    setStatus(byId("familyCallStatus"), "Secure family calling is not configured yet.", "error");
    return;
  }
  removePreviewOnlyCopy();
  byId("createFamilyCallPairing")?.addEventListener("click", () => void createPairingCode());
  byId("copyFamilyCallPairing")?.addEventListener("click", () => void copyPairingCode());
  byId("revokeFamilyCallPairing")?.addEventListener("click", () => void revokeChildDevice());
  byId("acceptFamilyCall")?.addEventListener("click", () => void answerParentCall());
  byId("declineFamilyCall")?.addEventListener("click", () => void declineParentCall());
  byId("familyCallHumanCheckStart")?.addEventListener("click", () => void startChildHumanCheck());
  byId("pairFamilyCallDevice")?.addEventListener("click", () => void pairChildDevice());
  byId("familyCallPairingCode")?.addEventListener("input", () => {
    if (byId("callParent")) setDisabled(byId("pairFamilyCallDevice"), !humanCheckToken || !childPairInputValue());
  });
  byId("callParent")?.addEventListener("click", () => void startChildCall());
  byId("cancelFamilyCall")?.addEventListener("click", () => void cancelChildCall());
  byId("hangUpFamilyCall")?.addEventListener("click", () => void endVisibleCall());
  byId("muteFamilyCall")?.addEventListener("click", toggleVisibleMute);
  document.addEventListener("keydown", trapModalFocus);
  global.addEventListener("kiddosprout:family-call-context", () => { void subscribeParentRings(); });
  global.addEventListener("kiddosprout:session-cleared", () => {
    parentController?.destroy?.();
    parentController = null;
    void stopParentRingChannel();
    setIncomingVisible(false);
    hideCallModal();
  });
  global.addEventListener("online", () => {
    void subscribeParentRings();
    void restoreChildDevice();
  });
  global.addEventListener("offline", () => {
    setStatus(byId("familyCallStatus"), "You are offline. Reconnect or use Parent Chat.", "error");
  });
  if (byId("callParent")) await restoreChildDevice();
  else await subscribeParentRings();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { void initialize(); }, { once: true });
} else {
  void initialize();
}
