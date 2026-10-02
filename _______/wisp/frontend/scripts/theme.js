const STORAGE_KEY = "wisp-theme";

function savedTheme() {
  try {
    const value = window.localStorage?.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "";
  } catch {
    // Storage can be unavailable in private browsing or managed browsers.
    return "";
  }
}

function prefersLightTheme() {
  try {
    return window.matchMedia?.("(prefers-color-scheme: light)")?.matches === true;
  } catch {
    return false;
  }
}

export function initTheme() {
  const preferred = savedTheme() || (prefersLightTheme() ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", preferred);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    window.localStorage?.setItem(STORAGE_KEY, next);
  } catch {
    // Keep the in-page theme working even when persistence is blocked.
  }
}

export function wireThemeToggle(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", toggleTheme);
}
