import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const projectURL = new URL("../", import.meta.url);
const contentSource = readFileSync(new URL("kiddosprout_blocker/content.js", projectURL), "utf8");
const blockedHTML = readFileSync(new URL("kiddosprout_blocker/blocked.html", projectURL), "utf8");
const blockedSource = readFileSync(new URL("kiddosprout_blocker/blocked.js", projectURL), "utf8");
const popupHTML = readFileSync(new URL("kiddosprout_blocker/popup.html", projectURL), "utf8");
const manifest = JSON.parse(readFileSync(new URL("kiddosprout_blocker/manifest.json", projectURL), "utf8"));
const setupHTML = readFileSync(new URL("blocker-setup.html", projectURL), "utf8");
const setupCSS = readFileSync(new URL("blocker-setup.css", projectURL), "utf8");
assert.doesNotMatch(setupCSS, /font-size:\s*(?:10|11)px/,
  "Blocker setup labels must remain readable instead of shrinking to 10–11px.");
const setupSource = readFileSync(new URL("blocker-setup.js", projectURL), "utf8");
const dashboardSource = readFileSync(new URL("js.js", projectURL), "utf8");
const CAPTCHA_TOKEN = "blocker-captcha-token";

class FakeElement {
  constructor({ tagName = "div", attributes = {}, text = "", parent = null } = {}) {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.textContent = text;
    this.parentElement = parent;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  matches(selectors) {
    return selectors.split(",").some((rawSelector) => {
      const selector = rawSelector.trim();
      if (selector === "button" || selector === "a" || selector === "canvas" || selector === "iframe") {
        return this.tagName === selector.toUpperCase();
      }
      const role = selector.match(/^\[role=["']?([^"'\]]+)["']?\]$/)?.[1];
      return Boolean(role && this.getAttribute("role") === role);
    });
  }

  closest(selectors) {
    let current = this;
    while (current) {
      if (current.matches(selectors)) return current;
      current = current.parentElement;
    }
    return null;
  }
}

const pageListeners = new Map();
const windowListeners = new Map();
const navigationListeners = new Map();
const storageListeners = [];
let storageGetCallback = null;
const postedMessages = [];
const redirects = [];
const location = {};
const documentElement = new FakeElement({ tagName: "html" });
const body = new FakeElement({ tagName: "body", parent: documentElement });
const document = {
  readyState: "loading",
  title: "",
  body,
  documentElement,
  addEventListener(type, listener) { pageListeners.set(type, listener); },
  removeEventListener() {},
  getElementById() { return null; },
  querySelectorAll() { return []; }
};
const window = {
  location,
  top: null,
  navigation: {
    addEventListener(type, listener) { navigationListeners.set(type, listener); }
  },
  addEventListener(type, listener) { windowListeners.set(type, listener); },
  postMessage(message, targetOrigin) { postedMessages.push({ message, targetOrigin }); },
  setTimeout,
  clearTimeout,
  stop() {},
  getComputedStyle() { return { display: "block", visibility: "visible", opacity: "1" }; }
};
window.top = window;

const chrome = {
  runtime: { getURL: (path) => `chrome-extension://test/${path}` },
  storage: {
    local: {
      get(defaults, callback) { storageGetCallback = callback; },
      set() {}
    },
    onChanged: {
      addListener(listener) { storageListeners.push(listener); }
    }
  }
};

class FakeMutationObserver {
  disconnect() {}
  observe() {}
}

const context = vm.createContext({
  chrome,
  console,
  document,
  Element: FakeElement,
  MutationObserver: FakeMutationObserver,
  Node: { ELEMENT_NODE: 1 },
  URL,
  URLSearchParams,
  window
});
vm.runInContext(contentSource, context, { filename: "content.js" });

function setLocation(value) {
  const url = new URL(value);
  Object.assign(location, {
    href: url.href,
    hostname: url.hostname,
    pathname: url.pathname,
    port: url.port,
    protocol: url.protocol,
    search: url.search,
    origin: url.origin,
    replace(value) { redirects.push(value); }
  });
}

function evaluate(expression) {
  return vm.runInContext(expression, context);
}

setLocation("https://www.google.com/search?q=game");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "", "a harmless Google results page must remain available");

setLocation("https://www.google.co.uk/search?q=history+of+games");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "", "country-specific Google results must remain available");

setLocation("https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fhistory-of-games");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "", "a harmless search-result redirect must remain available");

setLocation("https://www.bing.com/search?q=game+design+homework");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "", "ordinary Bing searches must remain available");

setLocation("https://www.bing.com/games/arcade");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "gameSites", "a game route on a search-provider domain must not bypass keyword protection");

setLocation("https://sites.google.com/view/classroom/games/arcade");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "gameSites", "a Google Sites game route must not inherit a blanket Google exemption");

setLocation("https://example.com/articles/how-video-games-are-designed");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "", "an informational article must not be blocked by a word in its URL");

setLocation("https://example.com/display-settings");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "", "the substring play must not cause a false block");

setLocation("https://example.com/%67ames/arcade");
assert.equal(evaluate("matchingBlockedRule([{ id: 'gameSites', title: 'Games', rule: 'blocked', domains: [], keywordMatch: true }])?.id || ''"), "gameSites", "a percent-encoded game route must not bypass keyword protection");

setLocation("https://example.com/%2567ames/arcade");
assert.equal(evaluate("matchingBlockedRule([{ id: 'gameSites', title: 'Games', rule: 'blocked', domains: [], keywordMatch: true }])?.id || ''"), "gameSites", "a doubly escaped game route must not bypass keyword protection");

setLocation("https://example.com/#/games/arcade");
assert.equal(evaluate("matchingBlockedRule([{ id: 'gameSites', title: 'Games', rule: 'blocked', domains: [], keywordMatch: true }])?.id || ''"), "gameSites", "a hash-routed browser game must not bypass keyword protection");

setLocation("https://example.com/#/articles/how-video-games-are-designed");
assert.equal(evaluate("matchingBlockedRule([{ id: 'gameSites', title: 'Games', rule: 'blocked', domains: [], keywordMatch: true }])?.id || ''"), "", "an informational hash route must not be mistaken for a game route");

setLocation("https://www.crazygames.com/game/test-game");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "gameSites", "known game sites must still be blocked");

setLocation("http://play.crazygames.com:8080/game/test-game");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "gameSites", "subdomains and alternate ports must not bypass a hostname rule");

setLocation("https://www.roblox.com/games/123/example");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "roblox", "the specific Roblox rule must take priority over a generic game-route match");

assert.equal(evaluate(`matchingBlockedRule([
  { id: "gameSites", title: "Game Websites", rule: "blocked", domains: [], keywordMatch: true },
  { id: "roblox", title: "Roblox", rule: "allowed", domains: ["roblox.com"] }
])?.id || ""`), "", "an explicit parent Allow rule must override a generic game-route block");

assert.equal(evaluate(`matchingBlockedRule([
  { id: "gameSites", title: "Game Websites", rule: "allowed", domains: [], keywordMatch: true },
  { id: "roblox", title: "Roblox", rule: "blocked", domains: ["roblox.com"] }
])?.id || ""`), "roblox", "an explicit blocked domain must override a generic category allowance");

assert.equal(evaluate(`matchingBlockedRule([
  { id: "roblox", title: "Roblox", rule: "request", domains: ["roblox.com"] }
])?.rule || ""`), "request", "Ask parent must pause an external game site instead of failing open");

setLocation("https://sites.google.com/view/drive-u-7-home/home/level-one");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "gameSites", "a specifically configured Google Sites game path must be blocked");

setLocation("https://sites.google.com/view/drive-u-7-home/homework");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "", "a configured path must stop at a path-segment boundary");

setLocation("https://sites.google.com/view/drive-u-7-home/home/level-two?continue=1");
assert.equal(evaluate("matchingBlockedRule([{ id: 'custom', title: 'Custom', rule: 'blocked', domains: ['https://www.sites.google.com/view/drive-u-7-home/home?ignored=1'] }])?.id || ''"), "custom", "a full configured URL must normalize its scheme, www prefix, and query before matching");

setLocation("https://example.com/#/games/level-one");
assert.equal(evaluate("matchingBlockedRule([{ id: 'custom', title: 'Custom', rule: 'blocked', domains: ['example.com/#/games'] }])?.id || ''"), "custom", "a configured SPA hash route must match that route and its descendants");
setLocation("https://example.com/#/learning/level-one");
assert.equal(evaluate("matchingBlockedRule([{ id: 'custom', title: 'Custom', rule: 'blocked', domains: ['example.com/#/games'] }])?.id || ''"), "", "a configured hash route must not accidentally block the whole host");

setLocation("https://example.com/%67ames/level-one");
assert.equal(evaluate("matchingBlockedRule([{ id: 'custom', title: 'Custom', rule: 'blocked', domains: ['example.com/games'] }])?.id || ''"), "custom", "an escaped path must still match an explicit configured game path");

assert.equal(evaluate("validRulePayload([{ id: 'bad', rule: 'blocked', domains: ['https://user:password@example.com/game'] }])"), false, "credential-bearing rule targets must be rejected rather than stored as broken rules");

setLocation("https://www.crazygames.com./game/test-game");
assert.equal(evaluate("matchingBlockedRule(DEFAULT_RULES)?.id || ''"), "gameSites", "a DNS trailing dot must not bypass a blocked hostname");

setLocation("https://example.com/");
assert.doesNotThrow(() => evaluate("matchingBlockedRule({})"), "a corrupt non-array rules value must not disable the content script");
assert.doesNotThrow(() => evaluate("matchingBlockedRule([null, { rule: 'blocked', domains: ['example.com'] }])"), "malformed rule entries must not crash matching");

chrome.runtime.lastError = { message: "storage unavailable" };
storageGetCallback?.(undefined);
delete chrome.runtime.lastError;
assert.ok(evaluate("currentRules.some((rule) => rule.id === 'gameSites')"), "a storage read failure must retain default game protection");

setLocation("https://www.google.com/search?q=game");
const card = new FakeElement({ attributes: { "data-parent-funbox": "solitaire" }, text: "Solitaire" });
const playButton = new FakeElement({ tagName: "button", attributes: { "aria-label": "Play" }, text: "Play", parent: card });
context.testElement = playButton;
assert.equal(evaluate("googleGameNameFromElement(testElement)"), "Solitaire", "an allowlisted Google game card must be intercepted");

const blockBreakerCard = new FakeElement({ attributes: { "data-parent-funbox": "block_breaker" }, text: "Block Breaker" });
const blockBreakerButton = new FakeElement({ tagName: "button", attributes: { "aria-label": "Play" }, text: "Play", parent: blockBreakerCard });
context.testElement = blockBreakerButton;
assert.equal(evaluate("googleGameNameFromElement(testElement)"), "Block Breaker", "Google's Block Breaker card must be intercepted");

const baseballCard = new FakeElement({ attributes: { "data-parent-funbox": "baseball" }, text: "Baseball" });
const baseballButton = new FakeElement({ tagName: "button", attributes: { "aria-label": "Play" }, text: "Play", parent: baseballCard });
context.testElement = baseballButton;
assert.equal(evaluate("googleGameNameFromElement(testElement)"), "Baseball", "Google's Baseball card must be intercepted");

const articleLink = new FakeElement({ tagName: "a", text: "History of Solitaire" });
context.testElement = articleLink;
assert.equal(evaluate("googleGameNameFromElement(testElement)"), "", "an informational result about a game must not be intercepted");

const shadowPlayButton = new FakeElement({ tagName: "button", attributes: { "aria-label": "Play" } });
const shadowGameHost = new FakeElement({ attributes: { "data-parent-funbox": "pacman" } });
context.testEvent = {
  target: shadowPlayButton,
  composedPath() { return [shadowPlayButton, shadowGameHost, body, documentElement]; }
};
assert.equal(evaluate("googleGameNameFromEvent(testEvent)"), "Pac-Man", "a Google game control inside a shadow tree must be found through its composed click path");

setLocation("https://www.google.co.uk/search/?q=solitaire");
evaluate("pageBlocked = false; applyRules(DEFAULT_RULES)");
const googleSearchClick = pageListeners.get("click");
assert.equal(typeof googleSearchClick, "function", "a canonical trailing slash on Google Search must still install the playable-game guard");
let ordinaryResultPrevented = false;
googleSearchClick({
  target: articleLink,
  composedPath() { return [articleLink, body, documentElement]; },
  preventDefault() { ordinaryResultPrevented = true; },
  stopImmediatePropagation() {}
});
assert.equal(ordinaryResultPrevented, false, "ordinary Google result clicks must remain available");
let playableGamePrevented = false;
let playableGameStopped = false;
const redirectsBeforeGoogleGame = redirects.length;
googleSearchClick({
  target: playButton,
  composedPath() { return [playButton, card, body, documentElement]; },
  preventDefault() { playableGamePrevented = true; },
  stopImmediatePropagation() { playableGameStopped = true; }
});
assert.equal(playableGamePrevented, true, "opening an allowlisted playable Google game must be cancelled");
assert.equal(playableGameStopped, true, "the original playable-game launcher must not run after the block screen opens");
assert.equal(redirects.length, redirectsBeforeGoogleGame + 1, "a playable Google game click must open the KiddoSprout block page once");
assert.match(redirects.at(-1) || "", /title=Google\+Solitaire/, "the block page should identify the selected playable game");
evaluate("pageBlocked = false");

setLocation("https://www.google.com/fbx?fbx=snake_arcade");
assert.equal(evaluate("googleGameNameFromURL()"), "Snake", "Google's direct Snake game route must be detected");

setLocation("https://games.google.com.au:8443/fbx?fbx=snake_arcade");
assert.equal(evaluate("googleGameNameFromURL()"), "Snake", "supported Google country domains, subdomains, and alternate ports must still be recognised");

setLocation("https://www.google.com./fbx?fbx=snake_arcade");
assert.equal(evaluate("googleGameNameFromURL()"), "Snake", "a DNS trailing dot must not bypass supported Google game detection");

setLocation("https://www.google.zip/fbx?fbx=snake_arcade");
assert.equal(evaluate("googleGameNameFromURL()"), "", "an unrelated three-letter domain must not be trusted merely because its registrable label is google");

setLocation("https://www.google.com.evil.example/fbx?fbx=snake_arcade");
assert.equal(evaluate("googleGameNameFromURL()"), "", "a deceptive suffix must not be treated as a Google game host");

setLocation("https://www.google.com/logos/fnbx/minesweeper/standalone.html");
assert.equal(evaluate("googleGameNameFromURL()"), "Minesweeper", "Google's embedded game frame must be detected");

setLocation("https://www.google.com/logos/%66nbx/minesweeper/standalone.html");
assert.equal(evaluate("googleGameNameFromURL()"), "Minesweeper", "an escaped Google game-frame path must canonicalize before matching");

setLocation("https://www.google.com/fbx?fbx=history_article");
assert.equal(evaluate("googleGameNameFromURL()"), "", "unknown Google routes must not be treated as games");

setLocation("http://127.0.0.1:8001/index.html#parent");
assert.equal(evaluate("isKiddoSproutPage()"), true, "the local KiddoSprout dashboard must be trusted to sync rules");
assert.equal(evaluate("isKiddoSproutDashboard()"), true, "the exact local dashboard may sync parent rules");

setLocation("http://127.0.0.1:8001/games/index.html");
assert.equal(evaluate("isKiddoSproutPage()"), true, "the local Sprout Arcade must not be blocked as a generic game site");
assert.equal(evaluate("isKiddoSproutDashboard()"), false, "the arcade chooser must not be able to replace parent rules");

setLocation("http://127.0.0.1:8001/games/snake-game/index.html");
assert.equal(evaluate("isKiddoSproutPage()"), true, "a reviewed local game route must remain available");
assert.equal(evaluate("isKiddoSproutDashboard()"), false, "a reviewed game must never gain dashboard rule-write authority");

setLocation("https://hammy-boy.github.io/KiddoSprout-Family-Hub/games/memory-game/index.html");
assert.equal(evaluate("isKiddoSproutPage()"), true, "the exact published GitHub Pages arcade route must be recognised");
assert.equal(evaluate("isKiddoSproutDashboard()"), false, "the hosted arcade must remain read-only to extension settings");

setLocation("https://hammy-boy.github.io/other-project/games/memory-game/index.html");
assert.equal(evaluate("isKiddoSproutPage()"), false, "a sibling GitHub Pages project must not inherit KiddoSprout trust");

setLocation("https://example.github.io/KiddoSprout-Family-Hub/games/memory-game/index.html");
assert.equal(evaluate("isKiddoSproutPage()"), false, "a copied repository path on another account must not inherit KiddoSprout trust");

setLocation("http://127.0.0.1:8001/report_problem.html");
assert.equal(evaluate("isKiddoSproutPage()"), false, "an unrelated page on the local server must not be allowed to replace blocker rules");

setLocation("https://random-preview.trycloudflare.com/index.html#parent");
assert.equal(evaluate("isKiddoSproutPage()"), false, "an arbitrary Cloudflare quick tunnel must never be trusted to sync blocker rules");

setLocation("http://127.0.0.1.example:8001/index.html#parent");
assert.equal(evaluate("isKiddoSproutPage()"), false, "a deceptive suffix on a loopback hostname must not be trusted");

setLocation("https://example.com/kiddosprout");
document.title = "KiddoSprout";
assert.equal(evaluate("isKiddoSproutPage()"), false, "an unrelated site must not be able to impersonate the dashboard");

setLocation("http://127.0.0.1:8001/games/snake-game/index.html");
let arcadeStorageWrites = 0;
chrome.storage.local.set = () => { arcadeStorageWrites += 1; };
windowListeners.get("message")?.({
  source: window,
  data: { source: "kiddosprout", type: "blockRules", rules: [{ id: "games", title: "Games", rule: "allowed", domains: [] }] }
});
assert.equal(arcadeStorageWrites, 0,
  "an arcade page may bypass its own game block but must not overwrite parent extension rules");

setLocation("http://127.0.0.1:8001/index.html#parent");
let storageWrites = 0;
chrome.storage.local.set = (_value, callback) => {
  storageWrites += 1;
  chrome.runtime.lastError = { message: "quota exceeded" };
  callback();
  delete chrome.runtime.lastError;
};
windowListeners.get("message")?.({
  source: window,
  data: { source: "kiddosprout", type: "blockRules", rules: [{ id: "games", title: "Games", rule: "blocked", domains: ["games.example"] }] }
});
assert.equal(storageWrites, 1, "valid dashboard rules must reach Chrome storage");
assert.equal(postedMessages.at(-1)?.message?.type, "rulesSaveFailed", "a rejected storage write must never be acknowledged as saved");
assert.equal(postedMessages.at(-1)?.targetOrigin, "http://127.0.0.1:8001", "extension acknowledgements must target the dashboard origin");

windowListeners.get("message")?.({
  source: window,
  data: { source: "kiddosprout", type: "blockRules", rules: { rule: "blocked" } }
});
assert.equal(storageWrites, 1, "a malformed dashboard payload must not overwrite the last usable rules");
assert.equal(postedMessages.at(-1)?.message?.type, "rulesSaveFailed", "a malformed dashboard payload must report failure");

let savedRules = null;
chrome.storage.local.set = (value, callback) => {
  storageWrites += 1;
  savedRules = value.kiddoSproutBlockRules;
  callback();
};
windowListeners.get("message")?.({
  source: window,
  data: { source: "kiddosprout", type: "blockRules", rules: [{ id: "games", title: "Games", rule: "blocked", domains: [" games.example "] }] }
});
assert.equal(postedMessages.at(-1)?.message?.type, "rulesSaved", "a successful Chrome storage write must be acknowledged");
assert.deepEqual(savedRules?.[0]?.domains, ["games.example"], "saved blocker domains must be normalized before persistence");

setLocation("https://example.com/");
evaluate("pageBlocked = false; applyRules([{ id: 'gameSites', title: 'Games', rule: 'blocked', domains: [], keywordMatch: true }])");
setLocation("https://example.com/games/arcade");
navigationListeners.get("currententrychange")?.();
assert.match(redirects.at(-1) || "", /^chrome-extension:\/\/test\/blocked\.html\?/, "same-document navigation into a game route must be rechecked");

let navigationFallbackRegistrations = 0;
window.navigation = { addEventListener() { throw new Error("extension context changed"); } };
window.setInterval = () => { navigationFallbackRegistrations += 1; return 1; };
assert.doesNotThrow(() => evaluate("startNavigationRechecks()"), "a rejected Navigation API listener must not stop protection setup");
assert.equal(navigationFallbackRegistrations, 1, "a rejected Navigation API listener must fall back to bounded URL polling");

evaluate("pageBlocked = false");
setLocation("https://blocked.example/");
chrome.runtime.getURL = () => { throw new Error("extension context invalidated"); };
assert.doesNotThrow(() => evaluate("renderBlocked({ title: '<Unsafe>' })"), "an extension reload must fall back to an inline blocked page");
assert.match(String(documentElement.innerHTML || ""), /&lt;Unsafe&gt;/, "the invalidated-extension fallback must remain escaped");

assert.match(blockedHTML, /<h1 id="blocked-heading">Blocked by KiddoSprout<\/h1>/, "the blocked page must use the required headline");
assert.match(blockedHTML, /covers websites opened in this Chrome or Edge profile[\s\S]*Installed apps are handled separately/,
  "the blocked page must state its browser-only boundary instead of implying device-wide protection");
assert.match(popupHTML, /Matching websites opened in this Chrome or Edge profile[\s\S]*other browser profiles need their own KiddoSprout setup/,
  "the extension popup must accurately describe which browser profile it covers");
assert.doesNotMatch(blockedHTML + popupHTML + manifest.description, /tamper[ -]?proof|blocks? every game|all games everywhere/i,
  "extension messaging must not promise total or tamper-proof blocking");
assert.match(blockedSource, /history\.back\(\)[\s\S]*location\.replace\("about:blank"\)/, "Go Back must have a safe fallback when a directly opened blocked tab has no usable history");
assert.deepEqual(manifest.permissions, ["storage"], "the extension must keep only the storage permission it uses");
assert.deepEqual(manifest.host_permissions, ["http://*/*", "https://*/*"], "website matching needs only HTTP and HTTPS host access");
assert.equal(manifest.background, undefined, "the content-script design must not add an unnecessary persistent background worker");
assert.equal(manifest.version, "1.1.5", "behavior and disclosure changes require a new extension package version");
assert.ok(manifest.web_accessible_resources?.some((entry) => entry.resources?.includes("blocked.html")), "the redirect destination must be packaged by Chrome");
assert.deepEqual(manifest.web_accessible_resources?.[0]?.resources, ["blocked.html"], "only the navigation destination should be web-accessible; its internal script and icon must not be exposed for site fingerprinting");
assert.equal(manifest.content_scripts?.[0]?.run_at, "document_start", "known game-site navigation must be intercepted before the page finishes loading");
assert.equal(manifest.content_scripts?.[0]?.all_frames, true, "game websites embedded in frames must receive the same protection");
assert.ok(windowListeners.has("pageshow"), "restored pages must be rechecked after back-forward cache navigation");
assert.match(contentSource, /window\.setInterval\?\.\(recheckAfterNavigation, 1500\)/, "older Chrome and Edge versions need a bounded SPA route fallback");
assert.match(setupHTML, /data-blocker-platform="mac"/, "the protected download page must offer Mac");
assert.match(setupHTML, /<html lang="en-GB">/);
assert.ok(setupHTML.indexOf('<meta charset="utf-8">') < setupHTML.indexOf("<script"), "Blocker setup must declare UTF-8 before scripts.");
assert.match(setupHTML, /<meta name="color-scheme" content="light dark">/);
assert.match(setupHTML, /class="blocker-topbar" aria-label="Blocker setup navigation"/);
assert.match(setupHTML, /data-blocker-platform="windows"/, "the protected download page must offer Windows");
assert.match(setupHTML, /value="windows-arm64"/, "Windows ARM64 testers need an explicit package choice");
assert.match(setupSource, /\/api\/blocker\/download\/\$\{artifactId\}/, "the selected platform must choose its own protected endpoint");
assert.match(setupHTML, /unsigned/i, "the Windows colleague build must clearly disclose that it is unsigned");
assert.match(setupHTML, /Gatekeeper may refuse its first launch/, "the unnotarized Mac build must disclose why macOS may not open it");
assert.match(setupHTML, /Never disable Gatekeeper[\s\S]*Open Anyway/, "the Mac test-build recovery must retain Gatekeeper and name the one-time override");
assert.match(setupHTML, /id="blocker-preview-note"[^>]*hidden/, "the public build needs an explicit setup-preview notice");
assert.match(setupHTML, /Demo guide download — no blocker app included\./,
  "the public preview must identify its harmless download before JavaScript runs");
assert.match(setupHTML, /id="blocker-demo-download-summary"[^>]*hidden/,
  "the harmless demo-download explanation must stay out of the live protected flow");
assert.equal((setupHTML.match(/data-live-blocker-resource/g) || []).length, 2, "both checksum links must be neutralized in public preview mode");
for (const match of setupHTML.matchAll(/<a\b[^>]*\bdata-live-blocker-resource\b[^>]*>/gi)) {
  assert.doesNotMatch(match[0], /\bhref\s*=/i, "checksum links must start without a live endpoint");
  assert.doesNotMatch(match[0], /\bdownload(?:\s|=|>)/i, "checksum links must start without download behavior");
  assert.match(match[0], /\baria-disabled="true"/i);
}
assert.match(setupSource, /function enableLiveResourceLinks\(\)[\s\S]*setAttribute\("href", "\/api\/blocker\/checksums"\)/,
  "live blocker setup must enable the checksum links explicitly");
assert.doesNotMatch(setupHTML + setupSource, /checksums available after parent sign-in/i,
  "Public checksum metadata must not be falsely described as requiring a parent session.");
assert.match(setupSource, /Download public SHA-256 checksums/,
  "The live setup must identify its checksum file as public integrity metadata.");
assert.match(setupHTML, /id="blocker-pin"[^>]*autocomplete="new-password"[^>]*aria-describedby="download-intro blocker-download-status"/);
assert.match(setupHTML, /id="blocker-pin-confirm"[^>]*autocomplete="new-password"[^>]*aria-describedby="blocker-download-status"/);
for (const id of ["blocker-pin", "blocker-pin-confirm"]) {
  const input = setupHTML.match(new RegExp(`<input\\b[^>]*id="${id}"[^>]*>`, "i"))?.[0] || "";
  assert.ok(input, `${id} must exist`);
  assert.doesNotMatch(input, /\bmaxlength\s*=/i, `${id} must not truncate a pasted PIN before harmless spaces can be removed`);
}
assert.match(setupHTML, /id="blocker-download-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
  "blocker availability updates should be announced as one complete message");
assert.match(setupHTML, /id="retry-blocker-check"[^>]*aria-controls="blocker-download-status"[^>]*hidden/,
  "the unavailable blocker state needs an in-page retry action");
assert.match(setupCSS, /html\.theme-night body/);
assert.match(setupCSS, /html\.theme-night \.download-card/);
assert.match(setupCSS, /\.download-button:disabled \{[\s\S]*?opacity: 1;/);
assert.match(setupCSS, /\.retry-check-button \{[\s\S]*?min-height: 44px;/,
  "the blocker retry action should remain a full-size touch target");
assert.match(setupCSS, /input\[aria-invalid="true"\]/);
assert.match(setupSource, /if \(READ_ONLY_DEMO\) \{\s*initializePublicPreview\(\);\s*return;/,
  "every read-only demo must return before the live protected-download flow");
const demoDownloadSource = setupSource.slice(
  setupSource.indexOf("function demoGuideFilename"),
  setupSource.indexOf("if (READ_ONLY_DEMO)")
);
assert.match(demoDownloadSource, /new Blob\(\[demoGuideText\(\)\], \{ type: "text\/plain;charset=utf-8" \}\)/,
  "the demo download must be a locally generated plain-text file");
assert.match(demoDownloadSource, /KiddoSprout-(?:Mac|Windows-[A-Za-z0-9-]+)-Demo-Setup-Guide\.txt/,
  "the demo download must use a clearly labelled .txt filename");
assert.doesNotMatch(demoDownloadSource, /fetch\(|accessToken|\/api\/blocker/,
  "the harmless demo-download branch must not touch Auth or private blocker APIs");
assert.doesNotMatch(demoDownloadSource, /Demo-Setup-Guide\.(?:zip|dmg|pkg|exe|msi)/i,
  "the demo flow must not disguise an installer or archive as a sample download");
assert.doesNotMatch(setupSource, /location\.replace\(/, "the public setup preview must remain viewable");
assert.match(dashboardSource, /event\.data\.type === "rulesSaveFailed"[\s\S]*Browser blocker rules could not be saved/,
  "the dashboard must surface a rejected extension storage write");

class SetupElementMock {
  constructor({ dataset = {}, hidden = false, value = "", type = "", onAnchorClick = null } = {}) {
    this.attributes = {};
    this.children = [];
    this.dataset = { ...dataset };
    this.disabled = false;
    this.hidden = hidden;
    this.listeners = new Map();
    this.required = false;
    this.textContent = "";
    this.type = type;
    this.value = value;
    this.onAnchorClick = onAnchorClick;
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        const enabled = force === undefined ? !classes.has(name) : Boolean(force);
        if (enabled) classes.add(name);
        else classes.delete(name);
        return enabled;
      }
    };
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  contains(child) {
    return this.children.includes(child);
  }

  click() {
    if (this.onAnchorClick) this.onAnchorClick(this);
    return this.dispatch("click");
  }

  dispatch(type) {
    const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    const results = (this.listeners.get(type) || []).map((listener) => listener(event));
    return Promise.all(results.map((result) => Promise.resolve(result))).then(() => event);
  }

  focus() {
    this.focused = true;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  remove() {
    this.removed = true;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  scrollIntoView() {
    this.scrolledIntoView = true;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}

function blockerResponse({
  ok = true,
  status = 200,
  json = {},
  blob = new Blob([Uint8Array.from([0x50, 0x4b, 0x03, 0x04]), new Uint8Array(12)]),
  contentType = "application/zip",
  disposition = 'attachment; filename="KiddoSproutBlocker-macOS-v0.3.1.zip"',
  sha256 = createHash("sha256").update(Buffer.from([0x50, 0x4b, 0x03, 0x04, ...new Uint8Array(12)])).digest("hex")
} = {}) {
  const headers = new Map([
    ["content-type", contentType],
    ["content-disposition", disposition],
    ["x-kiddosprout-sha256", sha256]
  ]);
  return {
    ok,
    status,
    headers: { get(name) { return headers.get(String(name).toLowerCase()) || null; } },
    async json() { return json; },
    async blob() { return blob; }
  };
}

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

async function createSetupHarness({ tokens = ["parent-token"], deferDownload = false, downloadResponse, statusResponse, statusResponses } = {}) {
  const elements = Object.fromEntries([
    "blocker-download-form",
    "blocker-pin",
    "blocker-pin-confirm",
    "confirm-pin-field",
    "blocker-enrollment-fields",
    "blocker-account-password",
    "blocker-human-check",
    "blocker-human-check-status",
    "blocker-download-status",
    "retry-blocker-check",
    "download-blocker",
    "download-platform-icon",
    "download-platform-label",
    "windows-architecture-field",
    "view-blocker-pin",
    "download-intro",
    "blocker-build-label",
    "download-title",
    "blocker-preview-note"
  ].map((id) => [id, new SetupElementMock()]));
  elements["blocker-pin"].type = "password";
  elements["blocker-pin-confirm"].type = "password";
  elements["blocker-account-password"].type = "password";
  elements["blocker-enrollment-fields"].hidden = true;
  elements["retry-blocker-check"].hidden = true;
  elements["windows-architecture"] = new SetupElementMock({ value: "windows" });
  const macButton = new SetupElementMock({ dataset: { blockerPlatform: "mac" } });
  const windowsButton = new SetupElementMock({ dataset: { blockerPlatform: "windows" } });
  const macPanel = new SetupElementMock({ dataset: { setupPlatform: "mac" } });
  const windowsPanel = new SetupElementMock({ dataset: { setupPlatform: "windows" }, hidden: true });
  const liveResources = [new SetupElementMock(), new SetupElementMock()];
  const downloads = [];
  const fetchCalls = [];
  const queuedStatusResponses = Array.isArray(statusResponses) ? [...statusResponses] : null;
  let tokenIndex = 0;
  let resolvePendingDownload = null;
  let humanCheckRenders = 0;
  const bodyElement = new SetupElementMock();
  const documentMock = {
    activeElement: null,
    body: bodyElement,
    documentElement: { classList: { contains() { return false; } } },
    title: "",
    createElement(tagName) {
      return new SetupElementMock({
        onAnchorClick: tagName === "a"
          ? (link) => downloads.push({ filename: link.download, href: link.href })
          : null
      });
    },
    getElementById(id) { return elements[id] || null; },
    querySelectorAll(selector) {
      if (selector === "[data-blocker-platform]") return [macButton, windowsButton];
      if (selector === "[data-setup-platform]") return [macPanel, windowsPanel];
      if (selector === "[data-live-blocker-resource]") return liveResources;
      return [];
    }
  };
  const selectedDownloadResponse = downloadResponse || blockerResponse();
  const fetchMock = (url, options = {}) => {
    fetchCalls.push({ url, options });
    if (String(url).startsWith("/api/blocker/status")) {
      const selectedStatusResponse = queuedStatusResponses?.length
        ? queuedStatusResponses.shift()
        : statusResponse;
      if (selectedStatusResponse instanceof Error) return Promise.reject(selectedStatusResponse);
      return Promise.resolve(selectedStatusResponse || blockerResponse({
        contentType: "application/json",
        json: {
          pinConfigured: true,
          filename: "KiddoSproutBlocker-macOS-v0.3.1.zip",
          platform: "macOS",
          architecture: "Universal",
          version: "0.3.1",
          artifact: { ready: true }
        }
      }));
    }
    if (deferDownload) {
      return new Promise((resolve) => { resolvePendingDownload = () => resolve(selectedDownloadResponse); });
    }
    return Promise.resolve(selectedDownloadResponse);
  };
  const setupWindow = {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: false },
    KiddoSproutSession: {
      getAccessToken() {
        const value = tokens[Math.min(tokenIndex, tokens.length - 1)];
        tokenIndex += 1;
        return value;
      },
      isTemporaryError() { return false; }
    },
    KiddoSproutHumanCheck: {
      async render(container, options = {}) {
        humanCheckRenders += 1;
        const controller = {
          getToken() { return CAPTCHA_TOKEN; },
          remove() { controller.removed = true; }
        };
        options.onToken?.(CAPTCHA_TOKEN, controller);
        return controller;
      }
    },
    sessionStorage: { getItem() { return null; } },
    crypto: webcrypto,
    requestAnimationFrame(callback) { callback(); return 1; },
    setTimeout(callback) { callback(); return 1; }
  };
  vm.runInNewContext(setupSource, {
    console,
    document: documentMock,
    fetch: fetchMock,
    navigator: { userAgent: "Macintosh" },
    Blob,
    URL: {
      createObjectURL() { return "blob:test-download"; },
      revokeObjectURL() {}
    },
    window: setupWindow
  }, { filename: "blocker-setup-live-test.js" });
  await flushAsync();
  await flushAsync();
  return {
    downloads,
    elements,
    fetchCalls,
    liveResources,
    macButton,
    windowsButton,
    get humanCheckRenders() { return humanCheckRenders; },
    completeDownload() {
      assert.ok(resolvePendingDownload, "the deferred download must have started");
      resolvePendingDownload();
    }
  };
}

const firstEnrollmentSetup = await createSetupHarness({
  statusResponse: blockerResponse({
    contentType: "application/json",
    json: {
      pinConfigured: false,
      filename: "KiddoSproutBlocker-macOS-v0.3.1.zip",
      platform: "macOS",
      architecture: "Universal",
      version: "0.3.1",
      artifact: { ready: true }
    }
  })
});
assert.equal(firstEnrollmentSetup.elements["blocker-enrollment-fields"].hidden, false,
  "first-time setup must reveal parent reauthentication fields after the API confirms no PIN exists");
assert.equal(firstEnrollmentSetup.elements["blocker-account-password"].required, true);
assert.equal(firstEnrollmentSetup.humanCheckRenders, 1,
  "first-time setup must start exactly one human-verification challenge");
firstEnrollmentSetup.elements["blocker-pin"].value = "2468";
firstEnrollmentSetup.elements["blocker-pin-confirm"].value = "2468";
await firstEnrollmentSetup.elements["blocker-download-form"].dispatch("submit");
assert.equal(firstEnrollmentSetup.fetchCalls.filter(({ url }) => String(url).includes("/download/")).length, 0,
  "the first PIN must not be submitted without the parent account password");
assert.equal(firstEnrollmentSetup.elements["blocker-account-password"].getAttribute("aria-invalid"), "true");
firstEnrollmentSetup.elements["blocker-account-password"].value = "parent-account-password";
await firstEnrollmentSetup.elements["blocker-download-form"].dispatch("submit");
const enrollmentCall = firstEnrollmentSetup.fetchCalls.find(({ url }) => String(url).includes("/download/"));
assert.ok(enrollmentCall, "verified first-time setup must call the protected download endpoint");
assert.deepEqual(JSON.parse(enrollmentCall.options.body), {
  pin: "2468",
  confirmPin: "2468",
  accountPassword: "parent-account-password",
  captchaToken: CAPTCHA_TOKEN
});
assert.equal(firstEnrollmentSetup.elements["blocker-account-password"].value, "",
  "the account password field must be cleared as soon as the request is created");
assert.equal(firstEnrollmentSetup.elements["blocker-enrollment-fields"].hidden, true,
  "successful first-time enrollment must remove password and challenge controls from the PIN-only flow");

const racingSetup = await createSetupHarness({
  deferDownload: true,
  downloadResponse: blockerResponse({ disposition: 'attachment; filename="../../not-an-installer.html"' })
});
for (const link of racingSetup.liveResources) {
  assert.equal(link.getAttribute("href"), "/api/blocker/checksums", "live setup must enable the checksum endpoint");
  assert.equal(link.getAttribute("download"), "", "live setup must preserve download behavior");
  assert.equal(link.getAttribute("aria-disabled"), null, "live setup must expose the checksum link as enabled");
}
assert.equal(racingSetup.elements["download-blocker"].disabled, false, "a ready artifact must enable its download action");
racingSetup.elements["blocker-pin"].value = "2468";
racingSetup.elements["blocker-pin-confirm"].value = "2468";
const pendingSubmission = racingSetup.elements["blocker-download-form"].dispatch("submit");
await flushAsync();
assert.equal(racingSetup.macButton.disabled, true, "platform changes must lock while a protected download is pending");
assert.equal(racingSetup.elements["windows-architecture"].disabled, true, "architecture changes must lock while a protected download is pending");
await racingSetup.windowsButton.dispatch("click");
assert.equal(racingSetup.macButton.getAttribute("aria-pressed"), "true", "a pending Mac download must not become a stale Windows operation");
racingSetup.completeDownload();
await pendingSubmission;
assert.equal(racingSetup.downloads.length, 1, "one submission must trigger exactly one browser download");
assert.equal(racingSetup.downloads[0].filename, "KiddoSproutBlocker-macOS.zip", "an unsafe response filename must fall back to the selected artifact name");
assert.equal(racingSetup.elements["blocker-download-form"].getAttribute("aria-busy"), "false", "the form must leave its busy state after download completion");
const configuredDownloadBody = JSON.parse(racingSetup.fetchCalls.find(({ url }) => String(url).includes("/download/")).options.body);
assert.deepEqual(configuredDownloadBody, { pin: "2468", confirmPin: "2468" },
  "later downloads must not ask for or transmit the parent account password or a new challenge token");

const expiredSetup = await createSetupHarness({ tokens: ["parent-token", ""] });
expiredSetup.elements["blocker-pin"].value = "2468";
expiredSetup.elements["blocker-pin-confirm"].value = "2468";
await expiredSetup.elements["blocker-download-form"].dispatch("submit");
assert.equal(expiredSetup.fetchCalls.filter(({ url }) => String(url).includes("/download/")).length, 0, "an expired session must not call the protected download endpoint");
assert.equal(expiredSetup.elements["download-blocker"].disabled, true, "an expired session must not leave a falsely actionable download button");
assert.match(expiredSetup.elements["blocker-download-status"].textContent, /login has expired/i);

const wrongTypeSetup = await createSetupHarness({
  downloadResponse: blockerResponse({ contentType: "text/html", disposition: 'attachment; filename="installer.zip"' })
});
wrongTypeSetup.elements["blocker-pin"].value = "2468";
wrongTypeSetup.elements["blocker-pin-confirm"].value = "2468";
await wrongTypeSetup.elements["blocker-download-form"].dispatch("submit");
assert.equal(wrongTypeSetup.downloads.length, 0, "an HTML success response must not be saved as an installer ZIP");
assert.match(wrongTypeSetup.elements["blocker-download-status"].textContent, /unexpected file/i);

const wrongSignatureSetup = await createSetupHarness({
  downloadResponse: blockerResponse({ blob: new Blob(["<!doctype html>"]) })
});
wrongSignatureSetup.elements["blocker-pin"].value = "2468";
wrongSignatureSetup.elements["blocker-pin-confirm"].value = "2468";
await wrongSignatureSetup.elements["blocker-download-form"].dispatch("submit");
assert.equal(wrongSignatureSetup.downloads.length, 0, "a MIME-labelled non-ZIP file must not be saved as an installer");
assert.match(wrongSignatureSetup.elements["blocker-download-status"].textContent, /not a valid ZIP/i);

const corruptZipSetup = await createSetupHarness({
  downloadResponse: blockerResponse({
    blob: new Blob([Uint8Array.from([0x50, 0x4b, 0x03, 0x04]), new Uint8Array([9, 8, 7, 6])])
  })
});
corruptZipSetup.elements["blocker-pin"].value = "2468";
corruptZipSetup.elements["blocker-pin-confirm"].value = "2468";
await corruptZipSetup.elements["blocker-download-form"].dispatch("submit");
assert.equal(corruptZipSetup.downloads.length, 0, "a ZIP-shaped response with the wrong digest must not be saved");
assert.match(corruptZipSetup.elements["blocker-download-status"].textContent, /failed its integrity check/i);

const missingDigestSetup = await createSetupHarness({
  downloadResponse: blockerResponse({ sha256: "" })
});
missingDigestSetup.elements["blocker-pin"].value = "2468";
missingDigestSetup.elements["blocker-pin-confirm"].value = "2468";
await missingDigestSetup.elements["blocker-download-form"].dispatch("submit");
assert.equal(missingDigestSetup.downloads.length, 0, "an archive response without a valid digest must not be saved");
assert.match(missingDigestSetup.elements["blocker-download-status"].textContent, /did not provide a valid integrity check/i);

const unavailableDownloadSetup = await createSetupHarness({
  downloadResponse: blockerResponse({
    ok: false,
    status: 503,
    contentType: "application/json",
    json: { error: "The build is temporarily unavailable." }
  })
});
unavailableDownloadSetup.elements["blocker-pin"].value = "2468";
unavailableDownloadSetup.elements["blocker-pin-confirm"].value = "2468";
await unavailableDownloadSetup.elements["blocker-download-form"].dispatch("submit");
assert.equal(unavailableDownloadSetup.elements["download-blocker"].disabled, true, "an unavailable artifact must not leave the download action enabled");
assert.equal(unavailableDownloadSetup.elements["retry-blocker-check"].hidden, false, "an unavailable artifact must expose a status retry instead of requiring a page reload");

const malformedStatusSetup = await createSetupHarness({
  statusResponse: blockerResponse({ contentType: "application/json", json: {} })
});
assert.equal(malformedStatusSetup.elements["download-blocker"].disabled, true, "a malformed status response must not enable a protected download");
assert.match(malformedStatusSetup.elements["blocker-download-status"].textContent, /unexpected status/i);
assert.equal(malformedStatusSetup.elements["retry-blocker-check"].hidden, false,
  "a failed availability check must expose an in-page retry action");
assert.equal(malformedStatusSetup.elements["blocker-download-status"].getAttribute("role"), "alert",
  "availability failures should be announced assertively");

const recoveredStatusSetup = await createSetupHarness({
  statusResponses: [new TypeError("Failed to fetch"), undefined]
});
assert.equal(recoveredStatusSetup.elements["retry-blocker-check"].hidden, false,
  "an offline initial check must offer a retry without reloading");
assert.match(recoveredStatusSetup.elements["blocker-download-status"].textContent, /Check download again/i);
await recoveredStatusSetup.elements["retry-blocker-check"].dispatch("click");
await flushAsync();
assert.equal(recoveredStatusSetup.elements["download-blocker"].disabled, false,
  "a successful retry must restore the protected download action");
assert.equal(recoveredStatusSetup.elements["retry-blocker-check"].hidden, true,
  "the retry action should leave the interface after recovery");
assert.equal(recoveredStatusSetup.elements["blocker-pin"].focused, true,
  "successful recovery should move focus to the next required field");
assert.equal(recoveredStatusSetup.elements["blocker-download-status"].getAttribute("role"), "status",
  "the recovered ready message should return to polite status semantics");

const invalidPinSetup = await createSetupHarness();
invalidPinSetup.elements["blocker-pin"].value = "12";
await invalidPinSetup.elements["blocker-download-form"].dispatch("submit");
assert.equal(invalidPinSetup.elements["blocker-pin"].getAttribute("aria-invalid"), "true", "An invalid PIN must be exposed to assistive technology.");
invalidPinSetup.elements["blocker-pin"].value = "24a68";
await invalidPinSetup.elements["blocker-pin"].dispatch("input");
assert.equal(invalidPinSetup.elements["blocker-pin"].value, "24a68", "PIN inputs must not silently turn letters into a different PIN.");
assert.equal(invalidPinSetup.elements["blocker-pin"].getAttribute("aria-invalid"), "false", "Editing the PIN must clear its stale invalid state.");
invalidPinSetup.elements["blocker-pin-confirm"].value = "24a68";
await invalidPinSetup.elements["blocker-download-form"].dispatch("submit");
assert.equal(invalidPinSetup.elements["blocker-pin"].getAttribute("aria-invalid"), "true", "A PIN containing a letter must be rejected instead of rewritten.");
assert.equal(invalidPinSetup.fetchCalls.filter(({ url }) => String(url).includes("/download/")).length, 0, "An invalid letter-containing PIN must not reach the download API.");
invalidPinSetup.elements["blocker-pin"].value = "123456789";
await invalidPinSetup.elements["blocker-pin"].dispatch("input");
assert.equal(invalidPinSetup.elements["blocker-pin"].value, "123456789", "An overlong PIN must remain visible so it can be rejected rather than silently truncated.");
invalidPinSetup.elements["blocker-pin"].value = " 24 68 ";
invalidPinSetup.elements["blocker-pin-confirm"].value = "24\t68";
await invalidPinSetup.elements["blocker-download-form"].dispatch("submit");
assert.ok(invalidPinSetup.fetchCalls.some(({ url }) => String(url).includes("/download/")), "Harmless spaces in a 4–8 digit PIN must be accepted.");

console.log("Browser blocker tests passed.");
