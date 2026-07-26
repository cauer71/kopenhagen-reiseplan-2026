# Reiseplan schnell aktualisieren

Die Website wird vollständig aus `trip.json` aufgebaut. Für eine neue Reise wird die Datei kopiert und mit den neuen Reisedaten gefüllt; das Layout und `app.js` bleiben unverändert. Der aktuelle Datensatz ist ein zweitägiges Rom-Beispiel für den Aufenthalt vom 5.–6. September 2026.

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
