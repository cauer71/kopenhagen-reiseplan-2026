# Reisepläne pflegen

Diese Anleitung beschreibt verbindlich, wie die Inhalte dieser Website geändert
werden.

**Grundsatz: die Seite zeigt nur, was in den Reisedateien steht.** Eine `.json`
nach `docs/data/trips/` legen heißt eine Reise mehr; sie löschen heißt eine Reise
weniger. Alles andere — die Liste der Reisen, die Unterseite je Reise, Titel,
Farbe und Vorschaubild — entsteht daraus auf dem Server. Am eigenen Rechner ist
nichts auszuführen.

Die Reisedateien selbst werden **außerhalb dieses Repos** erzeugt. Auch das
Umsortieren bei Regen passiert dort. Dieses Repo stellt dar und prüft.

---

## 1. Was dieses Repo ist

Eine statische Website ohne Abhängigkeiten. Alles unter `docs/` ist die Seite; die
GitHub-Action `.github/workflows/pages.yml` prüft die Reisedaten, erzeugt die zwei
fehlenden Stücke und lädt den Ordner nach GitHub Pages.

Live: <https://cauer71.github.io/reiseplan/>

```text
docs/
├── index.html                      Startseite mit den Reisekacheln
├── manifest.webmanifest            „Zum Homescreen hinzufügen“
├── sw.js                           Service Worker für die Offline-Nutzung
├── assets/app.js                   Darstellung einer Reise (für alle Reisen gleich)
├── assets/landing.js               Darstellung der Startseite
├── assets/test.js                  Testparameter-Seite
├── assets/styles.css               gemeinsames Design
├── data/trips/rom.json             ← hier stehen die Inhalte
├── data/trip.schema.json           Datenvertrag, maschinenlesbar
├── icons/                          App-Icons
└── test/index.html                 fertige Testlinks, aus den Daten erzeugt

tools/build.mjs                     prüft und baut (läuft in der Action)
SYSTEMPROMPT.md                     Auftrag für die KI, die eine Reisedatei erzeugt
```

Zwei Dinge fehlen in dieser Liste, weil sie **erzeugt und nicht eingecheckt** sind:

| Erzeugt | Wozu |
|---|---|
| `docs/data/trips/index.json` | welche Reisen es gibt — GitHub Pages kann einen Ordner nicht auflisten, die Startseite braucht die Liste als Datei |
| `docs/trips/<slug>/index.html` | die Hülle je Reise, mit Titel, Themenfarbe und Vorschaubild aus der Reisedatei |

Beides stand früher im Repo und wurde von Hand gepflegt. Genau das ging schief:
eine Reisedatei lag im Ordner, fehlte aber in `index.json` — und war unsichtbar,
ohne dass irgendetwas fehlschlug. Ein `og:image` zeigte noch auf gelöschte
Bilddateien, die Vorschau eines geteilten Links lief auf 404. Und die Themenfarbe
war bei jeder Reise die von Kopenhagen. **Was erzeugt wird, kann nicht veralten.**

`tools/build.mjs` benutzt nur die Node-Standardbibliothek. Es gibt kein
`package.json`, nichts zu installieren, keinen Bundler.

---

## 2. Das Datenmodell

Jede Reise ist **eine** Datei mit vier Blöcken:

| Block | Inhalt | Ändert sich |
|---|---|---|
| `trip` | Titel, Datum, Reisende, Einleitung, Wetterkoordinaten | selten |
| `days` | Tagesabschnitte und **nur** die Reihenfolge: `{ uid, time }` | oft |
| `places` | die Ortsbeschreibungen, nach UID sortiert | wenn Inhalte dazukommen |
| `images` | je Bildschlüssel einmal URL, Alt-Text, Urheber und Lizenz | mit neuen Bildern |

Reihenfolge und Inhalt sind getrennt gespeichert. Einen Stop zu verschieben bewegt
genau **eine Zeile** — niemals einen Textblock. Deshalb sind Umstellungen billig
und im Diff sofort lesbar.

```jsonc
{
  "trip": {
    "destination": "Rom",            // kurz, für Kachel, Tab und Home-Bildschirm
    "title": "Rom mit Julia – Architektur in allen Schichten",
    "subtitle": "…",                 // ein Satz, auch für die Link-Vorschau
    "dates": "05.–08. September 2026",
    "travellers": "Christian & Julia",
    "heroImage": "colosseo",         // Schlüssel in "images"
    "introLabel": "Architekturreise", // Einordnung; erscheint auch auf der Kachel
    "introTitle": "…",
    "introText": "…",
    "theme": "coral",                // teal | gold | coral | navy – Themenfarbe der Seite
    "tileImage": "forum",            // optional: eigenes Kachelbild statt heroImage
    "weather": { … }
  },

  "days": [
    {
      "id": "tag1",                  // stabile Anker-ID, auch für Deep-Links
      "label": "Tag 1",
      "date": "Mo 06.07.",           // Anzeige
      "isoDate": "2026-07-06",       // maschinenlesbar, für Wetter und Sortierung
      "title": "Ankommen, Christianshavn, Turm und Wasser",
      "tone": "teal",                // teal | gold | coral | navy
      "heroImage": "christianshavn",
      "weather": "Wettercheck: Turm und Boot nur bei gutem Wind.",
      "note": "Der erste Tag bleibt weich: …",
      "stops": [
        { "uid": "01", "time": "08:40" },   // ← genau das wird verschoben
        { "uid": "02", "time": "10:45" }
      ]
    }
  ],

  "places": {
    "01": {
      "title": "Flug BGY → CPH",
      "detail": "Kurzer Aufhänger, eine Zeile.",
      "description": [
        "Erster Absatz der ausführlichen Beschreibung.",
        "Zweiter Absatz: Geschichte, was man konkret sieht, worauf es ankommt."
      ],
      "image": "termini",            // Schlüssel in "images", kein Dateiname und keine URL
      "place": "Roma Termini",       // Suchbegriff für den Google-Maps-Link
      "weather": "beides",           // aussen | innen | beides – Pflicht
      "fixed": true,                 // optional: nicht verschiebbar
      "address": "…",                // optional
      "duration": "…",               // optional
      "price": "…",                  // optional
      "tip": "…",                    // optional
      "ticketUrl": "https://…"       // optional
    }
  },

  "images": {
    "termini": {
      "url": "https://upload.wikimedia.org/…/1280px-Roma_termini_01.jpg",
      "width": 1280, "height": 810,   // gegen Layoutsprünge beim Nachladen
      "alt": "Bahnhof Roma Termini",  // beschreibend, kein Dateiname
      "credit": "Nutzername",         // Pflicht bei CC BY(-SA), entbehrlich bei CC0
      "license": "CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:…"
    }
  }
}
```

`title`, `detail`, `description`, `image`, `place` und `weather` sind in jedem Ort
Pflicht. `address`, `duration`, `price` und `tip` erscheinen als Faktenblock unter
der Beschreibung; fehlende Felder werden übersprungen.

**Nichts davon steht zweimal.** Titel, Datum und Untertitel liest die Startseite
aus der Reisedatei, nicht aus einer Liste; `introLabel` ist gleichzeitig die
Einordnung auf der Kachel. Ein Feld, das an zwei Orten steht, ist irgendwann an
einem davon falsch.

### Bilder sind verlinkt, nicht mitgeliefert

`image` in einem Ort ist ein **Schlüssel** in den `images`-Block, keine Datei und
keine rohe URL. Der Umweg über das Verzeichnis hat drei Gründe:

- Ein Motiv wird oft mehrfach benutzt — `cucina` steckt in sieben Essensstopps.
  Bricht der Link, ist es **eine** Korrektur statt sieben.
- CC BY und CC BY-SA verlangen **Namensnennung**. Die braucht einen festen Platz,
  und die Seite rendert daraus den Abschnitt „Bildnachweis“ — **aber nur für die
  Bilder, deren Lizenz sie verlangt**. CC0 und gemeinfreie Bilder erscheinen dort
  nicht; verlangt keines der Bilder eine Nennung, entfällt der Abschnitt ganz.
  Bei unbekannter Lizenzangabe wird genannt: eine überflüssige Zeile ist harmlos,
  eine fehlende Nennung bei CC BY(-SA) ist ein Lizenzverstoß.
- Die Prüfung kann jeden Schlüssel gegen das Verzeichnis abgleichen und meldet
  unbenutzte Einträge.

Zwei Konsequenzen, die man kennen muss:

- **Keine Bilder ohne Netz.** Der Service Worker fasst fremde Hosts bewusst nicht
  an. Ohne Verbindung bleibt an ihrer Stelle eine Fläche; der Plan selbst ist
  vollständig lesbar.
- **Signierte URLs verfallen.** Google-Maps-Fotolinks
  (`lh3.googleusercontent.com`) sind nach Wochen tot — die Prüfung lehnt sie ab.
  Stabil sind Wikimedia Commons oder eigener Speicher.

#### Bild-URLs nie selbst zusammensetzen

Immer von der Commons-API holen und wörtlich übernehmen:

```bash
curl -s "https://commons.wikimedia.org/w/api.php?action=query&format=json\
&formatversion=2&titles=File:NAME&prop=imageinfo\
&iiprop=url|size|extmetadata&iiurlwidth=1280"
```

`thumburl` → `url`, `thumbwidth` → `width`, `thumbheight` → `height`,
`Artist` → `credit`, `LicenseShortName` → `license`, `descriptionurl` → `source`.

**Beide denkbaren Abkürzungen sind schon schiefgegangen**, und zwar
unterschiedlich:

*Selbst gesetzte Breite.* Eine URL mit `1337px-` antwortete mit
`400 Use thumbnail sizes listed on …` — Wikimedia erzeugt keine Thumbnails in
beliebigen Breiten mehr. Der Schlüssel stand korrekt im Block, die Datenprüfung
war zufrieden, und auf der Seite blieb eine leere Fläche. Die erlaubten Größen
sind **nicht vorhersagbar**: bei jener Datei ging ausschließlich 1280 px, auch
320, 640, 800 und 1024 wurden abgelehnt.

*`Special:Redirect/file/…`.* Diese Adressen laden sichtbar — aber das **Original
in voller Auflösung**. Eine Reisedatei kam so auf **66 MB**, ein einzelnes Bild
auf 16,8 MB. Nach der Umstellung auf Thumbnails bei 1280 px: **5,2 MB**.

Die Prüfung lehnt jetzt beides ab: `Special:Redirect` und `width` über 1600 px.
1280 px reichen für jedes Handy — das Layout ist rund 400 px breit, bei
dreifacher Pixeldichte also 1200 px. Darüber zahlt der Reisende Daten für Pixel,
die er nie sieht, unterwegs womöglich Roaming.

Ob eine URL wirklich antwortet, sagt nur der Schritt „Bild-URLs prüfen“ in der
Action (`node tools/build.mjs --bilder`).

### Wettertauglichkeit und feste Termine

Zwei Felder steuern, was beim Umplanen passieren darf:

| Feld | Werte | Bedeutung |
|---|---|---|
| `weather` | `aussen` | im Freien, bei Regen problematisch |
| | `innen` | überdacht, taugt als Regenblock |
| | `beides` | wetterunabhängig oder gemischt |
| `fixed` | `true` oder fehlt | fester Termin: Flug, Transfer, Check-out, gebuchtes Zeitfenster |

`fixed` ist eine **Schutzschaltung** für die Software, die umsortiert: sie
verhindert den teuren Fehler, einen umgestellten Tag zu bauen, der den Rückflug
mitnimmt. Auf der Seite erscheint der Ort dafür mit „Termin: Fest – nicht
verschieben“ im Faktenblock. Die Kennzeichnung ist **kein** Ausdruck von
Wichtigkeit — nur von Unverschiebbarkeit.

> Ein Ort kann `aussen` **und** `fixed` sein — etwa das Kolosseum mit gebuchtem
> Zeitfenster. Solche Punkte sind bei Regen das eigentliche Problem und lassen
> sich nicht tauschen.

### Die UID ist die Klammer

Jeder Ort hat eine stabile zweistellige UID. Sie verbindet die Website mit dem
Google-Kalendereintrag (`[REISE-…] [UID:05]`) und ist der Schlüssel in `places`.

Auf der Seite steht sie unauffällig am **Fuß der geöffneten Stop-Karte**. In der
zugeklappten Übersicht erscheint sie bewusst nicht: dort zählt die
Reiseinformation, nicht der technische Schlüssel.

> **Eine UID wird nie geändert und nie neu vergeben.** Ein Stop wird verschoben,
> umsortiert, zeitlich verlegt oder entfernt — seine UID bleibt dieselbe. Eine
> gelöschte UID wird nicht wiederverwendet; neue Orte bekommen die nächste freie
> Nummer.

---

## 3. Eine Reise veröffentlichen

Eine `.json` nach `docs/data/trips/` legen, committen, pushen. Das ist alles.

```text
docs/data/trips/rom.json       →  https://cauer71.github.io/reiseplan/trips/rom/
docs/data/trips/mailand.json   →  https://cauer71.github.io/reiseplan/trips/mailand/
```

Der Dateiname wird der Slug und damit Teil der Adresse. Deshalb nur
Kleinbuchstaben, Ziffern und Bindestriche — `Rom Kopie.json` wird abgelehnt, mit
Angabe des Grundes.

**Eine Reise entfernen:** die Datei löschen. Kachel, Unterseite und Eintrag in der
Reiseliste verschwinden mit ihr. Der Bau leert `docs/trips/` vor jedem Durchlauf,
damit keine Waise mit leerem Inhalt stehen bleibt.

Nichts weiter ist zu tun. Insbesondere **nicht**:

- kein Eintrag in einer Liste,
- keine Unterseite anlegen oder kopieren,
- keine Änderung an `sw.js` — der Service Worker liest die Reisen bei der
  Installation aus der erzeugten Reiseliste,
- keine Testlinks pflegen — `/test/` erzeugt sie aus den echten Daten,
- keine Cache-Version anheben. Es gibt keine mehr, siehe unten.

### Warum es keinen `?v=`-Parameter mehr gibt

Früher trug jede Adresse eine Versionsnummer, die nach Änderungen an CSS,
JavaScript oder HTML von Hand anzuheben war. Zweimal vergessen, und der Browser
lieferte denselben `?v=` mit altem Inhalt — ein Fehler, der wie ein Fehler im Code
aussieht.

Stattdessen fragt der Service Worker bei jeder Datei nach, ob sie sich geändert
hat (`cache: "no-cache"`). Unverändertes kommt als 304 zurück und kostet fast
nichts. Damit ist eine neue Reisedatei sofort sichtbar, und es gibt keinen
Handgriff, den man vergessen kann.

---

## 4. Was der Bau prüft

`node tools/build.mjs` bricht ab, sobald eine Reisedatei nicht stimmt. Dann wird
**nichts** veröffentlicht und die vorige Fassung bleibt online: eine halbe Reise
ist schlimmer als eine alte.

Geprüft wird:

- JSON ist gültig (auch mit Byte-Order-Mark am Anfang), alle Pflichtfelder sind da
- der Dateiname taugt als Adressbestandteil
- jede UID ist zweistellig, genau einmal eingeplant und hat einen `places`-Eintrag
- keine verwaisten Ortsbeschreibungen
- jeder Bildschlüssel steht im `images`-Block, jeder Eintrag hat URL, Alt-Text
  und Lizenz, bei nennungspflichtiger Lizenz auch den Urheber, und kein Eintrag
  ist unbenutzt
- keine rohen URLs als Bildverweis, kein `Special:Redirect`, keine signierte
  Google-URL, keine fehlenden Maße, `width` höchstens 1600 px
- Uhrzeiten sind `HH:MM` und innerhalb eines Tages aufsteigend
- `isoDate` ist ein echtes Datum und liegt nach dem Vortag
- `tone` und `theme` sind einer der vier erlaubten Werte
- `description` ist eine Liste mit mindestens zwei Absätzen
- `weather` ist gesetzt und einer von `aussen`, `innen`, `beides`
- `fixed` ist entweder `true` oder fehlt
- `trip.weather.notes` enthält keine Prognosezahlen
- `ticketUrl` ist eine `https`-Adresse

Der zweite Schritt in der Action ruft jede Bild-URL wirklich ab. Er **blockiert
nicht**: ein langsamer Bildserver ist kein Grund, eine Planänderung nicht zu
veröffentlichen. Ein toter Link fällt im Protokoll auf.

Bei einem Pull Request läuft nur die Prüfung, nichts wird veröffentlicht.

---

## 5. Regeln, die nicht gebrochen werden

1. **UIDs sind unveränderlich** und werden nach dem Löschen nicht wiederverwendet.
2. **Beschreibungen gehören nach `places`.** In `days[].stops` stehen
   ausschließlich `uid` und `time`; alles andere lehnt die Prüfung ab.
3. **Stops sind zeitlich aufsteigend sortiert.** Die Array-Reihenfolge ist die
   Anzeigereihenfolge.
4. **Keine erfundenen Prognosezahlen.** In `trip.weather.notes` stehen nur Datum,
   Wochentag und ein Planungshinweis. Temperaturen und
   Regenwahrscheinlichkeiten kommen live von Open-Meteo; ohne Netz zeigt die
   Seite bewusst „keine Prognose“ statt Zahlen, die richtig aussehen, aber
   geraten sind.
5. **Bilder nur über den `images`-Block, URL immer von der API.** Keine rohen
   URLs in den Orten, keine mitgelieferten Dateien, keine selbst gebaute
   Thumbnail-Breite und kein `Special:Redirect`. Jeder Eintrag braucht `url`,
   `alt` und `license`; `credit`, sobald die Lizenz eine Namensnennung verlangt.
   `width` höchstens 1600 px.
6. **Nichts von Hand pflegen, was sich aus den Reisedateien ergibt.**
   `docs/data/trips/index.json` und `docs/trips/` sind erzeugt und stehen in der
   `.gitignore`. Wer sie einchecken will, führt genau den Fehler wieder ein, den
   sie beseitigt haben.
7. **Kein Build-Schritt über `build.mjs` hinaus.** Kein npm, kein Bundler, kein
   Framework, kein `package.json`. Wer eine Abhängigkeit einführen will, braucht
   einen guten Grund.

---

## 6. Ansehen und der Unterwegs-Zustand

Die Seite lädt ihre Daten per `fetch`; ein `file://`-Aufruf funktioniert deshalb
nicht. Vor dem Push braucht es einen Server nur, wenn man das Ergebnis wirklich
sehen will — zum Veröffentlichen nicht. Für das Erzeugen genügt
`node tools/build.mjs`, danach lässt sich `docs/` mit jedem statischen Server
ausliefern.

### Den Unterwegs-Zustand ansehen

Während einer laufenden Reise sieht die Seite anders aus: kleiner Titelkopf statt
Vollbild, Wetter als Zeile über dem Plan, eine „Als nächstes“-Karte mit Vorlauf,
und vergangene Stops des Tages sind abgesetzt. Im Alltag ist dieser Zustand
**unsichtbar** — ein Fehler darin fiele erst im Urlaub auf.

Deshalb lassen sich Datum und Uhrzeit über die Adresse setzen:

```text
…/trips/rom/?heute=2026-09-05
…/trips/rom/?heute=2026-09-05&jetzt=14:30
```

Das funktioniert auch auf der Live-Seite und damit auf dem Handy, ohne Code zu
ändern. Nur genau diese Formate werden angenommen (`JJJJ-MM-TT` und `HH:MM`); ein
Tippfehler wird ignoriert statt stillschweigend auf einen anderen Tag zu führen.

**`?heute=` wirkt auch auf der Startseite** und schaltet dort die Sortierung um
(laufend, bevorstehend, vergangen). `?jetzt=` gilt nur auf Reiseseiten — auf der
Startseite gibt es nichts, was auf Minuten reagiert.

**Fertige Links** stehen unter [`/test/`](https://cauer71.github.io/reiseplan/test/).
Die Seite erzeugt sie aus den echten Reisedaten, ist also nach jeder Planänderung
von selbst aktuell. Erreichbar über den kleinen Link am Fuß jeder Seite —
absichtlich unauffällig, aber unterwegs vom Handy aus da.

Ist ein Wert gesetzt, erscheint unten ein roter Hinweis „Testansicht“ mit einem
Link zurück zur echten Zeit. Eine Testansicht darf nicht mit der Wirklichkeit
verwechselt werden — erst recht nicht, wenn man unterwegs schnell nachsieht, was
als nächstes ansteht.

Ohne Parameter verhält sich die Seite unverändert.

---

## 7. Reihenfolge auf der Startseite

Die Kacheln werden **berechnet** sortiert, nicht gepflegt. Grundlage sind die
`isoDate`-Angaben der Tagesabschnitte: der erste ist der Reisebeginn, der letzte
das Reiseende.

| Position | Status | Sortierung innerhalb |
|---|---|---|
| oben | **läuft gerade** (heute liegt zwischen Beginn und Ende) | – |
| darunter | **bevorstehend** | nächste Reise zuerst |
| unten | **vergangen** | jüngste Reise zuerst |

Die Liste läuft also von „jetzt“ aus in beide Richtungen auseinander. Jede Kachel
trägt den Status als Kennzeichnung; vergangene Reisen sind leicht entsättigt,
bleiben aber vollständig lesbar und anklickbar.

Damit das stimmt, muss jeder Tagesabschnitt ein korrektes `isoDate` haben — die
Prüfung erzwingt das. Ein Umsortieren von Hand ist nicht nötig und nicht möglich:
die Reihenfolge in der erzeugten Reiseliste wird ignoriert.

> Sollen vergangene Reisen mit der **ältesten** beginnen, ist in
> `docs/assets/landing.js` nur der Vergleich in `sortTrips` umzudrehen.

---

## 8. Was die Seite außerdem kann

- **Deep-Links.** `#tag2` klappt einen Tag auf, `#tag2-stop-11` zusätzlich den
  Stop und scrollt hin. Diese Links sind stabil und eignen sich für
  Kalendereinträge und Nachrichten. Beim Aufklappen setzt die Seite den Link
  selbst in die Adressleiste.
- **Zustand bleibt.** Offene Karten überleben einen Reload (pro Reise, in der
  `sessionStorage` des Browsers).
- **Offline.** Beim ersten Besuch werden Seite und Daten im Hintergrund
  zwischengespeichert. Danach ist der Plan im Flugmodus vollständig lesbar.
  **Bilder und Live-Prognose fehlen dann** — beide liegen auf fremden Hosts, die
  der Service Worker nicht anfasst.
- **Die Navigationsleiste folgt dem Finger.** Beim Herunterscrollen fährt sie weg,
  beim Hochscrollen kommt sie zurück. Ein Tageswechsel lässt sie in Ruhe, obwohl
  er nach oben scrollt: sonst erschien „Alle Reisen“ bei jedem Tippen auf einen
  Tag — und die einfahrende Leiste verdeckte dabei genau die Karte, auf die eben
  gescrollt worden war.
- **Installierbar, auch auf iPhone und iPad.** Über „Zum Home-Bildschirm
  hinzufügen“ läuft die Seite ohne Browserleiste und erscheint eigenständig im
  App-Umschalter. Grundlage ist `display: standalone` im Manifest, das Safari auf
  iOS und iPadOS berücksichtigt; Service Worker laufen dort mit.

  Zwei Dinge sind dafür eigens gesetzt: `apple-mobile-web-app-title` gibt den
  Namen unter dem Icon vor — ohne das nähme iOS `document.title`, und den setzt
  `app.js` auf den vollen Reisetitel mit über 50 Zeichen. Und
  `apple-mobile-web-app-capable` bleibt für iOS vor 16.4, wo das
  Manifest-`display` noch nicht griff.

  **Der Start-Punkt kommt aus dem Manifest, nicht von der Seite, auf der man
  installiert.** `start_url` steht auf `./`, also öffnet ein Icon immer die
  Übersicht — auch wenn man es von der Rom-Seite aus angelegt hat. Wer ein Icon
  je Reise will, braucht ein eigenes Manifest je Reise mit passender `start_url`.
- **Live-Wetter in den Tageskarten.** Sobald die Prognose geladen ist, ersetzt sie
  über `isoDate` den statischen Hinweis in der jeweiligen Tageskarte.
