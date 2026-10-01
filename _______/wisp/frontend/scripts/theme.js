const STORAGE_KEY = "wisp-theme";

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const preferred = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", preferred);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(STORAGE_KEY, next);
}

export function wireThemeToggle(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", toggleTheme);
}
