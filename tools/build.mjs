#!/usr/bin/env node
/**
 * Baut die Seite aus den Reisedateien. Läuft in der GitHub-Action, nicht am PC.
 *
 * Der Ablauf, den dieses Skript möglich macht:
 *
 *     eine .json nach docs/data/trips/ legen   ->  eine Reise mehr
 *     eine .json dort löschen                  ->  eine Reise weniger
 *
 * Sonst nichts. Kein Eintrag in einer Liste, keine Unterseite von Hand, kein
 * Werkzeug am eigenen Rechner. Was die Seite braucht und nicht in der Reisedatei
 * steht, entsteht hier:
 *
 *   docs/data/trips/index.json      – welche Reisen es gibt (die Startseite kann
 *                                     ein Verzeichnis nicht auflisten; GitHub
 *                                     Pages liefert nur Dateien, kein Listing)
 *   docs/trips/<slug>/index.html    – die Hülle je Reise, mit Titel, Farbe und
 *                                     Vorschaubild aus der Reisedatei
 *
 * Beides ist **erzeugt und nicht eingecheckt** (siehe .gitignore). Damit kann es
 * nicht auseinanderlaufen: früher lag eine Reisedatei im Repo, stand aber nicht
 * in index.json – und war unsichtbar, ohne dass etwas fehlschlug.
 *
 * Aufrufe
 *   node tools/build.mjs            prüfen und erzeugen
 *   node tools/build.mjs --check    nur prüfen, nichts schreiben (Pull Requests)
 *   node tools/build.mjs --bilder   prüfen und jede Bild-URL abrufen, nichts
 *                                   schreiben (braucht Netz, eigener Schritt in
 *                                   der Action, der nicht blockieren darf)
 *
 * Exit-Code 1, sobald eine Reisedatei nicht stimmt. Dann wird nichts
 * veröffentlicht: eine halbe Reise ist schlimmer als die alte Fassung.
 */

import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATEN = path.join(WURZEL, "docs", "data", "trips");
const SEITEN = path.join(WURZEL, "docs", "trips");

/** Ohne Schrägstrich am Ende entstehen aus `new URL()` falsche Adressen. */
const SEITEN_URL = (process.env.SITE_URL || "https://cauer71.github.io/reiseplan/")
  .replace(/\/*$/, "/");

/* ────────────────────────────────────────────────────── Regeln des Datenvertrags
 *
 * Verbindlich ist docs/data/trip.schema.json. Hier stehen dieselben Regeln plus
 * die Querprüfungen, die ein Schema nicht ausdrücken kann: UID-Verweise,
 * Zeitfolge, verwaiste Einträge.
 */

const TONE = new Set(["teal", "gold", "coral", "navy"]);
const TON_FARBE = { teal: "#14777c", gold: "#c98624", coral: "#de6246", navy: "#102f46" };
const WETTERTAUGLICH = new Set(["aussen", "innen", "beides"]);

const TRIP_PFLICHT = ["destination", "title", "subtitle", "dates", "travellers", "heroImage"];
const TAG_PFLICHT = ["id", "label", "date", "isoDate", "title", "tone", "heroImage", "stops"];
const ORT_PFLICHT = ["title", "detail", "description", "image", "place", "weather"];
const BILD_PFLICHT = ["url", "alt", "license"];

// 1280 px reichen für jedes Handy: das Layout ist rund 400 px breit, bei
// dreifacher Pixeldichte also 1200 px. Die Grenze ist keine Theorie – eine
// Reisedatei kam mit Originaldateien über `Special:Redirect`, ein einzelnes Bild
// 16,8 MB, die Reise 66 MB. Nach der Umstellung auf Thumbnails: 5,2 MB.
const ZIEL_BILDBREITE = 1280;
const MAX_BILDBREITE = 1600;

// Lizenzen ohne Pflicht zur Namensnennung. Solche Bilder erscheinen nicht im
// Bildnachweis, und `credit` darf dort fehlen. Alles andere – auch eine
// unbekannte Angabe – gilt als nennungspflichtig: eine überflüssige Zeile im
// Nachweis ist harmlos, eine fehlende Nennung bei CC BY(-SA) ist ein Verstoß.
const NENNUNG_FREI = /\b(cc0|public\s*domain|pd[-\s]|gemeinfrei|no\s+restrictions)/i;
const nennungNoetig = (lizenz) => !NENNUNG_FREI.test(String(lizenz ?? ""));

const UID_RE = /^\d{2}$/;
const ZEIT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
// Der Dateiname wird zum Verzeichnisnamen und zum Teil der Adresse. Deshalb eng
// halten: nichts, was aus docs/trips/ herausführen oder eine Adresse zerlegen kann.
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/* ─────────────────────────────────────────────────────────────────────── Prüfung */

/** Ein Bildverweis ist ein Schlüssel in den `images`-Block, keine URL. */
function bildverweis(name, wo, bilder) {
  if (typeof name !== "string" || !name) return [`${wo}: Bildname fehlt`];
  if (name.startsWith("http")) {
    return [`${wo}: rohe URL '${name.slice(0, 48)}…' – Bilder über den images-Block `
          + `verlinken, damit Lizenz und Namensnennung mitlaufen`];
  }
  if (!(name in bilder)) {
    const bekannt = Object.keys(bilder).sort().slice(0, 8).join(", ") || "keine";
    return [`${wo}: Bildschlüssel '${name}' fehlt im images-Block (vorhanden: ${bekannt})`];
  }
  return [];
}

/** Der images-Block selbst: URL, Maße, Alt-Text, Urheber, Lizenz. */
function bilderblock(slug, bilder) {
  const funde = [];
  for (const name of Object.keys(bilder).sort()) {
    const bild = bilder[name];
    const wo = `${slug}: images['${name}']`;
    if (typeof bild !== "object" || bild === null || Array.isArray(bild)) {
      funde.push(`${wo} ist kein Objekt`);
      continue;
    }
    for (const feld of BILD_PFLICHT) if (!bild[feld]) funde.push(`${wo}.${feld} fehlt`);

    if (nennungNoetig(bild.license) && !bild.credit) {
      funde.push(`${wo}.credit fehlt – '${bild.license}' verlangt Namensnennung. `
               + `Bei CC0 oder Gemeinfreiheit darf das Feld fehlen.`);
    }

    const url = String(bild.url ?? "");
    if (url && !url.startsWith("https://")) funde.push(`${wo}.url ist keine https-Adresse`);
    // Signierte Google-URLs verfallen nach Wochen – dann klafft eine Lücke.
    if (/googleusercontent|lh3\.google/.test(url)) {
      funde.push(`${wo}.url ist eine signierte Google-URL und verfällt – `
               + `stabile Quelle verwenden (Wikimedia Commons o. Ä.)`);
    }
    // Special:Redirect liefert die Originaldatei in voller Auflösung.
    if (url.includes("Special:Redirect")) {
      funde.push(`${wo}.url ist eine Special:Redirect-Adresse und liefert das Original `
               + `in voller Auflösung – thumburl der API verwenden`);
    }
    if (!bild.width || !bild.height) {
      funde.push(`${wo}: width/height fehlen – ohne sie springt das Layout beim Laden`);
    }
    if (Number.isInteger(bild.width) && bild.width > MAX_BILDBREITE) {
      funde.push(`${wo}: width ${bild.width} px überschreitet ${MAX_BILDBREITE} px – `
               + `mit iiurlwidth=${ZIEL_BILDBREITE} neu abfragen`);
    }
  }
  return funde;
}

/** Prüft eine Reise vollständig und gibt alle Befunde zurück. */
function pruefeReise(slug, data) {
  const funde = [];
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return [`${slug}.json enthält kein Objekt`];
  }

  const trip = data.trip;
  if (typeof trip !== "object" || trip === null) return [`${slug}: Block 'trip' fehlt`];
  for (const feld of TRIP_PFLICHT) if (!trip[feld]) funde.push(`${slug}: trip.${feld} fehlt`);
  if (trip.theme !== undefined && !TONE.has(trip.theme)) {
    funde.push(`${slug}: trip.theme '${trip.theme}' unbekannt (erlaubt: ${[...TONE].sort().join(", ")})`);
  }

  const bilder = data.images;
  if (typeof bilder !== "object" || bilder === null || !Object.keys(bilder).length) {
    funde.push(`${slug}: Block 'images' fehlt – dort stehen URL, Alt-Text, Urheber `
             + `und Lizenz je Bildschlüssel`);
    return funde;
  }
  funde.push(...bilderblock(slug, bilder));
  funde.push(...bildverweis(trip.heroImage ?? "", `${slug}: trip.heroImage`, bilder));
  if (trip.tileImage) {
    funde.push(...bildverweis(trip.tileImage, `${slug}: trip.tileImage`, bilder));
  }

  const wetter = trip.weather ?? {};
  if (wetter.enabled) {
    for (const feld of ["latitude", "longitude", "timezone", "startDate", "endDate"]) {
      if (wetter[feld] === undefined || wetter[feld] === null || wetter[feld] === "") {
        funde.push(`${slug}: trip.weather.${feld} fehlt`);
      }
    }
    for (const hinweis of wetter.notes ?? []) {
      if (!ISO_RE.test(String(hinweis.date ?? ""))) {
        funde.push(`${slug}: trip.weather.notes – ungültiges Datum '${hinweis.date}'`);
      }
      if ("tempMax" in hinweis || "code" in hinweis) {
        funde.push(`${slug}: trip.weather.notes darf keine Prognosezahlen enthalten `
                 + `(${hinweis.date}) – die kommen live von der API`);
      }
    }
  }

  const tage = data.days;
  if (!Array.isArray(tage) || !tage.length) {
    funde.push(`${slug}: Block 'days' fehlt oder ist leer`);
    return funde;
  }
  const orte = data.places;
  if (typeof orte !== "object" || orte === null || !Object.keys(orte).length) {
    funde.push(`${slug}: Block 'places' fehlt oder ist leer`);
    return funde;
  }

  const gesehenTage = new Set();
  const gesehenUids = new Map();
  let vorigesIso = "";

  for (const tag of tage) {
    const marke = tag.id ?? "?";
    for (const feld of TAG_PFLICHT) if (!tag[feld]) funde.push(`${slug}/${marke}: Feld '${feld}' fehlt`);
    if (gesehenTage.has(tag.id)) funde.push(`${slug}: Tages-ID '${tag.id}' doppelt vergeben`);
    gesehenTage.add(tag.id);

    if (!TONE.has(tag.tone)) {
      funde.push(`${slug}/${marke}: tone '${tag.tone}' unbekannt (erlaubt: ${[...TONE].sort().join(", ")})`);
    }

    const iso = String(tag.isoDate ?? "");
    if (!ISO_RE.test(iso)) {
      funde.push(`${slug}/${marke}: isoDate '${iso}' ist kein Datum (JJJJ-MM-TT)`);
    } else if (iso <= vorigesIso) {
      funde.push(`${slug}/${marke}: isoDate '${iso}' liegt nicht nach dem Vortag '${vorigesIso}'`);
    } else {
      vorigesIso = iso;
    }

    funde.push(...bildverweis(tag.heroImage ?? "", `${slug}/${marke}: heroImage`, bilder));

    let vorigeZeit = "";
    for (const stop of tag.stops ?? []) {
      const uid = String(stop.uid ?? "");
      const zeit = String(stop.time ?? "");
      const extra = Object.keys(stop).filter((k) => k !== "uid" && k !== "time");
      if (extra.length) {
        funde.push(`${slug}/${marke}: Stop ${uid} hat unerlaubte Felder ${JSON.stringify(extra.sort())} – `
                 + `Beschreibungen gehören in 'places'`);
      }
      if (!UID_RE.test(uid)) funde.push(`${slug}/${marke}: UID '${uid}' ist nicht zweistellig`);
      if (gesehenUids.has(uid)) {
        funde.push(`${slug}: UID ${uid} ist doppelt eingeplant (${gesehenUids.get(uid)} und ${marke})`);
      }
      gesehenUids.set(uid, marke);
      if (!(uid in orte)) funde.push(`${slug}/${marke}: für UID ${uid} fehlt der Eintrag in 'places'`);
      if (!ZEIT_RE.test(zeit)) {
        funde.push(`${slug}/${marke}: Uhrzeit '${zeit}' bei UID ${uid} ist kein HH:MM`);
      } else if (zeit < vorigeZeit) {
        funde.push(`${slug}/${marke}: UID ${uid} um ${zeit} steht nach ${vorigeZeit} – `
                 + `Stops müssen zeitlich aufsteigend sortiert sein`);
      } else {
        vorigeZeit = zeit;
      }
    }
  }

  for (const uid of Object.keys(orte).sort()) {
    const ort = orte[uid];
    if (!UID_RE.test(uid)) funde.push(`${slug}: places-Schlüssel '${uid}' ist nicht zweistellig`);
    if (!gesehenUids.has(uid)) {
      funde.push(`${slug}: places['${uid}'] (${ort.title ?? "?"}) ist keinem Tag zugeordnet`);
    }
    for (const feld of ORT_PFLICHT) if (!ort[feld]) funde.push(`${slug}: places['${uid}'].${feld} fehlt`);

    const text = ort.description;
    if (typeof text === "string") {
      funde.push(`${slug}: places['${uid}'].description sollte eine Liste von Absätzen sein`);
    } else if (Array.isArray(text) && text.length < 2) {
      funde.push(`${slug}: places['${uid}'].description hat nur ${text.length} Absatz – `
               + `mindestens zwei sind vorgesehen`);
    }
    // Nur prüfen, wenn gesetzt – das Fehlen meldet schon die Pflichtfeldprüfung.
    if ("weather" in ort && !WETTERTAUGLICH.has(ort.weather)) {
      funde.push(`${slug}: places['${uid}'].weather ist '${ort.weather}' – `
               + `erlaubt: ${[...WETTERTAUGLICH].sort().join(", ")}`);
    }
    if ("fixed" in ort && ort.fixed !== true) {
      funde.push(`${slug}: places['${uid}'].fixed darf nur true sein oder fehlen `
               + `(gefunden: ${JSON.stringify(ort.fixed)})`);
    }
    funde.push(...bildverweis(ort.image ?? "", `${slug}: places['${uid}'].image`, bilder));
    if (ort.ticketUrl && !String(ort.ticketUrl).startsWith("https://")) {
      funde.push(`${slug}: places['${uid}'].ticketUrl ist keine https-Adresse`);
    }
  }

  const benutzt = new Set([trip.heroImage, trip.tileImage, ...tage.map((t) => t.heroImage),
                           ...Object.values(orte).map((o) => o.image)]);
  for (const name of Object.keys(bilder).sort()) {
    if (!benutzt.has(name)) {
      funde.push(`${slug}: images['${name}'] wird von keinem Ort und keinem Tag benutzt`);
    }
  }

  return funde;
}

/* ─────────────────────────────────────────────────────────────────────── Erzeugen */

const esc = (wert = "") => String(wert)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Die Hülle einer Reiseseite. Jede Angabe kommt aus der Reisedatei – deshalb
 * kann nichts davon veralten. Vorher stand hier Handarbeit, und genau das ging
 * schief: `og:image` zeigte noch auf gelöschte Bilddateien, die Vorschau eines
 * geteilten Links lief auf 404, und die Themenfarbe war bei jeder Reise die von
 * Kopenhagen.
 */
function reiseSeite(slug, data) {
  const t = data.trip;
  const hero = data.images?.[t.heroImage] ?? {};
  const farbe = TON_FARBE[t.theme] ?? TON_FARBE.teal;
  const adresse = `${SEITEN_URL}trips/${slug}/`;
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- Erzeugt von tools/build.mjs aus data/trips/${slug}.json. Nicht bearbeiten. -->
    <title>${esc(t.destination)} · Reiseplan</title>
    <meta name="description" content="${esc(t.subtitle)}" />
    <meta name="theme-color" content="${farbe}" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Meine Reisen" />
    <meta property="og:title" content="${esc(t.title)}" />
    <meta property="og:description" content="${esc(t.subtitle)}" />
    <meta property="og:url" content="${esc(adresse)}" />
    <meta property="og:image" content="${esc(hero.url ?? "")}" />
    <meta property="og:image:alt" content="${esc(hero.alt ?? t.destination)}" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="manifest" href="../../manifest.webmanifest" />
    <link rel="icon" href="../../icons/icon-192.png" sizes="192x192" />
    <!-- Apple: als Web App auf dem Home-Bildschirm.
         apple-mobile-web-app-title ist nötig, weil app.js document.title auf den
         vollen Reisetitel setzt – iOS nähme sonst den und kürzte ihn hart ab.
         mobile-web-app-capable ist die heutige Schreibweise, die apple-Variante
         bleibt für iOS vor 16.4, wo display im Manifest noch nicht griff. -->
    <meta name="apple-mobile-web-app-title" content="${esc(t.destination)}" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <link rel="apple-touch-icon" sizes="180x180" href="../../icons/apple-touch-icon.png" />
    <link rel="stylesheet" href="../../styles.css" />
    <link rel="stylesheet" href="../../assets/styles.css" />
  </head>
  <body data-trip="../../data/trips/${slug}.json" data-site-root="../../">
    <main id="app" aria-live="polite"></main>
    <script type="module" src="../../assets/app.js"></script>
  </body>
</html>
`;
}

/**
 * Die Liste der Reisen. Enthält bewusst nur die Slugs: Titel, Datum, Untertitel
 * und Vorschaubild liest die Startseite aus der jeweiligen Reisedatei. Was hier
 * doppelt stünde, könnte abweichen.
 */
function indexDatei(slugs) {
  return JSON.stringify({
    _hinweis: "Erzeugt von tools/build.mjs aus den vorhandenen Reisedateien. "
            + "Nicht bearbeiten und nicht einchecken – eine .json in diesem Ordner "
            + "genügt, damit die Reise erscheint. Die Reihenfolge hier ist ohne "
            + "Bedeutung: die Startseite sortiert nach den isoDate-Angaben.",
    trips: slugs.map((slug) => ({ slug })),
  }, null, 2) + "\n";
}

/* ────────────────────────────────────────────────────────────────── Bildprüfung */

const UA = "Reiseplan-Bildpruefung/2.0 (https://github.com/cauer71/reiseplan)";
const GROSS_KB = 1200;

/**
 * Ruft jede Bild-URL ab. Getrennt von der Datenprüfung, weil sie Netz braucht:
 * ein langsamer Bildserver ist kein Grund, eine Planänderung nicht zu
 * veröffentlichen. Ein toter Link soll aber auffallen.
 *
 * Der Anlass war ein echter Fall. Eine URL trug die Breite 1337 px:
 *
 *     …/Via_Benedetta_in_Rome.jpg/1337px-Via_Benedetta_in_Rome.jpg
 *
 * Wikimedia antwortete mit `400 Use thumbnail sizes listed on …` – es erzeugt
 * keine Thumbnails in beliebigen Breiten mehr. Der Schlüssel stand korrekt im
 * images-Block, die Datenprüfung war zufrieden, und auf der Seite blieb eine
 * leere Fläche.
 *
 * **Breiten nicht raten.** Bei jener Datei ging ausschließlich 1280 px, auch die
 * klassischen 320, 640, 800 und 1024 wurden abgelehnt. Die URL immer von der API
 * übernehmen, nie zusammensetzen.
 */
async function bilderPruefen(reisen) {
  const kaputt = [];
  const dick = [];
  let gesamt = 0;

  for (const { slug, data } of reisen) {
    const bilder = data.images ?? {};
    console.log(`${slug}: ${Object.keys(bilder).length} Bilder`);
    for (const name of Object.keys(bilder).sort()) {
      const url = bilder[name].url ?? "";
      if (!url) { kaputt.push(`${slug}: images['${name}'] hat keine url`); continue; }
      let status = "kein Netz";
      let laenge = 0;
      try {
        const antwort = await fetch(url, {
          method: "HEAD",
          headers: { "user-agent": UA },
          signal: AbortSignal.timeout(25_000),
        });
        status = antwort.status;
        laenge = Number(antwort.headers.get("content-length") || 0);
      } catch { /* Netz, DNS, Zeitüberschreitung – bleibt „kein Netz“ */ }

      gesamt += laenge;
      const kb = Math.floor(laenge / 1024);
      if (status === 200) {
        const gross = kb > GROSS_KB;
        if (gross) dick.push(`${slug}: images['${name}'] ist ${kb} KB`);
        console.log(`  ${(gross ? "gross" : "ok").padEnd(5)} ${name.padEnd(14)} ${kb} KB`);
      } else {
        console.log(`  FEHLER ${name.padEnd(14)} HTTP ${status}`);
        kaputt.push(`${slug}: images['${name}'] antwortet HTTP ${status} – ${url}`);
      }
      await new Promise((fertig) => setTimeout(fertig, 800));   // freundlich zum Bildserver
    }
  }

  console.log(`\nSumme aller Bilder: ${(gesamt / 1048576).toFixed(1)} MB`);
  if (dick.length) {
    console.log(`\n${dick.length} Bild(er) über ${GROSS_KB} KB – auf dem Handy zahlt das der Reisende mit:`);
    for (const d of dick) console.log(`  ! ${d}`);
  }
  if (kaputt.length) {
    console.error(`\n${kaputt.length} defekte(s) Bild(er):\n`);
    for (const k of kaputt) console.error(`  ✗ ${k}`);
    console.error("\nURL nicht selbst zusammensetzen – von der Commons-API übernehmen:");
    console.error("  …/w/api.php?action=query&format=json&formatversion=2&titles=File:NAME");
    console.error("    &prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1280");
    return 1;
  }
  console.log("\nAlle Bild-URLs sind erreichbar.");
  return 0;
}

/* ─────────────────────────────────────────────────────────────────────── Ablauf */

async function reisenLesen() {
  if (!existsSync(DATEN)) {
    return { reisen: [], funde: [`${path.relative(WURZEL, DATEN)} fehlt`] };
  }
  const dateien = (await readdir(DATEN))
    .filter((name) => name.endsWith(".json") && name !== "index.json")
    .sort();

  const reisen = [];
  const funde = [];
  for (const datei of dateien) {
    const slug = datei.slice(0, -5);
    if (!SLUG_RE.test(slug)) {
      funde.push(`${datei}: Dateiname darf nur Kleinbuchstaben, Ziffern und Bindestriche `
               + `enthalten – daraus wird das Verzeichnis docs/trips/${slug}/`);
      continue;
    }
    let data;
    try {
      // Stückliste am Anfang entfernen – als Escape geschrieben, damit sie beim
      // Bearbeiten dieser Datei nicht selbst verschwindet. Manche Editoren
      // schreiben sie, und JSON.parse scheitert daran mit einer Meldung, die
      // nichts verrät („Unexpected token“ in Zeile 1).
      data = JSON.parse((await readFile(path.join(DATEN, datei), "utf8")).replace(/^﻿/, ""));
    } catch (fehler) {
      funde.push(`${datei} ist kein gültiges JSON: ${fehler.message}`);
      continue;
    }
    reisen.push({ slug, data });
  }
  return { reisen, funde };
}

async function main() {
  const auchBilder = process.argv.includes("--bilder");
  // Beide Nebenmodi schreiben nichts: `--check` prüft für Pull Requests, und die
  // Bildprüfung läuft als eigener, nicht blockierender Schritt – sie soll den
  // fertigen Bau nicht überschreiben und nicht doppelt erzeugen.
  const schreiben = !process.argv.includes("--check") && !auchBilder;

  const { reisen, funde } = await reisenLesen();
  for (const { slug, data } of reisen) funde.push(...pruefeReise(slug, data));

  if (!reisen.length && !funde.length) {
    funde.push(`keine Reisedatei in ${path.relative(WURZEL, DATEN)} – eine .json dort `
             + `anlegen, dann erscheint sie auf der Startseite`);
  }

  for (const { slug, data } of reisen) {
    const stops = (data.days ?? []).reduce((summe, tag) => summe + (tag.stops?.length ?? 0), 0);
    console.log(`  ${slug}: ${(data.days ?? []).length} Tage, ${stops} Stops, `
              + `${Object.keys(data.places ?? {}).length} Ortsbeschreibungen, `
              + `${Object.keys(data.images ?? {}).length} Bilder`);
  }

  if (funde.length) {
    console.error(`\n${funde.length} Problem(e) gefunden:\n`);
    for (const fund of funde) console.error(`  ✗ ${fund}`);
    console.error("\nNichts wurde erzeugt. Der Datenvertrag steht in docs/data/trip.schema.json,");
    console.error("der Auftrag für die erzeugende KI in SYSTEMPROMPT.md.");
    return 1;
  }

  if (schreiben) {
    await writeFile(path.join(DATEN, "index.json"),
                    indexDatei(reisen.map((r) => r.slug)), "utf8");
    // Erst weg, dann neu: so verschwindet die Unterseite einer gelöschten Reise
    // zuverlässig, statt als Waise mit leerem Inhalt stehen zu bleiben.
    await rm(SEITEN, { recursive: true, force: true });
    for (const { slug, data } of reisen) {
      await mkdir(path.join(SEITEN, slug), { recursive: true });
      await writeFile(path.join(SEITEN, slug, "index.html"), reiseSeite(slug, data), "utf8");
    }
    console.log(`\nErzeugt: data/trips/index.json und ${reisen.length} Unterseite(n) `
              + `unter docs/trips/ – ${reisen.map((r) => r.slug).join(", ")}`);
  }

  console.log(schreiben ? "\nAlle Reisedaten sind stimmig, Seite gebaut." : "\nAlle Reisedaten sind stimmig.");

  return auchBilder ? await bilderPruefen(reisen) : 0;
}

process.exitCode = await main();
