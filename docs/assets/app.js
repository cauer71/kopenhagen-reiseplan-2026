const root = document.querySelector("#app");
const siteRoot = document.body.dataset.siteRoot ?? "./";
const image = (name, size = 1200) => String(name).startsWith("http") ? name : `${siteRoot}photos/web/${name}-${size}.jpg`;
const maps = (place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

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

const esc = (value = "") => String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

function renderWeather(trip) {
  if (!trip.weather?.enabled) return "";
  const fallback = trip.weather.fallback ?? [];
  return `<section class="section weather-section" id="wetter">
    <div class="section-head"><p class="eyebrow">Aktuelle Prognose</p><h2>Wetterfenster für die Route</h2><p>Die Prognose wird beim Öffnen live geladen. Falls der Abruf scheitert, bleibt eine Fallback-Prognose sichtbar.</p></div>
    <div class="weather-status" id="weatherStatus" data-live="false"><span>Fallback</span>Lade aktuelle Prognose …</div>
    <div class="weather-grid" id="weatherGrid">${fallback.map(weatherCard).join("")}</div>
  </section>`;
}

function weatherCard(item) {
  return `<article class="weather-card"><span>${esc(item.day)}</span><strong>${item.tempMax}/${item.tempMin} °C</strong><b>${weatherLabel(item.code)}</b><p>${item.pop ?? "–"}% Regen · Wind ${item.wind ?? "–"} km/h</p><p>${esc(item.action ?? "")}</p></article>`;
}

function renderStop(stop, previous) {
  const ticket = stop.ticketUrl ? `<div class="ticket"><b>Ticket:</b><a href="${esc(stop.ticketUrl)}" target="_blank" rel="noreferrer">Offizielle Buchung</a></div>` : "";
  return `<article class="stop-card">
    <img src="${image(stop.image, 720)}" alt="${esc(stop.title)}" loading="lazy">
    <div class="stop-copy"><div class="stop-top"><time>${esc(stop.time)}</time><span class="uid">UID:${esc(stop.uid)}</span></div>
      <h4>${esc(stop.title)}</h4><p>${esc(stop.detail ?? "")}</p>
      <p class="route">Von ${esc(previous)} · zu Fuß / ÖPNV nach ${esc(stop.title)}</p>
      <div class="stop-links"><a class="maps-link" href="${maps(stop.place)}" target="_blank" rel="noreferrer"><span class="maps-mark" aria-hidden="true"></span><span>Karte<small>Google Maps</small></span></a>${ticket}</div>
    </div>
  </article>`;
}

function renderDay(day) {
  let previous = "Unterkunft / Basis";
  const stops = day.stops.map((stop) => { const html = renderStop(stop, previous); previous = stop.title; return html; }).join("");
  return `<article class="day-card ${esc(day.tone)}" id="${esc(day.id)}"><img class="day-hero" src="${image(day.heroImage)}" alt="${esc(day.title)}"><div class="day-body"><p class="day-label">${esc(day.label)} · ${esc(day.date)}</p><h3>${esc(day.title)}</h3><p class="weather-pill">${esc(day.weather ?? "")}</p><p>${esc(day.note ?? "")}</p><div class="stops">${stops}</div></div></article>`;
}

async function loadWeather(trip) {
  if (!trip.weather?.enabled) return;
  const status = document.querySelector("#weatherStatus");
  const grid = document.querySelector("#weatherGrid");
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({ latitude: trip.weather.latitude, longitude: trip.weather.longitude, daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max", timezone: trip.weather.timezone, start_date: trip.weather.startDate, end_date: trip.weather.endDate }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    const fallback = trip.weather.fallback ?? [];
    const items = data.daily.time.map((date, index) => ({ date, day: fallback[index]?.day ?? new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(new Date(`${date}T12:00:00`)), code: data.daily.weather_code[index], tempMax: Math.round(data.daily.temperature_2m_max[index]), tempMin: Math.round(data.daily.temperature_2m_min[index]), pop: data.daily.precipitation_probability_max[index], wind: Math.round(data.daily.wind_speed_10m_max[index]), action: fallback[index]?.action ?? "" }));
    grid.innerHTML = items.map(weatherCard).join(""); status.dataset.live = "true"; status.innerHTML = "<span>Live</span>Aktuelle Prognose geladen";
  } catch { status.innerHTML = "<span>Fallback</span>Fallback-Prognose aktiv"; }
}

async function init() {
  const response = await fetch(document.body.dataset.trip ?? "./data/trip.json");
  const data = await response.json();
  const { trip, days } = data;
  document.title = `${trip.title} · ${trip.destination}`;
  root.innerHTML = `<section class="hero" id="top"><img src="${image(trip.heroImage)}" alt="${esc(trip.destination)}" class="hero-bg"><div class="hero-shade"></div><nav class="topnav" aria-label="Reiseabschnitte"><a href="${siteRoot}">Alle Reisen</a><a href="#tage">Tage</a>${trip.weather?.enabled ? '<a href="#wetter">Wetter</a>' : ""}</nav><div class="hero-copy"><p class="eyebrow">${esc(trip.dates)} · ${esc(trip.travellers)}</p><h1>${esc(trip.title)}</h1><p>${esc(trip.subtitle)}</p><div class="hero-stats"><span><b>${days.length}</b>Tage</span><span><b>${days.reduce((sum, day) => sum + day.stops.length, 0)}</b>Stops</span></div></div></section><section class="section intro"><p class="eyebrow">${esc(trip.introLabel ?? "Reise")}</p><h2>${esc(trip.introTitle ?? trip.destination)}</h2><p>${esc(trip.introText ?? "")}</p></section>${renderWeather(trip)}<section class="section day-section" id="tage"><div class="section-head"><p class="eyebrow">Tagespläne</p><h2>${days.length} Tage, mobil lesbar</h2></div><div class="days">${days.map(renderDay).join("")}</div></section>`;
  loadWeather(trip);
}

init().catch(() => { root.innerHTML = "<p class=\"load-error\">Der Reiseplan konnte nicht geladen werden.</p>"; });
