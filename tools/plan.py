#!/usr/bin/env python3
"""Reiseplan umstellen, ohne JSON von Hand zu verschieben.

Jeder schreibende Befehl prüft die Datei anschließend automatisch und schreibt
nur, wenn sie stimmig bleibt. Die Reihenfolge im `stops`-Array ist immer die
Anzeigereihenfolge und immer zeitlich aufsteigend.

    python tools/plan.py show   <reise> [<tag>]
    python tools/plan.py move   <reise> <uid> <tag> [--time HH:MM]
    python tools/plan.py time   <reise> <uid> <HH:MM>
    python tools/plan.py order  <reise> <tag> <uid,uid,...>
    python tools/plan.py swap   <reise> <uidA> <uidB>
    python tools/plan.py bump   [--version JJJJMMTT-N]

Beispiele:
    python tools/plan.py move kopenhagen 05 tag2 --time 10:30
    python tools/plan.py order kopenhagen tag1 04,05,03,06,01,02,07
    python tools/plan.py swap kopenhagen 11 24
"""

from __future__ import annotations

import argparse
import re
import sys

import tripdata
from tripdata import DataError

# Ohne das scheitert die Ausgabe auf der Windows-Konsole an Zeichen wie „→“.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")


# --------------------------------------------------------------------- Anzeige

def cmd_show(args) -> int:
    data = tripdata.load(args.trip)
    places = data["places"]
    trip = data["trip"]
    print(f"{trip['title']} – {trip['destination']} ({trip['dates']})\n")
    for day in data["days"]:
        if args.day and day["id"] != args.day:
            continue
        print(f"{day['id']}  {day['label']} · {day['date']} ({day['isoDate']})  [{day['tone']}]")
        print(f"        {day['title']}")
        for stop in day["stops"]:
            title = places.get(stop["uid"], {}).get("title", "?? fehlende Beschreibung")
            print(f"        {stop['time']}  UID:{stop['uid']}  {title}")
        print()
    unplanned = sorted(set(places) - {s["uid"] for d in data["days"] for s in d["stops"]})
    if unplanned:
        print("Nicht eingeplante Ortsbeschreibungen: " + ", ".join(unplanned))
    return 0


# ---------------------------------------------------------------- Änderungen

def cmd_move(args) -> int:
    data = tripdata.load(args.trip)
    source, index = tripdata.locate(data, args.uid)
    target = tripdata.find_day(data, args.day)

    stop = source["stops"].pop(index)
    if args.time:
        _check_time(args.time)
        stop["time"] = args.time
    position = tripdata.insert_by_time(target, stop)

    _write(args.trip, data,
           f"UID {args.uid} von {source['id']} nach {target['id']} verschoben "
           f"(Position {position + 1}, {stop['time']} Uhr)")
    return 0


def cmd_time(args) -> int:
    data = tripdata.load(args.trip)
    _check_time(args.time)
    day, index = tripdata.locate(data, args.uid)
    stop = day["stops"].pop(index)
    old = stop["time"]
    stop["time"] = args.time
    tripdata.insert_by_time(day, stop)
    _write(args.trip, data, f"UID {args.uid} in {day['id']}: {old} → {args.time}")
    return 0


def cmd_order(args) -> int:
    """Stops eines Tages neu anordnen; die Zeitfenster des Tages bleiben stehen.

    Der Tag behält also seine Uhrzeiten und die Stops werden neu darauf verteilt –
    genau das, was beim Umstellen einer Tagesreihenfolge gebraucht wird.
    """
    data = tripdata.load(args.trip)
    day = tripdata.find_day(data, args.day)
    wanted = [uid.strip() for uid in args.uids.split(",") if uid.strip()]
    current = [stop["uid"] for stop in day["stops"]]

    if sorted(wanted) != sorted(current):
        missing = sorted(set(current) - set(wanted))
        unknown = sorted(set(wanted) - set(current))
        detail = []
        if missing:
            detail.append(f"fehlt: {', '.join(missing)}")
        if unknown:
            detail.append(f"nicht in {day['id']}: {', '.join(unknown)}")
        raise DataError(f"Die Liste muss genau die {len(current)} UIDs von {day['id']} "
                        f"enthalten ({'; '.join(detail)})")

    times = sorted(stop["time"] for stop in day["stops"])
    day["stops"] = [{"uid": uid, "time": time} for uid, time in zip(wanted, times)]
    _write(args.trip, data,
           f"{day['id']} neu geordnet: " + " → ".join(f"{u}@{t}" for u, t in zip(wanted, times)))
    return 0


def cmd_swap(args) -> int:
    """Zwei Stops tauschen Platz und Uhrzeit – auch über Tagesgrenzen hinweg."""
    data = tripdata.load(args.trip)
    day_a, index_a = tripdata.locate(data, args.uid_a)
    day_b, index_b = tripdata.locate(data, args.uid_b)
    if args.uid_a == args.uid_b:
        raise DataError("Zwei verschiedene UIDs angeben")

    time_a = day_a["stops"][index_a]["time"]
    time_b = day_b["stops"][index_b]["time"]
    day_a["stops"][index_a] = {"uid": args.uid_b, "time": time_a}
    day_b["stops"][index_b] = {"uid": args.uid_a, "time": time_b}

    _write(args.trip, data,
           f"UID {args.uid_a} ({day_a['id']} {time_a}) ↔ UID {args.uid_b} ({day_b['id']} {time_b})")
    return 0


# ------------------------------------------------------------ Cache-Version

VERSION_RE = re.compile(r"\?v=(\d{8}-\d+)")


def cmd_bump(args) -> int:
    """Hebt den `?v=`-Parameter in allen Seiten an, damit Browser neu laden."""
    pages = sorted((tripdata.ROOT / "docs").rglob("*.html"))
    found = {m for page in pages for m in VERSION_RE.findall(page.read_text(encoding="utf-8"))}
    if not found:
        raise DataError("Kein ?v=-Parameter in den HTML-Dateien gefunden")

    if args.version:
        new = args.version
        if not re.fullmatch(r"\d{8}-\d+", new):
            raise DataError("Version muss das Format JJJJMMTT-N haben, z. B. 20260726-4")
    else:
        newest = max(found)
        date, counter = newest.split("-")
        new = f"{date}-{int(counter) + 1}"

    changed = []
    for page in pages:
        text = page.read_text(encoding="utf-8")
        replaced = VERSION_RE.sub(f"?v={new}", text)
        replaced = re.sub(r'data-version="[^"]*"', f'data-version="{new}"', replaced)
        if replaced != text:
            page.write_text(replaced, encoding="utf-8", newline="\n")
            changed.append(page.relative_to(tripdata.ROOT).as_posix())

    print(f"Cache-Version → {new}")
    for name in changed:
        print(f"  aktualisiert: {name}")
    return 0


# ------------------------------------------------------------------- Helfer

def _check_time(value: str) -> None:
    if not tripdata.TIME_RE.match(value):
        raise DataError(f"Uhrzeit '{value}' muss das Format HH:MM haben")


def _write(slug: str, data: dict, summary: str) -> None:
    """Erst prüfen, dann schreiben – eine kaputte Datei entsteht so nie."""
    problems = tripdata.validate(slug, data)
    if problems:
        raise DataError("Änderung würde die Reisedaten beschädigen:\n"
                        + "\n".join(f"  ✗ {p}" for p in problems))
    tripdata.save(slug, data)
    print(summary)
    print(f"geschrieben: docs/data/trips/{slug}.json")
    print("Nicht vergessen: python tools/plan.py bump   (damit Browser die Änderung laden)")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="plan.py", description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    show = sub.add_parser("show", help="Tagesabschnitte und Stops auflisten")
    show.add_argument("trip")
    show.add_argument("day", nargs="?")
    show.set_defaults(func=cmd_show)

    move = sub.add_parser("move", help="Stop in einen anderen Tagesabschnitt verschieben")
    move.add_argument("trip")
    move.add_argument("uid")
    move.add_argument("day")
    move.add_argument("--time", help="neue Uhrzeit HH:MM (sonst bleibt die bisherige)")
    move.set_defaults(func=cmd_move)

    time_cmd = sub.add_parser("time", help="Uhrzeit eines Stops ändern")
    time_cmd.add_argument("trip")
    time_cmd.add_argument("uid")
    time_cmd.add_argument("time")
    time_cmd.set_defaults(func=cmd_time)

    order = sub.add_parser("order", help="Reihenfolge innerhalb eines Tages umstellen")
    order.add_argument("trip")
    order.add_argument("day")
    order.add_argument("uids", help="alle UIDs des Tages in der gewünschten Reihenfolge, z. B. 04,05,03")
    order.set_defaults(func=cmd_order)

    swap = sub.add_parser("swap", help="zwei Stops gegeneinander tauschen")
    swap.add_argument("trip")
    swap.add_argument("uid_a", metavar="uidA")
    swap.add_argument("uid_b", metavar="uidB")
    swap.set_defaults(func=cmd_swap)

    bump = sub.add_parser("bump", help="Cache-Version in allen Seiten anheben")
    bump.add_argument("--version", help="explizite Version JJJJMMTT-N")
    bump.set_defaults(func=cmd_bump)

    return parser


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except DataError as error:
        print(f"Fehler: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
