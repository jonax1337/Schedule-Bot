# Getting Started

## Prerequisites

- **Node.js** ≥ 20.9.0
- **PostgreSQL** 16 or newer (or Docker)
- **Discord Bot Token** — create at the [Discord Developer Portal](https://discord.com/developers/applications)
- **npm** (or any compatible package manager)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/jonax1337/Schedule-Bot.git
cd Schedule-Bot
```

### 2. Install dependencies

```bash
# backend
npm install

# frontend
cd dashboard && npm install && cd ..
```

### 3. Configure environment variables

Copy the example and edit:

```bash
cp .env.example .env
```

**Required variables**

```env
# Discord
DISCORD_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/schedule_bot

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=bcrypt_hash_here
JWT_SECRET=at_least_32_random_chars
```

::: tip Generate an admin password hash
```bash
npm run build
node dist/generateHash.js
```
The script prompts for a password and prints a bcrypt hash you can paste into
`ADMIN_PASSWORD_HASH`.
:::

See [Configuration](/guide/configuration) for the full list of environment variables and
runtime settings.

### 4. Set up the database

**With Docker (recommended)**

```bash
docker-compose up -d db
```

**Without Docker** — ensure PostgreSQL is running and the database exists:

```sql
CREATE DATABASE schedule_bot;
```

Then apply migrations:

```bash
npm run db:migrate
```

### 5. Start the bot

**Backend (bot + API)**

```bash
npm run dev
```

The bot connects to Discord and the API listens on `:3001`.

**Dashboard**

```bash
cd dashboard
npm run dev
```

The dashboard is reachable at <http://localhost:3000>.

## Discord bot setup

### Bot permissions

The bot needs the following permissions in your Discord server:

- View Channels
- Send Messages
- Embed Links
- Add Reactions
- Use Slash Commands
- Read Message History
- **Manage Messages** — required to pin the weekly overview message

### Invite the bot

Use the OAuth2 URL Generator in the
[Developer Portal](https://discord.com/developers/applications) with the permissions
above plus the `bot` and `applications.commands` scopes.

### First-time configuration

1. The bot starts and registers every slash command automatically
2. Open the admin dashboard at <http://localhost:3000/admin/login>
3. Configure **Settings**:
   - Schedule channel and ping role
   - Daily post time and reminders
   - Weekly planning reminder (days + time)
   - Team name and branding

### Register players

```text
/register user:@Player role:MAIN
```

Or open the admin dashboard and use **User Management** for bulk operations.

## Quick start with Docker

For an all-in-one setup:

```bash
# configure .env (see above)
docker-compose up -d
```

This starts:

- PostgreSQL on `:5432`
- Bot + API on `:3001`
- Dashboard on `:3000`

## Next steps

- [Architecture](/guide/architecture) — Internal structure
- [Configuration](/guide/configuration) — Every setting explained
- [Scheduling System](/guide/scheduling) — How the daily and weekly flows work
- [Slash Commands](/bot/commands) — Every Discord command
- [API Reference](/api/overview) — REST endpoints
