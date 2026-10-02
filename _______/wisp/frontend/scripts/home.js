import { initTheme, wireThemeToggle } from "./theme.js";
import { renderTabBar } from "./tabBar.js";
import { requireAuth } from "./authGuard.js";
import { listMyChats } from "./chatData.js";
import { WISP_LIMITS, isUuid } from "./config.js";

initTheme();
wireThemeToggle(document.getElementById("theme-toggle"));
renderTabBar("home");

const list = document.getElementById("chat-list");
const banner = document.getElementById("load-banner");
const searchInput = document.getElementById("search-input");
const loadMoreButton = document.getElementById("load-more-chats");
const paginationStatus = document.getElementById("inbox-pagination-status");
const searchStatus = document.getElementById("chat-search-status");
const INBOX_PAGE_SIZE = 40;
let allChats = [];
let nextPageCursor = null;
let hasMoreChats = false;
let loadTimer = 0;
let loadInFlight = null;
let loadMoreInFlight = null;
let loadQueued = false;
let presencePollTimer = 0;
let presenceExpiryTimer = 0;
let dateBoundaryTimer = 0;
let lastRenderSignature = "";
let pageActive = true;
let pageVersion = 0;
let currentUserId = "";

function isCurrentPage(version = pageVersion) {
  return pageActive && version === pageVersion;
}

function mergeChats(...groups) {
  const byId = new Map();
  for (const chat of groups.flat()) {
    if (isUuid(chat?.chatId)) byId.set(chat.chatId, chat);
  }
  // Pages already arrive in the database's exact activity/tie-break order.
  // Map preserves that insertion order while removing a duplicate caused by
  // a conversation becoming active between two page requests.
  return [...byId.values()];
}

function cursorKey(cursor) {
  return cursor ? `${cursor.activityAt}|${cursor.chatId}` : "first-page";
}

async function loadChatWindow(minimumVisibleChats) {
  let chats = [];
  const seenCursors = new Set();
  let before = null;
  let hasMore = true;

  while (hasMore && chats.length < minimumVisibleChats) {
    const key = cursorKey(before);
    if (seenCursors.has(key)) throw new Error("The conversation list did not advance to the next page.");
    seenCursors.add(key);

    const page = await listMyChats({ before, limit: INBOX_PAGE_SIZE });
    chats = mergeChats(chats, page.chats);
    hasMore = page.hasMore;
    before = page.nextCursor;
    if (hasMore && !before) throw new Error("The conversation service omitted its next-page cursor.");
  }

  return {
    chats,
    hasMore,
    nextCursor: before,
  };
}

async function loadNextVisiblePage(before) {
  const chats = [];
  const seenCursors = new Set();
  let cursor = before;
  let hasMore = true;

  // A page can contain a now-hidden peer profile. Keep advancing until there
  // is something to render or the authenticated inbox is exhausted.
  while (hasMore && chats.length === 0) {
    const key = cursorKey(cursor);
    if (seenCursors.has(key)) throw new Error("The conversation list did not advance to the next page.");
    seenCursors.add(key);

    const page = await listMyChats({ before: cursor, limit: INBOX_PAGE_SIZE });
    chats.push(...page.chats);
    hasMore = page.hasMore;
    cursor = page.nextCursor;
    if (hasMore && !cursor) throw new Error("The conversation service omitted its next-page cursor.");
  }

  return { chats, hasMore, nextCursor: cursor };
}

function initials(name) {
  return String(name || "?").slice(0, 2).toUpperCase();
}

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function scheduleDateBoundaryRefresh() {
  window.clearTimeout(dateBoundaryTimer);
  if (!pageActive) return;
  const nextDay = new Date();
  nextDay.setHours(24, 0, 0, 50);
  dateBoundaryTimer = window.setTimeout(() => {
    lastRenderSignature = "";
    renderSearchResults();
  }, Math.max(100, nextDay.getTime() - Date.now()));
}

function isOnline(profile) {
  const seenAt = Date.parse(profile?.last_seen || "");
  return profile?.status === "online"
    && Number.isFinite(seenAt)
    && Date.now() - seenAt < 90_000;
}

function schedulePresenceExpiry() {
  window.clearTimeout(presenceExpiryTimer);
  const delays = allChats
    .map(({ contact }) => Date.parse(contact?.last_seen || ""))
    .filter(Number.isFinite)
    .map((seenAt) => 90_000 - (Date.now() - seenAt))
    .filter((delay) => delay > 0);
  if (!delays.length) return;
  presenceExpiryTimer = window.setTimeout(() => {
    renderSearchResults();
    schedulePresenceExpiry();
  }, Math.min(...delays) + 100);
}

function emptyState(searching = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "1.5");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z");
  icon.append(path);
  const text = document.createElement("p");
  text.textContent = searching
    ? (hasMoreChats
      ? "No loaded conversations match your search. Load more to search older chats."
      : "No conversations match your search.")
    : "No conversations yet. Tap the + button to message a contact.";
  wrapper.append(icon, text);
  return wrapper;
}

function render(chats) {
  const searching = Boolean(searchInput.value.trim());
  const signature = JSON.stringify(chats.map((chat) => ({
    id: chat.chatId,
    name: chat.contact?.username || "",
    online: isOnline(chat.contact),
    message: chat.lastMessage?.content || "",
    createdAt: chat.lastMessage?.created_at || "",
    unread: chat.unreadCount || 0,
  })).concat(`|searching:${searching}|more:${hasMoreChats}`);
  if (signature === lastRenderSignature) return;
  lastRenderSignature = signature;
  const focusedChatId = document.activeElement?.closest?.("[data-chat-id]")?.dataset.chatId || "";
  list.replaceChildren();
  if (!chats.length) {
    list.append(emptyState(searching));
    return;
  }

  for (const chat of chats) {
    if (!isUuid(chat.chatId) || !chat.contact) continue;
    const name = String(chat.contact.username || "Wisp contact");
    const row = document.createElement("a");
    row.href = `./chat.html?chat=${encodeURIComponent(chat.chatId)}`;
    row.className = "list-row";
    row.dataset.chatId = chat.chatId;

    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-md";
    avatar.setAttribute("aria-hidden", "true");
    avatar.append(document.createTextNode(initials(name)));
    const status = document.createElement("span");
    status.className = `status-dot${isOnline(chat.contact) ? " is-online" : ""}`;
    status.setAttribute("aria-hidden", "true");
    avatar.append(status);

    const main = document.createElement("div");
    main.className = "list-row-main";
    const top = document.createElement("div");
    top.className = "list-row-top";
    const nameElement = document.createElement("span");
    nameElement.className = "list-row-name";
    nameElement.textContent = name;
    const presence = document.createElement("span");
    presence.className = "visually-hidden";
    presence.textContent = isOnline(chat.contact) ? ", Online" : ", Offline";
    const time = document.createElement("span");
    time.className = "list-row-time";
    time.textContent = formatTime(chat.lastMessage?.created_at);
    top.append(nameElement, presence, time);

    const sub = document.createElement("div");
    sub.className = "list-row-sub";
    const preview = document.createElement("span");
    preview.className = "list-row-preview";
    preview.textContent = chat.lastMessage?.content || "Say hello 👋";
    sub.append(preview);
    if (chat.unreadCount > 0) {
      const unread = document.createElement("span");
      unread.className = "unread-badge";
      unread.textContent = chat.unreadCount > 99 ? "99+" : String(chat.unreadCount);
      unread.setAttribute("aria-label", `${chat.unreadCount} unread ${chat.unreadCount === 1 ? "message" : "messages"}`);
      sub.append(unread);
    }
    main.append(top, sub);
    row.append(avatar, main);
    list.append(row);
  }
  if (isUuid(focusedChatId)) {
    list.querySelector(`[data-chat-id="${focusedChatId}"]`)?.focus({ preventScroll: true });
  }
}

function updatePaginationControls() {
  const loading = Boolean(loadInFlight || loadMoreInFlight);
  loadMoreButton.hidden = !hasMoreChats;
  loadMoreButton.disabled = loading;
  loadMoreButton.textContent = loadMoreInFlight
    ? "Loading more conversations…"
    : "Load more conversations";
}

function updatePaginationUi(announcement = "") {
  updatePaginationControls();
  if (announcement) {
    paginationStatus.textContent = announcement;
  } else if (!allChats.length) {
    paginationStatus.textContent = "";
  } else if (hasMoreChats) {
    paginationStatus.textContent = searchInput.value.trim()
      ? `${allChats.length} conversations loaded. Load more to search older chats.`
      : `${allChats.length} conversations loaded. More are available.`;
  } else {
    paginationStatus.textContent = `All ${allChats.length} conversations loaded.`;
  }
}

function renderSearchResults(announcement = "") {
  const query = searchInput.value.trim().toLowerCase().slice(0, WISP_LIMITS.profileSearch);
  const matchingChats = allChats.filter((chat) =>
    String(chat.contact?.username || "").toLowerCase().includes(query)
      || String(chat.lastMessage?.content || "").toLowerCase().includes(query));
  render(matchingChats);
  const nextSearchStatus = query
    ? `${matchingChats.length} matching ${matchingChats.length === 1 ? "conversation" : "conversations"}${hasMoreChats ? " in the loaded chats. Load more to search older chats." : "."}`
    : "";
  if (searchStatus.textContent !== nextSearchStatus) searchStatus.textContent = nextSearchStatus;
  updatePaginationUi(announcement);
  scheduleDateBoundaryRefresh();
}

async function load(version = pageVersion) {
  if (!isCurrentPage(version)) return;
  if (loadMoreInFlight) {
    loadQueued = true;
    return loadMoreInFlight;
  }
  if (loadInFlight) {
    loadQueued = true;
    return loadInFlight;
  }

  loadInFlight = (async () => {
    do {
      loadQueued = false;
      try {
        const windowResult = await loadChatWindow(Math.max(INBOX_PAGE_SIZE, allChats.length));
        if (!isCurrentPage(version)) break;
        allChats = windowResult.chats;
        hasMoreChats = windowResult.hasMore;
        nextPageCursor = windowResult.nextCursor;
        renderSearchResults();
        schedulePresenceExpiry();
        banner.classList.remove("is-visible");
      } catch (error) {
        if (!isCurrentPage(version)) break;
        banner.textContent = "Couldn't load chats — check your connection and try again.";
        banner.classList.add("is-visible");
        console.error("Wisp chat list failed.", error);
      }
    } while (loadQueued && isCurrentPage(version));
  })();

  try {
    await loadInFlight;
  } finally {
    loadInFlight = null;
    if (isCurrentPage(version)) updatePaginationUi();
  }
}

async function loadMore() {
  const version = pageVersion;
  if (!isCurrentPage(version) || !hasMoreChats || loadMoreInFlight) return;
  if (loadInFlight) await loadInFlight.catch(() => {});
  if (!isCurrentPage(version) || !hasMoreChats || loadMoreInFlight) return;

  const cursor = nextPageCursor;
  if (!cursor) {
    banner.textContent = "Couldn't load older chats because the next page was unavailable.";
    banner.classList.add("is-visible");
    return;
  }

  const buttonHadFocus = document.activeElement === loadMoreButton;
  loadMoreButton.disabled = true;
  loadMoreButton.textContent = "Loading more conversations…";
  loadMoreInFlight = (async () => {
    try {
      const page = await loadNextVisiblePage(cursor);
      if (!isCurrentPage(version)) return;

      const previousCount = allChats.length;
      allChats = mergeChats(allChats, page.chats);
      hasMoreChats = page.hasMore;
      nextPageCursor = page.nextCursor;
      const addedCount = allChats.length - previousCount;
      renderSearchResults(
        hasMoreChats
          ? `${addedCount} more ${addedCount === 1 ? "conversation" : "conversations"} loaded. ${allChats.length} shown.`
          : `All ${allChats.length} conversations are now loaded.`,
      );
      schedulePresenceExpiry();
      banner.classList.remove("is-visible");

      if (!hasMoreChats && buttonHadFocus) {
        paginationStatus.focus({ preventScroll: true });
      }
    } catch (error) {
      if (!isCurrentPage(version)) return;
      banner.textContent = "Couldn't load older chats — check your connection and try again.";
      banner.classList.add("is-visible");
      paginationStatus.textContent = "Older conversations were not loaded.";
      console.error("Wisp older chat page failed.", error);
    }
  })();

  try {
    await loadMoreInFlight;
  } finally {
    loadMoreInFlight = null;
    if (isCurrentPage(version)) {
      updatePaginationControls();
      if (loadQueued) scheduleLoad();
    }
  }
}

function scheduleLoad() {
  window.clearTimeout(loadTimer);
  const version = pageVersion;
  loadTimer = window.setTimeout(() => {
    loadTimer = 0;
    void load(version);
  }, 80);
}

searchInput.addEventListener("input", () => renderSearchResults());
loadMoreButton.addEventListener("click", () => void loadMore());

function startHomePolling() {
  window.clearInterval(presencePollTimer);
  presencePollTimer = window.setInterval(() => {
    if (pageActive && document.visibilityState === "visible" && navigator.onLine) scheduleLoad();
  }, 30_000);
}

async function startPage() {
  const version = pageVersion;
  const user = await requireAuth(currentUserId);
  if (!isCurrentPage(version)) return;
  currentUserId ||= user.id;
  if (loadInFlight) await loadInFlight.catch(() => {});
  if (loadMoreInFlight) await loadMoreInFlight.catch(() => {});
  if (!isCurrentPage(version)) return;
  await load(version);
  if (isCurrentPage(version)) startHomePolling();
}

document.addEventListener("visibilitychange", () => {
  if (pageActive && document.visibilityState === "visible") scheduleLoad();
});

window.addEventListener("pagehide", () => {
  pageActive = false;
  pageVersion += 1;
  window.clearTimeout(loadTimer);
  window.clearTimeout(presenceExpiryTimer);
  window.clearTimeout(dateBoundaryTimer);
  window.clearInterval(presencePollTimer);
  presencePollTimer = 0;
});
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  pageActive = true;
  pageVersion += 1;
  void startPage();
});

void startPage();
