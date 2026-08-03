#!/usr/bin/env python3
"""Prüft alle Reisedateien unter docs/data/trips/.

Aufruf:  python tools/validate_trips.py

Bricht mit Exit-Code 1 ab, wenn etwas nicht stimmt – wird sowohl in der
GitHub-Action als auch nach jeder Änderung durch `plan.py` ausgeführt.
"""

from __future__ import annotations

import json
import sys

import tripdata

# Ohne das scheitert die Ausgabe auf der Windows-Konsole an Zeichen wie „✗“.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")


def main() -> int:
    try:
        slugs = tripdata.slugs()
    except (OSError, json.JSONDecodeError) as error:
        print(f"docs/data/trips/index.json ist nicht lesbar: {error}", file=sys.stderr)
        return 1

    if not slugs:
        print("index.json enthält keine Reisen", file=sys.stderr)
        return 1

    problems: list[str] = []

    # Eine Reisedatei, die nicht in index.json steht, ist unsichtbar: die
    # Startseite zeigt sie nicht, es gibt keine Unterseite, und diese Prüfung
    # würde sie nie ansehen. Genau das ist passiert – die Datei lag im Repo und
    # niemand bemerkte sie. Deshalb hier melden statt schweigen.
    vorhanden = {p.stem for p in tripdata.DATA.glob("*.json") if p.stem != "index"}
    for verwaist in sorted(vorhanden - set(slugs)):
        problems.append(f"{verwaist}.json steht nicht in index.json und ist damit unsichtbar – "
                        f"Eintrag ergänzen, docs/trips/{verwaist}/index.html anlegen")
    for slug in slugs:
        try:
            data = tripdata.load(slug)
        except tripdata.DataError as error:
            problems.append(str(error))
            continue
        except json.JSONDecodeError as error:
            problems.append(f"{slug}.json ist kein gültiges JSON: Zeile {error.lineno}, {error.msg}")
            continue
        problems += tripdata.validate(slug, data)
        stops = sum(len(day["stops"]) for day in data.get("days", []))
        print(f"  {slug}: {len(data.get('days', []))} Tage, {stops} Stops, "
              f"{len(data.get('places', {}))} Ortsbeschreibungen")

    if problems:
        print(f"\n{len(problems)} Problem(e) gefunden:\n", file=sys.stderr)
        for problem in problems:
            print(f"  ✗ {problem}", file=sys.stderr)
        return 1

    print("\nAlle Reisedaten sind stimmig.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
