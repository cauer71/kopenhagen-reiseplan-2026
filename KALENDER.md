# Termine im Google-Kalender

Die Reisedatei hat **zwei Abnehmer**: die Website und den Google-Kalender. Diese
Datei beschreibt den zweiten. Sie richtet sich an die KI-Anwendung, die die Termine
über den Google-Kalender-Konnektor schreibt.

Datenmodell und Feldregeln stehen in [COWORK.md](COWORK.md), der Auftrag zum
Erzeugen einer Reisedatei in [SYSTEMPROMPT.md](SYSTEMPROMPT.md). Hier steht
ausschließlich, was daraus ein Termin wird.

---

## Ein Stop, ein Termin

Für jeden Eintrag in `days[].stops` entsteht **genau ein** Termin. Keine
Sammeltermine für einen Tag, keine Ganztagstermine — der Zweck ist, unterwegs auf
dem Handy zu sehen, was als nächstes ansteht.

| Feld des Termins | kommt aus |
|---|---|
| Beginn | `days[].isoDate` + `days[].stops[].time`, in `trip.timezone` |
| Ende | Beginn + `places[<uid>].minutes` |
| Titel | `[REISE-<slug>] [UID:<uid>] ` + `places[<uid>].title` |
| Ort | `places[<uid>].address`, sonst `places[<uid>].place` |
| Beschreibung | siehe unten |

`<slug>` ist der Dateiname der Reisedatei ohne `.json`.

### Die Zeitzone ist Pflicht

`trip.timezone` (IANA-Name, z. B. `Europe/Rome`). Ohne sie ist `09:30` nicht
eindeutig, und der Termin landet auf der falschen Stunde — beim Reisenden, der
gerade in einer anderen Zeitzone sitzt, garantiert.

Fehlt das Feld, nimm `trip.weather.timezone`. Fehlen beide, **schreibe nicht**,
sondern melde es. Eine geratene Zeitzone ist schlimmer als kein Termin.

### Das Ende kommt aus `minutes`, nicht aus `duration`

`minutes` ist eine ganze Zahl. `duration` daneben ist Prosa für die Website
(„ca. 60–75 Min. als erster Teil einer 2,5-stündigen Führung") und lässt sich
nicht rechnen.

Fehlt `minutes`, **rate nicht** und setze keine Standarddauer. Melde den Ort und
lass den Termin weg. Ein Termin mit erfundenem Ende verdeckt den nächsten.

## Die Beschreibung

In dieser Reihenfolge, jeweils nur wenn vorhanden:

1. `places[].detail` — der Aufhänger, ein Satz.
2. Die Absätze aus `places[].description`.
3. `Dauer: ` + `places[].duration` — hier gehört die Prosa hin, mit ihren Zusätzen.
4. `Preis: ` + `places[].price`
5. `Hinweis: ` + `places[].tip`
6. `Ticket: ` + `places[].ticketUrl`
7. **Der Deep-Link auf die Seite** (siehe unten).

### Der Deep-Link gehört in jeden Termin

```
https://cauer71.github.io/reiseplan/trips/<slug>/#<tag-id>-stop-<uid>
```

Beispiel: `…/trips/rom/#tag1-stop-13`

Er öffnet die Reiseseite mit dem richtigen Tag und der aufgeklappten Karte des
Stops. Damit führt ein Termin zum Bild, zur vollständigen Beschreibung, zum
Kartenlink und zum Wetter — Dinge, die in einen Kalendereintrag nicht passen.

## Aktualisieren statt verdoppeln

Die Kennung `[REISE-<slug>] [UID:<uid>]` im Titel ist der Wiedererkennungswert.
Vor dem Schreiben:

1. Im Zielkalender nach `[REISE-<slug>]` suchen und die vorhandenen Termine mit
   ihren UIDs auflisten.
2. Für jeden Stop der Reisedatei:
   - UID vorhanden → Termin **aktualisieren** (Zeit, Dauer, Ort, Beschreibung).
   - UID nicht vorhanden → Termin **anlegen**.
3. Für jede UID im Kalender, die in der Reisedatei nicht mehr vorkommt → Termin
   **löschen**. Nicht umwidmen: ein gelöschter Stop ist nicht derselbe wie ein
   neuer an derselben Stelle.

> **Deshalb sind UIDs unveränderlich und werden nach dem Löschen nicht neu
> vergeben.** Würde eine Nummer wiederverwendet, hinge der alte Termin am neuen
> Ort — mit falschem Titel, falscher Zeit und falscher Beschreibung.

**Termine ohne die Kennung werden nie angefasst.** Im Kalender stehen private
Termine; was nicht `[REISE-…]` trägt, gehört nicht zu dieser Reise.

## Was nicht gemacht wird

- **Keine Einladungen.** Keine Teilnehmer hinzufügen, auch nicht die Mitreisenden.
  Ein Reiseplan ist keine Besprechung, und eine versehentliche Einladung an eine
  falsche Adresse verschickt die komplette Reise.
- **Keine Erinnerungen** über die Voreinstellung des Kalenders hinaus. 61 Termine
  mit eigener Erinnerung sind 61 Benachrichtigungen.
- **Keine Ganztagstermine**, auch nicht für Reisetage.
- **Nichts löschen, was keine Kennung trägt** — siehe oben.
- **Keine Farben oder Sichtbarkeiten setzen**, solange nicht ausdrücklich verlangt.

## Überlappungen sind nicht automatisch falsch

Zwei Termine können sich zu Recht überschneiden, wenn **zwei Personen** unterwegs
sind. In der Rom-Reise überlappt Julias Flug nach Menorca (95 Min.) mit Christians
Rückfahrt vom Flughafen, die 28 Minuten später beginnt. Das ist richtig und wird
nicht korrigiert.

Überlappen dagegen zwei Termine **derselben** Person, stimmt entweder `minutes`
oder die Uhrzeit nicht. Dann melden, nicht stillschweigend kürzen.

Ein echter Fall aus der Rom-Reise: die Kolosseum-Führung stand mit „ca. 60–75 Min.
als erster Teil einer 2,5–3-stündigen Führung" in der Datei. Der zweite Teil
beginnt 65 Minuten später. Die obere Grenze von 75 hätte ihn überlappt — richtig
sind hier 65, weil die Teile zusammenhängen.

## Erster Durchlauf: in einen Testkalender

Beim ersten Mal für eine Reise **nicht** in den Hauptkalender schreiben, sondern in
einen eigenen Kalender (z. B. „Reiseplan Test"). Gründe:

- 61 Termine mit falscher Kennung sind mühsam aufzuräumen; ein Testkalender ist
  ein Klick zum Löschen.
- Die Kennung, die Zeitzone und die Dauern lassen sich an ein paar Terminen prüfen,
  bevor es die ganze Reise betrifft.

Erst wenn ein Durchlauf stimmt und ein zweiter Durchlauf **aktualisiert statt
verdoppelt**, in den Hauptkalender.

## Bevor du schreibst, melde den Plan

Nenne kurz: Reise, Zielkalender, Anzahl der Termine, Zeitzone, wie viele angelegt,
aktualisiert und gelöscht werden. Warte auf Freigabe.

Ein Kalender ist geteilt und sichtbar; ein falscher Durchlauf ist nicht so einfach
zurückzunehmen wie ein Commit.
