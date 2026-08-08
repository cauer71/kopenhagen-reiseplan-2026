import { introStarten } from "./intro.js";

/**
 * Startseite mit Reisekacheln.
 *
 * Alles Angezeigte kommt aus den Reisedateien: Titel, Datum, Untertitel,
 * Reisende, Bild und die Einordnung als Architektur- oder Städtereise. Hier steht
 * bewusst nichts doppelt.
 *
 * Zu pflegen ist gar nichts. `data/trips/index.json` sagt nur, welche Reisen es
 * gibt, und wird von `tools/build.mjs` aus den vorhandenen Dateien erzeugt – eine
 * .json mehr im Ordner heißt eine Kachel mehr. Die Reihenfolge auf der Seite
 * ergibt sich aus den Reisedaten selbst (siehe `sortTrips`).
 */

const root = document.querySelector("#app");

const esc = (value = "") => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

/** Schluessel -> URL aus dem images-Block der jeweiligen Reisedatei. */
const image = (name, bilder = {}) => (String(name).startsWith("http") ? name : bilder[name]?.url ?? "");

const srcset = () => "";   // ein verlinktes Bild je Motiv, keine Breitenauswahl

async function loadJson(url) {
  // no-cache: Rückfrage per ETag statt zehn Minuten blindem Cache, damit eine
  // Planänderung sofort sichtbar wird. Offline übernimmt der Service Worker.
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

/* ------------------------------------------------------- Reihenfolge */

/** Heutiges Datum als JJJJ-MM-TT in lokaler Zeit (toISOString wäre UTC). */
function today() {
  // Dasselbe ?heute= wie auf den Reiseseiten, damit sich die Sortierung der
  // Kacheln prüfen lässt. Ohne das wäre „laufende Reise oben" nie testbar, und
  // genau das fällt sonst erst im Urlaub auf. Ein Tippfehler wird ignoriert
  // statt geraten – nur genau dieses Format wird angenommen.
  const gesetzt = new URLSearchParams(location.search).get("heute");
  if (/^\d{4}-\d{2}-\d{2}$/.test(gesetzt ?? "")) return gesetzt;
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
  const { trip, days, images = {} } = data;
  const stops = days.reduce((sum, day) => sum + day.stops.length, 0);
  // `introLabel` ist die Einordnung der Reise („Architekturreise“, „Städtereise“)
  // und stand vorher zusätzlich als `badge` in index.json. Zwei Felder für
  // dieselbe Angabe an zwei Orten – eines davon wäre irgendwann das falsche.
  const meta = [`${days.length} Tage`, `${stops} Stops`, trip.travellers, trip.introLabel]
    .filter(Boolean).map(esc).join(" · ");
  // Eigenes Kachelbild nur, wenn die Reisedatei eines nennt; sonst das Titelbild.
  const hero = trip.tileImage ?? trip.heroImage;
  return `<a class="trip-tile" href="./trips/${encodeURIComponent(entry.slug)}/" data-status="${status}">
    <img src="${image(hero, images)}" alt="${esc(images[hero]?.alt || trip.destination)}" loading="lazy" decoding="async">
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
  const index = await loadJson("./data/trips/index.json");
  const entries = index.trips ?? [];

  const now = today();
  const loaded = await Promise.all(entries.map(async (entry) => {
    try {
      const data = await loadJson(`./data/trips/${entry.slug}.json`);
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
      <p>Wer die Wege kurz hält, gewinnt Zeit für das, weswegen er gekommen ist.</p>
    </div>
    <div class="trip-grid">${tiles}</div>
    <p class="pagefoot"><a href="./test/">Testparameter</a></p>
  </main>`;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

introStarten();

init().catch(() => {
  root.innerHTML = '<p class="load-error">Die Reiseübersicht konnte nicht geladen werden.</p>';
});
