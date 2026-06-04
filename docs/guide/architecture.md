# Architecture

## System overview

Synqed follows a layered architecture with clear separation between presentation,
API, business logic and persistence.

```
┌───────────────────────────────────────────────────────────┐
│                    Presentation Layer                      │
│  ┌─────────────────┐  ┌──────────────────────────────┐    │
│  │   Discord Bot    │  │     Next.js Dashboard        │    │
│  │  (discord.js)    │  │   (React 19 + Radix UI)      │    │
│  └────────┬────────┘  └──────────────┬───────────────┘    │
│           │                          │                     │
├───────────▼──────────────────────────▼─────────────────────┤
│                  API Layer (Express.js)                    │
│  Routes │ Controllers │ Middleware │ Validation │ Auth     │
├────────────────────────────────────────────────────────────┤
│                  Business Logic Layer                      │
│  Services │ Analyzer │ Scheduler │ Settings Manager        │
├────────────────────────────────────────────────────────────┤
│                  Data Access Layer                         │
│  Repositories │ Prisma ORM │ Database Initializer          │
├────────────────────────────────────────────────────────────┤
│                  PostgreSQL Database                       │
└────────────────────────────────────────────────────────────┘
```

## Startup sequence

`src/index.ts` runs a strict boot order:

```
1. connectDatabase()                  → PostgreSQL connection
2. initializeDatabaseIfEmpty()        → tables + default settings
3. reloadConfig()                     → load settings into runtime config
4. addMissingDays()                   → ensure the next 14 days exist
5. applyRecurringToEmptySchedules()   → apply weekly patterns to empty slots
6. startApiServer()                   → Express on :3001
7. startBot()                         → connect the Discord client
8. (on clientReady)                   → startScheduler() + refreshWeeklyOverview()
```

`SIGINT` / `SIGTERM` tears everything down in reverse order.

## Backend directory layout

```
src/
├── index.ts                          # Entry point & startup
├── api/
│   ├── server.ts                     # Express app + middleware stack
│   ├── controllers/
│   │   └── auth.controller.ts        # Admin login, user login, OAuth
│   └── routes/
│       ├── index.ts                  # Route aggregator
│       ├── auth.routes.ts
│       ├── schedule.routes.ts
│       ├── actions.routes.ts
│       ├── user-mapping.routes.ts
│       ├── settings.routes.ts
│       ├── scrim.routes.ts
│       ├── absence.routes.ts
│       ├── recurring-availability.routes.ts
│       ├── strategy.routes.ts
│       ├── discord.routes.ts
│       ├── admin.routes.ts
│       └── vod-comment.routes.ts
├── bot/
│   ├── client.ts                     # Discord client singleton
│   ├── commands/
│   │   ├── definitions.ts            # Slash command schemas
│   │   ├── index.ts                  # Command router
│   │   ├── schedule.commands.ts
│   │   ├── availability.commands.ts
│   │   ├── user-management.commands.ts
│   │   ├── admin.commands.ts
│   │   ├── poll.commands.ts
│   │   ├── scrim.commands.ts
│   │   └── recurring.commands.ts
│   ├── events/
│   │   ├── ready.event.ts
│   │   └── interaction.event.ts
│   ├── interactions/
│   │   ├── interactive.ts            # Buttons, modals, select menus
│   │   ├── polls.ts                  # Quick polls
│   │   ├── trainingStartPoll.ts      # Training-start polls
│   │   ├── reminder.ts               # DM reminders (daily + weekly)
│   │   └── pollBase.ts
│   ├── utils/
│   │   ├── schedule-poster.ts        # Daily post + status-change notifier
│   │   ├── weekly-overview.ts        # Pinned weekly message + buttons
│   │   ├── week-utils.ts             # Week math helpers
│   │   └── command-helpers.ts
│   └── embeds/
│       └── embed.ts                  # Embed builders + timestamp helpers
├── jobs/
│   └── scheduler.ts                  # node-cron management
├── repositories/
│   ├── database.repository.ts        # Prisma client singleton
│   ├── database-initializer.ts       # Schema bootstrap + defaults
│   ├── schedule.repository.ts
│   ├── user-mapping.repository.ts
│   ├── absence.repository.ts
│   ├── recurring-availability.repository.ts
│   ├── scrim.repository.ts
│   ├── vod-comment.repository.ts
│   └── strategy.repository.ts
└── shared/
    ├── config/config.ts              # Runtime config snapshot
    ├── middleware/                   # auth, validation, rate-limit, etc.
    ├── types/types.ts                # TypeScript interfaces
    └── utils/
        ├── analyzer.ts               # Schedule status analyser
        ├── scheduleDetails.ts        # Analyze + fetch helper
        ├── dateFormatter.ts          # DD.MM.YYYY helpers
        ├── timezoneConverter.ts      # IANA timezone conversion
        ├── settingsManager.ts        # Settings cache + persistence
        └── logger.ts                 # In-memory log buffer
```

## Design patterns

### Repository pattern

All Prisma queries live in dedicated repository files. Routes and commands never reach
into Prisma directly.

```typescript
// schedule.repository.ts
export async function getScheduleForDate(date: string) {
  return prisma.schedule.findUnique({
    where: { date },
    include: { players: true },
  });
}
```

### Settings management

Settings are flat dot-notation keys in the `settings` table. Two access paths:

1. **`config`** (`src/shared/config/config.ts`) — minimum runtime state used by the
   scheduler and bot core
2. **`loadSettings()`** / **`getSetting()`** (`src/shared/utils/settingsManager.ts`) —
   full settings shape including branding and stratbook permissions

On `POST /api/settings` the API persists the values, calls `reloadConfig()`, then
`restartScheduler()`. Hot reload — no process restart needed.

### UserMapping vs SchedulePlayer

- **`user_mappings`** — master roster (team members)
- **`schedule_players`** — per-day snapshots created when a schedule row is seeded
- **`syncUserMappingsToSchedules()`** — replays roster changes into every **future**
  snapshot row

### Middleware stack

```
Request
  → Helmet (security headers: CSP, HSTS …)
  → CORS (origin allowlist)
  → Rate limiter (global + per endpoint)
  → [Auth] (verifyToken / requireAdmin / ownership checks)
  → [Validation] (Joi schemas)
  → Handler
  → Response
```

## ES module specifics

The project uses `"type": "module"`:

- Every relative import needs a `.js` extension — even for `.ts` files
- `__dirname` is unavailable — derive it via
  `fileURLToPath(import.meta.url)`
- Prisma client import: `import { PrismaClient } from '../generated/prisma/client.js'`

## Circular dependencies

The Discord client is consumed by the scheduler, API actions and interaction handlers.
Where the static import would create a cycle, we use dynamic imports:

```typescript
const { postScheduleToChannel } = await import('../bot/utils/schedule-poster.js');
```

`schedule-poster.ts` also re-exports from `client.ts` so other modules can grab the
client through a single hop.
