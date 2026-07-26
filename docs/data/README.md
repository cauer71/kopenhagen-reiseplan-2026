# Reisedaten

Die Inhalte der Website liegen in diesem Ordner:

```text
data/trips/index.json        welche Reisen es gibt (Reihenfolge wird berechnet)
data/trips/kopenhagen.json   Kopenhagen: trip / days / places
data/trips/rom.json          Rom: trip / days / places
```

**Datenmodell, Befehle und Rezepte stehen in [../../COWORK.md](../../COWORK.md).**
Diese Datei wiederholt sie bewusst nicht – sonst laufen die beiden Beschreibungen
auseinander.

Das Wichtigste in drei Sätzen:

- `days[].stops` enthält ausschließlich `{ "uid": "05", "time": "16:05" }`. Die
  Ortsbeschreibungen stehen getrennt in `places`, nach UID sortiert.
- Umstellungen macht man nicht von Hand, sondern mit `python3 tools/plan.py`
  (`show`, `move`, `order`, `swap`, `time`) – das Werkzeug prüft vor dem Schreiben.
- `python3 tools/plan.py bump` ist nur bei Änderungen an CSS, JavaScript oder HTML
  nötig. Reine Planänderungen wirken sofort, weil die Reisedaten per ETag
  zurückgefragt werden.

Prüfen: `python3 tools/validate_trips.py`
