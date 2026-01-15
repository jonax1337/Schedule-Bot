# Valorant Schedule Discord Bot

Discord Bot der Google Sheets Daten ausliest und Team-Verfuegbarkeit fuer Valorant Training postet.

## Features

- Liest Spieler-Verfuegbarkeit aus Google Sheets
- Analysiert ob genuegend Spieler (5+) verfuegbar sind
- Berechnet gemeinsame verfuegbare Zeit
- Erkennt Off-Days automatisch
- Taegliche automatische Posts zu konfigurierbarer Uhrzeit
- `/schedule` Slash-Command fuer manuelles Abrufen

## Setup

### 1. Google Cloud Setup

1. Gehe zu [Google Cloud Console](https://console.cloud.google.com/)
2. Erstelle ein neues Projekt (oder waehle ein bestehendes)
3. Aktiviere die **Google Sheets API**:
   - Navigation Menu > APIs & Services > Library
   - Suche nach "Google Sheets API" und aktiviere sie
4. Erstelle einen Service Account:
   - Navigation Menu > APIs & Services > Credentials
   - Create Credentials > Service Account
   - Gib einen Namen ein und klicke auf "Create and Continue"
   - Ueberspringe die optionalen Schritte
5. Erstelle einen JSON Key:
   - Klicke auf den erstellten Service Account
   - Keys > Add Key > Create new key > JSON
   - Die Datei wird heruntergeladen
6. Speichere die JSON-Datei als `credentials.json` im Projektordner
7. **Wichtig:** Teile dein Google Sheet mit der Service Account E-Mail (zu finden in der JSON-Datei unter `client_email`)

### 2. Discord Bot Setup

1. Gehe zum [Discord Developer Portal](https://discord.com/developers/applications)
2. Klicke auf "New Application" und gib einen Namen ein
3. Gehe zu "Bot" in der Seitenleiste
4. Klicke auf "Reset Token" und kopiere den Token
5. Aktiviere unter "Privileged Gateway Intents" nichts (nicht benoetigt)
6. Gehe zu "OAuth2" > "URL Generator"
7. Waehle Scopes: `bot`, `applications.commands`
8. Waehle Bot Permissions: `Send Messages`, `Embed Links`
9. Kopiere die generierte URL und oeffne sie im Browser, um den Bot zu deinem Server hinzuzufuegen

### 3. IDs finden

- **Guild ID (Server ID):** Rechtsklick auf den Server > "Copy Server ID"
- **Channel ID:** Rechtsklick auf den Channel > "Copy Channel ID"
- **Sheet ID:** Aus der Google Sheets URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HIER/edit`

(Aktiviere zuerst den Developer Mode in Discord: Einstellungen > App Settings > Advanced > Developer Mode)

### 4. Konfiguration

1. Kopiere `.env.example` zu `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fuege deine Werte in `.env` ein:
   ```env
   DISCORD_TOKEN=dein_discord_bot_token
   DISCORD_CHANNEL_ID=deine_channel_id
   DISCORD_GUILD_ID=deine_guild_id
   GOOGLE_SHEET_ID=deine_sheet_id
   GOOGLE_CREDENTIALS_PATH=./credentials.json
   DAILY_POST_TIME=10:00
   TIMEZONE=Europe/Berlin
   ```

### 5. Google Sheet Format

Dein Google Sheet muss folgende Spalten haben (in dieser Reihenfolge):

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Date | Player 1 | Player 2 | Player 3 | Player 4 | Player 5 | Sub 1 | Sub 2 | Coach | Reason | Focus |

**Beispiel:**

| Date | Player 1 | Player 2 | Player 3 | Player 4 | Player 5 | Sub 1 | Sub 2 | Coach | Reason | Focus |
|------|----------|----------|----------|----------|----------|-------|-------|-------|--------|-------|
| 15.01.2026 | 14:00-22:00 | 15:00-21:00 | x | 14:00-20:00 | 16:00-23:00 | 14:00-19:00 | x | 15:00-21:00 | Scrim | Site Executes |
| 16.01.2026 | | | | | | | | | Off-Day | |

**Zeitformat:** `HH:MM-HH:MM` (z.B. `14:00-20:00`)
**Nicht verfuegbar:** Leere Zelle oder `x`
**Off-Day:** "Off-Day" oder "Off" in der Reason-Spalte

### 6. Bot starten

```bash
# Dependencies installieren (falls noch nicht geschehen)
npm install

# TypeScript kompilieren
npm run build

# Bot starten
npm start
```

Oder fuer Entwicklung:
```bash
npm run dev
```

## Verwendung

### Slash-Command

```
/schedule           - Zeigt heutige Verfuegbarkeit
/schedule 16.01.2026 - Zeigt Verfuegbarkeit fuer bestimmtes Datum
```

### Automatische Posts

Der Bot postet jeden Tag zur konfigurierten Zeit automatisch die Verfuegbarkeit in den angegebenen Channel.

## Projektstruktur

```
schedule-bot/
├── src/
│   ├── index.ts      # Entry point
│   ├── bot.ts        # Discord Bot & Commands
│   ├── sheets.ts     # Google Sheets Integration
│   ├── scheduler.ts  # Cron Job
│   ├── analyzer.ts   # Verfuegbarkeits-Logik
│   ├── embed.ts      # Discord Embed Builder
│   ├── types.ts      # TypeScript Interfaces
│   └── config.ts     # Konfiguration
├── .env.example
├── credentials.json  # Google Service Account Key (nicht committen!)
├── package.json
└── tsconfig.json
```

## Spielernamen anpassen

Um die Spielernamen zu aendern, editiere `src/config.ts`:

```typescript
export const PLAYER_NAMES = {
  [SHEET_COLUMNS.PLAYER_1]: 'MaxMustermann',
  [SHEET_COLUMNS.PLAYER_2]: 'SpielerZwei',
  // ...
};
```
