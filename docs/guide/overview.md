# Overview

## What is Synqed?

Synqed is a single Node.js process that gives a Valorant E-Sports team three
tightly-integrated tools:

1. **A Discord bot** — slash commands, buttons, polls and automatic posts inside the
   team's Discord
2. **A REST API** — backend logic and data access for every other surface
3. **A web dashboard** — admin panel and player portal built on Next.js

## Core capabilities

### Scheduling

- One schedule row per day with reason, focus and a per-player snapshot
- 14-day forward outlook always seeded
- Recurring weekly availability patterns auto-applied to empty slots
- Absence tracking (vacation, exam week, …) that overrides availability
- Automated daily post, training-start polls, and weekly planning DMs

### Availability

- Players enter time windows (e.g. `14:00-22:00`) via Discord modals or the dashboard
- States: available with one or more windows, unavailable (`x`), no response (empty)
- Analyser auto-derives roster status: `FULL_ROSTER`, `WITH_SUBS`, `NOT_ENOUGH`,
  `OFF_DAY`
- Sub requirements are detected automatically and flagged in posts

### Scrim tracking

- Win/loss/draw with scores
- Map and per-team agent composition
- VOD URLs and external match links
- Rich, filterable statistics

### Stratbook

- TipTap rich-text editor with image and PDF upload
- Folders with colour coding
- Map and agent tags
- Configurable edit permissions (admin-only or all registered players)

### VOD review

- YouTube embed with synced timestamp comments
- `@mention` and `#hashtag` support
- Live filter and search
- Auto-scroll to the active timestamp

## Architecture at a glance

```
┌─────────────────────────────────────────────┐
│                Discord Server                │
│         (slash commands, buttons)            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│             Discord Bot (discord.js)         │
│   Commands │ Events │ Interactions │ Embeds  │
├──────────────────────────────────────────────┤
│             Express API (:3001)              │
│   Routes │ Controllers │ Middleware │ Auth   │
├──────────────────────────────────────────────┤
│            Business Logic Layer              │
│    Services │ Repositories │ Scheduler       │
├──────────────────────────────────────────────┤
│           PostgreSQL (Prisma ORM)            │
└──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          Next.js Dashboard (:3000)           │
│   Admin Panel │ User Portal │ VOD Review     │
└──────────────────────────────────────────────┘
```

## Roles

| Role | Discord | Dashboard | Description |
| --- | --- | --- | --- |
| **MAIN** | All commands | User portal | Starting roster (5 players) |
| **SUB** | All commands | User portal | Bench players |
| **COACH** | All commands | User portal | Coach (no roster slot, no reminders) |
| **Admin** | Admin commands | Admin panel | Team management |

## Project layout

```
synqed/
├── src/                      # Backend (bot + API)
│   ├── index.ts              # Entry point
│   ├── api/                  # Express server & routes
│   ├── bot/                  # Discord bot
│   ├── jobs/                 # Cron scheduler
│   ├── repositories/         # Database access
│   ├── services/             # Business logic
│   └── shared/               # Config, middleware, utils
├── dashboard/                # Next.js frontend
│   ├── app/                  # Pages & routing
│   ├── components/           # UI components
│   ├── hooks/                # React hooks
│   └── lib/                  # Utilities
├── prisma/                   # Database schema
├── docker-compose.yml        # Container orchestration
└── docs/                     # This documentation
```
