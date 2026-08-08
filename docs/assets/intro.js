/**
 * Zwei-Sekunden-Intro beim Start der App.
 *
 * Vorlage ist die Entwurfsfassung „Reiseplan Intro" aus Claude Design. Sie kam
 * als Komponente mit eigenem Laufzeitgerüst (`support.js`, `animations-v3.jsx`,
 * zusammen 124 KB) und Material Symbols vom Google-CDN. Beides ist hier nicht
 * einsetzbar: kein Framework, keine fremden Hosts, offline lesbar. Die Symbole
 * sind dieselben, nur als Pfade eingebettet statt als Schrift geladen. Übernommen
 * sind deshalb **Komposition, Farben, Zeiten und Bewegung**, umgesetzt mit
 * CSS-Keyframes und den Material-Symbols-Glyphen als eingebettete Pfade.
 *
 * Vier Szenen, zusammen 2,0 s — die Namen stammen aus dem Entwurf:
 *
 *   Aufschlag  0,00–0,45  erster Stop fällt von oben ein, ein Ring läuft aus
 *   Route      0,45–0,95  die Achse wächst nach unten, zwei Stops rasten ein
 *   Titel      0,95–1,70  Wortmarke setzt sich, ein Strich zieht darunter auf
 *   Übergabe   1,70–2,00  alles hebt ab und blendet auf den Seitengrund
 *
 * Die Lebensdauer hängt **an CSS**, nicht an diesem Skript: die Animation endet
 * mit `opacity: 0` und `pointer-events: none`. Bliebe das Aufräumen hier hängen,
 * wäre die Seite trotzdem bedienbar — ein Intro, das sich festfrisst, wäre
 * schlimmer als keins.
 */

/** Einmal je Sitzung. Ein Wechsel von der Startseite zu einer Reise ist ein
 *  neuer Seitenaufruf; ohne das liefe das Intro bei jedem Tippen erneut. */
const SCHLUESSEL = "reiseplan:intro";

const SYMBOLE = {
  // Die echten Glyphen aus **Material Symbols Rounded** — dieselben, die der
  // Entwurf benutzt: flight_takeoff, restaurant, photo_camera.
  //
  // Als Pfade eingebettet statt als Schrift vom Google-CDN geladen: die Seite
  // bindet keine fremden Hosts ein und muss offline lesbar bleiben. Eine erste
  // Fassung mit selbst gezeichneten Symbolen war nur eine Annäherung — aus
  // flight_takeoff war dabei ein Papierflieger geworden, also ein anderes Symbol.
  //
  // Quelle: github.com/google/material-design-icons, Apache License 2.0.
  // Der Lizenztext liegt als docs/icons/MATERIAL-SYMBOLS-LICENSE.txt bei.
  abflug: "<path d=\"M800-120H160q-17 0-28.5-11.5T120-160q0-17 11.5-28.5T160-200h640q17 0 28.5 11.5T840-160q0 17-11.5 28.5T800-120ZM212-464l192-52-139-236q-8-14-3-30t22-21l17-5q9-3 18-1t16 8l259 233 200-54q32-9 58 12t26 56q0 22-13.5 39T830-492L223-328q-13 4-25-1t-19-17L98-484q-7-11-1.5-23t18.5-14l15-3q6-1 11 .5t10 5.5l61 54Z\"/>",
  essen: "<path d=\"M280-600v-240q0-17 11.5-28.5T320-880q17 0 28.5 11.5T360-840v240h40v-240q0-17 11.5-28.5T440-880q17 0 28.5 11.5T480-840v240q0 56-34.5 98T360-446v326q0 17-11.5 28.5T320-80q-17 0-28.5-11.5T280-120v-326q-51-14-85.5-56T160-600v-240q0-17 11.5-28.5T200-880q17 0 28.5 11.5T240-840v240h40Zm400 200h-80q-17 0-28.5-11.5T560-440v-240q0-70 51.5-135T718-880q18 0 30 14t12 33v713q0 17-11.5 28.5T720-80q-17 0-28.5-11.5T680-120v-280Z\"/>",
  foto: "<path d=\"M480-260q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM160-120q-33 0-56.5-23.5T80-200v-480q0-33 23.5-56.5T160-760h126l50-54q11-12 26.5-19t32.5-7h170q17 0 32.5 7t26.5 19l50 54h126q33 0 56.5 23.5T880-680v480q0 33-23.5 56.5T800-120H160Zm0-80h640v-480H638l-73-80H395l-73 80H160v480Zm320-240Z\"/>",
};

/** Die drei Stops der Zeitachse — Motiv aus dem Entwurf. */
const STOPS = [
  { symbol: "abflug", ton: "teal", zeit: "09:00" },
  { symbol: "essen", ton: "gold", zeit: "12:30" },
  { symbol: "foto", ton: "coral", zeit: "15:00" },
];

const symbol = (name) =>
  // Material Symbols zeichnen im Koordinatenfeld 0 -960 960 960 und sind
  // gefüllt, nicht gestrichelt.
  `<svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">${SYMBOLE[name]}</svg>`;

function markup() {
  const stops = STOPS.map((s, i) => `
    <div class="intro-stop" data-ton="${s.ton}" style="--i:${i}">
      <span class="intro-zeit">${s.zeit}</span>
      <span class="intro-marke">${symbol(s.symbol)}</span>
    </div>`).join("");

  return `<div class="intro" id="intro" role="presentation" aria-hidden="true">
    <div class="intro-buehne">
      <div class="intro-achse">
        <span class="intro-linie"></span>
        <span class="intro-ring"></span>
        ${stops}
      </div>
      <p class="intro-eyebrow">Tag für Tag</p>
      <p class="intro-wort">Reiseplan</p>
      <span class="intro-strich"></span>
    </div>
  </div>`;
}

/**
 * Zeigt das Intro, sofern es in dieser Sitzung noch nicht lief und der Nutzer
 * keine reduzierte Bewegung verlangt hat. Ein zweisekündiger Vorspann ist genau
 * das, was diese Einstellung meint.
 */
export function introStarten() {
  const wenigerBewegung = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let schonGelaufen = false;
  try { schonGelaufen = sessionStorage.getItem(SCHLUESSEL) === "1"; } catch { /* privater Modus */ }
  if (wenigerBewegung || schonGelaufen) return;

  try { sessionStorage.setItem(SCHLUESSEL, "1"); } catch { /* dann eben jedes Mal */ }
  document.body.insertAdjacentHTML("afterbegin", markup());

  const el = document.getElementById("intro");
  if (!el) return;
  // Nach dem Verblassen aus dem Dokument nehmen. Der Zeitgeber ist die
  // Rückfallebene, falls `animationend` ausbleibt — etwa wenn der Tab im
  // Hintergrund lag und der Browser die Animation nie startete.
  const weg = () => el.remove();
  el.addEventListener("animationend", (e) => { if (e.animationName === "intro-uebergabe") weg(); });
  setTimeout(weg, 4000);
}
