# Umbau 1b - "Direkt im Tag"

Zwei geaenderte Dateien, 1:1 zum Kopieren:

    umbau-1b/assets/app.js   ->  docs/assets/app.js
    umbau-1b/styles.css      ->  docs/styles.css

Danach:

    python3 tools/validate_trips.py
    python3 tools/plan.py bump

Unveraendert bleiben: data/trips/*.json, alle UIDs, tools/*.py, sw.js,
manifest.webmanifest, assets/landing.js, assets/styles.css.

Der Umbau greift nur, wenn focusOf() "laufend" meldet - vor und nach der Reise
sieht die Seite aus wie bisher. Zum Testen des Unterwegs-Zustands in todayIso()
kurzzeitig `return "2026-07-06";` setzen und danach zurueckbauen.

Beschreibung der einzelnen Aenderungen: siehe umbau-1b.md im Projekt.
