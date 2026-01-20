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
    <a href="#usage">Usage</a> •
    <a href="#api-documentation">API</a> •
    <a href="#contributing">Contributing</a>
  </p>
  
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Google_Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white" alt="Google Sheets" />
</div>

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Architecture](#architecture)
  - [System Overview](#system-overview)
  - [Component Communication](#component-communication)
  - [Data Flow](#data-flow)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Backend Setup](#backend-setup)
  - [Dashboard Setup](#dashboard-setup)
  - [Google Sheets Setup](#google-sheets-setup)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Discord Commands](#discord-commands)
  - [Dashboard Interface](#dashboard-interface)
- [API Documentation](#api-documentation)
  - [REST Endpoints](#rest-endpoints)
  - [Authentication](#authentication)
  - [Request/Response Examples](#requestresponse-examples)
- [Automated Jobs](#automated-jobs)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 About

**Valorant Schedule Bot** is a full-stack scheduling solution designed specifically for E-Sports teams. It combines the familiar Discord interface with a powerful web dashboard to manage player availability, coordinate training sessions, and ensure optimal team roster planning.

### Why This Bot?

- **🔄 Dual Interface**: Discord commands for quick access + Web dashboard for detailed management
- **🧠 Smart Analysis**: Automatically calculates overlapping time windows for all available players
- **⏰ Automation**: Daily schedule posts, reminder notifications, and cleanup jobs
- **📊 Flexible Data**: Google Sheets as database - easily accessible and editable
- **👥 Role Management**: Support for main roster, substitutes, and coaches
- **🌍 Timezone-Aware**: Properly handles timezones including DST (Daylight Saving Time)

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

### Dashboard Features
- **Admin Panel**: Complete bot configuration and management
- **User Portal**: Self-service availability management for players
- **Schedule Editor**: Direct Google Sheets editing interface
- **Live Logs**: Real-time bot activity monitoring
- **User Management**: Register/unregister Discord users
- **Manual Actions**: Trigger posts, reminders, and polls manually
- **Responsive Design**: Works on desktop, tablet, and mobile

### Automation Features
- **Daily Schedule Posts**: Automatic posting at configured time
- **Smart Reminders**: Notifications X hours before post time
- **Cleanup Jobs**: Removes old entries at midnight
- **Training Polls**: Optional automatic training time voting

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                       │
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
         │  Google    │  │  Next.js   │  │  Discord   │
         │  Sheets    │  │  Dashboard │  │  OAuth     │
         │  API       │  │  :3000     │  │  (optional)│
         │            │  │            │  │            │
         └────────────┘  └────────────┘  └────────────┘
              │                 │
              │                 │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │                 │
              │  Google Sheets  │
              │  (Database)     │
              │                 │
              │  • Schedule     │
              │  • UserMapping  │
              │  • Settings     │
              │                 │
              └─────────────────┘
```

### Component Communication

#### 1. **Discord Bot ↔ Backend**
```typescript
// Bot receives slash command
client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    // Process command, access sheets, respond
  }
});
```

#### 2. **Backend ↔ Google Sheets**
```typescript
// Read schedule data
const sheetData = await getScheduleForDate(date);

// Update player availability
await updatePlayerAvailability(date, columnName, timeRange);

// UserMapping system links Discord ID to Sheet columns
const mapping = await getUserMapping(discordUserId);
```

#### 3. **Dashboard ↔ API Server**
```typescript
// Dashboard makes REST calls to Express server
const response = await fetch(`${BOT_API_URL}/api/settings`);

// API server forwards to bot logic
app.get('/api/settings', async (req, res) => {
  const settings = await loadSettingsAsync();
  res.json(settings);
});
```

#### 4. **Scheduler ↔ Bot Actions**
```typescript
// Cron job triggers bot actions
cron.schedule('0 12 * * *', async () => {
  await postScheduleToChannel();
  await sendTrainingPoll();
});
```

### Data Flow

#### Setting Availability Flow
```
User in Discord
    │
    ▼
/set command → Button "Available" → Modal (Time Input)
    │
    ▼
getUserMapping(discordId) → Returns sheetColumnName
    │
    ▼
updatePlayerAvailability(date, columnName, "14:00-20:00")
    │
    ▼
Google Sheets API → Updates cell
    │
    ▼
Confirmation message to user
```

#### Schedule Analysis Flow
```
/schedule command
    │
    ▼
getScheduleForDate(date) → Fetches row from Sheets
    │
    ▼
parseSchedule() → Converts to structured data
    │
    ▼
analyzeSchedule() → Calculates:
    • Available main roster count
    • Required subs
    • Common time window
    • Can proceed? (Yes/No)
    │
    ▼
buildScheduleEmbed() → Formats Discord embed
    │
    ▼
Send to channel with navigation buttons
```

#### Daily Automation Flow
```
Cron: 09:00 → Send reminders to users without entry
    │
    ▼
Cron: 12:00 → Post schedule to channel
    │         → Optional: Send training start poll
    ▼
Cron: 00:00 → Delete old rows (cleanup)
```

---

## 📦 Prerequisites

Before installation, ensure you have:

- **Node.js** v18 or higher
- **npm** or **yarn**
- **Discord Bot Application** (with bot token)
- **Google Cloud Project** with Sheets API enabled
- **Google Service Account** credentials (JSON file)
- **Git** (for cloning the repository)

---

## 🚀 Installation

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/schedule-bot.git
   cd schedule-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (see [Configuration](#configuration))

5. **Build TypeScript**
   ```bash
   npm run build
   ```

6. **Start the bot**
   ```bash
   npm start
   ```

### Dashboard Setup

1. **Navigate to dashboard directory**
   ```bash
   cd dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   # Create .env.local
   echo "NEXT_PUBLIC_BOT_API_URL=http://localhost:3001" > .env.local
   echo "BOT_API_URL=http://localhost:3001" >> .env.local
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

### Google Sheets Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project
   - Enable Google Sheets API

2. **Create Service Account**
   - Navigate to "IAM & Admin" → "Service Accounts"
   - Create service account
   - Create and download JSON key
   - Save as `credentials.json` in project root

3. **Create Google Sheet**
   - Create new spreadsheet
   - Copy the Sheet ID from URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Share sheet with service account email (found in credentials.json)

4. **Sheet Structure**
   
   **Main Sheet (Sheet1):**
   ```
   | Date       | Player1 | Player2 | Player3 | Player4 | Player5 | Sub1 | Sub2 | Coach | Reason | Focus |
   |------------|---------|---------|---------|---------|---------|------|------|-------|--------|-------|
   | 19.01.2026 | 14:00-20| x       | 15:00-22| ...     | ...     | ...  | ...  | ...   | ...    | ...   |
   ```

   **UserMapping Sheet:**
   ```
   | Discord ID      | Discord Username | Sheet Column Name | Role  |
   |-----------------|------------------|-------------------|-------|
   | 123456789012345 | Player1          | Player Name       | main  |
   ```

   **Settings Sheet:**
   ```
   | Key                      | Value                |
   |--------------------------|----------------------|
   | channelId                | 987654321098765432   |
   | pingRoleId               | 123456789012345678   |
   | dailyPostTime            | 12:00                |
   | timezone                 | Europe/Berlin        |
   | reminderHoursBefore      | 3                    |
   | trainingStartPollEnabled | false                |
   | allowDiscordAuth         | false                |
   | cleanChannelBeforePost   | false                |
   ```

---

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_CREDENTIALS_PATH=./credentials.json

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# Discord OAuth (Optional)
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### Persistent Settings (Google Sheets)

Settings are stored in the "Settings" sheet and can be modified via:
- Dashboard Settings Panel
- Direct sheet editing
- API calls

**Key Settings:**
- `channelId`: Discord channel for automated posts
- `pingRoleId`: Role to mention in posts (optional)
- `dailyPostTime`: Time for daily schedule post (HH:MM format)
- `timezone`: IANA timezone (e.g., "Europe/Berlin", "America/New_York")
- `reminderHoursBefore`: Hours before post to send reminders
- `trainingStartPollEnabled`: Auto-create training time polls
- `allowDiscordAuth`: Enable Discord OAuth login
- `cleanChannelBeforePost`: Delete previous bot messages before posting

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

#### Admin Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/post-schedule [date]` | Post schedule to channel | `/post-schedule` |
| `/register` | Register user for system | `/register @user column:PlayerName role:main` |
| `/unregister` | Remove user from system | `/unregister @user` |
| `/remind [date]` | Send reminders manually | `/remind 20.01.2026` |
| `/notify` | Send notification to players | `/notify type:info target:all` |
| `/poll` | Create quick poll | `/poll question:"Map?" options:"Bind,Haven,Ascent"` |
| `/training-start-poll` | Toggle auto training polls | `/training-start-poll` |
| `/send-training-poll [date]` | Send training poll manually | `/send-training-poll` |

### Dashboard Interface

#### Admin Dashboard (`/admin`)

1. **Settings Tab**: Configure all bot settings
2. **Users Tab**: Manage player registrations
3. **Schedule Tab**: Direct sheet editor with bulk operations
4. **Actions Tab**: Trigger manual bot actions
5. **Logs Tab**: View real-time bot logs

#### User Portal (`/user`)

1. Select your username from dropdown (or login)
2. View your next 14 days availability
3. Edit entries with time picker
4. Use checkbox + bulk edit for multiple days
5. Copy time from previous entries

#### Home Page (`/`)

1. Calendar view of all players
2. Filter by date
3. Quick edit your own entries
4. See team status at a glance

---

## 🔌 API Documentation

The bot runs an Express REST API on port **3001** for dashboard communication.

### REST Endpoints

#### Authentication

```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}

Response: { "success": true, "message": "Login successful" }
```

#### Settings Management

```http
# Get current settings
GET /api/settings

Response: {
  "discord": {
    "channelId": "...",
    "pingRoleId": "...",
    "allowDiscordAuth": false
  },
  "scheduling": {
    "dailyPostTime": "12:00",
    "timezone": "Europe/Berlin",
    "reminderHoursBefore": 3,
    "trainingStartPollEnabled": false,
    "cleanChannelBeforePost": false
  }
}
```

```http
# Update settings
POST /api/settings
Content-Type: application/json

{
  "discord": { ... },
  "scheduling": { ... }
}

Response: { "success": true, "message": "Settings saved and applied" }
```

#### Discord Resources

```http
# Get server channels
GET /api/discord/channels

Response: [
  { "id": "123...", "name": "general" },
  { "id": "456...", "name": "team-chat" }
]
```

```http
# Get server roles
GET /api/discord/roles

Response: [
  { "id": "789...", "name": "Team", "color": "#3498db" }
]
```

```http
# Get server members (cached 5 min)
GET /api/discord/members

Response: {
  "members": [
    {
      "id": "123...",
      "username": "player1",
      "displayName": "Player One",
      "avatar": "..."
    }
  ],
  "cached": true
}
```

#### User Management

```http
# Get all user mappings
GET /api/user-mappings

Response: {
  "success": true,
  "mappings": [
    {
      "discordId": "123...",
      "discordUsername": "player1",
      "sheetColumnName": "Player Name",
      "role": "main"
    }
  ]
}
```

```http
# Add user mapping
POST /api/user-mappings
Content-Type: application/json

{
  "discordId": "123...",
  "discordUsername": "player1",
  "sheetColumnName": "Player Name",
  "role": "main"
}

Response: { "success": true, "message": "User registered successfully" }
```

```http
# Remove user mapping
DELETE /api/user-mappings/:discordId

Response: { "success": true, "message": "User removed" }
```

#### Sheet Operations

```http
# Get sheet columns
GET /api/sheet-columns

Response: {
  "columns": [
    { "name": "Player1", "column": "B", "index": 1 },
    { "name": "Player2", "column": "C", "index": 2 }
  ]
}
```

```http
# Get sheet data range
GET /api/sheet-data?startRow=1&endRow=50

Response: {
  "data": [
    ["Date", "Player1", "Player2", ...],
    ["19.01.2026", "14:00-20:00", "x", ...]
  ]
}
```

```http
# Update cell
POST /api/sheet-data/update
Content-Type: application/json

{
  "row": 2,
  "column": "B",
  "value": "15:00-21:00"
}

Response: { "success": true, "message": "Cell updated successfully" }
```

#### Bot Actions

```http
# Post schedule to channel
POST /api/actions/schedule
Content-Type: application/json

{
  "date": "20.01.2026"  // optional, defaults to today
}

Response: { "success": true, "message": "Schedule posted" }
```

```http
# Send reminders
POST /api/actions/remind
Content-Type: application/json

{
  "date": "20.01.2026"  // optional
}

Response: { "success": true, "sent": 3 }
```

```http
# Create poll
POST /api/actions/poll
Content-Type: application/json

{
  "question": "Which map?",
  "options": ["Bind", "Haven", "Ascent"],
  "duration": 1
}

Response: { "success": true, "messageId": "..." }
```

#### Monitoring

```http
# Get bot status
GET /api/health

Response: {
  "status": "running",
  "botReady": true,
  "uptime": 3600
}
```

```http
# Get bot logs
GET /api/logs?limit=100&level=error

Response: [
  {
    "timestamp": "2026-01-19T12:00:00.000Z",
    "level": "info",
    "message": "Schedule posted",
    "details": "..."
  }
]
```

#### Bot Status

```http
# Get comprehensive bot status
GET /api/bot-status

Response: {
  "bot": {
    "ready": true,
    "username": "ScheduleBot",
    "uptime": 3600
  },
  "scheduler": {
    "running": true,
    "nextScheduledPost": "2026-01-20T12:00:00.000Z"
  },
  "sheets": {
    "connected": true
  }
}
```

### Authentication

**Admin endpoints** require basic authentication:
- Login via `/api/admin/login` first
- Dashboard stores auth state in localStorage
- API validates credentials from environment variables

**User endpoints** (future):
- Optional Discord OAuth can be enabled
- Settings: `allowDiscordAuth: true`
- Redirect flow: `/login` → Discord → `/auth/callback`

### Request/Response Examples

#### Complete Availability Update Flow

```bash
# 1. User logs into dashboard
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'

# 2. Dashboard fetches user mappings
curl http://localhost:3001/api/user-mappings

# 3. Dashboard gets sheet data
curl "http://localhost:3001/api/sheet-data?startRow=1&endRow=15"

# 4. User updates their availability
curl -X POST http://localhost:3001/api/sheet-data/update \
  -H "Content-Type: application/json" \
  -d '{
    "row": 2,
    "column": "B",
    "value": "14:00-20:00"
  }'

# 5. Dashboard refreshes to show update
curl "http://localhost:3001/api/sheet-data?startRow=1&endRow=15"
```

---

## ⏰ Automated Jobs

The bot runs scheduled tasks using `node-cron`:

### Daily Schedule Post
```typescript
// Configured time (e.g., 12:00 in Europe/Berlin)
cron.schedule('0 12 * * *', async () => {
  await postScheduleToChannel();
  if (config.scheduling.trainingStartPollEnabled) {
    await sendTrainingStartPoll();
  }
}, { timezone: config.scheduling.timezone });
```

### Reminder Notifications
```typescript
// X hours before post time (e.g., 09:00 if post is 12:00 with 3h before)
cron.schedule('0 9 * * *', async () => {
  await sendRemindersToUsersWithoutEntry(client);
}, { timezone: config.scheduling.timezone });
```

### Cleanup Job
```typescript
// Every day at midnight
cron.schedule('0 0 * * *', async () => {
  await deleteOldRows(); // Removes entries older than today
}, { timezone: config.scheduling.timezone });
```

---

## 🛠️ Development

### Project Structure

```
schedule-bot/
├── src/                      # Backend source code
│   ├── index.ts             # Entry point
│   ├── bot.ts               # Discord bot client
│   ├── scheduler.ts         # Cron jobs
│   ├── apiServer.ts         # Express REST API
│   ├── sheets.ts            # Google Sheets operations
│   ├── analyzer.ts          # Schedule analysis logic
│   ├── embed.ts             # Discord embed formatting
│   ├── interactive.ts       # Button/modal interactions
│   ├── userMapping.ts       # User mapping system
│   ├── reminder.ts          # Reminder notifications
│   ├── polls.ts             # Poll system
│   ├── auth.ts              # Discord OAuth
│   ├── logger.ts            # Logging system
│   ├── config.ts            # Configuration management
│   └── types.ts             # TypeScript types
├── dashboard/               # Next.js frontend
│   ├── app/                 # App router pages
│   │   ├── page.tsx         # Home (calendar view)
│   │   ├── user/            # User portal
│   │   ├── admin/           # Admin panel
│   │   ├── login/           # Login pages
│   │   └── api/             # API routes (proxies)
│   ├── components/          # React components
│   │   ├── ui/              # Shadcn UI components
│   │   ├── settings-panel.tsx
│   │   ├── actions-panel.tsx
│   │   ├── schedule-editor.tsx
│   │   └── ...
│   └── lib/                 # Utilities
├── credentials.json         # Google service account (gitignored)
├── .env                     # Environment variables (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

### Running in Development

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Dashboard
cd dashboard
npm run dev
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

### Code Quality

```bash
# TypeScript type checking
npm run build

# Dashboard linting
cd dashboard
npm run lint
```

---

## 🐛 Troubleshooting

### Bot doesn't respond to commands

1. **Check bot is online**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Verify bot token** in `.env`

3. **Check bot permissions** in Discord server:
   - Read Messages
   - Send Messages
   - Embed Links
   - Use Slash Commands
   - Manage Messages (for cleanup)

4. **Ensure commands are registered**
   - Commands register on bot startup
   - Check console logs for registration errors

### Google Sheets connection fails

1. **Verify credentials.json** is in project root

2. **Check service account email** has access to sheet

3. **Confirm Sheets API** is enabled in Google Cloud Console

4. **Test connection**
   - Bot tests connection on startup
   - Check console for "Google Sheets connection successful"

### Dashboard can't connect to bot

1. **Verify API server is running** (port 3001)

2. **Check CORS** is enabled (already configured)

3. **Confirm environment variables** in dashboard:
   ```bash
   NEXT_PUBLIC_BOT_API_URL=http://localhost:3001
   ```

4. **Check browser console** for network errors

### Schedule not posting automatically

1. **Check scheduler is running**
   ```bash
   curl http://localhost:3001/api/bot-status
   ```

2. **Verify timezone** in settings matches your location

3. **Check cron logs** in console

4. **Test manual post**
   ```bash
   curl -X POST http://localhost:3001/api/actions/schedule
   ```

### Time window calculation issues

1. **Verify time format**: Must be "HH:MM-HH:MM" or "HH:MM"

2. **Check for whitespace** in sheet cells

3. **Use 'x' for unavailable** (case-insensitive)

4. **Off-days**: Set Reason column to "Off-Day"

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```

4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Open a Pull Request**

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
- [Google Sheets API](https://developers.google.com/sheets/api) - Flexible data storage
- [node-cron](https://www.npmjs.com/package/node-cron) - Task scheduling

---

<div align="center">
  <p>Made with ❤️ for E-Sports teams</p>
  <p>⭐ Star this repo if you find it helpful!</p>
</div>
