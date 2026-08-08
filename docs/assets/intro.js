/**
 * Zwei-Sekunden-Intro beim Start der App.
 *
 * Vorlage ist die Entwurfsfassung „Reiseplan Intro" aus Claude Design. Sie kam
 * als Komponente mit eigenem Laufzeitgerüst (`support.js`, `animations-v3.jsx`,
 * zusammen 124 KB) und Material Symbols vom Google-CDN. Beides ist hier nicht
 * einsetzbar: kein Framework, keine fremden Hosts, offline lesbar. Übernommen
 * sind deshalb **Komposition, Farben, Zeiten und Bewegung**, umgesetzt mit
 * CSS-Keyframes und drei selbst gezeichneten Symbolen.
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
  // Selbst gezeichnet, bewusst einfach: bei rund 30 px Kantenlänge zählt die
  // Silhouette, nicht das Detail. Ein erster Versuch mit einem detaillierten
  // Flugzeug las sich bei dieser Größe wie ein Schuh.
  abflug: '<path d="M21.4 2.6 2.9 10.3l7.3 3.5 3.5 7.3 7.7-18.5Z"/><path d="M21.4 2.6 10.2 13.8"/>',
  essen: '<path d="M7 2v9m0 0v11M4.6 2v5.4a2.4 2.4 0 0 0 4.8 0V2M17.4 22v-8.5h-1.9a.6.6 0 0 1-.6-.7l.7-8.5A2.6 2.6 0 0 1 18.2 2h.2v20Z"/>',
  foto: '<path d="M3 8.5h3.2l1.4-2.4h8.8l1.4 2.4H21a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="14" r="3.4"/>',
};

/** Die drei Stops der Zeitachse — Motiv aus dem Entwurf. */
const STOPS = [
  { symbol: "abflug", ton: "teal", zeit: "09:00" },
  { symbol: "essen", ton: "gold", zeit: "12:30" },
  { symbol: "foto", ton: "coral", zeit: "15:00" },
];

const symbol = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SYMBOLE[name]}</svg>`;

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
