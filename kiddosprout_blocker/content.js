const KIDDO_SPROUT_KEY = "kiddoSproutBlockRules";
const KIDDO_SPROUT_HOSTS = new Set([
  "localhost",
  "127.0.0.1"
]);

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
      "steamcommunity.com",
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

const GAME_KEYWORDS = [
  "roblox",
  "minecraft",
  "fortnite",
  "games",
  "game",
  "gaming",
  "play",
  "arcade",
  "unblocked-games",
  "unblockedgames",
  "freegames",
  "html5games",
  "onlinegames",
  "puzzle",
  "adventure",
  "action",
  "strategy",
  "simulation",
  "sports",
  "racing",
  "shooter",
  "multiplayer",
  "singleplayer",
  "sandbox",
  "roleplaying",
  "rpg",
  "platformer",
  "casual",
  "indie",
  "mobilegames",
  "browsergames",
  "steam",
  "epicgames",
  "xbox",
  "playstation",
  "nintendo"
];

function hostnameMatches(hostname, domain) {
  const cleanHost = String(hostname || "").toLowerCase();
  const cleanDomain = String(domain || "").toLowerCase().replace(/^www\./, "");
  return cleanHost === cleanDomain || cleanHost.endsWith("." + cleanDomain);
}

function matchingBlockedRule(rules) {
  const host = window.location.hostname;
  const href = window.location.href.toLowerCase();
  return (rules || []).find((rule) => {
    if (rule.rule !== "blocked") return false;
    const domainBlocked = Array.isArray(rule.domains) &&
      rule.domains.some((domain) => hostnameMatches(host, domain));
    const keywordBlocked = rule.keywordMatch &&
      GAME_KEYWORDS.some((word) => href.includes(word));
    return domainBlocked || keywordBlocked;
  });
}

function renderBlocked(rule) {
  const title = rule?.title || "This site";
  document.documentElement.innerHTML = `
    <head>
      <title>Blocked by KiddoSprout</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #17202a;
          background:
            radial-gradient(circle at 20% 20%, rgba(240, 184, 63, .28), transparent 26%),
            radial-gradient(circle at 82% 18%, rgba(52, 111, 159, .24), transparent 26%),
            linear-gradient(135deg, #f7fff6, #eef8ff 52%, #fff8ea);
        }
        main {
          width: min(520px, 100%);
          padding: 30px;
          border-radius: 14px;
          background: rgba(255,255,255,.94);
          border: 1px solid #dce8df;
          box-shadow: 0 24px 70px rgba(24,34,45,.18);
          text-align: center;
        }
        .mark {
          display: inline-grid;
          place-items: center;
          width: 56px;
          height: 56px;
          border-radius: 14px;
          color: white;
          background: linear-gradient(135deg, #168b8b, #6aaa45);
          font-weight: 950;
          margin-bottom: 14px;
        }
        h1 { margin: 0 0 10px; font-size: clamp(28px, 6vw, 44px); }
        p { color: #66758a; font-size: 18px; line-height: 1.45; }
      </style>
    </head>
    <body>
      <main>
        <span class="mark">KS</span>
        <h1>${title} is blocked</h1>
        <p>KiddoSprout parent settings blocked this website for the current child profile.</p>
      </main>
    </body>
  `;
  window.stop();
}

function checkCurrentPage() {
  showKiddoSproutConnectedBadge(isKiddoSproutPage() ? "KiddoSprout blocker active" : "KiddoSprout blocker loaded");
  if (isKiddoSproutPage()) {
    announceReady();
    return;
  }
  chrome.storage.local.get({ [KIDDO_SPROUT_KEY]: DEFAULT_RULES }, (data) => {
    const rule = matchingBlockedRule(data[KIDDO_SPROUT_KEY]);
    if (rule) {
      renderBlocked(rule);
    }
  });
}

function isKiddoSproutPage() {
  const host = window.location.hostname.toLowerCase();
  const title = String(document.title || "").toLowerCase();
  const href = window.location.href.toLowerCase();
  return KIDDO_SPROUT_HOSTS.has(host) ||
    host.includes("kiddosprout") ||
    href.includes("kiddosprout") ||
    title.includes("kiddosprout");
}

function announceReady() {
  window.postMessage({
    source: "kiddosprout-blocker",
    type: "ready"
  }, "*");
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
  chrome.storage.local.set({ [KIDDO_SPROUT_KEY]: event.data.rules || [] }, () => {
    window.postMessage({
      source: "kiddosprout-blocker",
      type: "rulesSaved"
    }, "*");
  });
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkCurrentPage, { once: true });
} else {
checkCurrentPage();
}
