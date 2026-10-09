/**
 * Service Worker per Jarvis — Cabina di Regia Personale (PWA Mobile-First)
 * Garantisce l'apertura istantanea e il funzionamento offline dell'applicazione
 * anche in assenza di connessione di rete su iPhone / iPad / Desktop.
 */

const CACHE_NAME = "jarvis-pwa-v1.0.0";

// Asset essenziali da memorizzare nella cache all'installazione
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg",
];

// 1. Installazione: pre-caching della shell applicativa
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Attivazione: rimozione delle vecchie versioni della cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Intercettazione richieste di rete (Fetch)
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignora richieste non-GET
  if (request.method !== "GET") {
    return;
  }

  // Ignora chiamate API interne ed esterne (Google Drive OAuth, backend AI, ecc.)
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("google.com")
  ) {
    return;
  }

  // Gestione navigazione principale: Network-first con fallback a cache offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match("/index.html").then((cached) => {
            return cached || caches.match("/");
          });
        })
    );
    return;
  }

  // Gestione asset statici (JS, CSS, Immagini, Font): Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
