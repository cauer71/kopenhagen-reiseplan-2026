import WeatherWidget from "./WeatherWidget";

const img = (name: string, size = 1200) => `/photos/web/${name}-${size}.jpg`;

const mapsUrl = (stop: string) => {
  const places: Record<string, string> = {
    "Flug BGY -> CPH": "Copenhagen Airport",
    "Airport -> Gepäck": "LuggageHero Copenhagen",
    "Cafe Wilder": "Cafe Wilder Copenhagen",
    "Christianshavn Kanäle": "Christianshavn Canal Copenhagen",
    "Vor Frelsers Kirke": "Church of Our Saviour Copenhagen",
    "GoBoat": "GoBoat Islands Brygge Copenhagen",
    "Færgecafe": "Christianshavns Faergecafe Copenhagen",
    "Rosenborg Slot": "Rosenborg Castle Copenhagen",
    "Selma": "Selma Copenhagen",
    "Rundetårn": "Round Tower Copenhagen",
    "Designmuseum": "Designmuseum Danmark Copenhagen",
    "Frederiksstaden": "Frederiksstaden Copenhagen",
    "Absalon": "Folkehuset Absalon Copenhagen",
    "Fermentoren": "Fermentoren Copenhagen",
    "CopenHill": "CopenHill Copenhagen",
    "Lille Bakery": "Lille Bakery Refshaleoen Copenhagen",
    "Copenhagen Contemporary": "Copenhagen Contemporary",
    "La Banchina": "La Banchina Copenhagen",
    "Reffen": "Reffen Copenhagen Street Food",
    "Poulette + Pompette": "Poulette Pompette Copenhagen",
    "Check-out + Gepäck": "LuggageHero Copenhagen",
    "Christiansborg Tower": "Christiansborg Tower Copenhagen",
    "Admiralgade 26": "Admiralgade 26 Copenhagen",
    "Cisternerne": "Cisternerne Copenhagen",
    "Værnedamsvej": "Vaernedamsvej Copenhagen",
    "Transfer CPH": "Copenhagen Airport",
    "Rückflug": "Copenhagen Airport",
  };
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    places[stop] ?? `${stop} Copenhagen`,
  )}`;
};

const days = [
  {
    id: "tag1",
    label: "Tag 1",
    date: "Mo 06.07.",
    title: "Ankommen, Christianshavn, Turm und Wasser",
    weather: "Wettercheck: Turm und Boot nur bei gutem Wind.",
    tone: "teal",
    hero: "christianshavn",
    note:
      "Der erste Tag bleibt weich: Gepäck weg, Christianshavn lesen, Aussicht holen und die Stadt vom Wasser aus ankommen lassen.",
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
    note:
      "Der Regentag ist gut abgesichert: Rosenborg früh, danach Rundetårn und Designmuseum als starke Indoor-Blöcke.",
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
    note:
      "Der modernste Tag: Kraftwerk als Stadtberg, Industrieinsel, große Installation, Hafenbad-Gefühl und Noerrebro-Abend.",
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
    note:
      "Der Abreisetag bleibt kontrolliert: Gepäckstress rausnehmen, ein letzter Blick von oben und Cisternerne als besonderer Schluss.",
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

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <img src={img("aerial")} alt="Kopenhagen von oben" className="hero-bg" />
        <div className="hero-shade" />
        <nav className="topnav" aria-label="Reiseabschnitte">
          <a href="#tage">Tage</a>
          <a href="#wetter">Wetter</a>
          <a href="#karte">Karte</a>
          <a href="#essen">Essen</a>
        </nav>
        <div className="hero-copy">
          <p className="eyebrow">06.-09. Juli 2026 · Christian & Silke</p>
          <h1>Kopenhagen mobil</h1>
          <p>
            Ein besserer Reiseplan fürs Handy: große Bilder, klare Tageslogik,
            Wetterentscheidungen, Route und kurze Erklärungen zu den Orten.
          </p>
          <div className="hero-stats" aria-label="Reise Kennzahlen">
            <span><b>4</b>Tage</span>
            <span><b>20+</b>Stops</span>
            <span><b>6</b>Kernorte</span>
          </div>
        </div>
      </section>

      <section className="section intro">
        <p className="eyebrow">Leselogik</p>
        <h2>Nicht nur Ablauf, sondern Reisegefühl.</h2>
        <p>
          Der Plan nutzt Christianshavn als ruhigen Anker, setzt Klassiker
          gezielt ein und lässt am dritten Tag Kopenhagens moderne Hafenseite
          wirken. Alles ist so sortiert, dass ihr unterwegs schnell entscheiden
          könnt: machen, tauschen oder kürzen.
        </p>
      </section>

      <section className="section weather-section" id="wetter">
        <div className="section-head">
          <p className="eyebrow">Aktuelle Prognose</p>
          <h2>Wetterfenster für die Route</h2>
          <p>Die Daten werden beim Öffnen live für Kopenhagen geladen. Falls der Abruf scheitert, bleibt eine sichere Fallback-Prognose sichtbar.</p>
        </div>
        <WeatherWidget />
      </section>

      <section className="section map-section" id="karte">
        <div className="section-head">
          <p className="eyebrow">Landkarte</p>
          <h2>Schöne Routenkarte fürs Handy</h2>
          <p>
            Echte Kartenbasis mit Tagespins, Wasser, Stadtteilen und den langen
            Sprüngen zum Flughafen. Die einzelnen Stops öffnen zusätzlich direkt
            in Google Maps.
          </p>
        </div>
        <figure className="real-map">
          <img src="/route-map-copenhagen.jpg" alt="Kopenhagen Stadtkarte mit Tagespins und Routenverbindungen" />
          <figcaption>Kartendaten © OpenStreetMap-Mitwirkende. Eigene Tagespins und Routenlinien.</figcaption>
        </figure>
      </section>

      <section className="section day-section" id="tage">
        <div className="section-head">
          <p className="eyebrow">Tagespläne</p>
          <h2>Vier Tage, mobil lesbar</h2>
        </div>
        <div className="days">
          {days.map((day) => (
            <article className={`day-card ${day.tone}`} id={day.id} key={day.id}>
              <img src={img(day.hero, 720)} alt="" />
              <div className="day-body">
                <p className="day-label">{day.label} · {day.date}</p>
                <h3>{day.title}</h3>
                <p className="weather-pill">{day.weather}</p>
                <p>{day.note}</p>
                <ol>
                  {day.stops.map(([time, stop, detail]) => (
                    <li key={`${day.id}-${time}-${stop}`}>
                      <time>{time}</time>
                      <span className="stop-copy">
                        <b>{stop}</b>
                        {detail}
                      </span>
                      <a className="maps-link" href={mapsUrl(stop)} target="_blank" rel="noreferrer">
                        <span className="maps-mark" aria-hidden="true" />
                        <span>
                          Karte
                          <small>Google Maps</small>
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section gallery-section">
        <div className="section-head">
          <p className="eyebrow">Attraktionen</p>
          <h2>Warum diese Orte drin sind</h2>
        </div>
        <div className="attraction-grid">
          {attractions.map(([title, image, tag, text]) => (
            <article className="attraction" key={title}>
              <img src={img(image, 720)} alt="" />
              <div>
                <span>{tag}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section food-section" id="essen">
        <div className="split-images">
          <img src={img("reffen", 720)} alt="Reffen Street Food" />
          <img src={img("refshaleoen", 720)} alt="Refshaleøen am Wasser" />
        </div>
        <div className="section-head">
          <p className="eyebrow">Essen</p>
          <h2>Gastro-Route statt Touristenfalle</h2>
          <p>Jeder Essensstopp hat eine Aufgabe: ankommen, lokal werden, Wasser spüren oder sauber abschließen.</p>
        </div>
        <div className="food-list">
          {food.map(([place, role, why]) => (
            <article key={place}>
              <b>{place}</b>
              <span>{role}</span>
              <p>{why}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section source-section">
        <p className="eyebrow">Quellen</p>
        <h2>Recherche und Bilder</h2>
        <p>
          Faktenquellen: offizielle Seiten von Vor Frelsers Kirke, Rosenborg,
          Rundetårn, Designmuseum Danmark, CopenHill, GoBoat, Cisternerne,
          Reffen und VisitCopenhagen. Wetter: live über Open-Meteo im Browser.
          Bilder: Wikimedia Commons und ein offizielles
          Frederiksbergmuseerne-Motiv für Cisternerne.
        </p>
      </section>
    </main>
  );
}
