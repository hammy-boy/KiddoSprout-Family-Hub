import { initTheme, wireThemeToggle } from "./theme.js";
import { renderTabBar } from "./tabBar.js";
import { requireAuth } from "./authGuard.js";
import {
  addContact,
  getOrCreateOneToOneChat,
  listContacts,
  removeContact,
  searchProfiles,
} from "./chatData.js";
import { WISP_LIMITS, isUuid } from "./config.js";

initTheme();
wireThemeToggle(document.getElementById("theme-toggle"));
renderTabBar("contacts");

const params = new URLSearchParams(window.location.search);
const isPickMode = params.get("pick") === "1";
const list = document.getElementById("contact-list");
const banner = document.getElementById("load-banner");
const searchInput = document.getElementById("search-input");
const searchStatus = document.getElementById("contact-search-status");
let savedContacts = [];
let savedContactIds = new Set();
let searchResults = [];
let searchRequestId = 0;
let presencePollTimer = 0;
let presenceExpiryTimer = 0;
let presenceRefreshInFlight = false;
let contactsMutationCount = 0;
let contactsMutationVersion = 0;
const contactsMutationWaiters = new Set();
let contactsReady = false;
let lastRenderSignature = "";
let pageActive = true;
let pageVersion = 0;
let currentUserId = "";

function isCurrentPage(version = pageVersion) {
  return pageActive && version === pageVersion;
}

function waitForContactMutations() {
  if (contactsMutationCount === 0) return Promise.resolve();
  return new Promise((resolve) => contactsMutationWaiters.add(resolve));
}

function settleContactMutationWaiters() {
  if (contactsMutationCount > 0) return;
  for (const resolve of contactsMutationWaiters) resolve();
  contactsMutationWaiters.clear();
}

if (isPickMode) {
  document.getElementById("page-title").textContent = "New message";
  const hint = document.getElementById("pick-hint");
  hint.textContent = "Choose a saved contact or search by username, then select Message.";
  hint.classList.remove("visually-hidden");
}

function initials(name) {
  return String(name || "?").slice(0, 2).toUpperCase();
}

function isOnline(profile) {
  const seenAt = Date.parse(profile?.last_seen || "");
  return profile?.status === "online"
    && Number.isFinite(seenAt)
    && Date.now() - seenAt < 90_000;
}

function schedulePresenceExpiry(contacts) {
  window.clearTimeout(presenceExpiryTimer);
  const delays = contacts
    .map(({ last_seen: lastSeen }) => Date.parse(lastSeen || ""))
    .filter(Number.isFinite)
    .map((seenAt) => 90_000 - (Date.now() - seenAt))
    .filter((delay) => delay > 0);
  if (!delays.length) return;
  presenceExpiryTimer = window.setTimeout(rerenderCurrentView, Math.min(...delays) + 100);
}

function renderEmpty(message) {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "1.5");
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "8");
  circle.setAttribute("r", "4");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M4 21c0-4 3.6-7 8-7s8 3 8 7");
  icon.append(circle, path);
  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  wrapper.append(icon, paragraph);
  list.append(wrapper);
}

function isSearching() {
  return searchInput.value.trim().length >= 2;
}

function setRowBusy(row, busy) {
  if (busy) row.setAttribute("aria-busy", "true");
  else row.removeAttribute("aria-busy");
  for (const button of row.querySelectorAll("button")) button.disabled = busy;
}

function hideBanner() {
  banner.classList.remove("is-visible");
}

function showBanner(message) {
  banner.textContent = message;
  banner.classList.add("is-visible");
}

function syncSavedContacts() {
  savedContactIds = new Set(savedContacts.map(({ id }) => id).filter(isUuid));
}

function rerenderCurrentView() {
  render(isSearching() ? searchResults : savedContacts, isSearching());
}

function render(contacts, searchView = false) {
  const signature = JSON.stringify({
    searchView,
    contacts: contacts.map((contact) => ({
      id: contact.id,
      username: contact.username || "",
      bio: contact.bio || "",
      online: isOnline(contact),
      saved: savedContactIds.has(contact.id),
    })),
  });
  if (signature === lastRenderSignature) {
    schedulePresenceExpiry(contacts);
    return;
  }
  lastRenderSignature = signature;
  const focusedRowId = document.activeElement?.closest?.("[data-id]")?.dataset.id || "";
  const focusedAction = document.activeElement?.dataset?.action || "";
  list.replaceChildren();
  schedulePresenceExpiry(contacts);
  if (!contacts.length) {
    renderEmpty(searchView
      ? "No matching users found."
      : "No saved contacts yet. Search by username to add someone.");
    return;
  }

  for (const contact of contacts) {
    if (!isUuid(contact.id)) continue;
    const row = document.createElement("div");
    row.className = "list-row";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", contact.username || "Wisp contact");
    row.dataset.id = contact.id;

    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-md";
    avatar.setAttribute("aria-hidden", "true");
    avatar.append(document.createTextNode(initials(contact.username)));
    const status = document.createElement("span");
    status.className = `status-dot${isOnline(contact) ? " is-online" : ""}`;
    status.setAttribute("aria-hidden", "true");
    avatar.append(status);

    const main = document.createElement("div");
    main.className = "list-row-main";
    const top = document.createElement("div");
    top.className = "list-row-top";
    const name = document.createElement("span");
    name.className = "list-row-name";
    name.textContent = contact.username || "Wisp contact";
    const presence = document.createElement("span");
    presence.className = "visually-hidden";
    presence.textContent = isOnline(contact) ? ", Online" : ", Offline";
    top.append(name, presence);
    const sub = document.createElement("div");
    sub.className = "list-row-sub";
    const bio = document.createElement("span");
    bio.className = "list-row-preview";
    bio.textContent = contact.bio || (savedContactIds.has(contact.id) ? "Saved contact" : "Wisp user");
    sub.append(bio);
    main.append(top, sub);
    row.append(avatar, main);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "call-type-btn";
    saveButton.dataset.action = "save";
    const updateSaveButton = () => {
      const saved = savedContactIds.has(contact.id);
      saveButton.textContent = saved ? "−" : "+";
      saveButton.setAttribute("aria-label", `${saved ? "Remove" : "Add"} ${contact.username || "this user"} ${saved ? "from" : "to"} contacts`);
      saveButton.title = saved ? "Remove contact" : "Add contact";
    };
    updateSaveButton();
    saveButton.addEventListener("click", async () => {
      if (row.getAttribute("aria-busy") === "true") return;
      const actionVersion = pageVersion;
      setRowBusy(row, true);
      contactsMutationCount += 1;
      contactsMutationVersion += 1;
      try {
        if (savedContactIds.has(contact.id)) {
          await removeContact(contact.id);
          if (!isCurrentPage(actionVersion)) return;
          savedContacts = savedContacts.filter(({ id }) => id !== contact.id);
        } else {
          await addContact(contact.id);
          if (!isCurrentPage(actionVersion)) return;
          savedContacts = [contact, ...savedContacts.filter(({ id }) => id !== contact.id)];
        }
        if (!isCurrentPage(actionVersion)) return;
        syncSavedContacts();
        hideBanner();
        rerenderCurrentView();
      } catch (error) {
        if (!isCurrentPage(actionVersion)) return;
        showBanner("Couldn't update that contact. Please try again.");
        setRowBusy(row, false);
        console.error("Wisp contact update failed.", error);
      } finally {
        contactsMutationCount = Math.max(0, contactsMutationCount - 1);
        contactsMutationVersion += 1;
        settleContactMutationWaiters();
        if (!isCurrentPage(actionVersion) && pageActive) void refreshPresenceViews();
      }
    });

    const messageButton = document.createElement("button");
    messageButton.type = "button";
    messageButton.className = "call-type-btn";
    messageButton.dataset.action = "message";
    messageButton.textContent = "✉";
    messageButton.setAttribute("aria-label", `Message ${contact.username || "this user"}`);
    messageButton.title = isPickMode ? "Choose contact" : "Message";
    messageButton.addEventListener("click", async () => {
      if (row.getAttribute("aria-busy") === "true") return;
      const actionVersion = pageVersion;
      setRowBusy(row, true);
      try {
        const chatId = await getOrCreateOneToOneChat(contact.id);
        if (!isCurrentPage(actionVersion)) return;
        window.location.assign(`./chat.html?chat=${encodeURIComponent(chatId)}`);
      } catch (error) {
        if (!isCurrentPage(actionVersion)) return;
        showBanner("Couldn't start that conversation. Please try again.");
        setRowBusy(row, false);
        console.error("Wisp conversation creation failed.", error);
      }
    });
    row.append(saveButton, messageButton);
    list.append(row);
  }
  if (isUuid(focusedRowId)) {
    const replacementRow = list.querySelector(`[data-id="${focusedRowId}"]`);
    const replacement = replacementRow?.querySelector(`[data-action="${focusedAction}"]`);
    (replacement || searchInput).focus({ preventScroll: true });
  }
}

async function runSearch(version = pageVersion) {
  if (!isCurrentPage(version)) return;
  const query = searchInput.value.trim().slice(0, WISP_LIMITS.profileSearch);
  if (query.length < 2) {
    searchRequestId += 1;
    searchResults = [];
    render(savedContacts);
    searchStatus.textContent = "";
    return;
  }
  const requestId = ++searchRequestId;
  try {
    const results = await searchProfiles(query);
    if (!isCurrentPage(version) || requestId !== searchRequestId) return;
    searchResults = results;
    render(searchResults, true);
    const nextStatus = `${results.length} matching ${results.length === 1 ? "contact" : "contacts"}.`;
    if (searchStatus.textContent !== nextStatus) searchStatus.textContent = nextStatus;
    hideBanner();
  } catch (error) {
    if (!isCurrentPage(version) || requestId !== searchRequestId) return;
    showBanner("Search failed — check your connection and try again.");
    searchStatus.textContent = "Contact search results are unavailable.";
    console.error("Wisp profile search failed.", error);
  }
}

async function refreshPresenceViews() {
  if (!pageActive
      || presenceRefreshInFlight
      || contactsMutationCount > 0
      || document.visibilityState !== "visible") return;
  presenceRefreshInFlight = true;
  const refreshVersion = contactsMutationVersion;
  const activeVersion = pageVersion;
  try {
    const refreshedContacts = await listContacts();
    if (!isCurrentPage(activeVersion)
        || contactsMutationCount > 0
        || refreshVersion !== contactsMutationVersion) return;
    savedContacts = refreshedContacts;
    syncSavedContacts();
    if (isSearching()) await runSearch(activeVersion);
    else rerenderCurrentView();
  } catch (error) {
    console.warn("Wisp could not refresh contact presence.", error);
  } finally {
    presenceRefreshInFlight = false;
  }
}

let debounceTimer = 0;
searchInput.addEventListener("input", () => {
  window.clearTimeout(debounceTimer);
  if (!isSearching()) {
    void runSearch();
    return;
  }
  debounceTimer = window.setTimeout(() => void runSearch(), 250);
});

async function startPage() {
  const version = pageVersion;
  try {
    const user = await requireAuth(currentUserId);
    if (!isCurrentPage(version)) return;
    currentUserId ||= user.id;
    let contacts;
    do {
      await waitForContactMutations();
      if (!isCurrentPage(version)) return;
      const mutationVersion = contactsMutationVersion;
      contacts = await listContacts();
      if (!isCurrentPage(version)) return;
      if (contactsMutationCount === 0 && mutationVersion === contactsMutationVersion) break;
    } while (isCurrentPage(version));
    savedContacts = contacts;
    contactsReady = true;
    syncSavedContacts();
    if (isSearching()) await runSearch(version);
    else rerenderCurrentView();
    if (!isCurrentPage(version)) return;
    hideBanner();
    window.clearInterval(presencePollTimer);
    presencePollTimer = window.setInterval(() => void refreshPresenceViews(), 60_000);
  } catch (error) {
    if (!isCurrentPage(version)) return;
    showBanner("Couldn't load contacts — check your connection and try again.");
    if (!isSearching()) render([]);
    console.error("Wisp contacts failed to load.", error);
  }
}

document.addEventListener("visibilitychange", () => void refreshPresenceViews());
window.addEventListener("pagehide", () => {
  pageActive = false;
  pageVersion += 1;
  searchRequestId += 1;
  window.clearTimeout(debounceTimer);
  window.clearTimeout(presenceExpiryTimer);
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
