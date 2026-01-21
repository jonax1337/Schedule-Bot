# Valorant Schedule Bot - Vollständige Projektdokumentation

> **Ziel dieser Dokumentation**: Diese Datei ermöglicht es zukünftigen KI-Instanzen, das Projekt sofort zu verstehen und optimalen Output zu liefern.

---

## 📋 Inhaltsverzeichnis

1. [Projektübersicht](#projektübersicht)
2. [Systemarchitektur](#systemarchitektur)
3. [Technologie-Stack](#technologie-stack)
4. [Datenflüsse](#datenflüsse)
5. [Backend-Komponenten](#backend-komponenten)
6. [Dashboard-Komponenten](#dashboard-komponenten)
7. [Google Sheets Integration](#google-sheets-integration)
8. [Discord Bot Integration](#discord-bot-integration)
9. [API-Endpunkte](#api-endpunkte)
10. [Automatisierung & Scheduler](#automatisierung--scheduler)
11. [Deployment & Konfiguration](#deployment--konfiguration)

---

## 🎯 Projektübersicht

### Was ist das Projekt?

Ein vollständiges Scheduling-System für E-Sports Teams (speziell Valorant), das Discord Bot, Web Dashboard und Google Sheets als Datenbank kombiniert.

### Hauptfunktionen

1. **Verfügbarkeitsmanagement**: Spieler setzen ihre Verfügbarkeit für Training
2. **Automatische Analyse**: Berechnet gemeinsame Zeitfenster für alle verfügbaren Spieler
3. **Dual-Interface**: Discord-Befehle + Web-Dashboard
4. **Automatisierung**: Tägliche Posts, Erinnerungen, Cleanup-Jobs
5. **Scrim-Tracking**: Verwaltung von Trainingsspielen und Statistiken
6. **Roster-Management**: Hauptkader, Ersatzspieler, Coaches

### Kernproblem das gelöst wird

E-Sports Teams müssen koordinieren, wann alle Spieler verfügbar sind. Das System:
- Sammelt Verfügbarkeiten
- Findet überlappende Zeitfenster
- Benachrichtigt automatisch
- Zeigt Status in Echtzeit

---

## 🏗️ Systemarchitektur

### Gesamtübersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │         │              │         │              │
│   Discord    │◄────────┤  Discord.js  │────────►│   Node.js    │
│   Server     │         │     Bot      │         │   Backend    │
│              │         │              │         │              │
└──────────────┘         └──────────────┘         └──────┬───────┘
                                                          │
                         ┌────────────────────────────────┼────────┐
                         │                                │        │
                         ▼                                ▼        ▼
                  ┌─────────────┐                 ┌─────────────┐ │
                  │             │                 │             │ │
                  │  Next.js    │◄────REST────────┤  Express    │ │
                  │  Dashboard  │     API         │  API Server │ │
                  │  (Port 3000)│                 │  (Port 3001)│ │
                  │             │                 │             │ │
                  └─────────────┘                 └──────┬──────┘ │
                         │                               │        │
                         │                               ▼        ▼
                         │                        ┌──────────────────┐
                         │                        │                  │
                         └───────────────────────►│  Google Sheets   │
                                                  │    (Database)    │
                                                  │                  │
                                                  │  • Schedule      │
                                                  │  • UserMapping   │
                                                  │  • Settings      │
                                                  │  • Matches       │
                                                  │                  │
                                                  └──────────────────┘
```

### Komponenten-Interaktion

1. **Discord Bot** → Empfängt Slash-Commands, sendet Embeds
2. **Backend** → Verarbeitet Logik, greift auf Sheets zu
3. **Express API** → REST-Schnittstelle für Dashboard
4. **Next.js Dashboard** → Web-Interface für Admins/User
5. **Google Sheets** → Persistente Datenspeicherung
6. **Scheduler (node-cron)** → Automatisierte Tasks

---

## 💻 Technologie-Stack

### Backend (Node.js + TypeScript)

```json
{
  "discord.js": "^14.25.1",      // Discord Bot Framework
  "googleapis": "^170.0.0",      // Google Sheets API
  "express": "^5.2.1",           // REST API Server
  "node-cron": "^4.2.1",         // Task Scheduling
  "dotenv": "^17.2.3",           // Environment Variables
  "ical-generator": "^10.0.0",   // iCal Export (future)
  "cors": "^2.8.5"               // CORS für API
}
```

### Frontend (Next.js + React)

```json
{
  "next": "16.1.3",              // React Framework
  "react": "19.2.3",             // UI Library
  "tailwindcss": "^4",           // Styling
  "shadcn/ui": "^2.1.8",         // UI Components
  "lucide-react": "^0.562.0",    // Icons
  "next-themes": "^0.4.6",       // Dark/Light Mode
  "sonner": "^2.0.7"             // Toast Notifications
}
```

### Datenbank

- **Google Sheets API v4** als Datenbank
- 4 Sheets:
  - `Sheet1` (Schedule): Hauptdaten
  - `UserMapping`: Discord ID → Sheet Column
  - `Settings`: Bot-Konfiguration
  - `Matches`: Scrim-Tracking

---

## 🔄 Datenflüsse

### 1. Verfügbarkeit setzen (Discord → Sheets)

```
User in Discord
    │
    ▼
/set Command → Button "Available" → Modal (Zeit-Eingabe)
    │
    ▼
getUserMapping(discordId)
    │ Returns: { sheetColumnName: "Player1", role: "main" }
    ▼
updatePlayerAvailability(date, "Player1", "14:00-20:00")
    │
    ▼
Google Sheets API → Update Cell B2 = "14:00-20:00"
    │
    ▼
invalidateCache(date) → Preload fresh data
    │
    ▼
checkAndNotifyStatusChange(date) → Notify if status improved
    │
    ▼
Confirmation Message → User
```

### 2. Schedule anzeigen (Discord → Sheets → Analysis)

```
/schedule Command
    │
    ▼
getScheduleForDate(date)
    │ Fetches row from Google Sheets
    ▼
parseSchedule(sheetData)
    │ Converts to structured PlayerAvailability objects
    ▼
analyzeSchedule(schedule)
    │ Calculates:
    │  • Available main roster count
    │  • Required subs
    │  • Common time window (overlapping times)
    │  • Can proceed? (Yes/No)
    ▼
buildScheduleEmbed(result)
    │ Creates Discord Embed with:
    │  • Player list with times
    │  • Status (Full Roster / With Subs / Not Enough)
    │  • Common time window
    ▼
Send to Discord with navigation buttons
```

### 3. Dashboard → API → Sheets

```
Dashboard (Browser)
    │
    ▼
HTTP Request → Express API (Port 3001)
    │
    ▼
API Endpoint Handler
    │
    ▼
Google Sheets API Call
    │
    ▼
Response → Dashboard
    │
    ▼
UI Update
```

### 4. Automatisierung (Cron → Bot Actions)

```
Cron Job (09:00) → sendRemindersToUsersWithoutEntry()
    │
    ▼
Check Google Sheets for empty cells
    │
    ▼
Send DM to users without entry
    │
    ▼
Log results

Cron Job (12:00) → postScheduleToChannel()
    │
    ▼
Fetch schedule → Analyze → Post to Discord
    │
    ▼
Optional: createTrainingStartPoll()

Cron Job (00:00) → deleteOldRows()
    │
    ▼
Delete rows older than today
    │
    ▼
Add missing days (next 14 days)
    │
    ▼
Sort sheet by date
```

---

## 🔧 Backend-Komponenten

### Dateistruktur

```
src/
├── index.ts              # Entry Point, startet alle Services
├── bot.ts                # Discord Bot Client & Command Handler
├── scheduler.ts          # Cron Jobs für Automatisierung
├── apiServer.ts          # Express REST API
├── config.ts             # Konfiguration & Environment Variables
├── types.ts              # TypeScript Type Definitions
│
├── sheets.ts             # Google Sheets API Wrapper
├── analyzer.ts           # Schedule Analysis Logic
├── embed.ts              # Discord Embed Builder
├── interactive.ts        # Discord Buttons, Modals, Menus
│
├── userMapping.ts        # Discord ID ↔ Sheet Column Mapping
├── reminder.ts           # Reminder DM System
├── polls.ts              # Quick Poll System
├── trainingStartPoll.ts  # Training Start Time Polls
├── scrims.ts             # Scrim/Match Tracking
│
├── sheetUpdater.ts       # Sheet Update Operations
├── bulkOperations.ts     # Bulk Availability Updates
├── scheduleCache.ts      # In-Memory Cache für Performance
├── changeNotifier.ts     # Status Change Notifications
│
├── settingsManager.ts    # Settings Persistence
├── logger.ts             # Logging System
└── auth.ts               # Discord OAuth (optional)
```

### Kernkomponenten im Detail

#### 1. **index.ts** - Entry Point

```typescript
async function main() {
  // 1. Test Google Sheets Connection
  await testConnection();
  
  // 2. Load Settings from Google Sheets
  await reloadConfig();
  
  // 3. Run Cleanup (delete old rows, add missing days)
  await deleteOldRows();
  
  // 4. Start Discord Bot
  await startBot();
  
  // 5. Start Scheduler (Cron Jobs)
  startScheduler();
  
  // 6. Start API Server (Express)
  startApiServer();
}
```

**Wichtig**: Reihenfolge ist kritisch! Sheets muss vor Bot bereit sein.

#### 2. **bot.ts** - Discord Bot

**Slash Commands**:
- `/schedule [date]` - Zeigt Team-Verfügbarkeit
- `/set` - Setzt eigene Verfügbarkeit (interaktiv)
- `/set-week` - Setzt ganze Woche auf einmal
- `/schedule-week` - Zeigt nächste 7 Tage
- `/my-schedule` - Zeigt eigene 14-Tage-Übersicht
- `/post-schedule [date]` - Postet Schedule (Admin)
- `/register @user column:Name role:main` - Registriert User (Admin)
- `/unregister @user` - Entfernt User (Admin)
- `/remind [date]` - Sendet Erinnerungen (Admin)
- `/notify type:info target:all` - Sendet Benachrichtigung (Admin)
- `/poll question:"?" options:"A,B,C"` - Erstellt Poll (Admin)
- `/training-start-poll` - Toggle Training Polls (Admin)
- `/add-scrim` - Fügt Scrim hinzu (Admin)
- `/view-scrims` - Zeigt Scrims
- `/scrim-stats` - Zeigt Statistiken

**Event Handler**:
```typescript
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    // Handle Slash Commands
  } else if (interaction.isButton()) {
    // Handle Button Clicks
  } else if (interaction.isStringSelectMenu()) {
    // Handle Select Menus
  } else if (interaction.isModalSubmit()) {
    // Handle Modal Submissions
  }
});
```

#### 3. **sheets.ts** - Google Sheets Integration

**Hauptfunktionen**:

```typescript
// Holt Schedule für ein Datum
async function getScheduleForDate(date?: string): Promise<SheetData | null>

// Holt alle Spalten (Player-Namen)
async function getSheetColumns(): Promise<Array<{column, name, index}>>

// Updated eine Zelle
async function updateSheetCell(row: number, column: string, value: string)

// Löscht alte Zeilen, fügt fehlende Tage hinzu
async function deleteOldRows(): Promise<number>

// Settings Management
async function getSettingsFromSheet(): Promise<SheetSettings>
async function saveSettingsToSheet(settings: SheetSettings)
```

**Sheet-Struktur**:

```
Sheet1 (Schedule):
| Date       | Player1     | Player2 | Player3 | Player4 | Player5 | Sub1 | Sub2 | Coach | Reason  | Focus        |
|------------|-------------|---------|---------|---------|---------|------|------|-------|---------|--------------|
| 19.01.2026 | 14:00-20:00 | x       | 15:00-22| 14:00-23| 15:00-22| ...  | ...  | ...   | Scrim   | Site Executes|

UserMapping:
| Discord ID      | Discord Username | Sheet Column Name | Role  |
|-----------------|------------------|-------------------|-------|
| 123456789012345 | Player1          | Player Name       | main  |

Settings:
| Key                      | Value                |
|--------------------------|----------------------|
| discord.channelId        | 987654321098765432   |
| scheduling.dailyPostTime | 12:00                |

Matches (Scrims):
| ID      | Date       | Opponent | Result | Score Us | Score Them | Maps | ... |
|---------|------------|----------|--------|----------|------------|------|-----|
| scrim_1 | 19.01.2026 | Team X   | win    | 13       | 11         | Bind | ... |
```

#### 4. **analyzer.ts** - Schedule Analysis

**Kernlogik**:

```typescript
// Parst Zeit-String zu TimeRange
function parseTimeRange(value: string): TimeRange | null
// "14:00-20:00" → { start: "14:00", end: "20:00" }
// "14:00" → { start: "14:00", end: "23:59" }
// "x" → null

// Berechnet überlappende Zeit
function calculateOverlappingTime(ranges: TimeRange[]): TimeRange | null
// Input: [{ start: "14:00", end: "20:00" }, { start: "15:00", end: "22:00" }]
// Output: { start: "15:00", end: "20:00" }

// Analysiert Schedule
function analyzeSchedule(schedule: DaySchedule): ScheduleResult
// Returns:
// - status: 'OFF_DAY' | 'FULL_ROSTER' | 'WITH_SUBS' | 'NOT_ENOUGH'
// - availableMainCount: number
// - requiredSubs: string[]
// - commonTimeRange: TimeRange | null
// - canProceed: boolean
```

**Logik-Flow**:
1. Check if Off-Day (Reason contains "off-day")
2. Count available main roster (5 needed)
3. If < 5 mains, check if subs can fill
4. Calculate overlapping time window
5. Determine if training can proceed

#### 5. **scheduler.ts** - Automatisierung

```typescript
// Daily Post (z.B. 12:00)
cron.schedule('0 12 * * *', async () => {
  await postScheduleToChannel();
  if (trainingStartPollEnabled) {
    await sendTrainingStartPoll();
  }
}, { timezone: 'Europe/Berlin' });

// Reminders (z.B. 09:00, 3h vor Post)
cron.schedule('0 9 * * *', async () => {
  await sendRemindersToUsersWithoutEntry(client);
}, { timezone: 'Europe/Berlin' });

// Cleanup (00:00)
cron.schedule('0 0 * * *', async () => {
  await deleteOldRows();
}, { timezone: 'Europe/Berlin' });
```

**Wichtig**: Timezone-Aware! Berücksichtigt automatisch Sommerzeit.

#### 6. **apiServer.ts** - REST API

**Port**: 3001

**Hauptendpunkte**:

```typescript
// Authentication
POST /api/admin/login

// Discord Resources
GET /api/discord/channels
GET /api/discord/roles
GET /api/discord/members

// Sheet Operations
GET /api/sheet-columns
GET /api/sheet-data?startRow=1&endRow=50
POST /api/sheet-data/update

// User Management
GET /api/user-mappings
POST /api/user-mappings
DELETE /api/user-mappings/:discordId

// Settings
GET /api/settings
POST /api/settings

// Bot Actions
POST /api/actions/schedule
POST /api/actions/remind
POST /api/actions/poll
POST /api/actions/notify

// Scrims
GET /api/scrims
POST /api/scrims
PUT /api/scrims/:id
DELETE /api/scrims/:id
GET /api/scrims/stats/summary

// Monitoring
GET /api/health
GET /api/logs
GET /api/bot-status
GET /api/cache-stats

// Schedule Details (Cached)
GET /api/schedule-details?date=19.01.2026
GET /api/schedule-details-batch?dates=19.01.2026,20.01.2026
```

#### 7. **userMapping.ts** - User Mapping System

**Zweck**: Verknüpft Discord User IDs mit Google Sheets Spalten

```typescript
interface UserMapping {
  discordId: string;        // "123456789012345"
  discordUsername: string;  // "player1"
  sheetColumnName: string;  // "Player Name"
  role: 'main' | 'sub' | 'coach';
}

// Beispiel:
{
  discordId: "123456789012345",
  discordUsername: "player1",
  sheetColumnName: "Max Mustermann",
  role: "main"
}
```

**Funktionen**:
- `getUserMapping(discordId)` - Holt Mapping für User
- `addUserMapping(mapping)` - Fügt neues Mapping hinzu
- `removeUserMapping(discordId)` - Entfernt Mapping
- `getUserMappings()` - Holt alle Mappings

#### 8. **scheduleCache.ts** - Performance Cache

**Zweck**: Cached Schedule-Details für 5 Minuten

```typescript
interface CachedScheduleDetail {
  status: string;                    // "Training possible"
  startTime?: string;                // "15:00"
  endTime?: string;                  // "20:00"
  availablePlayers: string[];        // ["Player1 (14:00-20:00)", ...]
  unavailablePlayers: string[];      // ["Player2", ...]
  noResponsePlayers: string[];       // ["Player3", ...]
  timestamp: number;                 // Cache timestamp
}
```

**Funktionen**:
- `getScheduleDetails(date)` - Holt Details (cached)
- `getScheduleDetailsBatch(dates[])` - Batch-Operation
- `invalidateCache(date)` - Invalidiert Cache
- `preloadCache()` - Lädt nächste 14 Tage vor

**Wichtig**: Cache wird automatisch invalidiert bei Sheet-Updates!

#### 9. **interactive.ts** - Discord Interaktionen

**Button-System**:
```typescript
// Navigation Buttons
createDateNavigationButtons(currentDate)
// → [← Previous Day] [Today] [Next Day →]

// Availability Buttons
createAvailabilityButtons(date)
// → [Available] [Not Available]
```

**Modal-System**:
```typescript
// Zeit-Eingabe Modal
createTimeInputModal(date)
// Fields: Start Time (HH:MM), End Time (HH:MM)

// Wochen-Modal (5 Tage wegen Discord Limit)
createWeekModal(userId)
// Fields: Day 0-4 mit aktuellen Werten vorausgefüllt
```

**Select Menu**:
```typescript
// Datum-Auswahl (max 25 Optionen)
createDateSelectMenu()
```

#### 10. **scrims.ts** - Scrim Tracking

**Datenstruktur**:
```typescript
interface ScrimEntry {
  id: string;                    // "scrim_1234567890_abc123"
  date: string;                  // "19.01.2026"
  opponent: string;              // "Team X"
  result: 'win' | 'loss' | 'draw';
  scoreUs: number;               // 13
  scoreThem: number;             // 11
  map: string;                   // "Bind"
  matchType: string;             // "Scrim" | "Tournament" | "Premier"
  ourAgents: string[];           // ["Jett", "Sage", "Omen", "Sova", "Killjoy"]
  theirAgents: string[];         // Enemy comp
  vodUrl: string;                // YouTube URL
  notes: string;                 // Notizen
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

**Statistiken**:
```typescript
interface ScrimStats {
  totalScrims: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  mapStats: {
    [mapName: string]: {
      played: number;
      wins: number;
      losses: number;
    };
  };
}
```

---

## 🎨 Dashboard-Komponenten

### Struktur

```
dashboard/
├── app/
│   ├── page.tsx              # Home (Calendar View)
│   ├── login/page.tsx        # User Login
│   ├── user/page.tsx         # User Portal (14-day editor)
│   ├── admin/
│   │   ├── page.tsx          # Admin Dashboard
│   │   └── login/page.tsx    # Admin Login
│   └── matches/page.tsx      # Scrims View
│
├── components/
│   ├── settings-panel.tsx    # Settings Editor
│   ├── actions-panel.tsx     # Manual Actions
│   ├── logs-panel.tsx        # Live Logs
│   ├── user-mappings-panel.tsx  # User Management
│   ├── schedule-editor.tsx   # Sheet Editor
│   ├── scrims-panel.tsx      # Scrim Management
│   ├── status-card.tsx       # Bot Status
│   ├── bot-status-badge.tsx  # Status Badge
│   ├── theme-toggle.tsx      # Dark/Light Mode
│   └── ui/                   # Shadcn UI Components
│
└── lib/
    └── utils.ts              # Utility Functions
```

### Seiten im Detail

#### 1. **Home Page** (`/`)

**Zweck**: Kalender-Ansicht für alle Spieler

**Features**:
- Zeigt nächste 14 Tage
- Status-Badges (✅ Training possible, ⚠️ Almost there, ❌ Insufficient)
- Spieler-Liste mit Verfügbarkeiten
- Quick-Edit für eigene Einträge
- Filter nach Datum

**Datenfluss**:
```typescript
loadCalendar() {
  // 1. Fetch sheet data (rows 1-15)
  const sheetData = await fetch('/api/sheet-data?startRow=1&endRow=15');
  
  // 2. Fetch schedule details (batch, cached)
  const dates = sheetData.map(row => row[0]);
  const details = await fetch(`/api/schedule-details-batch?dates=${dates.join(',')}`);
  
  // 3. Combine data
  const entries = sheetData.map((row, i) => ({
    date: row[0],
    players: parsePlayerStatus(row, userMappings),
    scheduleDetails: details[row[0]],
    userHasSet: checkUserStatus(row, loggedInUser)
  }));
  
  // 4. Update UI
  setEntries(entries);
}
```

#### 2. **User Portal** (`/user`)

**Zweck**: Spieler bearbeiten ihre eigene Verfügbarkeit

**Features**:
- 14-Tage-Tabelle
- Zeit-Eingabe (Von/Bis)
- Checkbox für Bulk-Edit
- Copy-Funktion (Zeit von vorherigem Tag)
- "x" für nicht verfügbar

**Datenfluss**:
```typescript
saveEntry(date, timeFrom, timeTo) {
  // 1. Find row number for date
  const rowNumber = findRowForDate(date);
  
  // 2. Update cell
  await fetch('/api/sheet-data/update', {
    method: 'POST',
    body: JSON.stringify({
      row: rowNumber,
      column: userColumn,  // e.g., "B"
      value: `${timeFrom}-${timeTo}`
    })
  });
  
  // 3. Reload data
  await loadData();
}
```

#### 3. **Admin Dashboard** (`/admin`)

**Tabs**:

1. **Settings**: Bot-Konfiguration
   - Discord Channel & Role
   - Daily Post Time & Timezone
   - Reminder Hours Before
   - Training Start Poll Toggle
   - Clean Channel Before Post

2. **Users**: User Management
   - Liste aller Mappings
   - Add/Remove User
   - Discord Member Picker
   - Sheet Column Picker
   - Role Selection (Main/Sub/Coach)

3. **Schedule**: Direct Sheet Editor
   - Tabellen-Ansicht
   - Inline-Editing
   - Bulk-Operations
   - Date Navigation

4. **Scrims**: Match Tracking
   - Add Scrim Form
   - Scrim List
   - Statistics Dashboard
   - Edit/Delete Scrims

5. **Actions**: Manual Triggers
   - Post Schedule
   - Send Reminders
   - Create Poll
   - Send Notification

6. **Logs**: Live Monitoring
   - Real-time Logs
   - Filter by Level (Info/Warn/Error/Success)
   - Auto-refresh

### Komponenten im Detail

#### **settings-panel.tsx**

```typescript
interface Settings {
  discord: {
    channelId: string;
    pingRoleId: string | null;
    allowDiscordAuth: boolean;
  };
  scheduling: {
    dailyPostTime: string;
    timezone: string;
    reminderHoursBefore: number;
    trainingStartPollEnabled: boolean;
    cleanChannelBeforePost: boolean;
  };
}

// Load Settings
const settings = await fetch('/api/settings').then(r => r.json());

// Save Settings
await fetch('/api/settings', {
  method: 'POST',
  body: JSON.stringify(settings)
});
// → Triggers: reloadConfig() + restartScheduler()
```

#### **schedule-editor.tsx**

**Features**:
- Zeigt Sheet als Tabelle
- Inline-Editing
- Auto-save
- Validation (Zeit-Format)

```typescript
// Update Cell
const updateCell = async (row: number, col: string, value: string) => {
  await fetch('/api/sheet-data/update', {
    method: 'POST',
    body: JSON.stringify({ row, column: col, value })
  });
  // → Triggers cache invalidation + status change check
};
```

#### **scrims-panel.tsx**

**Features**:
- Add Scrim Form (mit Agent-Picker)
- Scrim List (sortiert nach Datum)
- Edit/Delete
- Statistics Dashboard

```typescript
// Add Scrim
await fetch('/api/scrims', {
  method: 'POST',
  body: JSON.stringify({
    date: "19.01.2026",
    opponent: "Team X",
    result: "win",
    scoreUs: 13,
    scoreThem: 11,
    map: "Bind",
    matchType: "Scrim",
    ourAgents: ["Jett", "Sage", "Omen", "Sova", "Killjoy"],
    vodUrl: "https://youtube.com/...",
    notes: "Good defense"
  })
});
```

---

## 📊 Google Sheets Integration

### Sheet-Struktur im Detail

#### **Sheet1 (Schedule)**

**Spalten**:
- `A`: Date (DD.MM.YYYY)
- `B-F`: Player 1-5 (Main Roster)
- `G-H`: Sub 1-2
- `I`: Coach
- `J`: Reason (Scrim, VOD-Review, Off-Day, etc.)
- `K`: Focus (Site Executes, Retakes, etc.)

**Datenformat**:
- Zeit: `14:00-20:00` oder `14:00` (bis 23:59)
- Nicht verfügbar: `x` (case-insensitive)
- Leer: Keine Angabe

**Automatische Wartung**:
- Löscht Zeilen älter als heute
- Löscht Zeilen > 14 Tage in Zukunft
- Fügt fehlende Tage hinzu (heute + 13 Tage)
- Sortiert nach Datum
- Kopiert Formatierung

#### **UserMapping Sheet**

**Spalten**:
- `A`: Discord ID (Snowflake)
- `B`: Discord Username
- `C`: Sheet Column Name (exakter Name aus Header)
- `D`: Role (main/sub/coach)

**Beispiel**:
```
123456789012345 | player1 | Max Mustermann | main
234567890123456 | player2 | Anna Schmidt   | main
345678901234567 | sub1    | Tom Weber      | sub
```

#### **Settings Sheet**

**Format**: Key-Value Pairs

**Keys**:
- `discord.channelId`
- `discord.pingRoleId`
- `discord.allowDiscordAuth`
- `scheduling.dailyPostTime`
- `scheduling.reminderHoursBefore`
- `scheduling.trainingStartPollEnabled`
- `scheduling.timezone`
- `scheduling.cleanChannelBeforePost`

**Beispiel**:
```
discord.channelId              | 987654321098765432
discord.pingRoleId             | 123456789012345678
scheduling.dailyPostTime       | 12:00
scheduling.timezone            | Europe/Berlin
scheduling.reminderHoursBefore | 3
```

#### **Matches Sheet**

**Spalten**:
- `A`: ID (scrim_timestamp_random)
- `B`: Date (DD.MM.YYYY)
- `C`: Opponent
- `D`: Result (win/loss/draw)
- `E`: Score Us
- `F`: Score Them
- `G`: Maps (comma-separated)
- `H`: Match Type (Scrim/Tournament/Premier)
- `I`: Our Agents (comma-separated)
- `J`: Their Agents (comma-separated)
- `K`: VOD URL
- `L`: Notes
- `M`: Created At (ISO)
- `N`: Updated At (ISO)

### API-Operationen

**Read Operations**:
```typescript
// Get single row by date
sheets.spreadsheets.values.get({
  spreadsheetId,
  range: 'A:K'
});

// Get specific range
sheets.spreadsheets.values.get({
  spreadsheetId,
  range: 'A1:K50'
});
```

**Write Operations**:
```typescript
// Update single cell
sheets.spreadsheets.values.update({
  spreadsheetId,
  range: 'B2',
  valueInputOption: 'RAW',
  requestBody: { values: [['14:00-20:00']] }
});

// Append row
sheets.spreadsheets.values.append({
  spreadsheetId,
  range: 'A:K',
  valueInputOption: 'RAW',
  requestBody: { values: [[row]] }
});
```

**Batch Operations**:
```typescript
// Delete rows
sheets.spreadsheets.batchUpdate({
  spreadsheetId,
  requestBody: {
    requests: [{
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: 5,
          endIndex: 6
        }
      }
    }]
  }
});

// Insert rows + copy formatting
sheets.spreadsheets.batchUpdate({
  spreadsheetId,
  requestBody: {
    requests: [
      { insertDimension: {...} },
      { copyPaste: {...} }
    ]
  }
});
```

---

## 🤖 Discord Bot Integration

### Command Registration

```typescript
// Commands werden beim Bot-Start registriert
await rest.put(
  Routes.applicationGuildCommands(clientId, guildId),
  { body: commands }
);
```

**Wichtig**: Guild-Commands (nicht global) für sofortige Updates!

### Interaction Types

#### 1. **Slash Commands**

```typescript
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const { commandName, options } = interaction;
    
    switch (commandName) {
      case 'schedule':
        const date = options.getString('date');
        await handleScheduleCommand(interaction, date);
        break;
      // ...
    }
  }
});
```

#### 2. **Buttons**

```typescript
// Button erstellen
new ButtonBuilder()
  .setCustomId('set_custom_19.01.2026')
  .setLabel('Available')
  .setStyle(ButtonStyle.Success)

// Button Handler
if (interaction.customId.startsWith('set_custom_')) {
  const date = interaction.customId.replace('set_custom_', '');
  await interaction.showModal(createTimeInputModal(date));
}
```

#### 3. **Select Menus**

```typescript
// Menu erstellen
new StringSelectMenuBuilder()
  .setCustomId('select_date')
  .setPlaceholder('Select a date')
  .addOptions(dates.map(d => ({
    label: d,
    value: d
  })))

// Menu Handler
if (interaction.customId === 'select_date') {
  const selectedDate = interaction.values[0];
  // ...
}
```

#### 4. **Modals**

```typescript
// Modal erstellen
new ModalBuilder()
  .setCustomId('time_modal_19.01.2026')
  .setTitle('Availability for 19.01.2026')
  .addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('start_time')
        .setLabel('From (HH:MM)')
        .setStyle(TextInputStyle.Short)
    )
  )

// Modal Handler
if (interaction.customId.startsWith('time_modal_')) {
  const date = interaction.customId.replace('time_modal_', '');
  const startTime = interaction.fields.getTextInputValue('start_time');
  const endTime = interaction.fields.getTextInputValue('end_time');
  // ...
}
```

### Embed-System

```typescript
// Schedule Embed
new EmbedBuilder()
  .setTitle('19.01.2026')
  .setURL(SHEET_URL)
  .setColor(canProceed ? 0x2ecc71 : 0xe74c3c)
  .setDescription('**Reason:** Scrim\n**Focus:** Site Executes')
  .addFields(
    { name: 'Main Roster', value: '✅ Player1 `14:00 - 20:00`\n❌ ~~Player2~~' },
    { name: 'Status', value: '✅ Full roster available\n⏰ <t:1737291600:t> - <t:1737313200:t> (6h)' }
  )
  .setThumbnail(THUMBNAIL_URL)
  .setTimestamp()
```

**Discord Timestamps**:
```typescript
// Unix Timestamp mit Timezone-Konvertierung
const timestamp = convertTimeToUnixTimestamp(date, time, timezone);
// → <t:1737291600:t> zeigt lokale Zeit des Users
```

### Permission System

```typescript
// Admin-only Commands
new SlashCommandBuilder()
  .setName('post-schedule')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
```

---

## 🔌 API-Endpunkte

### Authentication

```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "secret"
}

Response: { "success": true }
```

**Wichtig**: Credentials aus `.env`, nicht aus Google Sheets!

### Discord Resources

```http
GET /api/discord/channels
Response: [
  { "id": "123...", "name": "general" }
]

GET /api/discord/roles
Response: [
  { "id": "789...", "name": "Team", "color": "#3498db" }
]

GET /api/discord/members
Response: {
  "members": [
    { "id": "123...", "username": "player1", "displayName": "Player One" }
  ],
  "cached": true
}
```

**Cache**: Members werden 5 Minuten gecached (Rate Limit Protection)

### Sheet Operations

```http
GET /api/sheet-columns
Response: {
  "columns": [
    { "name": "Player1", "column": "B", "index": 1 }
  ]
}

GET /api/sheet-data?startRow=1&endRow=50
Response: {
  "data": [
    ["Date", "Player1", "Player2", ...],
    ["19.01.2026", "14:00-20:00", "x", ...]
  ]
}

POST /api/sheet-data/update
Content-Type: application/json

{
  "row": 2,
  "column": "B",
  "value": "15:00-21:00"
}

Response: { "success": true }
```

### User Mappings

```http
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

POST /api/user-mappings
Content-Type: application/json

{
  "discordId": "123...",
  "discordUsername": "player1",
  "sheetColumnName": "Player Name",
  "role": "main"
}

DELETE /api/user-mappings/:discordId
```

### Settings

```http
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

POST /api/settings
Content-Type: application/json

{
  "discord": {...},
  "scheduling": {...}
}

Response: { "success": true }
```

**Side Effects**: Triggert `reloadConfig()` + `restartScheduler()`

### Bot Actions

```http
POST /api/actions/schedule
Content-Type: application/json

{
  "date": "20.01.2026"  // optional
}

POST /api/actions/remind
Content-Type: application/json

{
  "date": "20.01.2026"  // optional
}

POST /api/actions/poll
Content-Type: application/json

{
  "question": "Which map?",
  "options": ["Bind", "Haven", "Ascent"],
  "duration": 1
}

POST /api/actions/notify
Content-Type: application/json

{
  "type": "info",
  "target": "all",
  "specificUserId": null,
  "title": "Team Meeting",
  "message": "Tomorrow at 19:00"
}
```

### Scrims

```http
GET /api/scrims
Response: {
  "success": true,
  "scrims": [...]
}

POST /api/scrims
Content-Type: application/json

{
  "date": "19.01.2026",
  "opponent": "Team X",
  "result": "win",
  "scoreUs": 13,
  "scoreThem": 11,
  "map": "Bind",
  "matchType": "Scrim",
  "ourAgents": ["Jett", "Sage", "Omen", "Sova", "Killjoy"],
  "theirAgents": [],
  "vodUrl": "",
  "notes": ""
}

PUT /api/scrims/:id
DELETE /api/scrims/:id

GET /api/scrims/stats/summary
Response: {
  "success": true,
  "stats": {
    "totalScrims": 50,
    "wins": 30,
    "losses": 18,
    "draws": 2,
    "winRate": 60.0,
    "mapStats": {
      "Bind": { "played": 10, "wins": 6, "losses": 4 }
    }
  }
}
```

### Monitoring

```http
GET /api/health
Response: {
  "status": "running",
  "botReady": true,
  "uptime": 3600
}

GET /api/logs?limit=100&level=error
Response: [
  {
    "timestamp": "2026-01-19T12:00:00.000Z",
    "level": "info",
    "message": "Schedule posted",
    "details": "..."
  }
]

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

GET /api/cache-stats
Response: {
  "size": 14,
  "keys": ["19.01.2026", "20.01.2026", ...]
}
```

### Schedule Details (Cached)

```http
GET /api/schedule-details?date=19.01.2026
Response: {
  "status": "Training possible",
  "startTime": "15:00",
  "endTime": "20:00",
  "availablePlayers": ["Player1 (14:00-20:00)", "Player3 (15:00-22:00)"],
  "unavailablePlayers": ["Player2"],
  "noResponsePlayers": ["Player4"]
}

GET /api/schedule-details-batch?dates=19.01.2026,20.01.2026
Response: {
  "19.01.2026": {...},
  "20.01.2026": {...}
}
```

**Performance**: Cached für 5 Minuten, Batch-Operation für Dashboard

---

## ⏰ Automatisierung & Scheduler

### Cron Jobs

```typescript
// 1. Daily Schedule Post
cron.schedule(
  `${minute} ${hour} * * *`,  // z.B. "0 12 * * *"
  async () => {
    await postScheduleToChannel();
    if (trainingStartPollEnabled) {
      await createTrainingStartPoll();
    }
  },
  { timezone: 'Europe/Berlin' }
);

// 2. Reminder Notifications
cron.schedule(
  `${reminderMinute} ${reminderHour} * * *`,  // z.B. "0 9 * * *"
  async () => {
    await sendRemindersToUsersWithoutEntry(client);
  },
  { timezone: 'Europe/Berlin' }
);

// 3. Cleanup Job
cron.schedule(
  '0 0 * * *',  // Midnight
  async () => {
    await deleteOldRows();
  },
  { timezone: 'Europe/Berlin' }
);
```

### Timezone Handling

**Wichtig**: Alle Zeiten in konfigurierter Timezone!

```typescript
// Berechnet Reminder-Zeit
function calculateReminderTime(postHour, postMinute, hoursBefore) {
  let reminderHour = postHour - hoursBefore;
  if (reminderHour < 0) {
    reminderHour += 24;  // Wrap to previous day
  }
  return { hour: reminderHour, minute: postMinute };
}

// Beispiel:
// Post: 12:00, Reminder: 3h before
// → Reminder: 09:00

// Post: 02:00, Reminder: 3h before
// → Reminder: 23:00 (previous day)
```

### Scheduler Restart

```typescript
// Bei Settings-Änderung
async function restartScheduler() {
  stopScheduler();      // Stop alle Cron Jobs
  await reloadConfig(); // Lade neue Settings
  startScheduler();     // Start mit neuen Zeiten
}
```

### Cleanup-Logik

```typescript
async function deleteOldRows() {
  // 1. Cleanup time formats (remove spaces around dashes)
  await cleanupTimeFormats();
  
  // 2. Delete rows outside 14-day window
  const today = new Date();
  const maxFutureDate = new Date(today);
  maxFutureDate.setDate(maxFutureDate.getDate() + 13);
  
  // Delete if: date < today OR date > today+13
  
  // 3. Add missing days
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    if (!existingDates.has(date)) {
      addRow(date);
    }
  }
  
  // 4. Sort by date
  await sortSheetByDate();
}
```

---

## 🚀 Deployment & Konfiguration

### Environment Variables

**`.env` (Backend)**:
```bash
# Discord
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_CREDENTIALS_PATH=./credentials.json

# Admin (Dashboard)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# Discord OAuth (Optional)
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

**`.env.local` (Dashboard)**:
```bash
NEXT_PUBLIC_BOT_API_URL=http://localhost:3001
BOT_API_URL=http://localhost:3001
```

### Google Credentials

**`credentials.json`**:
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...@....iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**Setup**:
1. Google Cloud Console → Create Project
2. Enable Google Sheets API
3. Create Service Account
4. Download JSON Key → Save as `credentials.json`
5. Share Sheet with Service Account Email

### Build & Start

**Backend**:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

**Dashboard**:
```bash
cd dashboard

# Development
npm run dev

# Production
npm run build
npm start
```

### Port Configuration

- **Backend**: Port 3001 (Express API)
- **Dashboard**: Port 3000 (Next.js)
- **Discord Bot**: WebSocket Connection

**Wichtig**: Beide müssen gleichzeitig laufen!

### Startup-Sequenz

```
1. Backend startet
   ├─ Test Google Sheets Connection
   ├─ Load Settings from Sheets
   ├─ Run Cleanup (delete old, add missing)
   ├─ Start Discord Bot
   ├─ Register Slash Commands
   ├─ Start Scheduler (Cron Jobs)
   └─ Start API Server (Express)

2. Dashboard startet
   ├─ Next.js Server
   └─ Connect to Backend API
```

### Fehlerbehandlung

**Backend**:
- Graceful Shutdown (SIGINT/SIGTERM)
- Error Logging (console + logger)
- Retry-Logic für API-Calls
- Cache Fallback bei Errors

**Dashboard**:
- Toast Notifications (sonner)
- Error Boundaries
- Loading States
- Retry Buttons

---

## 🔍 Wichtige Konzepte

### 1. **User Mapping System**

**Problem**: Discord User IDs müssen zu Sheet-Spalten gemappt werden

**Lösung**: `UserMapping` Sheet
- Discord ID → Sheet Column Name
- Ermöglicht flexible Spalten-Namen
- Unterstützt Rollen (main/sub/coach)

### 2. **Schedule Analysis**

**Problem**: Finde gemeinsame Zeitfenster für Training

**Lösung**: `analyzeSchedule()`
- Parst alle Verfügbarkeiten
- Berechnet Überlappung
- Prüft ob 5 Spieler verfügbar
- Berücksichtigt Subs

### 3. **Cache-System**

**Problem**: Google Sheets API ist langsam

**Lösung**: `scheduleCache.ts`
- 5-Minuten Cache
- Batch-Loading
- Auto-Invalidation bei Updates
- Preload beim Start

### 4. **Timezone Handling**

**Problem**: Verschiedene Zeitzonen, Sommerzeit

**Lösung**: IANA Timezone + Discord Timestamps
- Alle Zeiten in konfigurierter Timezone
- Discord zeigt lokale Zeit des Users
- Automatische DST-Behandlung

### 5. **Interactive Discord UI**

**Problem**: Einfache Bedienung in Discord

**Lösung**: Buttons + Modals + Select Menus
- Keine Text-Befehle nötig
- Validierung in Modals
- Navigation mit Buttons

### 6. **Settings Persistence**

**Problem**: Settings müssen persistent sein

**Lösung**: Google Sheets "Settings" Tab
- Key-Value Store
- Automatisches Laden beim Start
- Hot-Reload bei Änderungen
- Admin-Credentials in `.env` (Security)

### 7. **Automated Maintenance**

**Problem**: Sheet muss aktuell bleiben

**Lösung**: Cleanup Job (Midnight)
- Löscht alte Einträge
- Fügt fehlende Tage hinzu
- Sortiert nach Datum
- Kopiert Formatierung

---

## 📝 Wichtige Hinweise für KI-Instanzen

### Code-Änderungen

1. **Backend-Änderungen**: Immer TypeScript kompilieren (`npm run build`)
2. **Settings-Änderungen**: Triggern automatisch Scheduler-Restart
3. **Sheet-Updates**: Invalidieren automatisch Cache
4. **Discord Commands**: Werden beim Bot-Start registriert

### Debugging

1. **Logs**: `GET /api/logs` oder Console
2. **Cache**: `GET /api/cache-stats`
3. **Bot Status**: `GET /api/bot-status`
4. **Health**: `GET /api/health`

### Häufige Probleme

1. **Bot antwortet nicht**: Prüfe Permissions & Command Registration
2. **Sheet-Updates funktionieren nicht**: Prüfe Service Account Permissions
3. **Scheduler läuft nicht**: Prüfe Timezone & Cron Expression
4. **Dashboard zeigt keine Daten**: Prüfe API URL & CORS

### Best Practices

1. **Immer Timezone beachten**
2. **Cache invalidieren bei Updates**
3. **Error Handling in allen API-Calls**
4. **Validation vor Sheet-Updates**
5. **Logging für wichtige Aktionen**

---

## 🎓 Zusammenfassung

### Datenfluss-Übersicht

```
User Action (Discord/Dashboard)
    ↓
Bot/API Handler
    ↓
Business Logic (analyzer, sheets, etc.)
    ↓
Google Sheets API
    ↓
Cache Invalidation
    ↓
Response to User
```

### Kern-Technologien

- **Discord.js**: Bot Framework
- **Express**: REST API
- **Next.js**: Web Dashboard
- **Google Sheets API**: Datenbank
- **node-cron**: Automatisierung
- **TypeScript**: Type Safety

### Hauptfeatures

1. ✅ Verfügbarkeitsmanagement (Discord + Web)
2. ✅ Automatische Schedule-Analyse
3. ✅ Tägliche Posts & Erinnerungen
4. ✅ Scrim-Tracking & Statistiken
5. ✅ Admin-Dashboard
6. ✅ User-Portal
7. ✅ Caching & Performance
8. ✅ Timezone-Aware

---

**Ende der Dokumentation**

Diese Dokumentation sollte ausreichen, um das Projekt vollständig zu verstehen und Änderungen vorzunehmen. Bei Fragen zu spezifischen Komponenten, siehe die entsprechenden Quellcode-Dateien.
