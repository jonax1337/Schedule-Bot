# Matches & Statistiken

## Matches (Scrim Management)

Die Matches-Komponente (`components/shared/matches.tsx`) wird sowohl im User-Portal als auch im Admin-Panel verwendet.

### Features

**Scrim-Liste:**
- Alle Scrims in chronologischer Reihenfolge
- Filter nach Map, Ergebnis, Zeitraum
- Kompakte Karten mit Kerndaten

**Scrim-Details:**
- Datum, Gegner, Ergebnis, Score
- Karte und Match-Typ
- Agenten beider Teams
- VOD-Link und Match-Link
- Notizen

**CRUD (nur Admin):**
- Scrim erstellen mit vollstaendigen Details
- Bearbeiten aller Felder
- Loeschen (mit Cascade auf VOD-Kommentare)

### Agenten-Picker

Eigene Komponente (`agent-picker.tsx`) fuer die Multi-Auswahl von Valorant-Agenten:

**Verfuegbare Agenten:** Astra, Breach, Brimstone, Chamber, Clove, Cypher, Deadlock, Fade, Gekko, Harbor, Iso, Jett, KAY/O, Killjoy, Neon, Omen, Phoenix, Raze, Reyna, Sage, Skye, Sova, Tejo, Viper, Vyse, Waylay, Yoru

**Verfuegbare Maps:** Abyss, Ascent, Bind, Breeze, Corrode, Fracture, Haven, Icebox, Lotus, Pearl, Split, Sunset

**Match-Typen:** Scrim, Tournament, Premier, Custom

## Statistiken

Die Statistik-Komponente (`components/shared/statistics.tsx`) zeigt aggregierte Daten mit Recharts.

### Visualisierungen

**Gesamt-Uebersicht:**
- Win/Loss/Draw Verteilung
- Gesamt-Win-Rate in Prozent

**Map-Statistiken:**
- Win-Rate pro Karte
- Anzahl Spiele pro Karte
- Balkendiagramm

**Agenten-Statistiken:**
- Meistgespielte Agenten
- Win-Rate pro Agent

**Zeitverlauf:**
- Win-Rate ueber Zeit
- Match-Frequenz
- Trend-Linien

### Datenquelle

Alle Statistiken werden aus den gespeicherten Scrim-Daten berechnet:

```
GET /api/scrims           → Rohdaten
GET /api/scrims/stats/summary  → Vorab-berechnete Zusammenfassung
```

## VOD-Integration

Scrims mit `vodUrl` haben einen direkten Link zum [VOD-Review](/dashboard/vod-review) System.
