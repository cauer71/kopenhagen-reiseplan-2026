/**
 * Testparameter-Seite.
 *
 * Die Links werden aus den echten Reisedaten erzeugt, nicht eingetippt: sonst
 * zeigen sie nach der nächsten Planänderung auf Tage, die es nicht mehr gibt.
 */

const root = document.querySelector("#app");
const esc = (v = "") => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const pad = (n) => String(n).padStart(2, "0");
const heuteIso = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};

/** Ein Tag vor bzw. nach einem ISO-Datum. */
const verschoben = (iso, tage) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + tage);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function json(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

const link = (href, text, hinweis = "") =>
  `<li><a href="${esc(href)}">${esc(text)}</a>${hinweis ? ` <span>${esc(hinweis)}</span>` : ""}</li>`;

function reiseBlock(entry, daten) {
  const tage = (daten.days ?? []).filter((d) => d.isoDate);
  if (!tage.length) return "";
  const basis = `../trips/${encodeURIComponent(entry.slug)}/`;
  const erster = tage[0].isoDate;
  const letzter = tage[tage.length - 1].isoDate;

  const perTag = tage.map((t) => {
    const ersterStop = t.stops?.[0]?.time;
    const mitte = t.stops?.[Math.floor((t.stops.length - 1) / 2)]?.time;
    const q = `${basis}?heute=${t.isoDate}${mitte ? `&jetzt=${mitte}` : ""}`;
    return link(q, `${t.label} · ${t.date}`,
      mitte ? `als laufender Tag, Uhrzeit ${mitte}` : "als laufender Tag");
  }).join("");

  const zustaende = [
    link(`${basis}?heute=${verschoben(erster, -40)}`, "Lange vor der Reise", "Countdown, Tag 1 vorausgewählt"),
    link(`${basis}?heute=${verschoben(erster, -1)}`, "Tag vor der Abreise", "„Morgen geht es los“"),
    link(`${basis}?heute=${erster}&jetzt=05:00`, "Erster Tag, vor dem ersten Stop", "voller Vorlauf"),
    link(`${basis}?heute=${letzter}&jetzt=23:30`, "Letzter Tag, nach dem letzten Stop", "„Tagesprogramm durch“"),
    link(`${basis}?heute=${verschoben(letzter, 5)}`, "Nach der Reise", "Rückblick"),
    link(basis, "Echte Zeit", "ohne Parameter"),
  ].join("");

  const tief = tage.slice(0, 2).map((t) => {
    const uid = t.stops?.[0]?.uid;
    return uid ? link(`${basis}#${t.id}-stop-${uid}`, `${t.label}, erster Stop aufgeklappt`, `#${t.id}-stop-${uid}`) : "";
  }).filter(Boolean).join("");

  return `<section>
    <h2>${esc(daten.trip?.destination ?? entry.slug)} <span class="sub">${esc(daten.trip?.dates ?? "")}</span></h2>
    <h3>Zustände</h3><ul>${zustaende}</ul>
    <h3>Jeden Tag als laufenden Tag</h3><ul>${perTag}</ul>
    ${tief ? `<h3>Deep-Links</h3><ul>${tief}</ul>` : ""}
  </section>`;
}

async function init() {
  const index = await json("../data/trips/index.json");
  const eintraege = index.trips ?? [];
  const geladen = [];
  for (const entry of eintraege) {
    try { geladen.push({ entry, daten: await json(`../data/trips/${entry.slug}.json`) }); }
    catch { /* eine defekte Reise soll die Seite nicht leeren */ }
  }

  const heute = heuteIso();
  const start = [
    link(`../?heute=${heute}`, "Startseite, echtes Datum", ""),
    ...geladen.flatMap(({ daten }) => {
      const t = (daten.days ?? []).filter((d) => d.isoDate);
      if (!t.length) return [];
      return [
        link(`../?heute=${t[0].isoDate}`, `Startseite, ${daten.trip?.destination} läuft gerade`, "Kachel muss oben stehen"),
        link(`../?heute=${verschoben(t[t.length - 1].isoDate, 30)}`, `Startseite, ${daten.trip?.destination} liegt zurück`, "Kachel entsättigt, unten"),
      ];
    }),
  ].join("");

  root.innerHTML = `<main class="testseite">
    <p class="eyebrow">Reiseplaner</p>
    <h1>Testparameter</h1>
    <p class="vorwort">Der Unterwegs-Zustand der Seite ist im Alltag <strong>unsichtbar</strong> —
      ein Fehler darin fiele erst im Urlaub auf. Deshalb lassen sich Datum und Uhrzeit
      über die Adresse setzen. Das funktioniert auch auf der Live-Seite und damit
      auf dem Handy, ohne Code zu ändern.</p>

    <table>
      <thead><tr><th>Parameter</th><th>Format</th><th>Wirkung</th></tr></thead>
      <tbody>
        <tr><td><code>heute</code></td><td><code>JJJJ-MM-TT</code></td>
            <td>setzt das Datum. Bestimmt, welcher Tag als laufend gilt und wie die Startseite sortiert.</td></tr>
        <tr><td><code>jetzt</code></td><td><code>HH:MM</code></td>
            <td>setzt die Uhrzeit. Bestimmt den nächsten Stop und den Vorlauf. Nur auf Reiseseiten.</td></tr>
      </tbody>
    </table>

    <p class="hinweis"><strong>Ein Tippfehler wird ignoriert</strong>, nicht geraten:
      nur genau diese beiden Formate werden angenommen. Ein falsch geschriebenes Datum
      führt also nicht stillschweigend auf einen anderen Tag, sondern zur echten Zeit.
      Ist ein Wert gesetzt, erscheint unten ein roter Hinweis „Testansicht“ mit einem
      Link zurück.</p>

    <section>
      <h2>Startseite</h2>
      <h3>Sortierung prüfen</h3><ul>${start}</ul>
    </section>

    ${geladen.map(({ entry, daten }) => reiseBlock(entry, daten)).join("")}

    <section>
      <h2>Was hier nicht steht</h2>
      <p>Es gibt keinen <code>?v=</code>-Parameter mehr und keine Cache-Version, die
        von Hand anzuheben wäre. Der Service Worker fragt bei jeder Datei nach, ob
        sie sich geändert hat; unverändertes kommt als 304 zurück. Eine neue
        Reisedatei ist damit sofort sichtbar.</p>
      <p>Auch keine Liste der Reisen: was in <code>docs/data/trips/</code> als
        <code>.json</code> liegt, erscheint. Eine Datei mehr heißt eine Reise mehr,
        eine gelöschte Datei eine Reise weniger.</p>
      <p>Beim Testen im Browser kann der Service Worker trotzdem stören, wenn er aus
        einer älteren Fassung stammt: in den DevTools unter
        <em>Application → Service Workers</em> „Update on reload“ aktivieren oder mit
        Strg+Shift+R neu laden.</p>
    </section>

    <p class="zurueck"><a href="../">Zurück zur Übersicht</a></p>
  </main>`;
}

init().catch((e) => {
  root.innerHTML = `<p class="load-error">Die Testseite konnte nicht geladen werden. ${esc(e.message ?? "")}</p>`;
});
