import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("js.js", root), "utf8");
const worker = await readFile(new URL("service-worker.js", root), "utf8");
const markup = await readFile(new URL("index.html", root), "utf8");

function workerArray(name) {
  const match = worker.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);`));
  assert.ok(match, `The worker must declare ${name}.`);
  return JSON.parse(match[1]);
}

const shellAssets = workerArray("KIDDOSPROUT_ASSETS");
const runtimeAssets = workerArray("KIDDOSPROUT_RUNTIME_ASSETS");
const listedHtmlAssets = [...new Set([...shellAssets, ...runtimeAssets])]
  .filter((asset) => asset.endsWith(".html"));
const listedHtml = await Promise.all(listedHtmlAssets.map(async (asset) => ({
  asset,
  markup: await readFile(new URL(asset.replace(/^\//, ""), root), "utf8")
})));
const functionStart = source.indexOf("function setKiddoInstallStatus");
const functionEnd = source.indexOf("function showKiddoSproutUpdateNotice", functionStart);
assert.notEqual(functionStart, -1, "The PWA install handler is missing.");
assert.notEqual(functionEnd, -1, "The PWA install handler boundary is missing.");
const installFunctionSource = source.slice(functionStart, functionEnd);

function makeStatus() {
  const classes = new Set(["success"]);
  return {
    textContent: "",
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      toggle(value, force) {
        if (force) classes.add(value);
        else classes.delete(value);
      },
      contains(value) { return classes.has(value); }
    }
  };
}

function makeButton(textContent) {
  const attributes = new Map();
  return {
    disabled: false,
    textContent,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; }
  };
}

function makeHarness({ prompt = null, standalone = false, translations = {} } = {}) {
  const signupStatus = Object.assign(makeStatus(), { textContent: "Keep signup feedback" });
  const passcodeStatus = Object.assign(makeStatus(), { textContent: "Keep PIN feedback" });
  const signupInstallStatus = makeStatus();
  const parentInstallStatus = makeStatus();
  const signupButton = makeButton("Install App");
  const dashboardButton = makeButton("Install KiddoSprout App");
  const toasts = [];
  const timers = new Map();
  let nextTimer = 1;
  const window = {
    matchMedia() { return { matches: standalone }; },
    navigator: { standalone },
    setTimeout(callback) {
      const timer = nextTimer;
      nextTimer += 1;
      timers.set(timer, callback);
      return timer;
    },
    clearTimeout(timer) { timers.delete(timer); }
  };
  const create = new Function(
    "window",
    "showToast",
    "downloadSignupButton",
    "downloadKiddoSproutButton",
    "signupInstallStatus",
    "parentInstallStatus",
    "signupStatus",
    "passcodeStatus",
    "translate",
    "initialPrompt",
    `let kiddoInstallPrompt = initialPrompt;
     let kiddoAppInstalled = false;
     let kiddoInstallInFlight = false;
     let kiddoInstallPending = false;
     let kiddoInstallPendingTimer = 0;
     const KIDDO_INSTALL_PENDING_TIMEOUT_MS = 60 * 1000;
     ${installFunctionSource}
     return {
       installKiddoSproutApp,
       markKiddoSproutInstalled,
       getPrompt: () => kiddoInstallPrompt,
       isInstalled: () => kiddoAppInstalled,
       isPending: () => kiddoInstallPending
     };`
  );
  const api = create(
    window,
    (message) => toasts.push(message),
    signupButton,
    dashboardButton,
    signupInstallStatus,
    parentInstallStatus,
    signupStatus,
    passcodeStatus,
    (key, variables, fallback) => translations[key] || fallback,
    prompt
  );
  return {
    api,
    signupButton,
    dashboardButton,
    signupInstallStatus,
    parentInstallStatus,
    signupStatus,
    passcodeStatus,
    toasts,
    runTimers() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((callback) => callback());
    }
  };
}

let promptCalls = 0;
const accepted = makeHarness({
  prompt: {
    async prompt() { promptCalls += 1; },
    userChoice: Promise.resolve({ outcome: "accepted" })
  }
});
await accepted.api.installKiddoSproutApp(accepted.signupButton);
assert.equal(promptCalls, 1);
assert.equal(accepted.api.getPrompt(), null, "A used install prompt must not be reused.");
assert.equal(accepted.api.isPending(), true);
assert.equal(accepted.signupButton.disabled, true, "The accepted install became clickable before appinstalled.");
assert.equal(accepted.dashboardButton.disabled, true, "The second install control bypassed the shared pending state.");
assert.equal(accepted.signupButton.textContent, "Installing…");
assert.equal(accepted.signupInstallStatus.textContent, "KiddoSprout is installing.");
assert.equal(accepted.signupStatus.textContent, "Keep signup feedback",
  "Installing the PWA overwrote account feedback.");
await accepted.api.installKiddoSproutApp(accepted.dashboardButton);
assert.equal(promptCalls, 1, "A second install click opened another prompt while installation was pending.");
accepted.api.markKiddoSproutInstalled({ announce: true });
assert.equal(accepted.signupButton.textContent, "Installed");
assert.equal(accepted.signupInstallStatus.textContent, "KiddoSprout is installed.");
assert.equal(accepted.signupInstallStatus.classList.contains("success"), true);

const incomplete = makeHarness({
  prompt: {
    async prompt() {},
    userChoice: Promise.resolve({ outcome: "accepted" })
  }
});
await incomplete.api.installKiddoSproutApp(incomplete.signupButton);
assert.equal(incomplete.api.isPending(), true);
incomplete.runTimers();
assert.equal(incomplete.api.isPending(), false,
  "A missing appinstalled event left every install control pending forever.");
assert.equal(incomplete.signupButton.disabled, false,
  "An incomplete browser installation could not be retried without reloading.");
assert.match(incomplete.signupInstallStatus.textContent, /did not finish/i);

const rejected = makeHarness({
  prompt: {
    async prompt() { throw new Error("stale prompt"); },
    userChoice: Promise.resolve({ outcome: "dismissed" })
  }
});
await rejected.api.installKiddoSproutApp(rejected.dashboardButton);
assert.equal(rejected.dashboardButton.disabled, false, "A failed install prompt left its button disabled.");
assert.equal(rejected.dashboardButton.textContent, "Install KiddoSprout App");
assert.match(rejected.parentInstallStatus.textContent, /could not open/i);
assert.equal(rejected.passcodeStatus.textContent, "Keep PIN feedback",
  "An install failure overwrote PIN or recovery feedback.");

const installed = makeHarness({ standalone: true });
await installed.api.installKiddoSproutApp(installed.signupButton);
assert.equal(installed.api.isInstalled(), true);
assert.equal(installed.signupButton.disabled, true);
assert.equal(installed.signupButton.textContent, "Installed");
assert.match(installed.signupInstallStatus.textContent, /installed/i);

const spanish = makeHarness({
  standalone: true,
  translations: {
    "auth.installed": "Instalada",
    "pwa.install.complete": "KiddoSprout está instalada."
  }
});
await spanish.api.installKiddoSproutApp(spanish.dashboardButton);
assert.equal(spanish.signupButton.textContent, "Instalada",
  "The install flow replaced the selected Spanish language with English.");
assert.equal(spanish.parentInstallStatus.textContent, "KiddoSprout está instalada.");

assert.match(source, /const serviceWorkerUrl = new URL\("service-worker\.js", window\.location\.href\);[\s\S]*?const serviceWorkerScope = new URL\("\.\/", serviceWorkerUrl\)\.pathname;[\s\S]*?navigator\.serviceWorker\.register\(serviceWorkerUrl\.pathname,\s*\{[\s\S]*?scope:\s*serviceWorkerScope[\s\S]*?updateViaCache:\s*"none"/,
  "Hosted installs must register the worker inside the current root or project subdirectory without reusing a stale HTTP-cached script.");
assert.doesNotMatch(source, /getRegistrations\(\)[\s\S]{0,300}unregister\(\)/,
  "Loopback Docker must not unregister the worker that makes the local app installable.");
assert.match(source, /async function checkForKiddoSproutUpdate\(\)[\s\S]*?catch \(error\) \{[\s\S]*?showKiddoSproutUpdateNotice\(kiddoServiceWorkerRegistration\.waiting \? "activate" : "retry"\)/,
  "A failed update check must remain visible and retryable.");
assert.match(source, /const KIDDO_SERVICE_WORKER_UPDATE_INTERVAL_MS = 15 \* 60 \* 1000;[\s\S]*?now - kiddoServiceWorkerLastUpdateCheck < KIDDO_SERVICE_WORKER_UPDATE_INTERVAL_MS/,
  "Successful service-worker checks must be throttled when a long-running app repeatedly becomes visible.");
assert.match(source, /async function ensureKiddoSproutServiceWorker\(\)[\s\S]*?kiddoServiceWorkerRegistrationInFlight[\s\S]*?navigator\.serviceWorker\.register\(serviceWorkerUrl\.pathname,[\s\S]*?showKiddoSproutUpdateNotice\("retry"\)/,
  "A temporary registration failure must expose a bounded retry path instead of requiring a full reload.");
assert.match(source, /window\.addEventListener\("online", \(\) => \{\s*void ensureKiddoSproutServiceWorker\(\);/,
  "Reconnecting must retry both initial registration and later update checks.");
assert.match(source, /document\.addEventListener\("visibilitychange", \(\) => \{\s*if \(document\.visibilityState === "visible"\) \{\s*void ensureKiddoSproutServiceWorker\(\);/,
  "A long-running installed app must check for a newer worker when it returns to the foreground.");

const lifecycleStart = source.indexOf("function showKiddoSproutUpdateNotice");
const lifecycleEnd = source.indexOf("async function sendRecoveryCode", lifecycleStart);
assert.notEqual(lifecycleStart, -1, "The service-worker lifecycle UI is missing.");
assert.notEqual(lifecycleEnd, -1, "The service-worker lifecycle boundary is missing.");
const lifecycleSource = source.slice(lifecycleStart, lifecycleEnd);
function lifecycleElement() {
  const attributes = new Map();
  return {
    dataset: {},
    hidden: true,
    disabled: false,
    textContent: "",
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; }
  };
}

let lifecycleNow = 1_000_000;
let registrationAttempts = 0;
let updateAttempts = 0;
let rejectRegistration = true;
let rejectUpdate = false;
const registrationListeners = new Map();
const fakeRegistration = {
  waiting: null,
  installing: null,
  addEventListener(name, callback) { registrationListeners.set(name, callback); },
  async update() {
    updateAttempts += 1;
    if (rejectUpdate) throw new Error("offline");
  }
};
const lifecycleNavigator = {
  serviceWorker: {
    controller: {},
    async register(url, options) {
      registrationAttempts += 1;
      assert.equal(url, "/KiddoSprout-Family-Hub/service-worker.js");
      assert.deepEqual(options, {
        scope: "/KiddoSprout-Family-Hub/",
        updateViaCache: "none"
      });
      if (rejectRegistration) throw new Error("server stopped");
      return fakeRegistration;
    }
  }
};
const lifecycleNotice = lifecycleElement();
const lifecycleButton = lifecycleElement();
const lifecycleApi = new Function(
  "navigator",
  "window",
  "Date",
  "pwaUpdateNotice",
  "pwaUpdateTitle",
  "pwaUpdateMessage",
  "pwaUpdateNowButton",
  "translate",
  "showToast",
  `let kiddoServiceWorkerRegistration = null;
   let kiddoServiceWorkerRegistrationInFlight = false;
   let kiddoServiceWorkerUpdateCheckInFlight = false;
   let kiddoServiceWorkerUpdateCheckFailed = false;
   let kiddoServiceWorkerLastUpdateCheck = 0;
   let kiddoServiceWorkerReloadRequested = false;
   let kiddoServiceWorkerControllerChanged = false;
   let kiddoServiceWorkerReloadHandled = false;
   const observedKiddoSproutWorkers = new WeakSet();
   const KIDDO_SERVICE_WORKER_UPDATE_INTERVAL_MS = 15 * 60 * 1000;
   ${lifecycleSource}
   return {
     ensureKiddoSproutServiceWorker,
     handleKiddoSproutUpdateAction,
     registration: () => kiddoServiceWorkerRegistration,
     failed: () => kiddoServiceWorkerUpdateCheckFailed
   };`
)(
  lifecycleNavigator,
  {
    location: {
      href: "https://demo.example/KiddoSprout-Family-Hub/index.html",
      reload() {}
    },
    setTimeout() { return 1; }
  },
  { now: () => lifecycleNow },
  lifecycleNotice,
  lifecycleElement(),
  lifecycleElement(),
  lifecycleButton,
  (_key, _variables, fallback) => fallback,
  () => {}
);

await lifecycleApi.ensureKiddoSproutServiceWorker();
assert.equal(registrationAttempts, 1);
assert.equal(lifecycleApi.registration(), null);
assert.equal(lifecycleApi.failed(), true);
assert.equal(lifecycleNotice.hidden, false,
  "A stopped server left service-worker setup failed with no visible recovery action.");
assert.equal(lifecycleNotice.dataset.action, "retry");

rejectRegistration = false;
await lifecycleApi.ensureKiddoSproutServiceWorker();
assert.equal(registrationAttempts, 2, "The failed initial registration was not retried.");
assert.equal(lifecycleApi.registration(), fakeRegistration);
assert.equal(updateAttempts, 1);
assert.equal(lifecycleNotice.hidden, true,
  "The retry message stayed open after service-worker setup recovered.");
assert.ok(registrationListeners.has("updatefound"));

await lifecycleApi.ensureKiddoSproutServiceWorker();
assert.equal(updateAttempts, 1, "Foreground activity bypassed the successful-update throttle.");
lifecycleNow += 15 * 60 * 1000;
await lifecycleApi.ensureKiddoSproutServiceWorker();
assert.equal(updateAttempts, 2, "A long-running app did not check again after the throttle window.");

lifecycleNow += 15 * 60 * 1000;
rejectUpdate = true;
await lifecycleApi.ensureKiddoSproutServiceWorker();
assert.equal(updateAttempts, 3);
assert.equal(lifecycleApi.failed(), true);
assert.equal(lifecycleNotice.dataset.action, "retry");
rejectUpdate = false;
lifecycleApi.handleKiddoSproutUpdateAction();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(updateAttempts, 4, "The visible Try Again action did not bypass the failed-check throttle.");
assert.equal(lifecycleApi.failed(), false);
assert.equal(lifecycleNotice.hidden, true);

assert.match(source, /navigator\.serviceWorker\.addEventListener\("controllerchange"/,
  "The page must tell an open app when a new service worker takes control.");
assert.match(source, /function markKiddoSproutInstalled\([\s\S]*?kiddoAppInstalled = true;[\s\S]*?updateKiddoInstallButtons\(\);/,
  "The shared installed-state helper must disable and rename every install control.");
assert.match(source, /window\.addEventListener\("appinstalled"[\s\S]{0,180}?markKiddoSproutInstalled\(\{ announce: true \}\);/,
  "Install controls must reflect a completed installation event.");
assert.match(source, /applyDemoAvailability\(\);\s*if \(kiddoAppInstalled\) markKiddoSproutInstalled\(\);/,
  "Standalone install controls must remain installed after initial translation and later language changes.");
assert.match(markup, /id="pwaUpdateNotice"[\s\S]*?id="pwaUpdateMessage"[\s\S]*?aria-live="polite"[\s\S]*?id="pwaUpdateNow"/,
  "A waiting update needs a persistent, accessible action rather than a temporary toast.");
assert.match(source, /waitingWorker\.postMessage\(\{ type: "SKIP_WAITING" \}\)/,
  "The update action must explicitly release the waiting worker.");
assert.match(source, /kiddoServiceWorkerReloadRequested[\s\S]*?window\.location\.reload\(\)/,
  "A user-approved update must reload once the new worker controls the page.");
assert.match(worker, /const KIDDOSPROUT_CACHE_VERSION = "shell-v117";/,
  "The Sprout Tutor AI runtime changes must ship in a fresh offline cache.");
assert.match(worker, /const KIDDOSPROUT_RUNTIME_CACHE_VERSION = "runtime-v1";/,
  "Viewed runtime content must survive shell cache upgrades.");
assert.match(worker, /const KIDDOSPROUT_CACHE_PREFIX = `kiddosprout-app-\$\{encodeURIComponent\(KIDDOSPROUT_SCOPE_PATH\)\}-`;/,
  "Cache names must be isolated by service-worker scope on shared GitHub Pages origins.");
assert.doesNotMatch(worker, /const KIDDOSPROUT_RUNTIME_ASSETS = \[[\s\S]*?\n\s*"\/",/,
  "The app root must use the newly installed index shell instead of a persistent runtime copy.");
assert.match(worker, /async function removeRuntimeShellShadows\(\)[\s\S]*?requestUrl\.pathname === KIDDOSPROUT_SCOPE_PATH[\s\S]*?KIDDOSPROUT_SHELL_PATHS\.has\(requestUrl\.pathname\)[\s\S]*?cache\.delete\(request\)/,
  "Activation must remove root and core-shell entries left by older runtime-cache versions.");
assert.match(worker, /self\.addEventListener\("activate"[\s\S]*?await removeRuntimeShellShadows\(\);[\s\S]*?const keys = await caches\.keys\(\)/,
  "Activation must validate its runtime-cache migration before deleting the previous shell.");
assert.match(worker, /\.map\(async \(key\) => \{[\s\S]*?await caches\.delete\(key\);[\s\S]*?catch \(error\)/,
  "Failure to remove an unreferenced old cache must not strand a valid worker update.");
assert.match(worker, /!KIDDOSPROUT_SHELL_PATHS\.has\(url\.pathname\)[\s\S]*?await canStoreResponse\(event\.request, url, response/,
  "A network refresh must not place versioned shell files back into the persistent runtime cache.");
const shellVersionMapMatch = worker.match(/const KIDDOSPROUT_SHELL_QUERY_VERSIONS = new Map\((\[[\s\S]*?\])\);/);
assert.ok(shellVersionMapMatch, "The worker must declare the exact shell query versions it may serve offline.");
const shellVersionMap = new Map(JSON.parse(shellVersionMapMatch[1]));
const shellAssetPaths = new Set(shellAssets.map((asset) => new URL(asset, "https://kiddosprout.test").pathname));
const referencedShellVersions = new Map();
for (const { asset: htmlAsset, markup: htmlMarkup } of listedHtml) {
  const htmlUrl = new URL(htmlAsset, "https://kiddosprout.test");
  for (const match of htmlMarkup.matchAll(/(?:src|href)\s*=\s*(["'])([^"']+\.(?:css|js)(?:\?[^"']*)?)\1/g)) {
    const referenceUrl = new URL(match[2], htmlUrl);
    if (referenceUrl.origin !== htmlUrl.origin
        || !referenceUrl.searchParams.has("v")
        || !shellAssetPaths.has(referenceUrl.pathname)) continue;
    const queryEntries = [...referenceUrl.searchParams.entries()];
    assert.deepEqual(queryEntries, [["v", referenceUrl.searchParams.get("v")]],
      `${htmlAsset} must use only one v query for offline shell asset ${referenceUrl.pathname}.`);
    const version = referenceUrl.searchParams.get("v");
    assert.match(version, /^[A-Za-z0-9._-]{1,32}$/,
      `${htmlAsset} uses an unsafe offline shell version for ${referenceUrl.pathname}.`);
    const versions = referencedShellVersions.get(referenceUrl.pathname) || new Set();
    versions.add(version);
    referencedShellVersions.set(referenceUrl.pathname, versions);
  }
}
for (const [pathname, versions] of referencedShellVersions) {
  assert.equal(versions.size, 1,
    `${pathname} uses conflicting query versions across service-worker-listed HTML pages.`);
  const [version] = versions;
  assert.equal(shellVersionMap.get(pathname), version,
    `The worker's reviewed offline version for ${pathname} does not match its HTML reference.`);
}
for (const pathname of shellVersionMap.keys()) {
  assert.ok(shellAssetPaths.has(pathname),
    `The offline version map contains non-shell asset ${pathname}.`);
  assert.ok(referencedShellVersions.has(pathname),
    `The offline version map contains unreferenced shell asset ${pathname}.`);
}
assert.match(worker, /function canUseCanonicalShellFallback\(url\)[\s\S]*?KIDDOSPROUT_SHELL_QUERY_VERSIONS\.get\(url\.pathname\) === entries\[0\]\[1\]/,
  "A new query-versioned page asset must not fall back to an older query-free shell response.");
const shellFallbackFunction = worker.match(/function canUseCanonicalShellFallback\(url\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(shellFallbackFunction, "The worker's exact-version offline fallback helper is missing.");
const canUseCanonicalShellFallback = new Function("self", `
  const KIDDOSPROUT_SHELL_PATHS = new Set(${JSON.stringify([...shellAssetPaths])});
  const KIDDOSPROUT_SHELL_QUERY_VERSIONS = new Map(${JSON.stringify([...shellVersionMap])});
  ${shellFallbackFunction}
  return canUseCanonicalShellFallback;
`)({ location: { origin: "https://kiddosprout.test" } });
for (const [pathname, versions] of referencedShellVersions) {
  const [version] = versions;
  assert.equal(canUseCanonicalShellFallback(
    new URL(`${pathname}?v=${encodeURIComponent(version)}`, "https://kiddosprout.test")
  ), true, `The current ${pathname}?v=${version} shell could not use its offline precache.`);
  assert.equal(canUseCanonicalShellFallback(
    new URL(`${pathname}?v=${encodeURIComponent(`${version}-future`)}`, "https://kiddosprout.test")
  ), false, `A different ${pathname} release could use this worker's older offline precache.`);
}
const installHandlerSource = worker.slice(
  worker.indexOf('self.addEventListener("install"'),
  worker.indexOf('self.addEventListener("message"')
);
assert.doesNotMatch(installHandlerSource, /skipWaiting/,
  "A newly installed update must wait for the page's user-controlled reload action.");
assert.match(worker, /self\.addEventListener\("message"[\s\S]*?event\.data\?\.type !== "SKIP_WAITING"[\s\S]*?self\.skipWaiting\(\)/,
  "The waiting worker must only activate after the page requests it.");
assert.doesNotMatch(worker, /storeRuntimeResponse[\s\S]{0,500}?cache\.delete\(canonicalRequest\)[\s\S]{0,200}?cache\.put/,
  "Refreshing a runtime asset must not delete its working offline copy before the replacement is safely stored.");
assert.match(worker, /"\/offline\.html"/,
  "The clear offline explanation must be available on the first install.");
assert.match(worker, /KIDDOSPROUT_ASSETS[\s\S]*?"\/family-tech-hub-v[0-9a-f]{12}\.avif"/,
  "The installed home must keep its compact primary hero image on the first offline launch.");
assert.match(worker, /KIDDOSPROUT_ASSETS[\s\S]*?"\/family-tech-hub-v[0-9a-f]{12}\.avif"[\s\S]*?"\/family-tech-hub-v[0-9a-f]{12}\.webp"[\s\S]*?"\/family-tech-hub-v[0-9a-f]{12}\.jpg"/,
  "The first offline launch needs AVIF, WebP, and JPEG hero variants for every supported decoder.");
assert.match(worker, /const freshEntries = await Promise\.all\([\s\S]*?!await canStoreResponse\(request, new URL\(request\.url\), response\)[\s\S]*?let cache = await caches\.open\(KIDDOSPROUT_CACHE\)/,
  "The worker must validate every installed shell response before changing its final cache.");
assert.match(worker, /const fallbackPath = url\.pathname === KIDDOSPROUT_SCOPE_PATH[\s\S]*?scopedAssetPath\("\/index\.html"\)[\s\S]*?scopedAssetPath\("\/offline\.html"\);/,
  "An uncached multi-page route must not masquerade as the dashboard while offline.");
assert.match(worker, /KIDDOSPROUT_RUNTIME_ASSETS[\s\S]*?"\/recipe\.html"/,
  "FlavorNest must remain eligible for the refreshed runtime cache.");
for (const homeschoolAsset of [
  "/learning-path.html",
  "/learning-path.css",
  "/learning-curriculum.js",
  "/learning-path.js"
]) {
  assert.ok(runtimeAssets.includes(homeschoolAsset),
    `The Homeschool Hub runtime cache is missing ${homeschoolAsset}.`);
}
assert.match(worker, /const KIDDOSPROUT_RECIPE_CATALOG = \/\^\\\/recipe-catalog-v\[0-9a-f\]\{12\}\\\.js\$\/i/,
  "A waiting update's active worker must recognise the next content-addressed recipe catalogue.");
assert.match(worker, /async function responseMatchesContentHash\([\s\S]*?subtle\.digest\("SHA-256"[\s\S]*?actual === expected/,
  "Content-addressed scripts and artwork must be verified before entering Cache Storage.");
assert.doesNotMatch(worker, /KIDDOSPROUT_STORY_IMAGE[^\n]*\bsvg\b/i,
  "The service worker must not treat active SVG documents as cacheable story artwork.");
assert.match(worker, /invalidSuccessfulAsset \|\| \(knownAsset && transientFailure\) \|\| transientNavigationFailure[\s\S]*?cachedAssetOrShell/,
  "Known assets and pages must prefer a valid cached copy over a temporary edge error response.");
assert.match(worker, /knownAsset && \[403, 404, 410\]\.includes\(response\.status\)[\s\S]*?deleteRuntimeAsset/,
  "Authoritative removals must evict stale runtime responses rather than serving them indefinitely.");
const deleteRuntimeAssetSource = worker.match(/async function deleteRuntimeAsset\(url\) \{[\s\S]*?(?=\n\nasync function fetchValidatedShell)/)?.[0];
assert.ok(deleteRuntimeAssetSource, "The runtime-cache revocation helper should exist.");
const cachedRequests = [
  { url: "https://kiddosprout.test/story-theater.html" },
  { url: "https://kiddosprout.test/story-theater.html?v=old" },
  { url: "https://kiddosprout.test/story-theater.html?v=current" },
  { url: "https://kiddosprout.test/recipe.html?v=current" },
  { url: "https://other.test/story-theater.html?v=current" }
];
const deletedRequests = [];
const deleteRuntimeAsset = new Function("caches", "self", `
  const KIDDOSPROUT_RUNTIME_CACHE = "kiddosprout-app-runtime-v1";
  ${deleteRuntimeAssetSource}
  return deleteRuntimeAsset;
`)(
  {
    open: async () => ({
      keys: async () => cachedRequests,
      delete: async (request) => { deletedRequests.push(request.url); return true; }
    })
  },
  { location: { origin: "https://kiddosprout.test" } }
);
await deleteRuntimeAsset(new URL("https://kiddosprout.test/story-theater.html?v=current"));
assert.deepEqual(deletedRequests, ["https://kiddosprout.test/story-theater.html?v=current"],
  "a version-specific removal must not erase a newer or canonical offline copy");
deletedRequests.length = 0;
await deleteRuntimeAsset(new URL("https://kiddosprout.test/story-theater.html"));
assert.deepEqual(deletedRequests, cachedRequests.slice(0, 3).map((request) => request.url),
  "a query-free authoritative removal must evict every cached version of that path");
assert.match(worker, /response\.status === 408 \|\| response\.status === 429 \|\| response\.status >= 500/,
  "Temporary timeout, rate-limit, and server errors must be eligible for an offline fallback.");
assert.match(worker, /catch \(error\) \{[\s\S]{0,180}cachedAssetOrShell\(event\.request, url, \{ includeShell: true \}\)/,
  "Thrown network failures must share the bounded asset-or-shell fallback path.");
assert.match(worker, /const replaceable = \[\];[\s\S]*?const appCode = \[\];[\s\S]*?\[\.\.\.replaceable, \.\.\.appCode\]/,
  "Runtime eviction must preserve visited app code ahead of replaceable story artwork.");

console.log("PWA install checks passed: prompt recovery, installed state, and service-worker update handling are safe.");
