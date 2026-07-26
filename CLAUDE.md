# Hinweise für Claude Code / Cowork

**Vor Inhaltsänderungen an den Reiseplänen [COWORK.md](COWORK.md) lesen.** Dort steht
das Datenmodell, die Befehle und die Rezepte für typische Aufträge.

## Der wichtigste Fall: Umplanen unterwegs

Der Hauptzweck dieses Repos ist, dass der Reiseplan **vom Handy aus** geändert werden
kann, wenn das Wetter am Reiseort kippt. Kein Rechner, keine Installation, keine
Wartezeit. Kommt ein Auftrag wie „es regnet heute, sortier den Tag um":

1. `show` ausführen, um die UIDs zu sehen – ohne die geht nichts.
2. Passenden Befehl wählen (`time`, `move`, `swap`, `order`).
3. Ergebnis mit `show` gegenlesen, committen, pushen.

Nur `days[].stops` anfassen. Nichts löschen – ein Stop, der heute nicht passt, wird
verschoben. Welche Orte wetterabhängig sind, steht in den `places`-Beschreibungen
(UID 05 Außenaufstieg, UID 11/17/24 verlässliche Innenräume).

## Kurzfassung

- Statische Website ohne Build-Schritt. `docs/` ist die Seite und wird von
  GitHub Actions unverändert nach Pages deployt. Kein npm, kein Bundler.
- Inhalte liegen ausschließlich in `docs/data/trips/*.json`.
- **Reihenfolge und Inhalt sind getrennt:** `days[].stops` enthält nur
  `{ uid, time }`, die Beschreibungen stehen in `places` nach UID. Verschieben
  bewegt eine Zeile, keinen Textblock.
- UIDs sind unveränderlich und werden nach dem Löschen nicht wiederverwendet.
- Umstellungen **nicht von Hand** im JSON machen, sondern mit dem Werkzeug – es
  prüft vor dem Schreiben und schreibt nur, wenn die Datei stimmig bleibt:

  ```bash
  python3 tools/plan.py show  kopenhagen
  python3 tools/plan.py move  kopenhagen 05 tag2 --time 10:30
  python3 tools/plan.py order kopenhagen tag1 01,02,04,03,05,06,07
  python3 tools/plan.py swap  kopenhagen 11 24
  python3 tools/plan.py time  kopenhagen 11 09:30
  ```

  Heißt der Interpreter nicht `python3`, dann `python` versuchen oder direkt
  `./tools/plan.py` – die Skripte sind ausführbar.

- **`bump` nur bei Änderungen an CSS, JavaScript oder HTML.** Für reine
  Planänderungen nicht nötig: die Reisedaten werden mit `cache: "no-cache"` geladen
  und sind sofort nach dem Deploy sichtbar.
- Vor dem Commit `python3 tools/validate_trips.py`. Dieselbe Prüfung blockiert in
  CI den Deploy.
- Keine erfundenen Wetterzahlen und keine externen Bild-URLs. Bilder gehören nach
  `docs/photos/web/` in **beiden** Breiten (`-720.jpg` und `-1200.jpg`).
- Die Reihenfolge auf der Startseite wird berechnet (laufende Reise oben,
  bevorstehende, dann vergangene). Nicht von Hand sortieren.
