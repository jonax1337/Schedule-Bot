# Database Schema

Synqed persists everything in **PostgreSQL** through **Prisma 7**. The full schema
lives in `prisma/schema.prisma`.

## Entity map

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
│  UserMapping    │     │ RecurringAvailability│
│─────────────────│     │──────────────────────│
│ discordId (PK)  │     │ id                   │
│ discordUsername │     │ userId               │
│ displayName     │     │ dayOfWeek (0–6)      │
│ role (UserRole) │     │ availability         │
│ timezone        │     │ active               │
│ isAdmin         │     │ unique(userId, day)  │
│ sortOrder       │     └──────────────────────┘
└─────────────────┘

┌─────────────────┐     ┌──────────────────────┐
│     Scrim       │────▶│    VodComment         │
│─────────────────│     │──────────────────────│
│ id              │     │ id                   │
│ date            │     │ scrimId (FK)         │
│ opponent        │     │ userName             │
│ result (enum)   │     │ timestamp            │
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

### Stratbook tables

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

## Tables

### Schedule

| Column | Type | Description |
| --- | --- | --- |
| `id` | int (auto) | Primary key |
| `date` | string (unique) | `DD.MM.YYYY` |
| `reason` | string? | Reason (Training, Premier, Off-Day, …) |
| `focus` | string? | Detail text |
| `createdAt` | datetime | Created |
| `updatedAt` | datetime | Updated |

### SchedulePlayer

| Column | Type | Description |
| --- | --- | --- |
| `id` | int (auto) | Primary key |
| `scheduleId` | int (FK) | → `Schedule` |
| `userId` | string | Discord ID |
| `displayName` | string | Display name at snapshot time |
| `role` | UserRole | MAIN / SUB / COACH |
| `availability` | string | Time window, `"x"`, or empty |
| `sortOrder` | int | Display order |

**Indexes:** `scheduleId`, `userId`.

### UserMapping

| Column | Type | Description |
| --- | --- | --- |
| `discordId` | string (PK) | Discord ID (unique) |
| `discordUsername` | string | Discord username |
| `displayName` | string | Display name |
| `role` | UserRole | MAIN / SUB / COACH |
| `timezone` | string? | IANA timezone (optional) |
| `isAdmin` | boolean | Admin flag |
| `sortOrder` | int | Display order |

**Indexes:** `discordId`, `[role, sortOrder]`.

### Scrim

| Column | Type | Description |
| --- | --- | --- |
| `id` | string | UUID primary key |
| `date` | string | `DD.MM.YYYY` |
| `opponent` | string | Opponent name |
| `result` | ScrimResult | WIN / LOSS / DRAW |
| `scoreUs` | int | Our rounds |
| `scoreThem` | int | Opponent rounds |
| `map` | string | Map name |
| `matchType` | string? | Scrim, Tournament, Premier, Custom, … |
| `ourAgents` | string? | Comma-separated agents |
| `theirAgents` | string? | Comma-separated agents |
| `vodUrl` | string? | VOD URL |
| `matchLink` | string? | Match link |
| `notes` | string? | Notes |

### VodComment

| Column | Type | Description |
| --- | --- | --- |
| `id` | int (auto) | Primary key |
| `scrimId` | string (FK) | → `Scrim` |
| `userName` | string | Comment author |
| `timestamp` | int | Seconds into the VOD |
| `content` | string | Comment body |

**Index:** `[scrimId, timestamp]`. **Cascade:** deleting a Scrim deletes its comments.

### Absence

| Column | Type | Description |
| --- | --- | --- |
| `id` | int (auto) | Primary key |
| `userId` | string | Discord ID |
| `startDate` | string | First absent day (`DD.MM.YYYY`) |
| `endDate` | string | Last absent day (inclusive) |
| `reason` | string? | Optional reason |

**Indexes:** `userId`, `[startDate, endDate]`.

### RecurringAvailability

| Column | Type | Description |
| --- | --- | --- |
| `id` | int (auto) | Primary key |
| `userId` | string | Discord ID |
| `dayOfWeek` | int | 0 (Sun) – 6 (Sat) |
| `availability` | string | Time window or `"x"` |
| `active` | boolean | Toggle |

**Unique:** `[userId, dayOfWeek]`.

### Setting

| Column | Type | Description |
| --- | --- | --- |
| `id` | int (auto) | Primary key |
| `key` | string (unique) | Dot-notation key |
| `value` | string | Always stored as string |

### Notable setting keys

| Key | Stored as | Description |
| --- | --- | --- |
| `discord.channelId` | snowflake | Schedule channel ID |
| `discord.pingRoleId` | snowflake or empty | Ping role for daily/weekly posts |
| `discord.pinnedWeekMessageId` | snowflake or empty | Bot-managed pin for the weekly overview |
| `discord.pinnedWeekStartDate` | `DD.MM.YYYY` or empty | Monday of the pinned week |
| `scheduling.dailyPostTime` | `HH:MM` | Daily schedule post |
| `scheduling.timezone` | IANA timezone | Cron timezone |
| `scheduling.weeklyPingEnabled` | bool | Weekly planning DM master toggle |
| `scheduling.weeklyPingTime` | `HH:MM` | Weekly planning DM time |
| `scheduling.weeklyPingDays` | comma-separated ints | Cron-style weekdays (`0=Sun..6=Sat`) |

See [Configuration](/guide/configuration) for the full settings catalogue.

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

## Gotchas

::: warning Date format
Dates are stored as TEXT in `DD.MM.YYYY` format, **not** as `DATE`. Comparisons and
sorting work via string ops, so the format is non-negotiable. Use the helpers in
`src/shared/utils/dateFormatter.ts` to produce and parse them.
:::

::: info Prisma client location
The generated client lives in `src/generated/prisma`. After any schema change run
`npm run db:generate`.
:::
