# Admin Panel

The admin panel lives at `/admin` and requires admin authentication.

## Tabs

### Dashboard

Admin landing page with status widgets:

**Status cards (4-column grid)**

- **Bot Status** — online/offline indicator (polled every 10 s)
- **Uptime** — process uptime
- **API Server** — server health
- **Discord Connection** — gateway state

**Information cards**

- **Team Overview** — roster counts broken down by Main / Sub / Coach
- **Win Rate** — overall record (W/L/D)
- **Upcoming Schedules** — next 14 days with summarised status

**Quick Actions** — shortcuts to Statistics, Users, Schedule, Matches, Actions,
Settings, Logs.

### Statistics

Shared component — see [Matches & Statistics](/dashboard/matches).

### Settings

Configuration page split into themed cards.

**Discord**

- Schedule channel (dropdown sourced from the server)
- Ping role (dropdown sourced from the server)
- Discord OAuth toggle

**Scheduling**

- Daily post time
- Bot timezone (picker)
- Reminder #1 hours before post
- Reminder #2 toggle + hours before post
- Training-start poll toggle + poll duration
- Clean channel before post toggle
- Change notifications toggle
- **Weekly Planning Reminder**
  - Toggle (master switch)
  - Time of day for the planning DM
  - Weekday picker — choose which days the DM fires on

**Branding**

- Team name
- Tagline
- Logo URL

**Stratbook**

- Edit permission — Admins only / All registered players

### Users

User-mapping management.

- Table of every registered player (Discord ID, display name, role, avatar)
- Add / edit / delete
- Drag-and-drop sort order (dnd-kit)
- Role assignment (MAIN / SUB / COACH)
- Admin flag toggle

### Schedule

Schedule editor.

- Edit per-day reason (`Training`, `Scrims`, `Premier`, `Off-Day`, …)
- Edit focus text
- Paginated history of past days

### Matches

Shared component — see [Matches & Statistics](/dashboard/matches).

### Stratbook

Shared component — see [Stratbook](/dashboard/stratbook).

### Actions

Manual bot actions.

| Action | Effect |
| --- | --- |
| **Post schedule** | Post today's schedule into the channel |
| **Send reminders** | DM the "weekly availability — open days" message to every player with gaps |
| **Create poll** | Quick poll with custom question and options |
| **Training poll** | Force a training-start vote |
| **Notify** | Send a DM to a target audience |
| **Clear channel** | Delete every non-pinned message in the schedule channel |
| **Pin message** | Send a message and pin it |

::: tip Reminders here always fire
The reminder button ignores the weekly-planning-day skip used by the daily cron. Manual
triggers reflect deliberate intent.
:::

### Security

Security configuration and information (active sessions, password policy, etc.).

### Logs

System logs with filtering.

- Level filter (Info / Warn / Error)
- Configurable row count (1–1000)
- Colour-coded entries
- Optional auto-refresh
- Backed by `GET /api/admin/logs?limit=100&level=error`

## Layout

### Admin sidebar

- Tab navigation
- Admin info (username)
- Logout button
- Theme toggle

### Breadcrumbs

Generated dynamically from the active tab via `BreadcrumbProvider` context.
