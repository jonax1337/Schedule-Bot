# Datenbank-Schema

## Uebersicht

Schedule-Bot verwendet **PostgreSQL** mit **Prisma 7** als ORM. Das Schema ist in `prisma/schema.prisma` definiert.

## ER-Diagramm

```
┌─────────────────┐     ┌──────────────────────┐
│    Schedule      │────▶│   SchedulePlayer     │
│─────────────────│     │──────────────────────│
│ id              │     │ id                   │
│ date (unique)   │     │ scheduleId (FK)      │
│ reason          │     │ userId               │
│ focus           │     │ displayName          │
│ createdAt       │     │ role (UserRole)      │
│ updatedAt       │     │ availability         │
└─────────────────┘     │ sortOrder            │
                        └──────────────────────┘

┌─────────────────┐     ┌──────────────────────┐
│  UserMapping     │     │ RecurringAvailability │
│─────────────────│     │──────────────────────│
│ discordId (PK)  │     │ id                   │
│ discordUsername  │     │ userId               │
│ displayName     │     │ dayOfWeek (0-6)      │
│ role (UserRole) │     │ availability         │
│ timezone        │     │ active               │
│ isAdmin         │     │ unique(userId,day)   │
│ sortOrder       │     └──────────────────────┘
└─────────────────┘

┌─────────────────┐     ┌──────────────────────┐
│     Scrim       │────▶│    VodComment         │
│─────────────────│     │──────────────────────│
│ id              │     │ id                   │
│ date            │     │ scrimId (FK)         │
│ opponent        │     │ userName             │
│ result (Enum)   │     │ timestamp            │
│ scoreUs/Them    │     │ content              │
│ map             │     └──────────────────────┘
│ matchType       │
│ ourAgents       │     ┌──────────────────────┐
│ theirAgents     │     │     Absence          │
│ vodUrl          │     │──────────────────────│
│ matchLink       │     │ id                   │
│ notes           │     │ userId               │
└─────────────────┘     │ startDate            │
                        │ endDate              │
┌─────────────────┐     │ reason               │
│    Setting      │     └──────────────────────┘
│─────────────────│
│ id              │
│ key (unique)    │
│ value           │
└─────────────────┘
```

### Strategie-Tabellen

```
┌──────────────────┐     ┌──────────────────────┐
│ StrategyFolder   │────▶│    Strategy           │
│──────────────────│     │──────────────────────│
│ id               │     │ id                   │
│ name             │     │ title                │
│ parentId (self)  │     │ map                  │
│ color            │     │ side                 │
│ sortOrder        │     │ tags                 │
└──────────────────┘     │ agents               │
                         │ content (JSON)       │
                         │ folderId (FK)        │
                         │ authorId             │
                         │ authorName           │
                         └──────┬──────┬────────┘
                                │      │
                    ┌───────────▼┐  ┌──▼───────────┐
                    │StrategyImage│  │StrategyFile  │
                    │────────────│  │──────────────│
                    │ id         │  │ id           │
                    │ strategyId │  │ strategyId   │
                    │ filename   │  │ filename     │
                    │ originalNm │  │ originalName │
                    │ mimeType   │  │ mimeType     │
                    │ size       │  │ size         │
                    └────────────┘  └──────────────┘
```

## Tabellen im Detail

### Schedule

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | Int (Auto) | Primaerschluessel |
| `date` | String (Unique) | Datum im Format DD.MM.YYYY |
| `reason` | String? | Grund (Training, Premier, Off-Day, etc.) |
| `focus` | String? | Detail-Text |
| `createdAt` | DateTime | Erstellt |
| `updatedAt` | DateTime | Aktualisiert |

### SchedulePlayer

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | Int (Auto) | Primaerschluessel |
| `scheduleId` | Int (FK) | Referenz auf Schedule |
| `userId` | String | Discord-ID des Spielers |
| `displayName` | String | Anzeigename |
| `role` | UserRole | MAIN, SUB oder COACH |
| `availability` | String | Zeitfenster, "x" oder "" |
| `sortOrder` | Int | Sortierreihenfolge |

**Indizes:** `scheduleId`, `userId`

### UserMapping

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `discordId` | String (PK) | Discord-ID (eindeutig) |
| `discordUsername` | String | Discord Benutzername |
| `displayName` | String | Anzeigename im System |
| `role` | UserRole | MAIN, SUB oder COACH |
| `timezone` | String? | IANA-Zeitzone (optional) |
| `isAdmin` | Boolean | Admin-Berechtigung |
| `sortOrder` | Int | Sortierreihenfolge |

**Indizes:** `discordId`, `[role, sortOrder]`

### Scrim

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | String | UUID Primaerschluessel |
| `date` | String | Datum (DD.MM.YYYY) |
| `opponent` | String | Gegnername |
| `result` | ScrimResult | WIN, LOSS oder DRAW |
| `scoreUs` | Int | Eigene Runden |
| `scoreThem` | Int | Gegner-Runden |
| `map` | String | Kartenname |
| `matchType` | String? | Scrim, Tournament, Premier, Custom |
| `ourAgents` | String? | Eigene Agenten (kommagetrennt) |
| `theirAgents` | String? | Gegner-Agenten (kommagetrennt) |
| `vodUrl` | String? | VOD-Link |
| `matchLink` | String? | Match-Link |
| `notes` | String? | Notizen |

### VodComment

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | Int (Auto) | Primaerschluessel |
| `scrimId` | String (FK) | Referenz auf Scrim |
| `userName` | String | Kommentar-Autor |
| `timestamp` | Int | Zeitstempel in Sekunden |
| `content` | String | Kommentar-Text |

**Indizes:** `[scrimId, timestamp]`
**Cascade:** Loeschen eines Scrims loescht alle Kommentare.

### Absence

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | Int (Auto) | Primaerschluessel |
| `userId` | String | Discord-ID |
| `startDate` | String | Beginn (DD.MM.YYYY) |
| `endDate` | String | Ende (DD.MM.YYYY), inklusive |
| `reason` | String? | Optionaler Grund |

**Indizes:** `userId`, `[startDate, endDate]`

### RecurringAvailability

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | Int (Auto) | Primaerschluessel |
| `userId` | String | Discord-ID |
| `dayOfWeek` | Int | 0 (So) bis 6 (Sa) |
| `availability` | String | Zeitfenster oder "x" |
| `active` | Boolean | Aktiviert/Deaktiviert |

**Unique:** `[userId, dayOfWeek]`

### Setting

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | Int (Auto) | Primaerschluessel |
| `key` | String (Unique) | Dot-Notation Key |
| `value` | String | Wert als String |

## Enums

### UserRole
```prisma
enum UserRole {
  MAIN
  SUB
  COACH
}
```

### ScrimResult
```prisma
enum ScrimResult {
  WIN
  LOSS
  DRAW
}
```

## Wichtige Hinweise

::: warning Datumsformat
Daten werden als TEXT (String) im Format `DD.MM.YYYY` gespeichert, nicht als DATE-Typ. Vergleiche und Sortierungen erfolgen ueber String-Operationen.
:::

::: info Prisma Client Output
Der generierte Client liegt in `src/generated/prisma`. Nach Schema-Aenderungen muss `npm run db:generate` ausgefuehrt werden.
:::
