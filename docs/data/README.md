# Reisedaten

Die Inhalte der Website liegen in diesem Ordner:

```text
data/trips/index.json        welche Reisen es gibt (Reihenfolge wird berechnet)
data/trips/rom.json          Rom: trip / days / places / images
data/trip.schema.json        Datenvertrag, maschinenlesbar
```

**Datenmodell, Befehle und Rezepte stehen in [../../COWORK.md](../../COWORK.md).**
Diese Datei wiederholt sie bewusst nicht – sonst laufen die beiden Beschreibungen
auseinander.

Das Wichtigste in drei Sätzen:

- `days[].stops` enthält ausschließlich `{ "uid": "05", "time": "16:05" }`. Die
  Ortsbeschreibungen stehen getrennt in `places`, nach UID sortiert.
- `image` in einem Ort ist ein **Schlüssel** in den `images`-Block, keine Datei und
  keine rohe URL. Dort steht je Motiv einmal URL, Alt-Text, Urheber und Lizenz.
  Bilder werden verlinkt und sind deshalb ohne Netz nicht sichtbar.
- Umstellungen macht man nicht von Hand, sondern mit `python3 tools/plan.py`
  (`show`, `move`, `order`, `swap`, `time`) – das Werkzeug prüft vor dem Schreiben.
- `python3 tools/plan.py bump` ist nur bei Änderungen an CSS, JavaScript oder HTML
  nötig. Reine Planänderungen wirken sofort, weil die Reisedaten per ETag
  zurückgefragt werden.

Prüfen: `python3 tools/validate_trips.py`

Eine Reisedatei von einer anderen KI erzeugen lassen: `../../SYSTEMPROMPT.md`.
