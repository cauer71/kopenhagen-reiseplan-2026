#!/usr/bin/env python3
"""Ruft jede Bild-URL aller Reisedateien ab und meldet, was nicht lädt.

Aufruf:  python tools/check_images.py

Warum getrennt von `validate_trips.py`: diese Prüfung braucht Netz. Sie darf den
Deploy nicht blockieren, wenn Wikimedia gerade langsam ist – sie soll nur zeigen,
dass ein Link tot ist.

Der Anlass war ein echter Fall. Eine Bild-URL trug die Thumbnail-Breite 1337 px:

    …/Via_Benedetta_in_Rome.jpg/1337px-Via_Benedetta_in_Rome.jpg

Wikimedia antwortete darauf mit `400 Use thumbnail sizes listed on …` – es
erzeugt keine Thumbnails in beliebigen Breiten mehr, sondern liefert nur noch
bereits vorhandene. Der Schlüssel stand korrekt im `images`-Block, der Validator
war zufrieden, und auf der Seite blieb eine leere Fläche. Genau diese Lücke
schließt dieses Skript.

**Breiten nicht raten.** Die erlaubten Größen sind nicht vorhersagbar: bei jener
Datei ging ausschließlich 1280 px, auch die klassischen 320, 640, 800 und 1024
wurden abgelehnt. Die URL immer von der API übernehmen, nie zusammensetzen:

    https://commons.wikimedia.org/w/api.php?action=query&format=json
      &formatversion=2&titles=File:NAME&prop=imageinfo
      &iiprop=url|size|extmetadata&iiurlwidth=1280

`thumburl`, `thumbwidth` und `thumbheight` aus der Antwort sind dann genau die
Werte für `url`, `width` und `height`.
"""

from __future__ import annotations

import sys
import time
import urllib.error
import urllib.request

import tripdata

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

UA = "Reiseplan-Bildpruefung/1.0 (https://github.com/cauer71/reiseplan)"
PAUSE = 0.8          # freundlich zum Bildserver
GROSS_KB = 1200      # darüber ein Hinweis: auf dem Handy zahlt man das mit Daten


def pruefe(url: str) -> tuple[int | str, int]:
    try:
        anfrage = urllib.request.Request(url, headers={"User-Agent": UA}, method="HEAD")
        with urllib.request.urlopen(anfrage, timeout=25) as antwort:
            return antwort.status, int(antwort.headers.get("content-length") or 0)
    except urllib.error.HTTPError as fehler:
        return fehler.code, 0
    except Exception:                                  # Netz, DNS, Zeitüberschreitung
        return "kein Netz", 0


def main() -> int:
    kaputt: list[str] = []
    dick: list[str] = []
    gesamt = 0

    for slug in tripdata.slugs():
        daten = tripdata.load(slug)
        bilder = daten.get("images") or {}
        print(f"{slug}: {len(bilder)} Bilder")
        for name, bild in sorted(bilder.items()):
            url = bild.get("url", "")
            if not url:
                kaputt.append(f"{slug}: images['{name}'] hat keine url")
                continue
            code, laenge = pruefe(url)
            gesamt += laenge
            kb = laenge // 1024 if laenge else 0
            if code == 200:
                marke = "ok "
                if kb > GROSS_KB:
                    marke = "gross"
                    dick.append(f"{slug}: images['{name}'] ist {kb} KB")
                print(f"  {marke:5s} {name:14s} {kb} KB")
            else:
                print(f"  FEHLER {name:14s} HTTP {code}")
                kaputt.append(f"{slug}: images['{name}'] antwortet HTTP {code} – {url}")
            time.sleep(PAUSE)

    print(f"\nSumme aller Bilder: {gesamt / 1048576:.1f} MB")
    if dick:
        print(f"\n{len(dick)} Bild(er) über {GROSS_KB} KB – auf dem Handy zahlt das der Reisende mit:")
        for d in dick:
            print(f"  ! {d}")
    if kaputt:
        print(f"\n{len(kaputt)} defekte(s) Bild(er):", file=sys.stderr)
        for k in kaputt:
            print(f"  ✗ {k}", file=sys.stderr)
        print("\nURL nicht selbst zusammensetzen – von der Commons-API übernehmen. "
              "Siehe den Kopf dieser Datei.", file=sys.stderr)
        return 1

    print("\nAlle Bild-URLs sind erreichbar.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
