/* ==========================================================================
   SERVICE-WORKER.JS
   App-shell caching strategy: precache the static shell on install, then
   serve cache-first for same-origin static assets and network-first for
   navigations, so the app still opens (from cache) when offline.
   Bump CACHE_NAME whenever you change core assets to invalidate old caches.
   ========================================================================== */

const CACHE_NAME = "go-bike-delivery-v1";

const APP_SHELL = [
  "/index.html",
  "/manifest.json",
  "/css/style.css",
  "/js/firebase.js",
  "/js/store.js",
  "/js/fee-calculator.js",
  "/js/ui.js",
  "/js/auth.js",
  "/js/seed.js",
  "/customer/dashboard.html",
  "/customer/create-order.html",
  "/customer/order-history.html",
  "/customer/track-order.html",
  "/customer/notifications.html",
  "/customer/profile.html",
  "/rider/dashboard.html",
  "/rider/orders.html",
  "/rider/earnings.html",
  "/rider/profile.html",
  "/admin/dashboard.html",
  "/admin/orders.html",
  "/admin/riders.html",
  "/admin/rates.html",
  "/admin/more.html",
  "/admin/customers.html",
  "/admin/reports.html",
  "/admin/settings.html",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navigations: network-first so users always get fresh HTML when online,
  // falling back to the cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  // Same-origin static assets: cache-first.
  if (isSameOrigin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Cross-origin (fonts, map tiles, Leaflet CDN): try network, fall back to cache.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
