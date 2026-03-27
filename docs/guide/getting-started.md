# Erste Schritte

## Voraussetzungen

- **Node.js** >= 20.9.0
- **PostgreSQL** 16+ (oder Docker)
- **Discord Bot Token** ([Discord Developer Portal](https://discord.com/developers/applications))
- **npm** oder **pnpm**

## Installation

### 1. Repository klonen

```bash
git clone https://github.com/jonax1337/Schedule-Bot.git
cd Schedule-Bot
```

### 2. Abhaengigkeiten installieren

```bash
# Backend
npm install

# Frontend
cd dashboard && npm install && cd ..
```

### 3. Umgebungsvariablen konfigurieren

Kopiere die `.env.example` und passe die Werte an:

```bash
cp .env.example .env
```

**Pflicht-Variablen:**

```env
# Discord
DISCORD_TOKEN=dein_bot_token
DISCORD_GUILD_ID=deine_server_id

# Datenbank
DATABASE_URL=postgresql://user:password@localhost:5432/schedule_bot

# Admin-Zugang
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=bcrypt_hash_hier
JWT_SECRET=min_32_zeichen_zufaellig
```

::: tip Admin-Passwort generieren
```bash
npm run build
node dist/generateHash.js
```
Gibt einen bcrypt-Hash aus, den du als `ADMIN_PASSWORD_HASH` eintragen kannst.
:::

### 4. Datenbank einrichten

**Mit Docker (empfohlen):**

```bash
docker-compose up -d db
```

**Ohne Docker:**

Stelle sicher, dass PostgreSQL laeuft und die Datenbank existiert:

```sql
CREATE DATABASE schedule_bot;
```

**Migrationen ausfuehren:**

```bash
npm run db:migrate
```

### 5. Starten

**Backend (Bot + API):**

```bash
npm run dev
```

Der Bot verbindet sich mit Discord und die API startet auf Port 3001.

**Dashboard:**

```bash
cd dashboard
npm run dev
```

Das Dashboard ist unter `http://localhost:3000` erreichbar.

## Discord Bot einrichten

### Bot-Berechtigungen

Der Bot benoetigt folgende Berechtigungen im Discord Server:

- View Channels
- Send Messages
- Embed Links
- Add Reactions
- Use Slash Commands
- Read Message History

### Bot einladen

Verwende den OAuth2 URL Generator im [Developer Portal](https://discord.com/developers/applications) mit den obigen Berechtigungen und dem `bot` + `applications.commands` Scope.

### Erste Konfiguration

1. Bot startet und registriert automatisch alle Slash Commands
2. Oeffne das Admin-Dashboard: `http://localhost:3000/admin/login`
3. Konfiguriere unter **Settings**:
   - Discord Channel fuer Schedule-Posts
   - Ping-Rolle fuer Benachrichtigungen
   - Taegliche Post-Zeit und Erinnerungen
   - Team-Name und Branding

### Spieler registrieren

```
/register user:@Spieler role:MAIN
```

Oder ueber das Admin-Dashboard unter **User Management**.

## Schnellstart mit Docker

Fuer ein komplettes Setup mit einem Befehl:

```bash
# .env konfigurieren (siehe oben)
docker-compose up -d
```

Dies startet:
- PostgreSQL auf Port 5432
- Bot + API auf Port 3001
- Dashboard auf Port 3000

## Naechste Schritte

- [Architektur](/guide/architecture) - Verstehe den internen Aufbau
- [Konfiguration](/guide/configuration) - Alle Einstellungsmoeglichkeiten
- [Slash Commands](/bot/commands) - Alle Discord-Befehle
- [API-Referenz](/api/overview) - REST Endpoints
