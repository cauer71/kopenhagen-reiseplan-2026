/**
 * Offline-Cache für den Reiseplan.
 *
 * Strategie:
 * - Seiten, Skripte, Styles und Reisedaten: network-first mit Cache-Fallback.
 *   Online bekommt man dadurch immer die aktuelle Fassung, offline die letzte gesehene.
 * - Eigene Bilder: cache-first, weil sie sich nie ändern (neue heißen anders).
 * - Fremde Hosts werden bewusst nicht angefasst. Das betrifft die Wetter-API und
 *   seit der Umstellung auf verlinkte Bilder auch diese: sie liegen auf fremden
 *   Servern und lassen sich nicht vorhalten. Ohne Netz bleibt an ihrer Stelle
 *   eine Fläche — der Plan selbst ist vollständig lesbar.
 *
 * Der Name des Caches ist fest. Er trug früher eine Versionsnummer, die bei jeder
 * Änderung von Hand anzuheben war – zweimal vergessen, und der Browser lieferte
 * denselben `?v=` mit altem Inhalt. Stattdessen holt `networkFirst` jede Antwort
 * mit einer Rückfrage beim Server: ist sie unverändert, kommt ein 304 und kostet
 * fast nichts; ist sie neu, kommt sie neu. Damit braucht es weder eine Version in
 * den Adressen noch einen Handgriff nach dem Ändern.
 */

const CACHE_NAME = "reiseplan";

/**
 * Der feste Teil. Die Reisen kommen nicht hierher, sondern werden bei der
 * Installation aus `data/trips/index.json` gelesen – sonst müsste man diese
 * Liste bei jeder neuen Reise nachpflegen, und genau das wurde einmal vergessen:
 * die Reise war da, im Offline-Cache fehlte sie.
 */
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./assets/styles.css",
  "./assets/app.js",
  "./assets/landing.js",
  "./data/trips/index.json",
];

/** Reisedatei und Unterseite je Slug aus index.json. */
async function reisePfade() {
  try {
    const antwort = await fetch(new URL("./data/trips/index.json", self.location.href).href,
                               { cache: "reload" });
    if (!antwort.ok) return [];
    const index = await antwort.json();
    return (index.trips ?? []).flatMap(({ slug }) =>
      slug ? [`./data/trips/${slug}.json`, `./trips/${slug}/`] : []);
  } catch {
    return [];   // ohne Netz gibt es beim ersten Besuch ohnehin nichts zu cachen
  }
}

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
    const cache = await caches.open(CACHE_NAME);
    const alles = [...SHELL, ...(await reisePfade())];
    // Einzeln: ein fehlender Eintrag soll die Installation nicht kippen.
    await Promise.all(alles.map((url) => store(cache, new URL(url, self.location.href).href)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

/** Bilder der geöffneten Reise im Hintergrund nachladen (Auftrag kommt aus app.js). */
self.addEventListener("message", (event) => {
  if (event.data?.type !== "warm" || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
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
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  // Ohne Fragment ablegen: `/trips/rom/#tag1` und `/trips/rom/` sind dieselbe Seite.
  const key = stripHash(request);
  try {
    // `no-cache` heißt nicht „kein Cache“, sondern „nachfragen“: der Browser
    // schickt seinen ETag mit, unveränderte Dateien kommen als 304 zurück. Das
    // ersetzt den früheren `?v=`-Parameter. GitHub Pages liefert Dateien mit zehn
    // Minuten Gültigkeit aus; ohne die Rückfrage zeigte das Handy nach einer
    // Änderung bis zu zehn Minuten die alte Fassung.
    //
    // Über die Adresse statt über `request`: aus einem Navigations-Request lässt
    // sich kein neuer mit anderem Cache-Modus bauen, das wirft. Für eigene
    // GET-Dateien ist die Adresse gleichwertig.
    const response = await fetch(new Request(request.url, { cache: "no-cache" }));
    if (response.ok) cache.put(key, response.clone());
    return response;
  } catch (error) {
    // ignoreSearch, damit ein Parameter wie `?heute=` den Treffer nicht verhindert.
    const hit = await cache.match(key, { ignoreSearch: true });
    if (hit) return hit;
    if (request.mode === "navigate") {
      const shell = await cache.match("./index.html", { ignoreSearch: true });
      if (shell) return shell;
    }
    throw error;
  }
}
