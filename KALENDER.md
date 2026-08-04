# Termine im Google-Kalender

Die Reisedatei hat **zwei Abnehmer**: die Website und den Google-Kalender. Diese
Datei beschreibt, was aus einem Stop der Reisedatei ein Termin wird.

Datenmodell und Feldregeln stehen in [COWORK.md](COWORK.md), der Auftrag zum
Erzeugen einer Reisedatei in [SYSTEMPROMPT.md](SYSTEMPROMPT.md).

> **Vorrang.** Die Kalenderkonventionen — Zielkalender, Reise-Tag, Aufbau der
> Beschreibung, Mobilitätsangaben, Essensbudget — stehen in `Assistent.md` und
> gelten dort verbindlich. Diese Datei sagt nur, **wie die Felder der Reisedatei
> darauf abgebildet werden**. Bei einem Widerspruch gilt `Assistent.md`.
>
> Genau dieser Fall ist schon eingetreten: hier stand einmal `[REISE-rom]
> [UID:05]` **im Titel**. `Assistent.md` verlangt aber `[REISE-ROM-2026-09]
> [UID:05]` in der **letzten Zeile der Beschreibung** und ausdrücklich nicht im
> Titel. Wäre die falsche Form geschrieben worden, hätte der zweite Durchlauf
> jeden Termin verdoppelt statt ihn zu aktualisieren.

---

## Zielkalender

Der in `Assistent.md` festgelegte Urlaubskalender — **nicht** der Hauptkalender.

**Die Kalender-Adresse steht bewusst nicht in dieser Datei.** Dieses Repo ist
öffentlich (siehe COWORK.md, Abschnitt 6); die Kennung eines privaten Kalenders
gehört nicht hinein. Sie steht in `Assistent.md`, und die liegt nicht im Repo.

## Ein Stop, ein Termin

Für jeden Eintrag in `days[].stops` entsteht **genau ein** Termin — auch für An-
und Abreise, Transfers, Restaurants und als optional gekennzeichnete Punkte. Keine
Sammeltermine, keine Ganztagstermine außer für tatsächlich ganztägige Inhalte.

| Feld des Termins | kommt aus der Reisedatei |
|---|---|
| Beginn | `days[].isoDate` + `days[].stops[].time`, in `trip.timezone` |
| Ende | Beginn + `places[<uid>].minutes` |
| Titel | `places[<uid>].title` — **ohne** Tag und UID |
| Ort | `places[<uid>].address`, sonst `places[<uid>].place` |
| Beschreibung | siehe unten |

### Der Reise-Tag wird abgeleitet, nicht erfunden

```
[REISE-<ORT>-<JAHR>-<MONAT>]
```

- `<ORT>` = `trip.destination`, in Großbuchstaben, ohne Leerzeichen und
  Sonderzeichen; Umlaute umgeschrieben (ä→AE, ö→OE, ü→UE, ß→SS).
- `<JAHR>-<MONAT>` = aus dem **frühesten** `isoDate` der Tagesabschnitte.

Ergibt für die vorhandenen Reisen:

| Reisedatei | Reise-Tag |
|---|---|
| `rom.json` | `[REISE-ROM-2026-09]` |
| `kopenhagen.json` | `[REISE-KOPENHAGEN-2026-07]` |

Der Tag ist damit aus der Datei berechenbar und muss nirgends gepflegt werden.

### Die UID kommt aus der Reisedatei

**Nicht** als fortlaufende Nummer beim Schreiben vergeben, sondern **wörtlich der
Schlüssel aus `places`.**

Das ist die eine Stelle, an der die Kalenderregel gegenüber `Assistent.md` §5
präzisiert wird — und zwar notwendig: die UIDs der Reisedatei sind **nicht
fortlaufend.** Rom hat 01, 02, 04, 10, 12 … 38, mit Lücken bei 03, 05–09 und 11,
weil dort Programmpunkte entfallen sind und gelöschte Nummern nicht neu vergeben
werden.

Eine eigene Zählung beim Schreiben würde also andere Nummern erzeugen als die
Website benutzt. Damit wäre der Deep-Link falsch, und beim nächsten Durchlauf
hinge jeder Termin am falschen Ort.

> Deshalb bleiben UIDs unveränderlich und werden nach dem Löschen nicht neu
> vergeben — in der Reisedatei **und** im Kalender.

### Die Zeitzone ist Pflicht

`trip.timezone` (IANA-Name, z. B. `Europe/Rome`). Ohne sie ist `09:30` nicht
eindeutig, und der Termin landet auf der falschen Stunde — beim Reisenden, der
gerade in einer anderen Zeitzone sitzt, garantiert.

Fehlt das Feld, nimm `trip.weather.timezone`. Fehlen beide, **schreibe nicht**,
sondern melde es. Eine geratene Zeitzone ist schlimmer als kein Termin.

### Das Ende kommt aus `minutes`, nicht aus `duration`

`minutes` ist eine ganze Zahl und bildet die reine Aktivitätsdauer ab; Wegezeiten
werden nicht dazugerechnet. `duration` daneben ist Prosa für die Website („ca.
60–75 Min. als erster Teil einer 2,5-stündigen Führung") und lässt sich nicht
rechnen.

Fehlt `minutes`, **rate nicht** und setze keine Standarddauer. Melde den Ort und
lass den Termin weg. Ein Termin mit erfundenem Ende verdeckt den nächsten.

## Die Beschreibung

Reiner Text, in der Reihenfolge aus `Assistent.md` §11 — hier mit der Angabe,
woher jeder Teil kommt:

| # | Zeile | Quelle |
|---|---|---|
| 1 | `Anfahrt: von <vorher> → <jetzt> · zu Fuß <Zeit> · ÖPNV <Zeit und Linie>` | **nicht in der Reisedatei**, siehe unten |
| 2 | Leerzeile | |
| 3 | zwei bis vier Sätze | `places[].detail` und die Absätze aus `places[].description`, sinnvoll gekürzt |
| 4 | Leerzeile, dann `Tickets/Reservierung: …` | `places[].tip`, ergänzt um `places[].price` wenn relevant |
| 5 | offizieller Buchungslink | `places[].ticketUrl` |
| 6 | Google-Maps-Link | aus `places[].place` bzw. `address` |
| 7 | Link auf die Reiseseite | siehe unten |
| 8 | letzte Zeile: `[REISE-…] [UID:XX]` | abgeleitet |

### Die Anfahrtszeile hat keine Quelle in der Reisedatei

Die Reisedatei enthält **keine** Wege- und ÖPNV-Zeiten. Es gibt kein Feld dafür,
und es ist keines geplant: die Zeiten hängen vom Fahrplan ab und veralten
schneller als die Datei.

Zwei zulässige Wege:

1. Die Zeiten beim Schreiben recherchieren, wie in `Assistent.md` §8 beschrieben —
   dann steht die Zeile vollständig da. Reihenfolge und vorheriger Stopp ergeben
   sich aus `days[].stops`; der erste Stopp des Tages beginnt an der Unterkunft.
2. Die Zeile weglassen, wenn keine verlässliche Angabe zu bekommen ist. **Keine
   geschätzten Minuten hinschreiben**, die niemand geprüft hat — eine erfundene
   ÖPNV-Verbindung ist schlimmer als keine Angabe.

Wird geschätzt, dann als Spanne und als Schätzung erkennbar. `zu Fuß`, niemals
nur `Fuß`. Keine Taxis, außer ausdrücklich verlangt.

### Der Link auf die Reiseseite

```
https://cauer71.github.io/reiseplan/trips/<slug>/#<tag-id>-stop-<uid>
```

Beispiel: `https://cauer71.github.io/reiseplan/trips/rom/#tag1-stop-13`

`<slug>` ist der Dateiname der Reisedatei ohne `.json`, `<tag-id>` das `id`-Feld
des Tagesabschnitts.

Er öffnet die Reiseseite mit dem richtigen Tag und der aufgeklappten Karte des
Stops. Damit führt ein Termin zum Bild, zur vollständigen Beschreibung, zum
Wetter und zum Kartenlink — Dinge, die in einen Kalendereintrag nicht passen.

Das war von Anfang an der Zweck der UID: `Assistent.md` §5 nennt sie „für eine
spätere Website mit einer eigenen Karte pro Termin". Diese Website gibt es jetzt.

### Beispiel

```text
Anfahrt: von Seven Rooms Hotel → Roma Termini · zu Fuß 6–8 Min. · ÖPNV —

Der Italo verbindet Bozen ohne Umsteigen mit Rom. Die Fahrt führt durch das
Etschtal und die Poebene; ab Florenz geht es über die Schnellfahrstrecke.

Tickets/Reservierung: Gebucht. Spätestens 15 Min. vor Abfahrt am Bahnsteig sein.
https://www.italotreno.com/
https://www.google.com/maps/search/?api=1&query=Stazione%20di%20Bolzano
https://cauer71.github.io/reiseplan/trips/rom/#tag1-stop-13
[REISE-ROM-2026-09] [UID:13]
```

## Aktualisieren statt verdoppeln

Vor dem Schreiben:

1. **Nur** im festgelegten Urlaubskalender suchen.
2. Alle Termine mit dem **exakt** passenden Reise-Tag ermitteln und ihre UIDs
   auflisten.
3. Für jeden Stop der Reisedatei:
   - UID vorhanden → Termin **aktualisieren** (Zeit, Dauer, Ort, Beschreibung).
   - UID nicht vorhanden → Termin **anlegen**.
4. Für jede UID im Kalender, die in der Reisedatei nicht mehr vorkommt → Termin
   **löschen**. Nicht umwidmen.
5. Anschließend Vollständigkeit und zeitliche Konflikte prüfen.

„Reise ersetzen", „Plan aktualisieren" oder „neu planen" gilt als Freigabe, die
Termine mit **genau diesem** Reise-Tag zu ersetzen.

**Termine ohne den exakten Reise-Tag werden nie angefasst.** Im Kalender stehen
andere Reisen und private Termine.

## Was nicht gemacht wird

- **Keine Einladungen.** Keine Teilnehmer hinzufügen, auch nicht die Mitreisenden.
  Ein Reiseplan ist keine Besprechung, und eine versehentliche Einladung an eine
  falsche Adresse verschickt die komplette Reise mit allen Adressen und Zeiten.
- **Keine Erinnerungen** über die Voreinstellung des Kalenders hinaus. 61 Termine
  mit eigener Erinnerung sind 61 Benachrichtigungen.
- **Keine ICS-Datei**, außer sie wird ausdrücklich verlangt.
- **Keine Personennamen im Ortsfeld.** Dort steht die reale Ortsbezeichnung, sonst
  zeigt der Kartenlink ins Leere.
- **Nichts löschen ohne den exakten Reise-Tag.**
- **Keine Farben oder Sichtbarkeiten setzen**, solange nicht verlangt.

## Überlappungen: die Regel hat eine Ausnahme

`Assistent.md` §7 verlangt „Plane keine Überschneidungen". Das gilt für **eine**
Person. Reisen zwei und trennen sich, sind gleichzeitige Termine richtig.

In der Rom-Reise überlappt Julias Flug nach Menorca (95 Min., UID 32) mit
Christians Rückfahrt vom Flughafen, die 28 Minuten später beginnt (UID 33). Das
wird **nicht** korrigiert.

Überlappen zwei Termine **derselben** Person, stimmt entweder `minutes` oder die
Uhrzeit nicht. Dann melden, nicht stillschweigend kürzen.

Ein echter Fall: die Kolosseum-Führung stand mit „ca. 60–75 Min. als erster Teil
einer 2,5–3-stündigen Führung" in der Datei. Der zweite Teil beginnt 65 Minuten
später. Die obere Grenze von 75 hätte ihn überlappt — richtig sind 65, weil die
Teile zusammenhängen. Deshalb steht in `places["01"].minutes` jetzt 65.

## Erster Durchlauf: in einen Testkalender

Beim ersten Mal für eine Reise **nicht** in den Urlaubskalender schreiben, sondern
in einen eigenen (z. B. „Reiseplan Test"):

- 61 Termine mit falscher Kennung sind mühsam aufzuräumen; ein Testkalender ist
  ein Klick zum Löschen.
- Reise-Tag, UID, Zeitzone und Dauern lassen sich an ein paar Terminen prüfen,
  bevor es die ganze Reise betrifft.
- Ein zweiter Durchlauf muss **aktualisieren, nicht verdoppeln**. Das ist der
  eigentliche Test, und er kostet nichts, solange er im Testkalender läuft.

## Bevor du schreibst, melde den Plan

Reise und Reise-Tag, Zielkalender, Reisezeitraum, Anzahl neu angelegter,
aktualisierter und gelöschter Termine, Zeitzone. Warte auf Freigabe.

Ein Kalender ist geteilt und sichtbar; ein falscher Durchlauf ist nicht so einfach
zurückzunehmen wie ein Commit.
