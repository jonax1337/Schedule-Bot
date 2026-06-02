# Discord Bot Overview

The Discord bot is built on **discord.js v14** and is the team's primary interaction
surface for everything availability-related.

## Architecture

```
Discord Gateway
      │
      ▼
  Client (client.ts)
      │
      ├─ Events
      │   ├─ ready.event.ts        → register commands, recover polls,
      │   │                          refresh weekly overview
      │   └─ interaction.event.ts  → dispatch to handlers
      │
      ├─ Commands (slash commands)
      │   ├─ schedule.commands.ts
      │   ├─ availability.commands.ts
      │   ├─ user-management.commands.ts
      │   ├─ admin.commands.ts
      │   ├─ poll.commands.ts
      │   ├─ scrim.commands.ts
      │   └─ recurring.commands.ts
      │
      ├─ Interactions
      │   ├─ interactive.ts          → buttons, modals, select menus
      │   ├─ polls.ts                → quick polls
      │   ├─ trainingStartPoll.ts    → training-start polls
      │   ├─ reminder.ts             → DM reminders (daily + weekly)
      │   └─ pollBase.ts             → shared poll plumbing
      │
      └─ Utils
          ├─ schedule-poster.ts      → daily post + status-change notifier
          ├─ weekly-overview.ts      → pinned weekly message + day-buttons
          ├─ week-utils.ts           → week math helpers
          └─ command-helpers.ts
```

## Client configuration

### Intents

| Intent | Used for |
| --- | --- |
| `Guilds` | Server events, channel fetches |
| `GuildMembers` | Roster lookups |
| `GuildMessageReactions` | Poll voting |

### Partials

| Partial | Used for |
| --- | --- |
| `Message` | Reactions on older messages |
| `Reaction` | Partial reaction payloads |

## Permissions

The bot needs these Discord permissions:

- **View Channels**
- **Send Messages**
- **Embed Links**
- **Add Reactions**
- **Use Slash Commands**
- **Read Message History**
- **Manage Messages** — required to pin the weekly overview message

## Startup

On `clientReady` (`ready.event.ts`):

1. **Register commands** — push every slash command to the Discord API
2. **Recover polls** — re-bind open quick polls from the channel
3. **Recover training polls** — re-bind open training-start polls
4. **Refresh the pinned weekly overview** — edit the existing pin or post a new one
5. **Set the presence**

## Embed colour scheme

| Colour | Hex | Used for |
| --- | --- | --- |
| Green | `0x2ecc71` | Success, Full Roster |
| Orange | `0xf39c12` | Warning, With Subs |
| Red | `0xe74c3c` | Error, Not Enough |
| Purple | `0x9b59b6` | Off-Day |
| Blue | `0x3498db` | Info, Weekly Overview |

## Player status icons

| Icon | Meaning |
| --- | --- |
| ✅ | Available (with time window) |
| ❌ | Unavailable |
| ⚪ | No response |
| ✈️ | Absent |
| 🔄 | Sub required |

## Date formatting

Every date shown to a player is rendered as a Discord timestamp tag — `<t:UNIX:F>` or
`<t:UNIX:D>` depending on whether time of day is meaningful — so each viewer sees their
own locale and timezone. Times within a day use `<t:UNIX:t>`.

Button labels and modal titles still display plain `DD.MM.YYYY` because Discord does not
render timestamp tags in those surfaces.
