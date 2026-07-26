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

/* ----------------------------------------------------------------- Stops */

const paragraphs = (value) => (Array.isArray(value) ? value : [value]).filter(Boolean);

function renderFacts(place) {
  const facts = [
    ["Adresse", place.address],
    ["Dauer", place.duration],
    ["Eintritt", place.price],
    ["Gut zu wissen", place.tip],
  ].filter(([, value]) => value);
  if (!facts.length) return "";
  return `<dl class="stop-facts">${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`;
}

function renderStop(stop, previous, dayId) {
  const anchor = `${dayId}-stop-${stop.uid}`;
  const ticket = stop.ticketUrl ? `<div class="ticket"><b>Ticket:</b><a href="${esc(stop.ticketUrl)}" target="_blank" rel="noreferrer">Offizielle Buchung</a></div>` : "";
  const body = paragraphs(stop.description).map((text) => `<p>${esc(text)}</p>`).join("");
  return `<article class="stop-card" id="${anchor}">
    <button class="stop-toggle" type="button" aria-expanded="false" aria-controls="${anchor}-details">
      <img src="${image(stop.image, 720)}"${srcset(stop.image)} sizes="(min-width: 40rem) 13rem, 6.6rem" alt="${esc(stop.title)}" loading="lazy" decoding="async">
      <span class="stop-summary"><span class="stop-top"><time>${esc(stop.time)}</time><span class="uid">UID:${esc(stop.uid)}</span></span>
        <span class="stop-heading"><span class="stop-title" role="heading" aria-level="4">${esc(stop.title)}</span><span class="stop-chevron" aria-hidden="true">⌄</span></span>
        <span class="stop-hint">Beschreibung öffnen</span>
      </span>
    </button>
    <div class="stop-details" id="${anchor}-details" hidden>
      <p class="stop-description">${esc(stop.detail ?? "")}</p>
      <div class="stop-body">${body}</div>
      ${renderFacts(stop)}
      <p class="route">Von ${esc(previous)} · zu Fuß / ÖPNV nach ${esc(stop.title)}</p>
      <div class="stop-links"><a class="maps-link" href="${maps(stop.place)}" target="_blank" rel="noreferrer"><span class="maps-mark" aria-hidden="true"></span><span>Karte<small>Google Maps</small></span></a>${ticket}</div>
    </div>
  </article>`;
}

function renderDay(day) {
  let previous = "Unterkunft / Basis";
  const stops = day.stops.map((stop) => { const html = renderStop(stop, previous, day.id); previous = stop.title; return html; }).join("");
  return `<article class="day-card ${esc(day.tone)}" id="${esc(day.id)}">
    <button class="day-toggle" type="button" aria-expanded="false" aria-controls="${esc(day.id)}-details">
      <img class="day-hero" src="${image(day.heroImage)}"${srcset(day.heroImage)} sizes="(min-width: 900px) 45vw, 100vw" alt="${esc(day.title)}" loading="lazy" decoding="async">
      <span class="day-body"><span class="day-label">${esc(day.label)} · ${esc(day.date)}</span><span class="day-heading"><span><span class="day-title" role="heading" aria-level="3">${esc(day.title)}</span><span class="weather-pill" data-iso="${esc(day.isoDate ?? "")}">${esc(day.weather ?? "")}</span></span><span class="day-chevron" aria-hidden="true">⌄</span></span><span class="day-note">${esc(day.note ?? "")}</span><span class="day-hint">Attraktionen und Beschreibungen anzeigen</span></span>
    </button>
    <div class="day-details" id="${esc(day.id)}-details" hidden><div class="stops">${stops}</div></div>
  </article>`;
}

/* ------------------------------------------- Aufklappen, Zustand, Links */

const openIds = new Set();

function readState() {
  try {
    JSON.parse(sessionStorage.getItem(stateKey) ?? "[]").forEach((id) => openIds.add(id));
  } catch { /* kein nutzbarer Zustand – dann bleibt alles zu */ }
}

function writeState() {
  try {
    sessionStorage.setItem(stateKey, JSON.stringify([...openIds]));
  } catch { /* privater Modus o. Ä. – Zustand ist dann nur flüchtig */ }
}

function setExpanded(toggle, expanded) {
  const details = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!details) return;
  toggle.setAttribute("aria-expanded", String(expanded));
  details.hidden = !expanded;
  if (expanded) openIds.add(details.id); else openIds.delete(details.id);
}

function bindToggles() {
  document.querySelectorAll(".day-toggle, .stop-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      setExpanded(toggle, !expanded);
      writeState();
      // Beim Öffnen wird die Karte adressierbar, ohne die History zu füllen.
      if (!expanded) {
        const anchor = toggle.closest(".day-card, .stop-card");
        if (anchor?.id) history.replaceState(null, "", `#${anchor.id}`);
      }
    });
  });
}

function restoreState() {
  openIds.forEach((id) => {
    const toggle = document.querySelector(`[aria-controls="${id}"]`);
    if (toggle) setExpanded(toggle, true);
  });
}

/**
 * Öffnet das Ziel eines Deep-Links: `#tag2` klappt den Tag auf,
 * `#tag2-stop-08` zusätzlich den Stop, und scrollt anschließend hin.
 */
function openFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  const cards = [target.closest(".day-card"), target.closest(".stop-card")].filter(Boolean);
  cards.forEach((card) => {
    const toggle = card.querySelector(":scope > .day-toggle, :scope > .stop-toggle");
    if (toggle) setExpanded(toggle, true);
  });
  writeState();
  target.scrollIntoView({ block: "start", behavior: "smooth" });
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

    // Dieselbe Prognose in die Tageskarten spiegeln, damit dort nichts veraltet.
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
  const response = await fetch(tripSource);
  if (!response.ok) throw new Error(`Reisedaten nicht erreichbar (${response.status})`);
  const data = await response.json();
  const { trip, places = {} } = data;
  const days = joinStops(data.days, places);

  document.title = `${trip.title} · ${trip.destination}`;
  root.innerHTML = `<section class="hero" id="top"><img src="${image(trip.heroImage)}"${srcset(trip.heroImage)} sizes="100vw" alt="${esc(trip.destination)}" class="hero-bg" fetchpriority="high"><div class="hero-shade"></div><nav class="topnav" aria-label="Reiseabschnitte"><a href="${siteRoot}">Alle Reisen</a><a href="#tage">Tage</a>${trip.weather?.enabled ? '<a href="#wetter">Wetter</a>' : ""}</nav><div class="hero-copy"><p class="eyebrow">${esc(trip.dates)} · ${esc(trip.travellers)}</p><h1>${esc(trip.title)}</h1><p>${esc(trip.subtitle)}</p><div class="hero-stats"><span><b>${days.length}</b>Tage</span><span><b>${days.reduce((sum, day) => sum + day.stops.length, 0)}</b>Stops</span></div></div></section><section class="section intro"><p class="eyebrow">${esc(trip.introLabel ?? "Reise")}</p><h2>${esc(trip.introTitle ?? trip.destination)}</h2><p>${esc(trip.introText ?? "")}</p></section>${renderWeather(trip)}<section class="section day-section" id="tage"><div class="section-head"><p class="eyebrow">Tagespläne</p><h2>${days.length} Tage, mobil lesbar</h2></div><div class="days">${days.map(renderDay).join("")}</div></section>`;

  readState();
  bindToggles();
  restoreState();
  openFromHash();
  window.addEventListener("hashchange", openFromHash);

  loadWeather(trip);
  enableOffline(days);
}

init().catch((error) => {
  root.innerHTML = `<p class="load-error">Der Reiseplan konnte nicht geladen werden. ${esc(error.message ?? "")}</p>`;
});
