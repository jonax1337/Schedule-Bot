# Architektur

## Systemuebersicht

Schedule-Bot folgt einer mehrschichtigen Architektur mit klarer Trennung von Verantwortlichkeiten.

```
┌───────────────────────────────────────────────────────────┐
│                    Presentation Layer                      │
│  ┌─────────────────┐  ┌──────────────────────────────┐    │
│  │   Discord Bot    │  │     Next.js Dashboard        │    │
│  │  (discord.js)    │  │    (React 19 + Radix UI)     │    │
│  └────────┬────────┘  └──────────────┬───────────────┘    │
│           │                          │                     │
├───────────▼──────────────────────────▼─────────────────────┤
│                     API Layer (Express.js)                  │
│  Routes │ Controllers │ Middleware │ Validation │ Auth      │
├────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                     │
│  Services │ Analyzer │ Scheduler │ Settings Manager         │
├────────────────────────────────────────────────────────────┤
│                    Data Access Layer                        │
│  Repositories │ Prisma ORM │ Database Initializer           │
├────────────────────────────────────────────────────────────┤
│                    PostgreSQL Database                      │
└────────────────────────────────────────────────────────────┘
```

## Startup-Sequenz

Der Startprozess in `src/index.ts` folgt einer strikten Reihenfolge:

```
1. connectDatabase()              → PostgreSQL-Verbindung herstellen
2. initializeDatabaseIfEmpty()    → Tabellen und Default-Settings anlegen
3. reloadConfig()                 → Settings aus DB laden
4. addMissingDays()               → Naechste 14 Tage sicherstellen
5. applyRecurringToEmptySchedules → Wiederkehrende Verfuegbarkeiten anwenden
6. startApiServer()               → Express auf :3001 starten
7. startBot()                     → Discord-Client verbinden
8. startScheduler()               → Cron-Jobs starten (nach Bot-Ready)
```

Beim Herunterfahren (SIGINT/SIGTERM) wird in umgekehrter Reihenfolge aufgeraeumt.

## Verzeichnis-Struktur (Backend)

```
src/
├── index.ts                          # Entry Point & Startup
├── api/
│   ├── server.ts                     # Express-App mit Middleware
│   ├── controllers/
│   │   └── auth.controller.ts        # Login-Logik (Admin + User + OAuth)
│   └── routes/
│       ├── index.ts                  # Route-Aggregator
│       ├── auth.routes.ts            # /api/auth/*
│       ├── schedule.routes.ts        # /api/schedule/*
│       ├── actions.routes.ts         # /api/actions/*
│       ├── user-mapping.routes.ts    # /api/user-mappings/*
│       ├── settings.routes.ts        # /api/settings
│       ├── scrim.routes.ts           # /api/scrims/*
│       ├── absence.routes.ts         # /api/absences/*
│       ├── recurring-availability.routes.ts
│       ├── strategy.routes.ts        # /api/strategies/*
│       ├── discord.routes.ts         # /api/discord/*
│       ├── admin.routes.ts           # /api/admin/*
│       └── vod-comment.routes.ts     # /api/vod-comments/*
├── bot/
│   ├── client.ts                     # Discord-Client Singleton
│   ├── commands/
│   │   ├── definitions.ts            # Slash Command Schemas
│   │   ├── index.ts                  # Command Router
│   │   ├── schedule.commands.ts      # /schedule, /post-schedule, /schedule-week
│   │   ├── availability.commands.ts  # /set, /my-schedule, Timezone-Commands
│   │   ├── user-management.commands.ts  # /register, /unregister
│   │   ├── admin.commands.ts         # /notify
│   │   ├── poll.commands.ts          # /poll
│   │   ├── scrim.commands.ts         # /add-scrim, /view-scrims, /scrim-stats
│   │   └── recurring.commands.ts     # /set-recurring, /my-recurring, /clear-recurring
│   ├── events/
│   │   ├── ready.event.ts            # Bot-Ready: Commands registrieren, Polls wiederherstellen
│   │   └── interaction.event.ts      # Interaction Dispatcher
│   ├── interactions/
│   │   ├── interactive.ts            # Buttons, Modals, Select Menus
│   │   ├── polls.ts                  # Quick Polls
│   │   ├── trainingStartPoll.ts      # Training-Start-Polls
│   │   ├── reminder.ts              # Erinnerungs-System
│   │   └── pollBase.ts              # Gemeinsame Poll-Logik
│   ├── utils/
│   │   ├── schedule-poster.ts        # Schedule posten & Status-Benachrichtigungen
│   │   └── command-helpers.ts        # Hilfsfunktionen fuer Commands
│   └── embeds/
│       └── embed.ts                  # Embed-Builder & Farbschema
├── jobs/
│   └── scheduler.ts                  # node-cron Management
├── repositories/
│   ├── database.repository.ts        # Prisma-Client Singleton
│   ├── database-initializer.ts       # DB-Setup & Default-Daten
│   ├── schedule.repository.ts        # Schedule-Queries
│   ├── user-mapping.repository.ts    # User-Mapping-Queries
│   ├── absence.repository.ts         # Abwesenheits-Queries
│   ├── recurring-availability.repository.ts
│   ├── scrim.repository.ts           # Scrim-Queries
│   ├── vod-comment.repository.ts     # VOD-Kommentar-Queries
│   └── strategy.repository.ts        # Strategie-Queries
├── services/
│   ├── absence.service.ts            # Abwesenheits-Logik & Validierung
│   ├── recurring-availability.service.ts
│   ├── strategy.service.ts           # Berechtigungspruefung
│   └── vod-comment.service.ts
└── shared/
    ├── config/
    │   └── config.ts                 # Globale Konfiguration
    ├── middleware/
    │   ├── auth.ts                   # JWT-Verifikation & Rollen
    │   ├── validation.ts             # Joi-Schemata
    │   ├── rateLimiter.ts            # Rate Limiting
    │   └── passwordManager.ts        # bcrypt-Verwaltung
    ├── types/
    │   └── types.ts                  # TypeScript-Interfaces
    └── utils/
        ├── analyzer.ts               # Schedule-Analyse (Status-Ermittlung)
        ├── scheduleDetails.ts        # Kombinierte Abfrage + Analyse
        ├── dateFormatter.ts          # DD.MM.YYYY Hilfsfunktionen
        ├── timezoneConverter.ts      # Zeitzonen-Konvertierung
        ├── settingsManager.ts        # Settings laden/speichern/cachen
        └── logger.ts                 # In-Memory Logging
```

## Design Patterns

### Repository Pattern
Alle Datenbank-Zugriffe laufen ueber dedizierte Repository-Dateien. Kein direkter Prisma-Zugriff in Routes oder Commands.

```typescript
// Beispiel: schedule.repository.ts
export async function getScheduleForDate(date: string) {
  return prisma.schedule.findUnique({
    where: { date },
    include: { players: true }
  });
}
```

### Settings Management
Settings werden in der Datenbank als Key-Value-Paare gespeichert (Dot-Notation). Zwei Zugriffsarten:

1. **`config`** (config.ts) - Fuer Scheduler und Bot-Core
2. **`loadSettings()`** (settingsManager.ts) - Vollstaendige Settings inkl. Branding

Bei Aenderung: `POST /api/settings` → DB-Speicherung → `reloadConfig()` → `restartScheduler()`

### User Mappings vs Schedule Players

- **`user_mappings`** = Master-Roster (Stamm-Daten der Teammitglieder)
- **`schedule_players`** = Tages-Snapshots (kopiert beim Erstellen eines Schedule-Eintrags)
- **`syncUserMappingsToSchedules()`** synchronisiert Roster-Aenderungen in zukuenftige Eintraege

### Middleware-Stack

```
Request → Helmet → CORS → Rate Limiter → [Auth] → [Validation] → Handler → Response
```

- **Helmet** - Security Headers (CSP, HSTS, etc.)
- **CORS** - Origin-Whitelist
- **Rate Limiter** - Global + endpunktspezifisch
- **Auth** - Optional oder erforderlich je nach Route
- **Validation** - Joi-basierte Eingabepruefung

## ES Module Besonderheiten

Das Projekt verwendet `"type": "module"`:

- Alle Imports benoetigen die `.js`-Endung (auch fuer `.ts`-Dateien)
- Kein `__dirname` verfuegbar - stattdessen `fileURLToPath(import.meta.url)`
- Prisma Client Import: `import { PrismaClient } from '../generated/prisma/client.js'`

## Zirkulaere Abhaengigkeiten

Der Bot-Client wird in mehreren Modulen verwendet (Scheduler, API-Aktionen, Interaktionen). Bei Bedarf werden dynamische Imports genutzt:

```typescript
const { postScheduleToChannel } = await import('../bot/utils/schedule-poster.js');
```

`schedule-poster.ts` re-exportiert vom `client.ts`, um den Abhaengigkeits-Graphen zu vereinfachen.
