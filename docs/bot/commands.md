# Slash Commands

There are seventeen slash commands across four groups. Admin commands require the
Discord **Administrator** permission.

## Public commands

### `/schedule`

Shows the team availability for a specific date.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `date` | string | no | `DD.MM.YYYY`, defaults to today |

**Output** — embed with player list, availability, and the analysed status.

### `/schedule-week`

Shows a compact 7-day outlook of the next week.

**Output** — one inline field per day with a status icon and the common time window.

### `/my-schedule`

Shows your personal availability across the next 14 days.

**Output** — list of dates with your own availability and each day's reason.

### `/view-scrims`

Shows the most recent scrim results.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `limit` | integer | no | Number of results (default `10`) |

### `/scrim-stats`

Aggregated scrim statistics: overall record, win rate, per-map breakdown.

## Player commands

### `/set`

Interactive availability wizard.

**Flow**

1. Bot shows a date select menu (next 14 days)
2. Player picks a date
3. Player either enters a time window in a modal or clicks **Not Available**
4. Times in the player's personal timezone are converted to the bot timezone
5. A confirmation is sent ephemerally

### `/set-timezone`

Sets the player's personal timezone (used for input conversion).

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `timezone` | string | yes | IANA timezone (autocomplete) |

Examples: `Europe/Berlin`, `America/New_York`, `Asia/Tokyo`.

### `/remove-timezone`

Removes the personal timezone. Inputs fall back to the bot timezone.

### `/set-recurring`

Sets a weekly recurring availability pattern.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `days` | string | yes | Comma-separated weekdays — `mon,wed,fri` |
| `time` | string | yes | `HH:MM-HH:MM` or `x` for unavailable |

**Example**

```text
/set-recurring days:mon,tue,wed,thu,fri time:18:00-22:00
```

### `/my-recurring`

Shows your current recurring pattern in a clean table.

### `/clear-recurring`

Removes recurring entries.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `day` | string | no | Single weekday — omit to clear all |

## Admin commands

::: warning Administrator permission required
Every command below needs the Discord **Administrator** permission.
:::

### `/post-schedule`

Posts the schedule embed for a given date into `discord.channelId`.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `date` | string | no | `DD.MM.YYYY` (defaults to today) |

### `/register`

Registers a player.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `user` | user | yes | Discord user |
| `role` | string | yes | `MAIN`, `SUB`, or `COACH` |

**Side effects**

- Creates a `UserMapping`
- `syncUserMappingsToSchedules()` propagates the new player to all future schedule rows

### `/unregister`

Removes a player from the roster.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `user` | user | yes | Discord user |

### `/remind`

Sends the **weekly availability — open days** DM to every player who still has open days
in the current week. Coaches and players on absence are always skipped.

::: tip Manual triggers always fire
Unlike the daily cron, the manual `/remind` ignores the weekly-planning-day skip — the
DM goes out even on a day that already had a weekly planning ping.
:::

### `/notify`

Sends DMs to a target audience.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string | yes | `info`, `warning`, `alert` |
| `target` | string | yes | `all`, `mains`, `subs`, or a specific user |
| `user` | user | no | Specific recipient when `target` is set to a user |

### `/poll`

Creates a quick reaction-based poll.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `question` | string | yes | Poll prompt |
| `options` | string | yes | Comma-separated options |
| `duration` | integer | no | Lifetime in minutes |

### `/training-start-poll`

Toggles the automatic training-start poll that fires alongside the daily schedule post.

### `/send-training-poll`

Creates a training-start poll on demand.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `date` | string | no | `DD.MM.YYYY` (defaults to today) |

### `/add-scrim`

Records a scrim result.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `date` | string | yes | `DD.MM.YYYY` |
| `opponent` | string | yes | Opponent team |
| `result` | string | yes | `win`, `loss`, `draw` |
| `score_us` | integer | yes | Our rounds |
| `score_them` | integer | yes | Opponent rounds |
| `map` | string | yes | Map name |
| `our_agents` | string | no | Our composition |
| `their_agents` | string | no | Opponent composition |
| `vod_url` | string | no | VOD link |
| `notes` | string | no | Free-form notes |
