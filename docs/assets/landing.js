/**
 * Startseite mit Reisekacheln.
 *
 * Titel, Datum, Untertitel und Reisende werden aus den Reisedateien gelesen –
 * hier steht bewusst nichts doppelt. Zu pflegen ist nur die Liste der Reisen in
 * `data/trips/index.json`; die Reihenfolge auf der Seite ergibt sich aus den
 * Reisedaten (siehe `sortTrips`).
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

/* ------------------------------------------------------- Reihenfolge */

/** Heutiges Datum als JJJJ-MM-TT in lokaler Zeit (toISOString wäre UTC). */
function today() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Erster und letzter Reisetag aus den isoDate-Angaben der Tagesabschnitte. */
function span(data) {
  const dates = data.days.map((day) => day.isoDate).filter(Boolean).sort();
  return { start: dates[0] ?? "", end: dates[dates.length - 1] ?? "" };
}

const STATUS_LABEL = { laufend: "Läuft gerade", bevorstehend: "Bevorstehend", vergangen: "Vergangen" };
const STATUS_RANK = { laufend: 0, bevorstehend: 1, vergangen: 2 };

function statusOf({ start, end }, now) {
  if (!start) return "bevorstehend";
  if (start <= now && now <= end) return "laufend";
  return start > now ? "bevorstehend" : "vergangen";
}

/**
 * Laufende Reise zuoberst, dann die bevorstehenden mit der nächsten zuerst,
 * darunter die vergangenen mit der jüngsten zuerst – die Liste läuft also von
 * „jetzt“ aus in beide Richtungen auseinander.
 *
 * Sollen die vergangenen stattdessen mit der ältesten beginnen, ist nur der
 * Vergleich in der letzten Zeile umzudrehen.
 */
function sortTrips(trips) {
  return [...trips].sort((a, b) => {
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) {
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    }
    return a.status === "vergangen"
      ? b.start.localeCompare(a.start)
      : a.start.localeCompare(b.start);
  });
}

/* ------------------------------------------------------------ Kacheln */

function tile({ entry, data, status }) {
  const { trip, days } = data;
  const stops = days.reduce((sum, day) => sum + day.stops.length, 0);
  const meta = [`${days.length} Tage`, `${stops} Stops`, trip.travellers, entry.badge]
    .filter(Boolean).map(esc).join(" · ");
  const hero = entry.tileImage ?? trip.heroImage;
  return `<a class="trip-tile" href="./trips/${encodeURIComponent(entry.slug)}/" data-status="${status}">
    <img src="${image(hero)}"${srcset(hero)} sizes="(min-width: 60rem) 33vw, 100vw" alt="${esc(trip.destination)}" loading="lazy" decoding="async">
    <span class="trip-tile-shade"></span>
    <div>
      <p class="trip-status">${esc(STATUS_LABEL[status])}</p>
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

  const now = today();
  const loaded = await Promise.all(entries.map(async (entry) => {
    try {
      const data = await loadJson(`./data/trips/${entry.slug}.json${query}`);
      const { start, end } = span(data);
      return { entry, data, start, end, status: statusOf({ start, end }, now) };
    } catch {
      return null; // eine defekte Reise soll die Startseite nicht leer machen
    }
  }));

  const tiles = sortTrips(loaded.filter(Boolean)).map(tile).join("");
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
