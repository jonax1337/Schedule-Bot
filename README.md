# Valorant Schedule Discord Bot

Discord Bot der Google Sheets Daten ausliest und Team-Verfuegbarkeit fuer Valorant Training postet.

## Features

### 📊 Schedule Management
- Liest Spieler-Verfuegbarkeit aus Google Sheets
- Analysiert ob genuegend Spieler (5+) verfuegbar sind
- Berechnet gemeinsame verfuegbare Zeit
- Erkennt Off-Days automatisch
- Taegliche automatische Posts zu konfigurierbarer Uhrzeit

### 🎮 Interaktive Discord-Integration (NEU!)
- **Verfuegbarkeit direkt in Discord setzen** - Keine manuelle Sheet-Bearbeitung mehr noetig
- **Interaktive Buttons & Modals** - Benutzerfreundliche Zeit-Eingabe
- **DM-basiertes System** - Alle Verfuegbarkeitsabfragen per Direct Message
- **Navigation zwischen Tagen** - Mit Buttons durch den Kalender navigieren
- **Wochenuebersicht** - Kompakte Ansicht der naechsten 7 Tage
- **Persoenliche Uebersicht** - Jeder Spieler sieht seine eigenen Eintraege

### 💬 Slash-Commands
- `/schedule [datum]` - Zeigt Verfuegbarkeit mit Navigation-Buttons
- `/availability` - Setze deine Verfuegbarkeit interaktiv (per DM)
- `/schedule-week` - Wochenuebersicht (per DM)
- `/my-schedule` - Deine persoenliche Verfuegbarkeit (per DM)
- `/register` - Registriere User fuer interaktives System (Admin)
- `/unregister` - Entferne User aus dem System (Admin)

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
8. Waehle Bot Permissions: `Send Messages`, `Embed Links`, `Mention Everyone` (fuer Rollen-Ping)
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
   DISCORD_PING_ROLE_ID=deine_role_id    # Optional: Rolle die gepingt wird
   GOOGLE_SHEET_ID=deine_sheet_id
   GOOGLE_CREDENTIALS_PATH=./credentials.json
   DAILY_POST_TIME=10:00
   TIMEZONE=Europe/Berlin
   ```

   **Role ID finden:** Rechtsklick auf die Rolle in den Server-Einstellungen > "Copy Role ID"

### 5. User-Mapping Setup (NEU!)

Fuer die interaktiven Features benoetigt der Bot ein zusaetzliches Tab im Google Sheet:

1. Oeffne dein Google Sheet
2. Erstelle ein neues Tab namens **"UserMapping"**
3. Das Tab wird automatisch beim Bot-Start initialisiert, falls es nicht existiert
4. Registriere Spieler mit `/register @user Spielername main` (siehe INTERACTIVE_GUIDE.md)

**Wichtig:** Der Spaltenname bei `/register` muss exakt mit dem Header im Sheet uebereinstimmen!

### 6. Google Sheet Format

Dein Google Sheet muss folgende Spalten haben (in dieser Reihenfolge):

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Date | (Spieler 1) | (Spieler 2) | (Spieler 3) | (Spieler 4) | (Spieler 5) | (Sub 1) | (Sub 2) | (Coach) | Reason | Focus |

**Die Spielernamen werden automatisch aus der Header-Zeile gelesen!**

Schreibe die echten Namen/Gamertags deiner Spieler in die erste Zeile - diese werden dann in den Discord-Nachrichten verwendet.

**Beispiel:**

| Date | TenZ | Shroud | Asuna | yay | Marved | Demon1 | Zekken | FNS | Reason | Focus |
|------|------|--------|-------|-----|--------|--------|--------|-----|--------|-------|
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

### Interaktive Commands (NEU!)

**Fuer alle Spieler:**
```
/schedule [datum]    - Zeigt Verfuegbarkeit mit Navigation-Buttons
/availability        - Setze deine Verfuegbarkeit (oeffnet DM)
/schedule-week       - Zeigt naechste 7 Tage (per DM)
/my-schedule         - Deine persoenliche Uebersicht (per DM)
```

**Fuer Admins:**
```
/register @user Spielername main  - Registriere User
/unregister @user                 - Entferne User
```

**Detaillierte Anleitung:** Siehe [INTERACTIVE_GUIDE.md](INTERACTIVE_GUIDE.md)

### Automatische Posts

Der Bot postet jeden Tag zur konfigurierten Zeit automatisch die Verfuegbarkeit in den angegebenen Channel.

## Projektstruktur

```
schedule-bot/
├── src/
│   ├── index.ts         # Entry point
│   ├── bot.ts           # Discord Bot & Commands
│   ├── sheets.ts        # Google Sheets Integration
│   ├── sheetUpdater.ts  # Google Sheets Update-Funktionen (NEU!)
│   ├── userMapping.ts   # User-Registrierung System (NEU!)
│   ├── interactive.ts   # Interaktive Components (NEU!)
│   ├── scheduler.ts     # Cron Job
│   ├── analyzer.ts      # Verfuegbarkeits-Logik
│   ├── embed.ts         # Discord Embed Builder
│   ├── types.ts         # TypeScript Interfaces
│   └── config.ts        # Konfiguration
├── .env.example
├── credentials.json     # Google Service Account Key (nicht committen!)
├── README.md
├── INTERACTIVE_GUIDE.md # Detaillierte Anleitung fuer interaktive Features (NEU!)
├── package.json
└── tsconfig.json
```

## Spielernamen

Die Spielernamen werden automatisch aus der **Header-Zeile (Zeile 1)** deines Google Sheets gelesen. Aendere einfach die Namen in der ersten Zeile des Sheets - beim naechsten Abruf werden die neuen Namen verwendet.
