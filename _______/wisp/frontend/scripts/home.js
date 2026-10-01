import { initTheme, wireThemeToggle } from "./theme.js";
import { renderTabBar } from "./tabBar.js";
import { requireAuth } from "./authGuard.js";
import { listMyChats } from "./chatData.js";
import { requireSupabase } from "./supabaseClient.js";
import { WISP_LIMITS, WISP_TABLES, isUuid } from "./config.js";

initTheme();
wireThemeToggle(document.getElementById("theme-toggle"));
renderTabBar("home");

const list = document.getElementById("chat-list");
const banner = document.getElementById("load-banner");
const searchInput = document.getElementById("search-input");
let allChats = [];
let homeChannel = null;

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

function emptyState() {
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
  text.textContent = "No conversations yet. Tap the + button to message a contact.";
  wrapper.append(icon, text);
  return wrapper;
}

function render(chats) {
  list.replaceChildren();
  if (!chats.length) {
    list.append(emptyState());
    return;
  }

  for (const chat of chats) {
    if (!isUuid(chat.chatId) || !chat.contact) continue;
    const name = String(chat.contact.username || "Wisp contact");
    const row = document.createElement("a");
    row.href = `./chat.html?chat=${encodeURIComponent(chat.chatId)}`;
    row.className = "list-row";

    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-md";
    avatar.append(document.createTextNode(initials(name)));
    const status = document.createElement("span");
    status.className = `status-dot${chat.contact.status === "online" ? " is-online" : ""}`;
    avatar.append(status);

    const main = document.createElement("div");
    main.className = "list-row-main";
    const top = document.createElement("div");
    top.className = "list-row-top";
    const nameElement = document.createElement("span");
    nameElement.className = "list-row-name";
    nameElement.textContent = name;
    const time = document.createElement("span");
    time.className = "list-row-time";
    time.textContent = formatTime(chat.lastMessage?.created_at);
    top.append(nameElement, time);

    const sub = document.createElement("div");
    sub.className = "list-row-sub";
    const preview = document.createElement("span");
    preview.className = "list-row-preview";
    preview.textContent = chat.lastMessage?.content || "Say hello 👋";
    sub.append(preview);
    main.append(top, sub);
    row.append(avatar, main);
    list.append(row);
  }
}

async function load() {
  try {
    allChats = await listMyChats();
    render(allChats);
    banner.classList.remove("is-visible");
  } catch (error) {
    banner.textContent = "Couldn't load chats — check your connection and try again.";
    banner.classList.add("is-visible");
    console.error("Wisp chat list failed.", error);
  }
}

searchInput.addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase().slice(0, WISP_LIMITS.profileSearch);
  const filtered = allChats.filter((chat) =>
    String(chat.contact?.username || "").toLowerCase().includes(query)
      || String(chat.lastMessage?.content || "").toLowerCase().includes(query));
  render(filtered);
});

async function subscribeToChatList() {
  const client = requireSupabase();
  homeChannel = client
    .channel("wisp-home-messages")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: WISP_TABLES.messages }, () => {
      void load();
    });
  homeChannel.subscribe((status) => {
    if (["CHANNEL_ERROR", "TIMED_OUT"].includes(status)) {
      banner.textContent = "Live chat updates paused. Refresh to reconnect.";
      banner.classList.add("is-visible");
    }
  });
}

await requireAuth();
await load();
await subscribeToChatList();

window.addEventListener("pagehide", () => {
  if (homeChannel) void requireSupabase().removeChannel(homeChannel).catch(() => {});
}, { once: true });
