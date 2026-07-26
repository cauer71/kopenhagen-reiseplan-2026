#!/usr/bin/env python3
"""Reiseplan umstellen, ohne JSON von Hand zu verschieben.

Jeder schreibende Befehl prüft die Datei anschließend automatisch und schreibt
nur, wenn sie stimmig bleibt. Die Reihenfolge im `stops`-Array ist immer die
Anzeigereihenfolge und immer zeitlich aufsteigend.

    python3 tools/plan.py show   <reise> [<tag>]
    python3 tools/plan.py wetter <reise> <tag>
    python3 tools/plan.py move   <reise> <uid> <tag> [--time HH:MM]
    python3 tools/plan.py time   <reise> <uid> <HH:MM>
    python3 tools/plan.py order  <reise> <tag> <uid,uid,...>
    python3 tools/plan.py swap   <reise> <uidA> <uidB>
    python3 tools/plan.py bump   [--version JJJJMMTT-N]

Beispiele:
    python3 tools/plan.py wetter kopenhagen tag1
    python3 tools/plan.py move kopenhagen 05 tag2 --time 10:30
    python3 tools/plan.py order kopenhagen tag1 04,05,03,06,01,02,07
    python3 tools/plan.py swap kopenhagen 11 24

Feste Termine – Flüge, Transfers, gebuchte Zeitfenster – sind über `fixed: true`
markiert und werden nicht verschoben; dafür braucht es ausdrücklich --force.

Auf Windows heißt der Interpreter `python` statt `python3`.
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
            place = places.get(stop["uid"], {})
            marks = {"aussen": "außen ", "innen": "innen ", "beides": "      "}
            mark = marks.get(place.get("weather"), "  ?   ")
            fixed = " FEST" if place.get("fixed") else "     "
            title = place.get("title", "?? fehlende Beschreibung")
            print(f"        {stop['time']}  UID:{stop['uid']}  {mark}{fixed}  {title}")
        print()
    unplanned = sorted(set(places) - {s["uid"] for d in data["days"] for s in d["stops"]})
    if unplanned:
        print("Nicht eingeplante Ortsbeschreibungen: " + ", ".join(unplanned))
    return 0


# ---------------------------------------------------------------- Änderungen

def cmd_move(args) -> int:
    data = tripdata.load(args.trip)
    _check_movable(data, args.uid, args.force)
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
    _check_movable(data, args.uid, args.force)
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
    before = {stop["uid"]: stop["time"] for stop in day["stops"]}

    # Feste Termine müssen ihre Uhrzeit behalten – sonst nimmt ein umsortierter Tag
    # den Rückflug mit. Lieber abbrechen und die Ursache benennen.
    if not args.force:
        for uid, time in zip(wanted, times):
            place = data["places"].get(uid, {})
            if place.get("fixed") and time != before[uid]:
                raise DataError(
                    f"UID {uid} ({place.get('title', '?')}) ist ein fester Termin um "
                    f"{before[uid]} und würde durch diese Reihenfolge auf {time} rutschen.\n"
                    f"  Reihenfolge so wählen, dass {uid} an seiner Stelle bleibt, "
                    f"oder --force verwenden.")

    day["stops"] = [{"uid": uid, "time": time} for uid, time in zip(wanted, times)]
    _write(args.trip, data,
           f"{day['id']} neu geordnet: " + " → ".join(f"{u}@{t}" for u, t in zip(wanted, times)))
    return 0


def _minutes(time: str) -> int:
    hours, minutes = time.split(":")
    return int(hours) * 60 + int(minutes)


def cmd_wetter(args) -> int:
    """Tauschvorschläge für einen Regentag – ohne selbst etwas zu ändern.

    Antwort auf den Auftrag „es regnet heute": listet die Außenpunkte des Tages und
    die überdachten Kandidaten aus den anderen Tagen und schreibt die fertigen
    swap-Befehle dazu. Entschieden wird bewusst nicht automatisch.
    """
    data = tripdata.load(args.trip)
    places = data["places"]
    day = tripdata.find_day(data, args.day)

    def entries(target, kind):
        return [(stop, places.get(stop["uid"], {})) for stop in target["stops"]
                if places.get(stop["uid"], {}).get("weather") == kind
                and not places.get(stop["uid"], {}).get("fixed")]

    outdoor = entries(day, "aussen")
    print(f"{day['id']} – {day['label']} · {day['date']}: {day['title']}\n")

    # Feste Außentermine lassen sich nicht tauschen, sind bei Regen aber genau das
    # Problem – etwa ein gebuchtes Zeitfenster im Kolosseum. Darum benennen.
    blocked = [(stop, places.get(stop["uid"], {})) for stop in day["stops"]
               if places.get(stop["uid"], {}).get("weather") == "aussen"
               and places.get(stop["uid"], {}).get("fixed")]
    if blocked:
        print("Fest gebucht und trotzdem im Freien – nicht tauschbar, nur mit Regenschutz:")
        for stop, place in blocked:
            print(f"  {stop['time']}  UID:{stop['uid']}  {place['title']}")
            if place.get("ticketUrl"):
                print(f"            Umbuchen ginge nur über {place['ticketUrl']}")
        print()

    if not outdoor:
        print("Keine tauschbaren Außenpunkte an diesem Tag – der Tag hält Regen aus.")
        return 0

    print("Wetterabhängig an diesem Tag:")
    for stop, place in outdoor:
        print(f"  {stop['time']}  UID:{stop['uid']}  {place['title']}")
        if place.get("tip"):
            print(f"            {place['tip']}")

    candidates = [(other, stop, place) for other in data["days"] if other["id"] != day["id"]
                  for stop, place in entries(other, "innen")]
    if not candidates:
        print("\nKeine überdachten Kandidaten in anderen Tagen zum Tauschen vorhanden.")
        return 0

    print("\nÜberdachte Kandidaten aus anderen Tagen:")
    for other, stop, place in candidates:
        print(f"  {other['id']}  {stop['time']}  UID:{stop['uid']}  {place['title']}")

    # Beim Tauschen wandern die Uhrzeiten mit. Deshalb wird nach Tageszeit gepaart –
    # sonst landet ein Mittagessen um 16 Uhr und ein Museum zur Frühstückszeit.
    print("\nVorschlag – jeweils ein Außenpunkt gegen einen Innenraum ähnlicher Tageszeit:")
    frei = list(candidates)
    for stop, place in outdoor:
        if not frei:
            break
        best = min(frei, key=lambda c: abs(_minutes(c[1]["time"]) - _minutes(stop["time"])))
        frei.remove(best)
        other, cand_stop, cand_place = best
        print(f"  {stop['time']} {place['title']} ↔ {cand_stop['time']} {cand_place['title']} ({other['id']})")
        print(f"    python3 tools/plan.py swap {args.trip} {stop['uid']} {cand_stop['uid']}")

    if len(outdoor) > len(candidates):
        print(f"\nHinweis: {len(outdoor)} Außenpunkte, aber nur {len(candidates)} überdachte "
              f"Kandidaten – für den Rest bleibt nur Verschieben auf einen anderen Tag.")
    return 0


def cmd_swap(args) -> int:
    """Zwei Stops tauschen Platz und Uhrzeit – auch über Tagesgrenzen hinweg."""
    data = tripdata.load(args.trip)
    if args.uid_a == args.uid_b:
        raise DataError("Zwei verschiedene UIDs angeben")
    _check_movable(data, args.uid_a, args.force)
    _check_movable(data, args.uid_b, args.force)
    day_a, index_a = tripdata.locate(data, args.uid_a)
    day_b, index_b = tripdata.locate(data, args.uid_b)

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


def _check_movable(data: dict, uid: str, force: bool) -> None:
    """Feste Termine – Flüge, Transfers, gebuchte Zeitfenster – nicht versehentlich verschieben.

    Beim Umplanen wegen Wetter ist genau das der teure Fehler: ein umsortierter Tag,
    der den Rückflug mitnimmt.
    """
    place = data["places"].get(uid, {})
    if place.get("fixed") and not force:
        raise DataError(
            f"UID {uid} ({place.get('title', '?')}) ist ein fester Termin und wird nicht "
            f"verschoben. Mit --force trotzdem ändern.")


def _write(slug: str, data: dict, summary: str) -> None:
    """Erst prüfen, dann schreiben – eine kaputte Datei entsteht so nie."""
    problems = tripdata.validate(slug, data)
    if problems:
        raise DataError("Änderung würde die Reisedaten beschädigen:\n"
                        + "\n".join(f"  ✗ {p}" for p in problems))
    tripdata.save(slug, data)
    print(summary)
    print(f"geschrieben: docs/data/trips/{slug}.json")
    print("Nächster Schritt: committen und pushen – die Action prüft und veröffentlicht.")
    print("`bump` ist dafür nicht nötig; das braucht nur CSS, JavaScript oder HTML.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="plan.py", description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    show = sub.add_parser("show", help="Tagesabschnitte und Stops auflisten")
    show.add_argument("trip")
    show.add_argument("day", nargs="?")
    show.set_defaults(func=cmd_show)

    force_help = "auch feste Termine (Flüge, Transfers, gebuchte Zeitfenster) ändern"

    wetter = sub.add_parser("wetter", help="Tauschvorschläge für einen Regentag")
    wetter.add_argument("trip")
    wetter.add_argument("day")
    wetter.set_defaults(func=cmd_wetter)

    move = sub.add_parser("move", help="Stop in einen anderen Tagesabschnitt verschieben")
    move.add_argument("trip")
    move.add_argument("uid")
    move.add_argument("day")
    move.add_argument("--time", help="neue Uhrzeit HH:MM (sonst bleibt die bisherige)")
    move.add_argument("--force", action="store_true", help=force_help)
    move.set_defaults(func=cmd_move)

    time_cmd = sub.add_parser("time", help="Uhrzeit eines Stops ändern")
    time_cmd.add_argument("trip")
    time_cmd.add_argument("uid")
    time_cmd.add_argument("time")
    time_cmd.add_argument("--force", action="store_true", help=force_help)
    time_cmd.set_defaults(func=cmd_time)

    order = sub.add_parser("order", help="Reihenfolge innerhalb eines Tages umstellen")
    order.add_argument("trip")
    order.add_argument("day")
    order.add_argument("uids", help="alle UIDs des Tages in der gewünschten Reihenfolge, z. B. 04,05,03")
    order.add_argument("--force", action="store_true", help=force_help)
    order.set_defaults(func=cmd_order)

    swap = sub.add_parser("swap", help="zwei Stops gegeneinander tauschen")
    swap.add_argument("trip")
    swap.add_argument("uid_a", metavar="uidA")
    swap.add_argument("uid_b", metavar="uidB")
    swap.add_argument("--force", action="store_true", help=force_help)
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
