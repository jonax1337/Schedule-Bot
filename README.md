<div align="center">
  <img src="assets/logo.png" alt="Schedule Bot Logo" width="128" />
  
  <h1>Valorant Schedule Bot</h1>
  
  <p>
    <strong>A comprehensive Discord bot system for managing E-Sports team availability and scheduling</strong>
  </p>
  
  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#installation">Installation</a> •
    <a href="#discord-setup">Discord Setup</a> •
    <a href="#database">Database</a> •
    <a href="#usage">Usage</a>
  </p>
  
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
</div>

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Discord Bot Setup](#discord-bot-setup)
- [Discord OAuth Setup](#discord-oauth-setup-optional)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🎯 About

**Valorant Schedule Bot** is a full-stack scheduling solution designed specifically for E-Sports teams. It combines the familiar Discord interface with a powerful web dashboard to manage player availability, coordinate training sessions, and ensure optimal team roster planning.

### Why This Bot?

- **🔄 Dual Interface**: Discord commands for quick access + Web dashboard for detailed management
- **🧠 Smart Analysis**: Automatically calculates overlapping time windows for all available players
- **⏰ Automation**: Daily schedule posts, reminder notifications, and automated jobs
- **🗄️ Reliable Storage**: PostgreSQL database with Prisma ORM for structured, queryable data
- **👥 Role Management**: Support for main roster, substitutes, and coaches
- **🌍 Timezone-Aware**: Properly handles timezones including DST (Daylight Saving Time)
- **📱 Modern Dashboard**: Next.js 16 with React 19, TailwindCSS 4, and shadcn/ui components
- **🔒 Secure**: JWT authentication, bcrypt password hashing, rate limiting, CORS protection

---

## ✨ Features

### Discord Bot Features
- **Interactive Availability Setting**: Button-based UI for quick availability updates
- **Smart Schedule Analysis**: Detects if roster is complete, needs subs, or can't proceed
- **Time Window Calculation**: Finds common available time slots for all players
- **Week Overview**: Display next 7 days at a glance
- **Personal Schedule**: 14-day personal availability view
- **Bulk Operations**: Set entire week's availability at once
- **Reminder System**: Automated DMs to players without availability entry
- **Quick Polls**: Create custom polls with emoji reactions
- **Training Start Polls**: Vote on preferred training start times
- **Absence Management**: Plan absences in advance with automatic marking

### Dashboard Features
- **Admin Panel**: Manage configuration and restart services with one click
- **User Portal**: Self-service availability management with live database updates
- **Schedule Editor**: Spreadsheet-like editor for schedule entries
- **Scrim Manager**: Record opponents, results, VOD URLs, and notes with automatic stats
- **Live Logs**: Stream bot activity, warnings, and errors from the API server
- **User Management**: Register/unregister Discord users and sync mappings
- **Manual Actions**: Trigger posts, reminders, notifications, and polls manually
- **Responsive Design**: Works on desktop, tablet, and mobile (PWA-ready)
- **Dark Mode**: Full dark mode support with system preference detection

### Automation Features
- **Daily Schedule Posts**: Automatic posting at configured time
- **Smart Reminders**: DM notifications X hours before post time
- **Schedule Seeding**: Ensures the next 14 days exist in the database
- **Change Notifications**: Optional channel alerts when roster status improves
- **Training Polls**: Optional automatic training time voting
- **Absence Processing**: Hourly job marks absent users as unavailable

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │
│  Discord Server  │◄────────┤  Discord Bot     │
│  (User Input)    │         │  (discord.js)    │
│                  │         │                  │
└──────────────────┘         └────────┬─────────┘
                                      │
                                      │ Bot Events
                                      │ & Commands
                                      ▼
                      ┌───────────────────────────┐
                      │                           │
                      │   Node.js Backend         │
                      │   ┌─────────────────┐     │
                      │   │ Bot Logic       │     │
                      │   ├─────────────────┤     │
                      │   │ Scheduler       │     │
                      │   │ (node-cron)     │     │
                      │   ├─────────────────┤     │
                      │   │ API Server      │     │
                      │   │ (Express :3001) │     │
                      │   └─────────────────┘     │
                      └───────────┬───────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
                  ▼               ▼               ▼
         ┌────────────┐  ┌────────────┐  ┌────────────┐
         │            │  │            │  │            │
         │ PostgreSQL │  │  Next.js   │  │  Discord   │
         │  Database  │  │  Dashboard │  │  OAuth     │
         │ (Prisma)   │  │  :3000     │  │  (optional)│
         │            │  │            │  │            │
         └────────────┘  └────────────┘  └────────────┘
             │                 │
             │                 │
             └─────────────────┘
```

### Component Communication

#### 1. **Discord Bot ↔ Backend**
```typescript
// Bot receives slash command
client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    // Process command, access database via Prisma, respond
  }
});
```

#### 2. **Backend ↔ PostgreSQL Database**
```typescript
// Read schedule data
const schedule = await prisma.schedule.findUnique({
  where: { date },
  include: { players: true },
});

// Update player availability
await prisma.schedulePlayer.update({
  where: { id },
  data: { availability: "14:00-20:00" },
});

// UserMapping system links Discord ID to schedule entries
const mapping = await prisma.userMapping.findUnique({
  where: { discordId },
});
```

#### 3. **Dashboard ↔ API Server**
```typescript
// Dashboard makes REST calls to Express server
const response = await fetch(`${BOT_API_URL}/api/settings`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

// API server forwards to bot logic
app.get('/api/settings', verifyToken, async (req, res) => {
  const settings = await loadSettingsAsync();
  res.json(settings);
});
```

### API Proxy Layer

The dashboard includes Next.js API routes (`dashboard/app/api/`) that proxy certain requests to the backend Express API. This avoids CORS issues for server-side operations:

- **Server-side**: Uses `BOT_API_URL` environment variable (defaults to `http://localhost:3001`)
- **Client-side**: Uses `NEXT_PUBLIC_BOT_API_URL` to call the backend directly
- **Proxy routes**: bot-status, settings, discord (channels, roles), actions (schedule, remind, poll), logs
- **Caching**: All proxy routes use `export const dynamic = 'force-dynamic'` to disable Next.js caching

**Example Proxy Route**:
```typescript
// dashboard/app/api/settings/route.ts
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const response = await fetch(`${process.env.BOT_API_URL}/api/settings`);
  const data = await response.json();
  return NextResponse.json(data);
}
```

### Process Lifecycle

The main process follows this startup sequence (defined in `src/index.ts`):

1. **Connect to PostgreSQL** via Prisma
2. **Initialize database** if empty (create default settings, user mappings)
3. **Load settings** from PostgreSQL `settings` table
4. **Seed schedule** (ensures next 14 days of schedule entries exist)
5. **Start Discord bot** (`src/bot/client.ts`)
6. **Wait for bot 'clientReady'** event
7. **Start scheduler** (node-cron jobs for daily posts and reminders)
8. **Start Express API server** on port 3001

**Graceful shutdown** is handled via SIGINT/SIGTERM handlers that stop the scheduler and destroy the Discord client.

### Scheduler Jobs

The bot runs two scheduled cron jobs (`src/jobs/scheduler.ts`):

1. **Main Post** - Daily at `config.scheduling.dailyPostTime`, posts schedule embed to Discord
2. **Reminder** - X hours before main post (calculated from `reminderHoursBefore`), DMs players without availability entry

**Important**:
- Jobs respect `config.scheduling.timezone` for accurate scheduling
- Jobs are restarted on settings change via `restartScheduler()`
- Training Start Poll is triggered separately via bot command (`/send-training-poll`) or toggle (`/training-start-poll`), not as a cron job

### Schedule Seeding

The bot maintains a 14-day rolling window:
- On startup and daily, `addMissingDays()` ensures entries exist for next 14 days
- Each schedule entry has date (DD.MM.YYYY format), reason, focus
- Players are cloned from `user_mappings` with availability defaulting to empty string
- Users can set availability to time ranges ("14:00-20:00") or "x" for unavailable

### Settings Management

Settings are stored in PostgreSQL `settings` table as flat key-value pairs:
- Keys use dot notation: `"discord.channelId"`, `"scheduling.dailyPostTime"`
- Values are always strings, parsed to correct types on load
- Settings are cached in memory (`settingsManager.ts`) and reloaded via `reloadConfig()`
- Dashboard changes trigger `POST /api/settings` → saves to DB → calls `reloadConfig()` → restarts scheduler with new times

**Config structure in memory**:
```typescript
config.discord = {
  channelId,           // Discord channel for posts
  pingRoleId,          // Role to mention
  allowDiscordAuth     // Enable Discord OAuth
}
config.scheduling = {
  dailyPostTime,              // "HH:MM" format
  timezone,                   // IANA timezone (e.g., "Europe/Berlin")
  reminderHoursBefore,        // Send reminders X hours before post
  trainingStartPollEnabled,   // Toggle training poll feature
  pollDurationMinutes,        // Poll open duration
  cleanChannelBeforePost      // Auto-clean before posting
}
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.9
- **Discord**: discord.js 14.25
- **API Server**: Express 5.2
- **Database ORM**: Prisma 7.3 (with @prisma/adapter-pg + pg native driver)
- **Database**: PostgreSQL 14+
- **Scheduling**: node-cron 4.2
- **Authentication**: JWT (jsonwebtoken 9), bcrypt 6
- **Security**: Helmet 8, CORS, Rate Limiting (express-rate-limit)
- **Validation**: Joi 18
- **Calendar**: ical-generator 10
- **Config**: dotenv 17

### Frontend
- **Framework**: Next.js 16+ (App Router)
- **UI Library**: React 19+
- **Styling**: TailwindCSS 4
- **Components**: Radix UI Primitives (29 components)
- **Icons**: Lucide React
- **Theme**: next-themes (Dark Mode)
- **Notifications**: Sonner (toasts)
- **Command Palette**: cmdk

### Database Schema
- **schedules**: Daily schedules with date, reason, focus
- **schedule_players**: Player availability per schedule (with CASCADE delete)
- **user_mappings**: Discord ID → Dashboard user mapping
- **scrims**: Match tracking data
- **absences**: Planned absences
- **settings**: Persistent bot configuration

---

## 📦 Prerequisites

Before installation, ensure you have:

- **Node.js** v20 or higher
- **npm** or **yarn**
- **PostgreSQL** 14+ (local instance or managed service like Railway/Supabase)
- **Discord Bot Application** (see [Discord Bot Setup](#discord-bot-setup))
- **Git** (for cloning the repository)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/schedule-bot.git
cd schedule-bot
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Dashboard Dependencies

```bash
cd dashboard
npm install
cd ..
```

### 4. Create Environment File

```bash
cp .env.example .env
```

### 5. Configure Environment Variables

Edit `.env` and fill in your values (see [Configuration](#configuration))

### 6. Setup Database

See [Database Setup](#database-setup) section below

### 7. Build TypeScript

```bash
npm run build
```

### 8. Start the Bot

```bash
npm start
```

### 9. Start the Dashboard (separate terminal)

```bash
cd dashboard
npm run dev
```

---

## 🤖 Discord Bot Setup

### Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter a name (e.g., "Schedule Bot")
4. Click **"Create"**

### Step 2: Create Bot User

1. Navigate to **"Bot"** tab in the left sidebar
2. Click **"Add Bot"** → **"Yes, do it!"**
3. Under **"Token"**, click **"Reset Token"** and copy it
4. Save this token in your `.env` file as `DISCORD_TOKEN`

⚠️ **Important**: Never share your bot token publicly!

### Step 3: Configure Bot Settings

In the **"Bot"** tab:

#### Privileged Gateway Intents
Enable the following intents:
- ✅ **SERVER MEMBERS INTENT** (required for user management)
- ❌ **PRESENCE INTENT** (not required)
- ❌ **MESSAGE CONTENT INTENT** (not required - we use slash commands)

#### Bot Permissions
The bot requires the following permissions:

**Required Permissions**:
- ✅ **View Channels** - Read channel structure
- ✅ **Send Messages** - Post schedules and responses
- ✅ **Embed Links** - Send rich embeds
- ✅ **Add Reactions** - Add reactions to polls
- ✅ **Use Slash Commands** - Register and use slash commands
- ✅ **Read Message History** - Read previous messages
- ✅ **Manage Messages** - Delete old bot messages (optional, for cleanup)

**Permission Integer**: `277025508416` (or use the invite link generator)

### Step 4: Enable Slash Commands

1. Navigate to **"OAuth2"** → **"General"** tab
2. Under **"Authorization Method"**, select **"In-app Authorization"**
3. Under **"Scopes"**, select:
   - ✅ **bot**
   - ✅ **applications.commands**

### Step 5: Generate Invite Link

1. Navigate to **"OAuth2"** → **"URL Generator"** tab
2. Under **"Scopes"**, select:
   - ✅ **bot**
   - ✅ **applications.commands**
3. Under **"Bot Permissions"**, select the permissions listed above
4. Copy the generated URL at the bottom
5. Open the URL in your browser and select your server
6. Click **"Authorize"**

### Step 6: Get Guild ID

1. Open Discord
2. Enable **Developer Mode**: User Settings → App Settings → Advanced → Developer Mode
3. Right-click your server icon → **"Copy Server ID"**
4. Save this ID in your `.env` file as `DISCORD_GUILD_ID`

### Step 7: Bot Configuration in Code

The bot uses the following intents (defined in `src/bot/client.ts`):

```typescript
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,        // Access to guild information
    GatewayIntentBits.GuildMembers,  // Access to member list (required)
  ],
});
```

### Step 8: Admin Commands Permissions

Admin commands (like `/post-schedule`, `/register`, `/notify`) require **Administrator** permission in Discord. This is enforced at the command level:

```typescript
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
```

Users without Administrator permission won't see these commands.

---

## 🔐 Discord OAuth Setup (Optional)

Discord OAuth allows users to log in to the dashboard using their Discord account.

### Step 1: Enable OAuth2

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to **"OAuth2"** → **"General"** tab

### Step 2: Add Redirect URI

Under **"Redirects"**, add:
- **Development**: `http://localhost:3000/auth/callback`
- **Production**: `https://your-dashboard-url.com/auth/callback`

Click **"Save Changes"**

### Step 3: Get OAuth2 Credentials

1. Copy **"CLIENT ID"** → Save as `DISCORD_CLIENT_ID` in `.env`
2. Click **"Reset Secret"** under **"CLIENT SECRET"**
3. Copy the secret → Save as `DISCORD_CLIENT_SECRET` in `.env`

### Step 4: Configure Redirect URI

In `.env`:
```bash
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback
```

### Step 5: Enable in Dashboard

1. Start the bot and dashboard
2. Log in to admin dashboard
3. Navigate to **Settings** tab
4. Enable **"Allow Discord Auth"**
5. Click **"Save Settings"**

### OAuth Flow

```
User clicks "Login with Discord"
    ↓
Redirects to Discord OAuth
    ↓
User authorizes application
    ↓
Discord redirects to /auth/callback with code
    ↓
Backend exchanges code for access token
    ↓
Backend fetches user info from Discord API
    ↓
Backend checks if user exists in UserMapping
    ↓
Backend generates JWT token
    ↓
User is logged in to dashboard
```

---

## 🗄️ Database Setup

### PostgreSQL Installation

#### Option 1: Local PostgreSQL

**Windows**:
```bash
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**macOS**:
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Option 2: Managed Service

Use a managed PostgreSQL service:
- **Railway**: https://railway.app/ (recommended)
- **Supabase**: https://supabase.com/
- **Neon**: https://neon.tech/
- **Heroku Postgres**: https://www.heroku.com/postgres

### Database Creation

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE schedule_bot;

# Create user (optional)
CREATE USER schedule_bot_user WITH PASSWORD 'your_strong_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE schedule_bot TO schedule_bot_user;

# Exit
\q
```

### Configure DATABASE_URL

In `.env`:
```bash
DATABASE_URL="postgresql://schedule_bot_user:your_password@localhost:5432/schedule_bot?schema=public"
```

**Format**: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`

### Run Migrations

```bash
# Generate Prisma Client (outputs to custom path: src/generated/prisma)
npx prisma generate

# Run migrations (production)
npx prisma migrate deploy

# Or for development:
npx prisma migrate dev

# Push schema changes without migrations (dev only)
npx prisma db push
```

**Important**:
- Prisma client outputs to custom path: `src/generated/prisma` (not default node_modules)
- Always import from: `import { PrismaClient } from '../generated/prisma/client.js'`
- After schema changes: run `npx prisma generate` to regenerate client in custom location
- Uses `@prisma/adapter-pg` with native `pg` driver for PostgreSQL connection

### Database Schema

The migration creates the following tables:

**1. schedules**
- `id` (SERIAL PRIMARY KEY)
- `date` (TEXT UNIQUE) - Format: DD.MM.YYYY
- `reason` (TEXT) - e.g., "Off-Day"
- `focus` (TEXT) - Training focus
- `created_at`, `updated_at` (TIMESTAMP)
- **Index**: `date`

**2. schedule_players**
- `id` (SERIAL PRIMARY KEY)
- `schedule_id` (INTEGER FK → schedules.id) - CASCADE DELETE
- `user_id` (TEXT) - Discord ID
- `display_name` (TEXT)
- `role` (UserRole ENUM) - MAIN, SUB, COACH
- `availability` (TEXT) - "14:00-20:00" or "x"
- `sort_order` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)
- **Indexes**: `schedule_id`, `user_id`

**3. user_mappings**
- `id` (SERIAL PRIMARY KEY)
- `discord_id` (TEXT UNIQUE)
- `discord_username` (TEXT)
- `display_name` (TEXT)
- `role` (UserRole ENUM)
- `sort_order` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)
- **Indexes**: `discord_id`, `(role, sort_order)`

**4. absences**
- `id` (TEXT PRIMARY KEY)
- `discord_id` (TEXT)
- `username` (TEXT)
- `start_date`, `end_date` (TEXT) - Format: DD.MM.YYYY
- `reason` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)
- **Indexes**: `discord_id`, `start_date`, `end_date`

**5. scrims**
- `id` (TEXT PRIMARY KEY)
- `date` (TEXT)
- `opponent` (TEXT)
- `result` (ScrimResult ENUM) - WIN, LOSS, DRAW
- `score_us`, `score_them` (INTEGER)
- `map`, `match_type` (TEXT)
- `our_agents`, `their_agents` (TEXT)
- `vod_url`, `notes` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)
- **Index**: `date`

**6. settings**
- `id` (SERIAL PRIMARY KEY)
- `key` (TEXT UNIQUE)
- `value` (TEXT) - JSON serialized
- `createdAt`, `updatedAt` (TIMESTAMP)

### Prisma Studio (Database GUI)

```bash
npx prisma studio
```

Opens a web interface at `http://localhost:5555` to view and edit data.

### Database Backup

```bash
# Backup
pg_dump -U schedule_bot_user schedule_bot > backup.sql

# Restore
psql -U schedule_bot_user schedule_bot < backup.sql
```

---

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here

# Discord OAuth (Optional - for user authentication)
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback

# PostgreSQL Database
DATABASE_URL="postgresql://schedule_bot_user:your_password@localhost:5432/schedule_bot?schema=public"

# Admin Dashboard Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your_bcrypt_hash_here
# Generate hash: node dist/generateHash.js YOUR_PASSWORD

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_jwt_secret_here_min_32_chars

# Dashboard URL (for CORS)
DASHBOARD_URL=http://localhost:3000

# API URLs (Dashboard)
BOT_API_URL=http://localhost:3001          # Backend API URL for server-side proxy
NEXT_PUBLIC_BOT_API_URL=http://localhost:3001  # Backend API URL for client-side
```

**Environment Variables Explanation**:

- **DISCORD_TOKEN**: Bot token from Discord Developer Portal
- **DISCORD_GUILD_ID**: Server ID where bot operates
- **DISCORD_CLIENT_ID / SECRET**: For Discord OAuth (optional)
- **DISCORD_REDIRECT_URI**: OAuth callback URL
- **DATABASE_URL**: PostgreSQL connection string
- **ADMIN_USERNAME / ADMIN_PASSWORD_HASH**: Admin dashboard credentials
- **JWT_SECRET**: Random 32+ character string for JWT signing
- **DASHBOARD_URL**: Dashboard URL for production CORS (defaults to localhost:3000)
- **BOT_API_URL**: Backend API URL for dashboard server-side proxy (defaults to http://localhost:3001)
- **NEXT_PUBLIC_BOT_API_URL**: Backend API URL for dashboard client-side (defaults to http://localhost:3001)
```

### Generate Password Hash

```bash
npm run build
node dist/generateHash.js YOUR_PASSWORD
```

Copy the output hash to `ADMIN_PASSWORD_HASH` in `.env`

### Persistent Settings (PostgreSQL)

Settings are stored in the `settings` table and can be modified via:
- Dashboard Settings Panel (recommended)
- Admin API endpoints
- Direct database updates (not recommended)

**Key Settings**:
- `discord.channelId`: Discord channel for automated posts
- `discord.pingRoleId`: Role to mention in posts (optional)
- `discord.allowDiscordAuth`: Enable Discord OAuth login
- `discord.cleanChannelBeforePost`: Delete previous bot messages
- `scheduling.dailyPostTime`: Time for daily schedule post (HH:MM)
- `scheduling.timezone`: IANA timezone (e.g., "Europe/Berlin")
- `scheduling.reminderHoursBefore`: Hours before post to send reminders
- `scheduling.trainingStartPollEnabled`: Auto-create training polls
- `scheduling.changeNotificationsEnabled`: Enable roster improvement alerts

---

## 📖 Usage

### Common Development Commands

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

# Generate password hash for ADMIN_PASSWORD_HASH
node dist/generateHash.js YOUR_PASSWORD
```

### Discord Commands

#### User Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/schedule [date]` | View team availability | `/schedule 20.01.2026` |
| `/set` | Set your availability interactively | `/set` |
| `/set-week` | Set availability for next 7 days | `/set-week` |
| `/schedule-week` | Show next 7 days overview | `/schedule-week` |
| `/my-schedule` | Your personal 14-day schedule | `/my-schedule` |

#### Admin Commands (Require Administrator Permission)

| Command | Description | Example |
|---------|-------------|---------|
| `/post-schedule [date]` | Post schedule to channel | `/post-schedule` |
| `/register` | Register user and create DB mapping | `/register @user role:main` |
| `/unregister` | Remove user mapping from DB | `/unregister @user` |
| `/remind [date]` | Send reminders manually | `/remind 20.01.2026` |
| `/notify` | Send notification to players | `/notify type:info target:all` |
| `/poll` | Create quick poll | `/poll question:"Map?" options:"Bind,Haven"` |
| `/training-start-poll` | Toggle auto training polls | `/training-start-poll` |
| `/send-training-poll [date]` | Send training poll manually | `/send-training-poll` |
| `/add-scrim` | Add scrim result | `/add-scrim opponent:"Team X" result:win` |

### Dashboard Interface

#### Admin Dashboard (`/admin`)

1. **Settings Tab**: Configure all bot settings
2. **Users Tab**: Manage player registrations
3. **Schedule Tab**: Spreadsheet-like editor
4. **Scrims Tab**: Track scrim results and VOD reviews
5. **Actions Tab**: Trigger manual bot actions
6. **Security Tab**: Manage authentication settings
7. **Logs Tab**: View real-time bot logs

#### User Portal (`/user`)

1. Select your username from dropdown (or login with Discord)
2. View your next 14 days availability
3. Edit entries with time picker
4. Use checkbox + bulk edit for multiple days
5. Manage absences in advance

#### Home Page (`/`)

1. Calendar view of all players (14 days)
2. Click any date to see details
3. Quick edit your own entries
4. See team status at a glance

---

## 📸 Screenshots

### User Interface

#### Login Page
![User Login](screenshots/home-page.png)
*User login page with player selection dropdown*

![User Dropdown](screenshots/user-login-dropdown.png)
*Player selection showing Main roster, Substitutes, and Coaches*

#### Schedule Overview
![Schedule View](screenshots/user-dashboard.png)
*14-day calendar view showing player availability with status indicators*

### Admin Dashboard

#### Dashboard Home
![Admin Dashboard](screenshots/admin-dashboard-overview.png)
*Admin dashboard overview with bot status, uptime, and quick actions*

#### Settings Panel
![Settings Tab](screenshots/admin-settings-tab.png)
*Discord and scheduling configuration*

![Settings Branding](screenshots/admin-settings-tab-scrolled.png)
*Team branding and customization options*

#### User Management
![User Mappings](screenshots/admin-users-tab.png)
*Player roster management with Discord user linking*

#### Schedule Editor
![Schedule Editor](screenshots/admin-schedule-tab.png)
*14-day schedule editor with player availability matrix*

#### Match Management
![Scrims Panel](screenshots/admin-scrims-tab.png)
*Match history tracking with statistics and VOD links*

#### Bot Actions
![Actions Panel](screenshots/admin-actions-tab.png)
*Manual trigger controls for schedule posts, reminders, and polls*

![Actions Extended](screenshots/admin-actions-tab-scrolled.png)
*Additional actions: notifications, pinned messages, and channel management*

#### Security Settings
![Security Panel](screenshots/admin-security-tab.png)
*Password hash and JWT secret generators for secure authentication*

---

## 🔌 API Documentation

The bot runs an Express REST API on port **3001**.

### Authentication

**JWT-based authentication**:
- **Admin**: Username + Password (bcrypt hashed)
- **User**: Username from dropdown (no password) OR Discord OAuth flow
  - Discord OAuth requires DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_REDIRECT_URI
  - OAuth must be enabled in settings: `discord.allowDiscordAuth = true`
- **Token expires**: 24h
- **Header**: `Authorization: Bearer <token>`

**Middleware chain**: `verifyToken` → `requireAdmin` (or `optionalAuth` for public endpoints)

### API Security

- **Helmet** - Security headers (CSP, HSTS, X-Frame-Options)
- **CORS** - Whitelist: localhost:3000, Railway URLs, custom DASHBOARD_URL
- **Rate limiting** - `strictApiLimiter` on settings endpoints, `loginLimiter` on auth, general `apiLimiter` on all `/api`
- **Input sanitization** - `sanitizeString()` removes `<>`, `javascript:`, event handlers
- **Validation** - Joi schemas with `validate()` middleware on: user mappings, scrims, settings, polls, notifications
- No caching headers on API responses

### Key Endpoints

```http
# Authentication
POST /api/admin/login
POST /api/user/login
GET /api/auth/discord
GET /api/auth/discord/callback

# Settings
GET /api/settings
POST /api/settings (admin)

# Schedule
GET /api/schedule/next14
POST /api/schedule/update-availability

# User Mappings
GET /api/user-mappings
POST /api/user-mappings (admin)
DELETE /api/user-mappings/:discordId (admin)

# Discord Resources
GET /api/discord/channels (admin)
GET /api/discord/roles (admin)
GET /api/discord/members (admin, cached 5min)

# Bot Actions
POST /api/actions/schedule (admin)
POST /api/actions/remind (admin)
POST /api/actions/poll (admin)
POST /api/actions/notify (admin)

# Scrims
GET /api/scrims
POST /api/scrims
PUT /api/scrims/:id
DELETE /api/scrims/:id

# Absences
GET /api/absences
POST /api/absences
PUT /api/absences/:id
DELETE /api/absences/:id

# Monitoring
GET /api/health
GET /api/bot-status
GET /api/logs (admin)
```

---

## 🛠️ Development

### Project Structure

```
schedule-bot/
├── src/                      # Backend TypeScript
│   ├── index.ts             # Entry point (startup orchestration)
│   ├── api/
│   │   ├── server.ts        # Express app (CORS, Helmet, routes)
│   │   ├── controllers/
│   │   │   └── auth.controller.ts  # Auth logic (admin, user, Discord OAuth)
│   │   └── routes/
│   │       ├── index.ts            # Route aggregator + health/logs/schedule-details
│   │       ├── actions.routes.ts   # Manual action triggers
│   │       ├── admin.routes.ts     # Admin utilities (hash, JWT generation)
│   │       ├── auth.routes.ts      # Login, logout, OAuth endpoints
│   │       ├── discord.routes.ts   # Discord server data
│   │       ├── schedule.routes.ts  # Schedule CRUD + availability updates
│   │       ├── scrim.routes.ts     # Scrim/match CRUD + stats
│   │       ├── settings.routes.ts  # Bot settings management
│   │       └── user-mapping.routes.ts # Player roster management
│   ├── bot/
│   │   ├── client.ts        # Discord client singleton
│   │   ├── commands/        # Slash command definitions and handlers
│   │   ├── events/          # ready.event.ts, interaction.event.ts
│   │   ├── interactions/    # Buttons, modals, polls, reminders
│   │   ├── embeds/          # Discord embed builders
│   │   └── utils/
│   │       └── schedule-poster.ts  # Schedule posting logic
│   ├── jobs/
│   │   └── scheduler.ts     # node-cron job management
│   ├── repositories/        # Data access layer (Prisma queries)
│   │   ├── database.repository.ts     # Prisma client singleton
│   │   ├── database-initializer.ts    # First-run DB setup
│   │   ├── schedule.repository.ts     # Schedule queries, seeding, sync
│   │   ├── scrim.repository.ts        # Match tracking CRUD
│   │   └── user-mapping.repository.ts # Roster management
│   ├── services/            # Business logic layer
│   │   ├── schedule.service.ts        # Schedule analysis, validation
│   │   ├── scrim.service.ts           # Scrim CRUD + stats
│   │   └── user-mapping.service.ts    # Roster CRUD with auto-sync
│   └── shared/
│       ├── config/config.ts           # Global config (env + DB settings)
│       ├── middleware/
│       │   ├── auth.ts                # JWT verification, admin check
│       │   ├── passwordManager.ts     # Password hashing/comparison
│       │   ├── rateLimiter.ts         # Rate limiting
│       │   └── validation.ts          # Joi schemas + validate()
│       ├── types/types.ts             # Shared TypeScript interfaces
│       └── utils/
│           ├── analyzer.ts            # Schedule roster analysis
│           ├── dateFormatter.ts       # DD.MM.YYYY formatting
│           ├── logger.ts              # In-memory log store
│           ├── scheduleDetails.ts     # Schedule detail queries
│           └── settingsManager.ts     # Settings load/save/reload
├── dashboard/               # Next.js frontend
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout (theme, fonts, toaster)
│   │   ├── page.tsx         # Home (calendar view)
│   │   ├── globals.css      # Global styles + animation tokens
│   │   ├── login/           # User login
│   │   ├── admin/
│   │   │   ├── login/       # Admin login
│   │   │   └── page.tsx     # Admin dashboard
│   │   ├── user/page.tsx    # User availability portal
│   │   ├── auth/callback/   # Discord OAuth handler
│   │   └── api/             # Next.js API proxy routes
│   │       ├── bot-status/  # Proxies to /api/health
│   │       ├── settings/    # Proxies to /api/settings
│   │       ├── discord/     # Proxies to /api/discord/*
│   │       ├── actions/     # Proxies to /api/actions/*
│   │       └── logs/        # Proxies to /api/logs
│   ├── components/
│   │   ├── admin/           # Admin-specific components
│   │   │   ├── layout/      # admin-layout-wrapper, admin-sidebar
│   │   │   └── panels/      # Dashboard panels (settings, actions, etc.)
│   │   ├── shared/          # Shared across admin/user
│   │   │   ├── agent-picker.tsx      # Valorant agent selector
│   │   │   ├── nav-user.tsx          # User navigation menu
│   │   │   └── scrims-panel.tsx      # Match history panel
│   │   ├── auth/            # Auth components (login-form)
│   │   ├── theme/           # Theme system (provider, toggle, switcher)
│   │   ├── ui/              # Radix UI primitives (29 components)
│   │   └── user/            # User portal components
│   │       ├── layout/      # user-layout-wrapper, user-sidebar
│   │       └── pages/       # User content pages
│   ├── hooks/
│   │   └── use-mobile.ts    # Mobile breakpoint hook (768px)
│   ├── lib/
│   │   ├── api.ts           # API client (apiGet, apiPost, etc.)
│   │   ├── auth.ts          # JWT token management
│   │   ├── types.ts         # Frontend type definitions
│   │   ├── utils.ts         # Tailwind merge utility (cn)
│   │   └── animations.ts    # Animation utilities (stagger, presets)
│   └── public/
│       └── assets/
│           ├── agents/      # Valorant agent icons (32 .webp files)
│           └── maps/        # Valorant map images (12 .webp files)
├── prisma/                  # Prisma ORM
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Migration files
├── .env                     # Environment variables
├── package.json
├── tsconfig.json
└── CLAUDE.md                # Project instructions for Claude Code
```

### Dashboard Component Organization

Components are organized by domain/role:

- **`components/admin/`** - Admin-only features (panels, layout)
- **`components/user/`** - User portal features
  - `layout/` - User layout wrapper and sidebar
  - `pages/` - User content pages (schedule, availability, matches)
- **`components/auth/`** - Authentication UI
- **`components/shared/`** - Shared across admin/user (agent-picker, scrims-panel, nav-user)
- **`components/theme/`** - Theme system (theme-toggle, theme-provider, theme-switcher-sidebar)
- **`components/ui/`** - Radix UI primitives (29 components)

Admin panels export from `components/admin/panels/index.ts` which also re-exports shared components (ScrimsPanel, AgentSelector) for convenience.

### Dashboard Animation System

The dashboard uses a custom animation utility system (`dashboard/lib/animations.ts`):

- **`stagger()` / `staggerList()`** - Staggered list animations with configurable speed
- **`animate()`** - Animation class builder with presets (fadeIn, slideUp, scaleIn, etc.)
- **`gridStagger()`** - 2D grid stagger patterns
- **`microInteractions`** - Hover lift, hover scale, active press, focus ring utilities
- **`presets`** - Common UI patterns (cardEntrance, modalEntrance, listItem, button, card)

Animation design tokens are defined in `dashboard/app/globals.css`.

**Example Usage**:
```typescript
import { animate, staggerList, presets } from '@/lib/animations';

// Animate a card with fade-in and slide-up
<div className={animate('fadeIn', 'slideUp')}>
  <Card>...</Card>
</div>

// Stagger children with a preset
<div className={staggerList('fast')}>
  {items.map((item, i) => (
    <div key={i} className={presets.listItem}>
      {item}
    </div>
  ))}
</div>
```

### Dashboard Caching Strategy

The dashboard aggressively disables caching for live data:

- `next.config.ts` adds `no-store, no-cache, must-revalidate` headers to all routes
- Build ID uses timestamps (`build-${Date.now()}`) for cache invalidation
- Root layout metadata includes cache-control headers
- All API proxy routes use `force-dynamic` export

### Repository Pattern

Data access is abstracted into repositories (sole data layer):

- **`database.repository.ts`** - Prisma client singleton, `connectDatabase()`, `disconnectDatabase()`
- **`database-initializer.ts`** - First-run setup: creates tables, seeds default settings and schedules
- **`schedule.repository.ts`** - Schedule CRUD, `addMissingDays()`, `syncUserMappingsToSchedules()`, pagination
- **`scrim.repository.ts`** - Scrim CRUD, stats aggregation, date range queries
- **`user-mapping.repository.ts`** - Roster CRUD with auto-`sortOrder` calculation and reordering on role changes

### Services Layer

Services provide business logic on top of repositories:

- **`schedule.service.ts`** - Schedule analysis, availability validation (users can only edit their own unless admin), pagination
- **`scrim.service.ts`** - Scrim CRUD, stats, recent scrims with date sorting
- **`user-mapping.service.ts`** - Roster CRUD with automatic `syncUserMappingsToSchedules()` after changes

Services are class-based with singleton exports (e.g., `export const scheduleService = new ScheduleService()`)

### Discord Bot Structure

- **Commands** are defined in `src/bot/commands/definitions.ts` and registered on bot ready
- **Command handlers** are split by feature: schedule, availability, poll, scrim, admin, user-management
- **`src/bot/commands/index.ts`** routes incoming interactions to the correct handler
- **Event handlers** are in `src/bot/events/` (ready.event.ts, interaction.event.ts)
- **Interactive components** (buttons, modals, polls) are in `src/bot/interactions/`
- **All schedule posting logic** is centralized in `src/bot/utils/schedule-poster.ts`

Commands use discord.js `SlashCommandBuilder` and are automatically registered on startup.

### Running in Development

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Dashboard
cd dashboard
npm run dev

# Terminal 3: Prisma Studio (optional)
npx prisma studio
```

### Building for Production

```bash
# Backend
npm run build
npm start

# Dashboard
cd dashboard
npm run build
npm start
```

### Important Development Notes

#### Module System
This project uses **ES modules** (`"type": "module"` in package.json):
- All imports must include `.js` extension even for `.ts` files (TypeScript requirement)
- Use `import` syntax, not `require()`
- `__dirname` not available - use `fileURLToPath(import.meta.url)`

#### Date Format Consistency
Always use **DD.MM.YYYY** format (e.g., "24.01.2026") when working with dates:
- Database stores dates as TEXT in this format
- `dateFormatter.ts` provides `getTodayFormatted()` and `formatDateToDDMMYYYY()`
- Never use JavaScript Date ISO strings directly in queries

#### User Mappings vs Schedule Players
- **`user_mappings` table** = master roster (who is on the team)
- **`schedule_players` table** = daily snapshots (copied from user_mappings when schedule is seeded)
- Changing a user's display name in mappings affects **future schedules only**
- After roster changes, call `syncUserMappingsToSchedules()` to update future entries
- The `UserMappingService` handles this automatically on add/update/remove

#### Settings Reload Pattern
When settings change:
1. Save to PostgreSQL via `saveSettings()`
2. Call `reloadConfig()` to update in-memory config
3. Call `restartScheduler()` to apply new cron times
4. API endpoint `/api/settings` handles this flow automatically

#### Availability Format
Player availability is stored as a string with three possible formats:
- `""` (empty) = no response yet
- `"x"` or `"X"` = unavailable for the day
- `"HH:MM-HH:MM"` = available during time window (e.g., "14:00-20:00")

#### Schedule Analysis
The analyzer (`src/shared/utils/analyzer.ts`) calculates roster status from availability data:
- **OFF_DAY**: Schedule reason indicates no training
- **FULL_ROSTER**: 5+ main players available
- **WITH_SUBS**: 4 mains available (subs fill)
- **NOT_ENOUGH**: Cannot proceed with training
- Calculates common time window (intersection of all available player windows)
- Returns `canProceed` boolean used by training start poll

#### Schedule Details
Provides frontend-friendly schedule analysis (`src/shared/utils/scheduleDetails.ts`):
- `getScheduleDetails(date)` - Single date analysis (status string, time window, player lists)
- `getScheduleDetailsBatch(dates)` - Batch multi-date analysis
- Returns status strings: "Able to play", "Almost there", "More players needed", "Insufficient players", "Off-Day", "Unknown"

#### Logger
In-memory log store (`src/shared/utils/logger.ts`):
- **Storage**: Last 500 entries accessible via `GET /api/logs`
- **Levels**: info, warn, error, success
- **Usage**: `logger.info()`, `logger.error()` etc.
- **Output**: Color-coded console output in development

---

## 🚀 Deployment

### Backend (Railway)

1. Create account on [Railway](https://railway.app/)
2. Create new project → **"Deploy from GitHub repo"**
3. Select your repository
4. Add **PostgreSQL** service
5. Set environment variables:
   - `DISCORD_TOKEN`
   - `DISCORD_GUILD_ID`
   - `DISCORD_CLIENT_ID` (if using OAuth)
   - `DISCORD_CLIENT_SECRET` (if using OAuth)
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD_HASH`
   - `JWT_SECRET`
   - `DASHBOARD_URL` (your Vercel URL)
   - `DATABASE_URL` (auto-filled by Railway)
6. Deploy

### Frontend (Vercel)

1. Create account on [Vercel](https://vercel.com/)
2. Import your repository
3. Set **Root Directory**: `dashboard`
4. Set environment variables:
   - `NEXT_PUBLIC_BOT_API_URL` (your Railway URL)
   - `BOT_API_URL` (your Railway URL)
5. Deploy

### Post-Deployment

1. Update `DASHBOARD_URL` in Railway to your Vercel URL
2. Update Discord OAuth redirect URI to your Vercel URL
3. Test bot commands in Discord
4. Access dashboard at your Vercel URL

---

## 🐛 Troubleshooting

### Bot doesn't respond to commands

1. **Check bot is online** in Discord
2. **Verify bot token** in `.env`
3. **Check bot permissions** in Discord server
4. **Ensure commands are registered** (check console logs on startup)
5. **Verify intents** are enabled in Discord Developer Portal

### Database connection fails

1. **Verify `DATABASE_URL`** format in `.env`
2. **Test connection**: `npx prisma db pull`
3. **Check PostgreSQL is running**: `pg_isready`
4. **Check firewall** allows connections on port 5432
5. **Verify credentials** are correct

### Dashboard can't connect to bot

1. **Verify API server is running** on port 3001
2. **Check `NEXT_PUBLIC_BOT_API_URL`** in dashboard `.env.local`
3. **Verify CORS** allows your dashboard URL
4. **Check browser console** for network errors

### OAuth not working

1. **Verify redirect URI** matches exactly in Discord Developer Portal
2. **Check `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`** in `.env`
3. **Enable "Allow Discord Auth"** in dashboard settings
4. **Check console logs** for OAuth errors

### Schedule not posting automatically

1. **Check scheduler is running**: `curl http://localhost:3001/api/bot-status`
2. **Verify timezone** in settings matches your location
3. **Check cron logs** in console
4. **Test manual post**: `curl -X POST http://localhost:3001/api/actions/schedule`

### Commands not auto-registering

1. **Check bot intents** in Discord Developer Portal (GUILDS and GUILD_MEMBERS required)
2. **Verify bot has APPLICATION_COMMANDS scope** when invited
3. **Check console logs** for registration errors
4. **Commands register on bot startup** - look for "Registered X commands" message

### Circular Dependency Issues

If you encounter circular dependency issues:
- Bot client is used in multiple modules (scheduler, API actions, interactions)
- Use dynamic `await import()` to break circular dependencies
- `schedule-poster.ts` re-exports from `client.ts` for backward compatibility

### TypeScript Build Errors

1. **Verify Node.js version** is 20+
2. **Check tsconfig.json** - strict mode is disabled, target is ES2022
3. **Ensure all imports use .js extension** even for .ts files (ES modules requirement)
4. **Run `npx prisma generate`** after any schema changes

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "Add amazing feature"`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- **Code Style**: TypeScript strict mode is DISABLED (`strict: false`, `noImplicitAny: false` in tsconfig.json)
- **Target**: ES2022, Module: NodeNext, ModuleResolution: NodeNext
- **Async/Await**: Use for all database operations
- **Error Handling**: try/catch with console.error + logger.error
- **Discord Embeds**: Use `EmbedBuilder` from discord.js
- **API Responses**: Follow pattern: `res.json({ success: true, data: ... })` or `res.status(400).json({ error: "message" })`
- **Frontend API**: Use `apiGet<T>()`, `apiPost<T>()` etc. from `dashboard/lib/api.ts` (auto-attaches JWT, handles 401 redirect)
- **Toasts**: Via `sonner` library (`toast.success()`, `toast.error()`)
- **Barrel Exports**: Each component directory has an `index.ts` for centralized imports
- **Services**: Class-based with singleton exports
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before submitting PR

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- [discord.js](https://discord.js.org/) - Powerful Discord API library
- [Next.js](https://nextjs.org/) - React framework for production
- [Shadcn UI](https://ui.shadcn.com/) - Beautifully designed components
- [PostgreSQL](https://www.postgresql.org/) - Reliable relational database
- [Prisma](https://www.prisma.io/) - Type-safe database ORM
- [node-cron](https://www.npmjs.com/package/node-cron) - Task scheduling
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework

---

<div align="center">
  <p>Made with ❤️ for E-Sports teams</p>
  <p>⭐ Star this repo if you find it helpful!</p>
</div>
