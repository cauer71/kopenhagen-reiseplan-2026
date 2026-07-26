# Reiseplan-Template: neue Reise anlegen

Die Startseite liegt unter `/kopenhagen-reiseplan-2026/`. Jede Reise hat einen eigenen Unterordner und eine eigene Datendatei:

```text
docs/
├── index.html                         Startseite mit Reiseauswahl
├── assets/app.js                      gemeinsame Darstellung
├── assets/styles.css                  gemeinsames Design
├── data/trips/kopenhagen.json         Kopenhagen-Daten
├── data/trips/rom.json                Rom-Daten
└── trips/<slug>/index.html            eigene URL der Reise
```

Beispiele:

- `/kopenhagen-reiseplan-2026/kopenhagen/`
- `/kopenhagen-reiseplan-2026/rom/`

Für eine neue Reise kopierst du eine vorhandene JSON-Datei nach `docs/data/trips/<slug>.json` und eine vorhandene Unterseite nach `docs/trips/<slug>/index.html`. In der HTML-Datei wird nur der Pfad zur JSON-Datei geändert. Danach kommt die Reise als Kachel in `docs/assets/landing.js` hinzu. Darstellung und Styles bleiben unverändert.

## Wetterbedingte Änderungen

Jeder Termin besitzt eine feste zweistellige UID, zum Beispiel `UID:05`. Diese UID darf beim Verschieben nicht geändert werden. Der Termin kann dadurch weiterhin eindeutig mit seinem Kalendertermin, seinen Bildern und seinem Maps-Link verbunden werden.

Für einen schnellen Tausch:

1. Den gesamten Terminblock mit derselben UID in den gewünschten Tagesabschnitt verschieben.
2. `uid`, `image`, `place` und `ticketUrl` unverändert lassen.
3. Nur `time`, `detail` oder `weather` ändern, wenn sich die konkrete Planung ändert.
4. Datei speichern und die Website neu laden.

Beispiel: Der Termin mit `UID:05` kann bei Regen vom ersten auf den zweiten Tag verschoben werden. Die UID bleibt `05`; damit bleibt die Zuordnung zur späteren Bildkarte stabil.

## Datenmodell pro Termin

```json
{
  "uid": "05",
  "time": "16:05",
  "title": "Vor Frelsers Kirke",
  "detail": "Warum dieser Termin sehenswert ist.",
  "image": "saviour",
  "place": "Church of Our Saviour Copenhagen",
  "ticketUrl": "https://example.org/tickets"
}
```

`ticketUrl` ist optional. Bilder können unter `docs/photos/web/` liegen und über den Dateinamen ohne Größenendung eingetragen werden; für externe Bildquellen ist auch eine vollständige URL möglich. Die letzte Kalenderzeile `[REISE-…] [UID:05]` ist die verbindliche Brücke zwischen Google Kalender und Website.
