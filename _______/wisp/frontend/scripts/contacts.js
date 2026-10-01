import { initTheme, wireThemeToggle } from "./theme.js";
import { renderTabBar } from "./tabBar.js";
import { requireAuth } from "./authGuard.js";
import { searchProfiles, getOrCreateOneToOneChat } from "./chatData.js";
import { WISP_LIMITS, isUuid } from "./config.js";

initTheme();
wireThemeToggle(document.getElementById("theme-toggle"));
renderTabBar("contacts");

const params = new URLSearchParams(window.location.search);
const isPickMode = params.get("pick") === "1";
const list = document.getElementById("contact-list");
const banner = document.getElementById("load-banner");
const searchInput = document.getElementById("search-input");

if (isPickMode) {
  document.getElementById("page-title").textContent = "New message";
  document.getElementById("pick-hint").classList.remove("visually-hidden");
}

function initials(name) {
  return String(name || "?").slice(0, 2).toUpperCase();
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

function render(contacts) {
  list.replaceChildren();
  if (!contacts.length) {
    renderEmpty(searchInput.value.trim() ? "No matching users found." : "Search by username to find people on Wisp.");
    return;
  }

  for (const contact of contacts) {
    if (!isUuid(contact.id)) continue;
    const row = document.createElement("div");
    row.className = "list-row";
    row.setAttribute("role", isPickMode ? "button" : "group");
    if (isPickMode) row.tabIndex = 0;
    row.dataset.id = contact.id;

    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-md";
    avatar.append(document.createTextNode(initials(contact.username)));
    const status = document.createElement("span");
    status.className = `status-dot${contact.status === "online" ? " is-online" : ""}`;
    avatar.append(status);

    const main = document.createElement("div");
    main.className = "list-row-main";
    const top = document.createElement("div");
    top.className = "list-row-top";
    const name = document.createElement("span");
    name.className = "list-row-name";
    name.textContent = contact.username || "Wisp contact";
    top.append(name);
    const sub = document.createElement("div");
    sub.className = "list-row-sub";
    const bio = document.createElement("span");
    bio.className = "list-row-preview";
    bio.textContent = contact.bio || "";
    sub.append(bio);
    main.append(top, sub);
    row.append(avatar, main);

    const activate = async () => {
      if (!isPickMode || row.getAttribute("aria-busy") === "true") return;
      row.setAttribute("aria-busy", "true");
      row.style.opacity = "0.6";
      try {
        const chatId = await getOrCreateOneToOneChat(contact.id);
        window.location.assign(`./chat.html?chat=${encodeURIComponent(chatId)}`);
      } catch (error) {
        banner.textContent = "Couldn't start that conversation. Please try again.";
        banner.classList.add("is-visible");
        row.style.opacity = "";
        row.removeAttribute("aria-busy");
        console.error("Wisp conversation creation failed.", error);
      }
    };
    row.addEventListener("click", activate);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void activate();
      }
    });
    list.append(row);
  }
}

async function runSearch() {
  const query = searchInput.value.trim().slice(0, WISP_LIMITS.profileSearch);
  if (query.length < 2) {
    render([]);
    return;
  }
  try {
    render(await searchProfiles(query));
    banner.classList.remove("is-visible");
  } catch (error) {
    banner.textContent = "Search failed — check your connection and try again.";
    banner.classList.add("is-visible");
    console.error("Wisp profile search failed.", error);
  }
}

let debounceTimer = 0;
searchInput.addEventListener("input", () => {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => void runSearch(), 250);
});

await requireAuth();
render([]);
window.addEventListener("pagehide", () => window.clearTimeout(debounceTimer), { once: true });
