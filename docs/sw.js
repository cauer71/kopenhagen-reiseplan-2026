/**
 * Offline-Cache für den Reiseplan.
 *
 * Strategie:
 * - Seiten, Skripte, Styles und Reisedaten: network-first mit Cache-Fallback.
 *   Online bekommt man dadurch immer die aktuelle Fassung, offline die letzte gesehene.
 * - Bilder: cache-first, weil sie sich nie ändern (neue Bilder heißen anders).
 * - Fremde Hosts (z. B. die Wetter-API) werden bewusst nicht angefasst; ohne Netz
 *   scheitert der Abruf und die Seite zeigt ihre Planungshinweise.
 *
 * CACHE_VERSION bei Änderungen an dieser Datei oder am Shell-Umfang erhöhen.
 */

const CACHE_VERSION = "reiseplan-v4";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./assets/styles.css",
  "./assets/app.js",
  "./assets/landing.js",
  "./data/trips/index.json",
  "./data/trips/kopenhagen.json",
  "./data/trips/rom.json",
  "./trips/kopenhagen/",
  "./trips/rom/",
];

const isImage = (url) => /\.(?:jpg|jpeg|png|svg|webp)$/i.test(url.pathname);

/** Cache-Schlüssel ohne #fragment – Fragmente adressieren keine eigene Ressource. */
function stripHash(request) {
  const url = new URL(request.url);
  if (!url.hash) return request;
  url.hash = "";
  return url.toString();
}

/**
 * Legt eine URL im Cache ab. Bewusst fetch+put statt `Cache.add()`/`addAll()`:
 * beide sind nicht überall verfügbar und lassen sich nicht einzeln abfangen.
 */
async function store(cache, url) {
  try {
    const response = await fetch(url, { cache: "reload" });
    if (response.ok) await cache.put(url, response);
    return response.ok;
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Einzeln: ein fehlender Eintrag soll die Installation nicht kippen.
    await Promise.all(SHELL.map((url) => store(cache, new URL(url, self.location.href).href)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

/** Bilder der geöffneten Reise im Hintergrund nachladen (Auftrag kommt aus app.js). */
self.addEventListener("message", (event) => {
  if (event.data?.type !== "warm" || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    for (const url of event.data.urls) {
      // Nacheinander statt parallel, um die Verbindung nicht zu belegen.
      if (!(await cache.match(url))) await store(cache, url);
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(isImage(url) ? cacheFirst(request) : networkFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  // Ohne Fragment ablegen: `/trips/rom/#tag1` und `/trips/rom/` sind dieselbe Seite.
  const key = stripHash(request);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(key, response.clone());
    return response;
  } catch (error) {
    // ignoreSearch, damit ein neuer ?v=-Parameter den Offline-Treffer nicht verhindert.
    const hit = await cache.match(key, { ignoreSearch: true });
    if (hit) return hit;
    if (request.mode === "navigate") {
      const shell = await cache.match("./index.html", { ignoreSearch: true });
      if (shell) return shell;
    }
    throw error;
  }
}
