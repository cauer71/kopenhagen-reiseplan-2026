# Reisedaten

Die Inhalte der Website liegen in diesem Ordner:

```text
data/trips/index.json        welche Reisen es gibt und in welcher Reihenfolge
data/trips/kopenhagen.json   Kopenhagen: trip / days / places
data/trips/rom.json          Rom: trip / days / places
```

**Datenmodell, Befehle und Rezepte stehen in [../../COWORK.md](../../COWORK.md).**
Diese Datei wiederholt sie bewusst nicht – sonst laufen die beiden Beschreibungen
auseinander.

Das Wichtigste in drei Sätzen:

- `days[].stops` enthält ausschließlich `{ "uid": "05", "time": "16:05" }`. Die
  Ortsbeschreibungen stehen getrennt in `places`, nach UID sortiert.
- Umstellungen macht man nicht von Hand, sondern mit `python tools/plan.py`
  (`show`, `move`, `order`, `swap`, `time`) – das Werkzeug prüft vor dem Schreiben.
- Nach jeder Änderung `python tools/plan.py bump`, sonst liefern Browser und
  Pages-Cache die alte Fassung aus.

Prüfen: `python tools/validate_trips.py`
