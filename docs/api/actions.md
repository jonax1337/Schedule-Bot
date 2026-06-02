# Bot Actions API

Endpoints for manually triggering bot behaviour from the dashboard. All routes require
admin authentication.

## Post schedule

```http
POST /api/actions/schedule
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body (optional)**

```json
{ "date": "27.03.2026" }
```

If `date` is omitted, today is used. Posts the analysed schedule embed into
`discord.channelId`, mentioning `discord.pingRoleId` when configured, and creates a
training-start poll if enabled and possible.

## Send reminders

```http
POST /api/actions/remind
Authorization: Bearer <admin-token>
Content-Type: application/json
```

Sends a "weekly availability — open days" DM to every player who still has at least one
empty day in the current week. Coaches and players on absence are skipped.

::: warning No date parameter
The legacy `date` body field is ignored. The reminder always checks **gaps in the current
week**, not a single date. The endpoint also bypasses the weekly-day skip used by the
daily cron — manual triggers always fire.
:::

## Create poll

```http
POST /api/actions/poll
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body**

```json
{
  "question": "When can you play today?",
  "options":  ["18:00", "19:00", "20:00"],
  "duration": 60
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `question` | string | yes | Poll prompt |
| `options` | string[] | yes | 2–10 answer choices |
| `duration` | number | no | Lifetime in minutes (default `60`) |

## Send notification

```http
POST /api/actions/notify
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body**

```json
{
  "type":    "info",
  "message": "Training is cancelled today.",
  "target":  "all"
}
```

| Field | Type | Allowed values | Description |
| --- | --- | --- | --- |
| `type` | string | `info`, `warning`, `alert` | Message tone (controls embed colour) |
| `message` | string | — | Message body |
| `target` | string | `all`, `mains`, `subs`, or a Discord ID | Who receives the DM |

## Clear channel

```http
POST /api/actions/clear-channel
Authorization: Bearer <admin-token>
```

Deletes all non-pinned messages in `discord.channelId`.

::: danger Irreversible
This wipes the channel. The pinned weekly overview is kept (it is pinned), but every
other message is removed.
:::

## Create training-start poll

```http
POST /api/actions/training-poll
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body (optional)**

```json
{ "date": "27.03.2026" }
```

Creates a training-start poll based on the players' available time windows for that date.

## Pin message

```http
POST /api/actions/pin-message
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body**

```json
{ "content": "Important announcement: ..." }
```

Sends the message into `discord.channelId` and pins it.
