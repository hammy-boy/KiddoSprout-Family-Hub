import { initTheme, wireThemeToggle } from "./theme.js";
import { renderTabBar } from "./tabBar.js";
import { requireAuth } from "./authGuard.js";
import { listCallHistory } from "./chatData.js";
import { isUuid } from "./config.js";

initTheme();
wireThemeToggle(document.getElementById("theme-toggle"));
renderTabBar("calls");

const list = document.getElementById("call-list");
const banner = document.getElementById("load-banner");
const searchInput = document.getElementById("search-input");
const searchStatus = document.getElementById("call-search-status");
let callHistory = [];

function svgIcon(paths) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  for (const definition of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", definition);
    svg.append(path);
  }
  return svg;
}

function timeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function renderEmpty(message) {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";
  wrapper.append(svgIcon(["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7"]));
  const text = document.createElement("p");
  text.textContent = message;
  wrapper.append(text);
  list.append(wrapper);
}

function render(calls, searching = false) {
  list.replaceChildren();
  if (!calls.length) {
    renderEmpty(searching
      ? "No calls match your search."
      : "No calls yet. Open a conversation to start a private voice or video call.");
    return;
  }
  for (const call of calls) {
    const name = call.contact?.username || "Wisp contact";
    const missed = call.direction === "incoming" && call.status === "missed";
    const directionLabel = call.direction === "incoming" ? "Incoming" : "Outgoing";
    const typeLabel = call.call_type === "video" ? "video" : "voice";
    const row = document.createElement("div");
    row.className = "list-row";

    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-md";
    avatar.textContent = name.slice(0, 2).toUpperCase();

    const main = document.createElement("div");
    main.className = "list-row-main";
    const top = document.createElement("div");
    top.className = "list-row-top";
    const nameElement = document.createElement("span");
    nameElement.className = "list-row-name";
    nameElement.textContent = name;
    top.append(nameElement);
    const direction = document.createElement("div");
    direction.className = `call-direction${missed ? " is-missed" : ""}`;
    direction.append(svgIcon([call.direction === "incoming" ? "M17 7 7 17M7 7v10h10" : "M7 17 17 7M17 17V7H7"]));
    const detail = document.createElement("span");
    detail.textContent = `${missed ? "Missed incoming" : directionLabel} ${typeLabel} call · ${timeLabel(call.started_at)}`;
    direction.append(detail);
    main.append(top, direction);

    const open = document.createElement("button");
    open.type = "button";
    open.className = "call-type-btn";
    open.setAttribute("aria-label", `Open conversation with ${name}`);
    open.append(svgIcon(call.call_type === "video"
      ? ["M15 10.5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3.5l5 4v-11l-5 4Z"]
      : ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2.2Z"]));
    open.addEventListener("click", () => {
      if (isUuid(call.chat_id)) window.location.assign(`./chat.html?chat=${encodeURIComponent(call.chat_id)}`);
    });
    row.append(avatar, main, open);
    list.append(row);
  }
}

function renderSearchResults() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const matchingCalls = query
    ? callHistory.filter((call) => {
      const name = call.contact?.username || "Wisp contact";
      const searchableText = [
        name,
        call.direction,
        call.call_type,
        call.status === "missed" ? "missed" : "",
      ].join(" ").toLocaleLowerCase();
      return searchableText.includes(query);
    })
    : callHistory;
  render(matchingCalls, Boolean(query));
  const nextStatus = query
    ? `${matchingCalls.length} matching ${matchingCalls.length === 1 ? "call" : "calls"}.`
    : "";
  if (searchStatus.textContent !== nextStatus) searchStatus.textContent = nextStatus;
}

searchInput.addEventListener("input", renderSearchResults);

await requireAuth();
try {
  callHistory = await listCallHistory();
  renderSearchResults();
} catch (error) {
  banner.textContent = "Couldn't load call history — check your connection and try again.";
  banner.classList.add("is-visible");
  render([], false);
  console.error("Wisp call history failed.", error);
}
