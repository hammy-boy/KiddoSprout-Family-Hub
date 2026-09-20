const KIDDOSPROUT_SCOPE_URL = new URL(
  self.registration?.scope || `${self.location.origin}/`
);
const KIDDOSPROUT_SCOPE_PATH = KIDDOSPROUT_SCOPE_URL.pathname.endsWith("/")
  ? KIDDOSPROUT_SCOPE_URL.pathname
  : `${KIDDOSPROUT_SCOPE_URL.pathname}/`;
const KIDDOSPROUT_CACHE_PREFIX = `kiddosprout-app-${encodeURIComponent(KIDDOSPROUT_SCOPE_PATH)}-`;
// Change this version whenever a public runtime page or shared stylesheet changes.
const KIDDOSPROUT_CACHE_VERSION = "shell-v114";
const KIDDOSPROUT_CACHE = `${KIDDOSPROUT_CACHE_PREFIX}${KIDDOSPROUT_CACHE_VERSION}`;
// Runtime content deliberately survives shell upgrades. Keeping it separate
// avoids downloading a second copy of every viewed story before an update can
// activate, and preserves explicitly visited pages across releases.
const KIDDOSPROUT_RUNTIME_CACHE_VERSION = "runtime-v1";
const KIDDOSPROUT_RUNTIME_CACHE = `${KIDDOSPROUT_CACHE_PREFIX}${KIDDOSPROUT_RUNTIME_CACHE_VERSION}`;
// Runtime pages and story art are deliberately bounded so months of story
// updates cannot consume an ever-growing amount of device storage.
const KIDDOSPROUT_RUNTIME_LIMIT = 128;

function scopedAssetPath(asset) {
  return new URL(String(asset).replace(/^\/+/, ""), KIDDOSPROUT_SCOPE_URL).pathname;
}

function logicalAssetPath(pathname) {
  if (pathname === KIDDOSPROUT_SCOPE_PATH) return "/";
  if (!pathname.startsWith(KIDDOSPROUT_SCOPE_PATH)) return "";
  return `/${pathname.slice(KIDDOSPROUT_SCOPE_PATH.length)}`;
}
// Keep first installation small. The three compact hero variants are included
// so the first offline launch works regardless of AVIF/WebP decoding support;
// larger pages and story artwork are cached after the family opens them.
const KIDDOSPROUT_ASSETS = [
  "/index.html",
  "/offline.html",
  "/style.css",
  "/js.js",
  "/human-check.js",
  "/language-settings.js",
  "/demo-mode.js",
  "/auth-session.js",
  "/family-state-cloud.js",
  "/passcode-security.js",
  "/local-docker-redirect.js",
  "/manifest.webmanifest",
  "/kiddosprout_logo_128.png",
  "/family-tech-hub-v01232923b55c.avif",
  "/family-tech-hub-v0fb9d85f0464.webp",
  "/family-tech-hub-v5fffdb82973c.jpg"
];

const KIDDOSPROUT_RUNTIME_ASSETS = [
  "/language-packs.js",
  "/family-call.html",
  "/family-calls.js",
  "/family-call-app.js",
  "/blocker-setup.html",
  "/blocker-setup.css",
  "/blocker-setup.js",
  "/kid-hubs.css",
  "/kid-hub-gate.js",
  "/creator-studio.html",
  "/nature-explorer.html",
  "/move-breaks.html",
  "/story-theater.html",
  "/story-library-data.js",
  "/story-ethan-leo-data.js",
  "/story-voices.html",
  "/story-voices.css",
  "/story-voices.js",
  "/story-voice-choice.js",
  "/story-storage.js",
  "/recipe.html",
  "/recipe-cloud.js",
  "/app_7.html",
  "/report_problem.html",
  "/games/index.html",
  "/games/arcade-access.js",
  "/games/arcade-shell.css",
  "/games/language-garden/index.html",
  "/games/language-garden/style.css",
  "/games/language-garden/catalogue.js",
  "/games/language-garden/courses.js",
  "/games/language-garden/game.js",
  "/games/pattern-painter/index.html",
  "/games/pattern-painter/style.css",
  "/games/pattern-painter/engine.js",
  "/games/pattern-painter/game.js",
  "/games/melody-meadow/index.html",
  "/games/melody-meadow/style.css",
  "/games/melody-meadow/music.js",
  "/games/melody-meadow/game.js",
  "/games/compass-quest/index.html",
  "/games/compass-quest/style.css",
  "/games/compass-quest/engine.js",
  "/games/compass-quest/game.js",
  "/games/science-sorter/index.html",
  "/games/science-sorter/style.css",
  "/games/science-sorter/labs.js",
  "/games/science-sorter/game.js",
  "/games/robot-routes/index.html",
  "/games/robot-routes/style.css",
  "/games/robot-routes/engine.js",
  "/games/robot-routes/game.js",
  "/games/word-builder/index.html",
  "/games/word-builder/style.css",
  "/games/word-builder/engine.js",
  "/games/word-builder/game.js",
  "/games/learning-world/index.html",
  "/games/learning-world/style.css",
  "/games/learning-world/subjects.js",
  "/games/learning-world/game.js",
  "/games/brick-breaker/index.html",
  "/games/brick-breaker/style.css",
  "/games/brick-breaker/engine.js",
  "/games/brick-breaker/game.js",
  "/games/memory-game/index.html",
  "/games/memory-game/style.css",
  "/games/memory-game/engine.js",
  "/games/memory-game/game.js",
  "/games/meteor-game/index.html",
  "/games/meteor-game/style.css",
  "/games/meteor-game/engine.js",
  "/games/meteor-game/game.js",
  "/games/multiplication-runner/index.html",
  "/games/multiplication-runner/style.css",
  "/games/multiplication-runner/engine.js",
  "/games/multiplication-runner/runner.js",
  "/games/multiplication-runner/game.js",
  "/games/multiplication-runner/map.svg",
  "/games/platformer-game/index.html",
  "/games/platformer-game/style.css",
  "/games/platformer-game/engine.js",
  "/games/platformer-game/game.js",
  "/games/racing-game/index.html",
  "/games/racing-game/style.css",
  "/games/racing-game/game.js",
  "/games/snake-game/index.html",
  "/games/snake-game/style.css",
  "/games/snake-game/engine.js",
  "/games/snake-game/game.js",
  "/kiddosprout_logo.png",
  "/kiddosprout_blocked_1280x800.png"
];

const KIDDOSPROUT_SCOPED_ASSETS = KIDDOSPROUT_ASSETS.map(scopedAssetPath);
const KIDDOSPROUT_SCOPED_RUNTIME_ASSETS = KIDDOSPROUT_RUNTIME_ASSETS.map(scopedAssetPath);

const KIDDOSPROUT_SHELL_PATHS = new Set(KIDDOSPROUT_SCOPED_ASSETS);
const KIDDOSPROUT_ASSET_PATHS = new Set([
  ...KIDDOSPROUT_SCOPED_ASSETS,
  ...KIDDOSPROUT_SCOPED_RUNTIME_ASSETS
]);
// A page from a newer release can briefly remain under an older active worker
// until the family approves the update. Only let a query-versioned shell
// request fall back to this worker's query-free precache when its version is
// the one reviewed with this worker. Otherwise a new page could silently run
// old JavaScript or CSS just because the paths happen to match.
const KIDDOSPROUT_SHELL_QUERY_VERSIONS = new Map([
  ["/style.css", "32"],
  ["/js.js", "41"],
  ["/human-check.js", "4"],
  ["/language-settings.js", "9"],
  ["/demo-mode.js", "2"],
  ["/auth-session.js", "7"],
  ["/family-state-cloud.js", "2"],
  ["/passcode-security.js", "1"],
  ["/local-docker-redirect.js", "1"]
]);
for (const [logicalPath, version] of [...KIDDOSPROUT_SHELL_QUERY_VERSIONS]) {
  const scopedPath = scopedAssetPath(logicalPath);
  if (scopedPath === logicalPath) continue;
  KIDDOSPROUT_SHELL_QUERY_VERSIONS.delete(logicalPath);
  KIDDOSPROUT_SHELL_QUERY_VERSIONS.set(scopedPath, version);
}
// Only passive raster artwork is eligible for runtime storage. SVG can carry
// scripts and external references, so story uploads must never make it into an
// offline-capable executable document through this broad image route.
const KIDDOSPROUT_STORY_IMAGE = /^\/assets\/story-[a-z0-9-]+\.(?:avif|gif|jpe?g|png|webp)$/i;
// Catalogue releases are content-addressed. Recognising the filename shape,
// rather than only today's exact filename, lets the current active worker cache
// tomorrow's catalogue while a newer worker is still waiting for approval.
const KIDDOSPROUT_RECIPE_CATALOG = /^\/recipe-catalog-v[0-9a-f]{12}\.js$/i;
const KIDDOSPROUT_CONTENT_HASH = /-v([0-9a-f]{12})(?=\.[a-z0-9]+$)/i;
const KIDDOSPROUT_OFFLINE_CONFIG = `window.KIDDO_SPROUT_SUPABASE = Object.freeze({
  publicDemoOnly: true,
  offline: true
});
`;

function offlineConfigurationResponse() {
  return new Response(KIDDOSPROUT_OFFLINE_CONFIG, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/javascript; charset=utf-8"
    }
  });
}

function responseContentType(response) {
  return String(response?.headers?.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

function isJavaScriptResponse(response) {
  return [
    "application/javascript",
    "application/x-javascript",
    "text/javascript"
  ].includes(responseContentType(response));
}

function responseMatchesExactRequest(response, requestUrl) {
  if (response.redirected) return false;
  if (!response.url) return true;
  try {
    const responseUrl = new URL(response.url);
    return responseUrl.origin === self.location.origin
      && responseUrl.pathname === requestUrl.pathname
      && responseUrl.search === requestUrl.search;
  } catch (error) {
    return false;
  }
}

async function fetchConfiguration(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    const requestUrl = new URL(request.url);
    return response.ok
      && response.type === "basic"
      && responseMatchesExactRequest(response, requestUrl)
      && isJavaScriptResponse(response)
      ? response
      : offlineConfigurationResponse();
  } catch (error) {
    return offlineConfigurationResponse();
  }
}

function canonicalAssetRequest(url) {
  const logicalPath = logicalAssetPath(url.pathname);
  if (!KIDDOSPROUT_ASSET_PATHS.has(url.pathname)
      && !KIDDOSPROUT_STORY_IMAGE.test(logicalPath)
      && !KIDDOSPROUT_RECIPE_CATALOG.test(logicalPath)) {
    return null;
  }
  return new Request(new URL(url.pathname, self.location.origin).href, {
    method: "GET",
    credentials: "same-origin"
  });
}

function cacheRequestForAsset(url) {
  const canonicalRequest = canonicalAssetRequest(url);
  if (!canonicalRequest) return null;
  // A response for ?v=old must never replace the current query-free shell.
  // Keep the small, validated version token in the runtime cache key instead.
  if (url.search) {
    return new Request(url.href, {
      method: "GET",
      credentials: "same-origin"
    });
  }
  return canonicalRequest;
}

function assetContentTypeMatches(url, response) {
  const contentType = responseContentType(response);
  if (url.pathname === KIDDOSPROUT_SCOPE_PATH || url.pathname.endsWith(".html")) return contentType === "text/html";
  if (url.pathname.endsWith(".css")) return contentType === "text/css";
  if (url.pathname.endsWith(".js")) return isJavaScriptResponse(response);
  if (url.pathname.endsWith(".webmanifest")) {
    return contentType === "application/manifest+json" || contentType === "application/json";
  }
  if (url.pathname.endsWith(".avif")) return contentType === "image/avif";
  if (url.pathname.endsWith(".gif")) return contentType === "image/gif";
  if (/\.jpe?g$/i.test(url.pathname)) return contentType === "image/jpeg";
  if (url.pathname.endsWith(".png")) return contentType === "image/png";
  if (url.pathname.endsWith(".svg")) return contentType === "image/svg+xml";
  if (url.pathname.endsWith(".webp")) return contentType === "image/webp";
  return false;
}

function isCacheableAssetQuery(url) {
  if (!url.search) return true;
  const entries = [...url.searchParams.entries()];
  return entries.length === 1
    && entries[0][0] === "v"
    && /^[A-Za-z0-9._-]{1,32}$/.test(entries[0][1]);
}

async function responseMatchesContentHash(url, response) {
  const expected = url.pathname.match(KIDDOSPROUT_CONTENT_HASH)?.[1]?.toLowerCase();
  if (!expected) return true;
  if (!self.crypto?.subtle) return false;
  try {
    const bytes = await response.clone().arrayBuffer();
    const digest = new Uint8Array(await self.crypto.subtle.digest("SHA-256", bytes));
    const actual = [...digest]
      .slice(0, 6)
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    return actual === expected;
  } catch (error) {
    return false;
  }
}

async function canStoreResponse(request, url, response, { contentHashVerified = false } = {}) {
  const cacheControl = String(response.headers.get("cache-control") || "").toLowerCase();
  const structurallySafe = isCacheableAssetQuery(url)
    && request.headers.get("range") === null
    && response.status === 200
    && response.type === "basic"
    && !cacheControl.split(",").some((directive) => {
      const name = directive.trim().split("=", 1)[0];
      return name === "no-store" || name === "private";
    })
    && canonicalAssetRequest(url) !== null
    && responseMatchesExactRequest(response, url)
    && assetContentTypeMatches(url, response);
  return structurallySafe
    && (contentHashVerified || await responseMatchesContentHash(url, response));
}

async function currentCacheMatch(request) {
  const runtimeCache = await caches.open(KIDDOSPROUT_RUNTIME_CACHE);
  const runtimeResponse = await runtimeCache.match(request);
  if (runtimeResponse) return runtimeResponse;
  const shellCache = await caches.open(KIDDOSPROUT_CACHE);
  return shellCache.match(request);
}

function canUseCanonicalShellFallback(url) {
  if (!url.search || !KIDDOSPROUT_SHELL_PATHS.has(url.pathname)) return false;
  const entries = [...url.searchParams.entries()];
  return entries.length === 1
    && entries[0][0] === "v"
    && KIDDOSPROUT_SHELL_QUERY_VERSIONS.get(url.pathname) === entries[0][1];
}

async function cachedAssetOrShell(request, url, { includeShell = false } = {}) {
  const cacheRequest = cacheRequestForAsset(url);
  let cachedAsset = cacheRequest ? await currentCacheMatch(cacheRequest) : null;
  if (!cachedAsset && canUseCanonicalShellFallback(url)) {
    const canonicalRequest = canonicalAssetRequest(url);
    cachedAsset = canonicalRequest ? await currentCacheMatch(canonicalRequest) : null;
  }
  if (cachedAsset) return cachedAsset;
  if (!includeShell || request.mode !== "navigate") return null;
  const fallbackPath = url.pathname === KIDDOSPROUT_SCOPE_PATH
      || url.pathname === scopedAssetPath("/index.html")
    ? scopedAssetPath("/index.html")
    : scopedAssetPath("/offline.html");
  const fallbackRequest = new Request(new URL(fallbackPath, self.location.origin).href, {
    method: "GET",
    credentials: "same-origin"
  });
  return currentCacheMatch(fallbackRequest);
}

async function responseCanRepresentAsset(response, url) {
  return response.status === 200
    && response.type === "basic"
    // A response for ?v=old is not the requested ?v=current release even when
    // both URLs share a pathname. Redirects and query-normalising edge errors
    // must fall back to the exact verified copy instead of mixing generations.
    && responseMatchesExactRequest(response, url)
    && assetContentTypeMatches(url, response)
    && await responseMatchesContentHash(url, response);
}

function isTransientNetworkResponse(response) {
  return response.status === 408 || response.status === 429 || response.status >= 500;
}

function runtimeEvictionOrder(requests, excludedUrl = "") {
  // Keep app code needed by an already-visited hub ahead of replaceable story
  // artwork. Otherwise reading enough illustrated pages could evict the recipe
  // catalogue and break FlavorNest's next offline visit.
  const replaceable = [];
  const appCode = [];
  for (const request of requests) {
    if (request.url === excludedUrl) continue;
    let pathname = "";
    try {
      pathname = new URL(request.url).pathname;
    } catch (error) {
      // Invalid entries are never useful to this worker and are evicted first.
    }
    if (KIDDOSPROUT_ASSET_PATHS.has(pathname)
        || KIDDOSPROUT_RECIPE_CATALOG.test(logicalAssetPath(pathname))) {
      appCode.push(request);
    } else {
      replaceable.push(request);
    }
  }
  return [...replaceable, ...appCode];
}

async function trimRuntimeCache(cache) {
  const requests = await cache.keys();
  const overflow = requests.length - KIDDOSPROUT_RUNTIME_LIMIT;
  if (overflow <= 0) return;
  await Promise.all(runtimeEvictionOrder(requests)
    .slice(0, overflow)
    .map((request) => cache.delete(request)));
}

function isQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.code === 22;
}

async function retryRuntimeWriteAfterQuota(cache, cacheRequest, response) {
  const candidates = runtimeEvictionOrder(await cache.keys(), cacheRequest.url);
  for (const candidate of candidates) {
    const previousResponse = await cache.match(candidate);
    if (!previousResponse || !await cache.delete(candidate)) continue;
    try {
      await cache.put(cacheRequest, response.clone());
      return true;
    } catch (error) {
      // The original cache fit before this attempt, so restore the one entry we
      // evicted if the retry still cannot fit. Never trade working offline
      // content for a response that was not stored.
      try {
        await cache.put(candidate, previousResponse);
      } catch (restoreError) {
        // Best effort only: the network response still succeeds, and the
        // browser may be denying Cache Storage entirely rather than being full.
      }
      throw error;
    }
  }
  return false;
}

async function storeRuntimeResponse(cacheRequest, response) {
  const cache = await caches.open(KIDDOSPROUT_RUNTIME_CACHE);
  // Cache.put() replaces a matching entry atomically. Do not delete the old
  // response first: if a quota or storage error rejects this write, the last
  // working offline copy must remain available.
  try {
    await cache.put(cacheRequest, response.clone());
  } catch (error) {
    if (!isQuotaError(error)
        || !await retryRuntimeWriteAfterQuota(cache, cacheRequest, response)) {
      throw error;
    }
  }
  await trimRuntimeCache(cache);
}

async function removeRuntimeShellShadows() {
  const cache = await caches.open(KIDDOSPROUT_RUNTIME_CACHE);
  const matchingRequests = (await cache.keys()).filter((request) => {
    try {
      const requestUrl = new URL(request.url);
      return requestUrl.origin === self.location.origin
        && (requestUrl.pathname === KIDDOSPROUT_SCOPE_PATH
          || KIDDOSPROUT_SHELL_PATHS.has(requestUrl.pathname));
    } catch (error) {
      return false;
    }
  });
  await Promise.all(matchingRequests.map((request) => cache.delete(request)));
}

async function deleteRuntimeAsset(url) {
  const cache = await caches.open(KIDDOSPROUT_RUNTIME_CACHE);
  const targetPath = url.pathname;
  const targetSearch = url.search;
  const matchingRequests = (await cache.keys()).filter((request) => {
    try {
      const requestUrl = new URL(request.url);
      return requestUrl.origin === self.location.origin
        && requestUrl.pathname === targetPath
        // A 404 for ?v=old revokes only that exact release. Deleting every
        // query variant here could erase a newer working offline copy. A
        // query-free 404 still authoritatively removes the whole asset path.
        && (!targetSearch || requestUrl.search === targetSearch);
    } catch (error) {
      return false;
    }
  });
  await Promise.all(matchingRequests.map((request) => cache.delete(request)));
}

async function fetchValidatedShell() {
  const freshAssets = KIDDOSPROUT_SCOPED_ASSETS.map((asset) => new Request(
    new URL(asset, self.location.origin).href,
    { cache: "reload", credentials: "same-origin" }
  ));
  // Validate every response before writing any of them. If an edge fallback
  // serves HTML for a script, a failed update cannot poison an active worker's
  // same-named cache before the install is rejected.
  const freshEntries = await Promise.all(freshAssets.map(async (request) => {
    const response = await fetch(request);
    if (!await canStoreResponse(request, new URL(request.url), response)) {
      throw new Error(`KiddoSprout app shell rejected ${new URL(request.url).pathname}.`);
    }
    return { request, response };
  }));
  const existingCacheNames = await caches.keys();
  let cache = await caches.open(KIDDOSPROUT_CACHE);
  let previousEntries = [];
  if (existingCacheNames.includes(KIDDOSPROUT_CACHE)) {
    previousEntries = await Promise.all(freshAssets.map(async (request) => ({
      request,
      response: await cache.match(request)
    })));
    // A failed earlier install may have left an unreachable partial cache. It
    // is safe to replace that cache, but a complete same-version cache may be
    // serving the active worker and must be rolled back if any write fails.
    if (previousEntries.some(({ response }) => !response)) {
      await caches.delete(KIDDOSPROUT_CACHE);
      cache = await caches.open(KIDDOSPROUT_CACHE);
      previousEntries = [];
    }
  }

  const writtenRequests = [];
  try {
    for (const { request, response } of freshEntries) {
      await cache.put(request, response);
      writtenRequests.push(request);
    }
  } catch (error) {
    if (previousEntries.length) {
      // Restore in reverse write order. Replacing a newer response with its
      // previous (typically smaller) copy also releases any quota consumed by
      // the interrupted update before the next restoration is attempted.
      for (let index = writtenRequests.length - 1; index >= 0; index -= 1) {
        try {
          await cache.put(writtenRequests[index], previousEntries[index].response);
        } catch (restoreError) {
          // Keep trying the remaining entries; the install still rejects below
          // and therefore cannot activate a knowingly incomplete generation.
        }
      }
    } else {
      // Do not leave an unreachable partial first-install cache consuming the
      // quota needed by the browser's next installation attempt.
      try {
        await caches.delete(KIDDOSPROUT_CACHE);
      } catch (cleanupError) {
        // The original install failure remains authoritative.
      }
    }
    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(fetchValidatedShell());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SKIP_WAITING") return;
  // Updates remain waiting until a visible page offers the family an explicit
  // update-and-reload action, avoiding mixed old-page/new-worker generations.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Do the safety-critical migration before deleting the previous shell.
      // If Cache Storage rejects this cleanup, activation stops while the old
      // worker still has its complete versioned shell to recover with.
      await removeRuntimeShellShadows();
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(KIDDOSPROUT_CACHE_PREFIX)
            && key !== KIDDOSPROUT_CACHE
            && key !== KIDDOSPROUT_RUNTIME_CACHE)
          .map(async (key) => {
            try {
              await caches.delete(key);
            } catch (error) {
              // An obsolete cache is not read by this worker. A cleanup error
              // must not strand a fully installed update in activating state.
            }
          })
      );
      if (self.registration?.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (error) {
          // Preload is an optional speed-up. Activation and offline support
          // must still finish in browsers that expose but reject this API.
        }
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(scopedAssetPath("/api/"))) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  if (url.pathname === scopedAssetPath("/supabase-config.js")) {
    event.respondWith(fetchConfiguration(event.request));
    return;
  }

  let runtimeCacheWork = null;
  const responsePromise = (async () => {
    try {
      let preloaded = null;
      if (event.request.mode === "navigate") {
        try {
          preloaded = await event.preloadResponse;
        } catch (error) {
          // A failed preload is not proof that the network is offline. The
          // ordinary request still gets its own chance below.
        }
      }
      const response = preloaded || await fetch(event.request);
      const canonicalRequest = canonicalAssetRequest(url);
      const knownAsset = canonicalRequest !== null;
      const validSuccessfulAsset = knownAsset
        && response.ok
        && await responseCanRepresentAsset(response, url);
      const validPartialAsset = knownAsset
        && event.request.headers.get("range") !== null
        && response.status === 206;
      const invalidSuccessfulAsset = knownAsset
        && response.ok
        && !validPartialAsset
        && !validSuccessfulAsset;
      const transientFailure = isTransientNetworkResponse(response);
      const transientNavigationFailure = event.request.mode === "navigate" && transientFailure;
      if (invalidSuccessfulAsset || (knownAsset && transientFailure) || transientNavigationFailure) {
        const fallback = await cachedAssetOrShell(event.request, url, {
          includeShell: transientNavigationFailure
            || (invalidSuccessfulAsset && event.request.mode === "navigate")
        });
        if (fallback) return fallback;
        if (invalidSuccessfulAsset) return Response.error();
      }
      if (knownAsset && [403, 404, 410].includes(response.status)) {
        // An authoritative removal or revocation must not remain available from
        // a stale runtime entry on the next offline request.
        runtimeCacheWork = deleteRuntimeAsset(url).catch(() => {});
      }
      if (!KIDDOSPROUT_SHELL_PATHS.has(url.pathname)
          && await canStoreResponse(event.request, url, response, {
            contentHashVerified: validSuccessfulAsset
          })) {
        // A storage quota problem must never turn a successful network load
        // into an offline error. The event listener below keeps the worker
        // alive for this best-effort write while returning the response now.
        runtimeCacheWork = storeRuntimeResponse(
          cacheRequestForAsset(url),
          response.clone()
        ).catch(() => {});
      }
      return response;
    } catch (error) {
      return (await cachedAssetOrShell(event.request, url, { includeShell: true }))
        || Response.error();
    }
  })();

  event.respondWith(responsePromise);
  // ExtendableEvent.waitUntil() must be registered while the fetch event is
  // still being dispatched. Calling it after the network await can throw an
  // InvalidStateError in browsers and incorrectly discard a good response.
  event.waitUntil((async () => {
    await responsePromise.catch(() => undefined);
    await runtimeCacheWork;
  })());
});
