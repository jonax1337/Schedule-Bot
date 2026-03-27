# Zeitzonen

## Konzept

Schedule-Bot unterstuetzt individuelle Zeitzonen pro Spieler. Alle Zeiten werden intern in der **Bot-Zeitzone** (Standard: `Europe/Berlin`) gespeichert und bei der Anzeige konvertiert.

## Architektur

```
Spieler-Eingabe (User-TZ)
        │
        ▼
  Konvertierung → Bot-Zeitzone
        │
        ▼
   Datenbank (Bot-TZ)
        │
        ├──▶ Discord: <t:TIMESTAMP:t> (auto-lokal)
        └──▶ Dashboard: TimezoneProvider (User-TZ)
```

## Spieler-Zeitzone setzen

### Via Discord

```
/set-timezone timezone:America/New_York
```

Autocomplete-Vorschlaege fuer gaengige Zeitzonen werden angeboten.

### Entfernen

```
/remove-timezone
```

Danach wird die Bot-Zeitzone verwendet.

### Speicherung

Die Zeitzone wird in `user_mappings.user_timezone` als IANA-String gespeichert:
- `Europe/Berlin`
- `America/New_York`
- `Asia/Tokyo`
- etc.

## Konvertierungslogik

### Backend (`timezoneConverter.ts`)

```typescript
// Validierung
isValidTimezone('Europe/Berlin')     // true
isValidTimezone('Invalid/Zone')      // false

// Konvertierung
convertTimeInTimezone('14:00', 'America/New_York', 'Europe/Berlin')
// → '20:00' (im Winter, +6h)

// Alle Zeitzonen
getSupportedTimezones()              // Array aller IANA-Zeitzonen

// Abkuerzung
getTimezoneAbbreviation('Europe/Berlin')  // 'CET' oder 'CEST'
```

### Frontend (`lib/timezone.ts`)

```typescript
// Einzelne Zeit konvertieren
convertTime('14:00', 'Europe/Berlin', 'America/New_York')

// Zeitbereich konvertieren
convertTimeRange('14:00-20:00', 'Europe/Berlin', 'America/New_York')

// Abkuerzung
getTimezoneAbbr('Europe/Berlin')  // 'CET'
```

## TimezoneProvider (Dashboard)

Das Dashboard verwendet einen React Context fuer globale Zeitzonen-Verwaltung:

```tsx
const { userTimezone, botTimezone, botTimezoneLoaded } = useTimezone();
```

### Funktionsweise

1. **User-Zeitzone:** Aus localStorage oder Browser-Erkennung
2. **Bot-Zeitzone:** Abfrage von `/api/settings` beim Laden
3. **Auto-Refresh:** Bot-Zeitzone wird alle 5 Minuten aktualisiert
4. **Version-Counter:** Inkrementiert bei Aenderungen (fuer Dependency-Tracking)

### Verwendung in Komponenten

```tsx
function ScheduleView() {
  const { userTimezone, botTimezone } = useTimezone();

  // Angezeigte Zeit = konvertiert von Bot-TZ zu User-TZ
  const localTime = convertTimeRange(
    schedule.availability,
    botTimezone,
    userTimezone
  );

  // Gespeicherte Zeit = konvertiert von User-TZ zu Bot-TZ
  const botTime = convertTimeRange(
    userInput,
    userTimezone,
    botTimezone
  );
}
```

## Discord-Timestamps

In Discord werden Unix-Timestamps fuer automatische lokale Zeitanzeige verwendet:

```typescript
// Discord Timestamp Format
`<t:${unixTimestamp}:t>`  // Kurze Zeit (14:00)
`<t:${unixTimestamp}:T>`  // Lange Zeit (14:00:00)
`<t:${unixTimestamp}:d>`  // Kurzes Datum (27.03.2026)
`<t:${unixTimestamp}:D>`  // Langes Datum (27. Maerz 2026)
`<t:${unixTimestamp}:f>`  // Datum + Zeit
`<t:${unixTimestamp}:R>`  // Relativ ("in 3 Stunden")
```

Discord konvertiert diese automatisch in die lokale Zeitzone des Betrachters - keine manuelle Konvertierung noetig.

## Wichtige Hinweise

::: warning Sommerzeit / Winterzeit
Die Konvertierung beruecksichtigt automatisch Sommer- und Winterzeit (DST), da IANA-Zeitzonen verwendet werden. `Europe/Berlin` wechselt automatisch zwischen CET (+1) und CEST (+2).
:::

::: tip Standard-Zeitzone
Wenn ein Spieler keine Zeitzone gesetzt hat, wird die Bot-Zeitzone (`Europe/Berlin`) angenommen. Es wird empfohlen, dass alle Spieler ihre Zeitzone setzen.
:::
