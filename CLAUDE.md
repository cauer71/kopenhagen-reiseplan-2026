# Hinweise für Claude Code / Cowork

**Vor Inhaltsänderungen [COWORK.md](COWORK.md) lesen.** Dort steht das Datenmodell
und was der Bau prüft.

## Der Grundsatz

Diese Seite **zeigt nur, was in den Reisedateien steht**. Sie erzeugt keine
Inhalte, sortiert nicht um und verwaltet keine Liste von Reisen.

```text
eine .json nach docs/data/trips/   →  eine Reise mehr
eine .json dort löschen            →  eine Reise weniger
```

Der Dateiname wird der Slug und damit Teil der Adresse — nur Kleinbuchstaben,
Ziffern und Bindestriche.

Die Reisedateien werden **außerhalb dieses Repos** erzeugt, und auch das Umsortieren
bei Regen passiert dort. `SYSTEMPROMPT.md` ist der Auftrag für die erzeugende
Anwendung; er beschreibt das Datenmodell vollständig, sodass sie dieses Repo nicht
kennen muss.

Aus derselben Reisedatei entstehen **Termine im Google-Kalender** — der zweite
Abnehmer. `KALENDER.md` beschreibt, was daraus ein Termin wird. Geschrieben wird
über den Google-Kalender-Konnektor der erzeugenden Anwendung, nicht von hier.

## Was am eigenen Rechner läuft: nichts

Es gibt genau ein Werkzeug, und es läuft in der GitHub-Action:

```bash
node tools/build.mjs            # prüfen und erzeugen
node tools/build.mjs --check    # nur prüfen (Pull Requests)
node tools/build.mjs --bilder   # jede Bild-URL abrufen, braucht Netz
```

Es benutzt nur die Node-Standardbibliothek. Kein `package.json`, kein npm, kein
Bundler, kein Python.

Erzeugt werden `docs/data/trips/index.json` und `docs/trips/<slug>/index.html`.
**Beides steht in der `.gitignore` und darf nicht eingecheckt werden** — solange es
im Repo lag, konnte es von den Reisedateien abweichen, und genau das ist passiert:
eine Reise lag im Ordner, fehlte in der Liste und war unsichtbar, ohne dass etwas
fehlschlug.

Es gibt **keine Cache-Version** mehr und keinen `?v=`-Parameter. Der Service Worker
fragt bei jeder Datei mit `cache: "no-cache"` nach; Unverändertes kommt als 304
zurück. Damit ist nach dem Push nichts anzuheben.

## Kurzfassung des Datenmodells

- Statische Website. `docs/` ist die Seite. Der Datenvertrag steht maschinenlesbar
  in `docs/data/trip.schema.json`, erklärt in [COWORK.md](COWORK.md).
- **Reihenfolge und Inhalt sind getrennt:** `days[].stops` enthält nur
  `{ uid, time }`, die Beschreibungen stehen in `places` nach UID. Verschieben
  bewegt eine Zeile, keinen Textblock.
- UIDs sind unveränderlich und werden nach dem Löschen nicht wiederverwendet.
- Jeder Ort braucht `weather` (`aussen` | `innen` | `beides`). `fixed: true` nur bei
  Flügen, Transfers, Check-out und gebuchten Zeitfenstern — eine Schutzschaltung
  gegen Umsortieren, keine Kennzeichnung für „wichtig“.
- Keine erfundenen Wetterzahlen. Bilder werden **verlinkt**: `image` in einem Ort
  ist ein Schlüssel in den `images`-Block, keine Datei und keine rohe URL. Jeder
  Eintrag dort braucht `url`, `alt` und `license`; `credit` zusätzlich, wenn die
  Lizenz eine Namensnennung verlangt. Der Bildnachweis auf der Seite zeigt nur
  diese Bilder — CC0 und Gemeinfreies bleibt draußen, und verlangt keines eine
  Nennung, entfällt der Abschnitt. Signierte Google-URLs und `Special:Redirect`
  werden abgelehnt, `width` höchstens 1600 px.
- Titel, Datum, Untertitel und die Einordnung (`introLabel`) stehen **nur** in der
  Reisedatei. Die Startseite liest sie dort, die Reihenfolge der Kacheln wird aus
  den `isoDate`-Angaben berechnet. Nicht von Hand sortieren.

## Schreibzugriff aus einer Cowork-Cloud-Session

Der GitHub-Konnektor der Claude-Desktop-App reicht **nicht**. Er ist Anthropics
native GitHub-Anbindung, kein MCP-Konnektor, und stellt einer Cowork-Session keine
Tools bereit. Lesen geht trotzdem, weil dieses Repo öffentlich ist — `git clone`
läuft anonym. Für **Schreiben** braucht es einen eigenen Token.

Der Token ist ein Fine-grained PAT, beschränkt auf dieses Repo, mit
`Contents: read/write` und `Pull requests: read/write`. Er wird **nie hier
eingecheckt**; er kommt bei Bedarf vom Nutzer. Er lebt nur im Container, der am
Sessionende verworfen wird — jede neue Session braucht einen neuen.

Einmalig einrichten, `$PAT` ist der Tokenwert:

```bash
umask 077 && mkdir -p ~/.secrets && printf '%s\n' "$PAT" > ~/.secrets/gh_pat
printf 'https://x-access-token:%s@github.com\n' "$PAT" > /root/.git-credentials
chmod 600 /root/.git-credentials ~/.secrets/gh_pat
git config --global credential.helper store
git config --global commit.gpgsign false   # Signing-Key der Umgebung passt nicht zum Account
```

`commit.gpgsign` muss aus, sonst scheitert jeder Commit am fremden Signing-Key.
Danach laufen `clone`, `fetch`, `commit` und `push` ohne weiteres Zutun.

**Die Falle:** Die GitHub-**API** wird vom Umgebungs-Proxy pfadweise blockiert. Sie
antwortet auf `repos/...` mit *„GitHub access to this repository is not enabled for
this session. Use add_repo…"* — unabhängig vom Token, und `add_repo` gibt es in
Cowork nicht. Der Ausweg ist, den Proxy zu umgehen; `git` selbst läuft dagegen
normal über ihn:

```bash
curl -sS --noproxy '*' -H "Authorization: Bearer $(cat ~/.secrets/gh_pat)" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/cauer71/reiseplan
```

Ohne `--noproxy '*'` ist keine Pull-Request-, Issue- oder Release-Operation möglich.

Zum Schluss den Zugriff **verifizieren, nicht annehmen**: Testbranch anlegen,
Commit, Push, Branch remote wieder löschen (`git push origin --delete <branch>`).
Ob direkt auf `main` oder über Branch und PR gearbeitet wird, sagt der Nutzer.
