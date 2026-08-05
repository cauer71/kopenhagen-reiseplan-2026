# Termine im Google-Kalender

Die Reisedatei hat zwei Abnehmer: die Website und den Google-Kalender. Diese Datei regelt verbindlich, wie aus jedem Eintrag in `days[].stops` genau ein Kalendertermin entsteht und wie ein erneuter Lauf bestehende Termine aktualisiert, statt sie zu verdoppeln.

Datenmodell und Feldregeln stehen in [COWORK.md](COWORK.md), der Auftrag zum Erzeugen einer Reisedatei in [SYSTEMPROMPT.md](SYSTEMPROMPT.md).

---

## 1. Harte Sicherheitsregel: niemals in `primary` schreiben

Reisetermine gehören ausschließlich in den in `Assistent.md` festgelegten Urlaubskalender.

- `calendar_id` muss die konkrete ID des Urlaubskalenders sein.
- `calendar_id: "primary"` ist für Reisepläne verboten.
- Auch zum Testen darf nicht in den Hauptkalender geschrieben werden.
- Vor jedem Schreibvorgang muss `list_calendars` ausgeführt und der Zielkalender anhand von **Name und ID** eindeutig bestimmt werden.
- Ist die Urlaubskalender-ID nicht verfügbar oder nicht eindeutig, wird nichts geschrieben.

Beim Anlegen oder Aktualisieren gelten immer:

```text
calendar_id: <ID des Urlaubskalenders>
attendees: []
self_attendance: "omit"
add_google_meet: false
```

`self_attendance` darf nicht fehlen. Sonst kann Google das angemeldete Konto als Teilnehmer eintragen und denselben Termin zusätzlich im Hauptkalender anzeigen.

## 2. Vor jedem Lauf: beide Kalender prüfen

Bevor ein einziger Termin angelegt, aktualisiert oder gelöscht wird:

1. Reisezeitraum aus den frühesten und spätesten `days[].isoDate` bestimmen.
2. Alle Termine in diesem Zeitraum im Urlaubskalender auflisten.
3. Zusätzlich denselben Zeitraum im Hauptkalender auflisten.
4. Für jeden Reisetitel prüfen, ob er bereits in einem der beiden Kalender vorkommt.
5. Werden passende Reisetermine im Hauptkalender gefunden, Vorgang stoppen und zuerst melden. Sie dürfen nicht stillschweigend ignoriert werden.

Der Hauptkalender dient nur zur Sicherheitskontrolle. Neue Reiseeinträge werden dort niemals erzeugt.

## 3. Ein Stop, ein Termin

Für jeden Eintrag in `days[].stops` entsteht genau ein Termin, auch für An- und Abreise, Transfers, Restaurants und optionale Punkte.

| Feld des Termins | Quelle |
|---|---|
| Beginn | `days[].isoDate` + `days[].stops[].time` in `trip.timezone` |
| Ende | Beginn + `places[uid].minutes` |
| Titel | `places[uid].title` |
| Ort | `places[uid].place` |
| Beschreibung | nach Abschnitt 5 |

Keine Sammeltermine und keine Ganztagstermine, außer der Inhalt ist tatsächlich ganztägig.

## 4. Eindeutige Identität und Aktualisieren statt Verdoppeln

Die UID bleibt unveränderlich in der Reisedatei. Im Kalender wird sie nicht angezeigt. Dort ist der stabile, eindeutige Titel das Erkennungsmerkmal.

Vor dem Schreiben wird im Urlaubskalender für den gesamten Reisezeitraum ein vollständiger Bestand aufgenommen. Dann gilt:

1. **Exakt ein Treffer mit gleichem Titel:** bestehenden Termin aktualisieren.
2. **Kein Treffer:** neuen Termin anlegen.
3. **Mehr als ein Treffer mit gleichem Titel:** nichts schreiben; Doppeltermin melden und zuerst bereinigen.
4. **Termin im Zeitraum, dessen Titel nicht mehr in der Reisedatei vorkommt:** nur nach eindeutiger Zuordnung zur Reise löschen.

Ein zweiter Lauf muss dieselben Kalender-IDs wiederverwenden und darf keine neuen Termine erzeugen, solange bereits passende Titel vorhanden sind.

### Verbotener Ablauf

Dieser Ablauf ist falsch:

1. Termine ohne vorherige Suche neu anlegen.
2. Danach feststellen, dass sie schon vorhanden waren.
3. Alte und neue Termine parallel bestehen lassen.

### Pflichtprüfung nach jedem Lauf

Nach dem Schreiben werden Urlaubskalender und Hauptkalender erneut vollständig für den Reisezeitraum abgefragt.

Der Lauf ist nur erfolgreich, wenn:

- im Urlaubskalender die Anzahl der Reisetermine exakt der Anzahl der Stopps entspricht,
- jeder Titel genau einmal vorkommt,
- im Hauptkalender kein neu erzeugter Reisetermin vorhanden ist,
- keine unerwarteten Überschneidungen derselben Person bestehen.

Bei einer Abweichung wird nicht weitergeschrieben. Die konkrete Ursache wird gemeldet.

## 5. Terminbeschreibung

Die Beschreibung ist reiner Text in dieser Reihenfolge:

1. Erster Absatz aus `description[0]`, sofern er mit `Anfahrt:` beginnt.
2. Leerzeile.
3. `detail` und die übrigen Beschreibungsabsätze, sinnvoll gekürzt.
4. Leerzeile und `Tickets/Reservierung:` mit `tip` und gegebenenfalls `price`.
5. `ticketUrl`, sofern vorhanden.
6. Leerzeile.
7. `Google Maps:` auf eigener Zeile.
8. Kartenlink aus `places[uid].place` auf eigener letzter Zeile.

Keine UID, kein technischer Reise-Tag und kein Link auf die Reiseseite im Termin.

## 6. Ort, Zeitzone und Dauer

- Das Ortsfeld und der Kartenlink kommen immer aus `place`, nicht aus `address`.
- `trip.timezone` ist Pflicht. Fehlt sie, darf nicht geschrieben werden.
- Das Terminende wird ausschließlich aus `minutes` berechnet.
- Fehlt `minutes`, darf für diesen Stop kein Termin erzeugt werden.
- `duration` ist nur Anzeigetext und darf nicht zur Berechnung verwendet werden.

## 7. Löschen einer ganzen Reise

Eine ganze Reise entfernen bedeutet:

1. Reisedatei aus `docs/data/trips/` löschen.
2. Urlaubskalender im exakten Reisezeitraum vollständig auflisten.
3. Alle eindeutig zu dieser Reise gehörenden Termine löschen.
4. Hauptkalender im selben Zeitraum prüfen und dort vorhandene, versehentlich erzeugte Reisetermine ebenfalls eindeutig identifizieren und löschen.
5. Beide Kalender erneut abfragen und bestätigen, dass keine Reisetermine mehr vorhanden sind.
6. GitHub-Action abwarten und prüfen, dass die Reiseseite nicht mehr veröffentlicht wird.

Es genügt nicht, nur die ursprünglich bekannten Event-IDs zu löschen. Immer den gesamten Zeitraum erneut durchsuchen, weil spätere Testläufe zusätzliche Termine erzeugt haben können.

## 8. Was nicht gemacht wird

- Keine Einladungen und keine Selbstteilnahme.
- Keine zusätzlichen Erinnerungen.
- Keine ICS-Datei, außer ausdrücklich verlangt.
- Keine Personennamen im Ortsfeld.
- Keine Farben oder Sichtbarkeiten setzen, solange nicht verlangt.
- Keine Löschung nur anhand eines unscharfen Suchbegriffs.
- Kein Schreiben, wenn Zielkalender, Zeitraum oder vorhandener Bestand nicht eindeutig sind.

## 9. Testläufe

Der erste technische Test einer neuen Kalenderlogik erfolgt in einem eigenen Testkalender, niemals im Hauptkalender und nicht sofort im Urlaubskalender.

Ablauf:

1. Einen einzelnen Testtermin erzeugen.
2. Prüfen, dass er nur im Testkalender vorkommt und keine Teilnehmer enthält.
3. Denselben Lauf erneut ausführen.
4. Prüfen, dass der bestehende Termin aktualisiert und kein zweiter erzeugt wurde.
5. Testkalender leeren.
6. Erst danach die echte Reise in den Urlaubskalender schreiben.

## 10. Vor dem Schreiben melden

Vor jeder Kalenderänderung werden genannt:

- Reise und Zeitraum,
- exakter Zielkalender mit Name und ID,
- Anzahl vorhandener passender Termine im Urlaubskalender,
- Anzahl vorhandener passender Termine im Hauptkalender,
- Anzahl neu anzulegender, zu aktualisierender und zu löschender Termine,
- Zeitzone.

Erst nach dieser Bestandsaufnahme darf geschrieben werden.
