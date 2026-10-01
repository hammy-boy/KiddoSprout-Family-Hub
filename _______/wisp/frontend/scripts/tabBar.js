const TABS = Object.freeze([
  { id: "home", href: "./home.html", label: "Chats", paths: ["M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"] },
  { id: "contacts", href: "./contacts.html", label: "Contacts", paths: ["M4 21c0-4 3.6-7 8-7s8 3 8 7"], circle: true },
  { id: "calls", href: "./calls.html", label: "Calls", paths: ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2.2Z"] },
  { id: "profile", href: "./profile.html", label: "Profile", paths: ["M4 21c0-4 3.6-7 8-7s8 3 8 7"], circle: true },
]);

function iconFor(tab) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  if (tab.circle) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "8");
    circle.setAttribute("r", "4");
    svg.append(circle);
  }
  for (const definition of tab.paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", definition);
    svg.append(path);
  }
  return svg;
}

export function renderTabBar(activeId) {
  const bar = document.createElement("nav");
  bar.className = "tab-bar";
  bar.setAttribute("aria-label", "Primary");
  for (const tab of TABS) {
    const link = document.createElement("a");
    link.href = tab.href;
    link.className = `tab-item${tab.id === activeId ? " is-active" : ""}`;
    if (tab.id === activeId) link.setAttribute("aria-current", "page");
    const label = document.createElement("span");
    label.textContent = tab.label;
    link.append(iconFor(tab), label);
    bar.append(link);
  }
  document.getElementById("tab-bar-slot")?.replaceWith(bar);
}
