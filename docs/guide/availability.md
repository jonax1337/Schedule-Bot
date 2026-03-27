# Verfuegbarkeiten

## Einmalige Verfuegbarkeit

Spieler geben ihre Verfuegbarkeit pro Tag an. Es gibt drei moegliche Zustaende:

| Wert | Bedeutung | Anzeige |
|------|-----------|---------|
| `""` (leer) | Keine Antwort | ❓ |
| `"x"` oder `"X"` | Nicht verfuegbar | ❌ |
| `"HH:MM-HH:MM"` | Zeitfenster | ✅ + Zeitraum |

### Setzen via Discord

```
/set
```

Oeffnet ein interaktives Menu mit:
1. **Datumsauswahl** (naechste 14 Tage)
2. **Zeitfenster-Eingabe** oder Button fuer "nicht verfuegbar"
3. **Bestaetigung** mit Zeitzonen-Info

### Setzen via Dashboard

Im User-Portal unter dem Tab "Verfuegbarkeit" koennen Spieler ihre Zeiten fuer die kommenden Tage eintragen.

## Wiederkehrende Verfuegbarkeit

Spieler koennen woechentliche Muster definieren, die automatisch auf neue Schedule-Eintraege angewendet werden.

### Datenmodell

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `userId` | String | Discord-ID des Spielers |
| `dayOfWeek` | Int (0-6) | Wochentag (0=Sonntag, 6=Samstag) |
| `availability` | String | Zeitfenster oder "x" |
| `active` | Boolean | Aktiv/Inaktiv |

### Setzen via Discord

```
/set-recurring days:mon,wed,fri time:18:00-22:00
```

Optionen:
- `days` - Kommagetrennte Wochentage (mon, tue, wed, thu, fri, sat, sun)
- `time` - Zeitfenster im Format `HH:MM-HH:MM` oder `x` fuer nicht verfuegbar

### Anzeigen

```
/my-recurring
```

### Loeschen

```
/clear-recurring              # Alle loeschen
/clear-recurring day:monday   # Einzelnen Tag loeschen
```

### Automatische Anwendung

Beim Start und bei der Erstellung neuer Schedule-Eintraege:

```
1. Leere Schedule-Slots identifizieren
2. Wochentag des Datums bestimmen
3. Aktive Recurring-Eintraege fuer diesen Tag laden
4. Auf leere Slots anwenden
5. Bereits gesetzte Verfuegbarkeiten werden NICHT ueberschrieben
```

## Abwesenheiten

Spieler koennen Abwesenheitszeitraeume eintragen (Urlaub, etc.).

### Datenmodell

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `userId` | String | Discord-ID |
| `startDate` | String | Beginn (DD.MM.YYYY) |
| `endDate` | String | Ende (DD.MM.YYYY) |
| `reason` | String | Optionaler Grund |

### Auswirkungen

- Abwesende Spieler erhalten **keine Erinnerungen**
- Im Schedule erscheinen sie mit ✈️ (absent)
- Im Analyzer werden sie als nicht verfuegbar gewertet
- Im Dashboard werden sie separat markiert

### Verwalten

**Via Dashboard** (empfohlen):
- User-Portal → Tab "Abwesenheiten"
- Zeitraum und optionalen Grund eingeben

**Via API:**

```bash
# Erstellen
POST /api/absences
{
  "startDate": "01.04.2026",
  "endDate": "07.04.2026",
  "reason": "Urlaub"
}

# Auflisten
GET /api/absences

# Loeschen
DELETE /api/absences/:id
```

## Zeitzonen-Interaktion

Alle Zeitangaben werden automatisch konvertiert:

1. **Eingabe:** Spieler gibt Zeit in seiner Zeitzone an
2. **Speicherung:** Zeit wird in Bot-Zeitzone konvertiert
3. **Anzeige Discord:** Unix-Timestamps (`<t:TIMESTAMP:t>`) fuer automatische lokale Konvertierung
4. **Anzeige Dashboard:** Konvertierung via `TimezoneProvider` Context

Siehe [Zeitzonen](/guide/timezones) fuer Details.
