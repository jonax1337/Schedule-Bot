# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Discord bot with web dashboard for managing E-Sports team scheduling and availability. It consists of three main components:
1. **Discord Bot** (discord.js 14.x) - Slash commands, interactive buttons, polls
2. **API Server** (Express 5.x on port 3001) - REST API with Helmet security, CORS, rate limiting
3. **Dashboard** (Next.js 16 + React 19 on port 3000) - Admin panel and user portal

All components run from a single Node.js process that starts the bot, API server, and scheduler together.

### Technology Stack
**Backend:** TypeScript 5.9, discord.js 14.25, Express 5.2, Prisma 7.3 (with @prisma/adapter-pg + pg native driver), node-cron 4.2, bcrypt 6, jsonwebtoken 9, Helmet 8, dotenv 17, Joi 18, ical-generator 10 (installed but not yet used)
**Frontend:** Next.js 16.1, React 19.2, TailwindCSS 4, Radix UI primitives, Recharts 3.7 (charts), next-themes, sonner (toasts), lucide-react (icons), cmdk (command palette)
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

### Utility Scripts
```bash
# Generate password hash for ADMIN_PASSWORD_HASH
node dist/generateHash.js YOUR_PASSWORD

# Import data from Excel (legacy)
node dist/importFromExcel.js
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
│       ├── actions.routes.ts   # Manual action triggers (post, remind, poll, notify)
│       ├── admin.routes.ts     # Admin utilities (hash, JWT generation)
│       ├── auth.routes.ts      # Login, logout, OAuth endpoints
│       ├── discord.routes.ts   # Discord server data (channels, roles, members)
│       ├── schedule.routes.ts  # Schedule CRUD + availability updates
│       ├── scrim.routes.ts     # Scrim/match CRUD + stats
│       ├── settings.routes.ts  # Bot settings management
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
│   │   └── user-management.commands.ts
│   ├── events/
│   │   ├── ready.event.ts      # Bot ready handler (command registration)
│   │   └── interaction.event.ts # Interaction dispatcher
│   ├── interactions/           # Buttons, modals, polls, reminders
│   │   ├── interactive.ts      # Date navigation buttons + availability UI
│   │   ├── polls.ts            # Quick poll with emoji reactions
│   │   ├── reminder.ts         # DM reminders to players
│   │   └── trainingStartPoll.ts # Auto training time poll
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
│   ├── schedule.repository.ts  # Schedule + player queries, seeding, sync
│   ├── scrim.repository.ts     # Match tracking CRUD + stats
│   └── user-mapping.repository.ts # Roster management with auto-sort
├── services/                   # Business logic layer
│   ├── absence.service.ts      # Absence CRUD with auth + date validation
│   ├── schedule.service.ts     # Schedule analysis, availability validation
│   ├── scrim.service.ts        # Scrim CRUD + stats + recent scrims
│   └── user-mapping.service.ts # Roster CRUD with auto-sync to schedules
└── shared/
    ├── config/config.ts        # Global config (env + DB settings)
    ├── middleware/
    │   ├── auth.ts             # JWT verification, admin check, optional auth
    │   ├── passwordManager.ts  # Password hashing/comparison
    │   ├── rateLimiter.ts      # Rate limiting (general, strict, login)
    │   └── validation.ts       # Joi schemas + validate() middleware
    ├── types/types.ts          # Shared TypeScript interfaces
    └── utils/
        ├── analyzer.ts         # Schedule roster analysis (status, time windows)
        ├── dateFormatter.ts    # DD.MM.YYYY formatting utilities
        ├── logger.ts           # In-memory log store + console output
        ├── scheduleDetails.ts  # Schedule detail queries (single + batch)
        └── settingsManager.ts  # Settings load/save/reload from DB

dashboard/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (theme, fonts, toaster)
│   ├── page.tsx                # Home (calendar view)
│   ├── globals.css             # Global styles + animation tokens
│   ├── login/                  # User login
│   ├── admin/
│   │   ├── login/              # Admin login
│   │   └── page.tsx            # Admin dashboard
│   ├── user/page.tsx           # User availability portal
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
│   │   └── panels/             # Admin feature panels
│   │       ├── index.ts        # Barrel export (also re-exports shared panels)
│   │       ├── dashboard-home.tsx      # Admin dashboard home with stats cards
│   │       ├── statistics-panel.tsx    # Charts & analytics (Recharts, mobile-friendly)
│   │       ├── schedule-editor.tsx     # Edit schedule reason/focus
│   │       ├── settings-panel.tsx      # Bot configuration UI
│   │       ├── actions-panel.tsx       # Manual action triggers
│   │       ├── user-mappings-panel.tsx # Player roster manager
│   │       ├── logs-panel.tsx          # Application logs viewer
│   │       └── security-panel.tsx      # Security settings
│   ├── shared/                 # Shared across admin/user portals
│   │   ├── index.ts            # Barrel export
│   │   ├── agent-picker.tsx    # Valorant agent selector
│   │   ├── nav-user.tsx        # User navigation (sidebar user menu)
│   │   └── scrims-panel.tsx    # Match history (maps, agents, VOD)
│   ├── auth/                   # Auth components
│   │   ├── index.ts
│   │   └── login-form.tsx
│   ├── theme/                  # Theme system
│   │   ├── index.ts
│   │   ├── theme-provider.tsx
│   │   ├── theme-switcher-sidebar.tsx
│   │   └── theme-toggle.tsx
│   ├── ui/                     # Radix UI primitives (29 components)
│   │   └── accordion, alert-dialog, avatar, badge, breadcrumb,
│   │       button, card, checkbox, collapsible, command, dialog,
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
│           ├── user-schedule-content.tsx    # Calendar view for users
│           ├── user-availability-content.tsx # Set availability (auto-save)
│           ├── user-absences-content.tsx    # Absence/vacation management
│           └── user-matches-content.tsx     # Match history (uses shared ScrimsPanel)
├── hooks/
│   └── use-mobile.ts           # Mobile breakpoint hook (768px)
├── lib/
│   ├── api.ts                  # API client (apiGet, apiPost, apiPut, apiDelete)
│   ├── auth.ts                 # JWT token management
│   ├── types.ts                # Frontend type definitions
│   ├── utils.ts                # Tailwind merge utility (cn)
│   └── animations.ts           # Animation utilities (stagger, presets, micro-interactions)
└── public/
    └── assets/
        ├── agents/             # Valorant agent icons (32 .webp files)
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
  pollDurationMinutes,        // Poll open duration (Discord-compatible: 60, 240, 480, 1440, 4320, 10080)
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
- Links Discord ID to display name, Discord username, and role (MAIN, SUB, COACH)
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

### Change Notification System
When a player's availability or a schedule reason changes, the bot can automatically detect roster status changes and post an updated schedule embed to Discord:
- **Function**: `checkAndNotifyStatusChange(date, previousStatus, clientInstance?)` in `src/bot/utils/schedule-poster.ts`
- **Trigger points**: Called fire-and-forget (`.catch()`) from:
  - `schedule.routes.ts` - After reason update (`POST /api/schedule/update-reason`) and availability update (`POST /api/schedule/update-availability`)
  - `interactive.ts` - After Discord button clicks (unavailable, time modal, week modal)
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
- `/set` - Interactive buttons to set daily availability
- `/set-week` - Set availability for all 7 upcoming days

### Admin Commands (require Discord Administrator permission)
- `/post-schedule [date]` - Manually post schedule to channel
- `/register <user> <column> <role>` - Add player to roster
- `/unregister <user>` - Remove player from roster
- `/remind [date]` - Send DM reminders to players without entry
- `/notify <type> <target> [user]` - Send notifications (info/success/warning/error to all/main/sub/coach)
- `/add-scrim <date> <opponent> <result> <score-us> <score-them> [maps] [notes]` - Log match
- `/poll <question> <options> [duration]` - Create quick poll (emoji reactions, auto-close)
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
- `schedule.repository.ts` - Schedule CRUD, `addMissingDays()`, `syncUserMappingsToSchedules()`, pagination
- `scrim.repository.ts` - Scrim CRUD, stats aggregation, date range queries
- `user-mapping.repository.ts` - Roster CRUD with auto-`sortOrder` calculation and reordering on role changes

### Services Layer
Services provide business logic on top of repositories:
- `absence.service.ts` - Absence CRUD with date validation and authorization (users manage own absences only)
- `schedule.service.ts` - Schedule analysis, availability validation (users can only edit their own unless admin), pagination
- `scrim.service.ts` - Scrim CRUD, stats, recent scrims with date sorting
- `user-mapping.service.ts` - Roster CRUD with automatic `syncUserMappingsToSchedules()` after changes

Services are class-based with singleton exports (e.g., `export const scheduleService = new ScheduleService()`).

### API Security
- **Helmet** - Security headers (CSP, HSTS, X-Frame-Options)
- **CORS** - Whitelist: localhost:3000, Railway URLs, custom DASHBOARD_URL
- **Rate limiting** - `strictApiLimiter` on settings endpoints, `loginLimiter` on auth, general `apiLimiter` on all `/api`
- **Input sanitization** - `sanitizeString()` removes `<>`, `javascript:`, event handlers
- **Validation** - Joi schemas with `validate()` middleware on: user mappings, scrims, settings, polls, notifications, branding
- Poll duration validated against Discord-compatible values only: 60, 240, 480, 1440, 4320, 10080 minutes
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
- `/` - Home page (tab-based: schedule, availability, absences, matches, statistics)
- `/login` - User login page
- `/admin/login` - Admin login page
- `/admin` - Admin dashboard (tab-based: dashboard, statistics, settings, users, schedule, scrims, actions, security, logs)
- `/user` - User portal for setting own availability
- `/auth/callback` - Discord OAuth callback handler

Admin sidebar navigation is organized into three logical groups:
- **Overview:** Dashboard, Statistics
- **Team:** Schedule, Users, Matches
- **System:** Settings, Actions, Security, Logs

### Dashboard API Proxy Layer
The dashboard includes Next.js API routes (`app/api/`) that proxy requests to the backend Express API. This avoids CORS issues for server-side operations:
- Uses `BOT_API_URL` environment variable (server-side, defaults to `http://localhost:3001`)
- Client-side components use `NEXT_PUBLIC_BOT_API_URL` to call the backend directly
- Proxy routes: bot-status, settings, discord (channels, roles), actions (schedule, remind, poll), logs
- All proxy routes use `export const dynamic = 'force-dynamic'` to disable Next.js caching

### Dashboard Component Organization
Components are organized by domain/role:
- `components/admin/` - Admin-only features (panels, layout)
  - `panels/` - Feature panels: dashboard-home, statistics, settings, schedule-editor, user-mappings, actions, logs, security
  - `layout/` - Admin layout wrapper and sidebar
- `components/user/` - User portal features (layout + pages subdirectories)
  - `layout/` - User layout wrapper and sidebar
  - `pages/` - User content pages (schedule, availability, absences, matches)
- `components/auth/` - Authentication UI
- `components/shared/` - Shared across admin/user (agent-picker, scrims-panel, nav-user)
- `components/theme/` - Theme system (theme-toggle, theme-provider, theme-switcher-sidebar)
- `components/ui/` - Radix UI primitives (29 components)

Admin panels export from `components/admin/panels/index.ts` which also re-exports shared components (ScrimsPanel, AgentSelector) for convenience.

### Statistics Panel
The `StatisticsPanel` (`components/admin/panels/statistics-panel.tsx`) provides team analytics using Recharts:
- **Team Availability Chart** - Stacked bar chart showing available/unavailable/no-response/absent players per day
- **Scrim Results** - Win/loss/draw visualization with filtering by date range and opponent
- **Current Form** - Win/loss streak display
- **Map Compositions** - Agent picks per map with collapsible details
- Mobile-responsive: uses `useIsMobile` hook, adjusts chart heights (220px mobile, 300px desktop), thins X-axis labels on mobile

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
- **user_mappings** - Master roster with discord_id, discord_username, display_name, role, sort_order
- **scrims** - Match history (opponent, result, score_us, score_them, map, match_type, our_agents, their_agents as comma-separated strings, vod_url, notes)
- **absences** - Player absence periods (user_id, start_date, end_date in DD.MM.YYYY, reason)
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
