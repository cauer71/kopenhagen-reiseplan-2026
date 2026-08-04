# Reiseplan

Bildstarke, mobil lesbare Reisepläne als statische Website.
Live: <https://cauer71.github.io/reiseplan/>

Jede Reise besteht aus Tagesabschnitten, die sich aufklappen lassen. Darin liegen
die einzelnen Stops mit ausführlicher Beschreibung des Ortes, Adresse, Dauer,
Hinweisen, Kartenlink und – wo vorhanden – Ticketlink.

## Eine Reise hinzufügen oder entfernen

Eine `.json` nach `docs/data/trips/` legen, committen, pushen.

```text
docs/data/trips/rom.json       →  https://cauer71.github.io/reiseplan/trips/rom/
docs/data/trips/mailand.json   →  https://cauer71.github.io/reiseplan/trips/mailand/
```

Die Datei löschen entfernt die Reise wieder — Kachel und Unterseite verschwinden
mit ihr. Es gibt keine Liste zu pflegen, keine Unterseite anzulegen und keine
Cache-Version anzuheben.

Der Dateiname wird der Slug und damit Teil der Adresse: nur Kleinbuchstaben,
Ziffern und Bindestriche.

## Wie es gebaut ist

Kein Framework, keine Abhängigkeiten, kein `package.json`. Der Ordner `docs/` ist
die Website. Die GitHub-Action prüft die Reisedaten, erzeugt die zwei Stücke, die
sich nicht in einer Reisedatei unterbringen lassen, und lädt alles nach GitHub
Pages:

| Erzeugt (nicht eingecheckt) | Wozu |
|---|---|
| `docs/data/trips/index.json` | welche Reisen es gibt — GitHub Pages kann keinen Ordner auflisten |
| `docs/trips/<slug>/index.html` | die Hülle je Reise, mit Titel, Themenfarbe und Vorschaubild aus der Reisedatei |

Ein gemeinsames Template (`docs/assets/app.js`) rendert jede Reise aus ihrer
JSON-Datei; die Darstellung ist für alle Reisen dieselbe.

Die Seite funktioniert offline: Beim ersten Besuch legt ein Service Worker Seite
und Daten ab. Unterwegs ohne Netz ist der Plan damit vollständig lesbar – Bilder
und Live-Prognose fehlen dann, weil beide auf fremden Hosts liegen. Über „Zum
Home-Bildschirm hinzufügen“ läuft sie wie eine App — auf Android ebenso wie auf
iPhone und iPad, dort ohne Browserleiste und mit eigenem Eintrag im
App-Umschalter.

Bilder werden **verlinkt, nicht mitgeliefert**. Jede Reisedatei hat dafür einen
`images`-Block mit URL, Alt-Text und Lizenz je Motiv, dazu den Urheber, wo die
Lizenz eine Nennung verlangt. Der Bildnachweis auf der Seite zeigt genau diese
Bilder — CC0 und Gemeinfreies bleibt draußen.

## Prüfen und bauen

```bash
node tools/build.mjs             # prüfen und erzeugen
node tools/build.mjs --check     # nur prüfen, nichts schreiben
node tools/build.mjs --bilder    # jede Bild-URL abrufen, braucht Netz
```

Nur die Node-Standardbibliothek, nichts zu installieren. Dasselbe läuft in GitHub
Actions vor jedem Deploy: stimmt eine Reisedatei nicht, geht nichts live und die
vorige Fassung bleibt online.

Geprüft werden Vollständigkeit, eindeutige UIDs, auflösbare Bildschlüssel samt
Lizenz- und, wo nötig, Urheberangabe, aufsteigende Uhrzeiten, gültige Datumsangaben
und die Bild-URLs auf verbotene Formen (signierte Google-Links, `Special:Redirect`,
Breiten über 1600 px). Details in [COWORK.md](COWORK.md).

## Inhalte ändern

**→ [COWORK.md](COWORK.md)** beschreibt das Datenmodell.

Der Kern: Reihenfolge und Inhalt sind getrennt. Ein Stop zu verschieben oder eine
Tagesreihenfolge umzustellen bewegt eine Zeile, nicht einen Textblock. Die
Reisedateien selbst entstehen außerhalb dieses Repos; `SYSTEMPROMPT.md` ist der
Auftrag dafür.

## Struktur

```text
docs/                      die Website (wird deployt)
├── data/trips/            Reisedaten – hier stehen alle Inhalte
├── data/trip.schema.json  Datenvertrag, maschinenlesbar
├── assets/                Template, Startseite, Design
├── test/                  fertige Testlinks (aus den Daten erzeugt)
└── sw.js                  Offline-Cache

tools/build.mjs            prüft und baut (läuft in der Action)
COWORK.md                  Anleitung zum Pflegen der Inhalte
SYSTEMPROMPT.md            Auftrag für eine KI, die eine Reisedatei erzeugt
KALENDER.md                wie aus einem Stop ein Google-Kalender-Termin wird
```

Aus derselben Reisedatei entstehen zwei Dinge: diese Website und **Termine im
Google-Kalender**, einer je Stop, wiedererkennbar über `[REISE-ROM-2026-09] [UID:05]`
in der letzten Zeile der Terminbeschreibung.
Geschrieben werden sie über den Kalender-Konnektor der erzeugenden Anwendung;
[KALENDER.md](KALENDER.md) beschreibt die Regeln.

Bilder: verlinkt, je Reise im `images`-Block mit Urheber und Lizenz — derzeit
[Wikimedia Commons](https://commons.wikimedia.org/). Wetter:
[Open-Meteo](https://open-meteo.com/). Karten: Google Maps.
