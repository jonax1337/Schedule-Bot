<div align="center">
  <img src="assets/logo.png" alt="Schedule Bot logo" width="100" />

  <h1>Valorant Schedule Bot</h1>

  <p>
    <strong>A comprehensive Discord bot + web dashboard for E-Sports team scheduling</strong>
  </p>

  <p>
    <a href="https://github.com/jonax1337/schedule-bot/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/jonax1337/schedule-bot?style=flat-square" alt="License" />
    </a>
    <a href="https://github.com/jonax1337/schedule-bot/releases">
      <img src="https://img.shields.io/github/v/release/jonax1337/schedule-bot?style=flat-square" alt="Release" />
    </a>
    <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square" alt="Node.js" />
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
  </p>

  <p>
    <a href="#features">Features</a> &bull;
    <a href="#quick-start">Quick Start</a> &bull;
    <a href="#architecture">Architecture</a> &bull;
    <a href="#discord-commands">Commands</a> &bull;
    <a href="#deployment">Deployment</a>
  </p>

  <br />

  <a href="https://railway.com/deploy/qEGSS2?referralCode=r1hhQd&utm_medium=integration&utm_source=template&utm_campaign=generic">
    <img src="https://railway.com/button.svg" alt="Deploy on Railway" />
  </a>
</div>

---

## Tech Stack

<p>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/TailwindCSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radixui&logoColor=white" alt="Radix UI" />
</p>

---

## About

**Valorant Schedule Bot** is a full-stack scheduling solution designed for E-Sports teams. It combines Discord's familiar interface with a powerful web dashboard to manage player availability, coordinate training sessions, track scrims, and plan strategies.

### Why This Bot?

- **Dual Interface** - Discord commands for quick access + Web dashboard for detailed management
- **Smart Analysis** - Automatically calculates overlapping time windows for all available players
- **Automation** - Daily schedule posts, reminder notifications, and automated jobs via node-cron
- **Role Management** - Support for main roster, substitutes, and coaches
- **Timezone-Aware** - Per-user timezone support with automatic time conversion
- **VOD Review** - Collaborative video analysis with timestamped comments
- **Stratbook** - Local strategy management with TipTap rich text editor
- **Secure** - JWT authentication, bcrypt password hashing, rate limiting, CORS protection

---

## Features

### Discord Bot

| Feature | Description |
|---------|-------------|
| **Interactive Availability** | Button-based UI for quick availability updates |
| **Smart Schedule Analysis** | Detects roster status (full, needs subs, can't proceed) |
| **Time Window Calculation** | Finds common available time slots |
| **Per-User Timezone** | Players set their timezone via `/set-timezone` |
| **Recurring Availability** | Set weekly default patterns that auto-apply |
| **Quick Polls** | Custom polls with countdown timer and auto-recovery |
| **Training Polls** | Vote on preferred training start times |
| **Absence Management** | Plan absences in advance with automatic marking |

### Web Dashboard

| Feature | Description |
|---------|-------------|
| **Schedule Editor** | Spreadsheet-like editor for schedule entries |
| **Scrim Manager** | Track opponents, results, VOD URLs, agent compositions |
| **VOD Review** | YouTube player with timestamped comments, filtering, mentions |
| **Statistics** | Availability charts, scrim results, win/loss streaks |
| **Stratbook** | TipTap editor with folders, map/side filtering, file uploads |
| **User Portal** | Self-service availability with live database updates |
| **Live Logs** | Stream bot activity, warnings, and errors |
| **Dark Mode** | Full dark mode with system preference detection |

### Automation

- **Daily Schedule Posts** - Automatic posting at configured time
- **Smart Reminders** - DM notifications before post time
- **Change Notifications** - Channel alerts when roster status changes
- **Schedule Seeding** - Maintains 14-day rolling window automatically

---

## Quick Start

### Prerequisites

- **Node.js** v20 or higher
- **PostgreSQL** 14+ (local or managed service)
- **Discord Bot** application ([setup guide](#discord-bot-setup))

### Installation

```bash
# Clone the repository
git clone https://github.com/jonax1337/schedule-bot.git
cd schedule-bot

# Install backend dependencies
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..

# Create environment file
cp .env.example .env
# Edit .env with your values (see Configuration section)

# Run database migrations
npx prisma migrate deploy

# Build and start
npm run build
npm start

# Start dashboard (separate terminal)
cd dashboard && npm run dev
```

### Environment Variables

```bash
# Required
DISCORD_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
DATABASE_URL=postgresql://user:pass@localhost:5432/schedule_bot
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=bcrypt_hash  # Generate: node dist/generateHash.js YOUR_PASSWORD
JWT_SECRET=random_32+_char_string

# Optional - Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback

# Optional - URLs
DASHBOARD_URL=http://localhost:3000
BOT_API_URL=http://localhost:3001
NEXT_PUBLIC_BOT_API_URL=http://localhost:3001
```

---

## Architecture

```
┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │
│  Discord Server  │◄────────┤  Discord Bot     │
│  (User Input)    │         │  (discord.js)    │
│                  │         │                  │
└──────────────────┘         └────────┬─────────┘
                                      │
                                      ▼
                      ┌───────────────────────────┐
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
                  ▼               ▼               ▼
         ┌────────────┐  ┌────────────┐  ┌────────────┐
         │ PostgreSQL │  │  Next.js   │  │  Discord   │
         │ (Prisma)   │  │  Dashboard │  │  OAuth     │
         │            │  │  :3000     │  │ (optional) │
         └────────────┘  └────────────┘  └────────────┘
```

### Project Structure

```
schedule-bot/
├── src/                      # Backend TypeScript
│   ├── index.ts              # Entry point
│   ├── api/                  # Express server + routes
│   ├── bot/                  # Discord bot (commands, events, interactions)
│   ├── jobs/                 # node-cron scheduler
│   ├── repositories/         # Prisma data access layer
│   ├── services/             # Business logic
│   └── shared/               # Config, middleware, utils
├── dashboard/                # Next.js frontend
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   │   ├── admin/            # Admin panel
│   │   ├── user/             # User portal
│   │   ├── shared/           # Shared components
│   │   └── ui/               # Radix UI primitives
│   ├── hooks/                # Custom React hooks
│   └── lib/                  # Utilities, API client, auth
├── prisma/                   # Database schema + migrations
└── assets/                   # Logo, banner images
```

---

## Discord Commands

### User Commands

| Command | Description |
|---------|-------------|
| `/schedule [date]` | View team availability for a date |
| `/schedule-week` | Show next 7 days overview |
| `/my-schedule` | Your personal 14-day schedule |
| `/set` | Set your availability interactively |
| `/set-timezone` | Set your personal timezone |
| `/set-recurring` | Set recurring weekly availability |
| `/my-recurring` | View your recurring schedule |
| `/view-scrims` | View recent match results |
| `/scrim-stats` | View win/loss statistics |

### Admin Commands

| Command | Description |
|---------|-------------|
| `/post-schedule` | Post schedule to channel |
| `/register @user` | Register user in database |
| `/unregister @user` | Remove user mapping |
| `/remind` | Send reminders manually |
| `/notify` | Send notification to players |
| `/poll` | Create quick poll |
| `/add-scrim` | Add scrim result |

---

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → Enter name → **"Create"**
3. Navigate to **"Bot"** tab → **"Add Bot"**
4. Copy the token → Save as `DISCORD_TOKEN`
5. Enable **SERVER MEMBERS INTENT** under Privileged Gateway Intents
6. Navigate to **"OAuth2"** → **"URL Generator"**
7. Select scopes: `bot`, `applications.commands`
8. Select permissions: View Channels, Send Messages, Embed Links, Add Reactions, Use Slash Commands, Read Message History
9. Open the generated URL to invite the bot
10. Copy your server ID (Developer Mode) → Save as `DISCORD_GUILD_ID`

---

## Database Setup

### Local PostgreSQL

```bash
# Create database
psql -U postgres
CREATE DATABASE schedule_bot;
\q

# Configure DATABASE_URL in .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/schedule_bot"

# Run migrations
npx prisma migrate deploy

# Optional: Open database GUI
npx prisma studio
```

### Managed Services

Works with Railway, Supabase, Neon, or any PostgreSQL provider. Just set the `DATABASE_URL` connection string.

---

## Deployment

### One-Click Deploy (Railway)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/qEGSS2?referralCode=r1hhQd&utm_medium=integration&utm_source=template&utm_campaign=generic)

Deploys Backend + Frontend + PostgreSQL automatically.

### Docker Compose

```bash
git clone https://github.com/jonax1337/schedule-bot.git
cd schedule-bot
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

### Manual Deployment

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

## Development

```bash
# Terminal 1: Backend (hot reload)
npm run dev

# Terminal 2: Dashboard
cd dashboard && npm run dev

# Terminal 3: Database GUI (optional)
npx prisma studio
```

### Key Commands

```bash
npm run build              # Build backend
npm run dev                # Dev mode (rebuild + start)
npm test                   # Run tests
npm run test:coverage      # Tests with coverage
npm run db:generate        # Regenerate Prisma client
npm run db:migrate         # Run migrations (dev)
npm run db:studio          # Open Prisma Studio
```

### Important Notes

- **ES Modules** - All imports need `.js` extension (even for .ts files)
- **Date Format** - Always use `DD.MM.YYYY` (e.g., "24.01.2026")
- **Availability Format** - Empty = no response, `"x"` = unavailable, `"HH:MM-HH:MM"` = time window

---

## API Documentation

The bot runs an Express REST API on port **3001**.

### Authentication

- JWT-based (24h expiry)
- Header: `Authorization: Bearer <token>`
- Admin login: `/api/admin/login`
- User login: `/api/user/login` or Discord OAuth

### Key Endpoints

```http
# Schedule
GET  /api/schedule/next14
POST /api/schedule/update-availability

# User Mappings
GET  /api/user-mappings
POST /api/user-mappings

# Scrims
GET  /api/scrims
POST /api/scrims
GET  /api/scrims/stats/summary

# Strategies
GET  /api/strategies
POST /api/strategies

# Actions (Admin)
POST /api/actions/schedule
POST /api/actions/remind
POST /api/actions/poll

# Monitoring
GET  /api/health
GET  /api/bot-status
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot doesn't respond | Check token, permissions, and intents in Developer Portal |
| Database connection fails | Verify `DATABASE_URL` format, test with `npx prisma db pull` |
| Dashboard can't connect | Check `NEXT_PUBLIC_BOT_API_URL`, verify API is running |
| OAuth not working | Verify redirect URI matches exactly in Developer Portal |
| Commands not registering | Ensure `GUILDS` and `GUILD_MEMBERS` intents are enabled |

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "Add amazing feature"`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Guidelines

- TypeScript strict mode is enabled
- Use async/await for all database operations
- Follow existing code style and patterns
- Add tests for new features

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- [discord.js](https://discord.js.org/) - Discord API library
- [Next.js](https://nextjs.org/) - React framework
- [Shadcn UI](https://ui.shadcn.com/) - UI components
- [Prisma](https://www.prisma.io/) - Database ORM
- [TailwindCSS](https://tailwindcss.com/) - CSS framework

---

<div align="center">
  <p>Made with ❤️ for E-Sports teams</p>
  <p>
    <a href="https://github.com/jonax1337/schedule-bot/stargazers">
      <img src="https://img.shields.io/github/stars/jonax1337/schedule-bot?style=social" alt="Stars" />
    </a>
  </p>
</div>
