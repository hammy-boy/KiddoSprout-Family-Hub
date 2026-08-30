const KIDDOSPROUT_CACHE = "kiddosprout-app-v1";
const KIDDOSPROUT_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/js.js",
  "/kid-hubs.css",
  "/kid-hub-gate.js",
  "/creator-studio.html",
  "/nature-explorer.html",
  "/move-breaks.html",
  "/story-theater.html",
  "/recipe.html",
  "/app_6.html",
  "/app_7.html",
  "/report_problem.html",
  "/family-tech-hub.png",
  "/assets/family-tech-hub.png",
  "/kiddosprout_logo.png",
  "/kiddosprout_logo_128.png",
  "/kiddosprout_blocked_1280x800.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(KIDDOSPROUT_CACHE).then((cache) => cache.addAll(KIDDOSPROUT_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== KIDDOSPROUT_CACHE)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(KIDDOSPROUT_CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
  );
});
