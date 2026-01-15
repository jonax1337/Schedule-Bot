# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands

```bash
npm run build    # Compile TypeScript to dist/
npm start        # Run the compiled bot (dist/index.js)
npm run dev      # Build and run in one step
```

## Architecture Overview

This is a Discord bot that reads Valorant team availability from Google Sheets and posts schedule summaries to Discord.

### Data Flow

1. **sheets.ts** fetches data from Google Sheets (player availability times, names from header row)
2. **analyzer.ts** parses time ranges and determines roster status (FULL_ROSTER, WITH_SUBS, NOT_ENOUGH, OFF_DAY)
3. **embed.ts** builds Discord embeds from the analysis result
4. **bot.ts** handles Discord interactions and posting to channels
5. **scheduler.ts** runs cron jobs for automatic daily posts and cleanup

### Key Modules

- **config.ts**: Loads environment variables and defines `SHEET_COLUMNS` indices for the Google Sheet layout (Date, 5 main players, 2 subs, coach, reason, focus)
- **types.ts**: Core interfaces - `SheetData`, `PlayerAvailability`, `DaySchedule`, `ScheduleResult`, `ScheduleStatus`
- **analyzer.ts**: `parseSchedule()` converts sheet data to `DaySchedule`, `analyzeSchedule()` calculates roster status and overlapping time windows
- **sheets.ts**: Google Sheets API integration using service account auth. Also handles `deleteOldRows()` (removes entries outside 14-day window) and `addMissingDays()` (fills gaps)

### Google Sheet Column Layout

| A | B-F | G-H | I | J | K |
|---|-----|-----|---|---|---|
| Date | Players 1-5 | Subs 1-2 | Coach | Reason | Focus |

Player names are read dynamically from the header row. Time format: `HH:MM-HH:MM` (e.g., `14:00-20:00`). Empty cell or `x` = unavailable.

### Scheduling

- Daily post at configured time (uses node-cron with timezone support)
- Daily cleanup at midnight removes rows outside the 14-day window
- Role ping only on automatic posts, not on `/schedule` command

## Environment Variables

Required: `DISCORD_TOKEN`, `DISCORD_CHANNEL_ID`, `DISCORD_GUILD_ID`, `GOOGLE_SHEET_ID`
Optional: `DISCORD_PING_ROLE_ID`, `GOOGLE_CREDENTIALS_PATH`, `DAILY_POST_TIME`, `TIMEZONE`
