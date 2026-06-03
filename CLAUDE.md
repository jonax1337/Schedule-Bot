# CLAUDE.md

## Project Overview

Discord bot + web dashboard for E-Sports team scheduling. Two deployables:
- **Backend** (Node.js): Discord bot (discord.js) + Express API (:3001) with JWT auth, all in one process
- **Dashboard** (static SPA on :3000): Vite + React + React Router v7 admin panel + user portal, served by nginx in prod

**Stack:** TypeScript, Prisma 7 (PostgreSQL), node-cron, TailwindCSS 4, Radix UI, shadcn/ui (radix-luma preset) + Efferd blocks, TipTap editor, TanStack Query, recharts

## Commands

```bash
# Development
npm install                      # Backend deps
cd dashboard && npm install      # Frontend deps
npm run dev                      # Start bot + API (:3001)
cd dashboard && npm run dev      # Start dashboard (:3000)

# Testing
npm test                         # Run all tests
npm run test:watch               # Watch mode
npm run test:coverage            # With coverage

# Database
npm run db:generate              # Regenerate Prisma client
npm run db:migrate               # Run migrations (dev)
npm run db:studio                # Open Prisma Studio
npx prisma migrate deploy        # Production migrations

# Build & Deploy
npm run build                    # Build backend
cd dashboard && npm run build    # Build frontend
npm run deploy                   # Migrate + build all
docker-compose up -d             # Docker deployment
```

## Architecture

### Startup Sequence (src/index.ts)
1. Connect PostgreSQL via Prisma
2. Initialize DB if empty (default settings, seed schedules)
3. Load settings, apply recurring availability to empty slots
4. Start Express API (:3001)
5. Start Discord bot, wait for ready
6. Start scheduler (cron jobs)

### Directory Structure
```
src/
├── index.ts                 # Entry point
├── api/
│   ├── server.ts            # Express app
│   ├── controllers/         # Auth logic
│   └── routes/              # REST endpoints (schedule, scrims, strategies, etc.)
├── bot/
│   ├── client.ts            # Discord client singleton
│   ├── commands/            # Slash command handlers
│   ├── events/              # ready, interaction handlers
│   ├── interactions/        # Buttons, modals, polls
│   └── utils/               # schedule-poster.ts (posting + notifications)
├── jobs/scheduler.ts        # node-cron management
├── repositories/            # Prisma data access layer
└── shared/
    ├── config/config.ts     # Global config
    ├── middleware/          # auth, validation, rate limiting
    └── utils/               # analyzer, dateFormatter, logger, settingsManager

dashboard/                   # Vite SPA (no Next.js)
├── index.html               # Vite entry HTML
├── vite.config.ts           # Vite + Tailwind 4 plugin + path alias
├── nginx.conf               # SPA-fallback config for prod container
└── src/
    ├── main.tsx             # Renders <App />
    ├── App.tsx              # Providers + <BrowserRouter> + <Routes>
    ├── pages/               # Route components (admin-home, user-home, login, vod-review, ...)
    ├── components/
    │   ├── shells/          # AdminShell, UserShell (wrap AppShell w/ schedule-bot nav)
    │   ├── admin/pages/     # 7 admin tab components (Dashboard, Settings, ...)
    │   ├── user/pages/      # 4 user tab components (Schedule, Availability, ...)
    │   ├── shared/          # Matches, Statistics, Stratbook, VOD review
    │   ├── auth/login-form  # User login form (Discord OAuth or player picker)
    │   ├── ui/              # shadcn primitives (radix-luma)
    │   └── app-*.tsx        # Efferd app-shell-3 building blocks (sidebar, header, ...)
    ├── hooks/               # use-mobile, use-branding, use-sidebar, use-user-discord-id
    └── lib/                 # api, auth, config, timezone, breadcrumb-context, animations, ...
```

### Key Patterns

**Settings Management:**
- Stored in `settings` table as dot-notation key-value pairs (e.g., `"discord.channelId"`)
- Two access patterns:
  - `config` export (config.ts) - Scheduler/bot core settings
  - `loadSettings()` (settingsManager.ts) - Full settings including branding, stratbook permissions
- Changes: `POST /api/settings` → saves to DB → `reloadConfig()` → `restartScheduler()`

**Repository Pattern:**
- All data access via `src/repositories/` (Prisma queries)
- Route handlers call repository functions directly; auth + validation happen in middleware/route
- Cross-cutting business logic (e.g. recurring-schedule sync after a write) is inlined in the caller

**User Mappings vs Schedule Players:**
- `user_mappings` = master roster (team members)
- `schedule_players` = daily snapshots (copied when schedule seeded)
- `syncUserMappingsToSchedules()` syncs roster changes to future entries

**Change Notifications:**
- `checkAndNotifyStatusChange()` in schedule-poster.ts
- Triggered after availability updates (API + Discord buttons)
- Posts updated embed if roster status changes (only for today, after daily post time)

## Important Gotchas

### Date Format
**Always use DD.MM.YYYY** (e.g., "24.01.2026"):
- Database stores as TEXT, not DATE type
- Use `getTodayFormatted()`, `formatDateToDDMMYYYY()` from dateFormatter.ts
- Never use ISO strings in queries

### Availability Format
```
""           = no response
"x" or "X"   = unavailable
"HH:MM-HH:MM" = time window (e.g., "14:00-20:00")
```

### Timezone Handling
- Bot timezone in settings (default: "Europe/Berlin")
- Per-user timezone in `user_mappings.user_timezone` (optional)
- User inputs converted to bot timezone before saving
- Discord displays use `<t:TIMESTAMP:t>` for automatic local conversion
- Dashboard: `TimezoneProvider` context with localStorage + settings API

### ES Modules
- Backend uses `"type": "module"` — **all backend imports need `.js` extension** (even for .ts files)
- No `__dirname` in backend — use `fileURLToPath(import.meta.url)`
- Dashboard (Vite) uses bundler resolution — extensionless imports are fine, path alias `@/*` → `src/*`

### Prisma Client
- Custom output: `src/generated/prisma`
- Import from: `import { PrismaClient } from '../generated/prisma/client.js'`
- After schema changes: `npm run db:generate`

### Circular Dependencies
- Bot client used in scheduler, API actions, interactions
- Use dynamic `await import()` if needed
- `schedule-poster.ts` re-exports from `client.ts`

## Environment Variables

**Required:**
```
DISCORD_TOKEN          # Bot token
DISCORD_GUILD_ID       # Server ID
DATABASE_URL           # PostgreSQL connection
ADMIN_USERNAME         # Dashboard admin user
ADMIN_PASSWORD_HASH    # bcrypt hash (generate: node dist/generateHash.js)
JWT_SECRET             # 32+ char random string
```

**Optional (OAuth):**
```
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI
```

**Optional (URLs):**
```
DASHBOARD_URL              # Production CORS for backend (default: localhost:3000)
BOT_API_URL                # Dashboard client-side API URL (default: http://localhost:3001)
                           # Baked into the SPA at build time via vite.config.ts `define`
                           # (no VITE_ prefix needed — read from process.env in vite.config)
```

## Database Schema

**Core Tables:**
- `schedules` - One row per date (DD.MM.YYYY), reason/focus fields
- `schedule_players` - Player availability per date
- `user_mappings` - Master roster (discord_id, display_name, role, timezone, is_admin)
- `scrims` - Match history with agents, VOD links
- `vod_comments` - Timestamped VOD comments (cascade delete with scrim)
- `absences` - Player absence periods
- `recurring_availabilities` - Weekly patterns (day_of_week 0-6)
- `strategies` / `strategy_folders` - Stratbook content
- `settings` - Key-value config store

**Enums:** `UserRole` (MAIN, SUB, COACH), `ScrimResult` (WIN, LOSS, DRAW)

## Code Style

- TypeScript strict mode enabled (backend + dashboard)
- async/await for all DB operations
- Error handling: try/catch with `logger.error()`
- API responses: `{ success: true, data: ... }` or `{ error: "message" }`
- Frontend API: `apiGet<T>()`, `apiPost<T>()` from `lib/api.ts`
- Toasts: `sonner` library
- Barrel exports in each component directory

## Testing

**Discord Bot:**
1. `npm run dev` to start
2. Bot needs permissions: View Channels, Send Messages, Embed Links, Add Reactions, Use Slash Commands
3. Commands auto-register on startup
4. Admin commands require Discord Administrator permission

**Dashboard:**
1. Start bot: `npm run dev` (:3001)
2. Start dashboard: `cd dashboard && npm run dev` (:3000)
3. Login: http://localhost:3000/admin/login

**Dashboard demo mode (no backend needed):**
- `cd dashboard && npm run dev:mock` boots the dashboard with `VITE_DEV_MODE=true`.
- `window.fetch` is intercepted and every `/api/...` call is served from a sessionStorage-backed state store (`src/lib/mock/store.ts`, seeded from `src/lib/mock/fixtures.ts`). Edits (availability toggles, settings, new scrims, strategies, absences, VOD comments) persist across reloads within the tab.
- Auth is NOT pre-filled — the user lands on `/login` and goes through the mocked auth flow (player picker, or "Continue with Discord" which round-trips through `/auth/callback`).
- A yellow banner at the top of the shell shows current user and offers Reset (wipe edits + sign out) and Sign out.

**Dashboard demo build for hosting:**
- `cd dashboard && npm run build:demo` produces a static SPA in `dist/` with the demo mock baked in. Drop the folder on Vercel / Cloudflare Pages / GitHub Pages / Netlify / any static host.
- `dashboard/vercel.json` already wires this up — push to a Vercel project pointing at the repo and it builds with `build:demo` automatically.
- Use this to demo or design without running Postgres + the Discord bot.

**Manual Triggers:**
```bash
curl -X POST http://localhost:3001/api/actions/schedule \
  -H "Authorization: Bearer YOUR_JWT"

curl -X POST http://localhost:3001/api/actions/remind \
  -H "Authorization: Bearer YOUR_JWT"
```

## Discord Commands Reference

**Public:** `/schedule`, `/schedule-week`, `/my-schedule`, `/view-scrims`, `/scrim-stats`

**Player:** `/set`, `/set-timezone`, `/remove-timezone`, `/set-recurring`, `/my-recurring`, `/clear-recurring`

**Admin:** `/post-schedule`, `/register`, `/unregister`, `/remind`, `/notify`, `/add-scrim`, `/poll`, `/training-start-poll`, `/send-training-poll`
