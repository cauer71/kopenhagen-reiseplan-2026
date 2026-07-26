# Reiseplan

Bildstarke, mobil lesbare Reisepläne als statische Website.
Live: <https://cauer71.github.io/reiseplan/>

- **Kopenhagen** · 06.–09. Juli 2026 → [`/trips/kopenhagen/`](https://cauer71.github.io/reiseplan/trips/kopenhagen/)
- **Rom** · 05.–06. September 2026 → [`/trips/rom/`](https://cauer71.github.io/reiseplan/trips/rom/)

Jede Reise besteht aus Tagesabschnitten, die sich aufklappen lassen. Darin liegen
die einzelnen Stops mit ausführlicher Beschreibung des Ortes, Adresse, Dauer,
Hinweisen, Kartenlink und – wo vorhanden – Ticketlink.

## Wie es gebaut ist

Kein Build-Schritt, kein Framework, keine Abhängigkeiten. Der Ordner `docs/` ist
die Website und wird von GitHub Actions unverändert nach GitHub Pages deployt.
Ein gemeinsames Template (`docs/assets/app.js`) rendert jede Reise aus einer
JSON-Datei; für eine neue Reise kommen eine Datendatei und eine Unterseite hinzu,
die Darstellung bleibt unverändert.

Die Seite funktioniert offline: Beim ersten Besuch legt ein Service Worker Seite,
Daten und die Bilder der geöffneten Reise ab. Unterwegs ohne Netz ist der Plan
damit vollständig lesbar – nur die Live-Wetterprognose fehlt. Über „Zum
Homescreen hinzufügen“ läuft sie wie eine App.

## Inhalte ändern

**→ [COWORK.md](COWORK.md)** beschreibt das Datenmodell und die Befehle.

Der Kern: Reihenfolge und Inhalt sind getrennt. Ein Stop zu verschieben oder eine
Tagesreihenfolge umzustellen bewegt eine Zeile, nicht einen Textblock.

```bash
python tools/plan.py show  kopenhagen              # Überblick mit allen UIDs
python tools/plan.py move  kopenhagen 05 tag2      # Stop in einen anderen Tag
python tools/plan.py order kopenhagen tag1 01,02,04,03,05,06,07
python tools/plan.py swap  kopenhagen 11 24        # Wettertausch
python tools/plan.py bump                          # danach immer
```

## Lokal ansehen

```bash
python -m http.server 8099 --directory docs
```

<http://localhost:8099/> öffnen. Ein direkter `file://`-Aufruf funktioniert nicht,
weil die Seite ihre Daten per `fetch` lädt.

## Prüfen

```bash
python tools/validate_trips.py
```

Prüft alle Reisedateien auf Vollständigkeit, eindeutige UIDs, vorhandene Bilder in
beiden Breiten, aufsteigende Uhrzeiten und gültige Datumsangaben. Dieselbe Prüfung
läuft in GitHub Actions vor jedem Deploy, damit fehlerhafte Daten nicht live gehen.

## Struktur

```text
docs/                      die Website (wird deployt)
├── data/trips/            Reisedaten – hier stehen alle Inhalte
├── photos/web/            Bilder, je in 720 und 1200 Pixel Breite
├── assets/                Template, Startseite, Design
├── trips/<slug>/          eigene URL je Reise
└── sw.js                  Offline-Cache

tools/                     Python-Werkzeuge (nur Standardbibliothek)
COWORK.md                  Anleitung zum Pflegen der Inhalte
```

Bilder: Unsplash. Wetter: [Open-Meteo](https://open-meteo.com/). Karten: Google Maps.
