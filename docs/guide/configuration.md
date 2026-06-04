# Configuration

Synqed reads two kinds of configuration:

1. **Environment variables** — set at process start, required for secrets and bootstrap
2. **Runtime settings** — stored in the `settings` table, editable through the dashboard
   without restarting the bot

## Environment variables

### Required

| Variable | Description | Example |
| --- | --- | --- |
| `DISCORD_TOKEN` | Discord bot token | `MTIz...` |
| `DISCORD_GUILD_ID` | Server ID | `123456789012345678` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `ADMIN_USERNAME` | Dashboard admin username | `admin` |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password | `$2b$10$...` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `a_long_random_string` |

### Optional

| Variable | Description | Default |
| --- | --- | --- |
| `DISCORD_CLIENT_ID` | Discord OAuth client ID | — |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret | — |
| `DISCORD_REDIRECT_URI` | OAuth redirect URL | `http://localhost:3000/auth/callback` |
| `DASHBOARD_URL` | Frontend origin (CORS) | `http://localhost:3000` |
| `PORT` | API server port | `3001` |
| `BOT_API_URL` | API URL (server-side, used by Next.js) | `http://localhost:3001` |
| `NEXT_PUBLIC_BOT_API_URL` | API URL (client-side, used by the browser) | `http://localhost:3001` |

::: tip Generating the admin password hash
```bash
node dist/generateHash.js
```
The script prompts for a plaintext password and prints a bcrypt hash to paste into
`ADMIN_PASSWORD_HASH`.
:::

## Runtime settings

All settings live in the `settings` table as flat dot-notation key/value strings. They
are loaded into a cached object at startup, refreshed when `reloadConfig()` runs, and
mirrored into a runtime `config` object that the bot reads.

### Discord

| Key | Description | Example |
| --- | --- | --- |
| `discord.channelId` | Channel that hosts the daily post and pinned weekly overview | `123456789012345678` |
| `discord.pingRoleId` | Role mentioned in daily and weekly posts (optional) | `123456789012345678` |
| `discord.allowDiscordAuth` | Allow Discord OAuth sign-in on the dashboard | `true` |
| `discord.pinnedWeekMessageId` | **Internal** — message ID of the pinned weekly overview | (managed by the bot) |
| `discord.pinnedWeekStartDate` | **Internal** — Monday of the pinned week | (managed by the bot) |

::: warning Bot-managed keys
`pinnedWeekMessageId` and `pinnedWeekStartDate` are written by the bot whenever the
weekly overview rolls over. Do not edit them manually.
:::

### Scheduling

| Key | Description | Default |
| --- | --- | --- |
| `scheduling.dailyPostTime` | Time of day for the daily schedule post (HH:MM) | `18:00` |
| `scheduling.timezone` | IANA timezone applied to every cron | `Europe/Berlin` |
| `scheduling.reminderHoursBefore` | Hours before the daily post for the first reminder | `3` |
| `scheduling.duplicateReminderEnabled` | Toggle the second reminder pass | `false` |
| `scheduling.duplicateReminderHoursBefore` | Hours before the daily post for the second reminder | `1` |
| `scheduling.trainingStartPollEnabled` | Auto-create a training-start poll after the daily post | `false` |
| `scheduling.pollDurationMinutes` | Training-start poll lifetime (1–10080) | `60` |
| `scheduling.cleanChannelBeforePost` | Wipe non-pinned channel messages before the daily post | `false` |
| `scheduling.changeNotificationsEnabled` | Re-post the embed when today's roster status changes | `true` |
| `scheduling.weeklyPingEnabled` | Master toggle for the weekly planning DM | `true` |
| `scheduling.weeklyPingTime` | Time of day for the weekly planning DM (HH:MM) | `12:00` |
| `scheduling.weeklyPingDays` | Weekdays the planning DM runs on (`0=Sun..6=Sat`) | `[0, 1]` |

See [Scheduler & Cron Jobs](/bot/scheduler) for how these knobs combine.

### Branding

| Key | Description | Default |
| --- | --- | --- |
| `branding.teamName` | Team name shown in the dashboard | `Synqed` |
| `branding.tagline` | Tagline under the team name | `Schedule Manager` |
| `branding.logoUrl` | External image URL for the sidebar logo | — |

### Stratbook

| Key | Description | Default |
| --- | --- | --- |
| `stratbook.editPermission` | Who can edit strategies | `admin` |

::: info Values: `admin` or `all`
- `admin` — only admins can edit strategies
- `all` — any registered player can edit
:::

## Changing settings

### Dashboard

1. Open `/admin`
2. Go to **Settings**
3. Edit and save — `reloadConfig()` and `restartScheduler()` run automatically

### REST API

```bash
curl -X POST http://localhost:3001/api/settings \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduling": {
      "dailyPostTime": "19:00",
      "timezone": "Europe/Berlin",
      "weeklyPingDays": [0, 1, 4]
    }
  }'
```

The endpoint accepts the full settings shape; partial updates are merged server-side.
See [Settings API](/api/settings) for the request schema.

### Manual reload

```bash
curl -X POST http://localhost:3001/api/settings/reload-config \
  -H "Authorization: Bearer YOUR_JWT"
```

Useful when you edited the `settings` table directly (e.g. via Prisma Studio) and need
the running bot to pick up the change.
