# Hinweise für Claude Code / Cowork

**Vor Inhaltsänderungen an den Reiseplänen [COWORK.md](COWORK.md) lesen.** Dort steht
das Datenmodell, die Befehle und die Rezepte für typische Aufträge.

Die Kurzfassung:

- Statische Website ohne Build-Schritt. `docs/` ist die Seite und wird von
  GitHub Actions unverändert nach Pages deployt. Kein npm, kein Bundler.
- Inhalte liegen ausschließlich in `docs/data/trips/*.json`.
- **Reihenfolge und Inhalt sind getrennt:** `days[].stops` enthält nur
  `{ uid, time }`, die Beschreibungen stehen in `places` nach UID. Verschieben
  bewegt eine Zeile, keinen Textblock.
- UIDs sind unveränderlich und werden nach dem Löschen nicht wiederverwendet.
- Umstellungen **nicht von Hand** im JSON machen, sondern mit dem Werkzeug – es
  prüft vor dem Schreiben:

  ```bash
  python tools/plan.py show  kopenhagen
  python tools/plan.py move  kopenhagen 05 tag2 --time 10:30
  python tools/plan.py order kopenhagen tag1 01,02,04,03,05,06,07
  python tools/plan.py swap  kopenhagen 11 24
  python tools/plan.py time  kopenhagen 11 09:30
  ```

- **Nach jeder Änderung** `python tools/plan.py bump` – sonst liefern Browser und
  Pages-Cache die alte Fassung aus.
- Vor dem Commit `python tools/validate_trips.py`. Dieselbe Prüfung blockiert in
  CI den Deploy.
- Keine erfundenen Wetterzahlen und keine externen Bild-URLs. Bilder gehören nach
  `docs/photos/web/` in **beiden** Breiten (`-720.jpg` und `-1200.jpg`).
