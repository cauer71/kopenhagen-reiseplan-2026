# Reiseplan

Bildstarke, mobil lesbare Reisepläne als statische Website.
Live: <https://cauer71.github.io/reiseplan/>

- **Rom** · 05.–08. September 2026 → [`/trips/rom/`](https://cauer71.github.io/reiseplan/trips/rom/)

Jede Reise besteht aus Tagesabschnitten, die sich aufklappen lassen. Darin liegen
die einzelnen Stops mit ausführlicher Beschreibung des Ortes, Adresse, Dauer,
Hinweisen, Kartenlink und – wo vorhanden – Ticketlink.

## Wie es gebaut ist

Kein Build-Schritt, kein Framework, keine Abhängigkeiten. Der Ordner `docs/` ist
die Website und wird von GitHub Actions unverändert nach GitHub Pages deployt.
Ein gemeinsames Template (`docs/assets/app.js`) rendert jede Reise aus einer
JSON-Datei; für eine neue Reise kommen eine Datendatei und eine Unterseite hinzu,
die Darstellung bleibt unverändert.

Die Seite funktioniert offline: Beim ersten Besuch legt ein Service Worker Seite
und Daten ab. Unterwegs ohne Netz ist der Plan damit vollständig lesbar – Bilder
und Live-Prognose fehlen dann, weil beide auf fremden Hosts liegen. Über „Zum
Homescreen hinzufügen“ läuft sie wie eine App.

Bilder werden **verlinkt, nicht mitgeliefert**. Jede Reisedatei hat dafür einen
`images`-Block mit URL, Alt-Text, Urheber und Lizenz je Motiv; daraus rendert die
Seite den Bildnachweis.

## Inhalte ändern

**→ [COWORK.md](COWORK.md)** beschreibt das Datenmodell und die Befehle.

Der Kern: Reihenfolge und Inhalt sind getrennt. Ein Stop zu verschieben oder eine
Tagesreihenfolge umzustellen bewegt eine Zeile, nicht einen Textblock.

```bash
python3 tools/plan.py show  rom                     # Überblick mit allen UIDs
python3 tools/plan.py move  rom 10 tag2             # Stop in einen anderen Tag
python3 tools/plan.py order rom tag1 13,14,15,10,12,16
python3 tools/plan.py swap  rom 10 17               # Wettertausch
python3 tools/plan.py bump                          # nur bei CSS/JS/HTML
```

## Lokal ansehen

```bash
python -m http.server 8099 --directory docs
```

<http://localhost:8099/> öffnen. Ein direkter `file://`-Aufruf funktioniert nicht,
weil die Seite ihre Daten per `fetch` lädt.

## Prüfen

```bash
python3 tools/validate_trips.py
```

Prüft alle Reisedateien auf Vollständigkeit, eindeutige UIDs, auflösbare
Bildschlüssel samt Lizenzangabe, aufsteigende Uhrzeiten und gültige Datumsangaben. Dieselbe Prüfung
läuft in GitHub Actions vor jedem Deploy, damit fehlerhafte Daten nicht live gehen.

## Struktur

```text
docs/                      die Website (wird deployt)
├── data/trips/            Reisedaten – hier stehen alle Inhalte
├── data/trip.schema.json  Datenvertrag, maschinenlesbar
├── assets/                Template, Startseite, Design
├── trips/<slug>/          eigene URL je Reise
└── sw.js                  Offline-Cache

tools/                     Python-Werkzeuge (nur Standardbibliothek)
COWORK.md                  Anleitung zum Pflegen der Inhalte
SYSTEMPROMPT.md            Auftrag für eine KI, die eine Reisedatei erzeugt
```

Bilder: verlinkt, je Reise im `images`-Block mit Urheber und Lizenz — derzeit
[Wikimedia Commons](https://commons.wikimedia.org/). Wetter:
[Open-Meteo](https://open-meteo.com/). Karten: Google Maps.
