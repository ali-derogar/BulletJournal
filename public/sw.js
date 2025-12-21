const CACHE_NAME = "bullet-journal-v1";
const RUNTIME_CACHE = "bullet-journal-runtime-v1";

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        cacheNames.filter((cacheName) => !currentCaches.includes(cacheName))
      )
      .then((cachesToDelete) =>
        Promise.all(
          cachesToDelete.map((cacheToDelete) => caches.delete(cacheToDelete))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.open(RUNTIME_CACHE).then((cache) =>
          fetch(event.request).then((response) => {
            if (
              event.request.method === "GET" &&
              response.status === 200 &&
              response.type === "basic"
            ) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
        );
      })
    );
  }
});
