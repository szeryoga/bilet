const CACHE_NAME = "bilet-pwa-v2";
const BASE_PATH = new URL("./", self.location.href).pathname.replace(/\/+$/, "");
const ROOT = BASE_PATH || "";
const ASSETS = [
  `${ROOT}/`,
  `${ROOT}/index.html`,
  `${ROOT}/ticket.html`,
  `${ROOT}/styles.css`,
  `${ROOT}/app.js`,
  `${ROOT}/manifest.webmanifest`,
  `${ROOT}/img/background.png`,
  `${ROOT}/img/qr.png`,
  `${ROOT}/img/pwa-192.png`,
  `${ROOT}/img/pwa-512.png`,
  `${ROOT}/img/qr_spin_1000.gif`
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (!url.pathname.startsWith(`${ROOT}/`) && url.pathname !== `${ROOT}`) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match(`${ROOT}/index.html`);
          }
          return caches.match(event.request);
        });
    })
  );
});
