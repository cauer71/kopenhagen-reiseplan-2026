"""Gemeinsame Helfer zum Lesen, Prüfen und Schreiben der Reisedateien.

Wird von `validate_trips.py` und `plan.py` benutzt. Nur Standardbibliothek,
damit beides ohne Installation läuft – lokal wie in GitHub Actions.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "docs" / "data" / "trips"

TONES = {"teal", "gold", "coral", "navy"}

# Bilder werden verlinkt, nicht mitgeliefert. Jede Reisedatei hat dafür einen
# `images`-Block, in dem jeder Bildschlüssel einmal mit URL, Alt-Text, Urheber
# und Lizenz steht. Gründe für den Block statt roher URLs in jedem Ort:
#   * `cucina` kommt siebenmal vor — ein defekter Link wäre sieben Korrekturen,
#   * CC-BY-SA verlangt Namensnennung, und die braucht einen festen Platz,
#   * die Prüfung kann Schlüssel gegen Verzeichnis abgleichen.
IMAGE_REQUIRED = ("url", "alt", "license")
IMAGE_ORDER = ("url", "width", "height", "alt", "credit", "license", "source")

# Zielbreite für Bilder und die Grenze, ab der geprüft wird. 1280 px reichen für
# jedes Handy: das Layout ist rund 400 px breit, bei dreifacher Pixeldichte also
# 1200 px. Alles darüber sind Daten für Pixel, die niemand sieht.
#
# Die Grenze ist keine Theorie. Eine Reisedatei kam mit Originaldateien über
# `Special:Redirect` – ein einzelnes Bild 16,8 MB, die Reise 66 MB. Nach der
# Umstellung auf Thumbnails: 5,2 MB.
ZIEL_BILDBREITE = 1280
MAX_BILDBREITE = 1600

# Lizenzen, die keine Namensnennung verlangen. Solche Bilder erscheinen nicht im
# Bildnachweis, und `credit` darf dort fehlen.
#
# Alles andere – auch eine unbekannte Angabe – gilt als nennungspflichtig. Das
# ist die vorsichtige Richtung: eine überflüssige Zeile im Nachweis ist harmlos,
# eine fehlende Namensnennung bei CC BY(-SA) ist ein Lizenzverstoß.
NENNUNG_FREI = re.compile(r"\b(cc0|public\s*domain|pd[-\s]|gemeinfrei|no\s+restrictions)", re.I)


def nennung_noetig(lizenz: str | None) -> bool:
    return not NENNUNG_FREI.search(str(lizenz or ""))

# Wettertauglichkeit eines Ortes. Grundlage für Umplanungen bei Wetterwechsel.
WEATHER_VALUES = {
    "aussen": "im Freien, wetterabhängig",
    "innen": "überdacht, auch bei Regen gut",
    "beides": "wetterunabhängig oder gemischt",
}
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
UID_RE = re.compile(r"^\d{2}$")
ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

TRIP_REQUIRED = ("destination", "title", "subtitle", "dates", "travellers", "heroImage")
DAY_REQUIRED = ("id", "label", "date", "isoDate", "title", "tone", "heroImage", "stops")
PLACE_REQUIRED = ("title", "detail", "description", "image", "place", "weather")

PLACE_ORDER = ("title", "detail", "description", "image", "place",
               "weather", "fixed", "address", "duration", "price", "tip", "ticketUrl")
DAY_ORDER = ("id", "label", "date", "isoDate", "title", "tone", "heroImage",
             "weather", "note", "stops")


class DataError(Exception):
    """Fachlicher Fehler in den Reisedaten – Meldung ist für Menschen gedacht."""


# --------------------------------------------------------------- Lesen/Schreiben

def slugs() -> list[str]:
    """Reise-Slugs in der Reihenfolge der Startseite."""
    index = json.loads((DATA / "index.json").read_text(encoding="utf-8"))
    return [entry["slug"] for entry in index.get("trips", [])]


def path_for(slug: str) -> Path:
    path = DATA / f"{slug}.json"
    if not path.exists():
        raise DataError(f"Unbekannte Reise '{slug}'. Vorhanden: {', '.join(slugs())}")
    return path


def load(slug: str) -> dict:
    return json.loads(path_for(slug).read_text(encoding="utf-8"))


def dumps(data: dict) -> str:
    """Serialisiert eine Reisedatei in der kanonischen Form des Projekts.

    Die `{ "uid": .., "time": .. }`-Paare landen bewusst je auf einer Zeile:
    Umsortieren bleibt damit Zeilenarbeit und die Diffs bleiben lesbar.
    """
    data = dict(data)
    data["days"] = [{k: day[k] for k in DAY_ORDER if k in day} for day in data["days"]]
    data["places"] = {
        uid: {k: place[k] for k in PLACE_ORDER if k in place}
        for uid, place in sorted(data["places"].items())
    }
    if isinstance(data.get("images"), dict):
        data["images"] = {
            name: {k: bild[k] for k in IMAGE_ORDER if k in bild}
            for name, bild in sorted(data["images"].items())
        }
    text = json.dumps(data, ensure_ascii=False, indent=2)
    text = re.sub(r'\{\s*"uid": "(\d+)",\s*"time": "([^"]+)"\s*\}',
                  r'{ "uid": "\1", "time": "\2" }', text)
    return text + "\n"


def save(slug: str, data: dict) -> None:
    path_for(slug).write_text(dumps(data), encoding="utf-8", newline="\n")


# ------------------------------------------------------------------- Zugriff

def find_day(data: dict, day_id: str) -> dict:
    for day in data["days"]:
        if day["id"] == day_id:
            return day
    known = ", ".join(day["id"] for day in data["days"])
    raise DataError(f"Unbekannter Tagesabschnitt '{day_id}'. Vorhanden: {known}")


def locate(data: dict, uid: str) -> tuple[dict, int]:
    """Liefert (Tagesabschnitt, Index im stops-Array) für eine UID."""
    for day in data["days"]:
        for index, stop in enumerate(day["stops"]):
            if stop["uid"] == uid:
                return day, index
    raise DataError(f"UID {uid} ist in keinem Tagesabschnitt eingeplant")


def insert_by_time(day: dict, stop: dict) -> int:
    """Fügt einen Stop an der zeitlich passenden Stelle ein und gibt den Index zurück."""
    index = len(day["stops"])
    for i, existing in enumerate(day["stops"]):
        if stop["time"] < existing["time"]:
            index = i
            break
    day["stops"].insert(index, stop)
    return index


# -------------------------------------------------------------------- Prüfung

def _image_problems(name: str, where: str, images: dict) -> list[str]:
    """Ein Bildverweis ist ein Schlüssel in den `images`-Block, keine URL."""
    if not isinstance(name, str) or not name:
        return [f"{where}: Bildname fehlt"]
    if name.startswith("http"):
        return [f"{where}: rohe URL '{name[:48]}…' – Bilder über den images-Block "
                f"verlinken, damit Lizenz und Namensnennung mitlaufen"]
    if name not in images:
        bekannt = ", ".join(sorted(images)[:8]) or "keine"
        return [f"{where}: Bildschlüssel '{name}' fehlt im images-Block (vorhanden: {bekannt})"]
    return []


def _images_block_problems(slug: str, images: dict) -> list[str]:
    """Der images-Block selbst: URL, Alt-Text, Urheber, Lizenz."""
    problems: list[str] = []
    for name, bild in sorted(images.items()):
        wo = f"{slug}: images['{name}']"
        if not isinstance(bild, dict):
            problems.append(f"{wo} ist kein Objekt")
            continue
        for feld in IMAGE_REQUIRED:
            if not bild.get(feld):
                problems.append(f"{wo}.{feld} fehlt")
        # `credit` nur dort verlangen, wo die Lizenz die Nennung fordert.
        if nennung_noetig(bild.get("license")) and not bild.get("credit"):
            problems.append(f"{wo}.credit fehlt – '{bild.get('license')}' verlangt "
                            f"Namensnennung. Bei CC0 oder Gemeinfreiheit darf das Feld fehlen.")
        url = str(bild.get("url", ""))
        if url and not url.startswith("https://"):
            problems.append(f"{wo}.url ist keine https-Adresse")
        # Signierte URLs verfallen nach Wochen – dann steht dort ein Platzhalter.
        if "googleusercontent" in url or "lh3.google" in url:
            problems.append(f"{wo}.url ist eine signierte Google-URL und verfällt – "
                            f"stabile Quelle verwenden (Wikimedia Commons o. Ä.)")
        # Special:Redirect liefert die Originaldatei in voller Auflösung. Ein
        # einzelnes Bild kam so auf 16,8 MB, eine Reise auf 66 MB. Dazu kostet
        # die Umleitung Zeit und wird von manchen Vorschau-Diensten nicht gefolgt.
        if "Special:Redirect" in url:
            problems.append(f"{wo}.url ist eine Special:Redirect-Adresse und liefert das "
                            f"Original in voller Auflösung – thumburl der API verwenden")
        if not bild.get("width") or not bild.get("height"):
            problems.append(f"{wo}: width/height fehlen – ohne sie springt das Layout beim Laden")
        # Breite als Bremse gegen Originale: 1280 px reichen für jedes Handy,
        # darüber zahlt der Reisende Daten für Pixel, die er nie sieht.
        breite = bild.get("width")
        if isinstance(breite, int) and breite > MAX_BILDBREITE:
            problems.append(f"{wo}: width {breite} px überschreitet {MAX_BILDBREITE} px – "
                            f"mit iiurlwidth={ZIEL_BILDBREITE} neu abfragen")
    return problems


def validate(slug: str, data: dict) -> list[str]:
    """Prüft eine Reise vollständig und gibt alle Befunde als Liste zurück."""
    problems: list[str] = []

    trip = data.get("trip")
    if not isinstance(trip, dict):
        return [f"{slug}: Block 'trip' fehlt"]
    for field in TRIP_REQUIRED:
        if not trip.get(field):
            problems.append(f"{slug}: trip.{field} fehlt")

    images = data.get("images")
    if not isinstance(images, dict) or not images:
        return problems + [f"{slug}: Block 'images' fehlt – dort stehen URL, Alt-Text, "
                           f"Urheber und Lizenz je Bildschlüssel"]
    problems += _images_block_problems(slug, images)
    problems += _image_problems(trip.get("heroImage", ""), f"{slug}: trip.heroImage", images)

    weather = trip.get("weather") or {}
    if weather.get("enabled"):
        for field in ("latitude", "longitude", "timezone", "startDate", "endDate"):
            if weather.get(field) in (None, ""):
                problems.append(f"{slug}: trip.weather.{field} fehlt")
        for note in weather.get("notes", []):
            if not ISO_RE.match(str(note.get("date", ""))):
                problems.append(f"{slug}: trip.weather.notes – ungültiges Datum '{note.get('date')}'")
            if "tempMax" in note or "code" in note:
                problems.append(f"{slug}: trip.weather.notes darf keine Prognosezahlen enthalten "
                                f"({note.get('date')}) – die kommen live von der API")

    days = data.get("days")
    if not isinstance(days, list) or not days:
        return problems + [f"{slug}: Block 'days' fehlt oder ist leer"]

    places = data.get("places")
    if not isinstance(places, dict) or not places:
        return problems + [f"{slug}: Block 'places' fehlt oder ist leer"]

    seen_days: set[str] = set()
    seen_uids: dict[str, str] = {}
    previous_iso = ""

    for day in days:
        label = day.get("id", "?")
        for field in DAY_REQUIRED:
            if not day.get(field):
                problems.append(f"{slug}/{label}: Feld '{field}' fehlt")
        if day.get("id") in seen_days:
            problems.append(f"{slug}: Tages-ID '{day.get('id')}' doppelt vergeben")
        seen_days.add(day.get("id"))

        if day.get("tone") not in TONES:
            problems.append(f"{slug}/{label}: tone '{day.get('tone')}' unbekannt "
                            f"(erlaubt: {', '.join(sorted(TONES))})")

        iso = str(day.get("isoDate", ""))
        if not ISO_RE.match(iso):
            problems.append(f"{slug}/{label}: isoDate '{iso}' ist kein Datum (JJJJ-MM-TT)")
        elif iso <= previous_iso:
            problems.append(f"{slug}/{label}: isoDate '{iso}' liegt nicht nach dem Vortag '{previous_iso}'")
        else:
            previous_iso = iso

        problems += _image_problems(day.get("heroImage", ""), f"{slug}/{label}: heroImage", images)

        previous_time = ""
        for stop in day.get("stops", []):
            uid, time = str(stop.get("uid", "")), str(stop.get("time", ""))
            extra = set(stop) - {"uid", "time"}
            if extra:
                problems.append(f"{slug}/{label}: Stop {uid} hat unerlaubte Felder {sorted(extra)} – "
                                f"Beschreibungen gehören in 'places'")
            if not UID_RE.match(uid):
                problems.append(f"{slug}/{label}: UID '{uid}' ist nicht zweistellig")
            if uid in seen_uids:
                problems.append(f"{slug}: UID {uid} ist doppelt eingeplant "
                                f"({seen_uids[uid]} und {label})")
            seen_uids[uid] = label
            if uid not in places:
                problems.append(f"{slug}/{label}: für UID {uid} fehlt der Eintrag in 'places'")
            if not TIME_RE.match(time):
                problems.append(f"{slug}/{label}: Uhrzeit '{time}' bei UID {uid} ist kein HH:MM")
            elif time < previous_time:
                problems.append(f"{slug}/{label}: UID {uid} um {time} steht nach {previous_time} – "
                                f"Stops müssen zeitlich aufsteigend sortiert sein")
            else:
                previous_time = time

    for uid, place in sorted(places.items()):
        if not UID_RE.match(uid):
            problems.append(f"{slug}: places-Schlüssel '{uid}' ist nicht zweistellig")
        if uid not in seen_uids:
            problems.append(f"{slug}: places['{uid}'] ({place.get('title', '?')}) ist keinem Tag zugeordnet")
        for field in PLACE_REQUIRED:
            if not place.get(field):
                problems.append(f"{slug}: places['{uid}'].{field} fehlt")
        description = place.get("description")
        if isinstance(description, str):
            problems.append(f"{slug}: places['{uid}'].description sollte eine Liste von Absätzen sein")
        elif isinstance(description, list) and len(description) < 2:
            problems.append(f"{slug}: places['{uid}'].description hat nur {len(description)} Absatz – "
                            f"mindestens zwei sind vorgesehen")
        # Nur prüfen, wenn gesetzt – das Fehlen meldet bereits die Pflichtfeldprüfung.
        if "weather" in place and place["weather"] not in WEATHER_VALUES:
            problems.append(f"{slug}: places['{uid}'].weather ist '{place.get('weather')}' – "
                            f"erlaubt: {', '.join(sorted(WEATHER_VALUES))}")
        if "fixed" in place and place["fixed"] is not True:
            problems.append(f"{slug}: places['{uid}'].fixed darf nur true sein oder fehlen "
                            f"(gefunden: {place['fixed']!r})")
        problems += _image_problems(place.get("image", ""), f"{slug}: places['{uid}'].image", images)
        for field in ("ticketUrl",):
            value = place.get(field)
            if value and not str(value).startswith("https://"):
                problems.append(f"{slug}: places['{uid}'].{field} ist keine https-Adresse")

    benutzt = {trip.get("heroImage")} | {d.get("heroImage") for d in days}
    benutzt |= {p.get("image") for p in places.values()}
    for name in sorted(set(images) - benutzt):
        problems.append(f"{slug}: images['{name}'] wird von keinem Ort und keinem Tag benutzt")

    return problems
