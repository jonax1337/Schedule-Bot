# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Discord bot with web dashboard for managing E-Sports team scheduling and availability. It consists of three main components:
1. **Discord Bot** (discord.js 14.x) - Slash commands, interactive buttons, polls
2. **API Server** (Express 5.x on port 3001) - REST API with Helmet security, CORS, rate limiting
3. **Dashboard** (Next.js 16 + React 19 on port 3000) - Admin panel and user portal

All components run from a single Node.js process that starts the bot, API server, and scheduler together.

### Technology Stack
**Backend:** TypeScript 5.9, discord.js 14.25, Express 5.2, Prisma 7.3 (with @prisma/adapter-pg + pg native driver), node-cron 4.2, bcrypt 6, jsonwebtoken 9, Helmet 8, dotenv 17, Joi 18, @notionhq/client 2.3 (Notion API)
**Frontend:** Next.js 16.1, React 19.2, TailwindCSS 4, Radix UI primitives, Recharts 3.7 (charts), next-themes, sonner (toasts), lucide-react (icons), cmdk (command palette), @dnd-kit (drag and drop)
**Testing:** Vitest 4.0 with V8 coverage provider
**Database:** PostgreSQL via Prisma ORM

## Common Commands

### Development
```bash
# Install backend dependencies
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..

# Build TypeScript (backend only, also runs prisma generate)
npm run build

# Run in development (rebuilds + starts bot + API)
npm run dev

# Run dashboard (separate terminal)
cd dashboard && npm run dev

# Build dashboard for production
cd dashboard && npm run build

# Start production (requires build first)
npm start

# Full deploy (migrate + build)
npm run deploy
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Database Operations
```bash
# Generate Prisma client (required after schema changes)
npx prisma generate
# or shortcut:
npm run db:generate

# Run migrations in development
npx prisma migrate dev
# or shortcut:
npm run db:migrate

# Deploy migrations in production
npx prisma migrate deploy

# Open database GUI
npx prisma studio
# or shortcut:
npm run db:studio

# Push schema changes without migrations (dev only)
npx prisma db push
# or shortcut:
npm run db:push
```

### Deployment
```bash
# Docker deployment (PostgreSQL + Bot + Dashboard)
docker-compose up -d

# Render.com deployment is configured via render.yaml
```

## Architecture

### Process Lifecycle (src/index.ts)
The main process follows this startup sequence:
1. Connect to PostgreSQL via Prisma
2. Initialize database if empty (create default settings, user mappings)
3. Load settings from PostgreSQL `settings` table
4. Seed next 14 days of schedule entries (ensures continuous availability)
5. Start Discord bot (src/bot/client.ts)
6. Wait for bot 'clientReady' event
7. Start scheduler (node-cron jobs for daily posts and reminders)
8. Start Express API server on port 3001

Graceful shutdown is handled via SIGINT/SIGTERM handlers that stop the scheduler and destroy the Discord client.

### Directory Structure
```
src/
├── index.ts                    # Main entry point (startup orchestration)
├── api/
│   ├── server.ts               # Express app (CORS, Helmet, routes)
│   ├── controllers/
│   │   └── auth.controller.ts  # Auth logic (admin, user, Discord OAuth)
│   └── routes/
│       ├── index.ts            # Route aggregator + health/logs/schedule-details
│       ├── absence.routes.ts   # Absence/vacation CRUD
│       ├── recurring-availability.routes.ts # Recurring weekly availability CRUD
│       ├── actions.routes.ts   # Manual action triggers (post, remind, poll, notify)
│       ├── admin.routes.ts     # Admin utilities (hash, JWT generation)
│       ├── auth.routes.ts      # Login, logout, OAuth endpoints
│       ├── discord.routes.ts   # Discord server data (channels, roles, members)
│       ├── schedule.routes.ts  # Schedule CRUD + availability updates
│       ├── scrim.routes.ts     # Scrim/match CRUD + stats
│       ├── settings.routes.ts  # Bot settings management
│       ├── stratbook.routes.ts # Notion-powered strategy viewer
│       └── user-mapping.routes.ts # Player roster management
├── bot/
│   ├── client.ts               # Discord client singleton
│   ├── commands/
│   │   ├── index.ts            # Command router/dispatcher
│   │   ├── definitions.ts      # Command definitions (registered on ready)
│   │   ├── schedule.commands.ts
│   │   ├── availability.commands.ts
│   │   ├── poll.commands.ts
│   │   ├── scrim.commands.ts
│   │   ├── admin.commands.ts
│   │   ├── recurring.commands.ts
│   │   └── user-management.commands.ts
│   ├── events/
│   │   ├── ready.event.ts      # Bot ready handler (command registration + poll recovery)
│   │   └── interaction.event.ts # Interaction dispatcher
│   ├── interactions/           # Buttons, modals, polls, reminders
│   │   ├── interactive.ts      # Date navigation buttons + availability UI + timezone selection
│   │   ├── polls.ts            # Quick poll with emoji reactions, countdown, recovery
│   │   ├── reminder.ts         # DM reminders to players + timezone prompt button
│   │   └── trainingStartPoll.ts # Training time poll with reactions, countdown, recovery
│   ├── embeds/
│   │   └── embed.ts            # Discord embed builders
│   └── utils/
│       └── schedule-poster.ts  # Schedule posting + change notifications
├── jobs/
│   └── scheduler.ts            # node-cron job management
├── repositories/               # Data access layer (Prisma queries)
│   ├── database.repository.ts  # Prisma client singleton + connect/disconnect
│   ├── database-initializer.ts # First-run DB setup (default settings, tables)
│   ├── absence.repository.ts   # Absence CRUD + date range checks
│   ├── recurring-availability.repository.ts # Recurring weekly availability CRUD
│   ├── schedule.repository.ts  # Schedule + player queries, seeding, sync
│   ├── scrim.repository.ts     # Match tracking CRUD + stats
│   └── user-mapping.repository.ts # Roster management with auto-sort
├── services/                   # Business logic layer
│   ├── absence.service.ts      # Absence CRUD with auth + date validation
│   ├── recurring-availability.service.ts # Recurring availability business logic
│   ├── schedule.service.ts     # Schedule analysis, availability validation
│   ├── scrim.service.ts        # Scrim CRUD + stats + recent scrims
│   ├── stratbook.service.ts    # Notion API integration with caching
│   └── user-mapping.service.ts # Roster CRUD with auto-sync to schedules
└── shared/
    ├── config/config.ts        # Global config (env + DB settings)
    ├── middleware/
    │   ├── __tests__/          # Middleware unit tests (auth, validation)
    │   ├── auth.ts             # JWT verification, admin check, optional auth
    │   ├── passwordManager.ts  # Password hashing/comparison
    │   ├── rateLimiter.ts      # Rate limiting (general, strict, login)
    │   └── validation.ts       # Joi schemas + validate() middleware
    ├── types/types.ts          # Shared TypeScript interfaces
    └── utils/
        ├── __tests__/          # Utility unit tests (analyzer, dateFormatter, timezoneConverter)
        ├── analyzer.ts         # Schedule roster analysis (status, time windows)
        ├── dateFormatter.ts    # DD.MM.YYYY formatting utilities
        ├── logger.ts           # In-memory log store + console output
        ├── scheduleDetails.ts  # Schedule detail queries (single + batch)
        ├── settingsManager.ts  # Settings load/save/reload from DB
        └── timezoneConverter.ts # Per-user timezone conversion utilities

dashboard/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (theme, fonts, toaster)
│   ├── page.tsx                # Home (tab-based user view)
│   ├── globals.css             # Global styles + animation tokens
│   ├── login/                  # User login
│   ├── admin/
│   │   ├── login/              # Admin login
│   │   └── page.tsx            # Admin dashboard (tab-based)
│   ├── auth/callback/          # Discord OAuth handler
│   └── api/                    # Next.js API proxy routes (→ backend)
│       ├── bot-status/         # Proxies to /api/health
│       ├── settings/           # Proxies to /api/settings (GET + POST)
│       ├── discord/
│       │   ├── channels/       # Proxies to /api/discord/channels
│       │   └── roles/          # Proxies to /api/discord/roles
│       ├── actions/
│       │   ├── schedule/       # Proxies to /api/actions/schedule
│       │   ├── remind/         # Proxies to /api/actions/remind
│       │   └── poll/           # Proxies to /api/actions/poll
│       └── logs/               # Proxies to /api/logs
├── components/
│   ├── admin/                  # Admin-specific components
│   │   ├── index.ts            # Barrel export
│   │   ├── layout/
│   │   │   ├── admin-layout-wrapper.tsx
│   │   │   └── admin-sidebar.tsx
│   │   └── pages/              # Admin feature pages
│   │       ├── index.ts        # Barrel export (also re-exports shared components)
│   │       ├── admin-dashboard.tsx     # Admin dashboard home with stats cards
│   │       ├── admin-settings.tsx      # Bot configuration UI
│   │       ├── admin-actions.tsx       # Manual action triggers
│   │       ├── admin-user-mappings.tsx # Player roster manager
│   │       ├── admin-schedule-editor.tsx # Edit schedule reason/focus
│   │       ├── admin-security.tsx      # Security settings
│   │       └── admin-logs.tsx          # Application logs viewer
│   ├── shared/                 # Shared across admin/user portals
│   │   ├── index.ts            # Barrel export
│   │   ├── agent-picker.tsx    # Valorant agent selector (AgentSelector)
│   │   ├── nav-user.tsx        # User navigation (sidebar user menu)
│   │   ├── matches.tsx         # Match history (maps, agents, VOD)
│   │   ├── statistics.tsx      # Charts & analytics (Recharts, mobile-friendly)
│   │   ├── map-veto.tsx        # Map veto planner with drag-and-drop
│   │   ├── stratbook.tsx       # Notion-powered strategy viewer
│   │   └── notion-renderer.tsx # Renders Notion blocks (headings, lists, code, images)
│   ├── error-boundary.tsx       # React error boundary with retry UI
│   ├── auth/                   # Auth components
│   │   ├── index.ts
│   │   └── login-form.tsx
│   ├── theme/                  # Theme system
│   │   ├── index.ts
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── ui/                     # Radix UI primitives (30 components)
│   │   └── accordion, alert-dialog, avatar, badge, breadcrumb,
│   │       button, card, chart, checkbox, collapsible, command, dialog,
│   │       dropdown-menu, field, input, label, popover, scroll-area,
│   │       select, separator, sheet, sidebar, skeleton, slider,
│   │       sonner, switch, table, tabs, textarea, tooltip
│   └── user/                   # User portal components
│       ├── index.ts            # Barrel export (re-exports layout + pages)
│       ├── layout/
│       │   ├── index.ts
│       │   ├── user-layout-wrapper.tsx
│       │   └── user-sidebar.tsx
│       └── pages/
│           ├── index.ts
│           ├── user-schedule.tsx       # Calendar view for users
│           ├── user-availability.tsx   # Set availability (auto-save)
│           ├── user-recurring.tsx      # Recurring weekly availability management
│           └── user-absences.tsx       # Absence/vacation management
├── hooks/
│   └── use-mobile.ts           # Mobile breakpoint hook (768px)
├── lib/
│   ├── api.ts                  # API client (apiGet, apiPost, apiPut, apiDelete)
│   ├── auth.ts                 # JWT token management
│   ├── breadcrumb-context.tsx   # React Context for breadcrumb navigation in sub-pages
│   ├── config.ts               # Dashboard config constants (BOT_API_URL, timeouts, retry settings)
│   ├── timezone.ts             # Timezone React Context (TimezoneProvider, useTimezone, conversion utils)
│   ├── types.ts                # Frontend type definitions
│   ├── utils.ts                # Tailwind merge utility (cn)
│   └── animations.ts           # Animation utilities (stagger, presets, micro-interactions)
└── public/
    └── assets/
        ├── agents/             # Valorant agent icons (28 .webp files)
        └── maps/               # Valorant map images (12 .webp files)
```

### Data Flow Patterns

**Discord → Database:**
- User runs `/set` command → Bot creates interactive buttons
- User clicks time button → `handleInteraction()` updates `schedule_players` table via Prisma
- Changes are immediately persisted to PostgreSQL

**Dashboard → Bot:**
- Dashboard sends `POST /api/actions/schedule` with JWT auth
- API server validates token, calls `postScheduleToChannel()` from bot module
- Bot fetches Discord channel and posts embed

**Dashboard API Proxy:**
- Dashboard Next.js API routes (`app/api/`) proxy certain requests to the backend Express API
- Uses `BOT_API_URL` env var (defaults to `http://localhost:3001`)
- Proxy routes: bot-status, settings, discord channels/roles, actions, logs
- All proxy routes use `export const dynamic = 'force-dynamic'` to disable Next.js caching

**Scheduler → Discord:**
- node-cron triggers at configured time (e.g., "12:00" in Europe/Berlin)
- Calls `postScheduleToChannel()` which reads today's schedule from DB
- Analyzes roster completeness, calculates time windows, posts Discord embed

### Settings Management
Settings are stored in PostgreSQL `settings` table as flat key-value pairs:
- Keys use dot notation: `"discord.channelId"`, `"scheduling.dailyPostTime"`
- Values are always strings, parsed to correct types on load
- Settings are cached in memory (`settingsManager.ts`) and reloaded via `reloadConfig()`
- Dashboard changes trigger `POST /api/settings` → saves to DB → calls `reloadConfig()` → restarts scheduler with new times

**Two access patterns exist for settings:**

1. **`config` export** (`src/shared/config/config.ts`) - Subset used by scheduler and core bot logic:
```typescript
config.discord = { token, channelId, guildId, pingRoleId }
config.scheduling = {
  dailyPostTime,              // "HH:MM" format
  timezone,                   // IANA timezone (e.g., "Europe/Berlin")
  reminderHoursBefore,        // Send reminders X hours before post
  duplicateReminderEnabled,   // Toggle second reminder closer to post time
  duplicateReminderHoursBefore, // Hours before post for duplicate reminder
  trainingStartPollEnabled,   // Toggle training poll feature
}
config.admin = { username }
```

2. **`loadSettings()` / `Settings` interface** (`src/shared/utils/settingsManager.ts`) - Full settings including all fields:
```typescript
settings.discord = { channelId, pingRoleId, allowDiscordAuth }
settings.scheduling = {
  dailyPostTime, timezone, reminderHoursBefore,
  duplicateReminderEnabled, duplicateReminderHoursBefore,
  trainingStartPollEnabled,
  pollDurationMinutes,        // Poll open duration in minutes (1-10080, free-form input)
  cleanChannelBeforePost,     // Auto-clean channel before posting
  changeNotificationsEnabled  // Notify when roster status changes (default: true)
}
settings.branding = {
  teamName,                   // Team display name (default: "Valorant Bot")
  tagline,                    // Optional tagline (default: "Schedule Manager")
  logoUrl                     // Optional logo URL for sidebar branding
}
```

Features like change notifications, channel cleaning, poll duration, branding, and Discord OAuth use `loadSettings()` directly rather than the `config` export. Both are updated when `reloadConfig()` is called, but only the `config` fields are explicitly reassigned in `reloadConfig()`.

### Branding Configuration
The `branding` settings group allows customizing the team identity in the dashboard:
- `branding.teamName` (string, default: "Valorant Bot") - Displayed in sidebar header
- `branding.tagline` (string, optional, default: "Schedule Manager") - Subtitle in sidebar
- `branding.logoUrl` (string, optional) - Custom logo URL for sidebar branding
- Configured via the dashboard Settings panel under a dedicated Branding card

### Duplicate Reminder System
An optional second reminder can be sent closer to the daily post time:
- `scheduling.duplicateReminderEnabled` (boolean, default: false) - Toggle the feature
- `scheduling.duplicateReminderHoursBefore` (number, default: 1) - Hours before post time
- When enabled, creates a third cron job in the scheduler that sends the same DM reminders to players who still haven't set their availability
- Useful for catching players who missed the first reminder

### User Mapping System
The `user_mappings` table is the single source of truth for player rosters:
- Links Discord ID to display name, Discord username, role (MAIN, SUB, COACH), and optional timezone
- When creating schedules, players are copied from `user_mappings` to `schedule_players`
- `sort_order` determines display order in embeds and dashboard
- Changes to user mappings affect future schedules but NOT historical ones
- After modifying user mappings, `syncUserMappingsToSchedules()` syncs changes to future schedule entries
- The services layer (`user-mapping.service.ts`) auto-calls sync after add/update/remove

### Schedule Seeding
The bot maintains a 14-day rolling window:
- On startup and daily, `addMissingDays()` ensures entries exist for next 14 days
- Each schedule entry has date (DD.MM.YYYY format), reason, focus
- Players are cloned from `user_mappings` with availability defaulting to empty string
- Users can set availability to time ranges ("14:00-20:00") or "x" for unavailable

### Schedule Analysis (src/shared/utils/analyzer.ts)
The analyzer calculates roster status from availability data:
- **OFF_DAY**: Schedule reason indicates no training
- **FULL_ROSTER**: 5+ main players available
- **WITH_SUBS**: 4 mains available (subs fill)
- **NOT_ENOUGH**: Cannot proceed with training
- Calculates common time window (intersection of all available player windows)
- Returns `canProceed` boolean used by training start poll

### Schedule Details (src/shared/utils/scheduleDetails.ts)
Provides frontend-friendly schedule analysis:
- `getScheduleDetails(date)` - Single date analysis (status string, time window, player lists)
- `getScheduleDetailsBatch(dates)` - Batch multi-date analysis
- Returns status strings: "Able to play", "Almost there", "More players needed", "Insufficient players", "Off-Day", "Unknown"

### Absence System
Players can register planned absences (vacations, travel, etc.) with date ranges:
- **Database**: `absences` table with `user_id`, `start_date`, `end_date` (DD.MM.YYYY), `reason`
- **Repository** (`absence.repository.ts`): CRUD + `isUserAbsentOnDate()`, `getAbsentUserIdsForDate()`, `getAbsentUserIdsForDates()` (batch)
- **Service** (`absence.service.ts`): Validates dates, enforces authorization (users can only manage own absences unless admin)
- **API Routes** (`absence.routes.ts`): Full REST API at `/api/absences`
- **Dashboard**: `UserAbsencesContent` page with table + create/edit dialog
- **Discord Bot Integration**:
  - `interactive.ts` - Prevents setting availability during active absence, shows "✈️ You have an active absence"
  - `schedule.commands.ts` - Filters absent players from `/schedule` display
  - `schedule-poster.ts` - Shows separate "Absent" count in daily embed
  - `reminder.ts` - Skips reminders for absent players
  - `poll.commands.ts` - Excludes absent players from training polls
- **Statistics**: Team Availability chart shows absent players as a separate purple bar segment

### Recurring Availability System
Players can set a default weekly availability pattern that auto-applies to new schedule entries:
- **Database**: `recurring_availabilities` table with `user_id`, `day_of_week` (0-6, Sunday=0), `availability`, `active` flag, unique constraint on `[userId, dayOfWeek]`
- **Repository** (`recurring-availability.repository.ts`): CRUD + `getRecurringForUser()`, `getActiveRecurringForDay()`, `upsert()`, `remove()`, `removeAll()`
- **Service** (`recurring-availability.service.ts`): Business logic with authorization (users manage own entries only)
- **API Routes** (`recurring-availability.routes.ts`): REST API at `/api/recurring-availability`
- **Dashboard**: `UserRecurring` page with table view, auto-save (1s debounce), bulk operations, timezone conversion, Monday-first week display
- **Discord Bot Integration**:
  - `/set-recurring <days> <time>` - Set recurring schedule (e.g., `mon-fri`, `18:00-22:00`)
  - `/my-recurring` - View weekly recurring schedule with emoji indicators
  - `/clear-recurring <day>` - Remove entries for a day or "all"
- **Auto-Application**: When new schedule days are seeded via `addMissingDays()`, recurring entries are automatically applied to matching day-of-week slots
- **Override Behavior**: Users can always override recurring defaults for specific dates using `/set` or the Availability dashboard

### Change Notification System
When a player's availability or a schedule reason changes, the bot can automatically detect roster status changes and post an updated schedule embed to Discord:
- **Function**: `checkAndNotifyStatusChange(date, previousStatus, clientInstance?)` in `src/bot/utils/schedule-poster.ts`
- **Trigger points**: Called fire-and-forget (`.catch()`) from:
  - `schedule.routes.ts` - After reason update (`POST /api/schedule/update-reason`) and availability update (`POST /api/schedule/update-availability`)
  - `interactive.ts` - After Discord button clicks (unavailable, time modal)
- **Behavior**:
  1. Captures the old `ScheduleStatus` before the update
  2. After the update, fetches the new status and compares priority (`NOT_ENOUGH=0 < WITH_SUBS=1 < FULL_ROSTER=2`)
  3. If status changed: cleans channel (removes old embeds/polls), posts updated embed with `📈`/`📉` direction indicator and role ping
  4. If new status allows training (`canProceed`), creates a fresh training start poll
- **Guards**:
  - Only triggers for today's date (not future dates)
  - Only triggers after the configured daily post time has passed
  - Requires `scheduling.changeNotificationsEnabled` setting to be `true` (default: `true`)
  - Deduplication: `notificationInProgress` flag prevents concurrent duplicate notifications from parallel API calls

## Discord Bot Commands

### Public Commands
- `/schedule [date]` - View availability for a date (defaults to today)
- `/schedule-week` - Show next 7 days overview
- `/my-schedule` - Show your 14-day availability
- `/view-scrims [limit]` - View recent match results
- `/scrim-stats` - Win/loss statistics

### Player Commands
- `/set` - Interactive buttons to set daily availability (includes timezone prompt if not set)
- `/set-timezone <timezone>` - Set personal timezone (with autocomplete)
- `/remove-timezone` - Remove personal timezone (use bot default)
- `/set-recurring <days> <time>` - Set recurring weekly availability (e.g., `mon-fri`, `18:00-22:00`)
- `/my-recurring` - View your recurring weekly schedule
- `/clear-recurring <day>` - Clear recurring entry for a day (or "all" to clear everything)

### Admin Commands (require Discord Administrator permission)
- `/post-schedule [date]` - Manually post schedule to channel
- `/register <user> <column> <role>` - Add player to roster
- `/unregister <user>` - Remove player from roster
- `/remind [date]` - Send DM reminders to players without entry
- `/notify <type> <target> [user]` - Send notifications (info/success/warning/error to all/main/sub/coach)
- `/add-scrim <date> <opponent> <result> <score-us> <score-them> [maps] [notes]` - Log match
- `/poll <question> <options> [duration]` - Create quick poll (emoji reactions, auto-close, duration in minutes)
- `/training-start-poll` - Toggle automatic training start poll
- `/send-training-poll [date]` - Manually trigger training start poll

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login → JWT (24h)
- `POST /api/user/login` - User login (display name, no password) → JWT
- `GET /api/auth/discord` - Initiate Discord OAuth
- `GET /api/auth/discord/callback` - OAuth callback
- `GET /api/auth/user` - Get current user from session
- `POST /api/auth/logout` - Clear session

### Schedule
- `GET /api/schedule/next14` - Next 14 days with players
- `GET /api/schedule/paginated?offset=0` - Paginated schedule (admin)
- `POST /api/schedule/update-reason` - Set reason/focus for date
- `POST /api/schedule/update-availability` - User sets own availability
- `GET /api/schedule-details?date=DD.MM.YYYY` - Single day analysis
- `GET /api/schedule-details-batch?dates=...` - Multiple dates analysis

### User Mappings
- `GET /api/user-mappings` - Get all players (public)
- `POST /api/user-mappings` - Add player (admin, validated)
- `PUT /api/user-mappings/reorder` - Batch reorder players via drag-and-drop (admin, validated)
- `PUT /api/user-mappings/:discordId` - Update player (admin)
- `DELETE /api/user-mappings/:discordId` - Remove player (admin)

### Scrims
- `GET /api/scrims` - All matches
- `GET /api/scrims/stats/summary` - Win/loss/draw statistics
- `GET /api/scrims/range/:startDate/:endDate` - Date range filter
- `GET /api/scrims/:id` - Single match
- `POST /api/scrims` - Add match (auth required, validated)
- `PUT /api/scrims/:id` - Update (auth required, validated)
- `DELETE /api/scrims/:id` - Delete (auth required)

### Absences
- `GET /api/absences/my` - Get logged-in user's absences (auth required)
- `GET /api/absences?userId=ID` - Get absences for specific user (auth required)
- `GET /api/absences/by-dates?dates=DD.MM.YYYY,...` - Batch: absent user IDs per date (auth required)
- `POST /api/absences` - Create absence (auth required, users create own only)
- `PUT /api/absences/:id` - Update absence (auth required, own only unless admin)
- `DELETE /api/absences/:id` - Delete absence (auth required, own only unless admin)

### Recurring Availability
- `GET /api/recurring-availability/my` - Get logged-in user's recurring schedule (auth required)
- `GET /api/recurring-availability?userId=ID` - Get specific user's recurring schedule (auth required)
- `POST /api/recurring-availability` - Set recurring availability for a day (auth required, validated)
- `POST /api/recurring-availability/bulk` - Bulk set for multiple days (auth required, validated)
- `DELETE /api/recurring-availability/:dayOfWeek` - Remove specific day (auth required)
- `DELETE /api/recurring-availability` - Remove all entries (auth required)

### Settings & Actions
- `GET /api/settings` - Load all settings (public)
- `POST /api/settings` - Save settings (admin, strict rate limit, validated)
- `POST /api/settings/reload-config` - Force reload (admin, strict rate limit)
- `POST /api/actions/schedule` - Post schedule to Discord (admin)
- `POST /api/actions/remind` - Send reminders (admin)
- `POST /api/actions/poll` - Create poll (admin, validated)
- `POST /api/actions/notify` - Send DM notification (admin, validated)
- `POST /api/actions/clear-channel` - Clear channel messages (admin)
- `POST /api/actions/pin-message` - Send and pin message (admin)

### Stratbook
- `GET /api/stratbook` - List strategies (optional query params: map, side)
- `GET /api/stratbook/:pageId` - Get single strategy content (Notion blocks)

### Discord & Admin
- `GET /api/discord/channels` - List text channels (admin)
- `GET /api/discord/roles` - List server roles (admin)
- `GET /api/discord/members` - List members (cached 5min, admin)
- `POST /api/admin/generate-password-hash` - Generate bcrypt hash (admin)
- `POST /api/admin/generate-jwt-secret` - Generate JWT secret (admin)
- `GET /api/health` - Server uptime + bot status
- `GET /api/bot-status` - Bot online/offline
- `GET /api/logs?limit=100&level=info` - Retrieve logs (admin)

## Key Architecture Decisions

### Prisma with PostgreSQL
- Schema is in `prisma/schema.prisma` with explicit table mappings (`@@map`)
- Generator uses `prisma-client` provider (Prisma 7.x style, not `prisma-client-js`)
- Migrations are in `prisma/migrations/` and must be run on deploy
- Date format is DD.MM.YYYY stored as TEXT (not DATE type) for consistency with legacy system
- Cascade deletes: deleting a Schedule deletes all its SchedulePlayers
- Prisma client outputs to custom path: `src/generated/prisma` (not default node_modules)
- Always import from: `import { PrismaClient } from '../generated/prisma/client.js'`
- After schema changes: run `npx prisma generate` to regenerate client in custom location
- Uses `@prisma/adapter-pg` with native `pg` driver for PostgreSQL connection

### Discord Bot Structure
- Commands are defined in `src/bot/commands/definitions.ts` and registered on bot ready
- Command handlers are split by feature: schedule, availability, poll, scrim, admin, user-management
- `src/bot/commands/index.ts` routes incoming interactions to the correct handler
- Event handlers are in `src/bot/events/` (ready.event.ts, interaction.event.ts)
- Interactive components (buttons, modals, polls) are in `src/bot/interactions/`
- All schedule posting logic is centralized in `src/bot/utils/schedule-poster.ts`

### Repository Pattern
Data access is abstracted into repositories (sole data layer, no legacy alternatives):
- `database.repository.ts` - Prisma client singleton, `connectDatabase()`, `disconnectDatabase()`
- `database-initializer.ts` - First-run setup: creates tables, seeds default settings and schedules
- `absence.repository.ts` - Absence CRUD, `isUserAbsentOnDate()`, `getAbsentUserIdsForDate()`, `getAbsentUserIdsForDates()` (batch)
- `recurring-availability.repository.ts` - Recurring weekly availability CRUD, day-of-week queries, upsert
- `schedule.repository.ts` - Schedule CRUD, `addMissingDays()`, `syncUserMappingsToSchedules()`, pagination
- `scrim.repository.ts` - Scrim CRUD, stats aggregation, date range queries
- `user-mapping.repository.ts` - Roster CRUD with auto-`sortOrder` calculation and reordering on role changes

### Services Layer
Services provide business logic on top of repositories:
- `absence.service.ts` - Absence CRUD with date validation and authorization (users manage own absences only)
- `recurring-availability.service.ts` - Recurring availability CRUD with authorization (users manage own entries only)
- `schedule.service.ts` - Schedule analysis, availability validation (users can only edit their own unless admin), pagination
- `scrim.service.ts` - Scrim CRUD, stats, recent scrims with date sorting
- `stratbook.service.ts` - Fetches strategies from Notion API, caches results for 60 seconds, filters by map/side/tags
- `user-mapping.service.ts` - Roster CRUD with automatic `syncUserMappingsToSchedules()` after changes

Services are class-based with singleton exports (e.g., `export const scheduleService = new ScheduleService()`).

### API Security
- **Helmet** - Security headers (CSP, HSTS, X-Frame-Options)
- **CORS** - Whitelist: localhost:3000, Railway URLs, custom DASHBOARD_URL
- **Rate limiting** - `strictApiLimiter` on settings endpoints, `loginLimiter` on auth, general `apiLimiter` on all `/api`
- **Input sanitization** - `sanitizeString()` removes `<>`, `javascript:`, event handlers
- **Validation** - Joi schemas with `validate()` middleware on: user mappings, scrims, settings, polls, notifications, branding
- Poll duration validated as integer range 1-10080 minutes (free-form, not restricted to Discord-compatible values)
- No caching headers on API responses

### API Authentication
Two auth modes:
1. **Admin** - Username/password from .env, password hashed with bcrypt, JWT with 24h expiry
2. **User** - Username from dropdown (no password) OR Discord OAuth flow
   - Discord OAuth requires DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_REDIRECT_URI
   - OAuth must be enabled in settings: `discord.allowDiscordAuth = true`

**Middleware chain:** `verifyToken` → `requireAdmin` (or `optionalAuth` for public endpoints)

### Dashboard Routing
Next.js App Router structure:
- `/` - Home page (tab-based: schedule, availability, recurring, absences, matches, map-veto, stratbook, statistics)
- `/login` - User login page
- `/admin/login` - Admin login page
- `/admin` - Admin dashboard (tab-based: dashboard, statistics, settings, users, schedule, scrims, map-veto, actions, security, logs)
- `/auth/callback` - Discord OAuth callback handler

Admin sidebar navigation is organized into three logical groups:
- **Overview:** Dashboard, Statistics
- **Team:** Schedule, Users, Matches, Map Veto, Stratbook
- **System:** Settings, Actions, Security, Logs

### Dashboard API Proxy Layer
The dashboard includes Next.js API routes (`app/api/`) that proxy requests to the backend Express API. This avoids CORS issues for server-side operations:
- Uses `BOT_API_URL` environment variable (server-side, defaults to `http://localhost:3001`)
- Client-side components use `NEXT_PUBLIC_BOT_API_URL` to call the backend directly
- Proxy routes: bot-status, settings, discord (channels, roles), actions (schedule, remind, poll), logs
- All proxy routes use `export const dynamic = 'force-dynamic'` to disable Next.js caching

### Dashboard Component Organization
Components are organized by domain/role:
- `components/admin/` - Admin-only features (pages, layout)
  - `pages/` - Feature pages: admin-dashboard, admin-settings, admin-actions, admin-user-mappings, admin-schedule-editor, admin-security, admin-logs
  - `layout/` - Admin layout wrapper and sidebar
- `components/user/` - User portal features (layout + pages subdirectories)
  - `layout/` - User layout wrapper and sidebar
  - `pages/` - User content pages (user-schedule, user-availability, user-recurring, user-absences)
- `components/auth/` - Authentication UI
- `components/shared/` - Shared across admin/user (agent-picker, matches, statistics, map-veto, stratbook, notion-renderer, nav-user)
- `components/theme/` - Theme system (theme-toggle, theme-provider)
- `components/ui/` - Radix UI primitives (30 components including chart)

Admin pages export from `components/admin/pages/index.ts` which also re-exports shared components (Matches, AgentSelector, MapVetoPlanner, Statistics, Stratbook) for convenience.

### Statistics Component
The `Statistics` component (`components/shared/statistics.tsx`) provides team analytics using Recharts:
- **Team Availability Chart** - Stacked bar chart showing available/unavailable/no-response/absent players per day
- **Scrim Results** - Win/loss/draw visualization with filtering by date range and opponent
- **Current Form** - Win/loss streak display
- **Map Compositions** - Agent picks per map with collapsible details
- Mobile-responsive: uses `useIsMobile` hook, adjusts chart heights (220px mobile, 300px desktop), thins X-axis labels on mobile

### Matches Component
The `Matches` component (`components/shared/matches.tsx`) provides match history management:
- **Match Table** - Displays scrims with date, opponent, result, score, map, and VOD links
- **Agent Compositions** - Shows agent picks for both teams using agent icons from `public/assets/agents/`
- **Create/Edit Dialog** - Form for adding or editing match records with agent picker
- **Filtering** - Filter by date range and opponent
- Used in both admin dashboard (Matches tab) and user portal (Matches tab)

### Map Veto Planner
The `MapVetoPlanner` component (`components/shared/map-veto.tsx`) provides a drag-and-drop interface for map veto planning:
- **Map Pool Management** - Visual drag-and-drop using @dnd-kit library
- **Veto Process Simulation** - Plan pick/ban sequences for competitive matches
- **Map Images** - Uses Valorant map images from `public/assets/maps/`
- Available in both user portal and admin dashboard via the "Map Veto" tab

### Stratbook (Notion Integration)
The `Stratbook` component (`components/shared/stratbook.tsx`) provides a read-only strategy viewer powered by Notion:
- **Strategy List** - Fetches strategies from a Notion database with properties: Name, Map, Side, Tags, Agents
- **Filtering** - Filter by map and side, with search functionality
- **Strategy Detail View** - Renders full Notion page content using `NotionRenderer` component
- **NotionRenderer** (`components/shared/notion-renderer.tsx`) - Renders Notion blocks including headings, paragraphs, lists, code blocks, images, callouts, toggles, and more
- **Caching** - 60-second in-memory cache on the backend for performance
- **Graceful Degradation** - Shows informational message when Notion is not configured (missing API key)
- **Breadcrumb Navigation** - Uses `BreadcrumbContext` (`lib/breadcrumb-context.tsx`) for sub-page navigation
- Available in both admin dashboard (Stratbook tab) and user portal (Stratbook tab)
- Requires `NOTION_API_KEY` and `NOTION_STRATS_DB_ID` environment variables

### Discord Avatar Integration
User avatars from Discord are displayed throughout the dashboard:
- **User Mappings** (`admin-user-mappings.tsx`) - Shows Discord avatars next to player names in the roster list
- **User Sidebar** (`user-sidebar.tsx`) - Displays avatar for OAuth-authenticated users
- **OAuth Flow** (`auth.controller.ts`) - Returns avatar URL in Discord OAuth callback response
- **API Enrichment** (`user-mapping.routes.ts`) - Enriches user mapping responses with avatar URLs fetched from bot client (authenticated requests only)
- Avatar URLs use Discord CDN: `https://cdn.discordapp.com/avatars/{discordId}/{avatar}.{gif|png}?size=128`
- Supports animated avatars (GIF format for avatars starting with `a_`)

### Dashboard Animation System
The dashboard uses a custom animation utility system (`lib/animations.ts`):
- `stagger()` / `staggerList()` - Staggered list animations with configurable speed
- `animate()` - Animation class builder with presets (fadeIn, slideUp, scaleIn, etc.)
- `gridStagger()` - 2D grid stagger patterns
- `microInteractions` - Hover lift, hover scale, active press, focus ring utilities
- `presets` - Common UI patterns (cardEntrance, modalEntrance, listItem, button, card)
- Animation design tokens are defined in `globals.css`

### Dashboard Caching Strategy
The dashboard aggressively disables caching for live data:
- `next.config.ts` adds `no-store, no-cache, must-revalidate` headers to all routes
- Build ID uses timestamps (`build-${Date.now()}`) for cache invalidation
- Root layout metadata includes cache-control headers
- All API proxy routes use `force-dynamic` export

### Scheduler Jobs (src/jobs/scheduler.ts)
Up to three scheduled cron jobs:
1. **Main Post** - Daily at `config.scheduling.dailyPostTime`, posts schedule embed to Discord
2. **Reminder** - X hours before main post (calculated from `reminderHoursBefore`), DMs players without availability entry
3. **Duplicate Reminder** (optional) - A second reminder closer to post time, enabled via `duplicateReminderEnabled`. Sends the same DM reminders to players still without availability. Configured via `duplicateReminderHoursBefore` (default: 1 hour before post)

Jobs respect `config.scheduling.timezone` and are restarted on settings change via `restartScheduler()`.

The Training Start Poll is triggered separately via bot command (`/send-training-poll`) or toggle (`/training-start-poll`), not as a cron job.

### Poll System (Training Start + Quick Polls)
Both poll types use **reaction-based embeds** (not native Discord polls), which allows custom durations and full control over the UI.

**Training Start Poll** (`src/bot/interactions/trainingStartPoll.ts`):
- Generates time slot options (every 30min) within the common availability window
- Uses Discord timestamps (`<t:TIMESTAMP:t>`) so users see times in their local timezone
- Grid layout: 3 per row (divisible by 3), 2 per row (divisible by 2), mixed for odd counts (5→2-2-1, 7→3-3-1)
- Poll duration configurable in minutes (1-10080) via dashboard Settings

**Quick Poll** (`src/bot/interactions/polls.ts`):
- Created via `/poll` command or dashboard Actions panel
- Title = question text, options as embed fields with emoji reactions
- Duration in minutes (configurable, default: 60)

**Shared poll features**:
- **Countdown timer**: Footer updates every 60 seconds showing remaining time (e.g., "Poll closes in 45 minutes", "Poll closes in 1h 30m")
- **Auto-close**: `setTimeout` triggers poll closure; embed changes to red "CLOSED" state
- **Clean close**: All reactions are removed when poll closes for a cleaner look
- **Results display**: Top 3 with medal emojis (🥇🥈🥉), entries with 0 votes hidden (except 1st place). Training poll picks middle time if no votes.
- **Recovery on restart**: `ready.event.ts` calls `recoverTrainingPolls()` and `recoverQuickPolls()` on bot startup. These scan the last 50 channel messages for open poll embeds, reconstruct poll state from reactions/fields, and re-register timers for the remaining duration. Expired polls are immediately closed with results.
- **In-memory storage**: Active polls stored in `Map<messageId, Poll>`. Not persisted to DB — recovery relies on scanning Discord messages.

## Important Gotchas

### Date Format Consistency
Always use DD.MM.YYYY format (e.g., "24.01.2026") when working with dates:
- Database stores dates as TEXT in this format
- `dateFormatter.ts` provides `getTodayFormatted()` and `formatDateToDDMMYYYY()`
- Never use JavaScript Date ISO strings directly in queries

### Availability Format
Player availability is stored as a string with three possible formats:
- `""` (empty) = no response yet
- `"x"` or `"X"` = unavailable for the day
- `"HH:MM-HH:MM"` = available during time window (e.g., "14:00-20:00")
- Common time window = intersection of all available player windows

### Timezone Handling
- Bot uses configured timezone from settings (default: "Europe/Berlin")
- node-cron jobs respect this timezone
- Dashboard should send dates in DD.MM.YYYY format, not epoch timestamps
- **Per-user timezone**: Players can set a personal timezone via `/set-timezone` command or "🌍 Set Timezone" button (shown in `/set` flow and reminder DMs)
- When a user has a personal timezone set, their time inputs (e.g., "14:00-20:00") are automatically converted from their timezone to the bot timezone before saving to DB
- Timezone conversion uses `Intl.DateTimeFormat` formatter approach (`src/shared/utils/timezoneConverter.ts`)
- The `user_mappings.user_timezone` column stores the IANA timezone string (nullable, null = bot default)
- **Dashboard timezone system** (`dashboard/lib/timezone.ts`):
  - `TimezoneProvider` React Context wraps the app, providing `useTimezone()` hook
  - Conversion functions: `convertTime()`, `convertTimeRange()`, `getTimezoneAbbr()`
  - User timezone stored in localStorage, bot timezone auto-fetched from settings API (refreshed every 5 minutes)
  - Bot-TZ values from DB are converted to user's local timezone for display
- All Discord time displays use `<t:TIMESTAMP:t>` format so each user sees times in their local timezone automatically

### Settings Reload Pattern
When settings change:
1. Save to PostgreSQL via `saveSettings()`
2. Call `reloadConfig()` to update in-memory config
3. Call `restartScheduler()` to apply new cron times
4. API endpoint `/api/settings` handles this flow automatically

### User Mappings vs Schedule Players
- `user_mappings` table = master roster (who is on the team)
- `schedule_players` table = daily snapshots (copied from user_mappings when schedule is seeded)
- Changing a user's display name in mappings affects future schedules only
- After roster changes, call `syncUserMappingsToSchedules()` to update future entries
- The `UserMappingService` handles this automatically on add/update/remove

### Circular Dependencies
- Bot client is used in multiple modules (scheduler, API actions, interactions)
- Use dynamic `await import()` if you encounter circular dependency issues
- `schedule-poster.ts` re-exports from `client.ts` for backward compatibility

### Module System
This project uses ES modules (`"type": "module"` in package.json):
- All imports must include `.js` extension even for `.ts` files (TypeScript requirement)
- Use `import` syntax, not `require()`
- `__dirname` not available - use `fileURLToPath(import.meta.url)`

### Environment Variables
Required .env variables:
- `DISCORD_TOKEN` - Bot token from Discord Developer Portal
- `DISCORD_GUILD_ID` - Server ID where bot operates
- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_USERNAME` - Admin dashboard username
- `ADMIN_PASSWORD_HASH` - Bcrypt hash (generate with `node dist/generateHash.js`)
- `JWT_SECRET` - Random 32+ char string for JWT signing

Optional for OAuth:
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`

Optional for Notion Stratbook:
- `NOTION_API_KEY` - Notion API key for stratbook feature
- `NOTION_STRATS_DB_ID` - Notion database ID containing strategies

Optional for CORS/URLs:
- `DASHBOARD_URL` - Dashboard URL for production CORS (defaults to localhost:3000)
- `BOT_API_URL` - Backend API URL for dashboard server-side proxy (defaults to http://localhost:3001)
- `NEXT_PUBLIC_BOT_API_URL` - Backend API URL for dashboard client-side (defaults to http://localhost:3001)

### Logger
- In-memory log store (last 500 entries) accessible via `GET /api/logs`
- Levels: info, warn, error, success
- Use `logger.info()`, `logger.error()` etc. from `src/shared/utils/logger.ts`
- Color-coded console output in development
- All backend modules use the structured logger (no raw `console.log` calls)

## Testing Changes

### Testing Discord Commands
1. Run `npm run dev` to start bot
2. Invite bot to test server with permissions: View Channels, Send Messages, Embed Links, Add Reactions, Use Slash Commands
3. Commands auto-register on startup (check console logs)
4. Use `/schedule` to test basic functionality
5. Admin commands require Discord Administrator permission

### Testing Dashboard
1. Start bot: `npm run dev` (starts API on :3001)
2. Start dashboard: `cd dashboard && npm run dev` (starts on :3000)
3. Login at http://localhost:3000/admin/login with ADMIN_USERNAME and password
4. Changes via dashboard should reflect immediately in Discord bot

### Testing Scheduler
Manual trigger without waiting for cron:
```bash
# Trigger schedule post
curl -X POST http://localhost:3001/api/actions/schedule \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Trigger reminders
curl -X POST http://localhost:3001/api/actions/remind \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Schema Notes

### Key Tables
- **schedules** - One row per date (DD.MM.YYYY), has reason/focus fields
- **schedule_players** - Many rows per schedule, one per player per date, stores availability and sort_order
- **user_mappings** - Master roster with discord_id, discord_username, display_name, role, sort_order, user_timezone (optional), is_admin (boolean, default false — grants admin privileges via JWT)
- **scrims** - Match history (opponent, result, score_us, score_them, map, match_type, our_agents, their_agents as comma-separated strings, vod_url, notes)
- **absences** - Player absence periods (user_id, start_date, end_date in DD.MM.YYYY, reason)
- **recurring_availabilities** - Weekly recurring availability patterns (user_id, day_of_week 0-6, availability, active flag, unique on [userId, dayOfWeek])
- **settings** - Key-value store for bot configuration (dot-notation keys)

### Enums
- `UserRole`: MAIN, SUB, COACH
- `ScrimResult`: WIN, LOSS, DRAW

### Important Indexes
- `schedules.date` - Primary query path (unique)
- `schedule_players.schedule_id` and `schedule_players.user_id` - Join optimization
- `user_mappings.discord_id` - Unique constraint prevents duplicates
- `user_mappings.(role, sort_order)` - Compound index for sorted roster queries
- `absences.user_id` - User lookup optimization
- `absences.(start_date, end_date)` - Date range query optimization

### Scrim ID Format
Scrims use custom IDs: `scrim_${timestamp}_${random}` (string, not auto-increment)

## Code Style

- **Backend** TypeScript strict mode is DISABLED (`strict: false`, `noImplicitAny: false` in tsconfig.json), Target: ES2022, Module: NodeNext
- **Dashboard** TypeScript strict mode is ENABLED (full strict), Target: ES2017, Module: esnext, Path alias: `@/*` → `./*`
- Use async/await for all database operations
- Error handling: try/catch with `logger.error()` (structured logging throughout)
- Discord embeds use `EmbedBuilder` from discord.js
- API responses follow pattern: `res.json({ success: true, data: ... })` or `res.status(400).json({ error: "message" })`
- Frontend uses `apiGet<T>()`, `apiPost<T>()` etc. from `dashboard/lib/api.ts` (auto-attaches JWT, handles 401 redirect)
- Toasts via `sonner` library (`toast.success()`, `toast.error()`)
- Barrel exports: each component directory has an `index.ts` for centralized imports
- Services are class-based with singleton exports
