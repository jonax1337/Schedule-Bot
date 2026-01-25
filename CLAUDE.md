# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Discord bot with web dashboard for managing E-Sports team scheduling and availability. It consists of three main components:
1. **Discord Bot** (discord.js 14.x) - Slash commands, interactive buttons, polls
2. **API Server** (Express 5.x on port 3001) - REST API with Helmet security, CORS, rate limiting
3. **Dashboard** (Next.js 16 + React 19 on port 3000) - Admin panel and user portal

All components run from a single Node.js process that starts the bot, API server, and scheduler together.

### Technology Stack
**Backend:** TypeScript 5.9, discord.js 14.25, Express 5.2, Prisma 7.3, node-cron 4.2, bcrypt 6, jsonwebtoken 9, Helmet 8
**Frontend:** Next.js 16.1, React 19.2, TailwindCSS 4, Radix UI primitives, next-themes, sonner (toasts)
**Database:** PostgreSQL via Prisma ORM

## Common Commands

### Development
```bash
# Install backend dependencies
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..

# Build TypeScript (backend only)
npm run build

# Run in development (rebuilds + starts bot + API)
npm run dev

# Run dashboard (separate terminal)
cd dashboard && npm run dev

# Build dashboard for production
cd dashboard && npm run build

# Start production (requires build first)
npm start
```

### Database Operations
```bash
# Generate Prisma client (required after schema changes)
npx prisma generate

# Run migrations in development
npx prisma migrate dev

# Deploy migrations in production
npx prisma migrate deploy

# Open database GUI
npx prisma studio

# Push schema changes without migrations (dev only)
npx prisma db push
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

### Directory Structure
```
src/
├── index.ts                    # Main entry point (startup orchestration)
├── api/
│   ├── server.ts               # Express app (CORS, Helmet, routes)
│   ├── controllers/            # Auth controller
│   └── routes/                 # All REST endpoints
├── bot/
│   ├── client.ts               # Discord client singleton
│   ├── commands/               # Slash command handlers (by feature)
│   │   ├── definitions.ts      # Command definitions (registered on ready)
│   │   ├── schedule.commands.ts
│   │   ├── availability.commands.ts
│   │   ├── poll.commands.ts
│   │   ├── scrim.commands.ts
│   │   ├── admin.commands.ts
│   │   └── user-management.commands.ts
│   ├── events/                 # ready.event.ts, interaction.event.ts
│   ├── interactions/           # Buttons, modals, polls, reminders
│   │   ├── interactive.ts      # Date navigation buttons
│   │   ├── polls.ts            # Quick poll with emoji reactions
│   │   ├── reminder.ts         # DM reminders to players
│   │   └── trainingStartPoll.ts # Auto training time poll
│   ├── embeds/                 # Discord embed builders
│   └── utils/                  # schedule-poster.ts
├── jobs/
│   └── scheduler.ts            # node-cron job management
├── repositories/               # Data access layer (Prisma queries)
│   ├── database.repository.ts  # Prisma client singleton + connect/disconnect
│   ├── database-initializer.ts # First-run DB setup (default settings, tables)
│   ├── schedule.repository.ts  # Schedule + player queries, seeding, sync
│   ├── scrim.repository.ts     # Match tracking CRUD + stats
│   └── user-mapping.repository.ts # Roster management with auto-sort
├── services/                   # Business logic (minimal, most in repos)
└── shared/
    ├── config/config.ts        # Global config (env + DB settings)
    ├── middleware/              # auth, validation, rateLimiter, passwordManager
    ├── types/types.ts          # Shared TypeScript interfaces
    └── utils/                  # dateFormatter, analyzer, settingsManager, logger

dashboard/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Home (calendar view)
│   ├── login/                  # User login
│   ├── admin/login/            # Admin login
│   ├── admin/page.tsx          # Admin dashboard
│   ├── user/page.tsx           # User availability portal
│   ├── matches/page.tsx        # Scrim history viewer
│   └── auth/callback/          # Discord OAuth handler
├── components/
│   ├── admin/                  # Admin-specific components
│   │   ├── layout/             # Admin layout components
│   │   └── panels/             # Admin feature panels
│   │       ├── dashboard-home.tsx      # Admin dashboard home with stats cards
│   │       ├── schedule-editor.tsx     # Edit schedule reason/focus
│   │       ├── settings-panel.tsx      # Bot configuration UI
│   │       ├── actions-panel.tsx       # Manual action triggers
│   │       ├── user-mappings-panel.tsx # Player roster manager
│   │       ├── logs-panel.tsx          # Application logs viewer
│   │       ├── scrims-panel.tsx        # Match history (maps, agents, VOD)
│   │       ├── security-panel.tsx      # Security settings
│   │       └── agent-picker.tsx        # Valorant agent selector
│   ├── auth/                   # Auth components
│   ├── shared/                 # Shared components (bot-status-badge, etc.)
│   ├── theme/                  # Theme components (theme-toggle)
│   ├── ui/                     # Radix UI primitives (Card, Dialog, etc.)
│   └── user/                   # User portal components
└── lib/
    ├── api.ts                  # API client (apiGet, apiPost, apiPut, apiDelete)
    ├── auth.ts                 # JWT token management
    └── types.ts                # Frontend type definitions
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

**Config structure in memory:**
```typescript
config.discord = { channelId, pingRoleId, allowDiscordAuth }
config.scheduling = {
  dailyPostTime,              // "HH:MM" format
  timezone,                   // IANA timezone (e.g., "Europe/Berlin")
  reminderHoursBefore,        // Send reminders X hours before post
  trainingStartPollEnabled,   // Toggle training poll feature
  pollDurationMinutes,        // Poll open duration
  cleanChannelBeforePost      // Auto-clean before posting
}
```

### User Mapping System
The `user_mappings` table is the single source of truth for player rosters:
- Links Discord ID to display name and role (MAIN, SUB, COACH)
- When creating schedules, players are copied from `user_mappings` to `schedule_players`
- `sort_order` determines display order in embeds and dashboard
- Changes to user mappings affect future schedules but NOT historical ones
- After modifying user mappings, `syncUserMappingsToSchedules()` syncs changes to future schedule entries

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
- `POST /api/auth/logout` - Clear session

### Schedule
- `GET /api/schedule/next14` - Next 14 days with players
- `GET /api/schedule/paginated?offset=0` - Paginated schedule (admin)
- `POST /api/schedule/update-reason` - Set reason/focus for date
- `POST /api/schedule/update-availability` - User sets own availability
- `GET /api/schedule-details?date=DD.MM.YYYY` - Single day analysis
- `GET /api/schedule-details-batch?dates=...` - Multiple dates analysis

### User Mappings
- `GET /api/user-mappings` - Get all players
- `POST /api/user-mappings` - Add player (admin)
- `PUT /api/user-mappings/:discordId` - Update player (admin)
- `DELETE /api/user-mappings/:discordId` - Remove player (admin)

### Scrims
- `GET /api/scrims` - All matches
- `GET /api/scrims/stats/summary` - Win/loss/draw statistics
- `GET /api/scrims/range/:startDate/:endDate` - Date range filter
- `GET /api/scrims/:id` - Single match
- `POST /api/scrims` - Add match (auth required)
- `PUT /api/scrims/:id` - Update (admin)
- `DELETE /api/scrims/:id` - Delete (admin)

### Settings & Actions
- `GET /api/settings` - Load all settings
- `POST /api/settings` - Save settings (admin)
- `POST /api/settings/reload-config` - Force reload (admin)
- `POST /api/actions/schedule` - Post schedule to Discord (admin)
- `POST /api/actions/remind` - Send reminders (admin)
- `POST /api/actions/poll` - Create poll (admin)
- `POST /api/actions/notify` - Send DM notification (admin)
- `POST /api/actions/clear-channel` - Clear channel messages (admin)
- `POST /api/actions/pin-message` - Send and pin message (admin)

### Discord & Admin
- `GET /api/discord/channels` - List text channels (admin)
- `GET /api/discord/roles` - List server roles (admin)
- `GET /api/discord/members` - List members (cached 5min, admin)
- `POST /api/admin/generate-password-hash` - Generate bcrypt hash
- `POST /api/admin/generate-jwt-secret` - Generate JWT secret
- `GET /api/health` - Server uptime
- `GET /api/bot-status` - Bot online/offline
- `GET /api/logs?limit=100&level=info` - Retrieve logs (admin)

## Key Architecture Decisions

### Prisma with PostgreSQL
- Schema is in `prisma/schema.prisma` with explicit table mappings (`@@map`)
- Migrations are in `prisma/migrations/` and must be run on deploy
- Date format is DD.MM.YYYY stored as TEXT (not DATE type) for consistency with legacy system
- Cascade deletes: deleting a Schedule deletes all its SchedulePlayers
- Prisma client outputs to custom path: `src/generated/prisma` (not default node_modules)
- Always import from: `import { PrismaClient } from '../generated/prisma/client.js'`
- After schema changes: run `npx prisma generate` to regenerate client in custom location

### Discord Bot Structure
- Commands are defined in `src/bot/commands/definitions.ts` and registered on bot ready
- Command handlers are split by feature: schedule, availability, poll, scrim, admin, user-management
- Event handlers are in `src/bot/events/` (ready.event.ts, interaction.event.ts)
- Interactive components (buttons, modals, polls) are in `src/bot/interactions/`
- All schedule posting logic is centralized in `src/bot/utils/schedule-poster.ts`

### Repository Pattern
Data access is abstracted into repositories (sole data layer, no legacy alternatives):
- `database.repository.ts` - Prisma client singleton, `connectDatabase()`, `disconnectDatabase()`
- `database-initializer.ts` - First-run setup: creates tables, seeds default settings and schedules
- `schedule.repository.ts` - Schedule CRUD, `addMissingDays()`, `syncUserMappingsToSchedules()`, pagination
- `scrim.repository.ts` - Scrim CRUD, stats aggregation, date range queries
- `user-mapping.repository.ts` - Roster CRUD with auto-`sortOrder` calculation and reordering on role changes

Services layer exists but is minimal - most business logic is in repositories or bot command handlers.

### API Security
- **Helmet** - Security headers (CSP, HSTS, X-Frame-Options)
- **CORS** - Whitelist: localhost:3000, Railway URLs, custom DASHBOARD_URL
- **Rate limiting** - `strictApiLimiter` on settings endpoints, `loginLimiter` on auth, general `apiLimiter` on all `/api`
- **Input sanitization** - `sanitizeString()` removes `<>`, `javascript:`, event handlers
- **Validation** - Joi schemas with `validate()` middleware on: user mappings, scrims, settings, polls, notifications
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
- `/` - Home page (calendar view of all players)
- `/login` - User login page
- `/admin/login` - Admin login page
- `/admin` - Admin dashboard (protected, admin role)
- `/user` - User portal for setting own availability
- `/matches` - Scrim/match history viewer
- `/auth/callback` - Discord OAuth callback handler

### Dashboard Component Organization
Components are organized by domain/role:
- `components/admin/` - Admin-only features (panels, layout)
- `components/user/` - User portal features
- `components/auth/` - Authentication UI
- `components/shared/` - Shared across admin/user (bot-status-badge, etc.)
- `components/theme/` - Theme system (theme-toggle)
- `components/ui/` - Radix UI primitives

All admin panels export from `components/admin/panels/index.ts` for centralized imports.

### Scheduler Jobs (src/jobs/scheduler.ts)
Two scheduled cron jobs:
1. **Main Post** - Daily at `config.scheduling.dailyPostTime`, posts schedule embed to Discord
2. **Reminder** - X hours before main post (calculated from `reminderHoursBefore`), DMs players without availability entry

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

Optional for CORS:
- `DASHBOARD_URL` - Dashboard URL for production CORS (defaults to localhost:3000)

### Logger
- In-memory log store (last 500 entries) accessible via `GET /api/logs`
- Levels: info, warn, error, success
- Use `logger.info()`, `logger.error()` etc. from `src/shared/utils/logger.ts`
- Color-coded console output in development

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
- **schedule_players** - Many rows per schedule, one per player per date, stores availability
- **user_mappings** - Master roster, defines who appears on schedules
- **scrims** - Match history (opponent, result, score, map, agents as comma-separated strings, VOD URL, notes)
- **settings** - Key-value store for bot configuration (dot-notation keys)

### Enums
- `UserRole`: MAIN, SUB, COACH
- `ScrimResult`: WIN, LOSS, DRAW

### Important Indexes
- `schedules.date` - Primary query path (unique)
- `schedule_players.schedule_id` and `schedule_players.user_id` - Join optimization
- `user_mappings.discord_id` - Unique constraint prevents duplicates

### Scrim ID Format
Scrims use custom IDs: `scrim_${timestamp}_${random}` (string, not auto-increment)

## Code Style

- TypeScript strict mode is DISABLED (`strict: false` in tsconfig.json)
- Use async/await for all database operations
- Error handling: try/catch with console.error + logger.error
- Discord embeds use `EmbedBuilder` from discord.js
- API responses follow pattern: `res.json({ success: true, data: ... })` or `res.status(400).json({ error: "message" })`
- Frontend uses `apiGet<T>()`, `apiPost<T>()` etc. from `dashboard/lib/api.ts` (auto-attaches JWT, handles 401 redirect)
- Toasts via `sonner` library (`toast.success()`, `toast.error()`)
