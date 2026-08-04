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
      "url": "https://upload.wikimedia.org/…/960px-Roma_termini_01.jpg",
      "width": 960, "height": 640,    // muss zur Breite in der Adresse passen
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
&iiprop=url|size|extmetadata&iiurlwidth=960"
```

`thumburl` → `url` (ohne `?`-Anhang), die Breite **aus der Adresse** → `width`,
`thumbheight` → `height`,
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

Die Prüfung lehnt beides ab: `Special:Redirect` und `width` über 1600 px.

1600 ist aber nur die Notbremse. **Gewünscht ist die kleinste Breite, die die
Seite wirklich zeigt** — und das sind zwei Werte:

| Bild | Breite | warum |
|---|---|---|
| `trip.heroImage` | 1280 px | füllt den Bildschirm |
| `days[].heroImage`, jedes `places[].image` | 960 px | höchstens Spaltenbreite, rund 416 px |

Ein Ortsbild erscheint zweimal: als 2,6-rem-Kreis in der Zeitachse (42 px) und in
voller Spaltenbreite, wenn die Karte offen ist. Bei doppelter Pixeldichte sind das
832 px; 1280 wären das Dreifache des Nötigen. Diese Bytes zahlt der Reisende,
unterwegs womöglich mit Roaming.

**Warum 960 und nicht 800:** Commons hält Thumbnails nur in bestimmten Stufen vor.
Wird eine Breite dazwischen angefragt, liefert die Adresse die nächsthöhere Stufe,
`thumbwidth` meldet aber die angefragte — und dann passt die Angabe nicht zum Bild.
Belegt an zwei Dateien: 800 ergibt eine 960er-Adresse, 1024 eine 1280er; 960 und
1280 stimmen. **Genau daraus entstand ein echter Fehler:** 13 Rom-Bilder trugen
`width: 1400` und lieferten 1920 px. Damit war die 1600er-Grenze umgangen, und die
Maße, die Layoutsprünge verhindern sollen, verursachten welche. Die Prüfung
vergleicht deshalb jetzt die Angabe mit der Breite in der Adresse.

Breitere Bilder werden **gemeldet, nicht abgelehnt**: zu groß ist richtig, nur
teuer. Der Hinweis steht im Protokoll der Action.

> Über die API ist die Breite **frei wählbar** — sie erzeugt das Thumbnail bei
> Bedarf. Nur eine selbst in die URL geschriebene Breite scheitert. Geprüft an
> jener Datei, die bei Handarbeit ausschließlich 1280 px annahm: über
> `iiurlwidth=960` liefert sie anstandslos 960 px.

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

### Der zweite Abnehmer: der Google-Kalender

Die Reisedatei speist nicht nur die Website, sondern auch **Termine im
Google-Kalender**, einen je Stop. Drei Felder gibt es allein dafür — die Seite
braucht sie nicht, und deshalb fällt ihr Fehlen dort nicht auf:

| Feld | Wofür |
|---|---|
| `trip.timezone` | IANA-Name wie `Europe/Rome`. Ohne Zeitzone ist `09:30` nicht eindeutig. Lag früher nur unter `trip.weather` und fehlte damit ganz, sobald das Wetter abgeschaltet war. |
| `places[].minutes` | Dauer als **Zahl**, damit der Termin ein Ende hat. `duration` daneben bleibt Prosa für den Faktenblock („ca. 60–75 Min. als erster Teil einer Führung") — daraus rechnet keine Maschine. Bei einer Spanne die obere Grenze. |
| `places[].address` | wird das Ortsfeld des Termins |

Der Bau **meldet** fehlende Angaben, blockiert aber nicht: eine Reise ohne sie ist
als Website vollständig. Der Hinweis steht im Protokoll der Action.

Im Termin steht **keine** technische Kennung: kein Reise-Tag, keine UID, kein Link
auf die Reiseseite. Er sieht aus wie von Hand angelegt. Wiedererkannt wird beim
nächsten Durchlauf über Zielkalender, Reisezeitraum und Titel — das setzt voraus,
dass im Zielkalender nur Urlaubsreisen stehen.

Die UID bleibt trotzdem unveränderlich: sie ist die Identität eines Ortes in der
Reisedatei und der Anker der Deep-Links auf der Website.

**→ [KALENDER.md](KALENDER.md)** beschreibt vollständig, was aus einem Stop ein
Termin wird: Felder, Beschreibung, Deep-Link, Aktualisieren statt Verdoppeln, und
was nicht gemacht wird.

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
- **kein Titel kommt zweimal vor** — er ist im Kalender die Kennung des Termins

Nicht blockierend gemeldet werden außerdem: fehlende Kalenderangaben
(`trip.timezone`, `places[].minutes`), Bilder breiter als nötig oder mit falscher
Breitenangabe, ein `place`, das eine Route statt eines Ortes enthält, und
Beschreibungen, die ohne die Anfahrtszeile nur einen Absatz übrig lassen.

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

## 6. Was nicht in dieses Repo gehört

**Dieses Repo ist öffentlich, und die Seite hat kein Passwort.** Wer die Adresse
kennt, liest alles — auch ohne GitHub-Konto, auch über Suchmaschinen und
Link-Vorschauen. Das ist bewusst so gewählt und dafür gilt:

Alles in einer Reisedatei ist damit veröffentlicht. Unterkunft mit Adresse, Namen
der Reisenden, Uhrzeiten, an denen niemand zu Hause ist. Das ist für diese Reisen
in Kauf genommen — aber es ist eine Entscheidung, die bei jeder neuen Angabe neu
zu treffen ist, nicht eine, die schon getroffen wurde.

**Ohne ausdrückliche Freigabe kommt nichts davon hinein:**

- Tickets und Buchungsbelege, insbesondere als PDF oder Bild. **Ein QR-Code, der
  öffentlich erreichbar ist, kann von jedem eingelöst werden** — auch von jemandem,
  der zufällig darauf stößt. Ein unratbarer Dateiname schützt nicht: Vorschaudienste
  und Crawler finden ihn. `ticketUrl` verweist deshalb auf den Anbieter, nie auf eine
  Datei im Repo.
- Buchungsnummern, Reservierungscodes, Sitzplatznummern, Namen auf Bordkarten.
- Telefonnummern, Mailadressen, private Kontaktdaten Dritter.
- Zugangsdaten jeder Art. `.env*` und `*.pem` stehen in der `.gitignore`, aber
  darauf ist kein Verlass — sie gehören gar nicht erst in den Ordner.

**Keine Umgehung** über einen anderen Pfad, einen anderen Branch, eine temporäre
Kopie oder einen Commit, der später wieder entfernt wird. **Was einmal gepusht
wurde, bleibt im Verlauf** und ist über die API abrufbar, auch wenn der nächste
Commit es löscht. Ein Geheimnis, das im Verlauf steht, ist verbrannt — es muss
beim Anbieter gewechselt werden, nicht im Repo gelöscht.

Im Zweifel: nicht committen, sondern fragen.

---

## 7. Wann nichts geändert wird

Nichts ändern, nichts committen und **keinen Erfolg melden**, wenn:

- `COWORK.md` oder eine andere benötigte Datei nicht lesbar ist
- der aktuelle Stand des Repositorys nicht geprüft werden kann
- die Datenstruktur unklar ist
- eine Änderung einen als `fixed` gekennzeichneten Termin verschieben würde
- die Zuordnung einer UID unklar ist
- persönliche Daten ohne Freigabe veröffentlicht würden (siehe Abschnitt 6)
- die Prüfung `node tools/build.mjs --check` fehlschlägt
- die GitHub-Action fehlschlägt
- die veröffentlichte Seite nicht zuverlässig geprüft werden kann

In diesen Fällen den **konkreten** Grund nennen, dass der Stand unverändert ist,
und den nächsten sinnvollen Schritt. Nicht raten und nicht mehrfach blind
committen: die Prüfung nennt jedes Problem einzeln mit Feld und Grund.

Der aktuelle Stand im Repository ist immer maßgeblich. Ein alter Checkout, eine
hochgeladene Kopie oder ein früherer Gesprächsinhalt ist **keine** Quelle für den
Stand einer Datei.

---

## 8. Was am Ende gemeldet wird

Nach erfolgreicher Arbeit knapp:

- was geändert wurde und warum
- welche Dateien betroffen sind
- der Commit-Link
- der Status der GitHub-Action
- der Link auf die veröffentlichte Seite
- welche Ansichten geprüft wurden (Desktop, Handy, Interaktion)
- was offen geblieben ist

Bei Änderungen an der Darstellung gilt die Arbeit erst als erfolgreich, wenn die
**veröffentlichte** Seite den neuen Stand wirklich ausliefert — nicht schon, wenn
der Commit durch ist. Zwischen Commit und ausgelieferter Seite liegen die Action
und der Cache.

Offene Punkte nicht verschweigen. Ein ungebuchtes Ticket, eine unbestätigte
Öffnungszeit, ein Bild ohne passendes Motiv: das gehört in die Meldung, auch wenn
alles andere gelungen ist.

---

## 9. Ansehen und der Unterwegs-Zustand

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

## 10. Reihenfolge auf der Startseite

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

## 11. Was die Seite außerdem kann

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
