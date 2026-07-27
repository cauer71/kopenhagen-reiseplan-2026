const root = document.querySelector("#app");
const siteRoot = document.body.dataset.siteRoot ?? "./";
const tripSource = document.body.dataset.trip ?? "./data/trip.json";
const stateKey = `reiseplan:${tripSource.split("?")[0]}`;

const isRemote = (name) => String(name).startsWith("http");
const image = (name, size = 1200) => (isRemote(name) ? name : `${siteRoot}photos/web/${name}-${size}.jpg`);

/** srcset über die beiden vorhandenen Bildbreiten; externe URLs bleiben unverändert. */
const srcset = (name) => (isRemote(name) ? "" : ` srcset="${image(name, 720)} 720w, ${image(name, 1200)} 1200w"`);

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
 * Unterwegs steht das Wetter nicht in einer eigenen Sektion, sondern als eine
 * Zeile über dem Plan: Prognosepille plus die Konsequenz aus den Planungs-
 * hinweisen. Gerendert wird eine Zeile je Tag; umgeschaltet wird sie wie die
 * Tageskarten, damit `loadWeather()` die Pillen weiterhin über
 * `.weather-pill[data-iso]` findet und nichts nachgeladen werden muss.
 */
function renderWeatherLine(trip, day) {
  if (!trip.weather?.enabled || !day.isoDate) return "";
  const note = (trip.weather.notes ?? []).find((n) => n.date === day.isoDate);
  return `<div class="weather-line" data-day="${esc(day.id)}" hidden><span class="weather-pill" data-iso="${esc(day.isoDate)}">${esc(day.weather ?? "")}</span><b>${esc(note?.action ?? "")}</b></div>`;
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

function renderStop(stop, previous, dayId) {
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
  return `<article class="stop-card" id="${anchor}">
    <div class="stop-rail">
      <time class="stop-time">${esc(stop.time)}</time>
      <img class="stop-mark" src="${image(stop.image, 720)}" alt="" decoding="async">
      <span class="stop-line" aria-hidden="true"></span>
    </div>
    <div class="stop-main">
      <button class="stop-toggle" type="button" aria-expanded="false" aria-controls="${anchor}-details">
        <span class="stop-heading"><span class="stop-title" role="heading" aria-level="4">${esc(stop.title)}</span><span class="stop-chevron" aria-hidden="true">⌄</span></span>
        <span class="stop-lead">${esc(stop.detail ?? "")}</span>
        ${chipRow}
      </button>
      <div class="stop-details" id="${anchor}-details" hidden>
      <img class="stop-photo" src="${image(stop.image, 1200)}"${srcset(stop.image)} sizes="(min-width: 48rem) 62rem, 90vw" alt="${esc(stop.title)}" loading="lazy" decoding="async">
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
 * Eine Tageskarte ist kein Aufklapper mehr, sondern ein Panel: sichtbar ist
 * immer genau ein Tag, gewechselt wird über die Leiste.
 *
 * Läuft die Reise (`laufend`), fallen Tagesbild, Tagesnummer und Wetterpille
 * weg: Die Nummer steht im Kopf, das Wetter in der Zeile darüber, und das Bild
 * doppelt den Kopf. Vor und nach der Reise bleibt die Karte wie bisher.
 */
function renderDay(day, laufend = false) {
  let previous = "Unterkunft / Basis";
  const stops = day.stops.map((stop) => { const html = renderStop(stop, previous, day.id); previous = stop.title; return html; }).join("");
  const hero = laufend ? "" : `<img class="day-hero" src="${image(day.heroImage)}"${srcset(day.heroImage)} sizes="(min-width: 48rem) 60vw, 100vw" alt="${esc(day.title)}" loading="lazy" decoding="async">`;
  const kopf = laufend
    ? `<h3 class="day-title">${esc(day.title)}</h3><p class="day-note">${esc(day.note ?? "")}</p>`
    : `<p class="day-label">${esc(day.label)} · ${esc(day.date)}</p><h3 class="day-title">${esc(day.title)}</h3><p class="weather-pill" data-iso="${esc(day.isoDate ?? "")}">${esc(day.weather ?? "")}</p><p class="day-note">${esc(day.note ?? "")}</p>`;
  return `<article class="day-card ${esc(day.tone)}" id="${esc(day.id)}" role="tabpanel" aria-labelledby="tab-${esc(day.id)}" hidden>
    ${hero}
    <div class="day-body">${kopf}</div>
    <div class="day-details"><div class="stops">${stops}</div></div>
  </article>`;
}

/** Die Leiste, die den Tag wechselt. Wochentag groß, Datum klein darunter. */
function renderTabs(days) {
  const tabs = days.map((day) => {
    const [weekday, dayMonth] = String(day.date ?? "").split(" ");
    return `<button class="day-tab" type="button" role="tab" id="tab-${esc(day.id)}" aria-controls="${esc(day.id)}" aria-selected="false" data-day="${esc(day.id)}">
      <b>${esc(weekday || day.label)}</b><small>${esc(dayMonth ?? "")}</small>
    </button>`;
  }).join("");
  return `<div class="day-tabs" role="tablist" aria-label="Reisetage">${tabs}</div>`;
}

/* ------------------------------------------------------------------ Kopf */

/**
 * Der Vollbild-Hero ist ein Ankunftsbild – unterwegs kostet er zweieinhalb
 * Bildschirmhöhen bis zum ersten Stop. Läuft die Reise, schrumpft er auf einen
 * Kopf mit Tagesnummer; davor und danach bleibt er unverändert.
 */
function renderHero(trip, days, focus) {
  const nav = `<nav class="topnav" aria-label="Reiseabschnitte"><a href="${siteRoot}">Alle Reisen</a><a href="#tage">Tage</a>${trip.weather?.enabled ? '<a href="#wetter">Wetter</a>' : ""}</nav>`;
  const bild = `<img src="${image(trip.heroImage)}"${srcset(trip.heroImage)} sizes="100vw" alt="${esc(trip.destination)}" class="hero-bg" fetchpriority="high"><div class="hero-shade"></div>`;

  if (focus.status !== "laufend") {
    return `<section class="hero" id="top">${bild}${nav}<div class="hero-copy"><p class="eyebrow">${esc(trip.dates)} · ${esc(trip.travellers)}</p><h1>${esc(trip.title)}</h1><p>${esc(trip.subtitle)}</p><div class="hero-stats"><span><b>${days.length}</b>Tage</span><span><b>${days.reduce((sum, day) => sum + day.stops.length, 0)}</b>Stops</span></div></div></section>`;
  }

  const nummer = days.indexOf(focus.day) + 1;
  return `<section class="hero hero-compact" id="top">${bild}${nav}<div class="hero-copy"><p class="eyebrow">Tag ${nummer} von ${days.length} · ${esc(focus.day.date)} · ${esc(trip.travellers)}</p><h1>${esc(trip.title)}</h1></div></section>`;
}

/* -------------------------------------------------- Einstieg „heute“ */

/** Heutiges Datum als JJJJ-MM-TT in lokaler Zeit (toISOString wäre UTC). */
function todayIso() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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
  if (heute) {
    const jetzt = new Date().toTimeString().slice(0, 5);
    // `jetzt` wandert mit nach oben: die Heute-Karte rechnet daraus den Vorlauf.
    return { status: "laufend", day: heute, jetzt, next: heute.stops.find((stop) => stop.time >= jetzt) ?? null };
  }
  const kommend = dated.find((day) => day.isoDate > iso);
  if (kommend) {
    const tage = Math.round((new Date(`${kommend.isoDate}T12:00:00`) - new Date(`${iso}T12:00:00`)) / 86400000);
    return { status: "bevorstehend", day: kommend, tage };
  }
  return { status: "vergangen", day: days[0] ?? null };
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
  return `<div class="today-card" data-status="vergangen">
    <p class="today-eyebrow">Diese Reise liegt zurück</p>
    <p class="today-title">${esc(focus.day.label)} · ${esc(focus.day.date)}</p>
    <p class="today-meta">Zum Nachlesen geöffnet – den Tag wechselst du in der Leiste.</p>
  </div>`;
}

/**
 * Markiert vergangene Stops des heutigen Tages. Setzt nur ein Attribut, das
 * Aussehen macht CSS – dadurch bleibt jeder Aufklapper offen und die Achse
 * wandert im Minutentakt mit, ohne dass neu gerendert wird.
 */
function markProgress(days) {
  const iso = todayIso();
  const jetzt = new Date().toTimeString().slice(0, 5);
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
let currentDay = null;

function readState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(stateKey) ?? "{}");
    (saved.stops ?? []).forEach((id) => openIds.add(id));
    currentDay = saved.day ?? null;
  } catch { /* kein nutzbarer Zustand – dann entscheidet das Datum */ }
}

function writeState() {
  try {
    sessionStorage.setItem(stateKey, JSON.stringify({ day: currentDay, stops: [...openIds] }));
  } catch { /* privater Modus o. Ä. – Zustand ist dann nur flüchtig */ }
}

function setExpanded(toggle, expanded) {
  const details = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!details) return;
  toggle.setAttribute("aria-expanded", String(expanded));
  details.hidden = !expanded;
  if (expanded) openIds.add(details.id); else openIds.delete(details.id);
}

/** Wechselt den sichtbaren Tag. Genau einer ist immer offen. */
function selectDay(id, { scroll = false } = {}) {
  const card = id ? document.getElementById(id) : null;
  if (!card) return;
  document.querySelectorAll(".day-card").forEach((el) => { el.hidden = el.id !== id; });
  // Die Wetterzeile gehört zum Tag und wird mitgeschaltet.
  document.querySelectorAll(".weather-line").forEach((el) => { el.hidden = el.dataset.day !== id; });
  document.querySelectorAll(".day-tab").forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.day === id));
  });
  currentDay = id;
  writeState();
  if (scroll) card.scrollIntoView({ block: "start", behavior: "smooth" });
}

function bindTabs() {
  document.querySelectorAll(".day-tab").forEach((tab) => {
    tab.addEventListener("click", () => selectDay(tab.dataset.day, { scroll: true }));
  });
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
 * Der Abstand nach oben kommt aus `scroll-margin-top`, damit die Überschrift
 * nicht unter der festen Leiste verschwindet.
 */
function openFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (!id) return false;
  const target = document.getElementById(id);
  if (!target) return false;
  const day = target.closest(".day-card");
  if (day) selectDay(day.id);
  const stop = target.closest(".stop-card");
  if (stop) {
    // Absteigend suchen, nicht `:scope >`: der Knopf liegt seit der Zeitachse
    // in `.stop-main`, eine Ebene tiefer. Stop-Karten verschachteln sich nicht,
    // deshalb ist die Suche eindeutig.
    const toggle = stop.querySelector(".stop-toggle");
    if (toggle) setExpanded(toggle, true);
  }
  writeState();
  target.scrollIntoView({ block: "start", behavior: "smooth" });
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
    // Mit Tastaturfokus in der Leiste nie ausblenden.
    nav.dataset.hidden = String(runter && y > OBEN_FREI && !nav.contains(document.activeElement));
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
    const urls = [...new Set(
      days.flatMap((day) => [day.heroImage, ...day.stops.map((stop) => stop.image)])
        .filter((name) => name && !isRemote(name))
        .flatMap((name) => [image(name, 720), image(name, 1200)])
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
  const days = joinStops(data.days, places);
  const focus = focusOf(days);
  const laufend = focus.status === "laufend";

  document.title = `${trip.title} · ${trip.destination}`;

  const kopf = renderHero(trip, days, focus);
  const wetterzeilen = days.map((day) => renderWeatherLine(trip, day)).join("");
  const einleitung = `<section class="section intro"><p class="eyebrow">${esc(trip.introLabel ?? "Reise")}</p><h2>${esc(trip.introTitle ?? trip.destination)}</h2><p>${esc(trip.introText ?? "")}</p></section>`;
  // Unterwegs kostet der Sektionskopf eine halbe Bildschirmhöhe vor der Leiste.
  const kopfzeile = laufend ? "" : `<div class="section-head"><p class="eyebrow">Tagespläne</p><h2>${days.length} Tage, mobil lesbar</h2></div>`;
  const tage = `<section class="section day-section${laufend ? " is-running" : ""}" id="tage">${kopfzeile}${renderTabs(days)}${renderFocus(focus)}<div class="days">${days.map((day) => renderDay(day, laufend)).join("")}</div></section>`;

  // Unterwegs zählt der Tag, davor und danach die Reise.
  root.innerHTML = laufend
    ? `${kopf}${wetterzeilen}${tage}${einleitung}${renderWeather(trip)}`
    : `${kopf}${einleitung}${renderWeather(trip)}${tage}`;

  readState();
  bindTabs();
  bindToggles();
  bindNavAutoHide();
  restoreStops();
  // Deep-Link gewinnt; sonst der gespeicherte Tag, sonst der heutige.
  if (!openFromHash()) {
    const gespeichert = currentDay && document.getElementById(currentDay) ? currentDay : null;
    selectDay(gespeichert ?? focus.day?.id, { scroll: !gespeichert && focus.status === "laufend" });
  }
  window.addEventListener("hashchange", openFromHash);

  markProgress(days);
  setInterval(() => markProgress(days), 60000);

  loadWeather(trip);
  enableOffline(days);
}

init().catch((error) => {
  root.innerHTML = `<p class="load-error">Der Reiseplan konnte nicht geladen werden. ${esc(error.message ?? "")}</p>`;
});
