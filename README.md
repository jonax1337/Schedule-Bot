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

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.9
- **Discord**: discord.js 14.25
- **API Server**: Express 5.2
- **Database ORM**: Prisma 6.2.0
- **Database**: PostgreSQL 14+
- **Scheduling**: node-cron 4.2
- **Authentication**: JWT (jsonwebtoken 9.0), bcrypt 6.0
- **Security**: Helmet, CORS, Rate Limiting (express-rate-limit)
- **Validation**: Joi 18.0

### Frontend
- **Framework**: Next.js 16.1.3 (App Router)
- **UI Library**: React 19.2.3
- **Styling**: TailwindCSS 4 (OKLCH color space)
- **Components**: shadcn/ui 2.1.8 (Radix UI Primitives)
- **Icons**: Lucide React 0.562
- **Theme**: next-themes 0.4.6 (Dark Mode)
- **Notifications**: Sonner 2.0.7
- **Animations**: tw-animate-css 1.4.0

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
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Or for development:
npx prisma migrate dev
```

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

## 🔌 API Documentation

The bot runs an Express REST API on port **3001**.

### Authentication

**JWT-based authentication**:
- Admin: Username + Password (bcrypt hashed)
- User: Username from dropdown or Discord OAuth
- Token expires: 24h
- Header: `Authorization: Bearer <token>`

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
│   ├── index.ts             # Entry point
│   ├── api/                 # Express API
│   │   ├── controllers/     # Auth, etc.
│   │   └── routes/          # API routes
│   ├── bot/                 # Discord bot
│   │   ├── client.ts        # Bot client
│   │   ├── commands/        # Slash commands
│   │   ├── events/          # Event handlers
│   │   ├── interactions/    # Buttons, modals
│   │   └── utils/           # Bot utilities
│   ├── jobs/                # Cron jobs
│   │   └── scheduler.ts     # Automation
│   ├── repositories/        # Data access (Prisma)
│   │   ├── database.repository.ts
│   │   ├── schedule.repository.ts
│   │   └── user-mapping.repository.ts
│   └── shared/              # Shared code
│       ├── config/          # Configuration
│       ├── middleware/      # Express middleware
│       └── utils/           # Utilities
├── dashboard/               # Next.js frontend
│   ├── app/                 # App router pages
│   │   ├── page.tsx         # Home (calendar)
│   │   ├── user/            # User portal
│   │   ├── admin/           # Admin panel
│   │   └── login/           # Login pages
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui
│   │   └── *.tsx            # Feature components
│   └── lib/                 # Frontend utilities
│       ├── api.ts           # API client
│       └── auth.ts          # Auth helpers
├── prisma/                  # Prisma ORM
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Migration files
├── .env                     # Environment variables
├── package.json
└── tsconfig.json
```

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

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "Add amazing feature"`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow existing code style (TypeScript strict mode)
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
