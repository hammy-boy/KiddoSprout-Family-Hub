import { initTheme } from "./theme.js";
import { requireAuth } from "./authGuard.js";
import {
  deleteMessage,
  getProfile,
  listMessages,
  listMessagesByIds,
  markChatRead,
  sendMessage,
  subscribeToChatActivity,
} from "./chatData.js";
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
const callDuration = document.getElementById("call-duration");
const incomingActions = document.getElementById("incoming-actions");
const activeControls = document.getElementById("active-controls");
const cameraBtn = document.getElementById("camera-btn");
const muteBtn = document.getElementById("mute-btn");
const appShell = document.querySelector(".app-shell");
const voiceCallBtn = document.getElementById("voice-call-btn");
const videoCallBtn = document.getElementById("video-call-btn");

let myUserId = null;
let otherProfile = null;
let chatActivity = null;
let session = null;
let callStartedAt = 0;
let durationTimer = 0;
let callCleanupInProgress = false;
let messages = [];
let draftKey = "";
let refreshInFlight = null;
let refreshInFlightVersion = -1;
let refreshQueued = false;
let refreshForceBottom = false;
let scrollReadTimer = 0;
let peerRefreshTimer = 0;
let messagePollTimer = 0;
let presenceExpiryTimer = 0;
let focusBeforeCall = null;
let chatReady = false;
let hasOlderMessages = false;
let loadingOlderMessages = false;
let knownRefreshInFlight = null;
let knownRefreshInFlightVersion = -1;
let knownRefreshQueued = false;
let knownRefreshFullQueued = false;
let messageMutationVersion = 0;
let readMarkQueued = false;
let pageActive = true;
let pageVersion = 0;
let currentUserId = "";
let activityConnectVersion = 0;
let callGeneration = 0;
let callStartInFlight = false;
let callAcceptInFlight = false;
let hasCompletedInitialLoad = false;
const markedReadIds = new Set();

function isCurrentPage(version = pageVersion) {
  return pageActive && version === pageVersion;
}

function characterLength(value) {
  return [...String(value || "")].length;
}

textarea.disabled = true;
voiceCallBtn.disabled = true;
videoCallBtn.disabled = true;

const newMessagesButton = document.createElement("button");
newMessagesButton.type = "button";
newMessagesButton.className = "new-messages-btn";
newMessagesButton.textContent = "New messages";
newMessagesButton.hidden = true;
form.before(newMessagesButton);

const loadOlderButton = document.createElement("button");
loadOlderButton.type = "button";
loadOlderButton.className = "load-older-messages-btn";
loadOlderButton.textContent = "Load earlier messages";
loadOlderButton.hidden = true;
body.before(loadOlderButton);

const paginationStatus = document.createElement("div");
paginationStatus.className = "visually-hidden";
paginationStatus.setAttribute("role", "status");
paginationStatus.setAttribute("aria-live", "polite");
loadOlderButton.after(paginationStatus);

const connectionStatus = document.createElement("div");
connectionStatus.className = "chat-connection-status";
connectionStatus.setAttribute("role", "status");
connectionStatus.setAttribute("aria-live", "polite");
connectionStatus.hidden = true;
form.before(connectionStatus);

const characterCount = document.createElement("span");
characterCount.id = "composer-character-count";
characterCount.className = "composer-character-count";
characterCount.setAttribute("aria-live", "polite");
textarea.setAttribute("aria-describedby", characterCount.id);
textarea.closest(".composer-input-wrap")?.append(characterCount);

function initials(name) {
  return String(name || "?").slice(0, 2).toUpperCase();
}

function formatTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDay(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function dayKey(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isNearBottom() {
  return body.scrollHeight - body.scrollTop - body.clientHeight < 96;
}

function scrollToLatest() {
  body.scrollTop = body.scrollHeight;
  newMessagesButton.hidden = true;
}

function canUpdateMessagesInPlace(nextMessages) {
  return nextMessages.length === messages.length && nextMessages.every((message, index) => {
    const previous = messages[index];
    return message.id === previous?.id
      && message.sender_id === previous.sender_id
      && message.content === previous.content
      && message.created_at === previous.created_at
      && message.deleted_at === previous.deleted_at;
  });
}

function updateDeliveryLabels(nextMessages) {
  const nextById = new Map(nextMessages.map((message) => [message.id, message]));
  for (const delivery of body.querySelectorAll("[data-message-id] .bubble-delivery")) {
    const row = delivery.closest("[data-message-id]");
    const message = nextById.get(row?.dataset.messageId);
    if (message) delivery.textContent = message.read_at ? "Read" : "Sent";
  }
  messages = nextMessages;
}

function createMessageRow(message) {
  const row = document.createElement("div");
  row.className = `bubble-row${message.sender_id === myUserId ? " is-mine" : ""}`;
  row.dataset.messageId = message.id;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const content = document.createElement("div");
  content.className = "bubble-content";
  const sender = document.createElement("span");
  sender.className = "visually-hidden";
  sender.textContent = message.sender_id === myUserId
    ? "You: "
    : `${otherProfile?.username || "Contact"}: `;
  content.append(sender);
  if (message.deleted_at) {
    const deleted = document.createElement("em");
    deleted.textContent = "Message deleted";
    content.append(deleted);
  } else {
    content.append(document.createTextNode(String(message.content || "")));
  }
  const meta = document.createElement("div");
  meta.className = "bubble-meta";
  const time = document.createElement("span");
  time.textContent = formatTime(message.created_at);
  meta.append(time);
  if (message.sender_id === myUserId && !message.deleted_at) {
    const delivery = document.createElement("span");
    delivery.className = "bubble-delivery";
    delivery.textContent = message.read_at ? "Read" : "Sent";
    meta.append(delivery);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "bubble-delete-btn";
    deleteButton.dataset.deleteMessage = message.id;
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete message sent ${formatTime(message.created_at)}`);
    meta.append(deleteButton);
  }
  bubble.append(content, meta);
  row.append(bubble);
  return row;
}

function appendMessageNodes(target, items, startingDay = "") {
  let previousDay = startingDay;
  for (const message of items) {
    const currentDay = dayKey(message.created_at);
    if (currentDay !== previousDay) {
      const day = document.createElement("div");
      day.className = "chat-day-label";
      day.textContent = formatDay(message.created_at);
      day.setAttribute("role", "separator");
      target.append(day);
      previousDay = currentDay;
    }
    target.append(createMessageRow(message));
  }
}

function prependEarlierMessages(olderMessages) {
  if (!olderMessages.length) return;
  const previousTop = body.scrollTop;
  const previousHeight = body.scrollHeight;
  const firstCurrent = messages[0];
  const firstDayLabel = body.querySelector(".chat-day-label");
  const fragment = document.createDocumentFragment();
  appendMessageNodes(fragment, olderMessages);
  if (firstCurrent
      && dayKey(olderMessages.at(-1)?.created_at) === dayKey(firstCurrent.created_at)
      && firstDayLabel) {
    firstDayLabel.remove();
  }
  const previousLive = body.getAttribute("aria-live");
  body.setAttribute("aria-live", "off");
  body.insertBefore(fragment, body.firstChild);
  messages = mergeMessages(olderMessages, messages);
  body.scrollTop = previousTop + Math.max(0, body.scrollHeight - previousHeight);
  window.requestAnimationFrame(() => body.setAttribute("aria-live", previousLive || "polite"));
}

function renderMessages(nextMessages, { forceBottom = false, preserveAnchor = false } = {}) {
  const shouldFollowLatest = forceBottom || isNearBottom() || messages.length === 0;
  const previousTop = body.scrollTop;
  const previousHeight = body.scrollHeight;
  const previousIds = new Set(messages.map(({ id }) => id));
  const hasNewIncoming = nextMessages.some((message) =>
    !previousIds.has(message.id) && message.sender_id !== myUserId,
  );
  if (canUpdateMessagesInPlace(nextMessages)) {
    updateDeliveryLabels(nextMessages);
    if (shouldFollowLatest) scrollToLatest();
    return;
  }

  const sameIds = nextMessages.length === messages.length
    && nextMessages.every((message, index) => message.id === messages[index]?.id);
  if (sameIds) {
    nextMessages.forEach((message, index) => {
      const previous = messages[index];
      if (message.content !== previous.content || message.deleted_at !== previous.deleted_at) {
        body.querySelector(`[data-message-id="${message.id}"]`)?.replaceWith(createMessageRow(message));
      }
    });
    updateDeliveryLabels(nextMessages);
  } else {
    const appendOnly = messages.length > 0
      && nextMessages.length > messages.length
      && messages.every((message, index) => message.id === nextMessages[index]?.id);
    if (appendOnly) {
      const fragment = document.createDocumentFragment();
      appendMessageNodes(fragment, nextMessages.slice(messages.length), dayKey(messages.at(-1)?.created_at));
      body.append(fragment);
    } else {
      const fragment = document.createDocumentFragment();
      appendMessageNodes(fragment, nextMessages);
      body.replaceChildren(fragment);
    }
    messages = nextMessages;
  }
  if (shouldFollowLatest) scrollToLatest();
  else {
    body.scrollTop = preserveAnchor
      ? previousTop + Math.max(0, body.scrollHeight - previousHeight)
      : previousTop;
    if (hasNewIncoming) newMessagesButton.hidden = false;
  }
}

function mergeMessages(...pages) {
  const byId = new Map();
  for (const page of pages) {
    for (const message of page) byId.set(message.id, message);
  }
  return [...byId.values()].sort((left, right) => {
    const timeDifference = Date.parse(left.created_at) - Date.parse(right.created_at);
    return timeDifference || left.id.localeCompare(right.id);
  });
}

async function refreshKnownMessages({ full = false, version = pageVersion } = {}) {
  if (!isCurrentPage(version)) return;
  knownRefreshFullQueued ||= full;
  if (knownRefreshInFlight) {
    if (knownRefreshInFlightVersion !== version) {
      const staleRequest = knownRefreshInFlight;
      await staleRequest.catch(() => {});
      if (knownRefreshInFlight === staleRequest) knownRefreshInFlight = null;
      if (isCurrentPage(version)) return refreshKnownMessages({ full, version });
      return;
    }
    knownRefreshQueued = true;
    return knownRefreshInFlight;
  }
  knownRefreshInFlightVersion = version;
  const request = (async () => {
    do {
      knownRefreshQueued = false;
      const refreshAll = knownRefreshFullQueued;
      knownRefreshFullQueued = false;
      const allIds = [...new Set(messages.map(({ id }) => id).filter(isUuid))];
      const ids = refreshAll
        ? allIds
        : allIds.slice(-WISP_LIMITS.messageRefresh);
      if (!ids.length) continue;
      if (!refreshAll && ids.length < allIds.length) {
        const refreshedIdSet = new Set(ids);
        // Older receipt labels are hidden until explicitly rechecked. This is
        // conservative if a peer has since disabled receipt sharing.
        renderMessages(messages.map((message) => (
          message.sender_id === myUserId && !refreshedIdSet.has(message.id)
            ? { ...message, read_at: null }
            : message
        )));
      }
      const refreshVersion = messageMutationVersion;
      const refreshed = [];
      for (let index = 0; index < ids.length; index += WISP_LIMITS.messages) {
        refreshed.push(...await listMessagesByIds(chatId, ids.slice(index, index + WISP_LIMITS.messages)));
        if (!isCurrentPage(version)) break;
      }
      if (!isCurrentPage(version)) break;
      if (refreshVersion !== messageMutationVersion) {
        knownRefreshQueued = true;
        continue;
      }
      const refreshedById = new Map(refreshed.map((message) => [message.id, message]));
      const requestedIds = new Set(ids);
      const retainedMessages = messages
        .filter((message) => !requestedIds.has(message.id) || refreshedById.has(message.id))
        .map((message) => refreshedById.get(message.id) || message);
      renderMessages(mergeMessages(retainedMessages, refreshed));
    } while (knownRefreshQueued && isCurrentPage(version));
  })();
  knownRefreshInFlight = request;
  try {
    await request;
  } finally {
    if (knownRefreshInFlight === request) {
      knownRefreshInFlight = null;
      knownRefreshInFlightVersion = -1;
    }
  }
}

function visiblePeerMessageIds() {
  if (document.visibilityState !== "visible"
      || overlay.classList.contains("is-visible")
      || appShell?.inert) return [];
  const viewport = body.getBoundingClientRect();
  const messageById = new Map(messages.map((message) => [message.id, message]));
  return [...body.querySelectorAll("[data-message-id]")]
    .filter((row) => {
      const message = messageById.get(row.dataset.messageId);
      if (!message || message.sender_id === myUserId || message.deleted_at || markedReadIds.has(message.id)) {
        return false;
      }
      const bounds = row.getBoundingClientRect();
      return bounds.bottom > viewport.top && bounds.top < viewport.bottom;
    })
    .map((row) => row.dataset.messageId)
    .filter(isUuid)
    .slice(0, WISP_LIMITS.messages);
}

let readMarkInFlight = null;
async function markVisibleMessagesRead() {
  if (readMarkInFlight) {
    readMarkQueued = true;
    return readMarkInFlight;
  }
  readMarkInFlight = (async () => {
    let markedTotal = 0;
    do {
      readMarkQueued = false;
      const visibleIds = visiblePeerMessageIds();
      if (!visibleIds.length) continue;
      const marked = await markChatRead(chatId, visibleIds);
      visibleIds.forEach((id) => markedReadIds.add(id));
      markedTotal += marked;
    } while (readMarkQueued && pageActive);
    return markedTotal;
  })();
  try {
    return await readMarkInFlight;
  } finally {
    readMarkInFlight = null;
  }
}

function updateLoadOlderButton() {
  loadOlderButton.hidden = !hasOlderMessages;
  loadOlderButton.disabled = loadingOlderMessages;
  loadOlderButton.textContent = loadingOlderMessages ? "Loading…" : "Load earlier messages";
}

function renderPeerPresence(profile) {
  otherProfile = profile;
  const statusElement = document.getElementById("chat-status");
  const lastSeenAt = Date.parse(profile?.last_seen || "");
  const online = profile?.status === "online"
    && Number.isFinite(lastSeenAt)
    && Date.now() - lastSeenAt < 90_000;
  statusElement.textContent = online ? "Online" : "Offline";
  window.clearTimeout(presenceExpiryTimer);
  if (online) {
    presenceExpiryTimer = window.setTimeout(() => {
      statusElement.textContent = "Offline";
    }, Math.max(0, 90_000 - (Date.now() - lastSeenAt)) + 100);
  }
}

async function refreshPeerPresence() {
  if (!pageActive || !isUuid(otherProfile?.id) || document.visibilityState !== "visible") return;
  const version = pageVersion;
  try {
    const profile = await getProfile(otherProfile.id);
    if (isCurrentPage(version)) renderPeerPresence(profile);
  } catch (error) {
    console.warn("Wisp could not refresh contact presence.", error);
  }
}

async function reloadMessages(options = {}) {
  const version = options.version ?? pageVersion;
  if (!isCurrentPage(version)) return;
  refreshForceBottom ||= options.forceBottom === true;
  if (refreshInFlight) {
    if (refreshInFlightVersion !== version) {
      const staleRequest = refreshInFlight;
      await staleRequest.catch(() => {});
      if (refreshInFlight === staleRequest) refreshInFlight = null;
      if (isCurrentPage(version)) return reloadMessages(options);
      return;
    }
    refreshQueued = true;
    return refreshInFlight;
  }

  refreshInFlightVersion = version;
  const request = (async () => {
    do {
      refreshQueued = false;
      const forceBottom = refreshForceBottom;
      refreshForceBottom = false;
      const reloadVersion = messageMutationVersion;
      const latestPage = await listMessages(chatId);
      if (!isCurrentPage(version)) break;
      if (reloadVersion !== messageMutationVersion) {
        refreshQueued = true;
        continue;
      }
      const loadedIds = new Set(messages.map(({ id }) => id));
      const overlapsLoadedHistory = latestPage.some(({ id }) => loadedIds.has(id));
      const historyHasGap = messages.length > 0 && !overlapsLoadedHistory;
      if (messages.length === 0 || historyHasGap) {
        hasOlderMessages = latestPage.length === WISP_LIMITS.messagePage;
      }
      if (historyHasGap) {
        // More than one page may have arrived while this tab was asleep. Reset
        // to a contiguous newest page so Load earlier can walk back without a
        // permanent hole in the timeline.
        messageMutationVersion += 1;
        messages = [];
        paginationStatus.textContent = "The newest messages are shown. Load earlier messages to review anything missed while away.";
      }
      const nextMessages = messages.length ? mergeMessages(messages, latestPage) : latestPage;
      renderMessages(nextMessages, { forceBottom: forceBottom || historyHasGap });
      updateLoadOlderButton();
      if (document.visibilityState === "visible" && (forceBottom || isNearBottom())) {
        await markVisibleMessagesRead().catch((error) => {
          console.warn("Wisp could not update read status.", error);
        });
      }
    } while (refreshQueued && isCurrentPage(version));
  })();
  refreshInFlight = request;

  try {
    await request;
  } finally {
    if (refreshInFlight === request) {
      refreshInFlight = null;
      refreshInFlightVersion = -1;
    }
  }
}

function startMessagePolling(version = pageVersion) {
  window.clearInterval(messagePollTimer);
  messagePollTimer = window.setInterval(() => {
    if (!isCurrentPage(version) || document.visibilityState !== "visible" || !navigator.onLine) return;
    void reloadMessages({ version }).then(() => refreshKnownMessages({ version })).catch((error) => {
      console.warn("Wisp background message refresh paused.", error);
    });
  }, 15_000);
}

async function connectChatActivity(version = pageVersion) {
  if (!isCurrentPage(version)) return false;
  const connectionVersion = ++activityConnectVersion;
  const previous = chatActivity;
  chatActivity = null;
  await previous?.unsubscribe().catch(() => {});
  if (!isCurrentPage(version) || connectionVersion !== activityConnectVersion) return false;
  const nextActivity = await subscribeToChatActivity(chatId, {
    onRefresh: () => {
      if (!isCurrentPage()) return;
      void reloadMessages().then(() => refreshKnownMessages({ full: true })).catch((error) => {
        console.warn("Wisp could not refresh changed messages.", error);
      });
    },
  });
  if (!isCurrentPage(version) || connectionVersion !== activityConnectVersion) {
    await nextActivity.unsubscribe().catch(() => {});
    return false;
  }
  chatActivity = nextActivity;
  await reloadMessages({ version });
  return isCurrentPage(version);
}

async function initChat(user, version = pageVersion) {
  if (!isCurrentPage(version)) return false;
  chatReady = false;
  loadingOlderMessages = false;
  body.removeAttribute("aria-busy");
  updateLoadOlderButton();
  textarea.disabled = true;
  voiceCallBtn.disabled = true;
  videoCallBtn.disabled = true;
  myUserId = user.id;
  const client = requireSupabase();
  const { data: members, error } = await client
    .from(WISP_TABLES.chatMembers)
    .select("user_id")
    .eq("chat_id", chatId);
  if (error) throw error;
  if (!isCurrentPage(version)) return false;
  const peerId = (members || []).find((member) => member.user_id !== myUserId)?.user_id;
  if (!isUuid(peerId)) throw new Error("This conversation does not have another member.");
  const peerProfile = await getProfile(peerId);
  if (!isCurrentPage(version)) return false;
  renderPeerPresence(peerProfile);
  document.getElementById("chat-name").textContent = otherProfile.username;
  document.getElementById("chat-avatar").textContent = initials(otherProfile.username);
  body.setAttribute("aria-label", `Messages with ${otherProfile.username}`);

  draftKey = `wisp:draft:${myUserId}:${chatId}`;
  try {
    textarea.value = window.sessionStorage.getItem(draftKey) || "";
  } catch {
    textarea.value = "";
  }
  updateComposer();

  const initialLiveMode = "polite";
  body.setAttribute("aria-live", "off");
  try {
    await reloadMessages({ forceBottom: !hasCompletedInitialLoad, version });
    if (isCurrentPage(version)) hasCompletedInitialLoad = true;
  } finally {
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    if (isCurrentPage(version)) body.setAttribute("aria-live", initialLiveMode);
  }
  if (!isCurrentPage(version)) return false;
  chatReady = true;
  textarea.disabled = false;
  updateCallStartButtons();
  updateComposer();
  try {
    await connectChatActivity(version);
    if (!isCurrentPage(version)) return false;
    banner.classList.remove("is-visible");
  } catch (realtimeError) {
    if (isCurrentPage(version)) {
      banner.textContent = "Messages loaded. Instant updates are paused; Wisp will keep checking safely.";
      banner.classList.add("is-visible");
      console.warn("Wisp live message updates paused.", realtimeError);
    }
  }
  if (!isCurrentPage(version)) return false;
  window.clearInterval(peerRefreshTimer);
  peerRefreshTimer = window.setInterval(() => void refreshPeerPresence(), 60_000);
  startMessagePolling(version);
  return true;
}

function updateComposer() {
  const length = characterLength(textarea.value.trim());
  sendBtn.disabled = !chatReady || !navigator.onLine || length === 0 || length > WISP_LIMITS.message;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
  characterCount.textContent = length >= WISP_LIMITS.message - 400
    ? `${length} / ${WISP_LIMITS.message}`
    : "";
}

textarea.addEventListener("input", () => {
  updateComposer();
  if (!draftKey) return;
  try {
    if (textarea.value) window.sessionStorage.setItem(draftKey, textarea.value);
    else window.sessionStorage.removeItem(draftKey);
  } catch {
    // A private browser mode may deny storage; the composer still works.
  }
});

textarea.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (!sendBtn.disabled) form.requestSubmit();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = textarea.value.trim();
  if (!text || characterLength(text) > WISP_LIMITS.message || !isUuid(chatId)) return;
  sendBtn.disabled = true;
  let sentMessage;
  try {
    sentMessage = await sendMessage(chatId, text);
  } catch (error) {
    banner.textContent = "Message failed to send. Please try again.";
    banner.classList.add("is-visible");
    console.error("Wisp message send failed.", error);
    updateComposer();
    return;
  }

  textarea.value = "";
  textarea.style.height = "auto";
  try { window.sessionStorage.removeItem(draftKey); } catch {}
  renderMessages(mergeMessages(messages, [{ ...sentMessage, read_at: null }]), { forceBottom: true });
  updateComposer();
  try {
    await reloadMessages({ forceBottom: true });
    banner.classList.remove("is-visible");
  } catch (error) {
    banner.textContent = "Message sent. The conversation will refresh when the connection recovers.";
    banner.classList.add("is-visible");
    console.warn("Wisp sent a message but could not refresh the conversation.", error);
  } finally {
    updateComposer();
  }
});

body.addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("[data-delete-message]");
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;
  const messageId = button.dataset.deleteMessage;
  if (!isUuid(messageId) || !window.confirm("Delete this message for everyone in this chat?")) return;
  button.disabled = true;
  try {
    await deleteMessage(messageId);
    messageMutationVersion += 1;
    const deletedAt = new Date().toISOString();
    renderMessages(messages.map((message) => message.id === messageId
      ? { ...message, content: null, deleted_at: deletedAt, read_at: null }
      : message));
    banner.classList.remove("is-visible");
  } catch (error) {
    banner.textContent = "Couldn't delete that message. Please try again.";
    banner.classList.add("is-visible");
    button.disabled = false;
    console.error("Wisp message deletion failed.", error);
  }
});

newMessagesButton.addEventListener("click", () => {
  scrollToLatest();
  void markVisibleMessagesRead().catch((error) => {
    console.warn("Wisp could not update read status.", error);
  });
});

loadOlderButton.addEventListener("click", async () => {
  const oldest = messages[0];
  if (loadingOlderMessages || !hasOlderMessages || !oldest) return;
  const version = pageVersion;
  const cursorId = oldest.id;
  const cursorCreatedAt = oldest.created_at;
  loadingOlderMessages = true;
  body.setAttribute("aria-busy", "true");
  updateLoadOlderButton();
  try {
    const olderPage = await listMessages(chatId, {
      before: { id: cursorId, createdAt: cursorCreatedAt },
    });
    if (!isCurrentPage(version)
        || messages[0]?.id !== cursorId
        || messages[0]?.created_at !== cursorCreatedAt) return;
    hasOlderMessages = olderPage.length === WISP_LIMITS.messagePage;
    if (olderPage.length) {
      prependEarlierMessages(olderPage);
      paginationStatus.textContent = `${olderPage.length} earlier ${olderPage.length === 1 ? "message" : "messages"} loaded.`;
    }
    banner.classList.remove("is-visible");
  } catch (error) {
    if (!isCurrentPage(version)) return;
    banner.textContent = "Couldn't load earlier messages. Please try again.";
    banner.classList.add("is-visible");
    console.error("Wisp earlier-message load failed.", error);
  } finally {
    if (!isCurrentPage(version)) return;
    body.removeAttribute("aria-busy");
    loadingOlderMessages = false;
    updateLoadOlderButton();
    if (!hasOlderMessages && document.activeElement === loadOlderButton) body.focus({ preventScroll: true });
  }
});

body.addEventListener("scroll", () => {
  if (isNearBottom()) newMessagesButton.hidden = true;
  window.clearTimeout(scrollReadTimer);
  scrollReadTimer = window.setTimeout(() => {
    if (document.visibilityState !== "visible") return;
    void markVisibleMessagesRead().catch((error) => {
      console.warn("Wisp could not update read status.", error);
    });
  }, 180);
}, { passive: true });

function updateConnectionStatus() {
  const offline = !navigator.onLine;
  appShell?.classList.toggle("is-offline", offline);
  connectionStatus.hidden = !offline;
  connectionStatus.textContent = offline
    ? "You're offline. Your draft is safe in this tab and will not be sent yet."
    : "";
  updateComposer();
}

window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
updateConnectionStatus();

document.addEventListener("visibilitychange", () => {
  if (!pageActive || document.visibilityState !== "visible" || !isUuid(chatId)) return;
  const version = pageVersion;
  void reloadMessages({ version }).then(() => refreshKnownMessages({ full: true, version })).catch((error) => {
    console.warn("Wisp could not refresh the restored conversation.", error);
  });
  void refreshPeerPresence();
});

function showCallError(message) {
  callErrorBanner.textContent = message;
  callErrorBanner.classList.add("is-visible");
}

function openOverlay() {
  if (!overlay.classList.contains("is-visible")) {
    focusBeforeCall = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  overlay.classList.add("is-visible");
  overlay.setAttribute("aria-hidden", "false");
  if (appShell) appShell.inert = true;
  callErrorBanner.classList.remove("is-visible");
  if (otherProfile) {
    callName.textContent = otherProfile.username;
    callAvatar.textContent = initials(otherProfile.username);
  }
  overlay.focus();
}

function closeOverlay() {
  const wasOpen = overlay.classList.contains("is-visible");
  overlay.classList.remove("is-visible");
  overlay.setAttribute("aria-hidden", "true");
  if (appShell) appShell.inert = false;
  remoteVideo.classList.remove("is-visible");
  localVideo.classList.remove("is-visible");
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
  incomingActions.style.display = "none";
  activeControls.style.display = "none";
  cameraBtn.style.display = "none";
  muteBtn.classList.remove("is-active");
  muteBtn.setAttribute("aria-pressed", "false");
  muteBtn.setAttribute("aria-label", "Mute microphone");
  cameraBtn.classList.remove("is-active");
  cameraBtn.setAttribute("aria-pressed", "false");
  cameraBtn.setAttribute("aria-label", "Turn camera off");
  callDuration.hidden = true;
  callDuration.textContent = "";
  window.clearInterval(durationTimer);
  durationTimer = 0;
  if (wasOpen && focusBeforeCall?.isConnected) focusBeforeCall.focus();
  focusBeforeCall = null;
  if (wasOpen && pageActive && document.visibilityState === "visible") {
    window.requestAnimationFrame(() => {
      void markVisibleMessagesRead().catch((error) => {
        console.warn("Wisp could not update read status after the call closed.", error);
      });
    });
  }
}

overlay.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const controls = [...overlay.querySelectorAll("button:not([disabled])")]
    .filter((button) => button.getClientRects().length > 0);
  if (!controls.length) {
    event.preventDefault();
    overlay.focus();
    return;
  }
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && (document.activeElement === first || document.activeElement === overlay)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

function startDurationTimer() {
  window.clearInterval(durationTimer);
  callStartedAt = Date.now();
  callDuration.hidden = false;
  callDuration.textContent = "00:00";
  durationTimer = window.setInterval(() => {
    const seconds = Math.floor((Date.now() - callStartedAt) / 1000);
    const minutesPart = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secondsPart = String(seconds % 60).padStart(2, "0");
    callDuration.textContent = `${minutesPart}:${secondsPart}`;
  }, 1000);
}

function updateCallStartButtons() {
  const disabled = !pageActive || !chatReady || callCleanupInProgress || callStartInFlight;
  voiceCallBtn.disabled = disabled;
  videoCallBtn.disabled = disabled;
}

function createSession() {
  const generation = callGeneration;
  let createdSession;
  createdSession = new CallSession(chatId, {
    onIncomingCall: ({ callType }) => {
      if (!pageActive || generation !== callGeneration || session !== createdSession) return;
      openOverlay();
      callStatus.textContent = callType === "video" ? "Incoming video call…" : "Incoming voice call…";
      incomingActions.style.display = "flex";
      activeControls.style.display = "none";
      document.getElementById("accept-btn").focus();
    },
    onRemoteStream: (stream) => {
      if (!pageActive || generation !== callGeneration || session !== createdSession) return;
      remoteVideo.srcObject = stream;
      if (session?.callType === "video") remoteVideo.classList.add("is-visible");
    },
    onStateChange: (state) => {
      if (!pageActive || generation !== callGeneration || session !== createdSession) return;
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
      } else if (state === "unanswered") {
        banner.textContent = "No answer. Ask your contact to keep this chat open, then try again.";
        banner.classList.add("is-visible");
        void teardownCall(true);
      } else if (state === "superseded") {
        // Another tab for this same account accepted or ended the incoming call.
        void teardownCall(true);
      } else if (state === "ended") {
        void teardownCall(true);
      }
    },
  });
  return createdSession;
}

async function teardownCall(rearm) {
  if (callCleanupInProgress) return;
  callCleanupInProgress = true;
  const cleanupGeneration = ++callGeneration;
  updateCallStartButtons();
  closeOverlay();
  const previous = session;
  session = null;
  await previous?.destroy().catch(() => {});
  if (rearm
      && pageActive
      && cleanupGeneration === callGeneration
      && !session
      && isUuid(chatId)) session = createSession();
  callCleanupInProgress = false;
  updateCallStartButtons();
}

async function placeCall(callType) {
  if (!chatReady || !pageActive || callCleanupInProgress || callStartInFlight) return;
  callStartInFlight = true;
  updateCallStartButtons();
  if (!session) session = createSession();
  const activeSession = session;
  const generation = callGeneration;
  try {
    openOverlay();
    callStatus.textContent = "Calling…";
    incomingActions.style.display = "none";
    activeControls.style.display = "flex";
    cameraBtn.style.display = callType === "video" ? "flex" : "none";
    document.getElementById("hangup-btn").focus();
    const stream = await activeSession.startCall(callType);
    if (!pageActive || generation !== callGeneration || session !== activeSession) {
      stream?.getTracks().forEach((track) => track.stop());
      await activeSession.destroy().catch(() => {});
      return;
    }
    if (callType === "video") {
      localVideo.srcObject = stream;
      localVideo.classList.add("is-visible");
    }
  } catch (error) {
    if (!pageActive || generation !== callGeneration) return;
    console.error("Wisp call start failed.", error);
    showCallError(error.name === "NotAllowedError"
      ? "Camera or microphone access was blocked. Allow access in your browser and try again."
      : "Couldn't start the private call. Please try again.");
  } finally {
    callStartInFlight = false;
    updateCallStartButtons();
  }
}

voiceCallBtn.addEventListener("click", () => void placeCall("voice"));
videoCallBtn.addEventListener("click", () => void placeCall("video"));
document.getElementById("accept-btn").addEventListener("click", async () => {
  if (callAcceptInFlight || !session || callCleanupInProgress) return;
  callAcceptInFlight = true;
  const acceptButton = document.getElementById("accept-btn");
  acceptButton.disabled = true;
  const activeSession = session;
  const generation = callGeneration;
  try {
    incomingActions.style.display = "none";
    activeControls.style.display = "flex";
    cameraBtn.style.display = session?.callType === "video" ? "flex" : "none";
    const stream = await activeSession.acceptCall();
    if (!pageActive || generation !== callGeneration || session !== activeSession) {
      stream?.getTracks().forEach((track) => track.stop());
      await activeSession.destroy().catch(() => {});
      return;
    }
    if (activeSession.callType === "video") {
      localVideo.srcObject = stream;
      localVideo.classList.add("is-visible");
    }
  } catch (error) {
    if (!pageActive || generation !== callGeneration) return;
    console.error("Wisp call accept failed.", error);
    showCallError("Couldn't join the private call. Please try again.");
  } finally {
    callAcceptInFlight = false;
    acceptButton.disabled = false;
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

async function startPage() {
  if (!isUuid(chatId)) return;
  const version = pageVersion;
  try {
    const user = await requireAuth(currentUserId);
    if (!isCurrentPage(version)) return;
    currentUserId ||= user.id;
    form.hidden = false;
    const initialized = await initChat(user, version);
    if (!initialized || !isCurrentPage(version)) return;
    if (!callCleanupInProgress) session ||= createSession();
    updateCallStartButtons();
  } catch (error) {
    if (!isCurrentPage(version)) return;
    banner.textContent = "Couldn't load this conversation.";
    banner.classList.add("is-visible");
    form.hidden = true;
    console.error("Wisp conversation failed to open.", error);
  }
}

window.addEventListener("pagehide", () => {
  pageActive = false;
  pageVersion += 1;
  activityConnectVersion += 1;
  chatReady = false;
  loadingOlderMessages = false;
  body.removeAttribute("aria-busy");
  updateLoadOlderButton();
  textarea.disabled = true;
  updateCallStartButtons();
  window.clearTimeout(scrollReadTimer);
  window.clearTimeout(presenceExpiryTimer);
  window.clearInterval(peerRefreshTimer);
  window.clearInterval(messagePollTimer);
  peerRefreshTimer = 0;
  messagePollTimer = 0;
  const previousActivity = chatActivity;
  chatActivity = null;
  void previousActivity?.unsubscribe();
  // A keepalive RPC gives the browser a best-effort chance to release the
  // server call record even while this page is being discarded.
  const previousSession = session;
  session = null;
  const cleanupGeneration = ++callGeneration;
  callCleanupInProgress = true;
  closeOverlay();
  void Promise.resolve(previousSession?.destroy({ keepalive: true })).catch((error) => {
    console.warn("Wisp could not confirm call cleanup while closing the page.", error);
  }).finally(() => {
    if (cleanupGeneration !== callGeneration) return;
    callCleanupInProgress = false;
    if (pageActive && chatReady && !session) session = createSession();
    updateCallStartButtons();
  });
  window.clearInterval(durationTimer);
});

window.addEventListener("pageshow", (event) => {
  if (!event.persisted || !isUuid(chatId)) return;
  pageActive = true;
  pageVersion += 1;
  void startPage();
});

if (!isUuid(chatId)) {
  banner.textContent = "No valid conversation was selected.";
  banner.classList.add("is-visible");
  form.hidden = true;
} else {
  void startPage();
}
