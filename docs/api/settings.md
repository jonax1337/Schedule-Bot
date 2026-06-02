# Settings API

The dashboard reads and writes runtime settings through these endpoints. All settings
live in the `settings` table as flat dot-notation key/value strings; the API exposes
them as a nested object for ergonomics.

## Read all settings

```http
GET /api/settings
```

Public — no authentication required. The dashboard reads this on every page load to
render branding and feature toggles even for signed-out viewers.

**200 Response**

```json
{
  "discord": {
    "channelId": "123456789012345678",
    "pingRoleId": "123456789012345678",
    "allowDiscordAuth": true,
    "pinnedWeekMessageId": "987654321098765432",
    "pinnedWeekStartDate": "02.06.2026"
  },
  "scheduling": {
    "dailyPostTime": "18:00",
    "timezone": "Europe/Berlin",
    "reminderHoursBefore": 3,
    "duplicateReminderEnabled": false,
    "duplicateReminderHoursBefore": 1,
    "trainingStartPollEnabled": false,
    "pollDurationMinutes": 60,
    "cleanChannelBeforePost": false,
    "changeNotificationsEnabled": true,
    "weeklyPingEnabled": true,
    "weeklyPingTime": "12:00",
    "weeklyPingDays": [0, 1]
  },
  "branding": {
    "teamName": "Valorant Bot",
    "tagline": "Schedule Manager",
    "logoUrl": ""
  },
  "stratbook": {
    "editPermission": "admin"
  }
}
```

::: tip Storage detail
Values are stored as strings under the hood. The API parses them into the correct types
(booleans, numbers, arrays) before sending — clients don't need to cast manually.
:::

## Update settings

```http
POST /api/settings
Authorization: Bearer <admin-token>
Content-Type: application/json
```

The endpoint accepts the **full settings shape**. Pass the entire nested object even if
you only want to change one value — the safest pattern is `GET → mutate → POST`.

**Body**

```json
{
  "discord": { ... },
  "scheduling": {
    "dailyPostTime": "19:00",
    "weeklyPingDays": [0, 1, 4],
    ...
  },
  "branding": { ... },
  "stratbook": { ... }
}
```

**Side effects**

1. Values are persisted to PostgreSQL
2. `reloadConfig()` reloads the cached settings into the runtime `config` object
3. `restartScheduler()` re-arms every cron job with the new values

### Validation rules

| Field | Validation |
| --- | --- |
| `discord.channelId` | Discord snowflake (17–19 digits) |
| `discord.pingRoleId` | Discord snowflake or empty |
| `scheduling.dailyPostTime` | `HH:MM` |
| `scheduling.weeklyPingTime` | `HH:MM` |
| `scheduling.weeklyPingDays` | Array of integers 0–6, unique, max 7 |
| `scheduling.reminderHoursBefore` | Integer, 0–24 |
| `scheduling.pollDurationMinutes` | Integer, 1–10080 |
| `stratbook.editPermission` | `"admin"` or `"all"` |

A failed validation returns `400` with a list of field errors:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "scheduling.weeklyPingTime", "message": "must match pattern HH:MM" }
  ]
}
```

## Reload config

```http
POST /api/settings/reload-config
Authorization: Bearer <admin-token>
```

Reloads the cached settings from PostgreSQL and restarts the scheduler — without
changing any value. Useful after editing the `settings` table directly (e.g. via Prisma
Studio).
