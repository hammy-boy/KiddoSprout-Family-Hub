import { initTheme } from "./theme.js";
import { requireAuth } from "./authGuard.js";
import { getProfile, listMessages, sendMessage, subscribeToMessages } from "./chatData.js";
import { requireSupabase } from "./supabaseClient.js";
import { WISP_LIMITS, WISP_TABLES, isUuid } from "./config.js";
import { CallSession } from "./webrtc.js";

initTheme();

const chatId = new URLSearchParams(window.location.search).get("chat");
const banner = document.getElementById("load-banner");
const body = document.getElementById("chat-body");
const form = document.getElementById("composer-form");
const textarea = document.getElementById("composer-textarea");
const sendBtn = document.getElementById("composer-send");
const overlay = document.getElementById("call-overlay");
const callErrorBanner = document.getElementById("call-error-banner");
const remoteVideo = document.getElementById("remote-video");
const localVideo = document.getElementById("local-video");
const callName = document.getElementById("call-name");
const callAvatar = document.getElementById("call-avatar");
const callStatus = document.getElementById("call-status");
const incomingActions = document.getElementById("incoming-actions");
const activeControls = document.getElementById("active-controls");
const cameraBtn = document.getElementById("camera-btn");
const muteBtn = document.getElementById("mute-btn");

let myUserId = null;
let otherProfile = null;
let unsubscribeMessages = null;
let session = null;
let callStartedAt = 0;
let durationTimer = 0;
let callCleanupInProgress = false;

function initials(name) {
  return String(name || "?").slice(0, 2).toUpperCase();
}

function formatTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderMessages(messages) {
  const fragment = document.createDocumentFragment();
  for (const message of messages) {
    const row = document.createElement("div");
    row.className = `bubble-row${message.sender_id === myUserId ? " is-mine" : ""}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const content = document.createElement("div");
    if (message.deleted_at) {
      const deleted = document.createElement("em");
      deleted.textContent = "Message deleted";
      content.append(deleted);
    } else {
      content.textContent = String(message.content || "");
    }
    const meta = document.createElement("div");
    meta.className = "bubble-meta";
    const time = document.createElement("span");
    time.textContent = formatTime(message.created_at);
    meta.append(time);
    bubble.append(content, meta);
    row.append(bubble);
    fragment.append(row);
  }
  body.replaceChildren(fragment);
  body.scrollTop = body.scrollHeight;
}

async function reloadMessages() {
  renderMessages(await listMessages(chatId));
}

async function initChat(user) {
  myUserId = user.id;
  const client = requireSupabase();
  const { data: members, error } = await client
    .from(WISP_TABLES.chatMembers)
    .select("user_id")
    .eq("chat_id", chatId);
  if (error) throw error;
  const peerId = (members || []).find((member) => member.user_id !== myUserId)?.user_id;
  if (!isUuid(peerId)) throw new Error("This conversation does not have another member.");
  otherProfile = await getProfile(peerId);
  document.getElementById("chat-name").textContent = otherProfile.username;
  document.getElementById("chat-status").textContent = otherProfile.status === "online" ? "Online" : "Offline";
  document.getElementById("chat-avatar").textContent = initials(otherProfile.username);

  await reloadMessages();
  unsubscribeMessages = await subscribeToMessages(chatId, () => {
    void reloadMessages().catch((messageError) => console.error("Wisp message refresh failed.", messageError));
  });
  banner.classList.remove("is-visible");
}

textarea.addEventListener("input", () => {
  const length = textarea.value.trim().length;
  sendBtn.disabled = length === 0 || length > WISP_LIMITS.message;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = textarea.value.trim();
  if (!text || text.length > WISP_LIMITS.message || !isUuid(chatId)) return;
  sendBtn.disabled = true;
  try {
    await sendMessage(chatId, text);
    textarea.value = "";
    textarea.style.height = "auto";
    await reloadMessages();
    banner.classList.remove("is-visible");
  } catch (error) {
    banner.textContent = "Message failed to send. Please try again.";
    banner.classList.add("is-visible");
    console.error("Wisp message send failed.", error);
  } finally {
    sendBtn.disabled = textarea.value.trim().length === 0;
  }
});

function showCallError(message) {
  callErrorBanner.textContent = message;
  callErrorBanner.classList.add("is-visible");
}

function openOverlay() {
  overlay.classList.add("is-visible");
  callErrorBanner.classList.remove("is-visible");
  if (otherProfile) {
    callName.textContent = otherProfile.username;
    callAvatar.textContent = initials(otherProfile.username);
  }
}

function closeOverlay() {
  overlay.classList.remove("is-visible");
  remoteVideo.classList.remove("is-visible");
  localVideo.classList.remove("is-visible");
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
  incomingActions.style.display = "none";
  activeControls.style.display = "none";
  cameraBtn.style.display = "none";
  window.clearInterval(durationTimer);
  durationTimer = 0;
}

function startDurationTimer() {
  window.clearInterval(durationTimer);
  callStartedAt = Date.now();
  durationTimer = window.setInterval(() => {
    const seconds = Math.floor((Date.now() - callStartedAt) / 1000);
    const minutesPart = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secondsPart = String(seconds % 60).padStart(2, "0");
    callStatus.textContent = `${minutesPart}:${secondsPart}`;
  }, 1000);
}

function createSession() {
  return new CallSession(chatId, {
    onIncomingCall: ({ callType }) => {
      openOverlay();
      callStatus.textContent = callType === "video" ? "Incoming video call…" : "Incoming voice call…";
      incomingActions.style.display = "flex";
      activeControls.style.display = "none";
    },
    onRemoteStream: (stream) => {
      remoteVideo.srcObject = stream;
      if (session?.callType === "video") remoteVideo.classList.add("is-visible");
    },
    onStateChange: (state) => {
      if (state === "connected") {
        incomingActions.style.display = "none";
        activeControls.style.display = "flex";
        callStatus.textContent = "Connected";
        startDurationTimer();
      } else if (state === "calling") {
        callStatus.textContent = "Calling…";
        activeControls.style.display = "flex";
      } else if (state === "failed") {
        banner.textContent = "The private call could not connect. Check the network and try again.";
        banner.classList.add("is-visible");
        void teardownCall(false);
      } else if (state === "ended") {
        void teardownCall(true);
      }
    },
  });
}

async function teardownCall(rearm) {
  if (callCleanupInProgress) return;
  callCleanupInProgress = true;
  closeOverlay();
  const previous = session;
  session = null;
  await previous?.destroy().catch(() => {});
  if (rearm && isUuid(chatId)) session = createSession();
  callCleanupInProgress = false;
}

async function placeCall(callType) {
  if (!session) session = createSession();
  try {
    openOverlay();
    callStatus.textContent = "Calling…";
    incomingActions.style.display = "none";
    activeControls.style.display = "flex";
    cameraBtn.style.display = callType === "video" ? "flex" : "none";
    const stream = await session.startCall(callType);
    if (callType === "video") {
      localVideo.srcObject = stream;
      localVideo.classList.add("is-visible");
    }
  } catch (error) {
    console.error("Wisp call start failed.", error);
    showCallError(error.name === "NotAllowedError"
      ? "Camera or microphone access was blocked. Allow access in your browser and try again."
      : "Couldn't start the private call. Please try again.");
  }
}

document.getElementById("voice-call-btn").addEventListener("click", () => void placeCall("voice"));
document.getElementById("video-call-btn").addEventListener("click", () => void placeCall("video"));
document.getElementById("accept-btn").addEventListener("click", async () => {
  try {
    incomingActions.style.display = "none";
    activeControls.style.display = "flex";
    cameraBtn.style.display = session?.callType === "video" ? "flex" : "none";
    const stream = await session.acceptCall();
    if (session.callType === "video") {
      localVideo.srcObject = stream;
      localVideo.classList.add("is-visible");
    }
  } catch (error) {
    console.error("Wisp call accept failed.", error);
    showCallError("Couldn't join the private call. Please try again.");
  }
});
document.getElementById("decline-btn").addEventListener("click", async () => {
  try { await session?.declineCall(); } catch (error) { console.error("Wisp call decline failed.", error); }
  await teardownCall(true);
});
document.getElementById("hangup-btn").addEventListener("click", async () => {
  try { await session?.hangUp(); } catch (error) { console.error("Wisp hang-up failed.", error); }
  await teardownCall(true);
});
muteBtn.addEventListener("click", () => {
  const isMuted = session?.toggleMute() || false;
  muteBtn.classList.toggle("is-active", isMuted);
  muteBtn.setAttribute("aria-pressed", String(isMuted));
  muteBtn.setAttribute("aria-label", isMuted ? "Unmute microphone" : "Mute microphone");
});
cameraBtn.addEventListener("click", () => {
  const isOff = session?.toggleCamera() || false;
  cameraBtn.classList.toggle("is-active", isOff);
  cameraBtn.setAttribute("aria-pressed", String(isOff));
  cameraBtn.setAttribute("aria-label", isOff ? "Turn camera on" : "Turn camera off");
});

if (!isUuid(chatId)) {
  banner.textContent = "No valid conversation was selected.";
  banner.classList.add("is-visible");
  form.hidden = true;
} else {
  try {
    const user = await requireAuth();
    await initChat(user);
    session = createSession();
  } catch (error) {
    banner.textContent = "Couldn't load this conversation.";
    banner.classList.add("is-visible");
    form.hidden = true;
    console.error("Wisp conversation failed to open.", error);
  }
}

window.addEventListener("pagehide", () => {
  void unsubscribeMessages?.();
  // A keepalive RPC gives the browser a best-effort chance to release the
  // server call record even while this page is being discarded.
  void session?.destroy({ keepalive: true }).catch((error) => {
    console.warn("Wisp could not confirm call cleanup while closing the page.", error);
  });
  window.clearInterval(durationTimer);
}, { once: true });
