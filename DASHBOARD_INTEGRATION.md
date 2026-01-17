# Dashboard Integration Guide

## Architecture

The dashboard communicates with the Discord bot through a REST API:

```
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│   Dashboard     │          │   Bot API       │          │  Discord Bot    │
│  (Next.js:3000) │◄────────►│ (Express:3001)  │◄────────►│   (Discord.js)  │
│                 │   HTTP   │                 │  Direct  │                 │
└─────────────────┘          └─────────────────┘          └─────────────────┘
        │                            │
        │                            │
        ▼                            ▼
  settings.json               Google Sheets
```

## Setup

### 1. Start the Bot
```bash
cd e:\DEV\schedule-bot
npm run dev
```

The bot will start on its own and launch the API server on port 3001.

### 2. Start the Dashboard
```bash
cd e:\DEV\schedule-bot\dashboard
npm run dev
```

The dashboard will be available at http://localhost:3000

## Features

### Settings Tab
- **Discord Configuration**
  - Channel ID for schedule posts
  - Ping Role ID (optional)
  
- **Scheduling Configuration**
  - Daily post time
  - Reminder hours before post
  - Timezone selection
  - Training start poll toggle

All settings are saved to `settings.json` and applied immediately.

### Actions Tab
- **Post Schedule**: Manually post schedule for any date
- **Send Reminders**: Send DMs to users without availability
- **Create Poll**: Create Discord polls from the dashboard

### Bot Status
Real-time bot status indicator showing:
- Running/Offline status
- Bot uptime
- Auto-refreshes every 10 seconds

## API Endpoints

### Bot API (Port 3001)

#### Health Check
```
GET /api/health
Response: {
  status: 'running',
  botReady: true,
  uptime: 3600
}
```

#### Post Schedule
```
POST /api/actions/schedule
Body: { date?: 'DD.MM.YYYY' }
Response: { success: true, message: '...' }
```

#### Send Reminders
```
POST /api/actions/remind
Body: { date?: 'DD.MM.YYYY' }
Response: { success: true, message: '...' }
```

#### Create Poll
```
POST /api/actions/poll
Body: {
  question: string,
  options: string[],
  duration: number
}
Response: { success: true, message: '...' }
```

### Dashboard API (Port 3000)

#### Get Settings
```
GET /api/settings
Response: Settings object
```

#### Update Settings
```
POST /api/settings
Body: Settings object
Response: { success: true }
```

## Environment Variables

### Bot (.env)
```env
DISCORD_TOKEN=...
DISCORD_GUILD_ID=...
GOOGLE_SHEET_ID=...

# Optional: Fallback if not in settings.json
DISCORD_CHANNEL_ID=...
```

### Dashboard (.env.local)
```env
# Optional: Custom bot API URL
BOT_API_URL=http://localhost:3001
```

## Production Deployment

### Build Dashboard
```bash
cd dashboard
npm run build
npm start
```

### Deploy Options
1. **Vercel** (Recommended for Dashboard)
   - Automatic deployments
   - Serverless functions
   
2. **Docker**
   - Run both bot and dashboard in containers
   
3. **PM2** (Linux/WSL)
   - Process manager for Node.js
   ```bash
   pm2 start dist/index.js --name "schedule-bot"
   pm2 start "npm start" --name "dashboard" --cwd dashboard
   ```

## Security Notes

⚠️ **Important**: 
- Never expose the bot API (port 3001) to the public internet
- Use authentication for the dashboard in production
- Keep `.env` files secure and never commit them
- Consider using environment-specific settings files

## Troubleshooting

### Dashboard shows "Offline"
1. Check if bot is running: `npm run dev` in bot directory
2. Verify API server started (check console output)
3. Check if port 3001 is available

### Actions not working
1. Verify bot has proper Discord permissions
2. Check bot console for error messages
3. Verify settings.json has correct channel IDs

### Settings not saving
1. Check file permissions on settings.json
2. Verify the path in API routes is correct
3. Check browser console for errors

## Future Enhancements

- [ ] Authentication system