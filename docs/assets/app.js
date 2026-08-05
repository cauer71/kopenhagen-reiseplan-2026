const root = document.querySelector("#app");
const siteRoot = document.body.dataset.siteRoot ?? "./";
const tripSource = document.body.dataset.trip ?? "./data/trip.json";
const stateKey = `reiseplan:${tripSource.split("?")[0]}`;

const isRemote = (name) => String(name).startsWith("http");

/**
 * Bildverzeichnis der geladenen Reise: Schlüssel → { url, width, height, alt,
 * credit, license, source }. Bilder werden verlinkt, nicht mitgeliefert.
 * Wird in init() aus `data.images` gesetzt.
 */
let bilder = {};

/** Schlüssel → URL. Rohe URLs bleiben unverändert (Altbestand). */
const image = (name) => (isRemote(name) ? name : bilder[name]?.url ?? "");

/** Einzelne verlinkte Datei je Motiv, also keine Breitenauswahl. */
const srcset = () => "";

/** Maße gegen Layoutsprünge beim Nachladen. */
const masse = (name) => {
  const b = bilder[name];
  return b?.width && b?.height ? ` width="${b.width}" height="${b.height}"` : "";
};

/** Alt-Text aus dem Verzeichnis, sonst der mitgegebene. */
const bildAlt = (name, ersatz = "") => esc(bilder[name]?.alt || ersatz);

/**
 * Verlangt diese Lizenz eine Namensnennung?
 *
 * CC0 und Gemeinfreiheit verlangen keine — solche Bilder erscheinen im Nachweis
 * nicht. CC BY und CC BY-SA verlangen sie als Lizenzbedingung.
 *
 * Unbekannte Angaben werden **genannt**, nicht weggelassen: eine überflüssige
 * Zeile ist harmlos, eine fehlende Namensnennung bei CC BY(-SA) ist ein
 * Lizenzverstoß.
 */
const NENNUNG_FREI = /\b(cc0|public\s*domain|pd[-\s]|gemeinfrei|no\s+restrictions)/i;
const nennungNoetig = (lizenz) => !NENNUNG_FREI.test(String(lizenz ?? ""));

/**
 * Bildnachweis — nur für Bilder, deren Lizenz die Nennung verlangt. Verlangt
 * keines davon eine, entfällt er vollständig.
 *
 * **Zugeklappt, und das ist lizenzkonform.** CC BY 4.0 verlangt die Nennung
 * „in any reasonable manner based on the medium, means, and context" und stellt
 * in §3(a)(2) ausdrücklich fest, dass dafür sogar ein *Verweis* auf eine Seite
 * mit den Angaben genügen kann. Ein `<details>`-Block geht darüber hinaus: die
 * Angabe steht auf derselben Seite, im DOM, ohne Netzzugriff, mit einem Klick da
 * — und die Suche im Browser findet sie. Wikipedia selbst zeigt am Bild im
 * Artikel gar keine Nennung; man muss auf die Dateiseite klicken.
 *
 * Drei Bedingungen, die deshalb nicht verhandelbar sind:
 *   1. Die Beschriftung sagt, was drin ist („Bildnachweis"). Kein Versteck.
 *   2. Kein `display: none` — der Inhalt bleibt erreichbar und auslesbar.
 *   3. Die Angabe bleibt vollständig: Urheber, Lizenz, Verweis auf die Quelle.
 *
 * Zugeklappt, weil die Nennung eine Lizenzpflicht ist und kein Inhalt der Reise.
 * Sie muss auffindbar sein, nicht dauernd sichtbar.
 */
function renderBildnachweis() {
  const namen = Object.keys(bilder).sort().filter((n) => nennungNoetig(bilder[n].license));
  if (!namen.length) return "";
  const teile = namen.map((n) => {
    const b = bilder[n];
    const was = esc(b.alt || n);
    const wer = esc([b.credit || "unbekannt", b.license].filter(Boolean).join(", "));
    return b.source
      ? `<a href="${esc(b.source)}" target="_blank" rel="noreferrer">${was}</a> (${wer})`
      : `${was} (${wer})`;
  }).join(" · ");
  const anzahl = `${namen.length} ${namen.length === 1 ? "Bild" : "Bilder"}`;
  return `<details class="credits" id="bildnachweis">
    <summary>Bildnachweis · ${anzahl}</summary>
    <p>${teile}</p>
  </details>`;
}

/**
 * Fußzeile ganz unten. Enthält nur den Weg zu den Testparametern — bewusst
 * unauffällig, weil sie im Alltag niemanden interessiert, aber unterwegs vom
 * Handy aus erreichbar sein muss.
 */
const renderFusszeile = () =>
  `<p class="pagefoot"><a href="${siteRoot}test/">Testparameter</a></p>`;

const maps = (place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

const esc = (value = "") => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

const weatherLabel = (code) => {
  if (code === 0) return "Klar";
  if ([1, 2].includes(code)) return "Heiter";
  if (code === 3) return "Bedeckt";
  if ([45, 48].includes(code)) return "Nebel";
  if ([51, 53, 55, 56, 57].includes(code)) return "Niesel";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Regen";
  if ([95, 96, 99].includes(code)) return "Gewitter";
  return "Wechselhaft";
};

/* ---------------------------------------------------------------- Wetter */

function renderWeather(trip) {
  if (!trip.weather?.enabled) return "";
  const notes = trip.weather.notes ?? [];
  return `<section class="section weather-section" id="wetter">
    <div class="section-head"><p class="eyebrow">Aktuelle Prognose</p><h2>Wetterfenster für die Route</h2><p>Die Prognose wird beim Öffnen live geladen. Ohne Netz bleiben die Planungshinweise sichtbar – Prognosezahlen werden dann bewusst nicht angezeigt.</p></div>
    <div class="weather-status" id="weatherStatus" data-live="false"><span>Offline</span>Lade aktuelle Prognose …</div>
    <div class="weather-grid" id="weatherGrid">${notes.map((note) => weatherCard(note)).join("")}</div>
  </section>`;
}

/** `live` ist null, solange keine echte Prognose vorliegt – dann bleiben die Felder leer. */
function weatherCard(note, live = null) {
  const numbers = live
    ? `<strong>${live.tempMax}/${live.tempMin} °C</strong><b>${weatherLabel(live.code)}</b><p>${live.pop ?? "–"}% Regen · Wind ${live.wind ?? "–"} km/h</p>`
    : `<strong class="weather-empty">keine Prognose</strong><b class="weather-empty">offline</b><p class="weather-empty">Zahlen erst mit Netzverbindung</p>`;
  return `<article class="weather-card"><span>${esc(note.day)}</span>${numbers}<p>${esc(note.action ?? "")}</p></article>`;
}

/**
 * Unterwegs steht das Wetter nicht in einer eigenen Sektion, sondern als Zeile
 * am Kopf der Tageskarte: Prognosepille plus die Konsequenz aus den
 * Planungshinweisen. `loadWeather()` findet die Pillen über
 * `.weather-pill[data-iso]`, egal wo sie stehen.
 *
 * Früher lagen alle Zeilen als Block über dem Plan und wurden wie die Tageskarten
 * umgeschaltet. Seit alle Tage gleichzeitig sichtbar sind, gehört jede Zeile zu
 * ihrem Tag — sonst stünde eine Wetterangabe ohne erkennbaren Bezug am Seitenkopf.
 */
function renderWeatherLine(trip, day) {
  if (!trip.weather?.enabled || !day.isoDate) return "";
  const note = (trip.weather.notes ?? []).find((n) => n.date === day.isoDate);
  return `<div class="weather-line" data-day="${esc(day.id)}"><span class="weather-pill" data-iso="${esc(day.isoDate)}">${esc(day.weather ?? "")}</span><b>${esc(note?.action ?? "")}</b></div>`;
}

/* ----------------------------------------------------------------- Stops */

const paragraphs = (value) => (Array.isArray(value) ? value : [value]).filter(Boolean);

const WEATHER_LABEL = {
  aussen: "Im Freien – wetterabhängig",
  innen: "Überdacht – auch bei Regen gut",
  beides: "Wetterunabhängig",
};

/* Kurzform für die Chipzeile – die Langform bleibt in den Fakten. */
const WEATHER_SHORT = {
  aussen: "Im Freien",
  innen: "Überdacht",
  beides: "Wetterfest",
};

/** Uhrzeit "HH:MM" als Minuten seit Mitternacht. */
const minutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function renderFacts(place) {
  const facts = [
    ["Adresse", place.address],
    ["Dauer", place.duration],
    ["Eintritt", place.price],
    ["Wetter", WEATHER_LABEL[place.weather]],
    ["Termin", place.fixed ? "Fest – nicht verschieben" : null],
    ["Gut zu wissen", place.tip],
  ].filter(([, value]) => value);
  if (!facts.length) return "";
  return `<dl class="stop-facts">${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`;
}

function renderStop(stop, previous, dayId, index = 0) {
  const anchor = `${dayId}-stop-${stop.uid}`;
  const ticket = stop.ticketUrl ? `<div class="ticket"><b>Ticket:</b><a href="${esc(stop.ticketUrl)}" target="_blank" rel="noreferrer">Offizielle Buchung</a></div>` : "";
  const body = paragraphs(stop.description).map((text) => `<p>${esc(text)}</p>`).join("");
  // Dauer und Wetterart stehen in der zugeklappten Zeile: unterwegs entscheidet
  // „innen oder außen“ über die Reihenfolge. Adresse und Hinweise gehören
  // weiterhin zu den Fakten im Aufklapper.
  const chips = [
    stop.duration ? `<span>${esc(stop.duration)}</span>` : "",
    stop.weather ? `<span data-weather="${esc(stop.weather)}">${esc(WEATHER_SHORT[stop.weather])}</span>` : "",
  ].join("");
  const chipRow = chips ? `<span class="stop-chips">${chips}</span>` : "";
  // --i ist die Position im Tag. Damit staffelt CSS den Auftritt entlang der
  // Zeitachse, ohne dass hier ein Zeitgeber laufen muss.
  return `<article class="stop-card" id="${anchor}" style="--i:${index}">
    <div class="stop-rail">
      <time class="stop-time">${esc(stop.time)}</time>
      <img class="stop-mark" src="${image(stop.image)}" alt="" loading="lazy" decoding="async">
      <span class="stop-line" aria-hidden="true"></span>
    </div>
    <div class="stop-main">
      <button class="stop-toggle" type="button" aria-expanded="false" aria-controls="${anchor}-details">
        <span class="stop-heading"><span class="stop-title" role="heading" aria-level="4">${esc(stop.title)}</span><span class="stop-chevron" aria-hidden="true">⌄</span></span>
        <span class="stop-lead">${esc(stop.detail ?? "")}</span>
        ${chipRow}
      </button>
      <div class="stop-details" id="${anchor}-details" hidden>
      <img class="stop-photo" src="${image(stop.image)}"${masse(stop.image)} alt="${bildAlt(stop.image, stop.title)}" loading="lazy" decoding="async">
      <div class="stop-body">${body}</div>
      ${renderFacts(stop)}
      <p class="route">Von ${esc(previous)} · zu Fuß / ÖPNV nach ${esc(stop.title)}</p>
      <div class="stop-links"><a class="maps-link" href="${maps(stop.place)}" target="_blank" rel="noreferrer"><span class="maps-mark" aria-hidden="true"></span><span>Karte<small>Google Maps</small></span></a>${ticket}</div>
      <p class="uid">UID:${esc(stop.uid)}</p>
      </div>
    </div>
  </article>`;
}

/**
 * Eine Tageskarte. **Alle Tage sind gleichzeitig sichtbar** — der Plan ist eine
 * durchgehende Liste, kein Kartenstapel mit einem Fenster darauf.
 *
 * Vorher war genau ein Tag zu sehen und die Leiste schaltete um. Das versteckte
 * drei Viertel der Reise: Wer wissen wollte, was übermorgen ansteht, musste
 * suchen, und ein Überblick über die ganzen Tage war gar nicht möglich. Die Leiste
 * springt jetzt, statt zu filtern.
 *
 * Läuft die Reise (`laufend`), fallen Tagesbild und Tagesnummer weg: die Nummer
 * steht im Kopf, das Bild doppelt ihn. Das Wetter steht dann als Zeile am
 * Kartenkopf statt als Pille im Text.
 */
function renderDay(day, laufend = false, trip = {}) {
  let previous = "Unterkunft / Basis";
  const stops = day.stops.map((stop, i) => { const html = renderStop(stop, previous, day.id, i); previous = stop.title; return html; }).join("");
  const hero = laufend ? "" : `<img class="day-hero" src="${image(day.heroImage)}"${masse(day.heroImage)} alt="${bildAlt(day.heroImage, day.title)}" loading="lazy" decoding="async">`;
  const wetter = laufend ? renderWeatherLine(trip, day) : "";
  const kopf = laufend
    ? `<h3 class="day-title">${esc(day.title)}</h3><p class="day-note">${esc(day.note ?? "")}</p>`
    : `<p class="day-label">${esc(day.label)} · ${esc(day.date)}</p><h3 class="day-title">${esc(day.title)}</h3><p class="weather-pill" data-iso="${esc(day.isoDate ?? "")}">${esc(day.weather ?? "")}</p><p class="day-note">${esc(day.note ?? "")}</p>`;
  return `<article class="day-card ${esc(day.tone)}" id="${esc(day.id)}" aria-label="${esc(day.label)} · ${esc(day.date)}">
    ${hero}${wetter}
    <div class="day-body">${kopf}</div>
    <div class="day-details"><div class="stops">${stops}</div></div>
  </article>`;
}

/**
 * Die Leiste über dem Plan. Sie **springt** zu einem Tag und blendet nichts aus.
 *
 * Deshalb Links und keine Knöpfe: ein Sprungziel ist ein Link. Das gibt ohne
 * Zutun das richtige Verhalten — Adresse teilbar, in neuem Tab öffenbar,
 * Tastaturbedienung inklusive — und die ARIA-Rollen `tablist`/`tab`, die ein
 * Umschalten versprachen, entfallen. `aria-current` markiert den Tag, der gerade
 * im Bild ist.
 */
function renderTabs(days) {
  const tabs = days.map((day) => {
    const [weekday, dayMonth] = String(day.date ?? "").split(" ");
    return `<a class="day-tab" href="#${esc(day.id)}" data-day="${esc(day.id)}">
      <b>${esc(weekday || day.label)}</b><small>${esc(dayMonth ?? "")}</small>
    </a>`;
  }).join("");
  return `<nav class="day-tabs" aria-label="Zu einem Reisetag springen">${tabs}</nav>`;
}

/* ------------------------------------------------------------------ Kopf */

/**
 * Der Vollbild-Hero ist ein Ankunftsbild – unterwegs kostet er zweieinhalb
 * Bildschirmhöhen bis zum ersten Stop. Läuft die Reise, schrumpft er auf einen
 * Kopf mit Tagesnummer; davor und danach bleibt er unverändert.
 */
function renderHero(trip, days, focus) {
  const nav = `<nav class="topnav" aria-label="Reiseabschnitte"><a href="${siteRoot}">Alle Reisen</a><a href="#tage">Tage</a>${trip.weather?.enabled ? '<a href="#wetter">Wetter</a>' : ""}</nav>`;
  const bild = `<img src="${image(trip.heroImage)}" alt="${bildAlt(trip.heroImage, trip.destination)}" class="hero-bg" fetchpriority="high" decoding="async"><div class="hero-shade"></div>`;

  if (focus.status !== "laufend") {
    return `<section class="hero" id="top">${bild}${nav}<div class="hero-copy"><p class="eyebrow">${esc(trip.dates)} · ${esc(trip.travellers)}</p><h1>${esc(trip.title)}</h1><p>${esc(trip.subtitle)}</p><div class="hero-stats"><span><b>${days.length}</b>Tage</span><span><b>${days.reduce((sum, day) => sum + day.stops.length, 0)}</b>Stops</span></div></div></section>`;
  }

  const nummer = days.indexOf(focus.day) + 1;
  return `<section class="hero hero-compact" id="top">${bild}${nav}<div class="hero-copy"><p class="eyebrow">Tag ${nummer} von ${days.length} · ${esc(focus.day.date)} · ${esc(trip.travellers)}</p><h1>${esc(trip.title)}</h1></div></section>`;
}

/* -------------------------------------------------- Einstieg „heute“ */

/* ------------------------------------------------------- Testansicht */

/**
 * Der Unterwegs-Zustand gilt nur, während die Reise läuft – im Alltag ist er
 * also unsichtbar und ein Fehler darin fällt erst im Urlaub auf. Deshalb lassen
 * sich Datum und Uhrzeit über die Adresse setzen:
 *
 *   ?heute=2026-09-05            → dieser Tag gilt als heute
 *   ?heute=2026-09-05&jetzt=14:30 → zusätzlich diese Uhrzeit
 *
 * Nur genau diese Formate werden angenommen; ein Tippfehler wird ignoriert
 * statt stillschweigend auf einen anderen Tag zu führen. Ist ein Wert gesetzt,
 * weist ein Hinweis am unteren Rand darauf hin – eine Testansicht darf nicht
 * mit der Wirklichkeit verwechselt werden.
 */
const testParams = new URLSearchParams(location.search);
const testDate = /^\d{4}-\d{2}-\d{2}$/.test(testParams.get("heute") ?? "") ? testParams.get("heute") : null;
const testTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(testParams.get("jetzt") ?? "") ? testParams.get("jetzt") : null;

/** Heutiges Datum als JJJJ-MM-TT in lokaler Zeit (toISOString wäre UTC). */
function todayIso() {
  if (testDate) return testDate;
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Aktuelle Uhrzeit als HH:MM, ebenfalls über die Adresse setzbar. */
function nowHm() {
  return testTime ?? new Date().toTimeString().slice(0, 5);
}

function renderTestHint() {
  if (!testDate && !testTime) return "";
  const teile = [testDate && `Datum ${testDate}`, testTime && `Uhrzeit ${testTime}`].filter(Boolean);
  return `<p class="test-hint">Testansicht · ${esc(teile.join(" · "))} · <a href="${location.pathname}">echte Zeit</a></p>`;
}

/**
 * Welcher Tag beim Öffnen gilt – und was als nächstes ansteht. Dieselbe
 * Statusidee wie auf der Startseite, nur hier auf Tagesebene: läuft die Reise,
 * ist der heutige Tag offen; liegt sie noch vor uns, der erste.
 */
function focusOf(days) {
  const iso = todayIso();
  const dated = days.filter((day) => day.isoDate);
  const heute = dated.find((day) => day.isoDate === iso);
  if (heute) return fokusFuerTag(heute, days);
  const kommend = dated.find((day) => day.isoDate > iso);
  if (kommend) return fokusFuerTag(kommend, days);
  return fokusFuerTag(days[days.length - 1] ?? null, days);
}

/**
 * Derselbe Status, aber für einen **bestimmten** Tag statt für den, der gerade
 * dran ist.
 *
 * Nötig, weil die Karte direkt unter der Tagesleiste sitzt: sie muss den
 * gewählten Tag beschreiben, sonst zeigt sie beim Blättern weiter Tag 1. Auf dem
 * heutigen Tag bleibt sie trotzdem die Jetzt-Karte mit echtem Vorlauf – der
 * Status wird aus dem Datum abgeleitet, nicht aus der Auswahl.
 */
function fokusFuerTag(day, days = []) {
  if (!day) return { status: "vergangen", day: null, alleVorbei: true };
  const iso = todayIso();
  if (day.isoDate === iso) {
    const jetzt = nowHm();
    // `jetzt` wandert mit nach oben: die Heute-Karte rechnet daraus den Vorlauf.
    return { status: "laufend", day, jetzt, next: day.stops.find((stop) => stop.time >= jetzt) ?? null };
  }
  if (day.isoDate > iso) {
    const tage = Math.round((new Date(`${day.isoDate}T12:00:00`) - new Date(`${iso}T12:00:00`)) / 86400000);
    return { status: "bevorstehend", day, tage };
  }
  // Ein einzelner vergangener Tag mitten in einer laufenden Reise ist etwas
  // anderes als eine Reise, die komplett zurückliegt.
  const alleVorbei = days.filter((d) => d.isoDate).every((d) => d.isoDate < iso);
  return { status: "vergangen", day, alleVorbei };
}

function renderFocus(focus) {
  if (!focus.day) return "";
  if (focus.status === "laufend") {
    const next = focus.next;
    if (!next) {
      return `<div class="today-card" data-status="laufend"><p class="today-eyebrow">Heute · ${esc(focus.day.label)}</p><p class="today-title">Tagesprogramm durch</p><p class="today-meta">Alle Stops dieses Tages liegen hinter euch.</p></div>`;
    }
    // Der Vorlauf ist die eigentliche Antwort auf „was jetzt?“ – deshalb steht
    // er in derselben Zeile wie die Uhrzeit, nicht im Fließtext.
    const rest = minutes(next.time) - minutes(focus.jetzt);
    const gleich = rest > 90 ? `in ${Math.round(rest / 60)} Std.` : `in ${Math.max(rest, 0)} Min.`;
    const meta = [WEATHER_LABEL[next.weather], next.duration, next.address].filter(Boolean).map(esc).join(" · ");
    return `<div class="today-card" data-status="laufend">
      <p class="today-eyebrow">Als nächstes · ${esc(next.time)} · ${gleich}</p>
      <p class="today-title">${esc(next.title)}</p>
      <p class="today-meta">${meta}</p>
      <div class="today-actions">
        <a class="today-jump" href="${maps(next.place)}" target="_blank" rel="noreferrer">Route öffnen</a>
        <a class="today-more" href="#${esc(focus.day.id)}-stop-${esc(next.uid)}">Details</a>
      </div>
    </div>`;
  }
  if (focus.status === "bevorstehend") {
    const first = focus.day.stops[0];
    return `<div class="today-card" data-status="bevorstehend">
      <p class="today-eyebrow">${focus.tage === 1 ? "Morgen geht es los" : `Noch ${focus.tage} Tage`}</p>
      <p class="today-title">${esc(focus.day.label)} · ${esc(focus.day.date)}</p>
      <p class="today-meta">${first ? `Erster Stop ${esc(first.time)} · ${esc(first.title)}` : esc(focus.day.title)}</p>
    </div>`;
  }
  const letzter = focus.day.stops[focus.day.stops.length - 1];
  return `<div class="today-card" data-status="vergangen">
    <p class="today-eyebrow">${focus.alleVorbei ? "Diese Reise liegt zurück" : "Dieser Tag liegt zurück"}</p>
    <p class="today-title">${esc(focus.day.label)} · ${esc(focus.day.date)}</p>
    <p class="today-meta">${letzter ? `Letzter Stop ${esc(letzter.time)} · ${esc(letzter.title)}` : esc(focus.day.title)}</p>
  </div>`;
}

/**
 * Markiert vergangene Stops des heutigen Tages. Setzt nur ein Attribut, das
 * Aussehen macht CSS – dadurch bleibt jeder Aufklapper offen und die Achse
 * wandert im Minutentakt mit, ohne dass neu gerendert wird.
 */
function markProgress(days) {
  const iso = todayIso();
  const jetzt = nowHm();
  days.forEach((day) => {
    const heute = day.isoDate === iso;
    day.stops.forEach((stop) => {
      const card = document.getElementById(`${day.id}-stop-${stop.uid}`);
      if (card) card.dataset.past = String(heute && stop.time < jetzt);
    });
  });
}

/* ------------------------------------------- Aufklappen, Zustand, Links */

const openIds = new Set();
/** Alle Tage der geladenen Reise – die Fokuskarte rechnet daraus ihren Zustand. */
let alleTage = [];

/**
 * Gemerkt werden nur die offenen Stop-Karten. Früher stand hier zusätzlich der
 * gewählte Tag – seit alle Tage sichtbar sind, gibt es keine Auswahl mehr zu
 * merken. Ein alter Eintrag mit `day` schadet nicht, er wird ignoriert.
 */
function readState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(stateKey) ?? "{}");
    (saved.stops ?? []).forEach((id) => openIds.add(id));
  } catch { /* kein nutzbarer Zustand – dann bleibt alles zugeklappt */ }
}

function writeState() {
  try {
    sessionStorage.setItem(stateKey, JSON.stringify({ stops: [...openIds] }));
  } catch { /* privater Modus o. Ä. – Zustand ist dann nur flüchtig */ }
}

function setExpanded(toggle, expanded) {
  const details = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!details) return;
  toggle.setAttribute("aria-expanded", String(expanded));
  details.hidden = !expanded;
  if (expanded) openIds.add(details.id); else openIds.delete(details.id);
}

/**
 * Wie weit die klebenden Leisten oben reichen – **gemessen**, nicht geraten.
 *
 * Vorher rechnete `scroll-margin-top: var(--stick)` mit festen 8,6 rem. Das
 * stimmt nur bei einer Schriftgröße und ohne Safe Area; auf einem Gerät mit
 * Notch oder größerer Systemschrift sind die Leisten höher, und dann verschwindet
 * der Inhalt darunter. Die echte Unterkante kennt nur der Browser.
 */
function leistenUnterkante() {
  let unten = 0;
  for (const sel of [".topnav", ".day-tabs"]) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== "sticky" && cs.position !== "fixed") continue;
    // Die Topnav wird beim Herunterscrollen weggeschoben und ist dann
    // durchsichtig – sie belegt keinen Platz mehr.
    if (cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
    // `top` aus dem Stylesheet plus Höhe, **nicht** die aktuelle Position:
    // solange nicht gescrollt ist, steht eine sticky-Leiste noch an ihrer Stelle
    // im Dokumentfluss, oft tausende Pixel weiter unten. Damit gerechnet ergab
    // sich ein Ziel von 12 px – die Seite scrollte praktisch nach oben.
    const klebtBei = Number.parseFloat(cs.top) || 0;
    unten = Math.max(unten, klebtBei + el.getBoundingClientRect().height);
  }
  return Math.max(0, unten);
}

const SCROLL_LUFT = 14;   // etwas Platz, damit es nicht klebt

/**
 * Läuft gerade ein Scrollen, das die Seite selbst ausgelöst hat?
 *
 * Die Navigationsleiste folgt dem Finger: beim Herunterscrollen fährt sie weg,
 * beim Hochscrollen kommt sie zurück (siehe `bindNavAutoHide`). Ein Tageswechsel
 * scrollt aber meist nach oben – und das sah für die Automatik aus wie „der
 * Reisende will das Menü sehen“. Sie fuhr es ein, obwohl er es vorher
 * weggescrollt hatte. Sichtbarer Fehler: „Alle Reisen“ erscheint bei jedem
 * Tippen auf einen Tag.
 *
 * Der zweite Schaden war unsichtbar und schlimmer: die einfahrende Leiste macht
 * die Leisten höher, während das Scrollziel schon mit der alten Höhe gerechnet
 * war. Die Karte über dem Plan lag danach wieder darunter – genau der Fehler,
 * der eine Änderung vorher behoben worden war.
 *
 * Deshalb gilt: die Leiste reagiert auf den Finger, nie auf einen Sprung der
 * Seite.
 */
let scrolltSelbst = false;
let scrollWaechter = 0;

function eigenesScrollenBeginnt(strecke = 0) {
  scrolltSelbst = true;
  clearTimeout(scrollWaechter);
  // `scrollend` beendet den Zustand punktgenau. Der Zeitgeber ist die
  // Rückfallebene – für Browser ohne das Ereignis und für den Fall, dass gar
  // nicht gescrollt werden muss: dann kommt weder `scroll` noch `scrollend`.
  //
  // Die Frist hängt an der Strecke. Vorher waren es feste 1200 ms; seit alle Tage
  // gleichzeitig sichtbar sind, ist die Seite rund 10 000 px lang, und ein Sprung
  // von Tag 1 auf Tag 4 dauert länger. Die Frist lief mitten im Scrollen ab, die
  // Automatik hielt den Rest für Fingerscrollen und schob die Leiste weg — das
  // Ziel war dann mit der falschen Leistenhöhe gerechnet.
  const frist = Math.min(3000, 500 + Math.abs(strecke) / 3);
  scrollWaechter = setTimeout(() => { scrolltSelbst = false; }, frist);
}

window.addEventListener("scrollend", () => {
  clearTimeout(scrollWaechter);
  scrolltSelbst = false;
}, { passive: true });

/**
 * Scrollt ein Element unter die Leisten statt dahinter.
 *
 * `scrollIntoView` kennt nur `scroll-margin-top` und damit die feste Zahl; hier
 * wird die Strecke selbst gerechnet, nach einem Bildaufbau, damit die Höhen nach
 * dem Umschalten des Tages schon stimmen.
 */
function scrolleUnterLeisten(el) {
  if (!el) return;
  requestAnimationFrame(() => {
    const ziel = el.getBoundingClientRect().top + window.scrollY
               - leistenUnterkante() - SCROLL_LUFT;
    eigenesScrollenBeginnt(Math.max(0, ziel) - window.scrollY);
    window.scrollTo({ top: Math.max(0, ziel), behavior: "smooth" });
  });
}

/** Springt zu einem Tag. Blendet nichts aus – alle Tage bleiben sichtbar. */
function springeZuTag(id) {
  const karte = id ? document.getElementById(id) : null;
  if (!karte) return false;
  scrolleUnterLeisten(karte);
  return true;
}

/**
 * Zeichnet die Karte über dem Plan neu: den Zustand der **Reise**, nicht eines
 * gewählten Tages — Countdown davor, „Als nächstes" unterwegs, Rückblick danach.
 *
 * Sie hing früher am gewählten Tag, weil die Leiste umschaltete. Seit alle Tage
 * sichtbar sind, gibt es keine Auswahl, an der sie hängen könnte. Die Frage, die
 * sie beantwortet, ist ohnehin „wo stehe ich in dieser Reise".
 */
function fokusZeichnen() {
  const ziel = document.getElementById("fokus");
  if (ziel) ziel.innerHTML = renderFocus(focusOf(alleTage));
}

/**
 * Blendet die Navigationsleiste aus und ruft danach `weiter()` auf.
 *
 * Das Warten ist nötig, nicht kosmetisch: die Leiste hat einen 240-ms-Übergang,
 * und die Tagesleiste rückt in die frei werdende Höhe nach. Wer sofort messen
 * würde, bekäme die alte Höhe und rechnete das Scrollziel um die Leistenhöhe
 * daneben. Ohne Übergang (`prefers-reduced-motion`) ist die Wartezeit überflüssig,
 * aber unschädlich.
 */
function navAusblendenDann(weiter) {
  const nav = document.querySelector(".topnav");
  if (!nav || nav.dataset.hidden === "true") return weiter();
  nav.dataset.hidden = "true";
  document.documentElement.dataset.nav = "hidden";
  setTimeout(weiter, 260);
}

function bindTabs() {
  for (const tab of document.querySelectorAll(".day-tab")) {
    tab.addEventListener("click", (event) => {
      // Der Link bleibt ein Link, aber das Scrollen macht die Seite: der Browser
      // springt sonst hart und schiebt das Ziel unter die klebende Leiste.
      // `replaceState` statt Zuweisung an location.hash – das löst kein
      // `hashchange` aus und damit kein zweites Scrollen.
      event.preventDefault();
      history.replaceState(null, "", `#${tab.dataset.day}`);
      // Beim Tagessprung geht das Hauptmenü weg: der Reisende will den Plan
      // sehen, nicht die Navigation. Das schafft zugleich Platz und macht die
      // Leistenhöhe eindeutig, mit der das Scrollziel gerechnet wird.
      navAusblendenDann(() => springeZuTag(tab.dataset.day));
    });
  }
}

/**
 * Markiert in der Leiste den Tag, der gerade im Bild ist.
 *
 * Bewusst über die Scrollposition statt über einen IntersectionObserver: der
 * feuert in eingebetteten Ansichten ohne eigenes Compositing nicht, was bei den
 * Tagesbildern schon einmal in eine lange Fehlersuche geführt hat. Vier
 * Rechtecke pro Bildaufbau zu messen ist billig genug.
 */
function bindTagImBlick() {
  const tabs = [...document.querySelectorAll(".day-tab")];
  if (!tabs.length) return;
  const karten = tabs.map((tab) => document.getElementById(tab.dataset.day));

  let geplant = false;
  const aktualisieren = () => {
    geplant = false;
    // Gesucht ist der Tag, der die Stelle **direkt unter der Leiste** einnimmt:
    // erste Karte, deren Unterkante noch darunter liegt. Vorher war es „letzte
    // Karte, deren Oberkante schon oberhalb der Leiste liegt" — nach einem Sprung
    // steht die Zielkarte aber knapp *unter* der Leiste, und die Marke blieb beim
    // Tag davor hängen.
    const grenze = leistenUnterkante() + SCROLL_LUFT + 1;
    let treffer = karten.findIndex((karte) => karte && karte.getBoundingClientRect().bottom > grenze);
    if (treffer < 0) treffer = karten.length - 1;   // ganz unten: letzter Tag
    tabs.forEach((tab, i) => {
      if (i === treffer) tab.setAttribute("aria-current", "true");
      else tab.removeAttribute("aria-current");
    });
  };

  window.addEventListener("scroll", () => {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(aktualisieren);
  }, { passive: true });
  aktualisieren();
}

function bindToggles() {
  document.querySelectorAll(".stop-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      setExpanded(toggle, !expanded);
      writeState();
      // Beim Öffnen wird die Karte adressierbar, ohne die History zu füllen.
      if (!expanded) {
        const anchor = toggle.closest(".stop-card");
        if (anchor?.id) history.replaceState(null, "", `#${anchor.id}`);
      }
    });
  });
}

function restoreStops() {
  openIds.forEach((id) => {
    const toggle = document.querySelector(`[aria-controls="${id}"]`);
    if (toggle) setExpanded(toggle, true);
  });
}

/**
 * Öffnet das Ziel eines Deep-Links: `#tag2` wählt den Tag,
 * `#tag2-stop-08` zusätzlich den Stop, und scrollt anschließend hin.
 *
 * Der Abstand kommt aus `scrolleUnterLeisten()`, also aus den gemessenen
 * Leistenhöhen. Zeigt der Link nur auf einen Tag, ist das Ziel der Anfang des
 * Tagesblocks – sonst verschwindet die Karte darüber hinter der Leiste.
 */
function openFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (!id) return false;
  const target = document.getElementById(id);
  if (!target) return false;
  const stop = target.closest(".stop-card");
  if (stop) {
    // Absteigend suchen, nicht `:scope >`: der Knopf liegt seit der Zeitachse
    // in `.stop-main`, eine Ebene tiefer. Stop-Karten verschachteln sich nicht,
    // deshalb ist die Suche eindeutig.
    const toggle = stop.querySelector(".stop-toggle");
    if (toggle) setExpanded(toggle, true);
  }
  writeState();
  // Kein Umschalten mehr nötig: alle Tage stehen da. `#tag2` zeigt direkt auf die
  // Tageskarte, `#tag2-stop-11` auf die Stop-Karte – beides ist das Scrollziel.
  scrolleUnterLeisten(target);
  return true;
}

/* ------------------------------------------------------ Navigation */

/**
 * Blendet die Navigationsleiste beim Herunterscrollen aus und beim Hochscrollen
 * wieder ein. Sie liegt fest über dem Inhalt und ist auf schmalen Fenstern fast
 * fensterbreit – ohne das verdeckt sie beim Lesen dauerhaft eine Textzeile.
 */
function bindNavAutoHide() {
  const nav = document.querySelector(".topnav");
  if (!nav) return;

  const OBEN_FREI = 140; // im Titelbereich bleibt sie immer sichtbar
  const SCHWELLE = 6;    // kleine Bewegungen ignorieren, sonst zappelt sie
  let letzte = window.scrollY;

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (Math.abs(y - letzte) < SCHWELLE) return;
    const runter = y > letzte;
    letzte = y;
    // Ein Sprung, den die Seite selbst ausgelöst hat, lässt die Leiste in Ruhe.
    // `letzte` ist oben schon nachgezogen, damit es beim nächsten echten
    // Fingerscrollen keinen Sprung aus einer veralteten Position gibt.
    if (scrolltSelbst) return;
    // Mit Tastaturfokus in der Leiste nie ausblenden.
    const versteckt = runter && y > OBEN_FREI && !nav.contains(document.activeElement);
    nav.dataset.hidden = String(versteckt);
    // Der Zustand wandert nach oben ans Wurzelelement, damit die Tagesleiste in
    // die frei gewordene Höhe nachrücken kann – siehe --tabs-top in styles.css.
    document.documentElement.dataset.nav = versteckt ? "hidden" : "visible";
  }, { passive: true });
}

/* ---------------------------------------------------- Live-Prognose */

async function loadWeather(trip) {
  if (!trip.weather?.enabled) return;
  const status = document.querySelector("#weatherStatus");
  const grid = document.querySelector("#weatherGrid");
  const notes = trip.weather.notes ?? [];
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: trip.weather.latitude,
      longitude: trip.weather.longitude,
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
      timezone: trip.weather.timezone,
      start_date: trip.weather.startDate,
      end_date: trip.weather.endDate,
    }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();

    const byDate = new Map(data.daily.time.map((date, i) => [date, {
      date,
      code: data.daily.weather_code[i],
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
      pop: data.daily.precipitation_probability_max[i],
      wind: Math.round(data.daily.wind_speed_10m_max[i]),
    }]));

    grid.innerHTML = data.daily.time.map((date, i) => {
      const note = notes.find((n) => n.date === date)
        ?? { day: new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(new Date(`${date}T12:00:00`)), action: notes[i]?.action ?? "" };
      return weatherCard(note, byDate.get(date));
    }).join("");

    // Dieselbe Prognose in die Tageskarten bzw. in die Wetterzeile spiegeln,
    // damit dort nichts veraltet. Die Pille trägt in beiden Fällen `data-iso`.
    document.querySelectorAll(".weather-pill[data-iso]").forEach((pill) => {
      const live = byDate.get(pill.dataset.iso);
      if (!live) return;
      pill.textContent = `${live.tempMax}/${live.tempMin} °C · ${weatherLabel(live.code)} · ${live.pop ?? "–"} % Regenrisiko`;
      pill.dataset.live = "true";
    });

    status.dataset.live = "true";
    status.innerHTML = "<span>Live</span>Aktuelle Prognose geladen";
  } catch {
    status.innerHTML = "<span>Offline</span>Keine Live-Prognose – nur Planungshinweise";
  }
}

/* ------------------------------------------------------------- Offline */

/** Wartet auf Leerlauf, damit das Vorladen die Darstellung nicht ausbremst. */
const whenIdle = () => new Promise((resolve) => {
  if ("requestIdleCallback" in window) requestIdleCallback(() => resolve(), { timeout: 4000 });
  else setTimeout(resolve, 1500);
});

async function enableOffline(days) {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(`${siteRoot}sw.js`);
    // `ready` wartet auf einen aktiven Worker – beim ersten Besuch installiert er noch.
    const registration = await navigator.serviceWorker.ready;

    // Absolute URLs: im Worker würden relative Pfade gegen dessen Scope aufgelöst.
    // Nur eigene Dateien vorwaermen. Verlinkte Bilder liegen auf fremden Hosts,
    // die der Service Worker bewusst nicht anfasst - ohne Netz bleibt an ihrer
    // Stelle eine Flaeche, der Plan selbst bleibt lesbar.
    const urls = [...new Set(
      days.flatMap((day) => [day.heroImage, ...day.stops.map((stop) => stop.image)])
        .map((name) => image(name))
        .filter((url) => url && !isRemote(url))
        .map((url) => new URL(url, location.href).href)
    )];

    await whenIdle();
    registration.active?.postMessage({ type: "warm", urls });
  } catch { /* ohne Service Worker funktioniert die Seite online normal weiter */ }
}

/* ---------------------------------------------------------------- Start */

/** Verbindet die Reihenfolge aus `days[].stops` mit den Beschreibungen aus `places`. */
function joinStops(days, places) {
  return days.map((day) => ({
    ...day,
    stops: day.stops.map((stop) => {
      const place = places[stop.uid];
      if (!place) throw new Error(`Keine Ortsbeschreibung für UID ${stop.uid}`);
      return { ...place, uid: stop.uid, time: stop.time };
    }),
  }));
}

async function init() {
  // no-cache erzwingt eine Rückfrage per ETag statt zehn Minuten blindem Cache.
  // Damit wirkt eine Planänderung sofort, ohne dass die Cache-Version steigen muss.
  // Ohne Netz scheitert der Abruf und der Service Worker liefert die letzte Fassung.
  const response = await fetch(tripSource, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Reisedaten nicht erreichbar (${response.status})`);
  const data = await response.json();
  const { trip, places = {} } = data;
  // Bildverzeichnis vor dem ersten Rendern setzen — image() liest daraus.
  bilder = data.images ?? {};
  const days = joinStops(data.days, places);
  alleTage = days;
  const focus = focusOf(days);
  const laufend = focus.status === "laufend";

  document.title = `${trip.title} · ${trip.destination}`;

  const kopf = renderHero(trip, days, focus);
  const einleitung = `<section class="section intro"><p class="eyebrow">${esc(trip.introLabel ?? "Reise")}</p><h2>${esc(trip.introTitle ?? trip.destination)}</h2><p>${esc(trip.introText ?? "")}</p></section>`;
  // Unterwegs kostet der Sektionskopf eine halbe Bildschirmhöhe vor der Leiste.
  const kopfzeile = laufend ? "" : `<div class="section-head"><p class="eyebrow">Tagespläne</p><h2>${days.length} Tage, mobil lesbar</h2></div>`;
  const tage = `<section class="section day-section${laufend ? " is-running" : ""}" id="tage">${kopfzeile}${renderTabs(days)}<div id="fokus">${renderFocus(focus)}</div><div class="days">${days.map((day) => renderDay(day, laufend, trip)).join("")}</div></section>`;

  // Unterwegs zählt der Tag, davor und danach die Reise. Die Wetterzeilen stehen
  // jetzt in den Tageskarten selbst, nicht mehr als Block über dem Plan.
  root.innerHTML = (laufend
    ? `${kopf}${tage}${einleitung}${renderWeather(trip)}`
    : `${kopf}${einleitung}${renderWeather(trip)}${tage}`) + renderBildnachweis() + renderTestHint() + renderFusszeile();

  readState();
  bindTabs();
  bindToggles();
  bindNavAutoHide();
  bindTagImBlick();
  restoreStops();
  // Deep-Link gewinnt. Sonst wird nur unterwegs gescrollt – auf den heutigen Tag,
  // weil der zählt. Davor und danach beginnt die Seite oben, beim Titelbild.
  if (!openFromHash() && laufend) springeZuTag(focus.day?.id);
  window.addEventListener("hashchange", openFromHash);

  markProgress(days);
  // Im Minutentakt: die Fortschrittsachse und der Vorlauf in der Jetzt-Karte.
  // Ohne das zweite stimmt „in 25 Min." nach einer Stunde nicht mehr.
  setInterval(() => {
    markProgress(days);
    fokusZeichnen();
  }, 60000);

  loadWeather(trip);
  enableOffline(days);
}

init().catch((error) => {
  root.innerHTML = `<p class="load-error">Der Reiseplan konnte nicht geladen werden. ${esc(error.message ?? "")}</p>`;
});
