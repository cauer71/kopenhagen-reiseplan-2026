# Termine im Google-Kalender

Die Reisedatei hat **zwei Abnehmer**: die Website und den Google-Kalender. Diese
Datei beschreibt, was aus einem Stop der Reisedatei ein Termin wird.

Datenmodell und Feldregeln stehen in [COWORK.md](COWORK.md), der Auftrag zum
Erzeugen einer Reisedatei in [SYSTEMPROMPT.md](SYSTEMPROMPT.md).

> **Vorrang.** Zielkalender, Mobilitätsangaben, Essensbudget, Recherche- und
> Freigaberegeln stehen in `Assistent.md` und gelten dort verbindlich. Diese Datei
> sagt, **wie die Felder der Reisedatei auf einen Termin abgebildet werden**.
>
> An **einer** Stelle weicht sie bewusst ab: `Assistent.md` §5 verlangt in der
> letzten Zeile jeder Beschreibung `[REISE-<ORT>-<JAHR>-<MONAT>] [UID:XX]`. Diese
> Kennung wird **nicht** geschrieben — im Termin soll nur stehen, was unterwegs
> hilft. Wie ohne sie wiedererkannt wird, steht unter „Aktualisieren statt
> verdoppeln". **`Assistent.md` §5 und §6 müssen dazu nachgezogen werden**, sonst
> gewinnt die dortige Fassung und die Kennung kommt zurück.

---

## Zielkalender

Der in `Assistent.md` festgelegte Urlaubskalender — **nicht** der Hauptkalender.

**Die Kalender-Adresse steht bewusst nicht in dieser Datei.** Dieses Repo ist
öffentlich (siehe COWORK.md, Abschnitt 6); die Kennung eines privaten Kalenders
gehört nicht hinein. Sie steht in `Assistent.md`, und die liegt nicht im Repo.

### Technische Vorgaben für den Google-Kalender-Konnektor

Beim Anlegen oder Aktualisieren eines Termins im Urlaubskalender müssen immer
folgende Werte verwendet werden:

- `calendar_id`: ausschließlich die ID des festgelegten Urlaubskalenders, niemals
  `primary`.
- `attendees`: immer eine leere Liste `[]`.
- `self_attendance`: zwingend `"omit"`.
- `add_google_meet`: `false`.

`self_attendance` darf weder auf `"accepted"`, `"tentative"` noch auf
`"declined"` gesetzt und auch nicht weggelassen werden. Der Konnektor verwendet
sonst standardmäßig `"accepted"` und trägt das angemeldete Google-Konto als
Teilnehmer ein. Dadurch erscheint derselbe Termin zusätzlich im persönlichen
Hauptkalender.

Nach dem ersten angelegten Termin muss geprüft werden:

1. Der Termin ist im Urlaubskalender vorhanden.
2. Der Termin erscheint nicht im Hauptkalender.
3. Der Termin enthält keine Teilnehmer.

Erst danach dürfen die übrigen Termine der Reise angelegt werden.

## Ein Stop, ein Termin

Für jeden Eintrag in `days[].stops` entsteht **genau ein** Termin — auch für An-
und Abreise, Transfers, Restaurants und als optional gekennzeichnete Punkte. Keine
Sammeltermine, keine Ganztagstermine außer für tatsächlich ganztägige Inhalte.

| Feld des Termins | kommt aus der Reisedatei |
|---|---|
| Beginn | `days[].isoDate` + `days[].stops[].time`, in `trip.timezone` |
| Ende | Beginn + `places[<uid>].minutes` |
| Titel | `places[<uid>].title` — **ohne** Tag und UID |
| Ort | `places[<uid>].place` — **nicht** `address`, siehe unten |
| Beschreibung | siehe unten |

### Weder Reise-Tag noch UID stehen im Termin

Der Titel enthält keine Kennung, die Beschreibung endet mit dem Kartenlink. Ein
Termin sieht damit aus wie ein von Hand angelegter.

Die UID bleibt trotzdem, was sie war: die unveränderliche Identität eines Ortes
**in der Reisedatei**, Schlüssel in `places`, Anker der Deep-Links auf der Website.
Sie wird nur nicht in den Kalender geschrieben.

> Deshalb bleiben UIDs unveränderlich und werden nach dem Löschen nicht neu
> vergeben — sonst zeigt der Link auf der Website auf den falschen Stop.

### Der Ort kommt aus `place`, nicht aus `address`

`place` ist laut Datenvertrag der Suchbegriff für den Kartenlink und enthält die
möglichst vollständige Adresse. `address` ist ein **Anzeigefeld** und darf etwas
anderes sein — bei Transfers ist es eine Route:

| UID | `address` | `place` |
|---|---|---|
| 13 | `Bozen → Roma Termini` | `Stazione di Bolzano, Piazza della Stazione 1, 39100 Bolzano` |
| 32 | `FCO → MAH` | Flughafen Rom-Fiumicino, vollständig |

Ein Kartenlink aus `address` führt bei diesen fünf Rom- und drei
Kopenhagen-Einträgen ins Nichts. Deshalb: Ortsfeld und Google-Maps-Link **immer**
aus `place`.

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
| 1 | `Anfahrt: von <vorher> → <jetzt> · zu Fuß <Zeit> · ÖPNV <Zeit und Linie>` | **`description[0]`**, siehe unten |
| 2 | Leerzeile | |
| 3 | zwei bis vier Sätze | `places[].detail` und die **übrigen** Absätze aus `description`, sinnvoll gekürzt |
| 4 | Leerzeile, dann `Tickets/Reservierung: …` | `places[].tip`, ergänzt um `places[].price` wenn relevant |
| 5 | offizieller Buchungslink | `places[].ticketUrl` |
| 6 | Leerzeile | |
| 7 | `Google Maps:` | die Beschriftung allein auf ihrer Zeile |
| 8 | **letzte Zeile:** der Link | aus `places[].place` |

Der Link steht auf einer **eigenen** Zeile, nicht hinter der Beschriftung. Google
Kalender macht aus einer Zeile, die nur aus einer URL besteht, einen sauberen
Verweis; steht Text davor, wird das Antippen auf dem Handy zur Zielübung.

Die Beschreibung endet damit beim Kartenlink. **Keine Kennung, keine UID und kein
Link auf die Reiseseite** — bewusst so entschieden: im Termin soll nur stehen, was
unterwegs hilft. Wie ohne Kennung wiedererkannt wird, steht im nächsten Abschnitt.

### Die Anfahrtszeile steht schon in der Reisedatei

Sie ist **der erste Absatz von `description`** und beginnt mit `Anfahrt:`. Der
erzeugende Prompt schreibt sie dort hin: bei 28 von 31 Rom-Orten und bei allen 30
Kopenhagen-Orten, immer an Position 0.

Deshalb:

1. Beginnt `description[0]` mit `Anfahrt:`, **übernimm den Absatz wörtlich** als
   Zeile 1 und stelle **keine zweite** davor. Sonst steht die Anfahrt zweimal im
   Termin.
2. Die **übrigen** Absätze sind der Beschreibungstext für Punkt 3.
3. Fehlt der Absatz, entweder die Zeiten beim Schreiben recherchieren wie in
   `Assistent.md` §8, oder die Zeile weglassen. **Keine ungeprüfte Schätzung** —
   eine erfundene Metrolinie ist schlimmer als keine Angabe.

Wird geschätzt, dann als Spanne und als Schätzung erkennbar. `zu Fuß`, niemals
nur `Fuß`. Keine Taxis, außer ausdrücklich verlangt.

> **Nebenwirkung, die man kennen muss.** Weil die Anfahrt in `description` steckt,
> zählt sie bei der Prüfung „mindestens zwei Absätze" mit. Alle 30
> Kopenhagen-Orte haben genau zwei Einträge — einer davon ist die Anfahrt. Es
> bleibt also **ein** Absatz echte Beschreibung, wo zwei gemeint waren. Sauber
> wäre ein eigenes Feld für die Anfahrt; solange es das nicht gibt, sollte
> `description` bei neuen Reisen **drei** Einträge haben: Anfahrt plus zwei
> Absätze. Die Rom-Orte machen das schon so.

### Beispiel

```text
Anfahrt: von Seven → Roma Termini · zu Fuß 6–8 Min. · ÖPNV —

Gemeinsame Hinfahrt mit fast vollständigem ersten Reisetag in Rom.
Abfahrt in Bozen ist am Samstag um 06:42 Uhr. Der Italo 8953 erreicht Roma
Termini planmäßig um 11:40 Uhr.

Tickets/Reservierung: Spätestens 15 Min. vor Abfahrt am Bahnsteig sein. Gebucht.
https://www.italotreno.com/

Google Maps:
https://www.google.com/maps/search/?api=1&query=Stazione%20di%20Bolzano%2C%20Piazza%20della%20Stazione%201%2C%2039100%20Bolzano%20BZ%2C%20Italien
```

## Aktualisieren statt verdoppeln

Ohne Kennung in der Beschreibung geht die Wiedererkennung über **Kalender und
Zeitraum**:

1. **Nur** im festgelegten Urlaubskalender arbeiten. Dort stehen ausschließlich
   Urlaubsreisen — das ist die Voraussetzung dafür, dass dieser Weg trägt.
2. Alle Termine im Zeitraum der Reise auflisten: vom frühesten bis zum spätesten
   `isoDate` der Tagesabschnitte. Diese Termine gehören zu dieser Reise.
3. Für jeden Stop der Reisedatei über den **Titel** abgleichen:
   - Titel vorhanden → Termin **aktualisieren** (Datum, Zeit, Dauer, Ort,
     Beschreibung).
   - Titel nicht vorhanden → Termin **anlegen**.
4. Übrig gebliebene Termine im Zeitraum → **löschen**.
5. Anschließend Vollständigkeit und zeitliche Konflikte prüfen.

Das trägt auch, wenn ein Stop auf einen anderen Tag wandert: der Titel bleibt, der
Termin wird verschoben statt verdoppelt.

**Ein umbenannter Stop wird zu Löschen plus Anlegen.** Das Ergebnis ist richtig,
nur die Termin-Historie bricht. Das ist der Preis dafür, dass keine Kennung in der
Beschreibung steht — bewusst in Kauf genommen.

> **Voraussetzung, die nicht verhandelbar ist:** der Zielkalender enthält nur
> Urlaubsreisen. Läge dort ein privater Termin im Reisezeitraum, würde Schritt 4
> ihn löschen. Deshalb niemals in den Hauptkalender schreiben.

> **`Assistent.md` muss dazu nachgezogen werden.** Dort verlangt §5, die letzte
> Zeile jeder Beschreibung lautet exakt `[REISE-<ORT>-<JAHR>-<MONAT>] [UID:XX]`,
> und §6 sucht danach. Solange das dort steht, gewinnt es — die Kennung käme
> zurück. Zu ändern sind §5 (letzte Zeile entfällt) und §6 Punkte 2–5 (Abgleich
> über Zeitraum und Titel statt über den Reise-Tag).

## Was nicht gemacht wird

- **Keine Einladungen und keine Selbstteilnahme.** Keine Teilnehmer hinzufügen,
  auch nicht das angemeldete Google-Konto oder die Mitreisenden. Beim
  Google-Kalender-Konnektor deshalb immer `attendees: []` und
  `self_attendance: "omit"` setzen; `self_attendance` darf nicht weggelassen
  werden. Ein Reiseplan ist keine Besprechung, und eine versehentliche Einladung
  trägt die Termine zusätzlich in den Hauptkalender ein oder verschickt die
  komplette Reise mit allen Adressen und Zeiten.
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
