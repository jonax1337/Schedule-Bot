# Scheduling-System

## Konzept

Das Scheduling-System ist das Herzstck von Schedule-Bot. Es verwaltet taegliche Trainingsplaene und die Verfuegbarkeit aller Spieler.

## Tages-Schedule

Jeder Tag hat einen eigenen Schedule-Eintrag mit:

- **Datum** im Format `DD.MM.YYYY`
- **Grund** (Reason) - z.B. Training, Scrims, Premier, Off-Day, VOD-Review
- **Fokus** (Focus) - Optionaler Detail-Text
- **Spieler-Liste** - Snapshot aller registrierten Spieler mit Verfuegbarkeit

### Schedule-Status

Der Analyzer (`src/shared/utils/analyzer.ts`) ermittelt fuer jeden Tag einen Status:

| Status | Bedingung | Farbe |
|--------|-----------|-------|
| `OFF_DAY` | Grund enthaelt "off" | Lila |
| `FULL_ROSTER` | 5+ Main-Spieler verfuegbar | Gruen |
| `WITH_SUBS` | 4 Mains + ausreichend Subs fuer 5 | Orange |
| `NOT_ENOUGH` | Weniger als 5 insgesamt verfuegbar | Rot |

**Prioritaet:** `OFF_DAY` > `FULL_ROSTER` > `WITH_SUBS` > `NOT_ENOUGH`

### Automatische Erstellung

- Beim Start werden die naechsten **14 Tage** automatisch angelegt
- `addMissingDays()` fuellt fehlende Eintraege auf
- Wiederkehrende Verfuegbarkeiten werden automatisch auf leere Slots angewendet

## Verfuegbarkeits-Formate

```
""              → Keine Antwort (❓)
"x" oder "X"   → Nicht verfuegbar (❌)
"HH:MM-HH:MM"  → Zeitfenster (✅), z.B. "14:00-20:00"
```

## Automatische Posts

Der Scheduler postet taeglich den aktuellen Trainingsplan in den konfigurierten Discord-Channel.

```
┌─────────────────────────────────────┐
│     Taeglich um 18:00 (config)      │
│                                     │
│  1. Schedule fuer heute laden       │
│  2. Status analysieren              │
│  3. Embed erstellen & posten        │
│  4. Ggf. Training-Poll erstellen    │
└─────────────────────────────────────┘
```

### Erinnerungen

Vor dem taeglichen Post werden Erinnerungen an Spieler ohne Verfuegbarkeits-Angabe gesendet:

- **1. Erinnerung:** X Stunden vor dem Post (konfigurierbar)
- **2. Erinnerung:** Y Stunden vor dem Post (optional)
- Abwesende Spieler und Coaches werden uebersprungen
- DM-Nachrichten mit Aktions-Buttons

### Status-Aenderungs-Benachrichtigungen

`checkAndNotifyStatusChange()` wird nach jeder Verfuegbarkeits-Aenderung aufgerufen:

1. Aktuellen Status berechnen
2. Mit letztem bekannten Status vergleichen
3. Bei Aenderung: Neues Embed posten
4. Nur fuer heute und nach der taeglichen Post-Zeit aktiv

## Roster-Synchronisation

```
User Mappings (Master)          Schedule Players (Snapshot)
┌──────────────────┐            ┌──────────────────┐
│ Player A (MAIN)  │────sync───▶│ Player A (MAIN)  │
│ Player B (MAIN)  │────sync───▶│ Player B (MAIN)  │
│ Player C (SUB)   │────sync───▶│ Player C (SUB)   │
│ [neuer Spieler]  │────add────▶│ [neuer Spieler]  │
└──────────────────┘            └──────────────────┘
```

Wenn das Roster geaendert wird (Register/Unregister), synchronisiert `syncUserMappingsToSchedules()` alle **zukuenftigen** Schedule-Eintraege.

## Ablauf: Verfuegbarkeit setzen

### Via Discord (`/set`)

1. Spieler fuehrt `/set` aus
2. Interaktives Menu mit Datumsauswahl
3. Zeitfenster eingeben oder "nicht verfuegbar" waehlen
4. Zeitzonen-Konvertierung (User → Bot-Timezone)
5. Datenbank-Update
6. `checkAndNotifyStatusChange()` pruefen

### Via Dashboard

1. User-Portal → Schedule-Tab
2. Datum anklicken
3. Verfuegbarkeit eingeben
4. API-Call: `POST /api/schedule/update-availability`
5. Automatische Benachrichtigung bei Status-Aenderung
