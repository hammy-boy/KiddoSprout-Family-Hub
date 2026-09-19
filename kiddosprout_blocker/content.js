const KIDDO_SPROUT_KEY = "kiddoSproutBlockRules";
const RULE_STATES = new Set(["allowed", "request", "blocked"]);
const ACCESS_PAUSING_RULE_STATES = new Set(["request", "blocked"]);
const KIDDO_SPROUT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0"
]);
const KIDDO_SPROUT_PUBLIC_ROUTES = new Map([
  ["hammy-boy.github.io", "/kiddosprout-family-hub"]
]);

const GOOGLE_GAME_IDS = new Map([
  ["baseball", "Baseball"],
  ["basketball", "Basketball"],
  ["block_breaker", "Block Breaker"],
  ["cricket", "Cricket"],
  ["memory_game", "Memory Game"],
  ["pacman", "Pac-Man"],
  ["snake_arcade", "Snake"],
  ["soccer", "Soccer"],
  ["minesweeper", "Minesweeper"],
  ["solitaire", "Solitaire"],
  ["tic_tac_toe", "Tic-tac-toe"]
]);

let googleGameClickHandler = null;
let pageBlocked = false;
let currentRules = [];
let lastCheckedURL = "";

const DEFAULT_RULES = [
  {
    id: "gameSites",
    title: "Game Websites",
    rule: "blocked",
    keywordMatch: true,
    domains: [
      "crazygames.com",
      "poki.com",
      "coolmathgames.com",
      "miniclip.com",
      "friv.com",
      "kongregate.com",
      "addictinggames.com",
      "y8.com",
      "now.gg",
      "itch.io",
      "steamcommunity.com",
      "steampowered.com",
      "epicgames.com",
      "xbox.com",
      "playstation.com",
      "nintendo.com",
      "minecraft.net",
      "fortnite.com",
      "store.steampowered.com",
      "sites.google.com/view/drive-u-7-home/home"
    ]
  },
  {
    id: "roblox",
    title: "Roblox",
    rule: "blocked",
    domains: ["roblox.com", "web.roblox.com"]
  }
];

const GAME_HOST_KEYWORDS = [
  "game",
  "games",
  "gaming",
  "arcade",
  "unblocked-games",
  "unblockedgames",
  "freegames",
  "html5games",
  "onlinegames",
  "mobilegames",
  "browsergames"
];

function hostnameMatches(hostname, domain) {
  const cleanHost = String(hostname || "").toLowerCase().replace(/\.+$/, "");
  const cleanDomain = String(domain || "").toLowerCase().replace(/^www\./, "").replace(/\.+$/, "");
  return Boolean(cleanHost && cleanDomain) && (cleanHost === cleanDomain || cleanHost.endsWith("." + cleanDomain));
}

function decodedURLPart(value) {
  let decoded = String(value || "");
  // Browsers preserve escaped path text in URL.pathname. Decode a bounded
  // number of times so /%67ames and /%2567ames cannot evade a /games rule,
  // without allowing malformed escapes to break protection.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch (error) {
      break;
    }
  }
  return decoded;
}

function normalizedPathname(value) {
  const decoded = decodedURLPart(value).replace(/\\/g, "/");
  const withLeadingSlash = decoded.startsWith("/") ? decoded : `/${decoded}`;
  return withLeadingSlash.toLowerCase().replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
}

function normalizedHashPath(value) {
  const raw = String(value || "").replace(/^#/, "").replace(/^!/, "");
  return raw ? normalizedPathname(raw) : "";
}

function normalizedBlockedTarget(target) {
  const raw = String(target || "").trim();
  if (!raw || raw.length > 500 || /[\s\\]/.test(raw)) return null;
  try {
    const candidate = raw.startsWith("//")
      ? `https:${raw}`
      : /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname) return null;
    return {
      hostname: parsed.hostname.toLowerCase().replace(/^www\./, "").replace(/\.+$/, ""),
      pathname: normalizedPathname(parsed.pathname),
      hashPath: normalizedHashPath(parsed.hash)
    };
  } catch (error) {
    return null;
  }
}

function validRulePayload(rules) {
  return Array.isArray(rules) && rules.length <= 100 && rules.every((rule) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule) || !RULE_STATES.has(rule.rule)) return false;
    if (rule.id !== undefined && (typeof rule.id !== "string" || rule.id.length > 100)) return false;
    if (rule.title !== undefined && (typeof rule.title !== "string" || rule.title.length > 100)) return false;
    if (rule.keywordMatch !== undefined && typeof rule.keywordMatch !== "boolean") return false;
    return rule.domains === undefined || (
      Array.isArray(rule.domains) &&
      rule.domains.length <= 200 &&
      rule.domains.every((domain) => typeof domain === "string" && Boolean(normalizedBlockedTarget(domain)))
    );
  });
}

function normalizedRules(rules, fallback = []) {
  const source = validRulePayload(rules) ? rules : fallback;
  if (!validRulePayload(source)) return [];
  return source.map((rule) => ({
    id: String(rule.id || "").slice(0, 100),
    title: String(rule.title || "").slice(0, 100),
    rule: rule.rule,
    domains: Array.isArray(rule.domains) ? rule.domains.map((domain) => domain.trim()).filter(Boolean) : [],
    keywordMatch: rule.keywordMatch === true
  }));
}

function blockedTargetMatches(url, target) {
  const normalized = normalizedBlockedTarget(target);
  if (!normalized) return false;
  const pathname = normalizedPathname(url.pathname);
  const hashPath = normalizedHashPath(url.hash);
  const pathMatches = (
    normalized.pathname === "/" || pathname === normalized.pathname || pathname.startsWith(`${normalized.pathname}/`)
  );
  const hashMatches = !normalized.hashPath || (
    hashPath === normalized.hashPath || hashPath.startsWith(`${normalized.hashPath}/`)
  );
  return hostnameMatches(url.hostname, normalized.hostname) && pathMatches && hashMatches;
}

function hasGameRouteSignal(value) {
  return /\/(?:games?|arcade|unblocked-games?|browser-games?)(?:\/|$)/i.test(normalizedPathname(value));
}

function hasStrongGameURLSignal(url) {
  const hostTokens = url.hostname.toLowerCase().split(/[._-]+/).filter(Boolean);
  if (GAME_HOST_KEYWORDS.some((keyword) => hostTokens.includes(keyword))) return true;
  return hasGameRouteSignal(url.pathname) || Boolean(url.hash && hasGameRouteSignal(normalizedHashPath(url.hash)));
}

function rulePausesAccess(rule) {
  return ACCESS_PAUSING_RULE_STATES.has(rule?.rule);
}

function isGoogleHostname(hostname = window.location.hostname) {
  const canonicalHostname = String(hostname || "").toLowerCase().replace(/\.+$/, "");
  // Only recognise Google suffix shapes that its search service actually
  // uses. The previous three-letter wildcard also classified unrelated
  // registrable domains such as google.zip as Google, allowing their pages
  // to opt into the special search-game click handling.
  return /^(?:[^.]+\.)*google\.(?:com|cat|[a-z]{2}|(?:co|com)\.[a-z]{2})$/.test(canonicalHostname);
}

function matchingBlockedRule(rules) {
  const url = new URL(window.location.href);
  const safeRules = normalizedRules(rules);
  const explicitMatches = safeRules.filter((rule) =>
    Array.isArray(rule.domains) && rule.domains.some((domain) => blockedTargetMatches(url, domain))
  );
  const explicitlyPaused = explicitMatches.find((rule) => rule.rule === "blocked")
    || explicitMatches.find((rule) => rule.rule === "request");
  if (explicitlyPaused) return explicitlyPaused;

  // A specific Allow rule (for example Roblox) must override the generic
  // game-route keyword rule. Otherwise choosing Allow in the parent dashboard
  // still blocks URLs such as roblox.com/games/... because of the /games path.
  if (explicitMatches.some((rule) => rule.rule === "allowed")) return undefined;

  return safeRules.find((rule) => rulePausesAccess(rule) && rule.keywordMatch && hasStrongGameURLSignal(url));
}

function escapedHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderBlocked(rule) {
  if (pageBlocked) return;
  pageBlocked = true;
  stopWatchingGooglePlayableGames();
  const title = String(rule?.title || "This site").slice(0, 100);
  const detail = rule?.rule === "request"
    ? "Ask a parent in KiddoSprout before opening this game website."
    : rule?.embeddedGame
      ? "This playable browser game is paused by the current child profile. Ordinary Google searches still work."
      : "KiddoSprout parent settings blocked this website for the current child profile.";
  window.stop();
  const parameters = new URLSearchParams({ title, detail });
  try {
    const blockedPage = chrome.runtime.getURL(`blocked.html?${parameters}`);
    window.location.replace(blockedPage);
  } catch (error) {
    document.documentElement.innerHTML = `
      <head><title>Blocked by KiddoSprout</title></head>
      <body>
        <main>
          <h1>Blocked by KiddoSprout</h1>
          <p>${escapedHTML(title)}</p>
          <p>${escapedHTML(detail)}</p>
        </main>
      </body>
    `;
  }
}

function googleGameNameFromURL(value = window.location.href) {
  try {
    const url = new URL(value, window.location.href);
    if (!isGoogleHostname(url.hostname)) return "";
    const pathname = normalizedPathname(url.pathname);
    const routeID = pathname === "/fbx" ? url.searchParams.get("fbx") : "";
    if (GOOGLE_GAME_IDS.has(routeID)) return GOOGLE_GAME_IDS.get(routeID);
    const logoID = pathname.match(/\/logos\/fnbx\/([^/]+)\//)?.[1] || "";
    return GOOGLE_GAME_IDS.get(logoID) || "";
  } catch (error) {
    return "";
  }
}

function googleGameNameFromElement(target) {
  if (!(target instanceof Element)) return "";
  let current = target;
  for (let depth = 0; current && depth < 16; depth += 1, current = current.parentElement) {
    const funboxID = current.getAttribute("data-parent-funbox") || "";
    if (GOOGLE_GAME_IDS.has(funboxID)) return GOOGLE_GAME_IDS.get(funboxID);
    for (const attribute of ["href", "src"]) {
      const gameName = googleGameNameFromURL(current.getAttribute(attribute) || "");
      if (gameName) return gameName;
    }
    if (current === document.body || current === document.documentElement) break;
  }
  return "";
}

function googleGameNameFromEvent(event) {
  const path = typeof event?.composedPath === "function" ? event.composedPath() : [];
  for (const candidate of path.slice(0, 32)) {
    const gameName = googleGameNameFromElement(candidate);
    if (gameName) return gameName;
  }
  return googleGameNameFromElement(event?.target);
}

function stopWatchingGooglePlayableGames() {
  if (googleGameClickHandler) document.removeEventListener("click", googleGameClickHandler, true);
  googleGameClickHandler = null;
}

function watchGooglePlayableGames(rule) {
  if (!isGoogleHostname() || normalizedPathname(window.location.pathname) !== "/search") return;
  stopWatchingGooglePlayableGames();

  googleGameClickHandler = (event) => {
    const gameName = googleGameNameFromEvent(event);
    if (gameName) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderBlocked({ ...rule, title: `Google ${gameName}`, embeddedGame: true });
    }
  };
  document.addEventListener("click", googleGameClickHandler, true);
}

function blockedGameWebsiteRule(rules) {
  return normalizedRules(rules).find((rule) => rule.id === "gameSites" && rulePausesAccess(rule)) || null;
}

function applyRules(rules) {
  const safeRules = normalizedRules(rules, DEFAULT_RULES);
  currentRules = safeRules;
  lastCheckedURL = window.location.href;
  const gameRule = blockedGameWebsiteRule(safeRules);
  const directGoogleGame = gameRule && googleGameNameFromURL();
  if (directGoogleGame) {
    renderBlocked({ ...gameRule, title: `Google ${directGoogleGame}`, embeddedGame: true });
    return;
  }
  const blockedRule = matchingBlockedRule(safeRules);
  if (blockedRule) {
    renderBlocked(blockedRule);
    return;
  }
  if (gameRule) watchGooglePlayableGames(gameRule);
}

function recheckAfterNavigation() {
  if (pageBlocked || isKiddoSproutPage() || window.location.href === lastCheckedURL) return;
  stopWatchingGooglePlayableGames();
  applyRules(currentRules);
}

function checkCurrentPage() {
  const kiddoSproutPage = isKiddoSproutPage();
  const whenReady = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  };
  if (kiddoSproutPage) {
    whenReady(() => {
      if (window.top === window) showKiddoSproutConnectedBadge("KiddoSprout blocker active");
      announceReady();
    });
    return;
  }
  if (window.top === window) whenReady(() => showKiddoSproutConnectedBadge("KiddoSprout blocker loaded"));
  try {
    chrome.storage.local.get({ [KIDDO_SPROUT_KEY]: DEFAULT_RULES }, (data) => {
      const storageError = chrome.runtime.lastError;
      applyRules(storageError ? DEFAULT_RULES : data?.[KIDDO_SPROUT_KEY]);
    });
  } catch (error) {
    applyRules(DEFAULT_RULES);
  }
}

function isKiddoSproutPage() {
  const host = String(window.location.hostname || "").toLowerCase().replace(/\.+$/, "");
  const path = normalizedPathname(window.location.pathname || "/");
  if (KIDDO_SPROUT_HOSTS.has(host) && window.location.port === "8001") {
    return ["/", "/index.html", "/games"].includes(path) || path.startsWith("/games/");
  }
  const publicBase = KIDDO_SPROUT_PUBLIC_ROUTES.get(host);
  if (!publicBase) return false;
  return path === publicBase
    || path === `${publicBase}/index.html`
    || path === `${publicBase}/games`
    || path.startsWith(`${publicBase}/games/`);
}

function isKiddoSproutDashboard() {
  const host = String(window.location.hostname || "").toLowerCase().replace(/\.+$/, "");
  const path = normalizedPathname(window.location.pathname || "/");
  if (KIDDO_SPROUT_HOSTS.has(host) && window.location.port === "8001") {
    return path === "/" || path === "/index.html";
  }
  const publicBase = KIDDO_SPROUT_PUBLIC_ROUTES.get(host);
  return Boolean(publicBase) && (path === publicBase || path === `${publicBase}/index.html`);
}

function announceReady() {
  window.postMessage({
    source: "kiddosprout-blocker",
    type: "ready"
  }, window.location.origin);
}

function announceRulesResult(type, message = "") {
  window.postMessage({
    source: "kiddosprout-blocker",
    type,
    ...(message ? { message: String(message).slice(0, 200) } : {})
  }, window.location.origin);
}

function showKiddoSproutConnectedBadge(text = "KiddoSprout blocker loaded") {
  if (document.getElementById("kiddo-sprout-extension-badge")) {
    return;
  }
  const badge = document.createElement("div");
  badge.id = "kiddo-sprout-extension-badge";
  badge.textContent = text;
  badge.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:2147483647",
    "padding:10px 14px",
    "border-radius:999px",
    "background:#168b8b",
    "color:white",
    "font:800 13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "box-shadow:0 12px 30px rgba(0,0,0,.22)",
    "border:1px solid rgba(255,255,255,.35)"
  ].join(";");
  document.documentElement.appendChild(badge);
  window.setTimeout(() => {
    badge.style.opacity = "0";
    badge.style.transition = "opacity 400ms ease";
    window.setTimeout(() => badge.remove(), 500);
  }, 3600);
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== "kiddosprout" || event.data?.type !== "blockRules") {
    return;
  }
  if (!isKiddoSproutDashboard()) return;
  if (!validRulePayload(event.data.rules)) {
    announceRulesResult("rulesSaveFailed", "The dashboard sent invalid blocker rules.");
    return;
  }
  try {
    chrome.storage.local.set({ [KIDDO_SPROUT_KEY]: normalizedRules(event.data.rules) }, () => {
      const storageError = chrome.runtime.lastError;
      if (storageError) {
        announceRulesResult("rulesSaveFailed", storageError.message || "Chrome could not save the blocker rules.");
        return;
      }
      announceRulesResult("rulesSaved");
    });
  } catch (error) {
    announceRulesResult("rulesSaveFailed", error?.message || "Chrome could not save the blocker rules.");
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[KIDDO_SPROUT_KEY] || isKiddoSproutPage() || pageBlocked) return;
  stopWatchingGooglePlayableGames();
  applyRules(changes[KIDDO_SPROUT_KEY].newValue);
});

function startNavigationRechecks() {
  window.addEventListener("popstate", recheckAfterNavigation);
  window.addEventListener("hashchange", recheckAfterNavigation);
  window.addEventListener("pageshow", recheckAfterNavigation);
  let navigationAPIActive = false;
  try {
    if (window.navigation?.addEventListener) {
      window.navigation.addEventListener("currententrychange", recheckAfterNavigation);
      navigationAPIActive = true;
    }
  } catch (error) {
    // An extension update can invalidate browser-owned objects in an already
    // open tab. The bounded URL poll below keeps SPA route checks available.
  }
  if (!navigationAPIActive) {
    // Chrome and Edge versions with the Navigation API recheck immediately.
    // Retain a low-frequency fallback for older managed computers where a SPA
    // can change routes with history.pushState() without popstate firing.
    window.setInterval?.(recheckAfterNavigation, 1500);
  }
}

startNavigationRechecks();
checkCurrentPage();
