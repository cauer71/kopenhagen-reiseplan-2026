/**
 * Startseite mit Reisekacheln.
 *
 * Titel, Datum, Untertitel und Reisende werden aus den Reisedateien gelesen –
 * hier steht bewusst nichts doppelt. Zu pflegen ist nur die Reihenfolge in
 * `data/trips/index.json`.
 */

const root = document.querySelector("#app");
const version = document.body.dataset.version ?? "";
const query = version ? `?v=${encodeURIComponent(version)}` : "";

const esc = (value = "") => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

const image = (name, size = 1200) => (String(name).startsWith("http") ? name : `./photos/web/${name}-${size}.jpg`);

const srcset = (name) => (String(name).startsWith("http") ? "" : ` srcset="${image(name, 720)} 720w, ${image(name, 1200)} 1200w"`);

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

function tile(entry, data) {
  const { trip, days } = data;
  const stops = days.reduce((sum, day) => sum + day.stops.length, 0);
  const meta = [`${days.length} Tage`, `${stops} Stops`, trip.travellers, entry.badge]
    .filter(Boolean).map(esc).join(" · ");
  const hero = entry.tileImage ?? trip.heroImage;
  return `<a class="trip-tile" href="./trips/${encodeURIComponent(entry.slug)}/">
    <img src="${image(hero)}"${srcset(hero)} sizes="(min-width: 60rem) 33vw, 100vw" alt="${esc(trip.destination)}" loading="lazy" decoding="async">
    <span class="trip-tile-shade"></span>
    <div>
      <p class="eyebrow">${esc(trip.dates)}</p>
      <h2>${esc(trip.destination)}</h2>
      <p>${esc(trip.subtitle)}</p>
      <small>${meta} · Reise öffnen →</small>
    </div>
  </a>`;
}

async function init() {
  document.title = "Meine Reisen";
  const index = await loadJson(`./data/trips/index.json${query}`);
  const entries = index.trips ?? [];

  const loaded = await Promise.all(entries.map(async (entry) => {
    try {
      return { entry, data: await loadJson(`./data/trips/${entry.slug}.json${query}`) };
    } catch {
      return null; // eine defekte Reise soll die Startseite nicht leer machen
    }
  }));

  const tiles = loaded.filter(Boolean).map(({ entry, data }) => tile(entry, data)).join("");
  root.innerHTML = `<main class="trip-index">
    <div class="index-intro">
      <p class="eyebrow">Reiseplaner</p>
      <h1>Meine Reisen</h1>
      <p>Jede Reise hat ihren eigenen Bereich. Bilder, Tagespläne, Wetter und stabile Termin-UIDs bleiben je Reise getrennt.</p>
    </div>
    <div class="trip-grid">${tiles}</div>
  </main>`;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

init().catch(() => {
  root.innerHTML = '<p class="load-error">Die Reiseübersicht konnte nicht geladen werden.</p>';
});
