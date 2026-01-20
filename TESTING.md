# Testing Guide: Scrim Tracking System

## Prerequisites
- Node.js v18+ installed
- Discord Bot Token (in .env)
- Google Service Account credentials (credentials.json)
- Google Sheet ID (in .env)

## Backend Setup

1. Install dependencies:
```bash
npm install
```

2. Build TypeScript:
```bash
npm run build
```

3. Start the bot:
```bash
npm start
```

Expected output:
```
Bot is ready! Logged in as YourBot#1234
API Server listening on port 3001
Google Sheets connection successful
```

## Discord Bot Testing

### Test 1: Add Scrim
```
/add-scrim 
  date:20.01.2026 
  opponent:Team Alpha 
  result:win 
  score-us:2 
  score-them:0 
  maps:Bind, Haven 
  notes:Good teamwork
```

Expected result:
- ✅ Success message with scrim details
- ✅ Scrim appears in Google Sheets "Scrims" tab

### Test 2: View Scrims
```
/view-scrims limit:10
```

Expected result:
- 📋 Embed showing recent scrims
- ✅/❌/➖ Icons for win/loss/draw
- Score and map information displayed

### Test 3: Scrim Statistics
```
/scrim-stats
```

Expected result:
- 📊 Embed with overall record
- Win rate percentage
- Map statistics (top 5 maps)

## Dashboard Testing

1. Navigate to dashboard:
```bash
cd dashboard
npm install
npm run dev
```

2. Open http://localhost:3000/admin

3. Login with credentials from .env:
   - Username: ADMIN_USERNAME
   - Password: ADMIN_PASSWORD

### Test Dashboard Features

#### Scrims Tab
1. Click "Scrims" tab (Trophy icon)
2. Verify statistics cards show:
   - Overall Record (W-L-D)
   - Win Rate (%)
   - Maps Played count

#### Add Scrim
1. Click "Add Scrim" button
2. Fill form:
   - Date: 20.01.2026
   - Opponent: Team Beta
   - Result: Win
   - Score Us: 2
   - Score Them: 1
   - Maps: Ascent, Split
   - Notes: Close match
3. Click "Add Scrim"
4. Verify:
   - Toast notification appears
   - Scrim added to list
   - Statistics update

#### Edit Scrim
1. Click edit icon on a scrim
2. Modify details
3. Click "Update Scrim"
4. Verify changes saved

#### Delete Scrim
1. Click trash icon on a scrim
2. Confirm deletion
3. Verify scrim removed

## API Testing

### Test Endpoints with curl

#### Get All Scrims
```bash
curl http://localhost:3001/api/scrims
```

#### Add Scrim
```bash
curl -X POST http://localhost:3001/api/scrims \
  -H "Content-Type: application/json" \
  -d '{
    "date": "20.01.2026",
    "opponent": "Team Gamma",
    "result": "win",
    "scoreUs": 2,
    "scoreThem": 0,
    "maps": ["Haven", "Bind"],
    "notes": "Dominated"
  }'
```

#### Get Statistics
```bash
curl http://localhost:3001/api/scrims/stats/summary
```

## PWA Testing

### Test Installation
1. Build dashboard for production:
```bash
cd dashboard
npm run build
npm start
```

2. Open http://localhost:3000 in Chrome/Edge

3. Wait 3 seconds for install prompt

4. Click "Install Now"

5. Verify:
   - App added to home screen (desktop) or apps (mobile)
   - App opens in standalone window
   - No browser UI visible

### Test Offline Mode
1. Install app as above
2. Open DevTools > Network
3. Check "Offline" mode
4. Refresh app
5. Verify:
   - App still loads (from cache)
   - Basic UI visible
   - Offline message shown for API calls

### Test Prompt Dismissal
1. If prompt visible, click "Later"
2. Verify:
   - Prompt disappears
   - localStorage has "pwa-install-dismissed" entry
3. Wait 7 days or clear localStorage
4. Prompt should reappear

## Google Sheets Verification

### Check Scrims Sheet
1. Open your Google Sheet
2. Look for "Scrims" tab
3. Verify columns:
   - ID
   - Date
   - Opponent
   - Result
   - Score Us
   - Score Them
   - Maps
   - Notes
   - Created At
   - Updated At

### Test Data Sync
1. Add scrim via Discord bot
2. Check Google Sheets - should appear immediately
3. Add scrim via Dashboard
4. Check Google Sheets - should appear immediately
5. Edit in Google Sheets manually
6. Refresh Dashboard - should show changes

## Common Issues

### "Bot not ready" error
- Wait 5 seconds after starting bot
- Check Discord token is valid
- Verify bot has proper permissions

### "Failed to fetch scrims" error
- Ensure API server is running (port 3001)
- Check CORS settings in apiServer.ts
- Verify BOT_API_URL in .env.local

### Google Sheets errors
- Verify credentials.json is correct
- Check service account has Sheet access
- Ensure Sheets API is enabled

### PWA not prompting
- Must be served over HTTPS (or localhost)
- Chrome/Edge only (not Firefox)
- Won't prompt if already installed
- Check browser DevTools > Application > Manifest

## Success Criteria

✅ Backend builds without errors
✅ Bot connects to Discord
✅ Google Sheets connection established
✅ All 3 bot commands work
✅ Dashboard shows scrims tab
✅ Add/Edit/Delete operations work
✅ Statistics update correctly
✅ PWA install prompt appears
✅ App installs to home screen
✅ Offline caching works
✅ No security vulnerabilities
✅ Mobile responsive design

## Performance Checks

- API responses < 1 second
- Dashboard loads < 2 seconds
- Bot commands respond < 3 seconds
- No memory leaks after 1 hour
- Google Sheets API rate limits respected

## Browser Compatibility

Tested on:
- ✅ Chrome 120+
- ✅ Edge 120+
- ✅ Safari 17+ (limited PWA)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

## Notes
- First scrim addition creates the Scrims sheet automatically
- Date format must be DD.MM.YYYY
- Maps are comma-separated strings
- Statistics calculate in real-time
- PWA prompt has 7-day cooldown after dismissal
