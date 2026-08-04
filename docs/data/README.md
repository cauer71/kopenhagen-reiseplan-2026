# Reisedaten

Die Inhalte der Website liegen in diesem Ordner:

```text
data/trips/rom.json          Rom: trip / days / places / images
data/trip.schema.json        Datenvertrag, maschinenlesbar
```

**Eine `.json` in `trips/` ist eine Reise.** Dateiname = Slug = Adresse
(`rom.json` → `/trips/rom/`), also nur Kleinbuchstaben, Ziffern und Bindestriche.
Eine Datei dazulegen zeigt eine Reise mehr, eine löschen eine weniger. Sonst ist
nichts zu tun.

`data/trips/index.json` steht nicht in dieser Liste: die Datei wird von
`tools/build.mjs` aus den vorhandenen Reisedateien **erzeugt** und ist in der
`.gitignore`. Sie nennt nur die Slugs — Titel, Datum und Untertitel liest die
Startseite aus der jeweiligen Reisedatei.

**Datenmodell und Regeln stehen in [../../COWORK.md](../../COWORK.md).** Diese
Datei wiederholt sie bewusst nicht – sonst laufen die beiden Beschreibungen
auseinander.

Das Wichtigste in drei Sätzen:

- `days[].stops` enthält ausschließlich `{ "uid": "05", "time": "16:05" }`. Die
  Ortsbeschreibungen stehen getrennt in `places`, nach UID sortiert.
- `image` in einem Ort ist ein **Schlüssel** in den `images`-Block, keine Datei und
  keine rohe URL. Dort steht je Motiv einmal URL, Alt-Text, Urheber und Lizenz.
  Bilder werden verlinkt und sind deshalb ohne Netz nicht sichtbar.
- Eine Änderung wirkt sofort nach dem Deploy: die Reisedaten werden per ETag
  zurückgefragt, es gibt keine Cache-Version anzuheben.

Prüfen: `node tools/build.mjs --check` — dasselbe läuft in der Action vor jedem
Deploy und blockiert ihn bei Fehlern.

Eine Reisedatei von einer anderen KI erzeugen lassen: `../../SYSTEMPROMPT.md`.
