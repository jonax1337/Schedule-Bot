# Valorant Schedule Discord Bot

A Discord bot that reads Google Sheets data and manages team availability for Valorant training sessions.

## Features

### 📊 Schedule Management
- Reads player availability from Google Sheets
- Analyzes if enough players (5+) are available
- Calculates common available time windows
- Automatically detects off-days
- Daily automatic posts at configurable time
- Automatic cleanup of old entries (14-day rolling window)
- Automatic addition of missing dates with preserved formatting

### 🎮 Interactive Discord Integration
- **Set availability directly in Discord** - No manual sheet editing required
- **Interactive buttons & modals** - User-friendly time input
- **DM-based system** - All availability queries via Direct Message
- **Date navigation** - Navigate through calendar with buttons
- **Week overview** - Compact view of next 7 days
- **Personal overview** - Each player sees their own entries
- **Smart navigation** - Buttons automatically disable when no more dates available

### ⏰ Reminder System
- Automatic reminders to players who haven't set availability
- Configurable reminder time (default: 3 hours before daily post)
- Beautiful embed notifications with action buttons
- Manual reminder command for admins

### 💬 Slash Commands
- `/schedule [date]` - Show availability with navigation buttons (ephemeral)
- `/availability` - Set your availability interactively (opens DM)
- `/schedule-week` - Week overview (ephemeral)
- `/my-schedule` - Your personal availability (ephemeral)
- `/register @user column role` - Register user for interactive system (Admin only)
- `/unregister @user` - Remove user from system (Admin only)
- `/send-reminders [date]` - Manually send reminders (Admin only)

## Setup

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Sheets API**:
   - Navigation Menu > APIs & Services > Library
   - Search for "Google Sheets API" and enable it
4. Create a Service Account:
   - Navigation Menu > APIs & Services > Credentials
   - Create Credentials > Service Account
   - Enter a name and click "Create and Continue"
   - Skip the optional steps
5. Create a JSON Key:
   - Click on the created Service Account
   - Keys > Add Key > Create new key > JSON
   - The file will be downloaded
6. Save the JSON file as `credentials.json` in the project folder
7. **Important:** Share your Google Sheet with the Service Account email (found in the JSON file under `client_email`)

### 2. Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and enter a name
3. Go to "Bot" in the sidebar
4. Click "Reset Token" and copy the token
5. Under "Privileged Gateway Intents" enable nothing (not required)
6. Go to "OAuth2" > "URL Generator"
7. Select Scopes: `bot`, `applications.commands`
8. Select Bot Permissions: `Send Messages`, `Embed Links`, `Mention Everyone` (for role ping)
9. Copy the generated URL and open it in your browser to add the bot to your server

### 3. Finding IDs

- **Guild ID (Server ID):** Right-click on the server > "Copy Server ID"
- **Channel ID:** Right-click on the channel > "Copy Channel ID"
- **Sheet ID:** From the Google Sheets URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

(First enable Developer Mode in Discord: Settings > App Settings > Advanced > Developer Mode)

### 4. Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your values in `.env`:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CHANNEL_ID=your_channel_id
   DISCORD_GUILD_ID=your_guild_id
   DISCORD_PING_ROLE_ID=your_role_id           # Optional: Role to ping
   GOOGLE_SHEET_ID=your_sheet_id
   GOOGLE_CREDENTIALS_PATH=./credentials.json
   DAILY_POST_TIME=12:00                       # Time for daily post (HH:MM)
   TIMEZONE=Europe/London                      # IANA timezone (see below)
   REMINDER_HOURS_BEFORE=3                     # Hours before post to send reminders
   ```

   **Find Role ID:** Right-click on the role in server settings > "Copy Role ID"

#### Important: Timezone Configuration

The `TIMEZONE` setting is **critical** for correct time display:

- **All times in your Google Sheet must be in this timezone**
- Use IANA timezone format (e.g., `Europe/London`, `America/New_York`)
- Discord will automatically convert times to each user's local timezone

**Common Timezones:**
- `Europe/London` - United Kingdom (GMT/BST)
- `Europe/Berlin` - Germany, most of EU (CET/CEST)
- `Europe/Paris` - France (CET/CEST)
- `America/New_York` - US East Coast (EST/EDT)
- `America/Chicago` - US Central (CST/CDT)
- `America/Los_Angeles` - US West Coast (PST/PDT)
- `Asia/Tokyo` - Japan (JST)
- `Australia/Sydney` - Australia East (AEDT/AEST)

**Full list:** [IANA Time Zone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

**Example:**
- You set `TIMEZONE=Europe/London`
- You enter `15:30-22:00` in the sheet (London time)
- User in Berlin sees: `16:30-23:00` ✅
- User in New York sees: `10:30-17:00` ✅
- User in Tokyo sees: `00:30-07:00` (next day) ✅

### 5. User Mapping Setup

For interactive features, the bot needs an additional tab in the Google Sheet:

1. Open your Google Sheet
2. Create a new tab named **"UserMapping"**
3. The tab will be automatically initialized on bot startup if it doesn't exist
4. Register players with `/register @user PlayerName main`

**Important:** The column name in `/register` must match exactly with the header in the sheet!

### 6. Google Sheet Format

**Main Sheet (Schedule):**

Dein Google Sheet muss folgende Spalten haben (in dieser Reihenfolge):

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Date | (Spieler 1) | (Spieler 2) | (Spieler 3) | (Spieler 4) | (Spieler 5) | (Sub 1) | (Sub 2) | (Coach) | Reason | Focus |

**Player names are automatically read from the header row!**

Write the real names/gamertags of your players in the first row - these will be used in Discord messages.

**Example:**

| Date | TenZ | Shroud | Asuna | yay | Marved | Demon1 | Zekken | FNS | Reason | Focus |
|------|------|--------|-------|-----|--------|--------|--------|-----|--------|-------|
| 15.01.2026 | 14:00-22:00 | 15:00-21:00 | x | 14:00-20:00 | 16:00-23:00 | 14:00-19:00 | x | 15:00-21:00 | Scrim | Site Executes |
| 16.01.2026 | | | | | | | | | Off-Day | |

**Time format:** `HH:MM-HH:MM` (e.g. `14:00-20:00`)
**Not available:** Empty cell or `x`
**Off-Day:** "Off-Day" or "Off" in the Reason column

**UserMapping Sheet:**

This sheet is automatically created and managed by the bot. It stores the mapping between Discord users and sheet columns:

| Discord ID | Discord Username | Sheet Column Name | Role |
|------------|------------------|-------------------|------|
| 123456789 | jonax | TenZ | main |

**Roles:** `main` (main roster), `sub` (substitute), `coach` (coach - no reminders)

### 7. Start the Bot

```bash
# Install dependencies (if not already done)
npm install

# Compile TypeScript
npm run build

# Start bot
npm start
```

Or for development:
```bash
npm run dev
```

## Usage

### Interactive Commands

**For all players:**
```
/schedule [date]     - Show availability with navigation buttons
/availability        - Set your availability (opens DM)
/schedule-week       - Show next 7 days
/my-schedule         - Your personal overview
```

**For admins:**
```
/register @user PlayerName main  - Register user
/unregister @user                - Remove user
/send-reminders [date]           - Manually send reminders
```

### Setting Availability

1. Use `/availability` command
2. Select a date from the dropdown
3. Click **"Available"** to enter your time range (e.g., `14:00` to `22:00`)
4. Click **"Not Available"** to mark yourself as unavailable
5. Your availability is immediately saved to the Google Sheet

### Automatic Features

- **Daily Posts:** Bot posts availability to the configured channel at the set time
- **Reminders:** Players without availability entries receive DM reminders (configurable hours before post)
- **Cleanup:** Old entries (>14 days) are automatically removed at midnight
- **Date Management:** Missing dates are automatically added with proper formatting

## Projektstruktur

```
schedule-bot/
├── src/
│   ├── index.ts         # Entry point
│   ├── bot.ts           # Discord bot & commands
│   ├── sheets.ts        # Google Sheets integration
│   ├── sheetUpdater.ts  # Google Sheets update functions
│   ├── userMapping.ts   # User registration system
│   ├── interactive.ts   # Interactive components (buttons, modals)
│   ├── reminder.ts      # Reminder system
│   ├── scheduler.ts     # Cron jobs (posts, reminders, cleanup)
│   ├── analyzer.ts      # Availability analysis logic
│   ├── embed.ts         # Discord embed builder
│   ├── types.ts         # TypeScript interfaces
│   └── config.ts        # Configuration
├── .env.example
├── credentials.json     # Google Service Account Key (don't commit!)
├── README.md
├── package.json
└── tsconfig.json
```

## Player Names

Player names are automatically read from the **header row (row 1)** of your Google Sheet. Simply change the names in the first row of the sheet - the new names will be used on the next fetch.

## Key Features Explained

### Date Normalization
All dates are displayed in consistent `DD.MM.YYYY` format with leading zeros throughout the bot (embeds, modals, confirmations, reminders).

### Smart Navigation
- Previous Day button is disabled if:
  - Date is before today
  - Date is not in the sheet
- Next Day button is disabled if:
  - Date is not in the sheet (beyond 14-day window)
- Today button is disabled if already viewing today

### Ephemeral Messages
All personal commands (`/schedule`, `/availability`, `/my-schedule`, etc.) are ephemeral - only visible to you.

### Reminder System
- Configurable timing via `REMINDER_HOURS_BEFORE` in `.env`
- Only sent to players without availability entries
- Coaches are excluded from reminders
- Beautiful embed format with action buttons

### Timezone Handling
- All times in the Google Sheet are in the configured `TIMEZONE`
- Discord automatically converts times to each user's local timezone
- Automatically handles Daylight Saving Time (DST) transitions
- Works with any IANA timezone (Europe/London, America/New_York, etc.)

## Troubleshooting

### Bot doesn't respond to commands
- Ensure bot has proper permissions in the channel
- Check if slash commands are registered (`Slash commands registered successfully!` in console)
- Verify bot token is correct

### Sheet updates don't work
- Verify the service account email has edit access to the sheet
- Check if UserMapping sheet exists and is properly formatted
- Ensure column names in `/register` match exactly with sheet headers

### Reminders not sending
- Check `REMINDER_HOURS_BEFORE` and `DAILY_POST_TIME` in `.env`
- Verify users are registered with `/register`
- Ensure bot can send DMs to users (users must share a server with the bot)

### Times showing incorrectly
- Verify `TIMEZONE` in `.env` matches the timezone you use in the Google Sheet
- All times in the sheet must be in the same timezone as configured
- Discord timestamps automatically convert to user's local timezone
- Check if DST (Daylight Saving Time) is active in your timezone
