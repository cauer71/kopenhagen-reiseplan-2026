const img = (name, size = 720) => `./photos/web/${name}-${size}.jpg`;

const places = {
  "Flug BGY -> CPH": "Copenhagen Airport",
  "Airport -> Gepäck": "LuggageHero Copenhagen",
  "Cafe Wilder": "Cafe Wilder Copenhagen",
  "Christianshavn Kanäle": "Christianshavn Canal Copenhagen",
  "Vor Frelsers Kirke": "Church of Our Saviour Copenhagen",
  GoBoat: "GoBoat Islands Brygge Copenhagen",
  Færgecafe: "Christianshavns Faergecafe Copenhagen",
  "Rosenborg Slot": "Rosenborg Castle Copenhagen",
  Selma: "Selma Copenhagen",
  Rundetårn: "Round Tower Copenhagen",
  Designmuseum: "Designmuseum Danmark Copenhagen",
  Frederiksstaden: "Frederiksstaden Copenhagen",
  Absalon: "Folkehuset Absalon Copenhagen",
  Fermentoren: "Fermentoren Copenhagen",
  CopenHill: "CopenHill Copenhagen",
  "Lille Bakery": "Lille Bakery Refshaleoen Copenhagen",
  "Copenhagen Contemporary": "Copenhagen Contemporary",
  "La Banchina": "La Banchina Copenhagen",
  Reffen: "Reffen Copenhagen Street Food",
  "Poulette + Pompette": "Poulette Pompette Copenhagen",
  "Check-out + Gepäck": "LuggageHero Copenhagen",
  "Christiansborg Tower": "Christiansborg Tower Copenhagen",
  "Admiralgade 26": "Admiralgade 26 Copenhagen",
  Cisternerne: "Cisternerne Copenhagen",
  Værnedamsvej: "Vaernedamsvej Copenhagen",
  "Transfer CPH": "Copenhagen Airport",
  Rückflug: "Copenhagen Airport",
};

const mapsUrl = (stop) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(places[stop] || `${stop} Copenhagen`)}`;

const days = [
  {
    id: "tag1",
    label: "Tag 1",
    date: "Mo 06.07.",
    title: "Ankommen, Christianshavn, Turm und Wasser",
    weather: "Wettercheck: Turm und Boot nur bei gutem Wind.",
    tone: "teal",
    hero: "christianshavn",
    note: "Der erste Tag bleibt weich: Gepäck weg, Christianshavn lesen, Aussicht holen und die Stadt vom Wasser aus ankommen lassen.",
    stops: [
      ["08:40", "Flug BGY -> CPH", "Früher Flug, dadurch fast ein voller Stadttag."],
      ["10:45", "Airport -> Gepäck", "Direkt in die Stadt, LuggageHero nutzen."],
      ["12:00", "Cafe Wilder", "Erster Lunch im Viertel statt Food-Hall."],
      ["13:15", "Christianshavn Kanäle", "Hausboote, Speicher, Brücken und kurzer Christiania-Rand."],
      ["16:05", "Vor Frelsers Kirke", "Signature-Moment mit spektakulärem Außenaufstieg."],
      ["17:30", "GoBoat", "Selbst fahren, Picknick-Gefühl, Stadt vom Hafen aus."],
      ["19:15", "Færgecafe", "Maritimes Abendessen, passend zum ersten Tag."],
    ],
  },
  {
    id: "tag2",
    label: "Tag 2",
    date: "Di 07.07.",
    title: "Klassiker, Design und lokaler Abend",
    weather: "Wettercheck: Bei Regen Designmuseum nach vorn ziehen.",
    tone: "gold",
    hero: "rosenborg",
    note: "Der Regentag ist gut abgesichert: Rosenborg früh, danach Rundetårn und Designmuseum als starke Indoor-Blöcke.",
    stops: [
      ["09:45", "Rosenborg Slot", "Kronjuwelen, Schlossräume und Kongens Have kompakt."],
      ["11:30", "Selma", "Modernes Smørrebrød mit Foodie-Wert."],
      ["13:00", "Rundetårn", "Spiralrampe, Altstadtblick, kurzer Klassiker."],
      ["14:25", "Designmuseum", "Danish Modern, Möbel, Grafik und Alltagsdesign."],
      ["16:00", "Frederiksstaden", "Marmorkirken, Amalienborg, Ofelia Plads."],
      ["17:30", "Absalon", "Gemeinschaftsdinner an langen Tischen."],
      ["19:45", "Fermentoren", "Craft-Beer-Abschluss in Vesterbro."],
    ],
  },
  {
    id: "tag3",
    label: "Tag 3",
    date: "Mi 08.07.",
    title: "Moderner Hafen, Kunst und Sommerwasser",
    weather: "Wettercheck: Hafenroute ist stark, aber windanfällig.",
    tone: "coral",
    hero: "copenhill",
    note: "Der modernste Tag: Kraftwerk als Stadtberg, Industrieinsel, große Installation, Hafenbad-Gefühl und Noerrebro-Abend.",
    stops: [
      ["10:00", "CopenHill", "Architektur, Aussicht und Freizeit auf dem Kraftwerk."],
      ["11:45", "Lille Bakery", "Bäckerei- und Hallen-Vibe auf Refshaleøen."],
      ["13:00", "Copenhagen Contemporary", "Großformatige Installationskunst in Industriehallen."],
      ["14:45", "La Banchina", "Holzsteg, Wasser, Naturwein, optional Baden."],
      ["16:30", "Reffen", "Kurzer Snack/Drink am Wasser, nicht Hauptdinner."],
      ["19:30", "Poulette + Pompette", "Urbaner, kleiner Noerrebro-Abschluss."],
    ],
  },
  {
    id: "tag4",
    label: "Tag 4",
    date: "Do 09.07.",
    title: "Letzter Blick, Untergrundkunst, Flughafenpuffer",
    weather: "Wettercheck: Cisternerne ist auch bei Hitze/Kälte gut.",
    tone: "navy",
    hero: "christiansborg",
    note: "Der Abreisetag bleibt kontrolliert: Gepäckstress rausnehmen, ein letzter Blick von oben und Cisternerne als besonderer Schluss.",
    stops: [
      ["10:00", "Check-out + Gepäck", "Gepäck direkt weg, Tag bleibt frei."],
      ["10:45", "Christiansborg Tower", "Kostenloser Aussichtspunkt über Slotsholmen."],
      ["12:00", "Admiralgade 26", "Bewusster letzter Lunch statt Einkaufsstraßen-Snack."],
      ["13:50", "Cisternerne", "Dunkel, feucht, kühl und atmosphärisch."],
      ["15:30", "Værnedamsvej", "Kaffee, kleine Shops, letztes Viertelgefühl."],
      ["17:15", "Transfer CPH", "Der Puffer macht den Schluss ruhig."],
      ["20:20", "Rückflug", "CPH -> BGY."],
    ],
  },
];

const fallbackWeather = [
  { date: "2026-07-06", day: "Mo", tempMax: 20, tempMin: 12, code: 3, pop: 20, wind: 18, action: "GoBoat passt, Turm nur bei gutem Wind." },
  { date: "2026-07-07", day: "Di", tempMax: 18, tempMin: 13, code: 61, pop: 65, wind: 22, action: "Designmuseum als perfekter Regenblock." },
  { date: "2026-07-08", day: "Mi", tempMax: 21, tempMin: 13, code: 2, pop: 35, wind: 31, action: "Hafenroute gut, Windjacke mitnehmen." },
  { date: "2026-07-09", day: "Do", tempMax: 24, tempMin: 12, code: 1, pop: 10, wind: 17, action: "Schöner Abreisetag, genug Flughafenpuffer." },
];

const attractions = [
  ["Vor Frelsers Kirke", "saviour", "Aussicht", "Die Turmspirale ist der große Wow-Moment: erst innen, dann draußen um die Spitze herum."],
  ["GoBoat", "goboat", "Wasser", "Kein klassisches Kanalboot, sondern ein eigenes kleines Boot mit Picknick-Tisch und langsamem Tempo."],
  ["Rosenborg Slot", "rosenborg", "Geschichte", "Schloss, Garten und Kronjuwelen funktionieren in einem kompakten Morgen."],
  ["Designmuseum", "designmuseum", "Design", "Danish Modern macht Kopenhagen greifbar: Stühle, Alltagsobjekte, Grafik, Material und Wohnkultur."],
  ["CopenHill", "copenhill", "Architektur", "Ein Müllheizkraftwerk als Berg, Skipiste und Aussichtspunkt: Kopenhagen in einem Bild."],
  ["Cisternerne", "cisternerne", "Untergrund", "Das ehemalige Wasserreservoir wirkt mehr wie Kathedrale als Museum."],
];

const food = [
  ["Cafe Wilder", "Ankommen", "Erster Lunch ohne Umweg, Christianshavn-Gefühl."],
  ["Selma", "Smørrebrød", "Moderner Lunch, saisonal und bewusster als Markthalle."],
  ["Absalon", "Local", "Der sozialste Abend im Plan: gemeinsam essen an langen Tischen."],
  ["La Banchina", "Wasser", "Kaffee, Wein, Steg, optional Baden - kein Pflichtprogramm."],
  ["Reffen", "Sommerlaut", "Als kurzer Stopp gut, als Hauptdinner weniger passend."],
  ["Admiralgade 26", "Abschluss", "Schöner letzter Lunch, wenn ihr noch einmal bewusst essen wollt."],
];

function weatherLabel(code) {
  if (code === 0) return "Klar";
  if ([1, 2].includes(code)) return "Heiter";
  if (code === 3) return "Bedeckt";
  if ([45, 48].includes(code)) return "Nebel";
  if ([51, 53, 55, 56, 57].includes(code)) return "Niesel";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Regen";
  if ([95, 96, 99].includes(code)) return "Gewitter";
  return "Wechselhaft";
}

function renderWeather(items, live, statusText) {
  const status = document.querySelector("#weatherStatus");
  status.dataset.live = live ? "true" : "false";
  status.innerHTML = `<span>${live ? "Live" : "Fallback"}</span>${statusText}`;
  document.querySelector("#weatherGrid").innerHTML = items
    .map((item) => `<article class="weather-card"><span>${item.day}</span><strong>${item.tempMax}/${item.tempMin} °C</strong><b>${weatherLabel(item.code)}</b><p>${item.pop ?? "-"}% Regen · Wind ${item.wind} km/h</p><p>${item.action}</p></article>`)
    .join("");
}

async function loadWeather() {
  renderWeather(fallbackWeather, false, "Lade aktuelle Prognose ...");
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: "55.6761",
      longitude: "12.5683",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
      timezone: "Europe/Copenhagen",
      start_date: "2026-07-06",
      end_date: "2026-07-09",
    }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    const labels = ["Mo", "Di", "Mi", "Do"];
    const items = data.daily.time.map((date, index) => {
      const item = {
        date,
        day: labels[index],
        code: data.daily.weather_code[index],
        tempMax: Math.round(data.daily.temperature_2m_max[index]),
        tempMin: Math.round(data.daily.temperature_2m_min[index]),
        pop: data.daily.precipitation_probability_max[index],
        wind: Math.round(data.daily.wind_speed_10m_max[index]),
        action: fallbackWeather[index].action,
      };
      if (item.pop >= 55) item.action = "Indoor-Blöcke nach vorn ziehen: Museum, CC oder längerer Lunch.";
      else if (item.wind >= 30) item.action = "Hafen und CopenHill bleiben stark, aber Windjacke einpacken.";
      else if (item.tempMax >= 23) item.action = "Wasserpausen und La-Banchina-Zeit bewusst offen halten.";
      return item;
    });
    renderWeather(items, true, `Live geladen: ${new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`);
  } catch {
    renderWeather(fallbackWeather, false, "Fallback-Prognose aktiv. Bei Netz bitte neu laden.");
  }
}

function renderDays() {
  document.querySelector("#days").innerHTML = days
    .map((day) => `<article class="day-card ${day.tone}" id="${day.id}"><img src="${img(day.hero)}" alt=""><div class="day-body"><p class="day-label">${day.label} · ${day.date}</p><h3>${day.title}</h3><p class="weather-pill">${day.weather}</p><p>${day.note}</p><ol>${day.stops.map(([time, stop, detail]) => `<li><time>${time}</time><span class="stop-copy"><b>${stop}</b>${detail}</span><a class="maps-link" href="${mapsUrl(stop)}" target="_blank" rel="noreferrer"><span class="maps-mark" aria-hidden="true"></span><span>Karte<small>Google Maps</small></span></a></li>`).join("")}</ol></div></article>`)
    .join("");
}

function renderCards() {
  document.querySelector("#attractions").innerHTML = attractions
    .map(([title, image, tag, text]) => `<article class="attraction"><img src="${img(image)}" alt=""><div><span>${tag}</span><h3>${title}</h3><p>${text}</p></div></article>`)
    .join("");
  document.querySelector("#food").innerHTML = food
    .map(([place, role, why]) => `<article><b>${place}</b><span>${role}</span><p>${why}</p></article>`)
    .join("");
}

renderDays();
renderCards();
loadWeather();
