# Reisepläne aus Cowork pflegen

Diese Anleitung ist die verbindliche Beschreibung, wie die Inhalte dieser Website
geändert werden. Sie richtet sich an Cowork bzw. Claude Code – und an jeden
Menschen, der dieselben Änderungen von Hand machen will.

**Grundsatz:** Reihenfolge und Inhalt sind getrennt gespeichert. Einen Stop zu
verschieben oder eine Tagesreihenfolge umzustellen bewegt genau **eine Zeile** –
niemals einen Textblock. Deshalb sind Umstellungen billig, gut überprüfbar und im
Diff sofort lesbar.

---

## 1. Was dieses Repo ist

Eine statische Website ohne Build-Schritt. Alles unter `docs/` ist die Seite; die
GitHub-Action `.github/workflows/pages.yml` lädt diesen Ordner bei jedem Push auf
`main` unverändert nach GitHub Pages.

Live: <https://cauer71.github.io/reiseplan/>

```text
docs/
├── index.html                      Startseite mit den Reisekacheln
├── manifest.webmanifest            „Zum Homescreen hinzufügen“
├── sw.js                           Service Worker für die Offline-Nutzung
├── assets/app.js                   Darstellung einer Reise (für alle Reisen gleich)
├── assets/landing.js               Darstellung der Startseite
├── assets/styles.css               gemeinsames Design
├── data/trips/index.json           welche Reisen es gibt (Reihenfolge wird berechnet)
├── data/trips/rom.json             ← hier stehen die Inhalte
├── data/trip.schema.json           Datenvertrag, maschinenlesbar
├── icons/                          App-Icons
└── trips/<slug>/index.html         eigene URL je Reise

tools/
├── plan.py                         Umstellungen per Befehl (das Hauptwerkzeug)
├── validate_trips.py               Prüfung aller Reisedaten
└── tripdata.py                     gemeinsame Helfer

SYSTEMPROMPT.md                     Auftrag für eine KI, die eine Reisedatei erzeugt
```

Für **Inhaltsänderungen** ist ausschließlich `docs/data/trips/` relevant. `assets/`
muss dafür nie angefasst werden.

Die Werkzeuge sind in Python geschrieben und nutzen ausschließlich die
Standardbibliothek. Deshalb laufen sie ohne `npm install`, ohne Build und ohne
jede Vorbereitung – auch in einer frisch geklonten Cowork-Sitzung vom Handy aus.
Das ist der Grund für diese Wahl, siehe Abschnitt 4.

---

## 2. Das Datenmodell

Jede Reise ist **eine** Datei mit vier Blöcken:

| Block | Inhalt | Ändert sich |
|---|---|---|
| `trip` | Titel, Datum, Reisende, Einleitung, Wetterkoordinaten | selten |
| `days` | Tagesabschnitte und **nur** die Reihenfolge: `{ uid, time }` | oft |
| `places` | die Ortsbeschreibungen, nach UID sortiert | wenn Inhalte dazukommen |
| `images` | je Bildschlüssel einmal URL, Alt-Text, Urheber und Lizenz | mit neuen Bildern |

```jsonc
{
  "trip": { … },

  "days": [
    {
      "id": "tag1",                  // stabile Anker-ID, auch für Deep-Links
      "label": "Tag 1",
      "date": "Mo 06.07.",           // Anzeige
      "isoDate": "2026-07-06",       // maschinenlesbar, für die Wetterzuordnung
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
      "url": "https://upload.wikimedia.org/…/Roma_termini_01.jpg",
      "width": 1440, "height": 810,   // gegen Layoutsprünge beim Nachladen
      "alt": "Bahnhof Roma Termini",  // beschreibend, kein Dateiname
      "credit": "Nutzername",         // Pflicht bei CC BY(-SA), entbehrlich bei CC0
      "license": "CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:…"
    }
  }
}
```

### Bilder sind verlinkt, nicht mitgeliefert

`image` in einem Ort ist ein **Schlüssel** in den `images`-Block, keine Datei und
keine rohe URL. Der Umweg über das Verzeichnis hat drei Gründe:

- Ein Motiv wird oft mehrfach benutzt — `cucina` steckt in sieben Essensstopps.
  Bricht der Link, ist es **eine** Korrektur statt sieben.
- CC BY und CC BY-SA verlangen **Namensnennung**. Die braucht einen festen Platz,
  und die Seite rendert daraus den Abschnitt „Bildnachweis" — **aber nur für die
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

`title`, `detail`, `description`, `image`, `place` und `weather` sind Pflicht.
`address`, `duration`, `price` und `tip` erscheinen als Faktenblock unter der
Beschreibung; fehlende Felder werden übersprungen.

### Wettertauglichkeit und feste Termine

Zwei Felder steuern, was beim Umplanen passieren darf:

| Feld | Werte | Bedeutung |
|---|---|---|
| `weather` | `aussen` | im Freien, bei Regen problematisch |
| | `innen` | überdacht, taugt als Regenblock |
| | `beides` | wetterunabhängig oder gemischt |
| `fixed` | `true` oder fehlt | fester Termin: Flug, Transfer, Check-out, gebuchtes Zeitfenster |

`weather` ist die Grundlage für `plan.py wetter` – damit lässt sich der Auftrag
„es regnet heute" beantworten, ohne die Beschreibungen zu lesen.

`fixed` ist eine **Schutzschaltung**. `move`, `time`, `swap` und `order`
verweigern die Änderung eines festen Termins und nennen den Grund. Das verhindert
den teuren Fehler beim Umplanen: einen umsortierten Tag, der den Rückflug
mitnimmt. Wirklich nötige Ausnahmen brauchen ausdrücklich `--force`.

> Ein Ort kann `aussen` **und** `fixed` sein – etwa das Kolosseum mit gebuchtem
> Zeitfenster. Solche Punkte sind bei Regen das eigentliche Problem und lassen
> sich nicht tauschen; `plan.py wetter` weist eigens darauf hin.

### Die UID ist die Klammer

Jeder Ort hat eine stabile zweistellige UID. Sie verbindet die Website mit dem
Google-Kalender­eintrag (`[REISE-…] [UID:05]`) und ist der Schlüssel in `places`.

Auf der Seite steht sie unauffällig am **Fuß der geöffneten Stop-Karte**. In der
zugeklappten Übersicht erscheint sie bewusst nicht: dort zählt die Reise­information,
nicht der technische Schlüssel.

> **Eine UID wird nie geändert und nie neu vergeben.** Ein Stop wird verschoben,
> umsortiert, zeitlich verlegt oder entfernt – seine UID bleibt dieselbe. Eine
> gelöschte UID wird nicht wiederverwendet; neue Orte bekommen die nächste freie
> Nummer.

---

## 3. Die Befehle

Alle Befehle laufen im Repo-Wurzelverzeichnis. Jeder schreibende Befehl prüft die
Datei **vorher** und schreibt nur, wenn sie stimmig bleibt – eine kaputte Datei
kann so nicht entstehen.

> **Interpreter-Name.** Die Beispiele nutzen `python3`, weil das in Linux-Umgebungen
> gilt – also in der Cowork-Cloud, die der Regelfall ist. Auf einem Windows-Rechner
> heißt der Befehl `python`; `python3` ist dort ein Platzhalter, der mit einem Hinweis
> auf den Microsoft Store abbricht. Falls beides fehlschlägt, sind die Skripte
> ausführbar: `./tools/plan.py show rom`.

### Ansehen

```bash
python3 tools/plan.py show rom
```

Zeigt alle Tagesabschnitte mit UID, Uhrzeit und Titel. Mit einem Tag als zweitem
Argument nur diesen:

```bash
python3 tools/plan.py show rom tag2
```

Am Ende listet `show` Ortsbeschreibungen auf, die keinem Tag zugeordnet sind.
Das ist der erste Befehl bei jedem Auftrag – ohne die UIDs geht nichts.

### Stop in einen anderen Tag verschieben

```bash
python3 tools/plan.py move rom 05 tag2 --time 10:30
```

Nimmt UID 05 aus seinem bisherigen Tag heraus und setzt ihn in `tag2` an der
zeitlich passenden Stelle ein. Ohne `--time` behält der Stop seine Uhrzeit.

### Uhrzeit ändern

```bash
python3 tools/plan.py time rom 11 09:30
```

Der Stop rutscht dabei automatisch an die richtige Position im Tag.

### Reihenfolge innerhalb eines Tages umstellen

```bash
python3 tools/plan.py order rom tag1 01,02,04,03,05,06,07
```

Die Liste muss **genau** die UIDs dieses Tages enthalten – nicht mehr und nicht
weniger. Die Uhrzeiten des Tages bleiben stehen und werden auf die neue
Reihenfolge verteilt: der erste genannte Stop bekommt die früheste Uhrzeit, der
zweite die nächste und so weiter. Genau das braucht man, wenn nur die Abfolge
innerhalb eines Tages anders sein soll.

### Regentag analysieren

```bash
python3 tools/plan.py wetter rom tag1
```

Ändert **nichts**, sondern beantwortet die Frage „was tue ich, wenn es heute
regnet". Die Ausgabe nennt:

- fest gebuchte Außentermine, die sich nicht tauschen lassen (nur Regenschutz hilft)
- die tauschbaren Außenpunkte des Tages samt Hinweis
- überdachte Kandidaten aus den anderen Tagen
- einen Vorschlag, gepaart nach **ähnlicher Tageszeit**, mit fertigen `swap`-Befehlen

Die Tageszeit ist wichtig, weil `swap` die Uhrzeiten mit tauscht: ohne Paarung
landet sonst ein Mittagessen um 16 Uhr.

### Zwei Stops tauschen

```bash
python3 tools/plan.py swap rom 11 24
```

Tauscht Platz **und** Uhrzeit – auch über Tagesgrenzen hinweg. Der typische
Wetter­tausch: der Innenraum kommt in den Regentag, der Außenpunkt in den
schönen Tag.

### Cache-Version anheben

```bash
python3 tools/plan.py bump
```

Erhöht den `?v=`-Parameter in allen HTML-Dateien. Mit `--version 20260726-4`
lässt sich ein Wert erzwingen.

**Nötig nach Änderungen an CSS, JavaScript oder HTML.** Für reine
Planänderungen ist es **nicht** nötig: die Reisedaten werden mit
`cache: "no-cache"` geladen, also per ETag zurückgefragt statt zehn Minuten
blind gecacht. Eine verschobene Attraktion ist damit sofort nach dem Deploy
sichtbar – wichtig, wenn man unterwegs nur das Handy hat und nicht warten kann.

---

## 4. Notfall am Reiseort – nur mit dem Handy

**Das ist der wichtigste Anwendungsfall dieses Repos.** Das Wetter kippt, der Plan
muss heute anders aussehen, und zur Verfügung steht nur ein Telefon. Der Rechner
zu Hause ist aus.

### Ablauf

1. Cowork auf dem Handy öffnen und eine Sitzung auf `cauer71/reiseplan` starten.
   Die Umgebung klont frisch; es muss nichts installiert werden, weil die
   Werkzeuge reine Python-Standardbibliothek sind.
2. In eigenen Worten sagen, was sich ändern soll (Beispiele unten).
3. Ergebnis mit `show` gegenlesen, committen, pushen.
4. Die Action prüft und deployt. Nach etwa einer Minute ist
   <https://cauer71.github.io/reiseplan/> aktuell – ohne `bump`, weil die
   Reisedaten per ETag zurückgefragt werden.

**Für Planänderungen ist `bump` nicht nötig.** Ein Befehl, ein Commit, fertig.

### Was gesagt wird und was zu tun ist

| Auftrag am Telefon | Befehl |
|---|---|
| **„Es regnet heute"** | `plan.py wetter rom tag1` – liefert fertige Tauschvorschläge |
| „Mach den Tausch aus Vorschlag 2" | `plan.py swap rom 05 24` |
| „Zieh das MAXXI auf den Vormittag" | `plan.py time rom 11 09:45` |
| „Verschieb Coppedè auf Tag 3, nachmittags" | `plan.py move rom 06 tag3 --time 15:30` |
| „Dreh die Reihenfolge von Tag 1: erst das MAXXI, dann Lunch" | `plan.py order rom tag1 01,02,04,03,05,06,07` |
| „Was ist heute geplant?" | `plan.py show rom tag1` |

Bei „es regnet" ist `wetter` immer der erste Befehl – er zeigt in einem Durchgang,
was betroffen ist und welche Tausche in Frage kommen. Danach nur noch den
vorgeschlagenen `swap` ausführen.

Für alles andere gilt: zuerst `show`. Es kennzeichnet jeden Stop mit `außen`,
`innen` oder `FEST`, sodass die Lage ohne Lesen der Beschreibungen erkennbar ist.

### Regeln für den Notfall

- **Nur `days[].stops` anfassen.** Beschreibungen, Bilder und UIDs bleiben, wie
  sie sind – es geht ausschließlich um Reihenfolge und Uhrzeit.
- **Nichts löschen.** Ein Stop, der heute nicht passt, wird verschoben, nicht
  entfernt.
- **Feste Termine bleiben stehen.** Flüge, Transfers, Check-out und gebuchte
  Zeitfenster sind mit `fixed` markiert; das Werkzeug verweigert sie von selbst.
  `--force` nur, wenn der Reisende das ausdrücklich verlangt hat.
- **Nach dem Push kurz prüfen**, dass die Action grün ist. Sie ist die einzige
  Rückmeldung, ob die Datei stimmig blieb.

> **Einmal vor der Reise testen.** Der Weg funktioniert nur mit Netz und nur,
> wenn die Cowork-Sitzung Schreibrechte auf das Repository hat. Das sollte man
> einmal vom Handy aus durchgespielt haben, bevor man es im Regen braucht.

---

## 5. Weitere typische Aufträge

### „Ändere den Wetterhinweis eines Tages“

Nur der Text `days[].weather` in der JSON-Datei. Das ist der **statische
Planungshinweis** („Wettercheck: …“); die Zahlen daneben kommen live von der API
und werden nicht in der Datei gepflegt.

### Neuen Ort hinzufügen

1. Bild in den `images`-Block eintragen — oder einen vorhandenen Schlüssel
   wiederverwenden, wenn das Motiv passt. Pflicht sind `url` (https), `alt` und
   `license`, dazu `credit`, wenn die Lizenz eine Nennung verlangt;
   `width`/`height` verhindern Layoutsprünge.
2. Nächste freie UID ermitteln (höchster Schlüssel in `places` + 1, zweistellig).
3. Eintrag in `places` anlegen – alle Pflichtfelder, `description` mit
   mindestens zwei Absätzen und `weather` gesetzt. `fixed: true` nur bei
   Flügen, Transfers oder gebuchten Zeitfenstern.
4. `{ "uid": "28", "time": "14:00" }` an der zeitlich richtigen Stelle in das
   `stops`-Array des gewünschten Tages einfügen.
5. Prüfen und Version anheben:

```bash
python3 tools/validate_trips.py
python3 tools/plan.py bump
```

### Ort entfernen

Die Zeile aus `days[].stops` **und** den Eintrag aus `places` löschen – die
Prüfung meldet sonst eine verwaiste Beschreibung. Die freigewordene UID bleibt
frei.

### Neue Reise anlegen

1. `docs/data/trips/<slug>.json` aus einer bestehenden Reise ableiten.
2. `docs/trips/<slug>/index.html` kopieren und darin `data-trip`, `title`,
   `description` und die vier `og:`-Angaben anpassen.
3. Slug in `docs/data/trips/index.json` ergänzen. Die Reihenfolge dort ist ohne
   Bedeutung – die Startseite sortiert selbst (siehe unten). Titel, Datum und
   Untertitel **nicht** wiederholen, die liest die Startseite aus der Reisedatei.
4. Die Reise in `SHELL` in `docs/sw.js` aufnehmen, damit sie offline verfügbar ist.
5. `python3 tools/validate_trips.py` und `python3 tools/plan.py bump`.

---

## 6. Regeln, die nicht gebrochen werden

1. **UIDs sind unveränderlich** und werden nach dem Löschen nicht wiederverwendet.
2. **Beschreibungen gehören nach `places`.** In `days[].stops` stehen
   ausschließlich `uid` und `time`; alles andere lehnt die Prüfung ab.
3. **Stops sind zeitlich aufsteigend sortiert.** Die Array-Reihenfolge ist die
   Anzeigereihenfolge – `plan.py` hält das automatisch ein.
4. **Keine erfundenen Prognosezahlen.** In `trip.weather.notes` stehen nur
   Datum, Wochentag und ein Planungshinweis. Temperaturen und Regenwahr­schein­lich­keiten
   kommen live von Open-Meteo; ohne Netz zeigt die Seite bewusst „keine Prognose“
   statt Zahlen, die richtig aussehen, aber geraten sind.
5. **Bilder nur über den `images`-Block.** Keine rohen URLs in den Orten, keine
   mitgelieferten Dateien. Jeder Eintrag braucht `url`, `alt` und `license`.
   `credit` ist Pflicht, sobald die Lizenz eine Namensnennung verlangt — bei CC0
   und Gemeinfreiheit darf es fehlen. Signierte URLs sind verboten, weil sie
   verfallen.
6. **`bump` nach Änderungen an CSS, JavaScript oder HTML**, sonst sehen Besucher
   die alte Fassung. Für reine Planänderungen ist es nicht nötig.
7. **Kein Build-Schritt.** Es gibt bewusst kein npm, kein Bundler, kein
   Framework. Wer eine Abhängigkeit einführen will, braucht einen guten Grund.

---

## 7. Prüfen, ansehen, veröffentlichen

### Prüfen

```bash
python3 tools/validate_trips.py
```

Geprüft wird:

- JSON ist gültig, alle Pflichtfelder sind da
- jede UID ist zweistellig, genau einmal eingeplant und hat einen `places`-Eintrag
- keine verwaisten Ortsbeschreibungen
- jeder Bildschlüssel steht im `images`-Block, jeder Eintrag hat URL, Alt-Text
  und Lizenz, bei nennungspflichtiger Lizenz auch den Urheber, und kein Eintrag
  ist unbenutzt
- Uhrzeiten sind `HH:MM` und innerhalb eines Tages aufsteigend
- `isoDate` ist ein echtes Datum und liegt nach dem Vortag
- `tone` ist einer der vier erlaubten Werte
- `description` ist eine Liste mit mindestens zwei Absätzen
- `weather` ist gesetzt und einer von `aussen`, `innen`, `beides`
- `fixed` ist entweder `true` oder fehlt
- `trip.weather.notes` enthält keine Prognosezahlen
- `ticketUrl` ist eine `https`-Adresse

Dieselbe Prüfung läuft in GitHub Actions **vor** dem Deploy. Kaputte Reisedaten
können nicht live gehen.

### Lokal ansehen

```bash
python -m http.server 8099 --directory docs
```

Dann <http://localhost:8099/> öffnen. Ein `file://`-Aufruf funktioniert nicht,
weil die Seite ihre Daten per `fetch` lädt.

Beim Testen von Änderungen stört der Service Worker: In den DevTools unter
*Application → Service Workers* „Update on reload“ aktivieren oder mit
Strg+Shift+R neu laden.

### Den Unterwegs-Zustand ansehen

Während einer laufenden Reise sieht die Seite anders aus: kleiner Titelkopf statt
Vollbild, Wetter als Zeile über dem Plan, eine „Als nächstes“-Karte mit Vorlauf,
und vergangene Stops des Tages sind abgesetzt. Im Alltag ist dieser Zustand
**unsichtbar** – ein Fehler darin fiele erst im Urlaub auf.

Deshalb lassen sich Datum und Uhrzeit über die Adresse setzen:

```text
…/trips/rom/?heute=2026-09-05
…/trips/rom/?heute=2026-09-05&jetzt=14:30
```

Das funktioniert auch auf der Live-Seite und damit auf dem Handy, ohne Code zu
ändern. Nur genau diese Formate werden angenommen (`JJJJ-MM-TT` und `HH:MM`); ein
Tippfehler wird ignoriert statt stillschweigend auf einen anderen Tag zu führen.

Ist ein Wert gesetzt, erscheint unten ein roter Hinweis „Testansicht“ mit einem
Link zurück zur echten Zeit. Eine Testansicht darf nicht mit der Wirklichkeit
verwechselt werden – erst recht nicht, wenn man unterwegs schnell nachsieht, was
als nächstes ansteht.

Ohne Parameter verhält sich die Seite unverändert.

### Veröffentlichen

```bash
git add -A
git commit -m "Rom: Centrale Montemartini wegen Regen vorgezogen"
git push
```

Die Action prüft, deployt und die Seite ist nach wenigen Minuten aktuell.

---

## 8. Reihenfolge auf der Startseite

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

Damit das stimmt, muss jeder Tagesabschnitt ein korrektes `isoDate` haben – die
Prüfung erzwingt das. Ein Umsortieren von Hand ist nicht nötig und nicht möglich:
die Reihenfolge in `index.json` wird ignoriert.

> Sollen vergangene Reisen mit der **ältesten** beginnen, ist in
> `docs/assets/landing.js` nur der Vergleich in `sortTrips` umzudrehen.

---

## 9. Was die Seite außerdem kann

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
- **Installierbar.** Über „Zum Homescreen hinzufügen“ läuft die Seite wie eine App.
- **Live-Wetter in den Tageskarten.** Sobald die Prognose geladen ist, ersetzt sie
  über `isoDate` den statischen Hinweis in der jeweiligen Tageskarte.
